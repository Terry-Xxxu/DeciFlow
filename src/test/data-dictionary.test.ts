/**
 * DeciFlow 数据字典功能测试
 * 测试指标、字段、维度的管理、智能推荐和团队协作功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DataDictionaryService, DictionaryMetric, DictionaryField, DictionaryDimension } from '../main/dictionary/data-dictionary'

// 模拟数据存储
class MockDataStore {
  private metrics: DictionaryMetric[] = []
  private fields: DictionaryField[] = []
  private dimensions: DictionaryDimension[] = []

  async saveMetrics(metrics: DictionaryMetric[]): Promise<void> {
    this.metrics = metrics
  }

  async saveFields(fields: DictionaryField[]): Promise<void> {
    this.fields = fields
  }

  async saveDimensions(dimensions: DictionaryDimension[]): Promise<void> {
    this.dimensions = dimensions
  }

  async getMetrics(): Promise<DictionaryMetric[]> {
    return this.metrics
  }

  async getFields(): Promise<DictionaryField[]> {
    return this.fields
  }

  async getDimensions(): Promise<DictionaryDimension[]> {
    return this.dimensions
  }

  async search(query: string): Promise<{ metrics: DictionaryMetric[], fields: DictionaryField[], dimensions: DictionaryDimension[] }> {
    const lowerQuery = query.toLowerCase()

    const matchedMetrics = this.metrics.filter(m =>
      m.name.toLowerCase().includes(lowerQuery) ||
      m.description.toLowerCase().includes(lowerQuery)
    )

    const matchedFields = this.fields.filter(f =>
      f.column.toLowerCase().includes(lowerQuery) ||
      f.description.toLowerCase().includes(lowerQuery) ||
      f.businessMeaning.toLowerCase().includes(lowerQuery)
    )

    const matchedDimensions = this.dimensions.filter(d =>
      d.name.toLowerCase().includes(lowerQuery) ||
      d.description.toLowerCase().includes(lowerQuery)
    )

    return { metrics: matchedMetrics, fields: matchedFields, dimensions: matchedDimensions }
  }
}

describe('DeciFlow 数据字典功能测试', () => {
  let dictionaryService: DataDictionaryService
  let mockStore: MockDataStore

  beforeEach(() => {
    mockStore = new MockDataStore()
    dictionaryService = new DataDictionaryService() as any
    ;(dictionaryService as any).store = mockStore
  })

  afterEach(() => {
    // 清理数据
  })

  describe('指标管理', () => {
    it('应该能够添加新的指标', async () => {
      const newMetric: DictionaryMetric = {
        id: 'conversion_rate',
        name: '转化率',
        description: '用户行为转化率',
        category: 'conversion',
        table: 'user_events',
        sql: 'COUNT(CASE WHEN event_type = \'conversion\' THEN 1 END) / COUNT(*)',
        timeField: 'event_date',
        dimensions: ['date', 'funnel_step'],
        unit: '%',
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await (dictionaryService as any).addMetric(newMetric)
      const metrics = await mockStore.getMetrics()

      expect(metrics).toHaveLength(1)
      expect(metrics[0].id).toBe('conversion_rate')
      expect(metrics[0].name).toBe('转化率')
    })

    it('应该能够更新指标定义', async () => {
      const existingMetric: DictionaryMetric = {
        id: 'dau',
        name: '日活跃用户数',
        description: '每日活跃用户数',
        category: 'growth',
        table: 'user_events',
        sql: 'COUNT(DISTINCT user_id)',
        timeField: 'event_date',
        dimensions: ['date'],
        unit: '人',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await mockStore.saveMetrics([existingMetric])

      const updatedMetric = {
        ...existingMetric,
        description: '每日活跃用户数（包括新用户和老用户）',
        dimensions: ['date', 'platform']
      }

      await (dictionaryService as any).updateMetric(updatedMetric)
      const metrics = await mockStore.getMetrics()

      expect(metrics[0].description).toBe('每日活跃用户数（包括新用户和老用户）')
      expect(metrics[0].dimensions).toContain('platform')
    })

    it('应该能够删除指标', async () => {
      const metrics: DictionaryMetric[] = [
        {
          id: 'dau',
          name: '日活跃用户数',
          description: '每日活跃用户数',
          category: 'growth',
          table: 'user_events',
          sql: 'COUNT(DISTINCT user_id)',
          timeField: 'event_date',
          dimensions: ['date'],
          unit: '人',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'new_users',
          name: '新增用户数',
          description: '每日新增用户数',
          category: 'growth',
          table: 'users',
          sql: 'COUNT(user_id)',
          timeField: 'created_at',
          dimensions: ['date'],
          unit: '人',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      await mockStore.saveMetrics(metrics)

      await (dictionaryService as any).deleteMetric('dau')
      const remainingMetrics = await mockStore.getMetrics()

      expect(remainingMetrics).toHaveLength(1)
      expect(remainingMetrics[0].id).toBe('new_users')
    })
  })

  describe('字段管理', () => {
    it('应该能够添加字段定义', async () => {
      const newField: DictionaryField = {
        table: 'users',
        column: 'age',
        description: '用户年龄',
        dataType: 'integer',
        businessMeaning: '用户年龄，用于年龄分群分析',
        sampleValues: ['18', '25', '30', '35'],
        tags: ['用户属性', '基础信息'],
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await (dictionaryService as any).addField(newField)
      const fields = await mockStore.getFields()

      expect(fields).toHaveLength(1)
      expect(fields[0].table).toBe('users')
      expect(fields[0].column).toBe('age')
      expect(fields[0].businessMeaning).toBe('用户年龄，用于年龄分群分析')
    })

    it('应该能够管理字段标签', async () => {
      const field: DictionaryField = {
        table: 'orders',
        column: 'total_amount',
        description: '订单总金额',
        dataType: 'decimal',
        businessMeaning: '订单包含所有商品的总价',
        tags: ['金额', '订单', '收入'],
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await mockStore.saveFields([field])

      // 添加新标签
      await (dictionaryService as any).addFieldTag('orders', 'total_amount', '财务指标')
      const fields = await mockStore.getFields()

      expect(fields[0].tags).toContain('财务指标')
      expect(fields[0].tags).toHaveLength(4)
    })

    it('应该能够批量导入字段', async () => {
      const fields: DictionaryField[] = [
        {
          table: 'products',
          column: 'category',
          description: '商品分类',
          dataType: 'varchar',
          businessMeaning: '商品的所属分类',
          tags: ['商品信息'],
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          table: 'products',
          column: 'price',
          description: '商品价格',
          dataType: 'decimal',
          businessMeaning: '商品的销售价格',
          tags: ['商品信息', '价格'],
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      await (dictionaryService as any).bulkAddFields(fields)
      const savedFields = await mockStore.getFields()

      expect(savedFields).toHaveLength(2)
      expect(savedFields[0].table).toBe('products')
      expect(savedFields[1].column).toBe('price')
    })
  })

  describe('维度管理', () => {
    it('应该能够创建维度', async () => {
      const newDimension: DictionaryDimension = {
        id: 'platform',
        name: '平台',
        field: 'platform',
        table: 'users',
        description: '用户使用的平台类型',
        values: [
          { key: 'ios', label: 'iOS', description: '苹果iOS系统' },
          { key: 'android', label: 'Android', description: '安卓系统' },
          { key: 'web', label: '网页端', description: '浏览器访问' }
        ],
        createdBy: 'user',
        createdAt: new Date()
      }

      await (dictionaryService as any).addDimension(newDimension)
      const dimensions = await mockStore.getDimensions()

      expect(dimensions).toHaveLength(1)
      expect(dimensions[0].id).toBe('platform')
      expect(dimensions[0].values).toHaveLength(3)
    })

    it('应该能够管理维度值', async () => {
      const dimension: DictionaryDimension = {
        id: 'channel',
        name: '渠道',
        field: 'channel',
        table: 'users',
        description: '用户来源渠道',
        values: [
          { key: 'organic', label: '自然流量', description: '用户主动搜索' },
          { key: 'paid', label: '付费广告', description: '付费推广渠道' }
        ],
        createdBy: 'user',
        createdAt: new Date()
      }

      await mockStore.saveDimensions([dimension])

      // 添加新的维度值
      await (dictionaryService as any).addDimensionValue('channel', {
        key: 'social',
        label: '社交媒体',
        description: '社交平台引流'
      })

      const dimensions = await mockStore.getDimensions()
      expect(dimensions[0].values).toHaveLength(3)
      expect(dimensions[0].values[2].key).toBe('social')
    })
  })

  describe('智能搜索', () => {
    it('应该能够根据关键词搜索', async () => {
      const metrics: DictionaryMetric[] = [
        {
          id: 'dau',
          name: '日活跃用户数',
          description: '每日活跃用户数',
          category: 'growth',
          table: 'user_events',
          sql: 'COUNT(DISTINCT user_id)',
          timeField: 'event_date',
          dimensions: ['date'],
          unit: '人',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const fields: DictionaryField[] = [
        {
          table: 'users',
          column: 'age',
          description: '用户年龄',
          dataType: 'integer',
          businessMeaning: '用户年龄',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const dimensions: DictionaryDimension[] = [
        {
          id: 'platform',
          name: '平台',
          field: 'platform',
          table: 'users',
          description: '用户使用的平台',
          createdBy: 'system',
          createdAt: new Date()
        }
      ]

      await mockStore.saveMetrics(metrics)
      await mockStore.saveFields(fields)
      await mockStore.saveDimensions(dimensions)

      const results = await (dictionaryService as any).search('用户')

      expect(results.metrics).toHaveLength(1)
      expect(results.fields).toHaveLength(1)
      expect(results.dimensions).toHaveLength(1)
    })

    it('应该支持模糊搜索', async () => {
      const metrics = [
        {
          id: 'dau',
          name: '日活跃用户数',
          description: '每日活跃用户数',
          category: 'growth',
          table: 'user_events',
          sql: 'COUNT(DISTINCT user_id)',
          timeField: 'event_date',
          dimensions: ['date'],
          unit: '人',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      await mockStore.saveMetrics(metrics)

      const results = await (dictionaryService as any).search('日活')

      expect(results.metrics).toHaveLength(1)
      expect(results.metrics[0].name).toBe('日活跃用户数')
    })
  })

  describe('智能推荐', () => {
    it('应该能够推荐相关指标', async () => {
      const existingMetrics = [
        {
          id: 'dau',
          name: '日活跃用户数',
          description: '每日活跃用户数',
          category: 'growth',
          table: 'user_events',
          sql: 'COUNT(DISTINCT user_id)',
          timeField: 'event_date',
          dimensions: ['date'],
          unit: '人',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'new_users',
          name: '新增用户数',
          description: '每日新增用户数',
          category: 'growth',
          table: 'users',
          sql: 'COUNT(user_id)',
          timeField: 'created_at',
          dimensions: ['date'],
          unit: '人',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      await mockStore.saveMetrics(existingMetrics)

      const recommendations = await (dictionaryService as any).getRecommendations('dau')

      expect(recommendations).toBeDefined()
      expect(Array.isArray(recommendations)).toBe(true)
    })

    it('应该能够基于查询历史推荐', async () => {
      const queryHistory = [
        { query: '日活用户', timestamp: new Date() },
        { query: '新增用户', timestamp: new Date() }
      ]

      const recommendations = await (dictionaryService as any).getRecommendationsFromHistory(queryHistory)

      expect(recommendations).toBeDefined()
      expect(recommendations.length).toBeGreaterThan(0)
    })
  })

  describe('团队协作', () => {
    it('应该能够显示字段修改历史', async () => {
      const field: DictionaryField = {
        table: 'orders',
        column: 'status',
        description: '订单状态',
        dataType: 'varchar',
        businessMeaning: '订单的处理状态',
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await mockStore.saveFields([field])

      // 模拟修改历史
      const history = await (dictionaryService as any).getFieldHistory('orders', 'status')

      expect(history).toBeDefined()
      expect(Array.isArray(history)).toBe(true)
    })

    it('应该能够显示谁最后修改', async () => {
      const field: DictionaryField = {
        table: 'users',
        column: 'email',
        description: '用户邮箱',
        dataType: 'varchar',
        businessMeaning: '用户的邮箱地址',
        createdBy: 'terry',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      }

      await mockStore.saveFields([field])

      const lastModified = await (dictionaryService as any).getLastModified('users', 'email')

      expect(lastModified).toBe('terry')
    })

    it('应该支持协作用户权限管理', async () => {
      const permissions = {
        canEdit: ['terry', 'admin'],
        canView: ['all'],
        canDelete: ['admin']
      }

      await (dictionaryService as any).setPermissions('dau', permissions)

      const userPermissions = await (dictionaryService as any).getUserPermissions('dau', 'terry')

      expect(userPermissions.canEdit).toBe(true)
      expect(userPermissions.canView).toBe(true)
      expect(userPermissions.canDelete).toBe(false)
    })
  })

  describe('数据导入导出', () => {
    it('应该能够导出字典配置', async () => {
      const metrics = [
        {
          id: 'dau',
          name: '日活跃用户数',
          description: '每日活跃用户数',
          category: 'growth',
          table: 'user_events',
          sql: 'COUNT(DISTINCT user_id)',
          timeField: 'event_date',
          dimensions: ['date'],
          unit: '人',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      await mockStore.saveMetrics(metrics)

      const exportData = await (dictionaryService as any).exportDictionary()

      expect(exportData).toBeDefined()
      expect(exportData.metrics).toHaveLength(1)
      expect(exportData.version).toBeDefined()
    })

    it('应该能够导入字典配置', async () => {
      const importData = {
        version: '1.0',
        metrics: [
          {
            id: 'mau',
            name: '月活跃用户数',
            description: '每月活跃用户数',
            category: 'growth',
            table: 'user_events',
            sql: 'COUNT(DISTINCT user_id)',
            timeField: 'event_date',
            dimensions: ['date', 'month'],
            unit: '人',
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        fields: [],
        dimensions: []
      }

      await (dictionaryService as any).importDictionary(importData)
      const metrics = await mockStore.getMetrics()

      expect(metrics).toHaveLength(1)
      expect(metrics[0].id).toBe('mau')
    })
  })

  describe('数据一致性检查', () => {
    it('应该能够检查指标与字段的关联性', async () => {
      const metrics = [
        {
          id: 'dau',
          name: '日活跃用户数',
          description: '每日活跃用户数',
          category: 'growth',
          table: 'user_events',
          sql: 'COUNT(DISTINCT user_id)',
          timeField: 'event_date',
          dimensions: ['date'],
          unit: '人',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const fields = [
        {
          table: 'user_events',
          column: 'user_id',
          description: '用户ID',
          dataType: 'integer',
          businessMeaning: '用户的唯一标识',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      await mockStore.saveMetrics(metrics)
      await mockStore.saveFields(fields)

      const consistency = await (dictionaryService as any).checkConsistency()

      expect(consistency.isValid).toBe(true)
      expect(consistency.issues).toHaveLength(0)
    })

    it('应该能够检测重复定义', async () => {
      const duplicateMetrics = [
        {
          id: 'dau',
          name: '日活跃用户数',
          description: '每日活跃用户数',
          category: 'growth',
          table: 'user_events',
          sql: 'COUNT(DISTINCT user_id)',
          timeField: 'event_date',
          dimensions: ['date'],
          unit: '人',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'dau', // 重复ID
          name: '日活跃用户数（重复）',
          description: '重复的指标定义',
          category: 'growth',
          table: 'user_events',
          sql: 'COUNT(DISTINCT user_id)',
          timeField: 'event_date',
          dimensions: ['date'],
          unit: '人',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      await mockStore.saveMetrics(duplicateMetrics)

      const consistency = await (dictionaryService as any).checkConsistency()

      expect(consistency.isValid).toBe(false)
      expect(consistency.issues.some((issue: any) => issue.type === 'duplicate')).toBe(true)
    })
  })
})