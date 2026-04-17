/**
 * 记忆管理器 - 四层架构统一入口
 *
 * 整合：
 * - Layer 1: 会话层 (Session Layer) - 用户可见的会话
 * - Layer 2: 语义层 (Semantic Layer) - 向量化和语义理解
 * - Layer 3: 上下文层 (Context Layer) - 对话上下文管理
 * - Layer 4: 存储层 (Storage Layer) - 持久化存储
 */

import { AIChatManager } from '../ai/adapter'
import { chatHistoryStore } from '../storage/chat-history-store'
import { semanticIndexService } from './semantic-index'
import { memoryRecallService } from './memory-recall'
import { vectorizationService } from './vector-service'
import {
  Session,
  SemanticMemory,
  ConversationContext,
  MemoryRecallResult,
  INTENT_CATEGORIES
} from './memory-architecture'

/**
 * 记忆管理器
 */
export class MemoryManager {
  private aiManager: AIChatManager | null = null
  private contextCache: Map<string, ConversationContext> = new Map()

  constructor() {
    // 定期清理缓存
    setInterval(() => {
      this.cleanupContextCache()
    }, 60 * 60 * 1000)  // 每小时
  }

  /**
   * 设置 AI 管理器
   */
  setAIManager(aiManager: AIChatManager) {
    this.aiManager = aiManager
    vectorizationService.setAIManager(aiManager)
  }

  // ==================== Layer 1: 会话层 ====================

  /**
   * 创建会话
   */
  async createSession(
    title: string,
    metadata?: any
  ): Promise<Session> {
    const sessionId = chatHistoryStore.createSession(title, metadata)

    return {
      sessionId,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
      metadata
    }
  }

  /**
   * 获取会话
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const historySession = chatHistoryStore.getSession(sessionId)
    if (!historySession) return null

    // 获取语义摘要
    const summary = await memoryRecallService.getSessionSummary(sessionId)

    return {
      sessionId: historySession.sessionId,
      title: historySession.title,
      createdAt: historySession.createdAt,
      updatedAt: historySession.updatedAt,
      messageCount: historySession.messages.length,
      summary: summary.summary,
      tags: summary.keyTopics,
      metadata: historySession.metadata
    }
  }

  /**
   * 获取所有会话
   */
  async getAllSessions(): Promise<Session[]> {
    const historySessions = chatHistoryStore.getAllSessions()

    // 并行获取摘要
    const sessions = await Promise.all(
      historySessions.map(async (hs) => {
        const summary = await memoryRecallService.getSessionSummary(hs.sessionId)
        return {
          sessionId: hs.sessionId,
          title: hs.title,
          createdAt: hs.createdAt,
          updatedAt: hs.updatedAt,
          messageCount: hs.messages.length,
          summary: summary.summary,
          tags: summary.keyTopics,
          metadata: hs.metadata
        }
      })
    )

    return sessions
  }

  // ==================== Layer 2: 语义层 ====================

  /**
   * 添加语义记忆 - 核心方法
   */
  async addSemanticMemory(
    sessionId: string,
    messageId: string,
    content: string,
    contentType: 'user' | 'assistant' | 'system',
    additionalContext?: {
      topics?: string[]
      entities?: any[]
    }
  ): Promise<string | null> {
    // 1. 识别意图
    const intent = await vectorizationService.classifyIntent(content)

    // 2. 提取实体
    const entities = await vectorizationService.extractEntities(content)

    // 3. 生成话题标签
    const topics = additionalContext?.topics || this.generateTopics(content, entities)

    // 4. 计算重要性
    const importance = vectorizationService.calculateImportance({
      intent,
      entities,
      content
    })

    // 5. 创建语义记忆
    const memory: Omit<SemanticMemory, 'memoryId' | 'embedding'> = {
      sessionId,
      messageId,
      intent,
      entities,
      topics,
      content,
      contentType,
      timestamp: Date.now(),
      importance
    }

    // 6. 添加到语义索引（会自动向量化）
    return await semanticIndexService.addMemory(memory)
  }

