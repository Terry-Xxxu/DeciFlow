/**
 * 语义索引服务 - 管理向量索引和快速检索
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { SemanticMemory, VectorIndex, VECTOR_CONFIG } from './memory-architecture'
import { vectorizationService } from './vector-service'

/**
 * 语义索引服务
 */
export class SemanticIndexService {
  private indexPath: string
  private index: Map<string, VectorIndex> = new Map()
  private memoryStore: Map<string, SemanticMemory> = new Map()
  private dirty = false
  private saveTimer: NodeJS.Timeout | null = null

  constructor() {
    const userDataPath = app.getPath('userData')
    this.indexPath = path.join(userDataPath, 'memory', 'vector-index.json')
    this.load()
  }

  /**
   * 加载索引
   */
  private async load() {
    try {
      if (existsSync(this.indexPath)) {
        const content = await fs.readFile(this.indexPath, 'utf-8')
        const data = JSON.parse(content)

        // 重建索引
        this.index = new Map(data.index || [])
        this.memoryStore = new Map(data.memories || [])

        console.log(`[语义索引] 加载成功: ${this.index.size} 个向量, ${this.memoryStore.size} 条记忆`)
      } else {
        // 确保目录存在
        await fs.mkdir(path.dirname(this.indexPath), { recursive: true })
        await this.save()
      }
    } catch (error) {
      console.error('[语义索引] 加载失败:', error)
      this.index = new Map()
      this.memoryStore = new Map()
    }
  }

  /**
   * 保存索引（带防抖）
   */
  private async save() {
    if (!this.dirty) return

    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }

