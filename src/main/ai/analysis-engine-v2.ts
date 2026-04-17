/**
 * 按需分析引擎 V2
 * 从描述数据 → 解释问题 + 拆解原因
 */

import { AIChatManager } from '../ai/adapter'
import { MetricV2, metricLayerV2 } from '../metrics/layer-v2'
import { databaseManager } from '../database/manager'

export interface AnalysisRequest {
  metricId: string
  timeRange?: string
  compareWith?: 'previous_period' | 'same_period_last_year'
  breakdownDimensions?: string[]  // 自动选择 Top 2
  databaseConfig?: any
}

export interface AnalysisData {
  // 主趋势数据
  trend: {
    dates: string[]
    values: number[]
    current: number
    previous: number
    changePercent: number
  }

  // 维度拆解数据
  breakdowns: Array<{
    dimension: string
    values: Array<{
      key: string
      currentValue: number
      previousValue: number
      changePercent: number
      contribution: number
    }>
  }>

  // 对比数据
  comparison?: {
    current: number
    previous: number
    changePercent: number
  }
}

export interface AnalysisResult {
  // 核心结论
  conclusion: string

  // 关键变化
  keyChanges: {
    metric: string
    current: number
    previous: number
    changePercent: number
    trend: 'up' | 'down' | 'stable'
  }

  // 主要驱动因素 🔥
  drivers: Array<{
    dimension: string
    topContributor: string
    contribution: number
    impact: 'positive' | 'negative'
  }>

  // 影响判断
  impact: 'positive' | 'negative' | 'neutral'

  // 行动建议
  recommendations: Array<{
    priority: 'P0' | 'P1' | 'P2'
    action: string
  }>

  // 元数据
  generatedAt: Date
  dataQuality: 'good' | 'fair' | 'poor'
}

export class AnalysisEngineV2 {
  private aiManager: AIChatManager

  constructor(aiManager: AIChatManager) {
    this.aiManager = aiManager
  }

  /**
   * 执行分析流程（主入口）
   */
  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    // STEP 1: 识别主指标
    const metric = metricLayerV2.getMetric(request.metricId)
    if (!metric) {
      throw new Error(`指标 ${request.metricId} 不存在`)
    }

    // STEP 2: 自动选择拆解维度（Top 2）
    const dimensions = this.selectTopDimensions(metric, request.breakdownDimensions)

    // STEP 3: 生成分析 SQL 集合
    const sqlQueries = this.generateAnalysisSQLs(metric, dimensions, request)

    // STEP 4: 执行查询并汇总数据
    const analysisData = await this.executeAnalysisQueries(sqlQueries, request.databaseConfig)

    // STEP 5: 传给 AI 生成洞察
    const result = await this.generateInsights(metric, analysisData, dimensions)

