/**
 * 数据分析引擎 V3
 * 从"查询工具"升级为"分析助手"
 * 实现一键自动分析能力
 */

import { AIChatManager } from '../ai/adapter'
import { databaseManager } from '../database/manager'

// ==================== 类型定义 ====================

export interface AnalyzeRequest {
  queryResult: {
    rows: any[]
    rowCount: number
    sql: string
  }
  metric?: string  // 指标 ID
  dimensions?: string[]  // 维度
  databaseConfig?: any
  timeRange?: string
}

export interface TrendData {
  dates: string[]
  values: number[]
  current: number
  previous: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
}

export interface BreakdownItem {
  dimension: string
  key: string
  currentValue: number
  previousValue: number
  changePercent: number
  contribution: number  // 贡献度
}

export interface ComparisonData {
  metric: string
  current: number
  previous: number
  changePercent: number
  significantChange: boolean
}

export interface AnalysisData {
  metric: string
  trend: TrendData
  breakdowns: BreakdownItem[]  // Top 2 维度拆解
  comparison: ComparisonData
}

export interface Problem {
  dimension: string
  issue: string
  severity: 'high' | 'medium' | 'low'
  value: number
  threshold: number
}

export interface Driver {
  dimension: string
  key: string
  contribution: number
  impact: 'positive' | 'negative'
  description: string
}

export interface Action {
  priority: 'P0' | 'P1' | 'P2'
  action: string
  target?: string
  expectedImpact?: string
}

export interface AnalyzeResult {
  summary: string  // 一句话总结
  conclusion: string  // 核心结论
  problems: Problem[]  // 关键问题（最多3个）
  drivers: Driver[]  // 主要驱动因素
  impact: {
    judgment: 'positive' | 'negative' | 'neutral'
    severity: 'high' | 'medium' | 'low'
    description: string
  }
  actions: Action[]  // 行动建议
  metadata: {
    analyzedAt: Date
    dataTimeRange: string
    analysisDuration: number
    dataQuality: 'good' | 'fair' | 'poor'
  }
}

// ==================== 分析引擎 ====================

export class AnalyzeEngine {
  private aiManager: AIChatManager

  constructor(aiManager: AIChatManager) {
    this.aiManager = aiManager
  }

  /**
   * 主入口：执行分析
   */
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResult> {
    const startTime = Date.now()

    // STEP 1: 识别分析对象
    const analysisTarget = this.identifyTarget(request)

    // STEP 2: 趋势分析
    const trend = await this.analyzeTrend(analysisTarget, request)

    // STEP 3: 自动拆解分析（Top 2 维度）
    const breakdowns = await this.analyzeBreakdown(analysisTarget, request, trend)

    // STEP 4: 对比分析
    const comparison = this.analyzeComparison(trend, breakdowns)

    // STEP 5: 汇总分析数据
    const analysisData: AnalysisData = {
      metric: analysisTarget.metric,
      trend,
      breakdowns,
      comparison
    }

    // STEP 6: 智能问题识别
    const problems = this.identifyProblems(breakdowns, comparison)

    // STEP 7: 识别主要驱动因素
    const drivers = this.identifyDrivers(breakdowns, trend)

    // STEP 8: 判断影响
    const impact = this.judgeImpact(trend, problems, drivers)

    // STEP 9: 生成行动建议
    const actions = this.generateActions(problems, drivers, impact)

    // STEP 10: 调用 AI 生成分析报告
    const aiAnalysis = await this.generateAIReport(analysisData, problems, drivers, impact, actions)

    const duration = Date.now() - startTime

    return {
      summary: aiAnalysis.summary,
      conclusion: aiAnalysis.conclusion,
      problems,
      drivers,
      impact,
      actions: aiAnalysis.actions,
      metadata: {
        analyzedAt: new Date(),
        dataTimeRange: request.timeRange || '最近7天',
        analysisDuration: duration,
        dataQuality: this.assessDataQuality(request.queryResult.rowCount)
      }
    }
  }

