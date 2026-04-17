/**
 * 自然语言转 SQL 服务
 * 使用 AI 将自然语言查询转换为 SQL 语句
 */

import { AIChatManager } from './adapter'
import { DatabaseType } from '../../shared/types'
import { metricLayer } from '../metrics/layer'
import { metricLayerV2 } from '../metrics/layer-v2'
import { schemaManager } from '../database/schema-manager'
import { confidenceEngine } from '../trust/confidence-engine'
import { auditLoggerV2 } from '../security/audit-log-v2'

export interface TableSchema {
  name: string
  columns: ColumnSchema[]
}

export interface ColumnSchema {
  name: string
  type: string
  description?: string
}

export interface SQLGenerationResult {
  sql: string
  explanation: string
  confidence: number
  metricUsed?: string  // 使用的指标
  dimensions?: string[]  // 使用的维度
}

export class NaturalLanguageQueryService {
  private aiManager: AIChatManager
  private schema: Map<string, TableSchema[]> = new Map()

  constructor(aiManager: AIChatManager) {
    this.aiManager = aiManager
  }

  /**
   * 设置数据库 schema
   */
  async setSchema(databaseType: DatabaseType, tables: TableSchema[]): Promise<void> {
    const key = databaseType.toString()
    this.schema.set(key, tables)
  }

  /**
   * 获取 schema 描述
   */
  private getSchemaDescription(databaseType: DatabaseType): string {
    const key = databaseType.toString()
    const tables = this.schema.get(key)

    if (!tables || tables.length === 0) {
      return '未获取到数据库表结构'
    }

    return tables.map(table => {
      const columns = table.columns.map(col =>
        `  - ${col.name} (${col.type})${col.description ? ': ' + col.description : ''}`
      ).join('\n')
      return `表名: ${table.name}\n${columns}`
    }).join('\n\n')
  }

  /**
   * 尝试从问题中识别指标
   */
  private identifyMetric(query: string): { metricId: string; metric: any } | null {
    const allMetrics = metricLayer.getAllMetrics()

    // 按名称匹配
    for (const metric of allMetrics) {
      if (query.includes(metric.name) || query.includes(metric.description || '')) {
        return { metricId: metric.id, metric }
      }
    }

    // 按关键词匹配
    const keywordMappings: Record<string, string[]> = {
      'dau': ['日活', 'DAU', '日活跃', '活跃用户'],
      'new_users': ['新增用户', '新用户', '注册用户'],
      'retention_d1': ['次日留存', '留存率', 'D1留存'],
      'conversion_rate': ['转化率', '转化'],
      'revenue': ['收入', '营收', 'GMV', '流水'],
    }

    for (const [metricId, keywords] of Object.entries(keywordMappings)) {
      if (keywords.some(kw => query.includes(kw))) {
        const metric = allMetrics.find(m => m.id === metricId)
        if (metric) {
          return { metricId, metric }
        }
      }
    }

    return null
  }

  /**
   * 提取维度信息
   */
  private extractDimensions(query: string, metric?: any): string[] {
    const dimensions: string[] = []

    // 从指标定义中提取维度
    if (metric?.dimensions) {
      for (const dim of metric.dimensions) {
        if (query.includes(dim.name) || query.includes(dim.field)) {
          dimensions.push(dim.name)
        }
      }
    }

    // 常见维度关键词
    const dimensionKeywords: Record<string, string[]> = {
      'date': ['日期', '按日', '每天', '日趋势'],
      'week': ['周', '按周', '每周'],
      'month': ['月', '按月', '每月'],
      'channel': ['渠道', '来源'],
      'platform': ['平台', 'iOS', 'Android'],
      'user_type': ['用户类型', '新老用户'],
    }

    for (const [dim, keywords] of Object.entries(dimensionKeywords)) {
      if (keywords.some((kw: string) => query.includes(kw))) {
        dimensions.push(dim)
      }
    }

    return [...new Set(dimensions)]
  }

