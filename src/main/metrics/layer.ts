/**
 * 指标层系统
 * 统一管理所有业务指标的定义和计算
 */

export interface MetricDefinition {
  id: string
  name: string
  description: string
  category: 'growth' | 'retention' | 'conversion' | 'revenue' | 'engagement'
  type: 'count' | 'rate' | 'sum' | 'average'

  // SQL 配置
  sqlTemplate: string  // SQL 模板，可以使用 {table}, {date_field} 等占位符
  tableName?: string
  dateField?: string

  // 维度配置
  dimensions?: string[]  // 可拆分的维度（如 channel、device、user_type）

  // 显示配置
  unit?: string  // 单位（人、%、元等）
  format?: 'number' | 'percentage' | 'currency' | 'duration'

  // 业务逻辑
  logic?: string  // 业务逻辑说明
  formula?: string  // 计算公式

  // 元数据
  tags?: string[]
  owner?: string  // 指标负责人
  createdAt: Date
  updatedAt: Date
}

export interface MetricValue {
  metricId: string
  value: number
  dimensions?: Record<string, string>  // 维度值（如 { channel: 'organic' }）
  timestamp: Date
}

export interface MetricQuery {
  metricId: string
  startDate: Date
  endDate: Date
  dimensions?: Record<string, string>  // 筛选条件
  granularity?: 'hour' | 'day' | 'week' | 'month'  // 时间粒度
}

/**
 * 预定义指标库
 */