  /**
   * STEP 1: 识别分析对象
   */
  private identifyTarget(request: AnalyzeRequest): {
    metric: string
    dimensions: string[]
    timeField: string
  } {
    // 默认值
    let metric = 'new_users'
    let dimensions = ['channel', 'platform']
    let timeField = 'created_at'

    // 如果有 metric，使用 metric
    if (request.metric) {
      metric = request.metric
    }

    // 如果有 dimensions，使用 dimensions
    if (request.dimensions && request.dimensions.length > 0) {
      dimensions = request.dimensions
    }

    return { metric, dimensions, timeField }
  }

  /**
   * STEP 2: 趋势分析
   */
  private async analyzeTrend(
    target: { metric: string },
    request: AnalyzeRequest
  ): Promise<TrendData> {
    // 如果没有数据库配置，返回模拟数据
    if (!request.databaseConfig) {
      return this.getMockTrendData()
    }

    try {
      // 生成趋势 SQL
      const sql = `
        SELECT
          DATE(created_at) as date,
          COUNT(*) as value
        FROM users
        WHERE created_at >= NOW() - INTERVAL '14 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `

      const result = await databaseManager.query(request.databaseConfig, sql)

      if (!result.rows || result.rows.length < 2) {
        return this.getMockTrendData()
      }

      const dates = result.rows.map((r: any) => r.date)
      const values = result.rows.map((r: any) => r.value)

      const current = values[values.length - 1]
      const previous = values[values.length - 2]
      const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : 0

      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (changePercent > 5) trend = 'up'
      else if (changePercent < -5) trend = 'down'

      return { dates, values, current, previous, changePercent, trend }
    } catch (error) {
      console.error('趋势分析失败:', error)
      return this.getMockTrendData()
    }
  }

  /**
   * STEP 3: 自动拆解分析（关键）
   * 自动选择 Top 2 维度进行拆解
   */
  private async analyzeBreakdown(
    target: { metric: string; dimensions: string[] },
    request: AnalyzeRequest,
    trend: TrendData
  ): Promise<BreakdownItem[]> {
    if (!request.databaseConfig) {
      return this.getMockBreakdownData()
    }

    const results: BreakdownItem[] = []
    const totalChange = trend.changePercent

    // 选择 Top 2 维度
    const topDimensions = target.dimensions.slice(0, 2)

    for (const dimension of topDimensions) {
      try {
        const sql = `
          SELECT
            ${dimension} as key,
            COUNT(*) as current_value,
            LAG(COUNT(*)) OVER (ORDER BY DATE(created_at)) as previous_value
          FROM users
          WHERE created_at >= NOW() - INTERVAL '14 days'
          GROUP BY ${dimension}
          ORDER BY current_value DESC
          LIMIT 10
        `

        const result = await databaseManager.query(request.databaseConfig, sql)

        if (result.rows && result.rows.length > 0) {
          const breakdownItems = result.rows.map((r: any) => {
            const currentValue = r.current_value || 0
            const previousValue = r.previous_value || currentValue
            const changePercent = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0
            const contribution = totalChange !== 0 ? Math.abs((changePercent / totalChange) * 100) : 0

            return {
              dimension,
              key: r.key,
              currentValue,
              previousValue,
              changePercent,
              contribution
            }
          })

          results.push(...breakdownItems)
        }
      } catch (error) {
        console.error(`维度 ${dimension} 拆解失败:`, error)
      }
    }

    // 如果没有真实数据，返回模拟数据
    if (results.length === 0) {
      return this.getMockBreakdownData()
    }

    return results
  }

  /**
   * STEP 4: 对比分析
   */
  private analyzeComparison(trend: TrendData, breakdowns: BreakdownItem[]): ComparisonData {
    return {
      metric: 'new_users',
      current: trend.current,
      previous: trend.previous,
      changePercent: trend.changePercent,
      significantChange: Math.abs(trend.changePercent) > 10
    }
  }

