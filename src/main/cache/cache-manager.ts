/**
 * 本地缓存管理器
 * 管理数据库查询结果的本地缓存，支持自动清理
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'

export interface CacheEntry {
  key: string
  data: any
  timestamp: number
  size: number
  query: string
  database: string
  hitCount: number
  lastAccessTime: number
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  databases: Record<string, { entries: number; size: number }>
  oldestEntry?: number
  newestEntry?: number
  hitCount: number
  missCount: number
  hitRate: number
  topQueries: Array<{ query: string; database: string; hitCount: number }>
}

/**
 * 缓存配置
 */
interface CacheConfig {
  maxEntries: number
  maxSize: number // MB
  ttl: number // 毫秒
  autoClear: boolean
  clearOnDisconnect: boolean
}

/**
 * 缓存管理器
 */
export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map()
  private config: CacheConfig = {
    maxEntries: 1000,
    maxSize: 100, // 100MB
    ttl: 30 * 60 * 1000, // 30分钟
    autoClear: true,
    clearOnDisconnect: false // 默认不自动清除，用户可选择
  }
  private cacheFilePath: string
  private cleanupTimer?: NodeJS.Timeout
  private hitCount: number = 0
  private missCount: number = 0
  private queryPatterns: Map<string, number> = new Map() // 查询模式统计

  constructor() {
    const userDataPath = app.getPath('userData')
    this.cacheFilePath = path.join(userDataPath, 'cache', 'data-cache.json')
    this.loadCacheFromFile()

    // 定期清理过期缓存
    if (this.config.autoClear) {
      this.startCleanupTimer()
    }
  }

  /**
   * 生成缓存键
   */
  private generateKey(database: string, query: string): string {
    return `${database}:${query}`
  }

  /**
   * 添加缓存
   */
  async set(database: string, query: string, data: any): Promise<void> {
    const key = this.generateKey(database, query)
    const now = Date.now()
    const size = this.calculateSize(data)

    // 检查是否超过最大缓存数
    if (this.cache.size >= this.config.maxEntries) {
      await this.evictOldest()
    }

    // 检查是否超过最大缓存大小
    const currentSize = this.getTotalSize()
    if (currentSize + size > this.config.maxSize * 1024 * 1024) {
      await this.evictBySize(size)
    }

    // 检查是否已存在，如果存在则更新而不是替换
    const existing = this.cache.get(key)
    this.cache.set(key, {
      key,
      data,
      timestamp: now,
      size,
      query,
      database,
      hitCount: existing?.hitCount || 0,
      lastAccessTime: now
    })

    // 持久化到文件
    await this.saveCacheToFile()
  }

  /**
   * 获取缓存
   */
  async get(database: string, query: string): Promise<any | null> {
    const key = this.generateKey(database, query)
    const entry = this.cache.get(key)

    if (!entry) {
      this.missCount++
      this.trackQueryPattern(query)
      return null
    }

    // 检查是否过期
    const now = Date.now()
    if (now - entry.timestamp > this.config.ttl) {
      this.cache.delete(key)
      this.missCount++
      await this.saveCacheToFile()
      return null
    }

    // 缓存命中，更新统计
    this.hitCount++
    entry.hitCount++
    entry.lastAccessTime = now
    this.trackQueryPattern(query)

    return entry.data
  }

  /**
   * 清除指定数据库的所有缓存
   */
  async clearDatabase(database: string): Promise<void> {
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (entry.database === database) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key)
    }

    await this.saveCacheToFile()
  }

  /**
   * 清除所有缓存
   */
  async clearAll(): Promise<void> {
    this.cache.clear()
    await this.saveCacheToFile()
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const stats: CacheStats = {
      totalEntries: this.cache.size,
      totalSize: 0,
      databases: {},
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: this.hitCount + this.missCount > 0
        ? this.hitCount / (this.hitCount + this.missCount)
        : 0,
      topQueries: []
    }

    let oldest = Infinity
    let newest = -Infinity
    const queryHits: Map<string, { query: string; database: string; hitCount: number }> = new Map()

    for (const entry of this.cache.values()) {
      stats.totalSize += entry.size

      // 按数据库统计
      if (!stats.databases[entry.database]) {
        stats.databases[entry.database] = { entries: 0, size: 0 }
      }
      stats.databases[entry.database].entries++
      stats.databases[entry.database].size += entry.size

      // 最老和最新条目
      if (entry.timestamp < oldest) oldest = entry.timestamp
      if (entry.timestamp > newest) newest = entry.timestamp

      // 收集查询命中率
      const queryKey = `${entry.database}:${entry.query.substring(0, 50)}`
      queryHits.set(queryKey, {
        query: entry.query.substring(0, 100),
        database: entry.database,
        hitCount: entry.hitCount
      })
    }

    if (oldest !== Infinity) stats.oldestEntry = oldest
    if (newest !== -Infinity) stats.newestEntry = newest

    // Top 5 查询
    stats.topQueries = Array.from(queryHits.values())
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 5)

    return stats
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config }

    if (config.autoClear !== undefined && config.autoClear) {
      this.startCleanupTimer()
    } else if (config.autoClear === false) {
      this.stopCleanupTimer()
    }
  }

  /**
   * 获取配置
   */
  getConfig(): CacheConfig {
    return { ...this.config }
  }

  /**
   * 清理过期缓存
   */
  async cleanupExpired(): Promise<number> {
    const now = Date.now()
    const expiredKeys: string[] = []
    let cleanedSize = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        expiredKeys.push(key)
        cleanedSize += entry.size
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key)
    }

    if (expiredKeys.length > 0) {
      await this.saveCacheToFile()
    }

    return cleanedSize
  }

  /**
   * 淘汰最老的缓存（使用 LFU + LRU 策略）
   * 优先淘汰访问次数少且最久未访问的条目
   */
  private async evictOldest(): Promise<void> {
    let evictKey: string | null = null
    let lowestScore = Infinity

    for (const [key, entry] of this.cache.entries()) {
      // 计算淘汰分数：访问次数越少、越久未访问，分数越低
      const age = Date.now() - entry.lastAccessTime
      const score = entry.hitCount * 1000000 - age

      if (score < lowestScore) {
        lowestScore = score
        evictKey = key
      }
    }

    if (evictKey) {
      this.cache.delete(evictKey)
    }
  }

  /**
   * 按大小淘汰缓存
   */
  private async evictBySize(requiredSize: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)

    let freedSize = 0
    for (const [key, entry] of entries) {
      this.cache.delete(key)
      freedSize += entry.size
      if (freedSize >= requiredSize) break
    }
  }

  /**
   * 计算数据大小（字节）
   */
  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2 // 粗略估算，UTF-16 编码
  }

  /**
   * 获取总缓存大小
   */
  private getTotalSize(): number {
    let total = 0
    for (const entry of this.cache.values()) {
      total += entry.size
    }
    return total
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.stopCleanupTimer()
    this.cleanupTimer = setInterval(async () => {
      await this.cleanupExpired()
    }, 5 * 60 * 1000) // 每5分钟清理一次
  }

  /**
   * 停止清理定时器
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * 保存缓存到文件
   */
  private async saveCacheToFile(): Promise<void> {
    try {
      const cacheDir = path.dirname(this.cacheFilePath)
      await fs.mkdir(cacheDir, { recursive: true })

      const cacheData = Array.from(this.cache.entries())
      await fs.writeFile(
        this.cacheFilePath,
        JSON.stringify(cacheData),
        'utf-8'
      )
    } catch (error) {
      console.error('Failed to save cache to file:', error)
    }
  }

  /**
   * 从文件加载缓存
   */
  private async loadCacheFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.cacheFilePath, 'utf-8')
      const cacheData = JSON.parse(data)

      for (const [key, entry] of cacheData) {
        // 检查是否过期
        const now = Date.now()
        if (now - entry.timestamp <= this.config.ttl) {
          this.cache.set(key, entry)
        }
      }
    } catch (error) {
      // 文件不存在或读取失败，忽略
      console.debug('No cache file found or failed to load')
    }
  }

  /**
   * 销毁缓存管理器
   */
  async destroy(): Promise<void> {
    this.stopCleanupTimer()
    await this.saveCacheToFile()
  }

  /**
   * 追踪查询模式
   */
  private trackQueryPattern(query: string): void {
    // 提取查询模式（去掉具体值）
    const pattern = query
      .replace(/\d+/g, 'N')
      .replace(/'[^\']*'/g, "'S'")
      .replace(/"[^"]*"/g, '"S"')
      .toLowerCase()

    const count = this.queryPatterns.get(pattern) || 0
    this.queryPatterns.set(pattern, count + 1)
  }

  /**
   * 获取热门查询模式
   */
  getTopPatterns(limit: number = 10): Array<{ pattern: string; count: number }> {
    return Array.from(this.queryPatterns.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.hitCount = 0
    this.missCount = 0
  }

  /**
   * 预热缓存（批量添加常用查询）
   */
  async warmCache(database: string, queries: Array<{ query: string; data: any }>): Promise<void> {
    for (const { query, data } of queries) {
      await this.set(database, query, data)
    }
  }

  /**
   * 获取缓存预热建议（基于查询模式）
   */
  getWarmingSuggestions(): Array<{ database: string; queryPattern: string; priority: number }> {
    const suggestions: Array<{ database: string; queryPattern: string; priority: number }> = []
    const patternCount = this.getTopPatterns(20)

    for (const { pattern, count } of patternCount) {
      // 找到使用此模式的实际查询
      for (const entry of this.cache.values()) {
        const normalizedQuery = entry.query
          .replace(/\d+/g, 'N')
          .replace(/'[^\']*'/g, "'S'")
          .replace(/"[^"]*"/g, '"S"')
          .toLowerCase()

        if (normalizedQuery.includes(pattern)) {
          suggestions.push({
            database: entry.database,
            queryPattern: entry.query,
            priority: count
          })
          break
        }
      }
    }

    return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 10)
  }
}

// 导出单例
export const cacheManager = new CacheManager()