export const PREDEFINED_METRICS: MetricDefinition[] = [
  // 用户增长类
  {
    id: 'dau',
    name: '日活跃用户数',
    description: '每天有登录行为的用户数量',
    category: 'growth',
    type: 'count',
    sqlTemplate: `SELECT DATE({date_field}) as date, COUNT(DISTINCT user_id) as value FROM {table} WHERE {date_field} >= '{start_date}' AND {date_field} < '{end_date}' GROUP BY DATE({date_field}) ORDER BY date`,
    tableName: 'user_activities',
    dateField: 'activity_date',
    dimensions: ['channel', 'platform', 'user_type'],
    unit: '人',
    format: 'number',
    logic: '统计每天至少有一次登录行为的唯一用户数',
    tags: ['核心指标', '日更'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'new_users',
    name: '新增用户数',
    description: '每天新注册的用户数量',
    category: 'growth',
    type: 'count',
    sqlTemplate: `SELECT DATE({date_field}) as date, COUNT(*) as value FROM {table} WHERE {date_field} >= '{start_date}' AND {date_field} < '{end_date}' GROUP BY DATE({date_field}) ORDER BY date`,
    tableName: 'users',
    dateField: 'created_at',
    dimensions: ['channel', 'campaign'],
    unit: '人',
    format: 'number',
    logic: '统计每天新注册的用户数，以注册时间为准',
    tags: ['核心指标', '日更'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 留存类
  {
    id: 'retention_d1',
    name: '次日留存率',
    description: '注册后第二天继续活跃的用户占比',
    category: 'retention',
    type: 'rate',
    sqlTemplate: `WITH retention AS ( SELECT COUNT(DISTINCT a.user_id) as cohort_users FROM {table} a WHERE a.{date_field} >= '{start_date}' AND a.{date_field} < '{end_date}' GROUP BY DATE(a.{date_field}) ), retained AS ( SELECT COUNT(DISTINCT r.user_id) as retained_users FROM {table} r INNER JOIN {table} r2 ON r.user_id = r2.user_id WHERE r2.{date_field} >= '{start_date}' AND r2.{date_field} < '{end_date}' GROUP BY DATE(r2.{date_field}) ) SELECT CAST(retained_users AS FLOAT) / NULLIF(cohort_users, 0) * 100 as value FROM retention, retained`,
    tableName: 'users',
    dateField: 'created_at',
    unit: '%',
    format: 'percentage',
    logic: '统计注册用户在第二天仍有活跃行为的比例',
    tags: ['核心指标', '日更'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 转化类
  {
    id: 'conversion_rate',
    name: '注册转化率',
    description: '访问到注册成功转化率',
    category: 'conversion',
    type: 'rate',
    sqlTemplate: `SELECT COUNT(DISTINCT CASE WHEN registered_at IS NOT NULL THEN visitor_id END) AS converted, COUNT(DISTINCT visitor_id) AS total, CAST(COUNT(DISTINCT CASE WHEN registered_at IS NOT NULL THEN visitor_id END) AS FLOAT) / COUNT(DISTINCT visitor_id) * 100 as value FROM {table} WHERE visit_date >= '{start_date}' AND visit_date < '{end_date}'`,
    tableName: 'visitors',
    dateField: 'visit_date',
    unit: '%',
    format: 'percentage',
    logic: '成功注册用户数 / 访问用户数 * 100%',
    tags: ['核心指标', '日更'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 收入类
  {
    id: 'revenue',
    name: '总收入',
    description: '一定时期内的订单总金额',
    category: 'revenue',
    type: 'sum',
    sqlTemplate: `SELECT DATE({date_field}) as date, SUM(amount) as value FROM {table} WHERE {date_field} >= '{start_date}' AND {date_field} < '{end_date}' AND status = 'completed' GROUP BY DATE({date_field}) ORDER BY date`,
    tableName: 'orders',
    dateField: 'created_at',
    dimensions: ['payment_method'],
    unit: '元',
    format: 'currency',
    logic: '统计状态为 completed 的订单金额总和',
    tags: ['核心指标', '日更'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

export class MetricLayerService {
  private metrics: Map<string, MetricDefinition> = new Map()

  constructor() {
    // 加载预定义指标
    PREDEFINED_METRICS.forEach(metric => {
      this.metrics.set(metric.id, metric)
    })
  }

  /**
   * 获取指标定义
   */
  getMetric(metricId: string): MetricDefinition | undefined {
    return this.metrics.get(metricId)
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): MetricDefinition[] {
    return Array.from(this.metrics.values())
  }

  /**
   * 按分类获取指标
   */
  getMetricsByCategory(category: MetricDefinition['category']): MetricDefinition[] {
    return this.getAllMetrics().filter(m => m.category === category)
  }

  /**
   * 添加自定义指标
   */
  addCustomMetric(metric: MetricDefinition): void {
    this.metrics.set(metric.id, { ...metric, createdAt: new Date(), updatedAt: new Date() })
  }

  /**
   * 更新指标
   */
  updateMetric(metricId: string, updates: Partial<MetricDefinition>): boolean {
    const metric = this.metrics.get(metricId)
    if (!metric) return false

    this.metrics.set(metricId, { ...metric, ...updates, updatedAt: new Date() })
    return true
  }

  /**
   * 删除指标
   */
  deleteMetric(metricId: string): boolean {
    return this.metrics.delete(metricId)
  }

  /**
   * 生成指标查询 SQL
   */
  generateMetricSQL(query: MetricQuery, tableName?: string): string {
    const metric = this.getMetric(query.metricId)
    if (!metric) {
      throw new Error(`指标不存在: ${query.metricId}`)
    }

    let sql = metric.sqlTemplate

    // 替换占位符
    const table = tableName || metric.tableName || 'table_name'
    const dateField = metric.dateField || 'created_at'

    sql = sql.replace(/{table}/g, table)
    sql = sql.replace(/{date_field}/g, dateField)

    // 格式化日期
    const startDate = this.formatDate(query.startDate)
    const endDate = this.formatDate(query.endDate)

    sql = sql.replace(/{start_date}/g, startDate)
    sql = sql.replace(/{end_date}/g, endDate)

    return sql
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  /**
   * 计算指标值
   */
  async calculateMetric(query: MetricQuery): Promise<MetricValue[]> {
    const metric = this.getMetric(query.metricId)
    if (!metric) {
      throw new Error(`指标不存在: ${query.metricId}`)
    }

    // 这里需要调用数据库查询
    // 实际实现中会通过 IPC 调用主进程的查询功能
    throw new Error('需要实现数据库查询')
  }

  /**
   * 验证指标定义
   */
  validateMetric(metric: MetricDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!metric.id) errors.push('指标 ID 不能为空')
    if (!metric.name) errors.push('指标名称不能为空')
    if (!metric.sqlTemplate) errors.push('SQL 模板不能为空')
    if (!['growth', 'retention', 'conversion', 'revenue', 'engagement'].includes(metric.category)) {
      errors.push('指标分类无效')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

// 导出单例
export const metricLayer = new MetricLayerService()