  /**
   * STEP 6: 智能问题识别
   */
  private identifyProblems(breakdowns: BreakdownItem[], comparison: ComparisonData): Problem[] {
    const problems: Problem[] = []

    // 规则1: 如果某维度变化 > 20%，标记为关键问题
    breakdowns.forEach(item => {
      if (Math.abs(item.changePercent) > 20) {
        problems.push({
          dimension: item.dimension,
          issue: `${item.key} ${item.changePercent > 0 ? '增长' : '下降'}${Math.abs(item.changePercent).toFixed(1)}%`,
          severity: Math.abs(item.changePercent) > 40 ? 'high' : 'medium',
          value: item.changePercent,
          threshold: 20
        })
      }
    })

    // 规则2: 如果整体趋势明显下降
    if (comparison.changePercent < -10) {
      problems.push({
        dimension: 'overall',
        issue: `整体指标下降${Math.abs(comparison.changePercent).toFixed(1)}%`,
        severity: Math.abs(comparison.changePercent) > 30 ? 'high' : 'medium',
        value: comparison.changePercent,
        threshold: 10
      })
    }

    // 最多返回3个问题
    return problems.slice(0, 3)
  }

  /**
   * STEP 7: 识别主要驱动因素
   */
  private identifyDrivers(breakdowns: BreakdownItem[], trend: TrendData): Driver[] {
    // 按贡献度排序，找出 Top 3 驱动因素
    const sorted = [...breakdowns].sort((a, b) => b.contribution - a.contribution)
    const top3 = sorted.slice(0, 3)

    return top3.map(item => ({
      dimension: item.dimension,
      key: item.key,
      contribution: item.contribution,
      impact: item.changePercent > 0 ? 'positive' : 'negative',
      description: `${item.key} 贡献了 ${item.contribution.toFixed(1)}% 的变化`
    }))
  }

  /**
   * STEP 8: 判断影响
   */
  private judgeImpact(trend: TrendData, problems: Problem[], drivers: Driver[]): {
    judgment: 'positive' | 'negative' | 'neutral'
    severity: 'high' | 'medium' | 'low'
    description: string
  } {
    const hasHighSeverityProblems = problems.some(p => p.severity === 'high')
    const significantChange = Math.abs(trend.changePercent) > 15

    let judgment: 'positive' | 'negative' | 'neutral'
    let severity: 'high' | 'medium' | 'low'
    let description: string

    if (trend.changePercent > 10) {
      judgment = 'positive'
      severity = hasHighSeverityProblems ? 'medium' : 'low'
      description = `指标增长${trend.changePercent.toFixed(1)}%，整体表现良好`
    } else if (trend.changePercent < -10) {
      judgment = 'negative'
      severity = significantChange ? 'high' : 'medium'
      description = `指标下降${Math.abs(trend.changePercent).toFixed(1)}%，需要关注`
    } else {
      judgment = 'neutral'
      severity = hasHighSeverityProblems ? 'medium' : 'low'
      description = '指标保持稳定'
    }

    return { judgment, severity, description }
  }

  /**
   * STEP 9: 生成行动建议
   */
  private generateActions(problems: Problem[], drivers: Driver[], impact: any): Action[] {
    const actions: Action[] = []

    // 基于问题生成行动
    problems.forEach(problem => {
      if (problem.severity === 'high') {
        actions.push({
          priority: 'P0',
          action: `立即调查 ${problem.dimension} 维度的问题：${problem.issue}`,
          target: problem.dimension,
          expectedImpact: '预计可恢复 20-30% 的变化'
        })
      }
    })

    // 基于驱动因素生成行动
    if (drivers.length > 0) {
      const topDriver = drivers[0]
      if (topDriver.impact === 'positive') {
        actions.push({
          priority: 'P1',
          action: `扩大 ${topDriver.key} 的规模，复制成功经验`,
          target: topDriver.dimension
        })
      }
    }

    // 通用建议
    if (impact.judgment === 'negative') {
      actions.push({
        priority: 'P0',
        action: '立即召开紧急会议，分析下降原因并制定恢复计划',
        expectedImpact: '快速响应可减少损失'
      })
    }

    actions.push({
      priority: 'P2',
      action: '持续监控关键指标，定期回顾分析结果'
    })

    // 最多返回5个行动
    return actions.slice(0, 5)
  }

