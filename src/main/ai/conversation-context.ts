/**
 * 对话式分析上下文管理系统
 * 用于支持用户围绕同一个数据问题持续追问
 */

// 简单的 UUID 生成函数
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

// ==================== 类型定义 ====================

export interface AnalysisContext {
  sessionId: string
  metric: string
  baseQuery: string
  databaseConfig?: any
  timeRange?: string
  createdAt: Date
  updatedAt: Date
  currentAnalysis: {
    trend?: {
      dates: string[]
      values: number[]
      current: number
      previous: number
      changePercent: number
      trend: 'up' | 'down' | 'stable'
    }
    breakdown?: Array<{
      dimension: string
      key: string
      currentValue: number
      previousValue: number
      changePercent: number
      contribution: number
    }>
    comparison?: {
      metric: string
      current: number
      previous: number
      changePercent: number
      significantChange: boolean
    }
    problems?: Array<{
      dimension: string
      issue: string
      severity: 'high' | 'medium' | 'low'
      value: number
      threshold: number
    }>
    drivers?: Array<{
      dimension: string
      key: string
      contribution: number
      impact: 'positive' | 'negative'
      description: string
    }>
  }
  history: ConversationTurn[]
  availableDimensions: string[]  // 可用的分析维度
  executedQueries: string[]       // 已执行的 SQL
}

export interface ConversationTurn {
  id: string
  timestamp: Date
  user: string
  ai: string
  questionType?: 'explanation' | 'breakdown' | 'deep_dive' | 'general' | 'unsupported'
  newSQL?: string
  additionalAnalysis?: any
}

export interface QuestionClassification {
  type: 'explanation' | 'breakdown' | 'deep_dive' | 'general' | 'unsupported'
  confidence: number
  requiresNewSQL: boolean
  suggestedDimension?: string
  reasoning: string
}

// ==================== 上下文管理器 ====================

export class ConversationContextManager {
  private contexts: Map<string, AnalysisContext> = new Map()

  /**
   * 创建新的分析上下文
   */
  createContext(
    metric: string,
    baseQuery: string,
    analysisData: any,
    databaseConfig?: any,
    timeRange?: string
  ): AnalysisContext {
    const sessionId = generateId()
    const now = new Date()

    const context: AnalysisContext = {
      sessionId,
      metric,
      baseQuery,
      databaseConfig,
      timeRange,
      createdAt: now,
      updatedAt: now,
      currentAnalysis: {
        trend: analysisData.trend,
        breakdown: analysisData.breakdowns || [],
        comparison: analysisData.comparison,
        problems: analysisData.problems || [],
        drivers: analysisData.drivers || []
      },
      history: [],
      availableDimensions: ['channel', 'platform', 'device', 'region'],
      executedQueries: []
    }

    this.contexts.set(sessionId, context)
    console.log(`[上下文管理] 创建新会话: ${sessionId}`)
    return context
  }

  /**
   * 获取上下文
   */
  getContext(sessionId: string): AnalysisContext | null {
    return this.contexts.get(sessionId) || null
  }

  /**
   * 更新上下文
   */
  updateContext(sessionId: string, updates: Partial<AnalysisContext>): boolean {
    const context = this.contexts.get(sessionId)
    if (!context) return false

    Object.assign(context, updates, { updatedAt: new Date() })
    this.contexts.set(sessionId, context)
    return true
  }

  /**
   * 添加对话记录
   */
  addConversationTurn(
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    questionType: QuestionClassification['type'],
    newSQL?: string,
    additionalAnalysis?: any
  ): boolean {
    const context = this.contexts.get(sessionId)
    if (!context) return false

    const turn: ConversationTurn = {
      id: generateId(),
      timestamp: new Date(),
      user: userMessage,
      ai: aiResponse,
      questionType,
      newSQL,
      additionalAnalysis
    }

    context.history.push(turn)
    context.updatedAt = new Date()

    if (newSQL) {
      context.executedQueries.push(newSQL)
    }

    this.contexts.set(sessionId, context)
    return true
  }

  /**
   * 获取对话历史
   */
  getConversationHistory(sessionId: string): ConversationTurn[] {
    const context = this.contexts.get(sessionId)
    return context?.history || []
  }

  /**
   * 删除上下文
   */
  deleteContext(sessionId: string): boolean {
    return this.contexts.delete(sessionId)
  }

