/**
 * 可信度评分引擎 V2
 * 多维度评分 + 可解释性
 */

export interface ConfidenceScore {
  overall: number           // 总分 0-100
  breakdown: {
    sql_validity: number    // SQL 合法性 0-100
    metric_match: number    // 指标匹配度 0-100
    data_completeness: number // 数据完整度 0-100
    query_complexity: number // 查询复杂度 0-100 (越简单分越高)
    fallback_usage: number  // AI 猜测程度 0-100 (不猜分高)
  }
  explain: string[]         // 可解释性说明
  level: 'high' | 'medium' | 'low'  // 可信度等级
}

export interface ConfidenceInput {
  sql: string
  metricUsed?: string
  tables: string[]
  rowCount: number
  joinCount: number
  subqueryCount: number
  hasFallback: boolean
  missingFields: string[]
  executionTime?: number
}

export class ConfidenceEngine {
  /**
   * 计算可信度分数
   */
  calculate(input: ConfidenceInput): ConfidenceScore {
    // 1. SQL 合法性 (权重 25%)
    const sql_validity = this.calculateSQLValidity(input.sql)

    // 2. 指标匹配度 (权重 25%)
    const metric_match = this.calculateMetricMatch(input.metricUsed)

    // 3. 数据完整度 (权重 20%)
    const data_completeness = this.calculateDataCompleteness(
      input.rowCount,
      input.missingFields
    )

    // 4. 查询复杂度 (权重 15%) - 越简单越好
    const query_complexity = this.calculateQueryComplexity(
      input.joinCount,
      input.subqueryCount
    )

    // 5. AI 猜测程度 (权重 15%) - 不猜分高
    const fallback_usage = this.calculateFallbackConfidence(input.hasFallback)

    // 加权计算总分
    const weights = {
      sql_validity: 0.25,
      metric_match: 0.25,
      data_completeness: 0.20,
      query_complexity: 0.15,
      fallback_usage: 0.15
    }

    const overall =
      sql_validity * weights.sql_validity +
      metric_match * weights.metric_match +
      data_completeness * weights.data_completeness +
      query_complexity * weights.query_complexity +
      fallback_usage * weights.fallback_usage

    // 生成解释说明
    const explain = this.generateExplain({
      sql_validity,
      metric_match,
      data_completeness,
      query_complexity,
      fallback_usage,
      metricUsed: input.metricUsed,
      joinCount: input.joinCount,
      subqueryCount: input.subqueryCount,
      rowCount: input.rowCount,
      tables: input.tables
    })

    // 计算可信度等级
    const level = this.calculateLevel(overall)

    return {
      overall: Math.round(overall),
      breakdown: {
        sql_validity,
        metric_match,
        data_completeness,
        query_complexity,
        fallback_usage
      },
      explain,
      level
    }
  }