  /**
   * STEP 10: 调用 AI 生成分析报告
   */
  private async generateAIReport(
    data: AnalysisData,
    problems: Problem[],
    drivers: Driver[],
    impact: any,
    actions: Action[]
  ): Promise<{
    summary: string
    conclusion: string
    actions: Action[]
  }> {
    const prompt = `作为一名资深数据分析师，请基于以下数据分析结果，生成一份专业报告：

【指标】${data.metric}

【趋势数据】
当前值: ${data.trend.current}
上期值: ${data.trend.previous}
变化: ${data.trend.changePercent > 0 ? '+' : ''}${data.trend.changePercent.toFixed(2)}%
趋势: ${data.trend.trend}

【维度拆解】
${data.breakdowns.slice(0, 5).map(b =>
  `${b.dimension}.${b.key}: 当前=${b.currentValue}, 变化=${b.changePercent.toFixed(1)}%, 贡献度=${b.contribution.toFixed(1)}%`
).join('\n')}

【识别的问题】
${problems.map((p, i) => `${i + 1}. ${p.dimension} - ${p.issue} (严重程度: ${p.severity})`).join('\n')}

【主要驱动因素】
${drivers.map((d, i) => `${i + 1}. ${d.key} (${d.dimension}) - 贡献度${d.contribution.toFixed(1)}%`).join('\n')}

【影响判断】
判断: ${impact.judgment}
严重程度: ${impact.severity}
说明: ${impact.description}

请严格按照以下格式输出（不要有其他内容）：

【一句话总结】
用一句话总结当前状况，不超过20字

【核心结论】
1-2句话的详细结论

【关键问题】
${problems.length > 0 ? problems.map((p, i) => `${i + 1}. ${p.dimension} - ${p.issue} (严重程度: ${p.severity})`).join('\n') : '无明显问题'}

【主要驱动因素】
${drivers.length > 0 ? drivers.slice(0, 2).map((d, i) => `${i + 1}. ${d.key} (${d.dimension}) - 贡献度${d.contribution.toFixed(1)}%`).join('\n') : '无明显驱动因素'}

【行动建议】
根据数据变化趋势，提供具体可执行的建议：
- P0: 针对最严重问题的立即行动建议（1条）
- P1: 本周内可以执行的改进措施（1条）
- P2: 长期优化方向（1条）

每条建议需具体说明：做什么、为什么、预期效果

请直接输出，不要有其他内容（不使用markdown代码块）：`

    try {
      const response = await this.aiManager.chat(prompt)
      return this.parseAIAnalysisResponse(response.content, actions)
    } catch (error) {
      console.error('AI 分析生成失败:', error)
      // 返回基础分析
      return this.getFallbackAnalysis(data, problems, drivers, impact, actions)
    }
  }

  /**
   * 解析 AI 返回的分析结果
   */
  private parseAIAnalysisResponse(content: string, fallbackActions: Action[]): {
    summary: string
    conclusion: string
    actions: Action[]
  } {
    const lines = content.split('\n')

    let summary = '数据分析完成'
    let conclusion = '分析完成'
    const actions: Action[] = [...fallbackActions]

    let currentSection = ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      if (trimmed.startsWith('【一句话总结】')) {
        currentSection = 'summary'
        continue
      } else if (trimmed.startsWith('【核心结论】')) {
        currentSection = 'conclusion'
        continue
      } else if (trimmed.startsWith('【关键问题】')) {
        currentSection = 'problems'
        continue
      } else if (trimmed.startsWith('【主要驱动因素】')) {
        currentSection = 'drivers'
        continue
      } else if (trimmed.startsWith('【行动建议】')) {
        currentSection = 'actions'
        continue
      }

      switch (currentSection) {
        case 'summary':
          if (trimmed && !trimmed.startsWith('【')) {
            summary = trimmed
          }
          break
        case 'conclusion':
          if (trimmed && !trimmed.startsWith('【')) {
            conclusion = trimmed
          }
          break
        case 'actions':
          if (trimmed.startsWith('- P0:')) {
            actions.push({
              priority: 'P0',
              action: trimmed.replace('- P0:', '').trim()
            })
          } else if (trimmed.startsWith('- P1:')) {
            actions.push({
              priority: 'P1',
              action: trimmed.replace('- P1:', '').trim()
            })
          } else if (trimmed.startsWith('- P2:')) {
            actions.push({
              priority: 'P2',
              action: trimmed.replace('- P2:', '').trim()
            })
          }
          break
      }
    }

