/**
 * 结果可信度系统
 * 显示数据来源和指标来源，增强结果可信度
 */

export interface DataSource {
  type: 'database' | 'api' | 'file'
  databaseType?: 'PostgreSQL' | 'MySQL' | 'MongoDB'
  host?: string
  database?: string
  tables?: string[]  // 涉及的表
  timestamp: Date
}

export interface MetricSource {
  metricId?: string  // 如果是通过指标查询的
  metricName?: string
  metricCategory?: string
  formula?: string  // 计算公式
  logic?: string   // 业务逻辑说明
}

export interface QuerySummary {
  executionTime: number  // 执行耗时（毫秒）
  rowCount: number      // 返回行数
  estimatedRisk: 'low' | 'medium' | 'high'  // 风险等级
  sqlPreview?: string  // SQL 预览（前100字符）
}

export interface DataFreshness {
  lastUpdated: Date   // 数据最后更新时间
  delay: number        // 距现在的时间差（秒）
  status: 'fresh' | 'stale' | 'unknown'  // 数据新鲜度状态
}

export interface ResultMetadata {
  dataSource: DataSource
  metricSource?: MetricSource
  querySummary: QuerySummary
  dataFreshness: DataFreshness
  confidence: number  // 可信度分数（0-100）
}

export class ResultMetadataService {
  /**
   * 生成结果元数据
   */
  generateMetadata(params: {
    sql: string
    executionTime: number
    rowCount: number
    dataSource?: DataSource
    metricSource?: MetricSource
  }): ResultMetadata {
    // 1. 数据来源
    const dataSource: DataSource = params.dataSource || {
      type: 'database',
      databaseType: 'PostgreSQL',
      timestamp: new Date(),
    }

    // 从 SQL 中提取表名
    const tables = this.extractTableNames(params.sql)
    if (tables.length > 0) {
      dataSource.tables = tables
    }

    // 2. 查询摘要
    const querySummary: QuerySummary = {
      executionTime: params.executionTime,
      rowCount: params.rowCount,
      estimatedRisk: this.estimateRisk(params.rowCount, params.executionTime),
      sqlPreview: params.sql.substring(0, 100) + (params.sql.length > 100 ? '...' : ''),
    }

    // 3. 数据新鲜度
    const dataFreshness: DataFreshness = {
      lastUpdated: new Date(),
      delay: 0,
      status: 'fresh',
    }

    // 4. 计算可信度
    const confidence = this.calculateConfidence({
      dataSource,
      querySummary,
      metricSource: params.metricSource,
      dataFreshness,
    })

    return {
      dataSource,
      metricSource: params.metricSource,
      querySummary,
      dataFreshness,
      confidence,
    }
  }

  /**
   * 从 SQL 中提取表名
   */
  private extractTableNames(sql: string): string[] {
    const tables: string[] = []
    const upperSQL = sql.toUpperCase()

    // 匹配 FROM 和 JOIN 后的表名
    const fromRegex = /(?:FROM|JOIN)\s+(\w+)/g
    let match
    while ((match = fromRegex.exec(upperSQL)) !== null) {
      const tableName = match[1]
      // 排除 SQL 关键字
      if (!['WHERE', 'ORDER', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET'].includes(tableName)) {
        tables.push(tableName)
      }
    }

    return [...new Set(tables)]  // 去重
  }

  /**
   * 估算风险等级
   */
  private estimateRisk(rowCount: number, executionTime: number): 'low' | 'medium' | 'high' {
    if (rowCount > 5000 || executionTime > 10000) return 'high'
    if (rowCount > 1000 || executionTime > 5000) return 'medium'
    return 'low'
  }

  /**
   * 计算可信度分数
   */
  private calculateConfidence(params: {
    dataSource: DataSource
    querySummary: QuerySummary
    metricSource?: MetricSource
    dataFreshness: DataFreshness
  }): number {
    let confidence = 100

    // 数据来源可信度
    if (params.dataSource.type === 'database') {
      confidence += 0  // 数据库直接查询，可信度最高
    } else {
      confidence -= 20  // 其他来源可信度较低
    }

    // 查询风险
    if (params.querySummary.estimatedRisk === 'high') {
      confidence -= 15
    } else if (params.querySummary.estimatedRisk === 'medium') {
      confidence -= 5
    }

    // 指标来源
    if (params.metricSource) {
      confidence += 10  // 有明确定义的指标，可信度更高
    }

    // 数据新鲜度
    if (params.dataFreshness.status === 'fresh') {
      confidence += 5
    } else if (params.dataFreshness.status === 'stale') {
      confidence -= 10
    }

    return Math.max(0, Math.min(100, confidence))
  }

  /**
   * 格式化元数据为显示文本
   */
  formatForDisplay(metadata: ResultMetadata): {
    labels: string[]
    details: string[]
  } {
    const labels: string[] = []
    const details: string[] = []

    // 数据来源
    if (metadata.dataSource.type === 'database') {
      labels.push(`📊 数据库：${metadata.dataSource.databaseType || 'Unknown'}`)
      details.push(`主机：${metadata.dataSource.host || 'localhost'}`)
      if (metadata.dataSource.tables && metadata.dataSource.tables.length > 0) {
        details.push(`表：${metadata.dataSource.tables.join(', ')}`)
      }
    }

    // 指标来源
    if (metadata.metricSource && metadata.metricSource.metricName) {
      labels.push(`📈 指标：${metadata.metricSource.metricName}`)
      if (metadata.metricSource.logic) {
        details.push(`计算逻辑：${metadata.metricSource.logic}`)
      }
    }

    // 查询摘要
    labels.push(`⚡ 执行时间：${metadata.querySummary.executionTime}ms`)
    labels.push(`📊 返回行数：${metadata.querySummary.rowCount}`)
    if (metadata.querySummary.estimatedRisk !== 'low') {
      labels.push(`⚠️ 风险等级：${metadata.querySummary.estimatedRisk.toUpperCase()}`)
    }

    // 可信度
    const confidenceLabel = metadata.confidence >= 80 ? '高' : metadata.confidence >= 60 ? '中' : '低'
    labels.push(`✅ 可信度：${confidenceLabel} (${metadata.confidence}%)`)

    return { labels, details }
  }
}

export const resultMetadataService = new ResultMetadataService()
