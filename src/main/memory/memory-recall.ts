/**
 * 智能召回服务 - 基于用户问题智能召回相关记忆
 *
 * 这是四层架构的统一入口，负责：
 * 1. 理解用户问题
 * 2. 检索相关历史记忆
 * 3. 生成智能摘要
 * 4. 推荐追问问题
 */

import { semanticIndexService } from './semantic-index'
import { vectorizationService } from './vector-service'
import { MemoryRecallResult, SemanticSearchResult, INTENT_CATEGORIES } from './memory-architecture'

/**
 * 智能召回服务
 */
export class MemoryRecallService {
  /**
   * 智能召回 - 主入口
   */
  async recall(
    query: string,
    options?: {
      sessionId?: string  // 限制在特定会话
      topK?: number  // 返回条数
      includeSessionSummary?: boolean  // 是否包含会话摘要
    }
  ): Promise<MemoryRecallResult> {
    // 1. 识别意图
    const intent = await vectorizationService.classifyIntent(query)

    // 2. 提取关键词
    const keywords = this.extractKeywords(query)

    // 3. 混合检索（语义 + 关键词）
    const topK = options?.topK ?? 5
    const searchResults = await semanticIndexService.hybridSearch(query, keywords, {
      topK,
      semanticWeight: intent === INTENT_CATEGORIES.QUERY ? 0.8 : 0.7,
      keywordWeight: intent === INTENT_CATEGORIES.QUERY ? 0.2 : 0.3
    })

    // 4. 转换为结果格式
    const relevantMemories: SemanticSearchResult[] = []
    for (const { memory, score } of searchResults) {
      // 如果指定了sessionId，过滤结果
      if (options?.sessionId && memory.sessionId !== options.sessionId) {
        continue
      }

      // 这里需要从会话层获取完整信息
      relevantMemories.push({
        memory,
        similarity: score,
        context: {
          messageId: memory.messageId,
          role: memory.contentType,
          content: memory.content,
          timestamp: memory.timestamp
        },
        session: {
          sessionId: memory.sessionId,
          title: '',  // 需要从会话层获取
          createdAt: memory.timestamp,
          updatedAt: memory.timestamp,
          messageCount: 0
        }
      })
    }

    // 5. 生成摘要
    const summary = this.generateSummary(relevantMemories, query)

    // 6. 生成追问建议
    const suggestedQuestions = this.generateFollowUpQuestions(
      relevantMemories,
      query,
      intent
    )

    // 7. 计算置信度
    const confidence = this.calculateConfidence(relevantMemories, query)

    return {
      relevantMemories,
      summary,
      suggestedQuestions,
      confidence
    }
  }

