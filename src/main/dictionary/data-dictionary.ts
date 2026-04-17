/**
 * 数据字典服务
 * 管理指标、字段含义、常用维度的定义
 */

export interface DictionaryMetric {
  id: string
  name: string
  description: string
  category: 'growth' | 'retention' | 'conversion' | 'revenue' | 'custom'
  table: string
  sql: string
  timeField: string
  dimensions: string[]
  unit?: string
  createdBy: 'system' | 'user'
  createdAt: Date
  updatedAt: Date
}

export interface DictionaryField {
  table: string
  column: string
  description: string
  dataType: string
  businessMeaning: string  // 业务含义
  sampleValues?: string[]
  tags?: string[]
  createdBy: 'system' | 'user'
  createdAt: Date
  updatedAt: Date
}

export interface DictionaryDimension {
  id: string
  name: string
  field: string
  table: string
  description: string
  values?: Array<{
    key: string
    label: string
    description?: string
  }>
  createdBy: 'system' | 'user'
  createdAt: Date
}

export interface DataDictionary {
  metrics: DictionaryMetric[]
  fields: DictionaryField[]
  dimensions: DictionaryDimension[]
}

export class DataDictionaryService {
  private dictionary: DataDictionary = {
    metrics: [],
    fields: [],
    dimensions: [],
  }

