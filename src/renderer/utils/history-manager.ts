/**
 * 查询历史管理器
 * 用于保存和恢复用户的查询历史和收藏
 */

export interface QueryHistory {
  id: string
  query: string
  sql: string
  timestamp: Date
  resultCount: number
  executionTime?: number
  database?: string
  favorite: boolean
  tags?: string[]
}

export interface FavoriteAnalysis {
  id: string
  name: string
  type: 'query' | 'analysis' | 'funnel'
  data: any
  timestamp: Date
}

const HISTORY_KEY = 'data_insight_history'
const FAVORITES_KEY = 'data_insight_favorites'
const MAX_HISTORY = 100

/**
 * 保存查询到历史
 */
export function saveToHistory(item: Omit<QueryHistory, 'id' | 'timestamp' | 'favorite'>): void {
  try {
    const history = getHistory()
    const newItem: QueryHistory = {
      ...item,
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date(),
      favorite: false
    }

    // 检查是否已存在相同的查询
    const existingIndex = history.findIndex(h => h.query === item.query)
    if (existingIndex !== -1) {
      history.splice(existingIndex, 1)
    }

    // 添加到开头
    history.unshift(newItem)

    // 限制历史记录数量
    const trimmed = history.slice(0, MAX_HISTORY)

    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
  } catch (error) {
    console.error('保存历史失败:', error)
  }
}

/**
 * 获取查询历史
 */
export function getHistory(): QueryHistory[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY)
    if (!data) return []

    const parsed = JSON.parse(data)
    // 转换日期字符串回 Date 对象
    return parsed.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp)
    }))
  } catch (error) {
    console.error('读取历史失败:', error)
    return []
  }
}

/**
 * 删除历史记录
 */
export function deleteFromHistory(id: string): void {
  try {
    const history = getHistory()
    const filtered = history.filter(h => h.id !== id)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('删除历史失败:', error)
  }
}

/**
 * 清空历史
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch (error) {
    console.error('清空历史失败:', error)
  }
}

/**
 * 切换收藏状态
 */
export function toggleFavorite(id: string): boolean {
  try {
    const history = getHistory()
    const item = history.find(h => h.id === id)
    if (item) {
      item.favorite = !item.favorite
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
      return item.favorite
    }
    return false
  } catch (error) {
    console.error('切换收藏失败:', error)
    return false
  }
}

/**
 * 获取收藏列表
 */
export function getFavorites(): QueryHistory[] {
  try {
    const history = getHistory()
    return history.filter(h => h.favorite)
  } catch (error) {
    console.error('获取收藏失败:', error)
    return []
  }
}

/**
 * 搜索历史
 */
export function searchHistory(keyword: string): QueryHistory[] {
  try {
    const history = getHistory()
    const lowerKeyword = keyword.toLowerCase()
    return history.filter(h =>
      h.query.toLowerCase().includes(lowerKeyword) ||
      h.sql.toLowerCase().includes(lowerKeyword) ||
      (h.tags && h.tags.some(t => t.toLowerCase().includes(lowerKeyword)))
    )
  } catch (error) {
    console.error('搜索历史失败:', error)
    return []
  }
}

/**
 * 添加标签
 */
export function addTag(id: string, tag: string): void {
  try {
    const history = getHistory()
    const item = history.find(h => h.id === id)
    if (item) {
      if (!item.tags) item.tags = []
      if (!item.tags.includes(tag)) {
        item.tags.push(tag)
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
      }
    }
  } catch (error) {
    console.error('添加标签失败:', error)
  }
}

/**
 * 移除标签
 */
export function removeTag(id: string, tag: string): void {
  try {
    const history = getHistory()
    const item = history.find(h => h.id === id)
    if (item && item.tags) {
      item.tags = item.tags.filter(t => t !== tag)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    }
  } catch (error) {
    console.error('移除标签失败:', error)
  }
}

/**
 * 保存收藏的分析
 */
export function saveFavoriteAnalysis(item: Omit<FavoriteAnalysis, 'id' | 'timestamp'>): void {
  try {
    const favorites = getFavoriteAnalyses()
    const newItem: FavoriteAnalysis = {
      ...item,
      id: `fav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date()
    }

    favorites.push(newItem)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  } catch (error) {
    console.error('保存收藏分析失败:', error)
  }
}

/**
 * 获取收藏的分析列表
 */
export function getFavoriteAnalyses(): FavoriteAnalysis[] {
  try {
    const data = localStorage.getItem(FAVORITES_KEY)
    if (!data) return []

    const parsed = JSON.parse(data)
    return parsed.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp)
    }))
  } catch (error) {
    console.error('获取收藏分析失败:', error)
    return []
  }
}

/**
 * 删除收藏的分析
 */
export function deleteFavoriteAnalysis(id: string): void {
  try {
    const favorites = getFavoriteAnalyses()
    const filtered = favorites.filter(f => f.id !== id)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('删除收藏分析失败:', error)
  }
}

/**
 * 获取统计信息
 */
export function getHistoryStats(): {
  totalQueries: number
  favorites: number
  thisWeek: number
  topQueries: string[]
} {
  try {
    const history = getHistory()
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const thisWeek = history.filter(h => h.timestamp > weekAgo).length
    const favorites = history.filter(h => h.favorite).length

    // 统计最常用的查询（前5个）
    const queryCount = new Map<string, number>()
    history.forEach(h => {
      queryCount.set(h.query, (queryCount.get(h.query) || 0) + 1)
    })
    const topQueries = Array.from(queryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query]) => query)

    return {
      totalQueries: history.length,
      favorites,
      thisWeek,
      topQueries
    }
  } catch (error) {
    console.error('获取统计失败:', error)
    return {
      totalQueries: 0,
      favorites: 0,
      thisWeek: 0,
      topQueries: []
    }
  }
}