  /**
   * 使用 Metric V2 生成 SQL（带约束检查）
   */
  private async generateSQLWithMetricV2(
    databaseType: DatabaseType,
    naturalLanguage: string,
    context: any,
    metricV2: any
  ): Promise<SQLGenerationResult> {
    // 1. 验证指标使用约束
    const dimensions = context?.dimensions || this.extractDimensions(naturalLanguage, metricV2)
    const constraintCheck = metricLayerV2.validateMetricUsage(metricV2.id, dimensions)

    // 2. 如果约束检查失败，返回错误而不是生成错误的 SQL
    if (!constraintCheck.isValid) {
      const errorMsg = constraintCheck.errors.length > 0
        ? constraintCheck.errors.join('; ')
        : '维度使用不符合约束'

      // 记录失败的尝试到审计日志
      auditLoggerV2.log({
        userQuery: naturalLanguage,
        generatedSQL: '',
        sqlModified: false,
        executionTime: 0,
        rowCount: 0,
        success: false,
        errorMessage: errorMsg,
        tablesUsed: [metricV2.table],
        metricUsed: metricV2.id,
        wasAnonymized: false,
      })

      throw new Error(`指标约束验证失败: ${errorMsg}`)
    }

    // 3. 生成带约束的 SQL
    const sqlResult = metricLayerV2.generateConstrainedSQL(
      metricV2.id,
      dimensions,
      context?.timeRange
    )

    // 4. 记录到审计日志
    auditLoggerV2.log({
      userQuery: naturalLanguage,
      generatedSQL: sqlResult.sql,
      sqlModified: false,
      executionTime: 0,
      rowCount: 0,
      success: true,
      tablesUsed: [metricV2.table],
      metricUsed: metricV2.id,
      wasAnonymized: false,
    })

    return {
      sql: sqlResult.sql,
      explanation: `使用指标 [${metricV2.name}] 生成，${sqlResult.check.warnings.join('; ')}`,
      confidence: 0.85, // 使用 Metric V2 约束的查询置信度较高
      metricUsed: metricV2.id,
      dimensions,
    }
  }