  /**
   * 生成话题标签
   */
  private generateTopics(content: string, entities: any[]): string[] {
    const topics: string[] = []

    // 从实体生成话题
    for (const entity of entities) {
      if (entity.type === 'metric' || entity.type === 'dimension') {
        topics.push(entity.text)
      }
    }

    // 从内容中提取关键词
    const keywords = content.match(/([A-Z]{2,}|[\u4e00-\u9fa5]{2,})/g) || []
    topics.push(...keywords.slice(0, 3))

    return [...new Set(topics)].slice(0, 5)
  }

  /**
   * 智能召回
   */
  async recall(
    query: string,
    options?: {
      sessionId?: string
      topK?: number
    }
  ): Promise<MemoryRecallResult> {
    return await memoryRecallService.recall(query, options)
  }

  /**
   * 获取上下文窗口（用于AI对话）
   */
  async getContextWindow(
    query: string,
    sessionId?: string,
    maxTokens?: number
  ): Promise<string> {
    const result = await memoryRecallService.getContextWindow(query, {
      maxTokens,
      sessionId
    })
    return result.context
  }

  // ==================== Layer 3: 上下文层 ====================

  /**
   * 获取会话上下文
   */
  async getConversationContext(sessionId: string): Promise<ConversationContext | null> {
    // 检查缓存
    const cached = this.contextCache.get(sessionId)
    if (cached) {
      return cached
    }

    // 从历史记录加载
    const historySession = chatHistoryStore.getSession(sessionId)
    if (!historySession) return null

    // 获取语义记忆
    const semanticMemories = semanticIndexService.getSessionMemories(sessionId)

    // 构建上下文
    const context: ConversationContext = {
      sessionId,
      messages: historySession.messages.map(msg => ({
        messageId: `msg_${msg.timestamp}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        semanticMemoryId: semanticMemories.find(
          sm => sm.messageId === `msg_${msg.timestamp}`
        )?.memoryId
      })),
      state: this.deriveConversationState(semanticMemories),
      linkedData: historySession.metadata || {}
    }

    // 缓存
    this.contextCache.set(sessionId, context)

    return context
  }

  /**
   * 推导对话状态
   */
  private deriveConversationState(memories: any[]): any {
    const state: any = {}

    // 提取最后提到的指标、维度
    for (const memory of memories.reverse()) {
      if (!state.lastMetric && memory.intent === INTENT_CATEGORIES.QUERY) {
        const metricEntity = memory.entities.find((e: any) => e.type === 'metric')
        if (metricEntity) {
          state.lastMetric = metricEntity.text
        }
      }

      if (!state.lastDimension) {
        const dimEntity = memory.entities.find((e: any) => e.type === 'dimension')
        if (dimEntity) {
          state.lastDimension = dimEntity.text
        }
      }
    }

    return state
  }

  // ==================== Layer 4: 存储层 ====================

  /**
   * 添加消息到会话（整合所有层）
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<string> {
    // 1. 添加到历史存储 (Layer 4)
    const success = chatHistoryStore.addMessage(sessionId, role, content)
    if (!success) {
      throw new Error('添加消息失败')
    }

    // 2. 生成消息ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    // 3. 添加语义记忆 (Layer 2) - 异步，不阻塞
    this.addSemanticMemory(sessionId, messageId, content, role)
      .catch(error => console.error('[记忆管理] 添加语义记忆失败:', error))

    // 4. 清理上下文缓存
    this.contextCache.delete(sessionId)

    return messageId
  }

  /**
   * 删除会话（所有层）
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    // 1. 删除历史存储
    const historyDeleted = chatHistoryStore.deleteSession(sessionId)

    // 2. 删除语义索引
    const semanticDeleted = semanticIndexService.deleteSessionMemories(sessionId)

    // 3. 清理缓存
    this.contextCache.delete(sessionId)

    return historyDeleted && semanticDeleted >= 0
  }

  /**
   * 清理缓存
   */
  private cleanupContextCache() {
    const maxSize = 100
    if (this.contextCache.size > maxSize) {
      // 删除最旧的条目
      const entries = Array.from(this.contextCache.entries())
      entries.slice(0, entries.length - maxSize).forEach(([key]) => {
        this.contextCache.delete(key)
      })
      console.log('[记忆管理] 清理上下文缓存')
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      sessions: chatHistoryStore.getAllSessions().length,
      memories: semanticIndexService.getStats(),
      cacheSize: this.contextCache.size
    }
  }
}

// 导出单例
export const memoryManager = new MemoryManager()
