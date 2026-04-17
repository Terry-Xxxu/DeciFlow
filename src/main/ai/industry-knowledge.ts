/**
 * 行业知识库
 * 为不同业务领域提供专业的指标定义、基准值和分析模板
 */

export interface IndustryMetric {
  id: string
  name: string
  category: 'growth' | 'retention' | 'conversion' | 'revenue' | 'engagement' | 'support'
  description: string
  formula: string
  benchmark?: {
    good: number
    average: number
    poor: number
  }
  unit: string
  dimensions: string[]
}

export interface IndustryInsight {
  id: string
  title: string
  template: string
  category: string
  variables: Array<{
    name: string
    description: string
    type: 'metric' | 'dimension' | 'threshold'
  }>
}

export interface IndustryKnowledge {
  id: string
  name: string
  description: string
  metrics: IndustryMetric[]
  insights: IndustryInsight[]
  benchmarks: Record<string, number>
  terminology: Record<string, string>
}

/**
 * 行业知识库管理器
 */
export class IndustryKnowledgeBase {
  private industries: Map<string, IndustryKnowledge> = new Map()

  constructor() {
    this.initializeIndustries()
  }

  /**
   * 初始化行业知识库
   */
  private initializeIndustries(): void {
    // 电商行业
    this.industries.set('ecommerce', {
      id: 'ecommerce',
      name: '电商',
      description: '在线零售和电子商务平台',
      metrics: [
        {
          id: 'gmv',
          name: 'GMV (商品交易总额)',
          category: 'revenue',
          description: '一定时间内的商品交易总金额',
          formula: 'SUM(order_amount)',
          benchmark: { good: 1000000, average: 500000, poor: 100000 },
          unit: '元',
          dimensions: ['channel', 'category', 'region', 'user_type']
        },
        {
          id: 'conversion_rate',
          name: '转化率',
          category: 'conversion',
          description: '访客转化为购买者的比例',
          formula: 'COUNT(purchases) / COUNT(visitors) * 100',
          benchmark: { good: 5, average: 2.5, poor: 1 },
          unit: '%',
          dimensions: ['channel', 'product_category', 'traffic_source']
        },
        {
          id: 'aoe',
          name: 'AOV (平均订单金额)',
          category: 'revenue',
          description: '平均每个订单的金额',
          formula: 'SUM(revenue) / COUNT(orders)',
          benchmark: { good: 500, average: 200, poor: 100 },
          unit: '元',
          dimensions: ['channel', 'user_segment', 'product_category']
        },
        {
          id: 'repeat_purchase_rate',
          name: '复购率',
          category: 'retention',
          description: '再次购买的客户比例',
          formula: 'COUNT(customers_with_repeat_purchase) / COUNT(total_customers) * 100',
          benchmark: { good: 40, average: 20, poor: 10 },
          unit: '%',
          dimensions: ['channel', 'product_category', 'cohort']
        },
        {
          id: 'cart_abandonment_rate',
          name: '购物车放弃率',
          category: 'conversion',
          description: '加入购物车但未完成支付的比例',
          formula: 'COUNT(abandoned_carts) / COUNT(all_carts) * 100',
          benchmark: { good: 60, average: 75, poor: 85 },
          unit: '%',
          dimensions: ['device', 'traffic_source', 'user_type']
        }
      ],
      insights: [
        {
          id: 'high_churn_insight',
          title: '高流失率分析',
          template: '检测到{metric}为{value}%，低于行业基准{benchmark}%。建议：{recommendations}',
          category: 'retention',
          variables: [
            { name: 'metric', description: '指标名称', type: 'metric' },
            { name: 'value', description: '实际值', type: 'metric' },
            { name: 'benchmark', description: '基准值', type: 'threshold' },
            { name: 'recommendations', description: '改进建议', type: 'dimension' }
          ]
        },
        {
          id: 'channel_performance_insight',
          title: '渠道表现分析',
          template: '{best_channel}的{metric}最高（{best_value}%），是{worst_channel}（{worst_value}%）的{ratio}倍。建议：加大{best_channel}的投入，同时优化{worst_channel}的策略。',
          category: 'growth',
          variables: [
            { name: 'best_channel', description: '最佳渠道', type: 'dimension' },
            { name: 'metric', description: '指标名称', type: 'metric' },
            { name: 'best_value', description: '最佳值', type: 'metric' },
            { name: 'worst_channel', description: '最差渠道', type: 'dimension' },
            { name: 'worst_value', description: '最差值', type: 'metric' },
            { name: 'ratio', description: '倍数', type: 'threshold' }
          ]
        }
      ],
      benchmarks: {
        'gmv.growth_rate': 20, // GMV 增长率基准 20%
        'conversion_rate.mobile': 2.5, // 移动端转化率基准
        'repeat_purchase_rate.premium': 45 // 高端用户复购率基准
      },
      terminology: {
        'GMV': 'Gross Merchandise Volume，商品交易总额',
        'AOV': 'Average Order Value，平均订单金额',
        'CAC': 'Customer Acquisition Cost，获客成本',
        'LTV': 'Lifetime Value，客户生命周期价值'
      }
    })

    // SaaS 行业
    this.industries.set('saas', {
      id: 'saas',
      name: 'SaaS',
      description: '软件即服务',
      metrics: [
        {
          id: 'mrr',
          name: 'MRR (月度经常性收入)',
          category: 'revenue',
          description: '每月的订阅收入总和',
          formula: 'SUM(monthly_revenue)',
          benchmark: { good: 100000, average: 50000, poor: 10000 },
          unit: '元',
          dimensions: ['plan_type', 'customer_segment', 'region']
        },
        {
          id: 'arr',
          name: 'ARR (年度经常性收入)',
          category: 'revenue',
          description: 'MRR × 12，年化收入',
          formula: 'MRR * 12',
          benchmark: { good: 1200000, average: 600000, poor: 120000 },
          unit: '元',
          dimensions: ['plan_type', 'customer_segment']
        },
        {
          id: 'churn_rate',
          name: '流失率',
          category: 'retention',
          description: '每月取消订阅的客户比例',
          formula: 'COUNT(churned_customers) / COUNT(total_customers) * 100',
          benchmark: { good: 2, average: 5, poor: 10 },
          unit: '%',
          dimensions: ['plan_type', 'customer_segment', 'cohort']
        },
        {
          id: 'ltv',
          name: 'LTV (客户生命周期价值)',
          category: 'revenue',
          description: '单个客户在整个生命周期内贡献的收入',
          formula: 'ARPU * customer_lifetime',
          benchmark: { good: 10000, average: 5000, poor: 2000 },
          unit: '元',
          dimensions: ['plan_type', 'customer_segment', 'acquisition_channel']
        },
        {
          id: 'cac',
          name: 'CAC (获客成本)',
          category: 'growth',
          description: '获取一个新客户的营销和销售成本',
          formula: 'marketing_spend / new_customers_acquired',
          benchmark: { good: 200, average: 500, poor: 1000 },
          unit: '元',
          dimensions: ['channel', 'campaign', 'customer_segment']
        },
        {
          id: 'ltv_cac_ratio',
          name: 'LTV/CAC 比率',
          category: 'growth',
          description: '客户价值与获客成本的比值',
          formula: 'LTV / CAC',
          benchmark: { good: 5, average: 3, poor: 1.5 },
          unit: '',
          dimensions: ['channel', 'customer_segment', 'time_period']
        },
        {
          id: 'arpu',
          name: 'ARPU (每用户平均收入)',
          category: 'revenue',
          description: 'Average Revenue Per User',
          formula: 'total_revenue / total_users',
          benchmark: { good: 100, average: 50, poor: 20 },
          unit: '元',
          dimensions: ['plan_type', 'customer_segment', 'billing_cycle']
        },
        {
          id: 'mrr_churn',
          name: 'MRR 流失率',
          category: 'retention',
          description: '因客户流失导致的月收入流失比例',
          formula: 'SUM(churned_mrr) / total_mrr * 100',
          benchmark: { good: 1, average: 2, poor: 5 },
          unit: '%',
          dimensions: ['plan_type', 'reason', 'customer_segment']
        },
        {
          id: 'nrr',
          name: 'NRR (净收入留存率)',
          category: 'retention',
          description: '包括扩张收入在内的净留存率',
          formula: '(retained_mrr + expansion_mrr - downsell_mrr - churn_mrr) / starting_mrr * 100',
          benchmark: { good: 120, average: 100, poor: 90 },
          unit: '%',
          dimensions: ['customer_segment', 'cohort']
        }
      ],
      insights: [
        {
          id: 'unhealthy_churn_insight',
          title: '不健康的流失率',
          template: '⚠️ 流失率为{value}%，超过健康基准{benchmark}%。每月损失约{lost_revenue}收入。{at_risk_segment}用户流失最严重。',
          category: 'retention',
          variables: [
            { name: 'value', description: '实际流失率', type: 'metric' },
            { name: 'benchmark', description: '健康基准', type: 'threshold' },
            { name: 'lost_revenue', description: '损失收入', type: 'metric' },
            { name: 'at_risk_segment', description: '高风险用户群体', type: 'dimension' }
          ]
        },
        {
          id: 'ltv_cac_warning',
          title: 'LTV/CAC 比例警告',
          template: '⚠️ LTV/CAC 为{ratio}:1，低于健康比例 3:1。这意味着您在每位客户上亏损{loss_per_customer}。建议优化获客渠道或提升产品价值。',
          category: 'growth',
          variables: [
            { name: 'ratio', description: 'LTV/CAC比值', type: 'metric' },
            { name: 'loss_per_customer', description: '每客户亏损', type: 'metric' }
          ]
        },
        {
          id: 'expansion_opportunity',
          title: '扩张收入机会',
          template: '💡 {segment}的扩张收入率达{expansion_rate}%，高于平均{average_rate}%。建议：{action_suggestions}',
          category: 'growth',
          variables: [
            { name: 'segment', description: '客户群体', type: 'dimension' },
            { name: 'expansion_rate', description: '扩张率', type: 'metric' },
            { name: 'average_rate', description: '平均率', type: 'threshold' },
            { name: 'action_suggestions', description: '行动建议', type: 'dimension' }
          ]
        }
      ],
      benchmarks: {
        'churn_rate.enterprise': 2, // 企业客户流失率
        'churn_rate.smb': 5, // 中小企业流失率
        'nrr.enterprise': 125, // 企业客户 NRR
        'ltv_cac_ratio.healthy': 3
      },
      terminology: {
        'MRR': 'Monthly Recurring Revenue，月度经常性收入',
        'ARR': 'Annual Recurring Revenue，年度经常性收入',
        'NRR': 'Net Revenue Retention，净收入留存率',
        'ARPU': 'Average Revenue Per User，每用户平均收入'
      }
    })

    // 金融行业
    this.industries.set('finance', {
      id: 'finance',
      name: '金融',
      description: '银行、保险、投资等金融服务',
      metrics: [
        {
          id: 'aum',
          name: 'AUM (资产管理规模)',
          category: 'revenue',
          description: 'Assets Under Management',
          formula: 'SUM(client_assets)',
          benchmark: { good: 1000000000, average: 500000000, poor: 100000000 },
          unit: '元',
          dimensions: ['client_type', 'product_type', 'region']
        },
        {
          id: 'loan_default_rate',
          name: '贷款违约率',
          category: 'engagement',
          description: '贷款违约比例',
          formula: 'COUNT(defaulted_loans) / COUNT(total_loans) * 100',
          benchmark: { good: 1, average: 3, poor: 5 },
          unit: '%',
          dimensions: ['loan_type', 'risk_level', 'region']
        }
      ],
      insights: [],
      benchmarks: {},
      terminology: {
        'AUM': 'Assets Under Management，资产管理规模',
        'NPL': 'Non-Performing Loan，不良贷款'
      }
    })
  }

