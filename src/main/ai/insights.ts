/**
 * 智能分析建议服务
 * 自动检测数据异常、趋势和机会点
 */

import { AIChatManager } from '../ai/adapter'

export interface DataPoint {
  timestamp: Date
  value: number
  dimensions?: Record<string, any>
}

export interface Metric {
  name: string
  value: number
  change: number
  changePercent: number
  period: string
  // 新增：拆解数据
  breakdowns?: BreakdownData[]
}

export interface BreakdownData {
  dimension: string  // 维度名称（如 channel, platform, user_type）
  values: {
    key: string  // 维度值（如 iOS, Android, Web）
    value: number
    changePercent: number
    contribution: number  // 对总变化的贡献度
  }[]
}

export interface Insight {
  id: string
  type: 'anomaly' | 'trend' | 'opportunity' | 'warning'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  metrics: Metric[]
  recommendation: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  createdAt: Date
}

export interface AnalysisReport {
  summary: string
  insights: Insight[]
  overallHealth: 'excellent' | 'good' | 'warning' | 'critical'
  recommendedActions: string[]
}

export class InsightsEngine {
  private aiManager: AIChatManager
  private historicalData: Map<string, DataPoint[]> = new Map()

  constructor(aiManager: AIChatManager) {
    this.aiManager = aiManager
  }

  /**
   * 添加历史数据
   */
  addHistoricalData(metricName: string, data: DataPoint[]): void {
    this.historicalData.set(metricName, data)
  }

  /**
   * 检测异常
   */
  async detectAnomalies(metrics: Metric[]): Promise<Insight[]> {
    const insights: Insight[] = []

    for (const metric of metrics) {
      // 使用统计方法检测异常
      const isAnomaly = this.isAnomalous(metric)

      if (isAnomaly) {
        const insight = await this.generateInsight(metric, 'anomaly')
        insights.push(insight)
      }
    }

    return insights
  }

  /**
   * 判断是否为异常值
   */
  private isAnomalous(metric: Metric): boolean {
    // 简单的异常检测：变化超过 20%
    return Math.abs(metric.changePercent) > 20
  }

  /**
   * 生成洞察（升级版 - 结构化分析）
   */
  async generateInsight(metric: Metric, type: Insight['type']): Promise<Insight> {
    // 1. 构建基础分析
    let analysisPrompt = `作为一名数据驱动的增长型产品经理，请分析以下指标：

【主指标】
指标名称: ${metric.name}
当前值: ${metric.value}
变化幅度: ${metric.changePercent > 0 ? '+' : ''}${metric.changePercent}%
绝对变化: ${metric.change > 0 ? '+' : ''}${metric.change}
对比周期: ${metric.period}
`

    // 2. 添加拆解分析（关键升级）
    if (metric.breakdowns && metric.breakdowns.length > 0) {
      analysisPrompt += `
【维度拆解分析】
`

      for (const breakdown of metric.breakdowns) {
        analysisPrompt += `
┌─ 按【${breakdown.dimension}】拆解 ─────────────────────────────────
`
        // 找出变化最大的维度值
        const sortedValues = [...breakdown.values].sort((a, b) =>
          Math.abs(b.changePercent) - Math.abs(a.changePercent)
        )

        for (const item of sortedValues.slice(0, 5)) {  // 只显示前5个
          const sign = item.changePercent > 0 ? '+' : ''
          analysisPrompt += `│  ${item.key}: ${item.value} (${sign}${item.changePercent}%)`

          // 标注影响最大的
          if (item === sortedValues[0]) {
            analysisPrompt += ` ⚠️ 变化最大 (贡献度: ${item.contribution.toFixed(1)}%)`
          }
          analysisPrompt += `\n`
        }

        analysisPrompt += `└─────────────────────────────────────────────────────\n`
      }
    }

    // 3. 明确要求输出结构
    analysisPrompt += `
【分析要求】
必须包含以下三个部分：

1. 【主指标判断】
   - 判断变化是好是坏
   - 评估严重程度（critical/high/medium/low）

2. 【拆解分析】（重点）
   ${metric.breakdowns && metric.breakdowns.length > 0 ?
     `- 分析每个维度下的主要变化来源` :
     `- ⚠️ 警告：当前缺少拆解数据，建议按以下维度进行分析：渠道、平台、用户类型`
   }
   - 指出哪个维度的哪个值贡献了最大的变化

3. 【行动建议】
   - 给出具体的 P0/P1/P2 建议行动

请严格按照以下格式输出（不要有其他内容）：

【类型】${type}
【严重程度】
【标题】
【主指标变化】...
【拆解分析】...
【行动建议】P0/P1/P2...
`

    try {
      const response = await this.aiManager.chat(analysisPrompt)
      const parsed = this.parseInsightResponse(response.content, metric, type)
      return parsed
    } catch {
      // 如果 AI 失败，返回基础洞察（但包含拆解信息）
      return this.createEnhancedBasicInsight(metric, type)
    }
  }

