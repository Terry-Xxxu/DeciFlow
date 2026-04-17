/**
 * PerformanceMonitorContext - 查询性能监控
 * 跟踪查询、分析、渲染等操作的执行时间和性能指标
 */

import React, { createContext, useContext, useState, useCallback } from 'react'

export interface PerformanceMetric {
  id: string
  timestamp: Date
  type: 'query' | 'sql-generation' | 'analysis' | 'render' | 'cache'
  operation: string
  duration: number // 毫秒
  metadata?: {
    queryLength?: number
    rowCount?: number
    cacheHit?: boolean
    databaseType?: string
    [key: string]: any
  }
}

export interface PerformanceSummary {
  totalQueries: number
  averageQueryTime: number
  slowQueries: number
  fastestQuery: number
  slowestQuery: number
  cacheHitRate: number
}

interface PerformanceMonitorContextType {
  metrics: PerformanceMetric[]
  isMonitoring: boolean
  startMonitoring: () => void
  stopMonitoring: () => void
  recordMetric: (metric: Omit<PerformanceMetric, 'id' | 'timestamp'>) => void
  getSummary: (timeRange?: { start: Date; end: Date }) => PerformanceSummary
  getSlowQueries: (threshold?: number) => PerformanceMetric[]
  clearMetrics: () => void
  getMetricsByType: (type: PerformanceMetric['type']) => PerformanceMetric[]
}

const PerformanceMonitorContext = createContext<PerformanceMonitorContextType | undefined>(undefined)

export const usePerformanceMonitor = () => {
  const context = useContext(PerformanceMonitorContext)
  if (!context) {
    throw new Error('usePerformanceMonitor must be used within PerformanceMonitorProvider')
  }
  return context
}

interface PerformanceMonitorProviderProps {
  children: React.ReactNode
  maxMetrics?: number // 最多保留的指标数量
  persistenceKey?: string // 本地存储的key
}

export const PerformanceMonitorProvider: React.FC<PerformanceMonitorProviderProps> = ({
  children,
  maxMetrics = 1000,
  persistenceKey = 'performance_metrics'
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>(() => {
    // 从 localStorage 加载历史数据
    try {
      const saved = localStorage.getItem(persistenceKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error)
    }
    return []
  })

  const [isMonitoring, setIsMonitoring] = useState(true)

  // 保存到 localStorage
  const persistMetrics = useCallback((newMetrics: PerformanceMetric[]) => {
    try {
      const toSave = newMetrics.slice(-maxMetrics) // 只保留最新的
      localStorage.setItem(persistenceKey, JSON.stringify(toSave))
    } catch (error) {
      console.error('Failed to persist performance metrics:', error)
    }
  }, [persistenceKey, maxMetrics])

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true)
  }, [])

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
  }, [])

  const recordMetric = useCallback((metric: Omit<PerformanceMetric, 'id' | 'timestamp'>) => {
    if (!isMonitoring) return

    const newMetric: PerformanceMetric = {
      ...metric,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }

    setMetrics(prev => {
      const updated = [...prev, newMetric]
      // 限制数量
      if (updated.length > maxMetrics) {
        updated.splice(0, updated.length - maxMetrics)
      }
      persistMetrics(updated)
      return updated
    })
  }, [isMonitoring, maxMetrics, persistMetrics])

  const getSummary = useCallback((timeRange?: { start: Date; end: Date }): PerformanceSummary => {
    let filteredMetrics = metrics

    if (timeRange) {
      filteredMetrics = metrics.filter(m =>
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      )
    }

    const queryMetrics = filteredMetrics.filter(m => m.type === 'query')

    if (queryMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        fastestQuery: 0,
        slowestQuery: 0,
        cacheHitRate: 0
      }
    }

    const durations = queryMetrics.map(m => m.duration)
    const averageQueryTime = durations.reduce((a, b) => a + b, 0) / durations.length
    const slowQueries = queryMetrics.filter(m => m.duration > 2000).length // 2秒以上算慢查询

    const cacheMetrics = filteredMetrics.filter(m => m.type === 'cache')
    const cacheHits = cacheMetrics.filter(m => m.metadata?.cacheHit === true).length
    const cacheHitRate = cacheMetrics.length > 0 ? (cacheHits / cacheMetrics.length) * 100 : 0

    return {
      totalQueries: queryMetrics.length,
      averageQueryTime: Math.round(averageQueryTime),
      slowQueries,
      fastestQuery: Math.min(...durations),
      slowestQuery: Math.max(...durations),
      cacheHitRate: Math.round(cacheHitRate)
    }
  }, [metrics])

  const getSlowQueries = useCallback((threshold = 2000) => {
    return metrics
      .filter(m => m.type === 'query' && m.duration >= threshold)
      .sort((a, b) => b.duration - a.duration)
  }, [metrics])

  const clearMetrics = useCallback(() => {
    setMetrics([])
    localStorage.removeItem(persistenceKey)
  }, [persistenceKey])

  const getMetricsByType = useCallback((type: PerformanceMetric['type']) => {
    return metrics.filter(m => m.type === type)
  }, [metrics])

  return (
    <PerformanceMonitorContext.Provider
      value={{
        metrics,
        isMonitoring,
        startMonitoring,
        stopMonitoring,
        recordMetric,
        getSummary,
        getSlowQueries,
        clearMetrics,
        getMetricsByType
      }}
    >
      {children}
    </PerformanceMonitorContext.Provider>
  )
}

/**
 * 性能监控 Hook - 用于包装异步操作
 */
export const usePerformanceTracking = () => {
  const { recordMetric } = usePerformanceMonitor()

  const trackAsync = useCallback(async <T,>(
    type: PerformanceMetric['type'],
    operation: string,
    fn: () => Promise<T>,
    metadata?: PerformanceMetric['metadata']
  ): Promise<T> => {
    const startTime = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - startTime
      recordMetric({
        type,
        operation,
        duration,
        metadata: {
          ...metadata,
          success: true
        }
      })
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      recordMetric({
        type,
        operation,
        duration,
        metadata: {
          ...metadata,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }, [recordMetric])

  return { trackAsync }
}