  /**
   * 获取行业知识
   */
  getIndustry(industryId: string): IndustryKnowledge | undefined {
    return this.industries.get(industryId)
  }

  /**
   * 获取所有行业
   */
  getAllIndustries(): IndustryKnowledge[] {
    return Array.from(this.industries.values())
  }

  /**
   * 搜索指标
   */
  searchMetrics(keyword: string): Array<{ metric: IndustryMetric; industry: string }> {
    const results: Array<{ metric: IndustryMetric; industry: string }> = []

    for (const [industryId, industry] of this.industries.entries()) {
      for (const metric of industry.metrics) {
        if (
          metric.name.toLowerCase().includes(keyword.toLowerCase()) ||
          metric.description.toLowerCase().includes(keyword.toLowerCase()) ||
          metric.id.toLowerCase().includes(keyword.toLowerCase())
        ) {
          results.push({ metric, industry: industryId })
        }
      }
    }

    return results
  }

  /**
   * 获取指标建议
   */
  getMetricInsight(
    industryId: string,
    metricId: string,
    value: number,
    dimension?: string
  ): string | null {
    const industry = this.industries.get(industryId)
    if (!industry) return null

    const metric = industry.metrics.find(m => m.id === metricId)
    if (!metric) return null

    const benchmark = metric.benchmark
    if (!benchmark) return null

    // 判断表现
    let performance: 'good' | 'average' | 'poor'
    if (value >= benchmark.good) {
      performance = 'good'
    } else if (value >= benchmark.average) {
      performance = 'average'
    } else {
      performance = 'poor'
    }

    // 生成建议
    switch (performance) {
      case 'good':
        return `✅ ${metric.name}表现优秀（${value}${metric.unit}），超过行业良好水平（${benchmark.good}${metric.unit}）。保持当前策略！`
      case 'average':
        return `📊 ${metric.name}为${value}${metric.unit}，接近行业平均水平（${benchmark.average}${metric.unit}）。有提升空间，建议优化相关流程。`
      case 'poor':
        return `⚠️ ${metric.name}为${value}${metric.unit}，低于行业平均（${benchmark.average}${metric.unit}）。建议立即采取行动：${this.getImprovementSuggestions(metric.category)}`
      default:
        return null
    }
  }

