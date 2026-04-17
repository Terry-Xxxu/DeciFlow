/**
 * 业务语言学习系统
 * 从用户反馈中学习，持续优化NL2SQL的准确性
 */

import fs from 'fs/promises'
import path from 'path'
import { app } from 'electron'

export interface QueryLearning {
  id: string
  timestamp: Date
  naturalLanguage: string
  generatedSQL: string
  correctedSQL?: string
  userFeedback?: 'accepted' | 'rejected' | 'modified'
  executionSuccess?: boolean
  executionTime?: number
  errorMessage?: string
  databaseContext: {
    databaseType: string
    schema?: string[]
  }
}

export interface MetricMapping {
  businessName: string
  sqlExpression: string
  description: string
  category: string
  confidence: number // 0-1
  usageCount: number
  successRate: number
}

export interface LearningAnalytics {
  totalQueries: number
  acceptanceRate: number
  correctionRate: number
  commonMistakes: Array<{ pattern: string; count: number }>
  improvedMappings: string[]
}

/**
 * 业务语言学习管理器
 */
export class BusinessLanguageLearning {
  private learnings: QueryLearning[] = []
  private metricMappings: Map<string, MetricMapping> = new Map()
  private learningFilePath: string
  private mappingsFilePath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    this.learningFilePath = path.join(userDataPath, 'learning', 'queries.jsonl')
    this.mappingsFilePath = path.join(userDataPath, 'learning', 'mappings.json')

