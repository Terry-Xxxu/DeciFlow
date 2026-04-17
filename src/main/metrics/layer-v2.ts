/**
 * 指标层 V2 - 可控语义指标系统
 * 解决指标误用问题，支持组合指标
 */

export type AggregationType = 'count' | 'sum' | 'avg' | 'rate' | 'custom'

export interface MetricV2 {
  // 基础信息
  id: string
  name: string
  description: string
  category: 'growth' | 'retention' | 'conversion' | 'revenue' | 'engagement' | 'custom'

  // SQL 定义
  table: string
  sql: string
  timeField: string

  // 🔥 可控语义约束
  allowedDimensions: string[]      // 允许的维度（白名单）
  defaultGroupBy?: string          // 默认分组
  aggregation: AggregationType     // 聚合类型
  filters?: string[]               // 默认过滤条件
  composable: boolean              // 是否可参与组合指标

  // 元数据
  unit?: string
  tags?: string[]
  owner?: string
  createdAt: Date
  updatedAt: Date
}

export interface CompositeMetric {
  id: string
  name: string
  description: string
  formula: string                  // 公式：如 "retained_users / new_users * 100"
  dependencies: string[]           // 依赖的基础指标ID
  unit?: string
  category: string
  createdAt: Date
  updatedAt: Date
}

export interface MetricConstraintCheck {
  isValid: boolean
  errors: string[]
  warnings: string[]
  appliedFilters: string[]         // 自动应用的过滤条件
  suggestedDimensions: string[]     // 建议使用的维度
}

export class MetricLayerV2 {
  private metrics: Map<string, MetricV2> = new Map()
  private compositeMetrics: Map<string, CompositeMetric> = new Map()

  constructor() {
    this.initializePredefinedMetrics()
  }