    return result
  }

  /**
   * 自动选择 Top 2 维度
   */
  private selectTopDimensions(
    metric: MetricV2,
    requested?: string[]
  ): string[] {
    const allowed = metric.allowedDimensions

    if (requested && requested.length > 0) {
      // 过滤出允许的维度
      const validDimensions = requested.filter(d => allowed.includes(d))
      return validDimensions.slice(0, 2)
    }

    // 默认选择前 2 个
    return allowed.slice(0, 2)
  }

  /**
   * 生成分析 SQL 集合
   */
  private generateAnalysisSQLs(
    metric: MetricV2,
    dimensions: string[],
    request: AnalysisRequest
  ): Array<{ type: string; sql: string; description: string }> {
    const sqls: Array<{ type: string; sql: string; description: string }> = []

    // 1. 主趋势 SQL
    sqls.push({
      type: 'trend',
      description: '主趋势分析',
      sql: `
        SELECT
          DATE(${metric.timeField}) as date,
          ${metric.sql} as value
        FROM ${metric.table}
        WHERE ${metric.timeField} >= NOW() - INTERVAL '7 days'
        ${metric.filters && metric.filters.length > 0 ? `AND ${metric.filters.join(' AND ')}` : ''}
        GROUP BY DATE(${metric.timeField})
        ORDER BY date ASC
      `
    })

    // 2. 维度拆解 SQL
    dimensions.forEach(dim => {
      sqls.push({
        type: 'breakdown',
        description: `按${dim}维度拆解`,
        sql: `
          SELECT
            ${dim} as dimension_key,
            ${metric.sql} as current_value,
            LAG(${metric.sql}) OVER (PARTITION BY ${dim} ORDER BY DATE(${metric.timeField})) as previous_value
          FROM ${metric.table}
          WHERE ${metric.timeField} >= NOW() - INTERVAL '7 days'
          ${metric.filters && metric.filters.length > 0 ? `AND ${metric.filters.join(' AND ')}` : ''}
          GROUP BY ${dim}, DATE(${metric.timeField})
          ORDER BY current_value DESC
          LIMIT 10
        `
      })
    })

    // 3. 对比 SQL
    if (request.compareWith) {
      sqls.push({
        type: 'comparison',
        description: '与上期对比',
        sql: `
          SELECT
            ${metric.sql} as current_value
          FROM ${metric.table}
          WHERE ${metric.timeField} >= NOW() - INTERVAL '7 days'
          ${metric.filters && metric.filters.length > 0 ? `AND ${metric.filters.join(' AND ')}` : ''}
        `
      })
    }

    return sqls
  }

  /**
   * 执行分析查询
   */
  private async executeAnalysisQueries(
    sqlQueries: Array<{ type: string; sql: string; description: string }>,
    databaseConfig?: any
  ): Promise<AnalysisData> {
    const data: AnalysisData = {
      trend: {
        dates: [],
        values: [],
        current: 0,
        previous: 0,
        changePercent: 0
      },
      breakdowns: []
    }

    if (!databaseConfig) {
      // 如果没有数据库配置，返回模拟数据
      return this.getMockAnalysisData()
    }

    try {
      // 执行主趋势查询
      const trendSQL = sqlQueries.find(q => q.type === 'trend')
      if (trendSQL) {
        const trendResult = await databaseManager.query(databaseConfig, trendSQL.sql)

        data.trend.dates = trendResult.rows.map((r: any) => r.date)
        data.trend.values = trendResult.rows.map((r: any) => r.value)

        if (data.trend.values.length >= 2) {
          data.trend.current = data.trend.values[data.trend.values.length - 1]
          data.trend.previous = data.trend.values[data.trend.values.length - 2]
          data.trend.changePercent = ((data.trend.current - data.trend.previous) / data.trend.previous) * 100
        }
      }

      // 执行维度拆解查询
      const breakdownSQLs = sqlQueries.filter(q => q.type === 'breakdown')
      for (const breakdownSQL of breakdownSQLs) {
        const result = await databaseManager.query(databaseConfig, breakdownSQL.sql)

        const totalChange = data.trend.changePercent

        data.breakdowns.push({
          dimension: breakdownSQL.description,
          values: result.rows.map((r: any) => {
            const currentValue = r.current_value || 0
            const previousValue = r.previous_value || currentValue
            const changePercent = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0
            const contribution = totalChange !== 0 ? (changePercent / totalChange) * 100 : 0

            return {
              key: r.dimension_key,
              currentValue,
              previousValue,
              changePercent,
              contribution: Math.abs(contribution)
            }
          })
        })
      }

    } catch (error) {
      console.error('执行分析查询失败:', error)
      // 返回模拟数据
      return this.getMockAnalysisData()
    }

    return data
  }

  /**
   * 获取模拟分析数据（用于演示）
   */
  private getMockAnalysisData(): AnalysisData {
    return {
      trend: {
        dates: ['2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12'],
        values: [1200, 1350, 1280, 1420, 1380, 1500, 1450],
        current: 1450,
        previous: 1500,
        changePercent: -3.33
      },
      breakdowns: [
        {
          dimension: '按渠道维度拆解',
          values: [
            { key: 'organic', currentValue: 600, previousValue: 650, changePercent: -7.69, contribution: 35 },
            { key: 'google_ads', currentValue: 450, previousValue: 400, changePercent: 12.5, contribution: 25 },
            { key: 'facebook', currentValue: 250, previousValue: 300, changePercent: -16.67, contribution: 20 },
            { key: 'referral', currentValue: 150, previousValue: 150, changePercent: 0, contribution: 10 }
          ]
        },
        {
          dimension: '按平台维度拆解',
          values: [
            { key: 'iOS', currentValue: 700, previousValue: 750, changePercent: -6.67, contribution: 40 },
            { key: 'Android', currentValue: 500, previousValue: 500, changePercent: 0, contribution: 30 },
            { key: 'Web', currentValue: 250, previousValue: 250, changePercent: 0, contribution: 15 }
          ]
        }
      ],
      comparison: {
        current: 1450,
        previous: 1500,
        changePercent: -3.33
      }
    }
  }

  /**
   * 生成洞察（AI Prompt 升级）
   */
  private async generateInsights(
    metric: MetricV2,
    data: AnalysisData,
    dimensions: string[]
  ): Promise<AnalysisResult> {
    const prompt = `作为一名资深数据分析师，请基于以下数据进行深度分析：

【指标】${metric.name} - ${metric.description}

【当前数据】
当前值: ${data.trend.current}
上期值: ${data.trend.previous}
变化: ${data.trend.changePercent > 0 ? '+' : ''}${data.trend.changePercent.toFixed(2)}%

【主趋势】
${data.trend.dates.map((d, i) => `${d}: ${data.trend.values[i]}`).join('\n')}

【维度拆解】
${data.breakdowns.map(b => `
${b.dimension}:
${b.values.map(v => `  ${v.key}: ${v.currentValue} (${v.changePercent > 0 ? '+' : ''}${v.changePercent.toFixed(1)}%, 贡献度: ${v.contribution.toFixed(1)}%)`).join('\n')}
`).join('\n')}

【分析维度】${dimensions.join(', ')}

请严格按照以下格式输出分析结果：

【核心结论】
一句话总结当前状况（包括趋势和影响）

【关键变化】
- 当前值：${data.trend.current}
- 上期值：${data.trend.previous}
- 变化：${data.trend.changePercent > 0 ? '+' : ''}${data.trend.changePercent.toFixed(2)}%
- 趋势：${data.trend.changePercent > 5 ? '上升' : data.trend.changePercent < -5 ? '下降' : '稳定'}

【主要驱动因素】🔥
${data.breakdowns.length > 0 ? data.breakdowns.map(b => {
  const topDriver = b.values.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))[0]
  return `- 按${b.dimension}维度拆解：${topDriver.key}贡献了${topDriver.contribution.toFixed(1)}%的变化，是主要驱动因素`
}).join('\n') : '- 暂无拆解数据'}

【影响判断】
${data.trend.changePercent > 10 ? '正面' : data.trend.changePercent < -10 ? '负面' : '中性'}
简要说明影响的性质和程度，结合业务场景判断

【行动建议】
根据以上分析，提供3个具体可执行的建议：
- P0: 针对当前最紧急问题的具体行动（说明做什么、为什么、预期效果）
- P1: 本周内可以执行的改进措施（具体可执行）
- P2: 长期优化方向（战略性建议）

请直接输出，不要有其他内容（不使用markdown代码块）：`

    try {
      const response = await this.aiManager.chat(prompt)
      return this.parseAnalysisResponse(response.content, data)
    } catch (error) {
      console.error('生成洞察失败:', error)
      // 返回基础分析结果
      return this.getBasicAnalysisResult(metric, data)
    }
  }

  /**
   * 解析 AI 返回的分析结果
   */
  private parseAnalysisResponse(content: string, data: AnalysisData): AnalysisResult {
    const lines = content.split('\n')

    const result: AnalysisResult = {
      conclusion: '',
      keyChanges: {
        metric: '',
        current: data.trend.current,
        previous: data.trend.previous,
        changePercent: data.trend.changePercent,
        trend: data.trend.changePercent > 5 ? 'up' : data.trend.changePercent < -5 ? 'down' : 'stable'
      },
      drivers: [],
      impact: 'neutral',
      recommendations: [],
      generatedAt: new Date(),
      dataQuality: 'good'
    }

    let currentSection = ''

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (trimmedLine.startsWith('【核心结论】')) {
        currentSection = 'conclusion'
        continue
      } else if (trimmedLine.startsWith('【关键变化】')) {
        currentSection = 'keyChanges'
        continue
      } else if (trimmedLine.startsWith('【主要驱动因素】')) {
        currentSection = 'drivers'
        continue
      } else if (trimmedLine.startsWith('【影响判断】')) {
        currentSection = 'impact'
        continue
      } else if (trimmedLine.startsWith('【行动建议】')) {
        currentSection = 'recommendations'
        continue
      }

      switch (currentSection) {
        case 'conclusion':
          if (trimmedLine) {
            result.conclusion = trimmedLine
          }
          break

        case 'drivers':
          if (trimmedLine.includes('贡献了') || trimmedLine.includes('是主要驱动')) {
            // 解析驱动因素
            const match = trimmedLine.match(/按(.+?)维度.*?:(.+)/)
            if (match) {
              const dimension = match[1].trim()
              const contribution = match[2].trim()
              result.drivers.push({
                dimension,
                topContributor: this.extractTopContributor(contribution),
                contribution: this.extractContributionValue(contribution),
                impact: data.trend.changePercent > 0 ? 'positive' : 'negative'
              })
            }
          }
          break

        case 'impact':
          if (trimmedLine.includes('正面')) {
            result.impact = 'positive'
          } else if (trimmedLine.includes('负面') || trimmedLine.includes('负')) {
            result.impact = 'negative'
          } else if (trimmedLine.includes('中性')) {
            result.impact = 'neutral'
          }
          break

        case 'recommendations':
          if (trimmedLine.startsWith('- P0:')) {
            result.recommendations.push({
              priority: 'P0',
              action: trimmedLine.replace('- P0:', '').trim()
            })
          } else if (trimmedLine.startsWith('- P1:')) {
            result.recommendations.push({
              priority: 'P1',
              action: trimmedLine.replace('- P1:', '').trim()
            })
          } else if (trimmedLine.startsWith('- P2:')) {
            result.recommendations.push({
              priority: 'P2',
              action: trimmedLine.replace('- P2:', '').trim()
            })
          }
          break
      }
    }

    // 如果没有解析到结论，生成默认结论
    if (!result.conclusion) {
      result.conclusion = `${data.trend.changePercent > 0 ? '上升' : '下降'}${Math.abs(data.trend.changePercent).toFixed(1)}%，${data.trend.changePercent > 0 ? '表现良好' : '需要关注'}`
    }

    return result
  }

  /**
   * 提取主要贡献者
   */
  private extractTopContributor(text: string): string {
    // 简化实现：提取第一个词作为主要贡献者
    const words = text.split(/[，：,]/)
    return words[0]?.trim() || '未知'
  }

  /**
   * 提取贡献度值
   */
  private extractContributionValue(text: string): number {
    const match = text.match(/(\d+(?:\.\d+)?)%/)
    return match ? parseFloat(match[1]) : 0
  }

  /**
   * 获取基础分析结果（AI 失败时的后备方案）
   */
  private getBasicAnalysisResult(metric: MetricV2, data: AnalysisData): AnalysisResult {
    const isPositive = data.trend.changePercent > 0

    return {
      conclusion: `${metric.name} ${isPositive ? '上升' : '下降'}${Math.abs(data.trend.changePercent).toFixed(1)}%`,
      keyChanges: {
        metric: metric.name,
        current: data.trend.current,
        previous: data.trend.previous,
        changePercent: data.trend.changePercent,
        trend: data.trend.changePercent > 5 ? 'up' : data.trend.changePercent < -5 ? 'down' : 'stable'
      },
      drivers: data.breakdowns.flatMap(b => {
        const topValue = b.values.sort((a, b) => b.contribution - a.contribution)[0]
        if (!topValue) return []

        return [{
          dimension: b.dimension,
          topContributor: topValue.key,
          contribution: topValue.contribution,
          impact: topValue.changePercent > 0 ? 'positive' : 'negative'
        }]
      }),
      impact: isPositive ? 'positive' : 'negative',
      recommendations: [
        {
          priority: 'P0',
          action: isPositive ? '保持当前策略' : '分析下降原因'
        },
        {
          priority: 'P1',
          action: '持续监控趋势'
        }
      ],
      generatedAt: new Date(),
      dataQuality: 'fair'
    }
  }

  /**
   * 生成分析报告摘要
   */
  generateSummary(result: AnalysisResult): string {
    return `
【核心结论】${result.conclusion}

【主要驱动因素】
${result.drivers.map(d => `• ${d.dimension}: ${d.topContributor}（贡献度 ${d.contribution.toFixed(1)}%）`).join('\n')}

【行动建议】
${result.recommendations.map(r => `[${r.priority}] ${r.action}`).join('\n')}
    `.trim()
  }
}

export const analysisEngineV2 = new AnalysisEngineV2(null as any) // 构造时需要 AIChatManager，这里暂时为 null