    this.loadFromFile()
  }

  /**
   * 记录查询学习事件
   */
  async recordQuery(learning: QueryLearning): Promise<void> {
    this.learnings.push(learning)

    // 保存到文件
    await this.saveToFile()

    // 如果有用户纠正，学习新的映射
    if (learning.correctedSQL) {
      await this.learnFromCorrection(learning)
    }

    // 更新指标映射的统计
    if (learning.userFeedback === 'accepted') {
      await this.updateMetricSuccess(learning.naturalLanguage, true)
    } else if (learning.userFeedback === 'rejected') {
      await this.updateMetricSuccess(learning.naturalLanguage, false)
    }
  }

  /**
   * 从用户纠正中学习
   */
  private async learnFromCorrection(learning: QueryLearning): Promise<void> {
    // 检查必需字段
    if (!learning.generatedSQL || !learning.correctedSQL) {
      console.warn('[业务语言学习] 缺少必要字段，跳过学习')
      return
    }

    // 分析用户修改了什么
    const corrections = this.analyzeCorrection(
      learning.generatedSQL,
      learning.correctedSQL
    )

    // 更新或创建指标映射
    for (const correction of corrections) {
      const existing = this.metricMappings.get(correction.businessName)

      if (existing) {
        // 更新现有映射
        existing.sqlExpression = correction.correctSQL
        existing.confidence = Math.min(1, existing.confidence + 0.1)
        existing.usageCount++
      } else {
        // 创建新映射
        this.metricMappings.set(correction.businessName, {
          businessName: correction.businessName,
          sqlExpression: correction.correctSQL,
          description: `从用户反馈中学习（${new Date().toLocaleDateString()}）`,
          category: 'learned',
          confidence: 0.5,
          usageCount: 1,
          successRate: 0
        })
      }
    }

    await this.saveMappingsToFile()
  }

  /**
   * 分析用户纠正内容
   */
  private analyzeCorrection(
    originalSQL: string,
    correctedSQL: string
  ): Array<{ businessName: string; correctSQL: string }> {
    const corrections: Array<{ businessName: string; correctSQL: string }> = []

    // 提取SQL差异
    // 这是一个简化版本，实际应该使用SQL解析器

    // 示例：检测表名纠正
    const originalTables = this.extractTables(originalSQL)
    const correctedTables = this.extractTables(correctedSQL)

    originalTables.forEach(table => {
      if (!correctedTables.includes(table)) {
        // 找到正确的表名
        const corrected = correctedTables.find(t => t.length === table.length)
        if (corrected) {
          corrections.push({
            businessName: table,
            correctSQL: corrected
          })
        }
      }
    })

    return corrections
  }

  /**
   * 从SQL中提取表名
   */
  private extractTables(sql: string): string[] {
    const matches = sql.match(/FROM\s+(\w+)|JOIN\s+(\w+)/gi)
    if (!matches) return []

    return matches
      .map(m => m.split(/\s+/)[1])
      .filter(t => t && !t.toLowerCase().includes('where'))
  }

  /**
   * 获取改进的SQL生成提示
   */
  async getImprovedPrompt(
    naturalLanguage: string,
    databaseContext: QueryLearning['databaseContext']
  ): Promise<string> {
    // 查找相关的学习记录
    const relevantLearnings = this.findRelevantLearnings(naturalLanguage)

    // 获取相关的指标映射
    const relevantMappings = this.findRelevantMappings(naturalLanguage)

    let learningContext = ''

    if (relevantLearnings.length > 0) {
      learningContext = `\n历史相似查询：\n${relevantLearnings.map(l => `- "${l.naturalLanguage}" → ${l.userFeedback === 'accepted' ? '✅' : '❌'} ${l.correctedSQL || l.generatedSQL}`).join('\n')}\n`
    }

    if (relevantMappings.length > 0) {
      learningContext += `\n业务指标映射：\n${relevantMappings.map(m => `- ${m.businessName} = ${m.sqlExpression} (使用${m.usageCount}次，成功率${(m.successRate * 100).toFixed(0)}%)\n  说明：${m.description}`).join('\n')}\n`
    }

    return learningContext
  }

  /**
   * 查找相关的学习记录
   */
  private findRelevantLearnings(query: string): QueryLearning[] {
    const relevant: QueryLearning[] = []
    const queryLower = query.toLowerCase()
    const keywords = queryLower.split(/\s+/).filter(w => w.length > 2)

    for (const learning of this.learnings) {
      const learningLower = learning.naturalLanguage.toLowerCase()

      // 检查是否包含相同关键词
      const commonKeywords = keywords.filter(k => learningLower.includes(k))

      if (commonKeywords.length >= 2) {
        relevant.push(learning)
      }
    }

    // 按相关性和时间排序
    return relevant
      .sort((a, b) => {
        const scoreA = this.calculateRelevance(a.naturalLanguage, query)
        const scoreB = this.calculateRelevance(b.naturalLanguage, query)
        return scoreB - scoreA
      })
      .slice(0, 5)
  }

  /**
   * 计算相关性得分
   */
  private calculateRelevance(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))

    const intersection = new Set([...words1].filter(w => words2.has(w)))
    const union = new Set([...words1, ...words2])

    return union.size > 0 ? intersection.size / union.size : 0
  }

  /**
   * 查找相关的指标映射
   */
  private findRelevantMappings(query: string): MetricMapping[] {
    const relevant: MetricMapping[] = []
    const queryLower = query.toLowerCase()

    for (const [name, mapping] of this.metricMappings.entries()) {
      if (queryLower.includes(name.toLowerCase()) ||
          name.toLowerCase().includes(queryLower)) {
        relevant.push(mapping)
      }
    }

    // 按使用次数和置信度排序
    return relevant
      .sort((a, b) => {
        const scoreA = a.confidence * a.usageCount
        const scoreB = b.confidence * b.usageCount
        return scoreB - scoreA
      })
      .slice(0, 10)
  }

  /**
   * 更新指标成功统计
   */
  private async updateMetricSuccess(naturalLanguage: string, success: boolean): Promise<void> {
    const relevantMappings = this.findRelevantMappings(naturalLanguage)

    for (const mapping of relevantMappings) {
      if (success) {
        mapping.successRate = (mapping.successRate * mapping.usageCount + 1) / (mapping.usageCount + 1)
      } else {
        mapping.successRate = (mapping.successRate * mapping.usageCount) / (mapping.usageCount + 1)
      }
      mapping.usageCount++
    }

    await this.saveMappingsToFile()
  }

  /**
   * 添加自定义指标映射
   */
  async addCustomMapping(mapping: {
    businessName: string
    sqlExpression: string
    description: string
    category: string
  }): Promise<void> {
    this.metricMappings.set(mapping.businessName, {
      ...mapping,
      confidence: 1.0, // 用户自定义的，置信度为1
      usageCount: 0,
      successRate: 1.0
    })

    await this.saveMappingsToFile()
  }

  /**
   * 获取学习分析报告
   */
  getAnalytics(): LearningAnalytics {
    if (this.learnings.length === 0) {
      return {
        totalQueries: 0,
        acceptanceRate: 0,
        correctionRate: 0,
        commonMistakes: [],
        improvedMappings: []
      }
    }

    const acceptedCount = this.learnings.filter(l => l.userFeedback === 'accepted').length
    const rejectedCount = this.learnings.filter(l => l.userFeedback === 'rejected').length
    const correctedCount = this.learnings.filter(l => l.correctedSQL).length

    // 分析常见错误模式
    const commonMistakes = this.analyzeCommonMistakes()

    // 识别改进的映射
    const improvedMappings = Array.from(this.metricMappings.values())
      .filter(m => m.usageCount >= 5 && m.successRate >= 0.8)
      .map(m => `${m.businessName}: ${m.description}`)

    return {
      totalQueries: this.learnings.length,
      acceptanceRate: acceptedCount / this.learnings.length,
      correctionRate: correctedCount / this.learnings.length,
      commonMistakes,
      improvedMappings
    }
  }

  /**
   * 分析常见错误模式
   */
  private analyzeCommonMistakes(): Array<{ pattern: string; count: number }> {
    const mistakes: Map<string, number> = new Map()

    for (const learning of this.learnings) {
      if (learning.userFeedback === 'rejected' || learning.correctedSQL) {
        // 提取错误模式
        const errorPattern = this.extractErrorPattern(learning.generatedSQL)
        const current = mistakes.get(errorPattern) || 0
        mistakes.set(errorPattern, current + 1)
      }
    }

    return Array.from(mistakes.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  /**
   * 提取错误模式
   */
  private extractErrorPattern(sql: string): string {
    // 简化版本：识别常见的SQL错误模式
    if (/SELECT\s+\*\s+FROM/.test(sql)) return '过度使用SELECT *'
    if (/WHERE\s+1\s*=\s*1/.test(sql)) return '冗余的WHERE条件'
    if (/JOIN\s+ON\s+1\s*=\s*1/.test(sql)) return '不正确的JOIN条件'
    if (/ORDER BY\s+RAND\(\)/.test(sql)) return '未优化的随机排序'

    return '其他错误'
  }

  /**
   * 生成学习建议
   */
  getLearningSuggestions(): string[] {
    const suggestions: string[] = []
    const analytics = this.getAnalytics()

    if (analytics.totalQueries < 10) {
      suggestions.push('💡 多使用查询功能，AI会逐渐学习您的业务语言')
    }

    if (analytics.correctionRate > 0.3) {
      suggestions.push('💡 检测到较高的纠正率，建议检查业务指标映射是否准确')
    }

    for (const mistake of analytics.commonMistakes) {
      if (mistake.count >= 3) {
        suggestions.push(`💡 常见错误："${mistake.pattern}"（出现${mistake.count}次），建议优化查询模式`)
      }
    }

    if (analytics.improvedMappings.length > 0) {
      suggestions.push('✅ 已学会的指标：' + analytics.improvedMappings.slice(0, 3).join(', '))
    }

    return suggestions
  }

  /**
   * 保存到文件
   */
  private async saveToFile(): Promise<void> {
    try {
      const learningDir = path.dirname(this.learningFilePath)
      await fs.mkdir(learningDir, { recursive: true })

      const line = JSON.stringify(this.learnings[this.learnings.length - 1])
      await fs.appendFile(this.learningFilePath, line + '\n')
    } catch (error) {
      console.error('Failed to save learning data:', error)
    }
  }

  /**
   * 保存映射到文件
   */
  private async saveMappingsToFile(): Promise<void> {
    try {
      const learningDir = path.dirname(this.mappingsFilePath)
      await fs.mkdir(learningDir, { recursive: true })

      const mappingsData = Array.from(this.metricMappings.entries())
      await fs.writeFile(this.mappingsFilePath, JSON.stringify(mappingsData, null, 2))
    } catch (error) {
      console.error('Failed to save mappings:', error)
    }
  }

  /**
   * 从文件加载
   */
  private async loadFromFile(): Promise<void> {
    try {
      // 加载查询学习历史
      try {
        const learningData = await fs.readFile(this.learningFilePath, 'utf-8')
        const lines = learningData.split('\n').filter(line => line.trim())
        this.learnings = lines.map(line => JSON.parse(line))
      } catch {
        // 文件不存在，忽略
      }

      // 加载指标映射
      try {
        const mappingsData = await fs.readFile(this.mappingsFilePath, 'utf-8')
        const mappings = JSON.parse(mappingsData)
        this.metricMappings = new Map(mappings)
      } catch {
        // 文件不存在，使用默认映射
        this.initializeDefaultMappings()
      }
    } catch (error) {
      console.error('Failed to load learning data:', error)
    }
  }

  /**
   * 初始化默认指标映射
   */
  private initializeDefaultMappings(): void {
    const defaults: Array<{ name: string; mapping: MetricMapping }> = [
      {
        name: '留存率',
        mapping: {
          businessName: '留存率',
          sqlExpression: 'COUNT(DISTINCT CASE WHEN last_active > NOW() - INTERVAL \'7 days\' THEN user_id END) / COUNT(DISTINCT user_id) * 100',
          description: '用户在7天后仍活跃的比例',
          category: 'retention',
          confidence: 0.7,
          usageCount: 0,
          successRate: 0.7
        }
      },
      {
        name: '转化率',
        mapping: {
          businessName: '转化率',
          sqlExpression: 'COUNT(DISTINCT CASE WHEN status = \'converted\' THEN user_id END) / COUNT(DISTINCT user_id) * 100',
          description: '用户完成目标行为的比例',
          category: 'conversion',
          confidence: 0.8,
          usageCount: 0,
          successRate: 0.8
        }
      },
      {
        name: 'DAU',
        mapping: {
          businessName: 'DAU',
          sqlExpression: 'COUNT(DISTINCT user_id) FILTER (WHERE DATE(last_active) = CURRENT_DATE)',
          description: '日活跃用户数',
          category: 'engagement',
          confidence: 0.9,
          usageCount: 0,
          successRate: 0.9
        }
      }
    ]

    for (const { name, mapping } of defaults) {
      this.metricMappings.set(name, mapping)
    }
  }

  /**
   * 导出学习数据（用于分析或迁移）
   */
  async exportLearningData(): Promise<string> {
    const analytics = this.getAnalytics()

    const report = {
      exportTime: new Date().toISOString(),
      analytics,
      queries: this.learnings.slice(-100), // 最近100条
      mappings: Array.from(this.metricMappings.entries())
    }

    return JSON.stringify(report, null, 2)
  }

  /**
   * 清除学习数据
   */
  async clearLearningData(): Promise<void> {
    this.learnings = []
    try {
      await fs.unlink(this.learningFilePath)
    } catch {
      // 文件不存在，忽略
    }
  }
}

export const businessLanguageLearning = new BusinessLanguageLearning()
