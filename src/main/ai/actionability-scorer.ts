/**
 * 可执行性评分系统
 * 评估AI洞察和建议的可执行性，帮助用户判断可行性
 */

export interface ActionabilityScore {
  score: number // 0-100
  level: 'high' | 'medium' | 'low'
  factors: {
    clarity: number // 清晰度 0-100
    feasibility: number // 可行性 0-100
    impact: number // 影响力 0-100
    effort: number // 所需努力 0-100 (反向，越低越好)
    urgency: number // 紧迫性 0-100
  }
  bottlenecks: string[]
  prerequisites: string[]
  estimatedTimeframe: string
  resources: string[]
}

export interface InsightWithActionability {
  insight: string
  category: string
  actionable: boolean
  score?: ActionabilityScore
  suggestedActions?: Array<{
    action: string
    priority: 'high' | 'medium' | 'low'
    owner: string
    effort: 'low' | 'medium' | 'high'
    timeframe: string
  }>
}

/**
 * 可执行性评分器
 */
export class ActionabilityScorer {
  /**
   * 评估洞察的可执行性
   */
  scoreInsight(insight: string, context?: {
    hasData?: boolean
    hasAccess?: boolean
    hasResources?: boolean
    industry?: string
  }): ActionabilityScore {
    const factors = {
      clarity: this.assessClarity(insight),
      feasibility: this.assessFeasibility(insight, context),
      impact: this.assessImpact(insight),
      effort: this.assessEffort(insight),
      urgency: this.assessUrgency(insight)
    }

    // 计算总分（加权平均）
    const weights = {
      clarity: 0.2,
      feasibility: 0.3,
      impact: 0.2,
      effort: 0.15, // 反向权重
      urgency: 0.15
    }

    const score = Math.round(
      factors.clarity * weights.clarity +
      factors.feasibility * weights.feasibility +
      factors.impact * weights.impact +
      (100 - factors.effort) * weights.effort +
      factors.urgency * weights.urgency
    )

    // 确定等级
    let level: 'high' | 'medium' | 'low'
    if (score >= 70) {
      level = 'high'
    } else if (score >= 40) {
      level = 'medium'
    } else {
      level = 'low'
    }

    // 识别瓶颈
    const bottlenecks = this.identifyBottlenecks(insight, factors)

    // 识别前置条件
    const prerequisites = this.identifyPrerequisites(insight)

    // 估算时间框架
    const timeframe = this.estimateTimeframe(score, factors.effort)

    // 所需资源
    const resources = this.identifyResources(insight)

    return {
      score,
      level,
      factors,
      bottlenecks,
      prerequisites,
      estimatedTimeframe: timeframe,
      resources
    }
  }

  /**
   * 评估清晰度
   */
  private assessClarity(insight: string): number {
    let score = 50 // 基础分

    // 检查是否包含具体数字
    if (/\d+/.test(insight)) {
      score += 20
    }

    // 检查是否包含具体指标名称
    const metricKeywords = ['转化率', '留存率', 'GMV', 'MRR', 'DAU', 'ARPU', 'LTV', 'CAC']
    if (metricKeywords.some(keyword => insight.includes(keyword))) {
      score += 15
    }

    // 检查是否有明确的行动建议
    const actionKeywords = ['建议', '应该', '需要', '可以', '优化', '提升', '降低', '增加']
    if (actionKeywords.some(keyword => insight.includes(keyword))) {
      score += 15
    }

    return Math.min(score, 100)
  }

  /**
   * 评估可行性
   */
  private assessFeasibility(insight: string, context?: any): number {
    let score = 50 // 基础分

    // 检查是否需要额外数据
    const dataIndicators = ['数据表明', '根据', '显示']
    if (dataIndicators.some(indicator => insight.includes(indicator))) {
      score += 20
    } else if (!context?.hasData) {
      score -= 10
    }

    // 检查是否涉及技术实现
    const techKeywords = ['开发', '代码', '系统', '架构', '集成', '部署']
    if (techKeywords.some(keyword => insight.includes(keyword))) {
      score -= 15
    }

    // 检查是否需要外部资源
    const externalKeywords = ['合作伙伴', '第三方', '外包', '采购']
    if (externalKeywords.some(keyword => insight.includes(keyword))) {
      score -= 10
    }

    // 检查是否可以立即执行
    const immediateKeywords = ['立即', '现在', '今天', '本周', '快速']
    if (immediateKeywords.some(keyword => insight.includes(keyword))) {
      score += 15
    }

    return Math.max(0, Math.min(score, 100))
  }

