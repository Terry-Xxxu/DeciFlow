/**
 * 对话历史持久化存储
 * 解决历史记录重启丢失的问题
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ConversationSession {
  sessionId: string
  title: string  // 对话标题（从第一条用户消息生成）
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  metadata?: {
    query?: string  // 关联的查询
    analysisData?: any  // 关联的分析数据
  }
}

interface ChatHistoryData {
  sessions: ConversationSession[]
  currentSessionId: string | null
}

/**
 * 对话历史存储管理器
 */
export class ChatHistoryStore {
  private storePath: string
  private data: ChatHistoryData
  private saveTimer: NodeJS.Timeout | null = null

  constructor() {
    // 存储在用户数据目录
    const userDataPath = app.getPath('userData')
    this.storePath = path.join(userDataPath, 'chat-history.json')

    // 初始化数据
    this.data = {
      sessions: [],
      currentSessionId: null
    }

    // 启动时加载
    this.load()
  }

  /**
   * 加载历史记录
   */
  private async load() {
    try {
      if (existsSync(this.storePath)) {
        const content = await fs.readFile(this.storePath, 'utf-8')
        this.data = JSON.parse(content)
        console.log('[对话历史] 加载成功:', this.data.sessions.length, '个会话')
      } else {
        // 首次使用，创建空文件
        await this.save()
      }
    } catch (error) {
      console.error('[对话历史] 加载失败:', error)
      // 恢复为空数据
      this.data = { sessions: [], currentSessionId: null }
    }
  }

  /**
   * 保存历史记录（带防抖）
   */
  private async save() {
    // 清除之前的定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }

    // 1秒后保存（防抖）
    this.saveTimer = setTimeout(async () => {
      try {
        await fs.writeFile(this.storePath, JSON.stringify(this.data, null, 2), 'utf-8')
        console.log('[对话历史] 保存成功')
      } catch (error) {
        console.error('[对话历史] 保存失败:', error)
      }
    }, 1000)
  }

  /**
   * 创建新会话
   */
  createSession(initialMessage?: string, metadata?: any): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    // 生成标题（从第一条消息提取，最多20字）
    let title = '新对话'
    if (initialMessage) {
      title = initialMessage.substring(0, 20)
      if (initialMessage.length > 20) title += '...'
    }

    const newSession: ConversationSession = {
      sessionId,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      metadata
    }

    this.data.sessions.unshift(newSession)  // 新会话在最前
    this.data.currentSessionId = sessionId

    this.save()

    console.log('[对话历史] 创建会话:', sessionId, title)
    return sessionId
  }

  /**
   * 添加消息到会话
   */
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
    const session = this.data.sessions.find(s => s.sessionId === sessionId)
    if (!session) {
      console.error('[对话历史] 会话不存在:', sessionId)
      return false
    }

    const message: ChatMessage = {
      role,
      content,
      timestamp: Date.now()
    }

    session.messages.push(message)
    session.updatedAt = Date.now()

    // 如果是第一条用户消息，更新标题
    if (role === 'user' && session.messages.length === 1) {
      session.title = content.substring(0, 20)
      if (content.length > 20) session.title += '...'
    }

    // 移动会话到最前
    this.data.sessions = this.data.sessions.filter(s => s.sessionId !== sessionId)
    this.data.sessions.unshift(session)

    this.save()

    return true
  }

  /**
   * 获取会话历史
   */
  getSession(sessionId: string): ConversationSession | null {
    return this.data.sessions.find(s => s.sessionId === sessionId) || null
  }

  /**
   * 获取所有会话列表
   */
  getAllSessions(): ConversationSession[] {
    return this.data.sessions
  }

  /**
   * 获取当前会话ID
   */
  getCurrentSessionId(): string | null {
    return this.data.currentSessionId
  }

  /**
   * 设置当前会话
   */
  setCurrentSession(sessionId: string) {
    const session = this.data.sessions.find(s => s.sessionId === sessionId)
    if (session) {
      this.data.currentSessionId = sessionId
      this.save()
      return true
    }
    return false
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): boolean {
    const index = this.data.sessions.findIndex(s => s.sessionId === sessionId)
    if (index !== -1) {
      this.data.sessions.splice(index, 1)

      // 如果删除的是当前会话，清空
      if (this.data.currentSessionId === sessionId) {
        this.data.currentSessionId = null
      }

      this.save()
      return true
    }
    return false
  }

  /**
   * 清空所有会话
   */
  clearAllSessions() {
    this.data = {
      sessions: [],
      currentSessionId: null
    }
    this.save()
  }

  /**
   * 清理旧会话（超过30天）
   */
  cleanupOldSessions(maxAge: number = 30 * 24 * 60 * 60 * 1000): number {
    const now = Date.now()
    const beforeLength = this.data.sessions.length

    this.data.sessions = this.data.sessions.filter(
      session => (now - session.updatedAt) < maxAge
    )

    const deleted = beforeLength - this.data.sessions.length

    if (deleted > 0) {
      this.save()
      console.log(`[对话历史] 清理了 ${deleted} 个旧会话`)
    }

    return deleted
  }
}

// 导出单例
export const chatHistoryStore = new ChatHistoryStore()

// 每天清理一次旧会话
setInterval(() => {
  chatHistoryStore.cleanupOldSessions()
}, 24 * 60 * 60 * 1000)
