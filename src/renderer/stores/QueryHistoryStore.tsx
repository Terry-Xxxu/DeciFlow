/**
 * Query History Store
 * Manages query history with localStorage persistence
 */

export interface QueryHistoryItem {
  id: string
  query: string
  timestamp: number
  time: string
  rows?: number
  duration?: string
  status: "success" | "error"
}

const QUERY_HISTORY_KEY = "deciflow_query_history"
const MAX_HISTORY = 50

/**
 * Get all query history from localStorage
 */
export function getQueryHistory(): QueryHistoryItem[] {
  try {
    const saved = localStorage.getItem(QUERY_HISTORY_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error("Failed to load query history:", error)
  }
  return []
}

/**
 * Save query history to localStorage
 */
function saveQueryHistory(history: QueryHistoryItem[]) {
  try {
    localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(history))
  } catch (error) {
    console.error("Failed to save query history:", error)
  }
}

/**
 * Add a query to history
 */
export function addQueryToHistory(
  query: string,
  status: "success" | "error" = "success",
  rows?: number,
  duration?: string
): void {
  const history = getQueryHistory()
  const now = Date.now()
  const item: QueryHistoryItem = {
    id: `query-${now}`,
    query,
    timestamp: now,
    time: formatTime(now),
    rows,
    duration,
    status,
  }

  // Add to beginning and limit size
  const newHistory = [item, ...history].slice(0, MAX_HISTORY)
  saveQueryHistory(newHistory)
}

/**
 * Remove a query from history
 */
export function removeFromHistory(id: string): void {
  const history = getQueryHistory()
  const newHistory = history.filter((item) => item.id !== id)
  saveQueryHistory(newHistory)
}

/**
 * Clear all query history
 */
export function clearQueryHistory(): void {
  localStorage.removeItem(QUERY_HISTORY_KEY)
}

/**
 * Format timestamp to relative time
 */
function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()}`
}