    this.saveTimer = setTimeout(async () => {
      try {
        const data = {
          index: Array.from(this.index.entries()),
          memories: Array.from(this.memoryStore.entries()),
          updatedAt: Date.now()
        }
        await fs.writeFile(this.indexPath, JSON.stringify(data, null, 2))
        this.dirty = false
        console.log('[语义索引] 保存成功')
      } catch (error) {
        console.error('[语义索引] 保存失败:', error)
      }
    }, 1000)
  }

  /**
   * 添加语义记忆
   */
  async addMemory(memory: Omit<SemanticMemory, 'memoryId' | 'embedding'>): Promise<string | null> {
    try {
      // 生成向量
      const embeddingResult = await vectorizationService.generateEmbedding(memory.content)
      if (!embeddingResult) {
        console.warn('[语义索引] 向量化失败，跳过此记忆')
        return null
      }

      // 创建记忆
      const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      const semanticMemory: SemanticMemory = {
        ...memory,
        memoryId,
        embedding: embeddingResult.embedding
      }

      // 存储记忆
      this.memoryStore.set(memoryId, semanticMemory)

      // 添加到向量索引
      this.index.set(memoryId, {
        memoryId,
        sessionId: memory.sessionId,
        embedding: semanticMemory.embedding,
        timestamp: semanticMemory.timestamp,
        importance: semanticMemory.importance
      })

      this.dirty = true
      this.save()

      console.log(`[语义索引] 添加记忆: ${memoryId} (${memory.intent})`)
      return memoryId
    } catch (error) {
      console.error('[语义索引] 添加记忆失败:', error)
      return null
    }
  }

  /**
   * 批量添加记忆
   */
  async addMemoriesBatch(memories: Omit<SemanticMemory, 'memoryId' | 'embedding'>[]): Promise<string[]> {
    const results = await Promise.all(
      memories.map(memory => this.addMemory(memory))
    )
    return results.filter((id): id is string => id !== null)
  }

  /**
   * 语义检索 - 核心功能
   */
  async search(
    query: string,
    options?: {
      topK?: number
      minSimilarity?: number
      sessionId?: string
      timeDecay?: boolean
      decayRate?: number
    }
  ): Promise<Array<{ memory: SemanticMemory; similarity: number }>> {
    const topK = options?.topK ?? VECTOR_CONFIG.search.topK
    const minSimilarity = options?.minSimilarity ?? VECTOR_CONFIG.search.minSimilarity
    const timeDecay = options?.timeDecay ?? VECTOR_CONFIG.search.timeDecay
    const decayRate = options?.decayRate ?? VECTOR_CONFIG.search.decayRate

    // 1. 生成查询向量
    const queryEmbedding = await vectorizationService.generateEmbedding(query)
    if (!queryEmbedding) {
      return []
    }

    // 2. 计算相似度
    const results: Array<{ memory: SemanticMemory; similarity: number }> = []

    for (const [memoryId, vectorIndex] of this.index.entries()) {
      // 会话过滤
      if (options?.sessionId && vectorIndex.sessionId !== options.sessionId) {
        continue
      }

      const memory = this.memoryStore.get(memoryId)
      if (!memory) continue

      // 计算余弦相似度
      let similarity = vectorizationService.cosineSimilarity(
        queryEmbedding.embedding,
        vectorIndex.embedding
      )

      // 时间衰减
      if (timeDecay) {
        const ageDays = (Date.now() - vectorIndex.timestamp) / (1000 * 60 * 60 * 24)
        const decayFactor = Math.exp(-decayRate * ageDays)
        similarity *= decayFactor
      }

      // 重要性加权
      similarity *= (0.5 + vectorIndex.importance)

      if (similarity >= minSimilarity) {
        results.push({ memory, similarity })
      }
    }

    // 3. 排序并返回 Top K
    results.sort((a, b) => b.similarity - a.similarity)
    return results.slice(0, topK)
  }

  /**
   * 混合检索 - 结合语义和关键词
   */
  async hybridSearch(
    query: string,
    keywords: string[],
    options?: {
      topK?: number
      semanticWeight?: number  // 语义权重 (0-1)
      keywordWeight?: number   // 关键词权重 (0-1)
    }
  ): Promise<Array<{ memory: SemanticMemory; score: number }>> {
    const semanticWeight = options?.semanticWeight ?? 0.7
    const keywordWeight = options?.keywordWeight ?? 0.3
    const topK = options?.topK ?? VECTOR_CONFIG.search.topK

    // 语义检索
    const semanticResults = await this.search(query, { topK: topK * 2 })

    // 关键词检索
    const keywordScores = new Map<string, number>()
    for (const [memoryId, memory] of this.memoryStore) {
      let score = 0
      const content = memory.content.toLowerCase()

      for (const keyword of keywords) {
        if (content.includes(keyword.toLowerCase())) {
          score += 1
        }
      }

      if (score > 0) {
        keywordScores.set(memoryId, score / keywords.length)
      }
    }

    // 合并分数
    const combinedResults = new Map<string, { memory: SemanticMemory; score: number }>()

    for (const { memory, similarity } of semanticResults) {
      const keywordScore = keywordScores.get(memory.memoryId) || 0
      const combinedScore = similarity * semanticWeight + keywordScore * keywordWeight
      combinedResults.set(memory.memoryId, { memory, score: combinedScore })
    }

    // 添加纯关键词匹配的结果
    for (const [memoryId, keywordScore] of keywordScores) {
      if (!combinedResults.has(memoryId)) {
        const memory = this.memoryStore.get(memoryId)!
        combinedResults.set(memoryId, {
          memory,
          score: keywordScore * keywordWeight
        })
      }
    }

    // 排序并返回
    const results = Array.from(combinedResults.values())
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK)
  }

  /**
   * 获取会话的所有记忆
   */
  getSessionMemories(sessionId: string): SemanticMemory[] {
    return Array.from(this.memoryStore.values())
      .filter(memory => memory.sessionId === sessionId)
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * 删除会话的所有记忆
   */
  deleteSessionMemories(sessionId: string): number {
    let deleted = 0

    for (const [memoryId, memory] of this.memoryStore.entries()) {
      if (memory.sessionId === sessionId) {
        this.index.delete(memoryId)
        this.memoryStore.delete(memoryId)
        deleted++
      }
    }

    if (deleted > 0) {
      this.dirty = true
      this.save()
    }

    return deleted
  }

  /**
   * 清理旧记忆
   */
  cleanupOldMemories(maxAge: number = 30 * 24 * 60 * 60 * 1000): number {
    const now = Date.now()
    let deleted = 0

    for (const [memoryId, vectorIndex] of this.index.entries()) {
      if (now - vectorIndex.timestamp > maxAge) {
        this.index.delete(memoryId)
        this.memoryStore.delete(memoryId)
        deleted++
      }
    }

    if (deleted > 0) {
      this.dirty = true
      this.save()
      console.log(`[语义索引] 清理了 ${deleted} 条旧记忆`)
    }

    return deleted
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalMemories: this.memoryStore.size,
      totalVectors: this.index.size,
      sessions: new Set(Array.from(this.memoryStore.values()).map(m => m.sessionId)).size,
      intents: this.getIntentDistribution()
    }
  }

  /**
   * 获取意图分布
   */
  private getIntentDistribution() {
    const distribution = new Map<string, number>()

    for (const memory of this.memoryStore.values()) {
      const count = distribution.get(memory.intent) || 0
      distribution.set(memory.intent, count + 1)
    }

    return Object.fromEntries(distribution)
  }
}

// 导出单例
export const semanticIndexService = new SemanticIndexService()

// 每天清理一次旧记忆
setInterval(() => {
  semanticIndexService.cleanupOldMemories()
}, 24 * 60 * 60 * 1000)
