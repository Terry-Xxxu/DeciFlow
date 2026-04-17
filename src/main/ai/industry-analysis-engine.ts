/**
 * 行业分析引擎
 * 结合行业知识库提供专业的数据分析和洞察
 */

import { industryKnowledgeBase, IndustryKnowledge } from './industry-knowledge'
import { AIChatManager } from './adapter'

export interface IndustryAnalysisRequest {
  industryId: string
  query: string
  data: any[]
  metrics?: any[]
}

export interface IndustryAnalysisResult {
  insights: string[]
  recommendations: string[]
  benchmarks: Record<string, { value: number; performance: string }>
  terminology: Record<string, string>
}

/**
 * 行业分析引擎
 */
export class IndustryAnalysisEngine {
  private aiManager: AIChatManager | null = null

  init(aiManager: AIChatManager) {
    this.aiManager = aiManager
  }

  /**
   * 执行行业分析
   */
  async analyze(request: IndustryAnalysisRequest): Promise<IndustryAnalysisResult> {
    const industry = industryKnowledgeBase.getIndustry(request.industryId)
    if (!industry) {
      throw new Error(`Unknown industry: ${request.industryId}`)
    }

    // 获取行业上下文
    const industryContext = industryKnowledgeBase.getIndustryContext(request.industryId)

    // 生成基准对比
    const benchmarks = this.generateBenchmarks(industry, request.data)

    // 生成行业洞察
    const insights = await this.generateIndustryInsights(
      industry,
      request,
      industryContext
    )

    // 生成行业建议
    const recommendations = await this.generateRecommendations(
      industry,
      request,
      insights
    )

    return {
      insights,
      recommendations,
      benchmarks,
      terminology: industry.terminology
    }
  }

  /**
   * 生成基准对比
   */
  private generateBenchmarks(
    industry: IndustryKnowledge,
    data: any[]
  ): Record<string, { value: number; performance: string }> {
    const benchmarks: Record<string, { value: number; performance: string }> = {}

    // 计算数据中的关键指标
    const metrics = this.extractMetricsFromData(data, industry.metrics)

    // 对比基准值
    for (const [metricId, value] of Object.entries(metrics)) {
      const metricDef = industry.metrics.find(m => m.id === metricId)
      if (!metricDef || !metricDef.benchmark) continue

      let performance = 'average'
      if (value >= metricDef.benchmark.good) {
        performance = 'good'
      } else if (value < metricDef.benchmark.poor) {
        performance = 'poor'
      }

      benchmarks[metricDef.name] = { value, performance }
    }

    return benchmarks
  }

  /**
   * 从数据中提取指标
   */
  private extractMetricsFromData(
    data: any[],
    metricDefs: any[]
  ): Record<string, number> {
    const metrics: Record<string, number> = {}

    // 简化处理：实际应该根据指标定义计算
    if (data.length > 0) {
      // 示例：从数据中计算转化率
      const totalUsers = data.length
      const convertedUsers = data.filter((row: any) => row.status === 'converted').length
      metrics['conversion_rate'] = (convertedUsers / totalUsers) * 100

      // 示例：计算平均订单金额
      if (data[0].order_amount) {
        const totalRevenue = data.reduce((sum: number, row: any) => sum + (row.order_amount || 0), 0)
        metrics['aoe'] = totalRevenue / data.length
      }
    }

    return metrics
  }

  /**
   * 生成行业洞察
   */
  private async generateIndustryInsights(
    industry: IndustryKnowledge,
    request: IndustryAnalysisRequest,
    context: string
  ): Promise<string[]> {
    if (!this.aiManager) return []

    try {
      const prompt = `
基于以下行业知识和数据，生成3-5条专业洞察：

${context}

用户查询：${request.query}

数据概览：
- 总行数：${request.data.length}
- 提供的指标：${request.metrics?.map(m => m.label).join(', ') || '无'}

请生成简洁、专业的洞察，每条洞察应该：
1. 指出具体的数据发现
2. 与行业标准或基准进行对比
3. 说明其业务意义
4. 使用行业术语

每条洞察格式：• [发现] - [对比] - [业务意义]
      `.trim()

      const manager = this.aiManager as any
      const originalHistory = manager.conversationHistory

      // 设置系统消息
      manager.conversationHistory = [
        { role: 'system', content: '你是一位资深的商业分析专家，擅长数据分析和行业洞察。' }
      ]

      try {
        const response = await this.aiManager.chat(prompt)

        const insights = response.content
          .split('\n')
          .filter(line => line.trim().startsWith('•'))
          .map(line => line.trim().replace(/^•\s*/, ''))

        return insights
      } finally {
        manager.conversationHistory = originalHistory
      }
    } catch (error) {
      console.error('Failed to generate industry insights:', error)
      return []
    }
  }

  /**
   * 生成行业建议
   */
  private async generateRecommendations(
    industry: IndustryKnowledge,
    request: IndustryAnalysisRequest,
    insights: string[]
  ): Promise<string[]> {
    if (!this.aiManager) return []

    try {
      const prompt = `
基于以下行业洞察，生成3条可执行的商业建议：

行业：${industry.name}

发现的洞察：
${insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

请生成可操作的建议，每条建议应该：
1. 具体明确，可以直接执行
2. 优先级排序（高/中/低）
3. 预估实施难度
4. 预期效果

格式：[优先级] [建议] - 难度：[低/中/高]，预期效果：[描述]
      `.trim()

      const manager = this.aiManager as any
      const originalHistory = manager.conversationHistory

      // 设置系统消息
      manager.conversationHistory = [
        { role: 'system', content: '你是一位资深的商业顾问，擅长提供可执行的商业建议。' }
      ]

      try {
        const response = await this.aiManager.chat(prompt)

        const recommendations = response.content
          .split('\n')
          .filter(line => line.trim())
          .map(line => line.trim())

        return recommendations
      } finally {
        manager.conversationHistory = originalHistory
      }
    } catch (error) {
      console.error('Failed to generate recommendations:', error)
      return []
    }
  }

  /**
   * 自动检测行业
   */
  detectIndustry(data: any[], query: string): string | null {
    // 基于关键词检测
    const keywords = {
      ecommerce: ['订单', '购物车', '支付', 'GMV', 'SKU', '转化率', '复购'],
      saas: ['MRR', 'ARR', '订阅', '流失率', 'LTV', 'CAC', 'ARPU', 'NDR'],
      finance: ['贷款', '违约', '资产', '投资', '收益率', 'AUM', 'NPL']
    }

    for (const [industryId, industryKeywords] of Object.entries(keywords)) {
      for (const keyword of industryKeywords) {
        if (query.toLowerCase().includes(keyword.toLowerCase()) ||
            JSON.stringify(data).toLowerCase().includes(keyword.toLowerCase())) {
          return industryId
        }
      }
    }

    return null
  }
}

export const industryAnalysisEngine = new IndustryAnalysisEngine()