    return { summary, conclusion, actions }
  }

  /**
   * 获取备用分析（当 AI 失败时）
   */
  private getFallbackAnalysis(data: AnalysisData, problems: Problem[], drivers: Driver[], impact: any, fallbackActions: Action[]): {
    summary: string
    conclusion: string
    actions: Action[]
  } {
    let summary = `${data.metric} ${data.trend.changePercent > 0 ? '增长' : '下降'}${Math.abs(data.trend.changePercent).toFixed(1)}%`
    let conclusion = `${data.metric} ${data.trend.changePercent > 0 ? '呈现' : '出现'}${Math.abs(data.trend.changePercent).toFixed(1)}%的${data.trend.changePercent > 0 ? '增长' : '下降'}趋势`

    if (problems.length > 0) {
      conclusion += `，其中${problems[0].dimension}维度需要重点关注`
    }

    return { summary, conclusion, actions: fallbackActions }
  }

  /**
   * 模拟趋势数据
   */
  private getMockTrendData(): TrendData {
    const dates: string[] = []
    const values: number[] = []
    const today = new Date()

    for (let i = 13; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
      values.push(Math.floor(1000 + Math.random() * 500))
    }

    const current = values[values.length - 1]
    const previous = values[values.length - 2]
    const changePercent = ((current - previous) / previous) * 100

    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (changePercent > 5) trend = 'up'
    else if (changePercent < -5) trend = 'down'

    return { dates, values, current, previous, changePercent, trend }
  }

  /**
   * 模拟拆解数据
   */
  private getMockBreakdownData(): BreakdownItem[] {
    return [
      {
        dimension: 'channel',
        key: 'organic',
        currentValue: 450,
        previousValue: 400,
        changePercent: 12.5,
        contribution: 35.2
      },
      {
        dimension: 'channel',
        key: 'paid',
        currentValue: 300,
        previousValue: 350,
        changePercent: -14.3,
        contribution: 28.5
      },
      {
        dimension: 'platform',
        key: 'iOS',
        currentValue: 500,
        previousValue: 450,
        changePercent: 11.1,
        contribution: 40.3
      }
    ]
  }

  /**
   * 评估数据质量
   */
  private assessDataQuality(rowCount: number): 'good' | 'fair' | 'poor' {
    if (rowCount >= 100) return 'good'
    if (rowCount >= 30) return 'fair'
    return 'poor'
  }

  /**
   * 对话式分析 - 基于上下文回答问题
   */
  async chatWithContext(sessionId: string, question: string): Promise<{
    answer: string
    questionType: 'explanation' | 'breakdown' | 'deep_dive' | 'general' | 'unsupported'
    followUpQuestions?: string[]
  }> {
    const { conversationContextManager } = await import('./conversation-context')
    const context = conversationContextManager.getContext(sessionId)

    if (!context) {
      return {
        answer: '抱歉，分析会话已过期。请重新运行分析后再试。',
        questionType: 'unsupported'
      }
    }

    // STEP 1: 问题分类
    const classification = this.classifyQuestion(question, context)

    // STEP 2: 检查是否需要新的 SQL
    const needsNewAnalysis = conversationContextManager.requiresNewAnalysis(sessionId, question)

    // STEP 3: 如果需要新数据，执行补充分析
    if (needsNewAnalysis.required && context.databaseConfig) {
      try {
        // 这里可以生成新的 SQL 并执行
        // 暂时使用 Mock 数据
        console.log('[对话分析] 需要补充分析:', needsNewAnalysis.reasoning)
      } catch (error) {
        console.error('[对话分析] 补充分析失败:', error)
      }
    }

    // STEP 4: 生成回答
    const answer = await this.generateContextualAnswer(question, context, classification, conversationContextManager)

    // STEP 5: 记录对话
    conversationContextManager.addConversationTurn(
      sessionId,
      question,
      answer,
      classification.type
    )

    // STEP 6: 生成追问建议
    const followUpQuestions = conversationContextManager.generateFollowUpQuestions(sessionId)

    return {
      answer,
      questionType: classification.type,
      followUpQuestions
    }
  }

  /**
   * 问题分类
   */
  private classifyQuestion(question: string, context: any): {
    type: 'explanation' | 'breakdown' | 'deep_dive' | 'general' | 'unsupported'
    confidence: number
    reasoning: string
  } {
    const q = question.toLowerCase()

    // 解释类问题
    if (q.includes('为什么') || q.includes('原因') || q.includes('how') || q.includes('why')) {
      return { type: 'explanation', confidence: 0.9, reasoning: '询问原因' }
    }

    // 细分/拆解类问题
    if (q.includes('哪个') || q.includes('哪些') || q.includes('按') || q.includes('拆解') || q.includes('细分')) {
      return { type: 'breakdown', confidence: 0.85, reasoning: '询问细分' }
    }

    // 深挖类问题
    if (q.includes('详细') || q.includes('具体') || q.includes('更多') || q.includes('深入')) {
      return { type: 'deep_dive', confidence: 0.8, reasoning: '要求深入分析' }
    }

    // 无关问题
    if (q.includes('天气') || q.includes('吃饭') || q.includes('游戏')) {
      return { type: 'unsupported', confidence: 0.95, reasoning: '与数据分析无关' }
    }

    // 默认为通用问题
    return { type: 'general', confidence: 0.5, reasoning: '通用问题' }
  }

  /**
   * 基于上下文生成回答
   */
  private async generateContextualAnswer(
    question: string,
    context: any,
    classification: { type: string; reasoning: string },
    contextManager: any
  ): Promise<string> {
    const contextSummary = contextManager.getContextSummary(context.sessionId)

    const prompt = `作为一名资深数据分析师，你正在基于一个已有的数据分析上下文回答用户的追问问题。

${contextSummary}

【用户问题】
${question}

【问题类型】
${classification.reasoning}

请基于上述上下文回答用户的问题，要求：
1. 不重复已有结论
2. 直接回答用户问题
3. 如果上下文不足以回答，明确说明需要补充什么数据
4. 保持"分析师风格"——专业、简洁、有洞察
5. 如果可以，给出具体的数字和结论

请直接输出回答，不要有其他内容（不使用markdown代码块）：`

    try {
      const response = await this.aiManager.chat(prompt)
      return response.content
    } catch (error) {
      console.error('[对话分析] AI 生成失败:', error)

      // 降级处理：基于规则生成简单回答
      return this.generateFallbackAnswer(question, context, classification.type)
    }
  }

  /**
   * 降级回答（AI 失败时使用）
   */
  private generateFallbackAnswer(
    question: string,
    context: any,
    questionType: string
  ): string {
    const q = question.toLowerCase()

    // 解释类 - 基于驱动因素
    if (questionType === 'explanation' && context.currentAnalysis.drivers) {
      const topDriver = context.currentAnalysis.drivers[0]
      return `根据当前分析，${topDriver.key} 是最主要的驱动因素，贡献度为 ${topDriver.contribution.toFixed(1)}%。${topDriver.impact === 'positive' ? '它推动了整体增长' : '它导致了整体下降'}。`

    }

    // 细分类 - 基于现有拆解数据
    if (questionType === 'breakdown' && context.currentAnalysis.breakdown) {
      const breakdown = context.currentAnalysis.breakdown
      const topItem = breakdown.sort((a: any, b: any) => b.currentValue - a.currentValue)[0]
      return `在当前数据中，${topItem.key} 的${topItem.dimension}值最高，为 ${topItem.currentValue}。`

    }

    // 默认回答
    return `抱歉，我需要更多数据来回答这个问题。建议您运行更细粒度的分析，或者询问具体的维度表现。`
  }
}

// 导出单例实例，AIManager 会在运行时设置
let _aiManager: AIChatManager | null = null

export const analyzeEngine = new AnalyzeEngine(null as any)

// 设置 AI Manager 的方法
export const setAnalyzeEngineAIManager = (manager: AIChatManager) => {
  _aiManager = manager
  ;(analyzeEngine as any).aiManager = manager
}