  /**
   * 评估影响力
   */
  private assessImpact(insight: string): number {
    let score = 50 // 基础分

    // 检查影响范围
    const highImpactKeywords = ['显著', '大幅', '明显', '极大', '关键', '核心']
    if (highImpactKeywords.some(keyword => insight.includes(keyword))) {
      score += 20
    }

    // 检查是否涉及核心指标
    const coreMetricKeywords = ['收入', 'GMV', 'MRR', '转化率', '流失率']
    if (coreMetricKeywords.some(keyword => insight.includes(keyword))) {
      score += 15
    }

    // 检查是否量化影响
    if (/\d+[%$]/.test(insight)) {
      score += 15
    }

    return Math.min(score, 100)
  }

  /**
   * 评估所需努力
   */
  private assessEffort(insight: string): number {
    let effort = 30 // 默认中等努力

    // 检查是否需要复杂操作
    const complexKeywords = ['重新设计', '开发新功能', '系统集成', '架构重构']
    if (complexKeywords.some(keyword => insight.includes(keyword))) {
      effort += 40
    }

    // 检查是否需要跨部门协作
    const collabKeywords = ['协调', '配合', '多部门', '团队']
    if (collabKeywords.some(keyword => insight.includes(keyword))) {
      effort += 20
    }

    // 检查是否是简单优化
    const simpleKeywords = ['调整', '优化', '改进', '修改配置', '设置']
    if (simpleKeywords.some(keyword => insight.includes(keyword))) {
      effort -= 15
    }

    return Math.max(0, Math.min(effort, 100))
  }

  /**
   * 评估紧迫性
   */
  private assessUrgency(insight: string): number {
    let score = 40 // 默认中等紧迫

    // 检查紧急关键词
    const urgentKeywords = ['紧急', '立即', '危机', '严重', '大幅下降', '急剧']
    if (urgentKeywords.some(keyword => insight.includes(keyword))) {
      score += 40
    }

    // 检查趋势性关键词
    const trendKeywords = ['下降', '减少', '流失', '负增长']
    if (trendKeywords.some(keyword => insight.includes(keyword))) {
      score += 25
    }

    // 检查机会性关键词
    const opportunityKeywords = ['机会', '潜力', '增长', '提升']
    if (opportunityKeywords.some(keyword => insight.includes(keyword))) {
      score += 15
    }

    return Math.min(score, 100)
  }

  /**
   * 识别瓶颈
   */
  private identifyBottlenecks(insight: string, factors: any): string[] {
    const bottlenecks: string[] = []

    if (factors.clarity < 50) {
      bottlenecks.push('洞察描述不够清晰，需要更具体的数据和分析')
    }

    if (factors.feasibility < 50) {
      bottlenecks.push('实施可能存在技术或资源限制')
    }

    if (insight.includes('开发') || insight.includes('系统')) {
      bottlenecks.push('需要技术团队投入开发资源')
    }

    if (insight.includes('预算') || insight.includes('成本')) {
      bottlenecks.push('可能需要额外的预算批准')
    }

    if (insight.includes('部门') || insight.includes('团队')) {
      bottlenecks.push('需要跨部门协调和沟通')
    }

    return bottlenecks
  }

  /**
   * 识别前置条件
   */
  private identifyPrerequisites(insight: string): string[] {
    const prerequisites: string[] = []

    // 数据相关
    if (insight.includes('分析') || insight.includes('报告')) {
      prerequisites.push('确保数据收集和监控已就绪')
    }

    // 技术相关
    if (insight.includes('集成') || insight.includes('开发')) {
      prerequisites.push('完成技术可行性评估')
      prerequisites.push('准备开发环境和资源')
    }

    // 资源相关
    if (insight.includes('推广') || insight.includes('营销')) {
      prerequisites.push('准备营销预算和渠道资源')
    }

    // 流程相关
    if (insight.includes('流程') || insight.includes('优化')) {
      prerequisites.push('梳理现有业务流程')
      prerequisites.push('获得相关部门的支持')
    }

    return prerequisites
  }

