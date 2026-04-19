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

  // 流式输出：onChunk 每收到一段就回调，返回完整内容
  async chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<ChatResponse> {
    // 默认回退到非流式
    const result = await this.chat(messages)
    onChunk(result.content)
    return result
  }
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
        messages: messages.map(m => ({ role: m.role, content: m.content })),
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

  override async chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<ChatResponse> {
    const baseURL = this.config.baseURL || 'https://api.openai.com/v1'

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    let fullContent = ''
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
        try {
          const delta = JSON.parse(line.slice(6))?.choices?.[0]?.delta?.content
          if (delta) {
            fullContent += delta
            onChunk(delta)
          }
        } catch { /* 跳过解析失败的行 */ }
      }
    }

    return { content: fullContent }
  }
}

/**
 * Anthropic Claude 服务
 */
class ClaudeService extends AIServiceBase {
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const baseURL = this.config.baseURL || 'https://api.anthropic.com/v1'
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
        messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
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

  override async chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<ChatResponse> {
    const baseURL = this.config.baseURL || 'https://api.anthropic.com/v1'
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
        messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: 2000,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Claude API error: ${error}`)
    }

    let fullContent = ''
    let inputTokens = 0
    let outputTokens = 0
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6))
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            fullContent += event.delta.text
            onChunk(event.delta.text)
          } else if (event.type === 'message_delta' && event.usage) {
            outputTokens = event.usage.output_tokens || 0
          } else if (event.type === 'message_start' && event.message?.usage) {
            inputTokens = event.message.usage.input_tokens || 0
          }
        } catch { /* 跳过解析失败的行 */ }
      }
    }

    return {
      content: fullContent,
      usage: { promptTokens: inputTokens, completionTokens: outputTokens, totalTokens: inputTokens + outputTokens },
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
   * 发送消息并获取回复（非流式）
   */
  async chat(userMessage: string, context?: {
    dataSource?: string
    recentQueries?: string[]
  }): Promise<ChatResponse> {
    const prompt = getChatPrompt(userMessage, context)
    this.conversationHistory.push({ role: 'user', content: prompt })

    const response = await this.service.chat(this.conversationHistory)

    this.conversationHistory.push({ role: 'assistant', content: response.content })
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20)
    }
    return response
  }

  /**
   * 发送消息并流式输出（逐字回调，响应更快）
   */
  async chatStream(
    userMessage: string,
    onChunk: (chunk: string) => void,
    context?: { dataSource?: string; recentQueries?: string[] }
  ): Promise<ChatResponse> {
    const prompt = getChatPrompt(userMessage, context)
    this.conversationHistory.push({ role: 'user', content: prompt })

    const response = await this.service.chatStream(this.conversationHistory, onChunk)

    this.conversationHistory.push({ role: 'assistant', content: response.content })
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