  /**
   * 创建增强的基础洞察（包含拆解信息）
   */
  private createEnhancedBasicInsight(metric: Metric, type: Insight['type']): Insight {
    const isNegative = metric.changePercent < 0
    const severity: Insight['severity'] = Math.abs(metric.changePercent) > 50 ? 'high' : 'medium'
    const priority: Insight['priority'] = Math.abs(metric.changePercent) > 50 ? 'P0' : 'P1'

    // 构建描述（包含拆解）
    let description = `${metric.name} 在 ${metric.period} 期间${isNegative ? '下降' : '上升'}了 ${Math.abs(metric.changePercent).toFixed(1)}%，当前值为 ${metric.value}。`

    if (metric.breakdowns && metric.breakdowns.length > 0) {
      description += '\n\n【拆解分析】\n'

      for (const breakdown of metric.breakdowns) {
        const topContributor = [...breakdown.values].sort((a, b) =>
          Math.abs(b.changePercent) - Math.abs(a.changePercent)
        )[0]

        description += `按${breakdown.dimension}拆解：${topContributor.key}变化最大（${topContributor.changePercent > 0 ? '+' : ''}${topContributor.changePercent}%）\n`
      }
    } else {
      description += '\n\n⚠️ 缺少拆解数据，建议按渠道、平台或用户类型进行深入分析。'
    }

    return {
      id: Date.now().toString(),
      type,
      severity,
      title: `${metric.name}${isNegative ? '下降' : '上升'}${Math.abs(metric.changePercent).toFixed(1)}%`,
      description,
      metrics: [metric],
      recommendation: isNegative
        ? `${priority}：立即分析${metric.name}下降原因${metric.breakdowns?.length ? '，重点关注拆解数据中变化最大的维度' : '，建议按渠道/平台/用户类型拆解分析'}`
        : `${priority}：保持当前策略，分析增长驱动因素`,
      priority,
      createdAt: new Date(),
    }
  }

  /**
   * 解析 AI 响应
   */
  private parseInsightResponse(content: string, metric: Metric, type: Insight['type']): Insight {
    const lines = content.split('\n').filter(l => l.trim())

    let severity: Insight['severity'] = 'medium'
    let title = `${metric.name}${type === 'anomaly' ? '异常' : '趋势'}`
    let description = content
    let recommendation = '需要进一步分析'
    let priority: Insight['priority'] = 'P1'

    // 简单解析（实际应该更复杂）
    lines.forEach(line => {
      if (line.includes('严重程度') || line.includes('【严重程度】')) {
        const severityText = line.toLowerCase()
        if (severityText.includes('critical')) severity = 'critical'
        else if (severityText.includes('high')) severity = 'high'
        else if (severityText.includes('medium')) severity = 'medium'
        else if (severityText.includes('low')) severity = 'low'
      }
      if (line.includes('标题') || line.includes('【标题】')) {
        title = line.replace(/【标题】|标题：/g, '').trim()
      }
      if (line.includes('建议') || line.includes('【建议】')) {
        recommendation = line.replace(/【建议】|建议：/g, '').trim()
        if (recommendation.includes('P0')) priority = 'P0'
        else if (recommendation.includes('P1')) priority = 'P1'
        else if (recommendation.includes('P2')) priority = 'P2'
        else if (recommendation.includes('P3')) priority = 'P3'
      }
    })

    return {
      id: Date.now().toString(),
      type,
      severity,
      title,
      description: description.substring(0, 200),
      metrics: [metric],
      recommendation,
      priority,
      createdAt: new Date(),
    }
  }

  /**
   * 创建基础洞察（AI 失败时的后备方案）
   */
  private createBasicInsight(metric: Metric, type: Insight['type']): Insight {
    const isNegative = metric.changePercent < 0
    const severity: Insight['severity'] = Math.abs(metric.changePercent) > 50 ? 'high' : 'medium'
    const priority: Insight['priority'] = Math.abs(metric.changePercent) > 50 ? 'P0' : 'P1'

    return {
      id: Date.now().toString(),
      type,
      severity,
      title: `${metric.name}${isNegative ? '下降' : '上升'}${Math.abs(metric.changePercent).toFixed(1)}%`,
      description: `${metric.name} 在 ${metric.period} 期间${isNegative ? '下降' : '上升'}了 ${Math.abs(metric.changePercent).toFixed(1)}%，当前值为 ${metric.value}。`,
      metrics: [metric],
      recommendation: isNegative
        ? `${priority}：立即分析${metric.name}下降原因，检查相关渠道和用户群体`
        : `${priority}：保持当前策略，分析增长驱动因素`,
      priority,
      createdAt: new Date(),
    }
  }

