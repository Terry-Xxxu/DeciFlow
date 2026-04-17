/**
 * UI 状态管理 Hook
 * 管理产品的主要状态和状态转换
 */

import { useState, useCallback } from 'react'
import { UIState, stateConfig, canTransition } from './ui-state-machine'

interface QueryData {
  sql: string
  data: any[]
  executionTime: number
}

interface AnalysisData {
  metrics: any[]
  insights: any[]
  chartType?: string
}

interface UIStateReturn {
  state: UIState
  queryData: QueryData | null
  analysisData: AnalysisData | null
  config: UIStateConfig

  // Actions
  startQuery: () => void
  completeQuery: (data: QueryData) => void
  startAnalysis: () => void
  completeAnalysis: (data: AnalysisData) => void
  startChat: () => void
  endChat: () => void
  reset: () => void

  // Helpers
  canDoAction: (action: 'query' | 'analyze' | 'chat') => boolean
}

export const useUIState = (): UIStateReturn => {
  const [state, setState] = useState<UIState>('idle')
  const [queryData, setQueryData] = useState<QueryData | null>(null)
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)

  const config = stateConfig[state]

  // 开始查询
  const startQuery = useCallback(() => {
    if (!canTransition(state, 'loading')) return
    setState('loading')
  }, [state])

  // 完成查询
  const completeQuery = useCallback((data: QueryData) => {
    if (!canTransition(state, 'result')) return
    setQueryData(data)
    setState('result')
  }, [state])

  // 开始分析
  const startAnalysis = useCallback(() => {
    if (!canTransition(state, 'analyzing')) return
    setState('analyzing')
  }, [state])

  // 完成分析
  const completeAnalysis = useCallback((data: AnalysisData) => {
    if (!canTransition(state, 'insight')) return
    setAnalysisData(data)
    setState('insight')
  }, [state])

  // 开始对话
  const startChat = useCallback(() => {
    if (!canTransition(state, 'chatting')) return
    setState('chatting')
  }, [state])

  // 结束对话
  const endChat = useCallback(() => {
    if (!canTransition(state, 'insight')) return
    setState('insight')
  }, [state])

  // 重置
  const reset = useCallback(() => {
    setState('idle')
    setQueryData(null)
    setAnalysisData(null)
  }, [])

  // 检查是否可以执行某个操作
  const canDoAction = useCallback((action: 'query' | 'analyze' | 'chat') => {
    switch (action) {
      case 'query':
        return config.canQuery
      case 'analyze':
        return config.canAnalyze
      case 'chat':
        return config.canChat
    }
  }, [config])

  return {
    state,
    queryData,
    analysisData,
    config,
    startQuery,
    completeQuery,
    startAnalysis,
    completeAnalysis,
    startChat,
    endChat,
    reset,
    canDoAction,
  }
}
