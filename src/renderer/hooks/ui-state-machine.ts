/**
 * UI 状态机
 * 定义产品的主要状态和状态转换规则
 */

export type UIState =
  | 'idle'          // 初始态：等待用户输入
  | 'loading'      // 加载中：查询执行中
  | 'result'       // 结果态：展示查询结果
  | 'analyzing'    // 分析中：AI正在分析
  | 'insight'      // 洞察态：展示AI分析结果
  | 'chatting'     // 对话态：进入深入对话

interface UIStateConfig {
  canQuery: boolean
  canAnalyze: boolean
  canChat: boolean
  showInput: boolean
  showResult: boolean
  showAnalysis: boolean
  showChat: boolean
}

// 状态配置映射
export const stateConfig: Record<UIState, UIStateConfig> = {
  idle: {
    canQuery: true,
    canAnalyze: false,
    canChat: false,
    showInput: true,
    showResult: false,
    showAnalysis: false,
    showChat: false,
  },
  loading: {
    canQuery: false,
    canAnalyze: false,
    canChat: false,
    showInput: true,
    showResult: false,
    showAnalysis: false,
    showChat: false,
  },
  result: {
    canQuery: true,
    canAnalyze: true,
    canChat: false,
    showInput: true,
    showResult: true,
    showAnalysis: false,
    showChat: false,
  },
  analyzing: {
    canQuery: false,
    canAnalyze: false,
    canChat: false,
    showInput: true,
    showResult: true,
    showAnalysis: false,
    showChat: false,
  },
  insight: {
    canQuery: true,
    canAnalyze: false,
    canChat: true,
    showInput: true,
    showResult: true,
    showAnalysis: true,
    showChat: false,
  },
  chatting: {
    canQuery: true,
    canAnalyze: false,
    canChat: true,
    showInput: true,
    showResult: true,
    showAnalysis: true,
    showChat: true,
  },
}

// 状态转换规则
export const canTransition = (from: UIState, to: UIState): boolean => {
  const transitions: Record<UIState, UIState[]> = {
    idle: ['loading'],
    loading: ['result', 'idle'],
    result: ['analyzing', 'idle'],
    analyzing: ['insight', 'result'],
    insight: ['chatting', 'result'],
    chatting: ['insight', 'idle'],
  }

  return transitions[from]?.includes(to) ?? false
}
