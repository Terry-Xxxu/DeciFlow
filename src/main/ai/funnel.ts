/**
 * 智能漏斗分析服务
 * 自动发现用户路径和转化节点
 */

import { AIChatManager } from '../ai/adapter'

export interface FunnelStep {
  id: string
  name: string
  count: number
  conversionRate: number
  dropOffRate: number
  avgTime?: number
}

export interface UserPath {
  steps: string[]
  count: number
  conversionRate: number
}

export interface FunnelAnalysis {
  id: string
  name: string
  steps: FunnelStep[]
  overallConversionRate: number
  totalUsers: number
  dropOffPoints: string[]
  recommendations: string[]
  createdAt: Date
}

export class FunnelDiscoveryService {
  private aiManager: AIChatManager

  constructor(aiManager: AIChatManager) {
    this.aiManager = aiManager
  }

  /**
   * 自动发现漏斗
   */
  async discoverFunnel(userPaths: UserPath[]): Promise<FunnelAnalysis> {
    // 1. 分析用户路径，识别高频步骤
    const stepFrequency = this.analyzeStepFrequency(userPaths)

    // 2. 识别关键转化节点
    const keySteps = this.identifyKeySteps(stepFrequency, userPaths)

    // 3. 计算转化率
    const steps = this.calculateFunnelMetrics(keySteps, userPaths)

    // 4. 识别流失点
    const dropOffPoints = this.identifyDropOffPoints(steps)

    // 5. 生成建议
    const recommendations = await this.generateRecommendations(steps, dropOffPoints)

    return {
      id: Date.now().toString(),
      name: '自动发现的转化漏斗',
      steps,
      overallConversionRate: steps[steps.length - 1]?.conversionRate || 0,
      totalUsers: userPaths.length,
      dropOffPoints,
      recommendations,
      createdAt: new Date(),
    }
  }

  /**
   * 分析步骤频率
   */
  private analyzeStepFrequency(userPaths: UserPath[]): Map<string, number> {
    const frequency = new Map<string, number>()

    for (const path of userPaths) {
      for (const step of path.steps) {
        frequency.set(step, (frequency.get(step) || 0) + 1)
      }
    }

    return frequency
  }

  /**
   * 识别关键步骤
   */
  private identifyKeySteps(
    stepFrequency: Map<string, number>,
    userPaths: UserPath[]
  ): string[] {
    // 找出出现频率最高的步骤
    const sortedSteps = Array.from(stepFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // 取前10个

    return sortedSteps.map(s => s[0])
  }

  /**
   * 计算漏斗指标
   */
  private calculateFunnelMetrics(
    keySteps: string[],
    userPaths: UserPath[]
  ): FunnelStep[] {
    const steps: FunnelStep[] = []
    const totalUsers = userPaths.length

    for (let i = 0; i < keySteps.length; i++) {
      const stepName = keySteps[i]

      // 计算到达这一步的用户数
      const count = userPaths.filter(path =>
        path.steps.includes(stepName)
      ).length

      // 计算转化率（相对于上一步）
      const prevCount = i > 0 ? steps[i - 1].count : totalUsers
      const conversionRate = prevCount > 0 ? (count / prevCount) * 100 : 0

      // 计算流失率
      const dropOffRate = 100 - conversionRate

      steps.push({
        id: `step-${i}`,
        name: stepName,
        count,
        conversionRate,
        dropOffRate,
      })
    }

    return steps
  }

  /**
   * 识别流失点
   */
  private identifyDropOffPoints(steps: FunnelStep[]): string[] {
    return steps
      .filter(step => step.dropOffRate > 30) // 流失率超过30%
      .sort((a, b) => b.dropOffRate - a.dropOffRate)
      .map(step => step.name)
  }

  /**
   * 生成优化建议
   */
  async generateRecommendations(
    steps: FunnelStep[],
    dropOffPoints: string[]
  ): Promise<string[]> {
    if (dropOffPoints.length === 0) {
      return ['当前漏斗表现良好，继续保持']
    }

    const prompt = `作为一名数据驱动的增长型产品经理，请基于以下漏斗数据生成优化建议：

【漏斗步骤】
${steps.map(s => `${s.name}: ${s.count}用户, 转化率${s.conversionRate.toFixed(1)}%, 流失率${s.dropOffRate.toFixed(1)}%`).join('\n')}

【高流失点】
${dropOffPoints.join(', ')}

请生成3条具体的优化建议，按优先级排序（P0/P1/P2），每条建议都要能直接执行。输出格式：
P0: [建议内容]
P1: [建议内容]
P2: [建议内容]

建议：`

    try {
      const response = await this.aiManager.chat(prompt)
      return this.parseRecommendations(response.content)
    } catch {
      return dropOffPoints.map(point =>
        `P1: 优化${point}步骤的用户体验，降低流失率`
      )
    }
  }

  /**
   * 解析建议
   */
  private parseRecommendations(content: string): string[] {
    const lines = content.split('\n').filter(l => l.trim())
    const recommendations: string[] = []

    for (const line of lines) {
      if (line.includes('P0:') || line.includes('P1:') || line.includes('P2:')) {
        recommendations.push(line.trim())
      }
    }

    return recommendations.length > 0 ? recommendations : [content]
  }

  /**
   * 对比漏斗
   */
  compareFunnels(funnel1: FunnelAnalysis, funnel2: FunnelAnalysis): any {
    // 简化实现：返回对比结果
    return {
      funnel1: {
        name: funnel1.name,
        conversionRate: funnel1.overallConversionRate,
      },
      funnel2: {
        name: funnel2.name,
        conversionRate: funnel2.overallConversionRate,
      },
      difference: funnel2.overallConversionRate - funnel1.overallConversionRate,
    }
  }
}
