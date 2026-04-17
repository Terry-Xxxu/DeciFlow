/**
 * Electron API 类型定义
 */

export interface ElectronAPI {
  ping: () => Promise<string>

  ai: {
    init: (config: AIConfig) => Promise<boolean>
    chat: (message: string, context?: any) => Promise<ChatResponse>
    clearHistory: () => Promise<boolean>
    getHistory: () => Promise<ChatMessage[]>
  }

  database: {
    connect: (config: any) => Promise<boolean>
    query: (sql: string) => Promise<any>
    disconnect: () => Promise<void>
  }

  store: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<void>
    delete: (key: string) => Promise<void>
  }
}

export interface AIConfig {
  provider: 'openai' | 'claude' | 'minimax' | 'glm'
  apiKey: string
  baseURL?: string
  model: string
}

export interface ChatResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