  /**
   * 清理过期上下文（超过1小时）
   */
  cleanupExpiredContexts(): number {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    let cleaned = 0

    for (const [sessionId, context] of this.contexts.entries()) {
      if (context.updatedAt < oneHourAgo) {
        this.contexts.delete(sessionId)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * 获取上下文摘要（用于 Prompt）
   */
  getContextSummary(sessionId: string): string | null {
    const context = this.contexts.get(sessionId)
    if (!context) return null

    const summary: string[] = []

    // 基本信息
    summary.push(`【分析上下文】`)
    summary.push(`指标：${context.metric}`)
    summary.push(`基础查询：${context.baseQuery}`)
    if (context.timeRange) {
      summary.push(`时间范围：${context.timeRange}`)
    }
    summary.push(`对话轮次：${context.history.length}`)

    // 当前分析发现
    if (context.currentAnalysis.trend) {
      const trend = context.currentAnalysis.trend
      summary.push(`\n【趋势】`)
      summary.push(`当前值：${trend.current}`)
      summary.push(`上期值：${trend.previous}`)
      summary.push(`变化：${trend.changePercent.toFixed(2)}%`)
      summary.push(`趋势：${trend.trend}`)
    }

    // 关键问题
    if (context.currentAnalysis.problems && context.currentAnalysis.problems.length > 0) {
      summary.push(`\n【已识别的问题】`)
      context.currentAnalysis.problems.forEach((p, i) => {
        summary.push(`${i + 1}. ${p.dimension} - ${p.issue} (严重程度: ${p.severity})`)
      })
    }

    // 主要驱动因素
    if (context.currentAnalysis.drivers && context.currentAnalysis.drivers.length > 0) {
      summary.push(`\n【主要驱动因素】`)
      context.currentAnalysis.drivers.slice(0, 3).forEach((d, i) => {
        summary.push(`${i + 1}. ${d.key} (${d.dimension}) - 贡献度 ${d.contribution.toFixed(1)}%`)
      })
    }

    // 对话历史摘要
    if (context.history.length > 0) {
      summary.push(`\n【对话历史】`)
      context.history.slice(-3).forEach((turn, i) => {
        summary.push(`Q${context.history.length - 3 + i + 1}: ${turn.user}`)
        summary.push(`A${context.history.length - 3 + i + 1}: ${turn.ai.slice(0, 100)}...`)
      })
    }

    return summary.join('\n')
  }

  /**
   * 获取可用的分析维度
   */
  getAvailableDimensions(sessionId: string): string[] {
    const context = this.contexts.get(sessionId)
    return context?.availableDimensions || []
  }

  /**
   * 生成追问建议
   */
  generateFollowUpQuestions(sessionId: string): string[] {
    const context = this.contexts.get(sessionId)
    if (!context) return []

    const questions: string[] = []

    // 基于问题生成追问
    if (context.currentAnalysis.problems && context.currentAnalysis.problems.length > 0) {
      const topProblem = context.currentAnalysis.problems[0]
      questions.push(`为什么 ${topProblem.dimension} 会${topProblem.issue.includes('下降') ? '下降' : '异常'}？`)
    }

    // 基于驱动因素生成追问
    if (context.currentAnalysis.drivers && context.currentAnalysis.drivers.length > 0) {
      const topDriver = context.currentAnalysis.drivers[0]
      questions.push(`哪些因素推动了 ${topDriver.key} 的${topDriver.impact === 'positive' ? '增长' : '下降'}？`)
    }

    // 基于维度生成追问
    const unusedDimensions = context.availableDimensions.filter(
      dim => !context.currentAnalysis.breakdown?.some(b => b.dimension === dim)
    )
    if (unusedDimensions.length > 0) {
      questions.push(`按${unusedDimensions[0]}拆解的结果如何？`)
    }

    // 通用追问
    if (context.currentAnalysis.trend?.changePercent && Math.abs(context.currentAnalysis.trend.changePercent) > 10) {
      questions.push(`这个变化趋势可持续吗？`)
    }

    return questions.slice(0, 3)
  }

  /**
   * 检查是否需要新的 SQL 分析
   */
  requiresNewAnalysis(sessionId: string, question: string): {
    required: boolean
    suggestedDimension?: string
    suggestedSQL?: string
    reasoning: string
  } {
    const context = this.contexts.get(sessionId)
    if (!context) {
      return { required: false, reasoning: '上下文不存在' }
    }

    // 检查是否询问新维度
    for (const dimension of context.availableDimensions) {
      if (question.includes(dimension) && !context.currentAnalysis.breakdown?.some(b => b.dimension === dimension)) {
        return {
          required: true,
          suggestedDimension: dimension,
          reasoning: `用户询问新维度 ${dimension}，需要补充分析`
        }
      }
    }

    // 检查是否需要更细粒度数据
    if (question.includes('详细') || question.includes('具体') || question.includes('细分')) {
      return {
        required: true,
        reasoning: '用户要求更细粒度的分析'
      }
    }

    return { required: false, reasoning: '基于现有数据即可回答' }
  }
}

// 导出单例
export const conversationContextManager = new ConversationContextManager()

// 每小时清理一次过期上下文
setInterval(() => {
  const cleaned = conversationContextManager.cleanupExpiredContexts()
  if (cleaned > 0) {
    console.log(`[上下文管理] 清理了 ${cleaned} 个过期会话`)
  }
}, 60 * 60 * 1000)
