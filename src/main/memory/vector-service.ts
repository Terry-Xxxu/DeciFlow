/**
 * 向量化服务 - 将对话内容转换为向量表示
 */

import { AIChatManager } from '../ai/adapter'
import { SemanticMemory, Entity, INTENT_CATEGORIES } from './memory-architecture'

export interface EmbeddingResult {
  embedding: number[]
  model: string
  dimensions: number
}

/**
 * 向量化服务类
 */
export class VectorizationService {
  private aiManager: AIChatManager | null = null

  constructor(aiManager?: AIChatManager) {
    if (aiManager) {
      this.aiManager = aiManager
    }
  }

  setAIManager(aiManager: AIChatManager) {
    this.aiManager = aiManager
  }

  /**
   * 生成文本向量
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult | null> {
    if (!this.aiManager) {
      console.warn('[向量化服务] AI管理器未初始化')
      return null
    }

    try {
      // 调用 OpenAI Embeddings API
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAPIKey()}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
          dimensions: 1536
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('[向量化服务] API调用失败:', error)
        return null
      }

      const data: any = await response.json()
      return {
        embedding: data.data[0].embedding,
        model: data.model,
        dimensions: 1536
      }
    } catch (error) {
      console.error('[向量化服务] 生成向量失败:', error)
      return null
    }
  }

  /**
   * 批量生成向量
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<(EmbeddingResult | null)[]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)))
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('向量维度不匹配')
    }

    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
      norm1 += vec1[i] * vec1[i]
      norm2 += vec2[i] * vec2[i]
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  /**
   * 提取实体（使用AI）
   */
  async extractEntities(text: string): Promise<Entity[]> {
    if (!this.aiManager) {
      return this.ruleBasedExtraction(text)
    }

    try {
      const prompt = `从以下数据分析对话中提取关键实体。

对话内容：
${text}

请提取以下类型的实体：
1. metric: 指标（如：DAU、GMV、留存率、转化率）
2. dimension: 维度（如：渠道、平台、地区）
3. table: 数据表
4. value: 具体数值
5. time_range: 时间范围（如：最近7天、上个月）

只返回JSON格式的实体列表，不要其他内容：
[{"type": "metric", "text": "DAU", "confidence": 0.95}]`

      const response = await this.aiManager.chat(prompt)

      // 尝试解析 JSON
      const jsonMatch = response.content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const entities = JSON.parse(jsonMatch[0])
        return entities.map((e: any) => ({
          type: e.type,
          text: e.text,
          confidence: e.confidence || 0.8
        }))
      }

      return this.ruleBasedExtraction(text)
    } catch (error) {
      console.error('[向量化服务] 实体提取失败:', error)
      return this.ruleBasedExtraction(text)
    }
  }

  /**
   * 识别意图
   */
  async classifyIntent(text: string): Promise<string> {
    const lowerText = text.toLowerCase()

    // 规则分类（快速路径）
    if (lowerText.includes('查询') || lowerText.includes('show') || lowerText.includes('多少')) {
      return INTENT_CATEGORIES.QUERY
    }
    if (lowerText.includes('分析') || lowerText.includes('analyze') || lowerText.includes('深度')) {
      return INTENT_CATEGORIES.ANALYSIS
    }
    if (lowerText.includes('为什么') || lowerText.includes('原因') || lowerText.includes('why')) {
      return INTENT_CATEGORIES.EXPLANATION
    }
    if (lowerText.includes('对比') || lowerText.includes('compare') || lowerText.includes('vs')) {
      return INTENT_CATEGORIES.COMPARISON
    }
    if (lowerText.includes('建议') || lowerText.includes('should') || lowerText.includes('优化')) {
      return INTENT_CATEGORIES.ACTION
    }

    return INTENT_CATEGORIES.GENERAL
  }

  /**
   * 计算重要性评分
   */
  calculateImportance(memory: Partial<SemanticMemory>): number {
    let score = 0.5  // 基础分

    // 包含实体加分
    if (memory.entities && memory.entities.length > 0) {
      score += 0.1 * Math.min(memory.entities.length, 3)
    }

    // 意图加分
    if (memory.intent === INTENT_CATEGORIES.ANALYSIS) score += 0.2
    if (memory.intent === INTENT_CATEGORIES.ACTION) score += 0.15

    // 内容长度加分
    if (memory.content) {
      if (memory.content.length > 100) score += 0.1
      if (memory.content.length > 300) score += 0.1
    }

    return Math.min(score, 1.0)
  }

  /**
   * 基于规则的实体提取（降级方案）
   */
  private ruleBasedExtraction(text: string): Entity[] {
    const entities: Entity[] = []
    const lowerText = text.toLowerCase()

    // 常见指标
    const metrics = ['dau', 'mau', 'gmv', '留存率', '转化率', 'arpu', 'ltv', 'cac', 'roi', '日活', '月活']
    metrics.forEach(metric => {
      if (lowerText.includes(metric)) {
        entities.push({ type: 'metric', text: metric, confidence: 0.7 })
      }
    })

    // 常见维度
    const dimensions = ['渠道', '平台', '地区', '版本', 'channel', 'platform', 'region']
    dimensions.forEach(dimension => {
      if (lowerText.includes(dimension)) {
        entities.push({ type: 'dimension', text: dimension, confidence: 0.7 })
      }
    })

    // 时间范围
    const timePatterns = [
      /最近\d+天/, /\d+天内/, /上个月/, /本周/, /本月/
    ]
    timePatterns.forEach(pattern => {
      const match = text.match(pattern)
      if (match) {
        entities.push({ type: 'time_range', text: match[0], confidence: 0.9 })
      }
    })

    return entities
  }

  /**
   * 获取 API Key
   */
  private getAPIKey(): string {
    // 从 AIChatManager 获取配置
    if (this.aiManager) {
      const manager = this.aiManager as any
      if (manager.service?.config?.apiKey) {
        return manager.service.config.apiKey
      }
    }
    throw new Error('无法获取 API Key')
  }
}

// 导出单例
export const vectorizationService = new VectorizationService()