  /**
   * 估算时间框架
   */
  private estimateTimeframe(score: number, effort: number): string {
    if (score >= 80 && effort < 40) {
      return '1-2周内可见效'
    } else if (score >= 60) {
      return '2-4周可见效'
    } else if (score >= 40) {
      return '1-2个月可见效'
    } else if (effort > 70) {
      return '需要3个月以上的长期项目'
    } else {
      return '需要进一步评估'
    }
  }

  /**
   * 识别所需资源
   */
  private identifyResources(insight: string): string[] {
    const resources: string[] = []

    // 技术资源
    if (insight.includes('开发') || insight.includes('功能')) {
      resources.push('开发工程师')
      resources.push('QA测试')
    }

    // 营销资源
    if (insight.includes('推广') || insight.includes('营销')) {
      resources.push('营销预算')
      resources.push('营销团队')
    }

    // 数据资源
    if (insight.includes('分析') || insight.includes('监控')) {
      resources.push('数据分析师')
      resources.push('BI工具')
    }

    // 管理资源
    if (insight.includes('流程') || insight.includes('协调')) {
      resources.push('项目经理')
      resources.push('管理层支持')
    }

    return [...new Set(resources)] // 去重
  }

  /**
   * 为洞察添加建议行动
   */
  generateSuggestedActions(insight: string, score: ActionabilityScore): Array<{
    action: string
    priority: 'high' | 'medium' | 'low'
    owner: string
    effort: 'low' | 'medium' | 'high'
    timeframe: string
  }> {
    const actions: Array<{
      action: string
      priority: 'high' | 'medium' | 'low'
      owner: string
      effort: 'low' | 'medium' | 'high'
      timeframe: string
    }> = []

    // 基于洞察内容生成行动建议
    if (insight.includes('转化率')) {
      actions.push({
        action: '优化关键转化页面的用户体验',
        priority: 'high',
        owner: '产品团队',
        effort: 'medium',
        timeframe: '2-3周'
      })
      actions.push({
        action: 'A/B测试不同页面布局和文案',
        priority: 'medium',
        owner: '增长团队',
        effort: 'low',
        timeframe: '1-2周'
      })
    }

    if (insight.includes('流失率') || insight.includes('留存')) {
      actions.push({
        action: '分析流失用户的行为特征',
        priority: 'high',
        owner: '数据团队',
        effort: 'medium',
        timeframe: '1周'
      })
      actions.push({
        action: '实施用户留存策略（邮件、Push等）',
        priority: 'high',
        owner: '运营团队',
        effort: 'low',
        timeframe: '立即执行'
      })
    }

    if (insight.includes('渠道') || insight.includes('获客')) {
      actions.push({
        action: '重新评估高成本渠道的ROI',
        priority: 'medium',
        owner: '市场团队',
        effort: 'low',
        timeframe: '1周'
      })
      actions.push({
        action: '增加高ROI渠道的投放预算',
        priority: 'high',
        owner: '市场团队',
        effort: 'low',
        timeframe: '立即执行'
      })
    }

    // 如果没有生成任何行动，提供通用行动
    if (actions.length === 0) {
      actions.push({
        action: '与相关团队讨论并制定详细计划',
        priority: 'medium',
        owner: '产品经理',
        effort: 'low',
        timeframe: '本周内'
      })
    }

    return actions
  }

  /**
   * 格式化可执行性评分用于显示
   */
  formatForDisplay(score: ActionabilityScore): {
    summary: string
    badgeColor: string
    details: string[]
  } {
    const levelLabels = {
      high: '高可执行性',
      medium: '中等可执行性',
      low: '低可执行性'
    }

    const badgeColors = {
      high: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-red-500/20 text-red-400 border-red-500/30'
    }

    const details: string[] = []

    // 添加因素说明
    details.push(`清晰度: ${this.getRating(score.factors.clarity)}`)
    details.push(`可行性: ${this.getRating(score.factors.feasibility)}`)
    details.push(`影响力: ${this.getRating(score.factors.impact)}`)
    details.push(`紧急性: ${this.getRating(score.factors.urgency)}`)

    // 添加时间框架
    details.push(`预计周期: ${score.estimatedTimeframe}`)

    return {
      summary: levelLabels[score.level],
      badgeColor: badgeColors[score.level],
      details
    }
  }

  /**
   * 获取评级标签
   */
  private getRating(score: number): string {
    if (score >= 80) return '优秀'
    if (score >= 60) return '良好'
    if (score >= 40) return '一般'
    return '较差'
  }
}

export const actionabilityScorer = new ActionabilityScorer()