  /**
   * 生成完整分析报告
   */
  async generateReport(metrics: Metric[]): Promise<AnalysisReport> {
    // 检测异常和趋势
    const anomalies = await this.detectAnomalies(metrics)
    const trends = await this.detectTrends(metrics)

    // 生成总结
    const summary = await this.generateSummary(metrics, [...anomalies, ...trends])

    // 计算整体健康度
    const overallHealth = this.calculateHealth(metrics, anomalies)

    // 提取建议行动
    const recommendedActions = this.extractActions([...anomalies, ...trends])

    return {
      summary,
      insights: [...anomalies, ...trends],
      overallHealth,
      recommendedActions,
    }
  }

  /**
   * 检测趋势
   */
  async detectTrends(metrics: Metric[]): Promise<Insight[]> {
    const insights: Insight[] = []

    for (const metric of metrics) {
      // 检测连续增长或下降趋势
      const historicalData = this.historicalData.get(metric.name)
      if (historicalData && historicalData.length >= 3) {
        const trend = this.analyzeTrend(historicalData)
        if (trend !== 'stable') {
          const insight = await this.generateInsight(metric, 'trend')
          insights.push(insight)
        }
      }
    }

    return insights
  }

  /**
   * 分析趋势
   */
  private analyzeTrend(data: DataPoint[]): 'up' | 'down' | 'stable' {
    if (data.length < 2) return 'stable'

    let increases = 0
    let decreases = 0

    for (let i = 1; i < data.length; i++) {
      if (data[i].value > data[i - 1].value) increases++
      else if (data[i].value < data[i - 1].value) decreases++
    }

    const total = data.length - 1
    const increaseRatio = increases / total
    const decreaseRatio = decreases / total

    if (increaseRatio > 0.7) return 'up'
    if (decreaseRatio > 0.7) return 'down'
    return 'stable'
  }

  /**
   * 生成总结
   */
  async generateSummary(metrics: Metric[], insights: Insight[]): Promise<string> {
    const metricsSummary = metrics.map(m =>
      `${m.name}: ${m.value} (${m.changePercent > 0 ? '+' : ''}${m.changePercent}%)`
    ).join('\n')

    const insightsSummary = insights.map(i => `${i.title} (${i.severity})`).join('\n')

    const prompt = `请基于以下数据和洞察，生成一份简洁的分析总结（50字以内）：

【核心指标】
${metricsSummary}

【发现的洞察】
${insightsSummary}

总结：`

    try {
      const response = await this.aiManager.chat(prompt)
      return response.content.trim()
    } catch {
      return `检测到 ${insights.length} 个重要洞察，需要关注 ${insights.filter(i => i.severity === 'high' || i.severity === 'critical').length} 个高优先级问题。`
    }
  }

  /**
   * 计算整体健康度
   */
  private calculateHealth(metrics: Metric[], insights: Insight[]): AnalysisReport['overallHealth'] {
    const criticalCount = insights.filter(i => i.severity === 'critical').length
    const highCount = insights.filter(i => i.severity === 'high').length

    if (criticalCount > 0) return 'critical'
    if (highCount > 2) return 'warning'
    if (highCount > 0) return 'good'
    return 'excellent'
  }

  /**
   * 提取建议行动
   */
  private extractActions(insights: Insight[]): string[] {
    return insights
      .filter(i => i.priority === 'P0' || i.priority === 'P1')
      .sort((a, b) => {
        const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })
      .slice(0, 5)
      .map(i => i.recommendation)
  }

  /**
   * 生成拆解分析的 SQL 建议
   */
  generateBreakdownSQL(metricName: string, tableName: string, dateField: string): {
    dimension: string
    sql: string
    description: string
  }[] {
    return [
      {
        dimension: 'channel',
        sql: `SELECT
  DATE(${dateField}) as date,
  channel,
  COUNT(DISTINCT user_id) as ${metricName}
FROM ${tableName}
WHERE ${dateField} >= NOW() - INTERVAL '7 days'
GROUP BY DATE(${dateField}), channel
ORDER BY date, ${metricName} DESC
LIMIT 100;`,
        description: '按渠道拆解：查看不同渠道的趋势变化',
      },
      {
        dimension: 'platform',
        sql: `SELECT
  DATE(${dateField}) as date,
  platform,
  COUNT(DISTINCT user_id) as ${metricName}
FROM ${tableName}
WHERE ${dateField} >= NOW() - INTERVAL '7 days'
GROUP BY DATE(${dateField}), platform
ORDER BY date, ${metricName} DESC
LIMIT 100;`,
        description: '按平台拆解：对比 iOS/Android/Web 表现',
      },
      {
        dimension: 'user_type',
        sql: `SELECT
  DATE(${dateField}) as date,
  CASE
    WHEN created_at >= NOW() - INTERVAL '7 days' THEN '新用户'
    ELSE '老用户'
  END as user_type,
  COUNT(DISTINCT user_id) as ${metricName}
FROM ${tableName}
WHERE ${dateField} >= NOW() - INTERVAL '7 days'
GROUP BY DATE(${dateField}), user_type
ORDER BY date, ${metricName} DESC
LIMIT 100;`,
        description: '按用户类型拆解：对比新老用户表现',
      },
    ]
  }
}