  /**
   * 初始化默认数据字典
   */
  initialize(): void {
    // 默认指标
    this.dictionary.metrics = [
      {
        id: 'dau',
        name: '日活跃用户数',
        description: '每日活跃用户数（DAU）',
        category: 'growth',
        table: 'user_events',
        sql: 'COUNT(DISTINCT user_id)',
        timeField: 'event_date',
        dimensions: ['date', 'platform', 'channel'],
        unit: '人',
        createdBy: 'system',
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
        dimensions: ['date', 'channel', 'platform'],
        unit: '人',
        createdBy: 'system',
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
        dimensions: ['date', 'cohort'],
        unit: '%',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'conversion_rate',
        name: '转化率',
        description: '用户完成关键转化的比例',
        category: 'conversion',
        table: 'conversion_events',
        sql: 'COUNT(DISTINCT user_id) / COUNT(DISTINCT session_id) * 100',
        timeField: 'event_time',
        dimensions: ['date', 'funnel_step'],
        unit: '%',
        createdBy: 'system',
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
        dimensions: ['date', 'payment_method'],
        unit: '元',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    // 默认字段含义
    this.dictionary.fields = [
      {
        table: 'users',
        column: 'user_id',
        description: '用户唯一标识符',
        dataType: 'bigint',
        businessMeaning: '用户的唯一ID，用于关联所有用户相关数据',
        tags: ['主键', '核心字段'],
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        table: 'users',
        column: 'created_at',
        description: '注册时间',
        dataType: 'timestamp',
        businessMeaning: '用户首次注册并创建账号的时间',
        tags: ['时间字段', '核心字段'],
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        table: 'users',
        column: 'channel',
        description: '获客渠道',
        dataType: 'varchar',
        businessMeaning: '用户来源渠道，如自然流量、广告、推荐等',
        sampleValues: ['organic', 'google_ads', 'facebook', 'referral'],
        tags: ['维度字段'],
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        table: 'user_events',
        column: 'event_date',
        description: '事件日期',
        dataType: 'date',
        businessMeaning: '用户行为发生的日期（不含时间）',
        tags: ['时间字段', '分区字段'],
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        table: 'orders',
        column: 'amount',
        description: '订单金额',
        dataType: 'decimal',
        businessMeaning: '订单总金额，单位为元',
        tags: ['金额字段', '核心字段'],
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    // 默认维度
    this.dictionary.dimensions = [
      {
        id: 'dim_date',
        name: '日期',
        field: 'event_date',
        table: 'user_events',
        description: '按日期分组分析',
        createdBy: 'system',
        createdAt: new Date(),
      },
      {
        id: 'dim_platform',
        name: '平台',
        field: 'platform',
        table: 'users',
        description: '按平台分组（iOS/Android/Web）',
        values: [
          { key: 'iOS', label: 'iOS', description: '苹果iOS设备' },
          { key: 'Android', label: 'Android', description: '安卓设备' },
          { key: 'Web', label: 'Web', description: '网页浏览器' },
        ],
        createdBy: 'system',
        createdAt: new Date(),
      },
      {
        id: 'dim_channel',
        name: '渠道',
        field: 'channel',
        table: 'users',
        description: '按获客渠道分组',
        values: [
          { key: 'organic', label: '自然流量', description: '自然搜索、直接访问' },
          { key: 'paid', label: '付费流量', description: '广告投放' },
          { key: 'referral', label: '推荐', description: '用户推荐' },
        ],
        createdBy: 'system',
        createdAt: new Date(),
      },
      {
        id: 'dim_user_type',
        name: '用户类型',
        field: 'user_type',
        table: 'users',
        description: '按用户类型分组（新用户/老用户）',
        values: [
          { key: 'new', label: '新用户', description: '注册7天内' },
          { key: 'active', label: '活跃老用户', description: '注册超过7天且近期活跃' },
          { key: 'churned', label: '流失用户', description: '注册超过7天但近期不活跃' },
        ],
        createdBy: 'system',
        createdAt: new Date(),
      },
    ]
  }

  // ========== 指标管理 ==========

  getAllMetrics(): DictionaryMetric[] {
    return this.dictionary.metrics
  }

  getMetric(id: string): DictionaryMetric | undefined {
    return this.dictionary.metrics.find(m => m.id === id)
  }

  searchMetrics(keyword: string): DictionaryMetric[] {
    const lowerKeyword = keyword.toLowerCase()
    return this.dictionary.metrics.filter(m =>
      m.name.toLowerCase().includes(lowerKeyword) ||
      m.description.toLowerCase().includes(lowerKeyword)
    )
  }

  addMetric(metric: Omit<DictionaryMetric, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>): DictionaryMetric {
    const newMetric: DictionaryMetric = {
      ...metric,
      id: `metric_${Date.now()}`,
      createdBy: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.dictionary.metrics.push(newMetric)
    return newMetric
  }

  updateMetric(id: string, updates: Partial<DictionaryMetric>): boolean {
    const index = this.dictionary.metrics.findIndex(m => m.id === id)
    if (index === -1) return false

    this.dictionary.metrics[index] = {
      ...this.dictionary.metrics[index],
      ...updates,
      updatedAt: new Date(),
    }
    return true
  }

  deleteMetric(id: string): boolean {
    const index = this.dictionary.metrics.findIndex(m => m.id === id)
    if (index === -1) return false

    this.dictionary.metrics.splice(index, 1)
    return true
  }

  // ========== 字段管理 ==========

  getAllFields(): DictionaryField[] {
    return this.dictionary.fields
  }

  getFields(table: string): DictionaryField[] {
    return this.dictionary.fields.filter(f => f.table === table)
  }

  getField(table: string, column: string): DictionaryField | undefined {
    return this.dictionary.fields.find(f => f.table === table && f.column === column)
  }

  updateField(table: string, column: string, updates: Partial<DictionaryField>): boolean {
    const index = this.dictionary.fields.findIndex(f => f.table === table && f.column === column)
    if (index === -1) {
      // 如果不存在，创建新的
      const newField: DictionaryField = {
        table,
        column,
        description: updates.description || '',
        dataType: updates.dataType || 'unknown',
        businessMeaning: updates.businessMeaning || '',
        tags: updates.tags,
        sampleValues: updates.sampleValues,
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      this.dictionary.fields.push(newField)
      return true
    }

    this.dictionary.fields[index] = {
      ...this.dictionary.fields[index],
      ...updates,
      updatedAt: new Date(),
    }
    return true
  }

  searchFields(keyword: string): DictionaryField[] {
    const lowerKeyword = keyword.toLowerCase()
    return this.dictionary.fields.filter(f =>
      f.column.toLowerCase().includes(lowerKeyword) ||
      f.description.toLowerCase().includes(lowerKeyword) ||
      f.businessMeaning.toLowerCase().includes(lowerKeyword)
    )
  }

  // ========== 维度管理 ==========

  getAllDimensions(): DictionaryDimension[] {
    return this.dictionary.dimensions
  }

  getDimension(id: string): DictionaryDimension | undefined {
    return this.dictionary.dimensions.find(d => d.id === id)
  }

  searchDimensions(keyword: string): DictionaryDimension[] {
    const lowerKeyword = keyword.toLowerCase()
    return this.dictionary.dimensions.filter(d =>
      d.name.toLowerCase().includes(lowerKeyword) ||
      d.description.toLowerCase().includes(lowerKeyword)
    )
  }

  addDimension(dimension: Omit<DictionaryDimension, 'id' | 'createdBy' | 'createdAt'>): DictionaryDimension {
    const newDimension: DictionaryDimension = {
      ...dimension,
      id: `dim_${Date.now()}`,
      createdBy: 'user',
      createdAt: new Date(),
    }
    this.dictionary.dimensions.push(newDimension)
    return newDimension
  }

  // ========== 导出/导入 ==========

  export(): DataDictionary {
    return JSON.parse(JSON.stringify(this.dictionary))
  }

  import(data: Partial<DataDictionary>): void {
    if (data.metrics) {
      this.dictionary.metrics = [...this.dictionary.metrics, ...data.metrics]
    }
    if (data.fields) {
      this.dictionary.fields = [...this.dictionary.fields, ...data.fields]
    }
    if (data.dimensions) {
      this.dictionary.dimensions = [...this.dictionary.dimensions, ...data.dimensions]
    }
  }

  /**
   * 生成 AI Prompt 所需的字典描述
   */
  generateAIDescription(): string {
    let desc = '【数据字典】\n\n'

    // 指标
    desc += '【可用指标】\n'
    for (const metric of this.dictionary.metrics) {
      desc += `- ${metric.name}: ${metric.description}\n`
      desc += `  计算: ${metric.sql} FROM ${metric.table}\n`
    }

    // 常用维度
    desc += '\n【常用维度】\n'
    for (const dimension of this.dictionary.dimensions) {
      desc += `- ${dimension.name}: ${dimension.description}\n`
      if (dimension.values) {
        desc += `  可选值: ${dimension.values.map(v => v.key).join(', ')}\n`
      }
    }

    return desc
  }
}

export const dataDictionary = new DataDictionaryService()
dataDictionary.initialize()