  /**
   * 获取改进建议
   */
  private getImprovementSuggestions(category: string): string {
    const suggestions: Record<string, string> = {
      growth: '优化获客渠道、提升产品价值、加强用户引导',
      retention: '改善用户体验、增加用户粘性、优化客户服务',
      conversion: '优化转化流程、A/B测试关键页面、简化支付流程',
      revenue: '调整定价策略、推出高级功能、增加增值服务',
      engagement: '增加互动功能、个性化推荐、优化内容策略',
      support: '提升响应速度、优化工单流程、加强用户培训'
    }
    return suggestions[category] || '分析具体问题并制定针对性改进方案'
  }

  /**
   * 为 AI 生成提供行业上下文
   */
  getIndustryContext(industryId: string): string {
    const industry = this.industries.get(industryId)
    if (!industry) return ''

    const metricsDesc = industry.metrics.map(m => {
      return `- ${m.name} (${m.id}): ${m.description}。计算公式：${m.formula}。基准：良好 ${m.benchmark?.good || '-'}，平均 ${m.benchmark?.average || '-'}`
    }).join('\n')

    return `
行业：${industry.name}
描述：${industry.description}

核心指标：
${metricsDesc}

术语说明：
${Object.entries(industry.terminology).map(([k, v]) => `${k}: ${v}`).join('\n')}

分析建议生成时，请参考以上指标定义和基准值，提供专业、可操作的建议。
    `
  }
}

// 导出单例
export const industryKnowledgeBase = new IndustryKnowledgeBase()