  /**
   * 计算 SQL 合法性
   */
  private calculateSQLValidity(sql: string): number {
    let score = 100
    const upperSQL = sql.toUpperCase()

    // 检查危险操作 - 发现即0分
    const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE']
    for (const keyword of dangerousKeywords) {
      if (upperSQL.includes(keyword)) {
        return 0
      }
    }

    // 检查是否有 LIMIT (有LIMIT更安全)
    if (!upperSQL.includes('LIMIT')) {
      score -= 20
    }

    // 检查 WHERE 条件 (有WHERE更安全)
    if (!upperSQL.includes('WHERE')) {
      score -= 10
    }

    // 检查是否有 SELECT * (不推荐)
    if (upperSQL.includes('SELECT *')) {
      score -= 10
    }

    // 检查是否有 ORDER BY (有排序说明查询有目的)
    if (upperSQL.includes('ORDER BY')) {
      score += 5
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 计算指标匹配度
   */
  private calculateMetricMatch(metricUsed?: string): number {
    if (!metricUsed) {
      return 50  // 没有使用标准指标，中等分数
    }

    // 使用了标准指标，高分
    return 90
  }

  /**
   * 计算数据完整度
   */
  private calculateDataCompleteness(rowCount: number, missingFields: string[]): number {
    let score = 100

    // 行数检查
    if (rowCount === 0) {
      return 0
    } else if (rowCount < 10) {
      score = 40  // 数据太少
    } else if (rowCount < 100) {
      score = 70  // 数据较少
    } else if (rowCount > 10000) {
      score = 90  // 数据充足
    }

    // 缺失字段检查
    if (missingFields.length > 0) {
      score -= missingFields.length * 15
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 计算查询复杂度 (越简单分数越高)
   */
  private calculateQueryComplexity(joinCount: number, subqueryCount: number): number {
    let score = 100

    // JOIN 越多越复杂
    score -= joinCount * 15

    // 子查询越多越复杂
    score -= subqueryCount * 10

    // 聚合函数加分
    if (joinCount === 0 && subqueryCount === 0) {
      score = 100  // 单表查询最简单
    }

    return Math.max(0, score)
  }

  /**
   * 计算 AI 猜测可信度 (不猜分高)
   */
  private calculateFallbackConfidence(hasFallback: boolean): number {
    return hasFallback ? 50 : 95
  }

  /**
   * 生成解释说明
   */
  private generateExplain(scores: {
    sql_validity: number
    metric_match: number
    data_completeness: number
    query_complexity: number
    fallback_usage: number
    metricUsed?: string
    joinCount: number
    subqueryCount: number
    rowCount: number
    tables: string[]
  }): string[] {
    const explain: string[] = []

    // 指标匹配说明
    if (scores.metricUsed) {
      explain.push(`✅ 使用了标准指标 [${scores.metricUsed}]，语义明确`)
    } else {
      explain.push(`⚠️ 未使用标准指标，AI 进行了语义推断`)
    }

    // SQL 结构说明
    if (scores.query_complexity >= 85) {
      explain.push(`✅ SQL 结构简单（单表查询）`)
    } else if (scores.query_complexity >= 70) {
      explain.push(`⚠️ SQL 包含 ${scores.joinCount} 个 JOIN`)
    } else {
      explain.push(`⚠️ SQL 结构复杂（${scores.joinCount} JOIN + ${scores.subqueryCount} 子查询）`)
    }

    // 数据完整度说明
    if (scores.data_completeness >= 80) {
      explain.push(`✅ 数据充足（${scores.rowCount} 行）`)
    } else if (scores.data_completeness >= 50) {
      explain.push(`⚠️ 数据量较少（${scores.rowCount} 行）`)
    } else {
      explain.push(`❌ 数据不足（${scores.rowCount} 行）`)
    }

    // AI 猜测说明
    if (scores.fallback_usage >= 90) {
      explain.push(`✅ 基于已知定义生成，无猜测成分`)
    } else {
      explain.push(`⚠️ 包含 AI 猜测成分，建议验证结果`)
    }

    // 数据源说明
    if (scores.tables.length > 0) {
      explain.push(`📊 使用数据表: ${scores.tables.join(', ')}`)
    }

    return explain
  }

  /**
   * 计算可信度等级
   */
  private calculateLevel(overall: number): 'high' | 'medium' | 'low' {
    if (overall >= 80) return 'high'
    if (overall >= 60) return 'medium'
    return 'low'
  }

  /**
   * 格式化为显示文本
   */
  formatForDisplay(confidence: ConfidenceScore): {
    shortText: string
    detailText: string[]
    colorClass: string
  } {
    const levelText = {
      high: '高',
      medium: '中',
      low: '低'
    }

    const colorClass = {
      high: 'text-green-400',
      medium: 'text-yellow-400',
      low: 'text-red-400'
    }

    return {
      shortText: `${levelText[confidence.level]} (${confidence.overall}%)`,
      detailText: confidence.explain,
      colorClass: colorClass[confidence.level]
    }
  }

  /**
   * 从 SQL 中提取统计信息
   */
  extractSQLStats(sql: string): {
    joinCount: number
    subqueryCount: number
    tables: string[]
  } {
    const upperSQL = sql.toUpperCase()

    // 统计 JOIN 数量
    const joinCount = (upperSQL.match(/\bJOIN\b/g) || []).length

    // 统计子查询数量（简单方法：统计括号嵌套）
    const subqueryCount = (sql.match(/\(.*\SELECT.*\)/gis) || []).length

    // 提取表名
    const tables: string[] = []
    const fromRegex = /(?:FROM|JOIN)\s+(\w+)/gi
    let match

    while ((match = fromRegex.exec(sql)) !== null) {
      const tableName = match[1]
      // 排除 SQL 关键字
      if (!['WHERE', 'ORDER', 'GROUP', 'HAVING', 'LIMIT'].includes(tableName.toUpperCase())) {
        tables.push(tableName)
      }
    }

    return {
      joinCount,
      subqueryCount,
      tables: [...new Set(tables)]
    }
  }

  /**
   * 快速评估（用于预估）
   */
  quickAssess(sql: string, hasMetric: boolean): number {
    const stats = this.extractSQLStats(sql)

    return this.calculate({
      sql,
      metricUsed: hasMetric ? 'known' : undefined,
      tables: stats.tables,
      rowCount: 100,  // 估算
      joinCount: stats.joinCount,
      subqueryCount: stats.subqueryCount,
      hasFallback: !hasMetric,
      missingFields: []
    }).overall
  }
}

// 导出单例
export const confidenceEngine = new ConfidenceEngine()