  /**
   * 提取关键词
   */
  private extractKeywords(query: string): string[] {
    const keywords: string[] = []

    // 提取引号中的内容
    const quotedMatches = query.match(/"([^"]+)"/g)
    if (quotedMatches) {
      keywords.push(...quotedMatches.map(m => m.replace(/"/g, '')))
    }

    // 提取常见术语
    const terms = [
      'DAU', 'MAU', 'GMV', 'ARPU', 'LTV', 'CAC', 'ROI',
      '留存率', '转化率', '日活', '月活',
      '渠道', '平台', '地区', '版本'
    ]

    for (const term of terms) {
      if (query.toLowerCase().includes(term.toLowerCase())) {
        keywords.push(term)
      }
    }

    // 分词（简单按空格和标点）
    const words = query.split(/[\s,，.。!！?？]+/)
      .filter(w => w.length >= 2)
      .slice(0, 5)

    keywords.push(...words)

    return [...new Set(keywords)]  // 去重
  }

  /**
   * 生成摘要
   */
  private generateSummary(
    memories: SemanticSearchResult[],
    query: string
  ): string {
    if (memories.length === 0) {
      return '没有找到相关历史记录。'
    }

    if (memories.length === 1) {
      const mem = memories[0]
      return `在"${mem.session.title}"中讨论过类似问题。`
    }

    // 按会话分组
    const sessionGroups = new Map<string, SemanticSearchResult[]>()
    for (const mem of memories) {
      const group = sessionGroups.get(mem.session.sessionId) || []
      group.push(mem)
      sessionGroups.set(mem.session.sessionId, group)
    }

    const summaries: string[] = []

    for (const [sessionId, group] of sessionGroups) {
      const topMemory = group[0]
      const count = group.length
      summaries.push(
        `"${topMemory.session.title}" (${count}条相关记录)`
      )
    }

    return `找到 ${memories.length} 条相关记录，涉及：${summaries.join('、')}`
  }

  /**
   * 生成追问建议
   */
  private generateFollowUpQuestions(
    memories: SemanticSearchResult[],
    query: string,
    intent: string
  ): string[] {
    const questions: string[] = []

    // 基于历史记忆生成
    if (memories.length > 0) {
      const topMemory = memories[0].memory

      // 如果包含实体，基于实体生成追问
      if (topMemory.entities.length > 0) {
        const topEntity = topMemory.entities[0]
        if (topEntity.type === 'dimension') {
          questions.push(`按${topEntity.text}详细拆解看看`)
        } else if (topEntity.type === 'metric') {
          questions.push(`${topEntity.text}的变化趋势如何？`)
        }
      }

      // 基于意图生成追问
      if (intent === INTENT_CATEGORIES.EXPLANATION) {
        questions.push('这个问题的根本原因是什么？')
      } else if (intent === INTENT_CATEGORIES.ANALYSIS) {
        questions.push('有哪些可能的风险点？')
      } else if (intent === INTENT_CATEGORIES.QUERY) {
        questions.push('这个数据在不同维度下有什么差异？')
      }
    }

    // 基于查询内容的追问
    const lowerQuery = query.toLowerCase()
    if (lowerQuery.includes('对比') || lowerQuery.includes('比较')) {
      questions.push('差异的主要原因是什么？')
    } else if (lowerQuery.includes('趋势')) {
      questions.push('这个趋势能持续吗？')
    } else if (lowerQuery.includes('下降')) {
      questions.push('如何扭转这个下降趋势？')
    } else if (lowerQuery.includes('增长')) {
      questions.push('增长的主要驱动因素是什么？')
    }

    // 去重并限制数量
    return [...new Set(questions)].slice(0, 3)
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    memories: SemanticSearchResult[],
    query: string
  ): number {
    if (memories.length === 0) {
      return 0
    }

    // 基于相似度和数量
    const avgSimilarity = memories.reduce((sum, m) => sum + m.similarity, 0) / memories.length
    const countFactor = Math.min(memories.length / 3, 1)  // 最多3条达到满分

    return avgSimilarity * 0.7 + countFactor * 0.3
  }

  /**
   * 获取上下文窗口 - 用于AI对话
   */
  async getContextWindow(
    query: string,
    options?: {
      maxTokens?: number  // 最大token数
      sessionId?: string
    }
  ): Promise<{
    context: string
    sources: Array<{ sessionId: string; title: string; content: string }>
  }> {
    const maxTokens = options?.maxTokens ?? 2000

    // 召回相关记忆
    const recall = await this.recall(query, {
      sessionId: options?.sessionId,
      topK: 10
    })

    if (recall.relevantMemories.length === 0) {
      return {
        context: '没有相关历史记录。',
        sources: []
      }
    }

    // 构建上下文
    const sources: Array<{ sessionId: string; title: string; content: string }> = []
    const contextParts: string[] = []

    let currentTokens = 0
    for (const memory of recall.relevantMemories) {
      const content = memory.context.content
      const estimatedTokens = content.length / 2  // 粗略估计

      if (currentTokens + estimatedTokens > maxTokens) {
        break
      }

      sources.push({
        sessionId: memory.session.sessionId,
        title: memory.session.title,
        content
      })

      contextParts.push(
        `[${memory.session.title}] ${content}`
      )

      currentTokens += estimatedTokens
    }

    return {
      context: contextParts.join('\n\n'),
      sources
    }
  }

  /**
   * 获取会话摘要 - 用于会话列表显示
   */
  async getSessionSummary(sessionId: string): Promise<{
    summary: string
    keyTopics: string[]
    messageCount: number
  }> {
    const memories = semanticIndexService.getSessionMemories(sessionId)

    if (memories.length === 0) {
      return {
        summary: '暂无内容',
        keyTopics: [],
        messageCount: 0
      }
    }

    // 提取关键话题
    const topics = new Map<string, number>()
    for (const memory of memories) {
      for (const topic of memory.topics) {
        topics.set(topic, (topics.get(topic) || 0) + 1)
      }
    }

    const keyTopics = Array.from(topics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic)

    // 生成摘要
    const userMessages = memories.filter(m => m.contentType === 'user')
    const summary = userMessages.length > 0
      ? `讨论了${userMessages.length}个问题，主要涉及：${keyTopics.join('、')}`
      : '暂无内容'

    return {
      summary,
      keyTopics,
      messageCount: memories.length
    }
  }
}

// 导出单例
export const memoryRecallService = new MemoryRecallService()
