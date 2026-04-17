/**
 * AI 服务适配器
 * 支持 OpenAI、Claude、MiniMax、GLM 等多种 AI 服务
 */

import { AIConfig, AIProvider } from '../../shared/types'
import { AI_SYSTEM_PROMPT, getChatPrompt } from './prompts'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * AI 服务基类
 */
abstract class AIServiceBase {
  protected config: AIConfig

  constructor(config: AIConfig) {
    this.config = config
  }

  abstract chat(messages: ChatMessage[]): Promise<ChatResponse>
}

/**
 * OpenAI 服务
 */
class OpenAIService extends AIServiceBase {
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const baseURL = this.config.baseURL || 'https://api.openai.com/v1'

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json() as any
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    }
  }
}

/**
 * Anthropic Claude 服务
 */
class ClaudeService extends AIServiceBase {
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const baseURL = this.config.baseURL || 'https://api.anthropic.com/v1'

    // Claude 需要特殊处理 system 消息
    const systemMessage = messages.find(m => m.role === 'system')
    const chatMessages = messages.filter(m => m.role !== 'system')

    const response = await fetch(`${baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        system: systemMessage?.content || AI_SYSTEM_PROMPT,
        messages: chatMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Claude API error: ${error}`)
    }

    const data = await response.json() as any
    return {
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    }
  }
}

/**
 * MiniMax 服务
 */
class MiniMaxService extends AIServiceBase {
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const baseURL = this.config.baseURL || 'https://api.minimax.chat/v1'

    const response = await fetch(`${baseURL}/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(m => ({
          sender_type: m.role === 'system' ? 'SYSTEM' : m.role.toUpperCase(),
          sender_name: m.role,
          text: m.content,
        })),
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`MiniMax API error: ${error}`)
    }

    const data = await response.json() as any as any
    return {
      content: data.choices[0].text,
      usage: {
        promptTokens: data.usage?.total_tokens || 0,
        completionTokens: 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    }
  }
}

/**
 * 智谱 GLM 服务
 */
class GLMService extends AIServiceBase {
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const baseURL = this.config.baseURL || 'https://open.bigmodel.cn/api/paas/v4'

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GLM API error: ${error}`)
    }

    const data = await response.json() as any as any
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    }
  }
}

/**
 * AI 服务工厂
 */
export function createAIService(config: AIConfig): AIServiceBase {
  switch (config.provider) {
    case AIProvider.OpenAI:
      return new OpenAIService(config)
    case AIProvider.Claude:
      return new ClaudeService(config)
    case AIProvider.MiniMax:
      return new MiniMaxService(config)
    case AIProvider.GLM:
      return new GLMService(config)
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`)
  }
}

/**
 * AI 对话管理器
 */
export class AIChatManager {
  private service: AIServiceBase
  private conversationHistory: ChatMessage[] = []

  constructor(config: AIConfig) {
    this.service = createAIService(config)
    // 添加系统提示
    this.conversationHistory.push({
      role: 'system',
      content: AI_SYSTEM_PROMPT,
    })
  }

  /**
   * 发送消息并获取回复
   */
  async chat(userMessage: string, context?: {
    dataSource?: string
    recentQueries?: string[]
  }): Promise<ChatResponse> {
    // 构建带上下文的用户消息
    const prompt = getChatPrompt(userMessage, context)

    // 添加用户消息到历史
    this.conversationHistory.push({
      role: 'user',
      content: prompt,
    })

    // 调用 AI 服务
    const response = await this.service.chat(this.conversationHistory)

    // 添加 AI 回复到历史
    this.conversationHistory.push({
      role: 'assistant',
      content: response.content,
    })

    // 保持历史记录在合理范围内（最近20条）
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20)
    }

    return response
  }

  /**
   * 清空对话历史
   */
  clearHistory() {
    this.conversationHistory = [
      {
        role: 'system',
        content: AI_SYSTEM_PROMPT,
      },
    ]
  }

  /**
   * 获取对话历史
   */
  getHistory() {
    return this.conversationHistory.filter(m => m.role !== 'system')
  }
}