  /**
   * 初始化预定义指标
   */
  private initializePredefinedMetrics(): void {
    const predefinedMetrics: MetricV2[] = [
      {
        id: 'dau',
        name: '日活跃用户数',
        description: '每日活跃用户数（DAU）',
        category: 'growth',
        table: 'user_events',
        sql: 'COUNT(DISTINCT user_id)',
        timeField: 'event_date',
        allowedDimensions: ['date', 'platform', 'channel', 'country', 'user_type'],
        defaultGroupBy: 'date',
        aggregation: 'count',
        filters: ['user_id IS NOT NULL'],
        composable: true,
        unit: '人',
        tags: ['核心指标', '增长'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'new_users',
        name: '新增用户数',
        description: '每日新注册用户数',
        category: 'growth',
        table: 'users',
        sql: 'COUNT(user_id)',
        timeField: 'created_at',
        allowedDimensions: ['date', 'channel', 'platform', 'country', 'campaign'],
        defaultGroupBy: 'date',
        aggregation: 'count',
        filters: ['created_at IS NOT NULL'],
        composable: true,
        unit: '人',
        tags: ['核心指标', '增长'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'retained_users',
        name: '留存用户数',
        description: '指定日期后仍活跃的用户数',
        category: 'retention',
        table: 'user_retention',
        sql: 'COUNT(DISTINCT CASE WHEN dated_day >= 1 THEN user_id END)',
        timeField: 'install_date',
        allowedDimensions: ['date', 'cohort', 'channel'],
        defaultGroupBy: 'date',
        aggregation: 'count',
        filters: [],
        composable: true,
        unit: '人',
        tags: ['留存'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'retention_d1',
        name: '次日留存率',
        description: '用户注册后第二天的留存比例',
        category: 'retention',
        table: 'user_retention',
        sql: 'SUM(CASE WHEN dated_day = 1 THEN 1 ELSE 0 END) / COUNT(DISTINCT user_id) * 100',
        timeField: 'install_date',
        allowedDimensions: ['date', 'cohort', 'channel'],
        defaultGroupBy: 'date',
        aggregation: 'rate',
        filters: [],
        composable: false,
        unit: '%',
        tags: ['核心指标', '留存'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'conversion_rate',
        name: '转化率',
        description: '用户完成关键转化的比例',
        category: 'conversion',
        table: 'conversion_events',
        sql: 'COUNT(DISTINCT CASE WHEN event_type = "conversion" THEN user_id END) / COUNT(DISTINCT session_id) * 100',
        timeField: 'event_time',
        allowedDimensions: ['date', 'funnel_step', 'channel', 'source'],
        defaultGroupBy: 'date',
        aggregation: 'rate',
        filters: [],
        composable: false,
        unit: '%',
        tags: ['核心指标', '转化'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'revenue',
        name: '收入',
        description: '总收入（GMV）',
        category: 'revenue',
        table: 'orders',
        sql: 'SUM(amount)',
        timeField: 'created_at',
        allowedDimensions: ['date', 'payment_method', 'product_category', 'channel'],
        defaultGroupBy: 'date',
        aggregation: 'sum',
        filters: ['status = "completed"', 'amount > 0'],
        composable: true,
        unit: '元',
        tags: ['核心指标', '收入'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'arpu',
        name: '平均收入',
        description: '每用户平均收入',
        category: 'revenue',
        table: 'orders',
        sql: 'SUM(amount) / COUNT(DISTINCT user_id)',
        timeField: 'created_at',
        allowedDimensions: ['date', 'user_type', 'channel'],
        defaultGroupBy: 'date',
        aggregation: 'avg',
        filters: ['amount > 0'],
        composable: false,
        unit: '元',
        tags: ['收入'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'session_count',
        name: '会话数',
        description: '用户会话总数',
        category: 'engagement',
        table: 'sessions',
        sql: 'COUNT(session_id)',
        timeField: 'created_at',
        allowedDimensions: ['date', 'platform', 'channel'],
        defaultGroupBy: 'date',
        aggregation: 'count',
        filters: [],
        composable: true,
        unit: '次',
        tags: [' engagement'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'avg_session_duration',
        name: '平均会话时长',
        description: '用户平均会话持续时长',
        category: 'engagement',
        table: 'sessions',
        sql: 'AVG(duration_seconds)',
        timeField: 'created_at',
        allowedDimensions: ['date', 'platform', 'user_type'],
        defaultGroupBy: 'date',
        aggregation: 'avg',
        filters: ['duration_seconds > 0'],
        composable: false,
        unit: '秒',
        tags: ['engagement'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    predefinedMetrics.forEach(metric => {
      this.metrics.set(metric.id, metric)
    })

    // 初始化组合指标
    this.initializeCompositeMetrics()
  }

  /**
   * 初始化组合指标
   */
  private initializeCompositeMetrics(): void {
    const compositeMetrics: CompositeMetric[] = [
      {
        id: 'revenue_per_user',
        name: '人均收入',
        description: '总收入除以用户数',
        formula: 'revenue / dau',
        dependencies: ['revenue', 'dau'],
        unit: '元',
        category: 'revenue',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'conversion_efficiency',
        name: '转化效率',
        description: '每100次访问的转化数',
        formula: 'conversion_rate * session_count / 100',
        dependencies: ['conversion_rate', 'session_count'],
        unit: '',
        category: 'conversion',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    compositeMetrics.forEach(metric => {
      this.compositeMetrics.set(metric.id, metric)
    })
  }

  /**
   * 获取指标
   */
  getMetric(id: string): MetricV2 | undefined {
    return this.metrics.get(id)
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): MetricV2[] {
    return Array.from(this.metrics.values())
  }

  /**
   * 获取组合指标
   */
  getCompositeMetric(id: string): CompositeMetric | undefined {
    return this.compositeMetrics.get(id)
  }

  /**
   * 获取所有组合指标
   */
  getAllCompositeMetrics(): CompositeMetric[] {
    return Array.from(this.compositeMetrics.values())
  }

  /**
   * 添加指标
   */
  addMetric(metric: Omit<MetricV2, 'id' | 'createdAt' | 'updatedAt'>): MetricV2 {
    const newMetric: MetricV2 = {
      ...metric,
      id: `metric_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.metrics.set(newMetric.id, newMetric)
    return newMetric
  }

  /**
   * 添加组合指标
   */
  addCompositeMetric(metric: Omit<CompositeMetric, 'id' | 'createdAt' | 'updatedAt'>): CompositeMetric {
    // 验证依赖的基础指标存在
    for (const depId of metric.dependencies) {
      if (!this.metrics.has(depId)) {
        throw new Error(`依赖的基础指标 ${depId} 不存在`)
      }
    }

    const newMetric: CompositeMetric = {
      ...metric,
      id: `composite_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.compositeMetrics.set(newMetric.id, newMetric)
    return newMetric
  }

  /**
   * 检查指标使用约束
   */
  validateMetricUsage(
    metricId: string,
    requestedDimensions?: string[]
  ): MetricConstraintCheck {
    const metric = this.metrics.get(metricId)

    if (!metric) {
      // 检查是否是组合指标
      const composite = this.compositeMetrics.get(metricId)
      if (composite) {
        return {
          isValid: true,
          errors: [],
          warnings: ['这是组合指标，需要生成复合查询'],
          appliedFilters: [],
          suggestedDimensions: []
        }
      }

      return {
        isValid: false,
        errors: [`指标 ${metricId} 不存在`],
        warnings: [],
        appliedFilters: [],
        suggestedDimensions: []
      }
    }

    const errors: string[] = []
    const warnings: string[] = []

    // 检查维度是否在允许列表中
    if (requestedDimensions && requestedDimensions.length > 0) {
      const invalidDimensions = requestedDimensions.filter(
        d => !metric.allowedDimensions.includes(d)
      )

      if (invalidDimensions.length > 0) {
        errors.push(
          `指标 [${metric.name}] 不支持以下维度: ${invalidDimensions.join(', ')}`
        )
        errors.push(`允许的维度: ${metric.allowedDimensions.join(', ')}`)
      }
    }

    // 检查是否可组合
    if (!metric.composable) {
      warnings.push(`指标 [${metric.name}] 不可参与组合指标计算`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      appliedFilters: metric.filters || [],
      suggestedDimensions: metric.allowedDimensions
    }
  }

  /**
   * 生成带约束的 SQL
   */
  generateConstrainedSQL(
    metricId: string,
    dimensions?: string[],
    timeRange?: string,
    limit: number = 1000
  ): { sql: string; check: MetricConstraintCheck } {
    const metric = this.metrics.get(metricId)

    if (!metric) {
      return {
        sql: '',
        check: {
          isValid: false,
          errors: [`指标 ${metricId} 不存在`],
          warnings: [],
          appliedFilters: [],
          suggestedDimensions: []
        }
      }
    }

    const check = this.validateMetricUsage(metricId, dimensions)

    if (!check.isValid) {
      return { sql: '', check }
    }

    let sql = `SELECT\n`

    // 时间字段
    if (metric.defaultGroupBy) {
      sql += `  DATE(${metric.timeField}) as ${metric.defaultGroupBy},\n`
    }

    // 维度字段
    const validDimensions = dimensions && dimensions.length > 0
      ? dimensions.filter(d => metric.allowedDimensions.includes(d))
      : []

    if (validDimensions.length > 0) {
      validDimensions.forEach(dim => {
        sql += `  ${dim},\n`
      })
    }

    // 指标值
    sql += `  ${metric.sql} as ${metric.id}\n`
    sql += `FROM ${metric.table}\n`

    // WHERE 条件
    const whereConditions: string[] = []

    // 默认过滤条件
    if (metric.filters) {
      whereConditions.push(...metric.filters)
    }

    // 时间范围
    if (timeRange) {
      whereConditions.push(`${metric.timeField} >= ${timeRange}`)
    }

    if (whereConditions.length > 0) {
      sql += `WHERE ${whereConditions.join(' AND ')}\n`
    }

    // GROUP BY
    const groupByFields: string[] = []

    if (metric.defaultGroupBy) {
      groupByFields.push(`DATE(${metric.timeField})`)
    }

    if (validDimensions.length > 0) {
      groupByFields.push(...validDimensions)
    }

    if (groupByFields.length > 0) {
      sql += `GROUP BY ${groupByFields.join(', ')}\n`
    }

    sql += `ORDER BY ${metric.defaultGroupBy || metric.timeField} DESC\n`
    sql += `LIMIT ${limit}`

    return { sql, check }
  }

  /**
   * 解析并生成组合指标 SQL
   */
  generateCompositeMetricSQL(compositeMetricId: string): string {
    const composite = this.compositeMetrics.get(compositeMetricId)

    if (!composite) {
      throw new Error(`组合指标 ${compositeMetricId} 不存在`)
    }

    // 获取所有依赖的基础指标
    const dependentMetrics = composite.dependencies.map(depId => {
      const metric = this.metrics.get(depId)
      if (!metric) {
        throw new Error(`组合指标依赖的基础指标 ${depId} 不存在`)
      }
      return metric
    })

    // 生成子查询
    const subQueries = dependentMetrics.map(m => {
      const check = this.validateMetricUsage(m.id)
      const result = this.generateConstrainedSQL(m.id)

      return `  (\n    SELECT ${m.sql} as ${m.id}\n    FROM ${m.table}\n    ${m.filters && m.filters.length > 0 ? `WHERE ${m.filters.join(' AND ')}\n` : ''}\n  ) as ${m.id}`
    })

    let sql = `SELECT\n`

    // 解析公式并生成计算
    // 简化实现：直接使用公式
    sql += `  ${composite.formula} as ${compositeMetricId}\n`
    sql += `FROM\n`
    sql += subQueries.join(',\n')

    return sql
  }

  /**
   * 搜索指标
   */
  searchMetrics(keyword: string): MetricV2[] {
    const lowerKeyword = keyword.toLowerCase()
    return this.getAllMetrics().filter(m =>
      m.name.toLowerCase().includes(lowerKeyword) ||
      m.description.toLowerCase().includes(lowerKeyword) ||
      m.id.toLowerCase().includes(lowerKeyword)
    )
  }

  /**
   * 按分类获取指标
   */
  getMetricsByCategory(category: string): MetricV2[] {
    return this.getAllMetrics().filter(m => m.category === category)
  }

  /**
   * 更新指标
   */
  updateMetric(id: string, updates: Partial<MetricV2>): boolean {
    const metric = this.metrics.get(id)
    if (!metric) return false

    this.metrics.set(id, {
      ...metric,
      ...updates,
      updatedAt: new Date()
    })
    return true
  }

  /**
   * 删除指标
   */
  deleteMetric(id: string): boolean {
    // 检查是否有组合指标依赖
    for (const composite of this.compositeMetrics.values()) {
      if (composite.dependencies.includes(id)) {
        throw new Error(`无法删除指标 ${id}：组合指标 ${composite.name} 依赖它`)
      }
    }

    return this.metrics.delete(id)
  }
}

// 导出单例
export const metricLayerV2 = new MetricLayerV2()