  /**
   * 自然语言转 SQL（增强版 - 带上下文）
   */
  async generateSQL(
    databaseType: DatabaseType,
    naturalLanguage: string,
    context?: {
      recentQueries?: string[]
      timeRange?: string
      metric?: string  // 指标 ID
      dimensions?: string[]  // 维度
      groupBy?: string  // 分组字段
      databaseConfig?: any  // 数据库配置，用于获取 schema
    }
  ): Promise<SQLGenerationResult> {
    // STEP 0: 优先检查 Metric V2（带约束的指标层）
    if (context?.metric) {
      const metricV2 = metricLayerV2.getMetric(context.metric)
      if (metricV2) {
        try {
          return await this.generateSQLWithMetricV2(databaseType, naturalLanguage, context, metricV2)
        } catch (error) {
          // 如果 Metric V2 生成失败，返回错误而不是回退到旧逻辑
          throw error
        }
      }
    }

    // STEP 1: 尝试识别指标（旧逻辑）
    const metricMatch = this.identifyMetric(naturalLanguage)
    const metric = context?.metric
      ? metricLayer.getMetric(context.metric)
      : metricMatch?.metric

    // 2. 提取维度
    const dimensions = context?.dimensions || this.extractDimensions(naturalLanguage, metric)

    // 3. 获取 schema 描述（如果有数据库配置，使用缓存的 schema）
    let schemaDesc = this.getSchemaDescription(databaseType)

    if (context?.databaseConfig) {
      try {
        const cachedSchema = schemaManager.getSchema(context.databaseConfig)
        if (cachedSchema) {
          schemaDesc = schemaManager.generateSchemaDescription(context.databaseConfig)
        }
      } catch (error) {
        // 如果获取缓存 schema 失败，使用默认的
        console.warn('获取缓存 schema 失败，使用默认 schema')
      }
    }

    // 4. 构建增强的 Prompt
    let prompt = `你是一个专业的 SQL 专家，请将用户的自然语言查询转换为 SQL 语句。

【数据库类型】
${databaseType}

【数据库表结构】
${schemaDesc}
`

    // 5. 添加指标上下文（关键增强）
    if (metric) {
      prompt += `
【指标定义】
指标名称: ${metric.name}
指标描述: ${metric.description || '无'}
数据表: ${metric.tableName || '未指定'}
计算公式: ${metric.sqlTemplate || '未指定'}
时间字段: ${metric.dateField || '未指定'}

⚠️ 重要: 请优先使用上述【指标定义】中的信息生成 SQL，而不是自己猜测字段名。
`

      if (metric.dimensions && metric.dimensions.length > 0) {
        prompt += `
可用维度:
${metric.dimensions.map((d: string) => `- ${d}`).join('\n')}
`
      }
    }

    // 6. 添加维度上下文
    if (dimensions.length > 0) {
      prompt += `
【分析维度】
${dimensions.join(', ')}
⚠️ 重要: 当前分析是按【${dimensions.join('、')}】维度进行拆分的，请在 SQL 中体现分组逻辑。
`
    }

    // 7. 添加分组上下文
    if (context?.groupBy) {
      prompt += `
【分组字段】
${context.groupBy}
⚠️ 重要: 必须在 SQL 中使用 GROUP BY ${context.groupBy}
`
    }

    // 8. 用户查询
    prompt += `
【用户查询】
${naturalLanguage}
`

    // 9. 时间范围
    if (context?.timeRange) {
      prompt += `
【时间范围】
${context.timeRange}
`
    }

    prompt += `
【要求】
1. 只输出 SQL 语句，不要有任何解释
2. 使用正确的语法和函数
3. 时间条件使用: PostgreSQL (DATE_SUB/NOW), MySQL (DATE_SUB/NOW)
4. 如果需要，添加 LIMIT 限制结果数量
5. 确保SQL可以正确执行
6. 如果有指标定义，必须使用指标定义中的表名和字段
7. 如果有维度，必须使用 GROUP BY 进行分组

请直接输出SQL语句：`

    try {
      const response = await this.aiManager.chat(prompt, {
        dataSource: databaseType,
        recentQueries: context?.recentQueries,
      })

      // 提取 SQL 语句
      let sql = response.content.trim()

      // 移除 markdown 代码块标记
      sql = sql.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim()

      // 提取说明部分
      const explanation = this.extractExplanation(sql, response.content)

      return {
        sql,
        explanation: explanation || 'SQL 生成成功',
        confidence: this.calculateConfidence(sql, naturalLanguage),
        metricUsed: metric?.id,
        dimensions: dimensions.length > 0 ? dimensions : undefined,
      }
    } catch (error) {
      throw new Error(`SQL 生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 提取说明部分
   */
  private extractExplanation(sql: string, fullContent: string): string {
    // 如果内容中包含说明，提取出来
    const lines = fullContent.split('\n')
    const explanationLines: string[] = []

    for (const line of lines) {
      if (line.includes('说明：') || line.includes('解释：') || line.includes('注意：')) {
        explanationLines.push(line)
      } else if (explanationLines.length > 0 && line.trim()) {
        explanationLines.push(line)
      } else if (explanationLines.length > 0 && !line.trim()) {
        break
      }
    }

    return explanationLines.join('\n').trim()
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(sql: string, query: string): number {
    // 基于简单的规则计算置信度
    let confidence = 0.5

    // 包含 SELECT
    if (sql.toUpperCase().includes('SELECT')) {
      confidence += 0.2
    }

    // 包含 FROM
    if (sql.toUpperCase().includes('FROM')) {
      confidence += 0.1
    }

    // 包含 WHERE
    if (sql.toUpperCase().includes('WHERE')) {
      confidence += 0.1
    }

    // 包含表名
    const tables = Array.from(this.schema.values()).flat()
    const hasTableName = tables.some(table => sql.includes(table.name))
    if (hasTableName) {
      confidence += 0.1
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * 优化 SQL
   */
  async optimizeSQL(sql: string, databaseType: DatabaseType): Promise<string> {
    const prompt = `请优化以下 SQL 语句，提高查询性能：

【数据库类型】
${databaseType}

【原始 SQL】
${sql}

【优化要求】
1. 添加适当的索引建议
2. 优化 JOIN 顺序
3. 避免 SELECT *
4. 添加必要的 LIMIT
5. 只输出优化后的 SQL，不要有解释

优化后的 SQL：`

    try {
      const response = await this.aiManager.chat(prompt)
      let optimizedSQL = response.content.trim()
      optimizedSQL = optimizedSQL.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim()
      return optimizedSQL
    } catch {
      return sql // 如果优化失败，返回原 SQL
    }
  }

  /**
   * 解释 SQL
   */
  async explainSQL(sql: string): Promise<string> {
    const prompt = `请用简洁的语言解释以下 SQL 语句的功能：

【SQL 语句】
${sql}

【解释要求】
1. 用通俗易懂的语言
2. 说明查询的目的
3. 列出关键的字段和条件
4. 控制在 100 字以内

解释：`

    try {
      const response = await this.aiManager.chat(prompt)
      return response.content.trim()
    } catch {
      return 'SQL 解释生成失败'
    }
  }
}
