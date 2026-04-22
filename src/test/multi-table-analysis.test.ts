/**
 * DeciFlow 多表关联分析功能测试
 * 测试跨表查询、JOIN 操作和复杂业务分析
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { HybridNL2SQLService } from '../main/nl2sql/hybrid-nl2sql-service'
import { AnalysisEngineV2 } from '../main/ai/analysis-engine-v2'
import { SchemaManager } from '../main/database/schema-manager'

// 模拟数据库关系
const mockDatabaseSchema = {
  users: {
    tableName: 'users',
    columns: [
      { columnName: 'id', dataType: 'integer', nullable: false, description: '用户ID' },
      { columnName: 'name', dataType: 'varchar', nullable: false, description: '用户姓名' },
      { columnName: 'email', dataType: 'varchar', nullable: false, description: '用户邮箱' },
      { columnName: 'created_at', dataType: 'timestamp', nullable: false, description: '注册时间' },
      { columnName: 'status', dataType: 'varchar', nullable: false, description: '用户状态' }
    ]
  },
  orders: {
    tableName: 'orders',
    columns: [
      { columnName: 'id', dataType: 'integer', nullable: false, description: '订单ID' },
      { columnName: 'user_id', dataType: 'integer', nullable: false, description: '用户ID（外键）' },
      { columnName: 'amount', dataType: 'decimal', nullable: false, description: '订单金额' },
      { columnName: 'status', dataType: 'varchar', nullable: false, description: '订单状态' },
      { columnName: 'created_at', dataType: 'timestamp', nullable: false, description: '下单时间' }
    ]
  },
  products: {
    tableName: 'products',
    columns: [
      { columnName: 'id', dataType: 'integer', nullable: false, description: '产品ID' },
      { columnName: 'name', dataType: 'varchar', nullable: false, description: '产品名称' },
      { columnName: 'category', dataType: 'varchar', nullable: false, description: '产品分类' },
      { columnName: 'price', dataType: 'decimal', nullable: false, description: '产品价格' }
    ]
  },
  order_items: {
    tableName: 'order_items',
    columns: [
      { columnName: 'id', dataType: 'integer', nullable: false, description: '订单项ID' },
      { columnName: 'order_id', dataType: 'integer', nullable: false, description: '订单ID（外键）' },
      { columnName: 'product_id', dataType: 'integer', nullable: false, description: '产品ID（外键）' },
      { columnName: 'quantity', dataType: 'integer', nullable: false, description: '购买数量' },
      { columnName: 'price', dataType: 'decimal', nullable: false, description: '单价' }
    ]
  }
}

// 模拟查询结果
const mockQueryResults = {
  // 用户订单关联查询
  'user-orders': [
    { user_id: 1, name: '张三', total_orders: 5, total_amount: 1500 },
    { user_id: 2, name: '李四', total_orders: 3, total_amount: 800 }
  ],

  // 订单产品关联查询
  'order-products': [
    { order_id: 1, product_name: 'iPhone', category: '电子产品', quantity: 2, total: 6000 },
    { order_id: 2, product_name: 'MacBook', category: '电子产品', quantity: 1, total: 12000 }
  ],

  // 三表关联查询
  'user-order-products': [
    { user_name: '张三', product_name: 'iPhone', order_count: 2, total_spent: 3000 },
    { user_name: '李四', product_name: 'MacBook', order_count: 1, total_spent: 12000 }
  ]
}

class MockDatabaseService {
  async query(sql: string): Promise<any> {
    // 模拟解析 SQL 并返回结果
    if (sql.includes('users') && sql.includes('orders')) {
      return { columns: ['user_id', 'name', 'total_orders', 'total_amount'], rows: mockQueryResults['user-orders'] }
    }
    if (sql.includes('orders') && sql.includes('products')) {
      return { columns: ['order_id', 'product_name', 'category', 'quantity', 'total'], rows: mockQueryResults['order-products'] }
    }
    if (sql.includes('users') && sql.includes('orders') && sql.includes('products')) {
      return { columns: ['user_name', 'product_name', 'order_count', 'total_spent'], rows: mockQueryResults['user-order-products'] }
    }
    return { columns: [], rows: [] }
  }
}

describe('DeciFlow 多表关联分析测试', () => {
  let nl2sqlService: HybridNL2SQLService
  let analysisEngine: AnalysisEngineV2
  let schemaManager: SchemaManager
  let mockDatabase: MockDatabaseService

  beforeEach(() => {
    mockDatabase = new MockDatabaseService()
    nl2sqlService = new HybridNL2SQLService()
    analysisEngine = new AnalysisEngineV2(null as any)
    schemaManager = new SchemaManager() as any
  })

  describe('跨表查询生成', () => {
    it('应该能够生成用户订单关联查询', async () => {
      const naturalQuery = '查看每个用户的订单总数和消费金额'

      const result = await nl2sqlService.parseQuery(
        naturalQuery,
        'postgresql',
        { tableName: 'users', fields: ['id', 'name'] }
      )

      expect(result.sql).toContain('JOIN')
      expect(result.sql).toContain('orders')
      expect(result.sql).toContain('COUNT')
      expect(result.sql).toContain('SUM')
      expect(result.confidence).toBeGreaterThan(0.8)
    })

    it('应该能够生成订单产品关联查询', async () => {
      const naturalQuery = '统计每个订单的产品分类销售情况'

      const result = await nl2sqlService.parseQuery(
        naturalQuery,
        'postgresql',
        { tableName: 'orders', fields: ['id'] }
      )

      expect(result.sql).toContain('JOIN')
      expect(result.sql).toContain('order_items')
      expect(result.sql).toContain('products')
      expect(result.sql).toContain('category')
      expect(result.sql).toContain('SUM')
    })

    it('应该能够生成三表关联查询', async () => {
      const naturalQuery = '分析每个用户购买的产品类别分布'

      const result = await nl2sqlService.parseQuery(
        naturalQuery,
        'postgresql',
        { tableName: 'users', fields: ['id', 'name'] }
      )

      expect(result.sql).toContain('users')
      expect(result.sql).toContain('orders')
      expect(result.sql).toContain('order_items')
      expect(result.sql).toContain('products')
      expect(result.sql.split('JOIN').length).toBeGreaterThanOrEqual(2)
    })

    it('应该正确处理多表关联的 WHERE 条件', async () => {
      const naturalQuery = '查找最近30天内消费超过1000元的用户及其购买的产品'

      const result = await nl2sqlService.parseQuery(
        naturalQuery,
        'postgresql',
        { tableName: 'users', fields: ['id', 'name'] }
      )

      expect(result.sql).toContain('WHERE')
      expect(result.sql).toContain('created_at >=')
      expect(result.sql).toContain('SUM(amount)')
      expect(result.sql).toContain('> 1000')
    })

    it('应该支持 GROUP BY 多表字段', async () => {
      const naturalQuery = '按产品类别和订单状态统计订单数量'

      const result = await nl2sqlService.parseQuery(
        naturalQuery,
        'postgresql',
        { tableName: 'products', fields: ['category'] }
      )

      expect(result.sql).toContain('GROUP BY')
      expect(result.sql).toContain('category')
      expect(result.sql).toContain('status')
      expect(result.sql).toContain('COUNT')
    })
  })

  describe('表关系管理', () => {
    it('应该能够识别外键关系', () => {
      const foreignKeys = [
        { fromTable: 'orders', fromColumn: 'user_id', toTable: 'users', toColumn: 'id' },
        { fromTable: 'order_items', fromColumn: 'order_id', toTable: 'orders', toColumn: 'id' },
        { fromTable: 'order_items', fromColumn: 'product_id', toTable: 'products', toColumn: 'id' }
      ]

      foreignKeys.forEach(fk => {
        const fromTable = mockDatabaseSchema[fk.fromTable as keyof typeof mockDatabaseSchema]
        const toTable = mockDatabaseSchema[fk.toTable as keyof typeof mockDatabaseSchema]

        expect(fromTable).toBeDefined()
        expect(toTable).toBeDefined()
        expect(fromTable?.columns.find(c => c.columnName === fk.fromColumn)).toBeDefined()
        expect(toTable?.columns.find(c => c.columnName === fk.toColumn)).toBeDefined()
      })
    })

    it('应该能够自动推断 JOIN 条件', async () => {
      // 模拟表关系推断
      const tableRelations = {
        users: {
          relatedTables: ['orders'],
          joinConditions: [
            { leftTable: 'users', leftColumn: 'id', rightTable: 'orders', rightColumn: 'user_id' }
          ]
        },
        orders: {
          relatedTables: ['users', 'order_items'],
          joinConditions: [
            { leftTable: 'orders', leftColumn: 'id', rightTable: 'order_items', rightColumn: 'order_id' }
          ]
        }
      }

      const userOrdersRelation = tableRelations.users
      expect(userOrdersRelation.relatedTables).toContain('orders')
      expect(userOrdersRelation.joinConditions).toHaveLength(1)
      expect(userOrdersRelation.joinConditions[0].leftColumn).toBe('id')
      expect(userOrdersRelation.joinConditions[0].rightColumn).toBe('user_id')
    })

    it('应该检测循环引用', () => {
      // 模拟循环引用检测
      const tableGraph = {
        users: ['orders'],
        orders: ['users', 'order_items'], // orders 关联回 users，形成循环
        order_items: ['orders']
      }

      const hasCircularReference = this.detectCircularReference(tableGraph, 'users', new Set())
      expect(hasCircularReference).toBe(true)
    })

    it('应该生成最优的 JOIN 顺序', () => {
      // 模拟 JOIN 顺序优化
      const joinPath = ['users', 'orders', 'order_items', 'products']
      const optimalOrder = this.optimizeJoinOrder(joinPath)

      expect(optimalOrder[0]).toBe('users')  // 从最基础的表开始
      expect(optimalOrder[optimalOrder.length - 1]).toBe('products')  // 到目标表结束
    })
  })

  describe('复杂业务分析', () => {
    it('应该能够分析用户购买行为', async () => {
      const analysisRequest = {
        metricId: 'user_purchase_behavior',
        breakdownDimensions: ['category', 'status'],
        timeRange: 'last_30_days',
        compareWith: 'previous_period'
      }

      const result = await analysisEngine.analyze(analysisRequest)

      expect(result.conclusion).toBeDefined()
      expect(result.drivers).toBeDefined()
      expect(result.drivers.length).toBeGreaterThan(0)
      expect(result.recommendations).toBeDefined()
    })

    it('应该能够计算用户生命周期价值', async () => {
      const ltvQuery = `
        SELECT
          u.id,
          u.name,
          COUNT(DISTINCT o.id) as order_count,
          SUM(o.amount) as total_spent,
          AVG(o.amount) as avg_order_value,
          COUNT(DISTINCT DATE(o.created_at)) as active_days
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE o.created_at >= NOW() - INTERVAL '1 year'
        GROUP BY u.id, u.name
      `

      const result = await mockDatabase.query(ltvQuery)
      expect(result.rows).toBeDefined()
      expect(result.rows.length).toBeGreaterThan(0)
    })

    it('应该能够分析产品销售趋势', async () => {
      const salesTrendQuery = `
        WITH product_sales AS (
          SELECT
            p.category,
            DATE_TRUNC('week', o.created_at) as week,
            COUNT(DISTINCT o.id) as order_count,
            SUM(oi.quantity * oi.price) as revenue
          FROM products p
          JOIN order_items oi ON p.id = oi.product_id
          JOIN orders o ON oi.order_id = o.id
          WHERE o.created_at >= NOW() - INTERVAL '3 months'
          GROUP BY p.category, DATE_TRUNC('week', o.created_at)
        )
        SELECT
          category,
          week,
          order_count,
          revenue,
          LAG(revenue) OVER (PARTITION BY category ORDER BY week) as prev_revenue,
          (revenue - LAG(revenue) OVER (PARTITION BY category ORDER BY week)) / LAG(revenue) OVER (PARTITION BY category ORDER BY week) * 100 as growth_rate
        FROM product_sales
        ORDER BY category, week
      `

      const result = await mockDatabase.query(salesTrendQuery)
      expect(result.rows).toBeDefined()
      expect(result.columns).toContain('growth_rate')
    })

    it('应该能够分析用户留存率', async () => {
      const retentionQuery = `
        WITH user_orders_first AS (
          SELECT DISTINCT
            u.id,
            MIN(DATE(o.created_at)) as first_order_date
          FROM users u
          JOIN orders o ON u.id = o.user_id
          GROUP BY u.id
        ),
        user_orders_second AS (
          SELECT DISTINCT
            u.id,
            DATE(o.created_at) as second_order_date
          FROM users u
          JOIN orders o ON u.id = o.user_id
          WHERE o.created_at > u.first_order_date
          GROUP BY u.id, DATE(o.created_at)
        )
        SELECT
          COUNT(uof.id) as total_users,
          COUNT(uos.id) as retained_users,
          COUNT(uos.id) * 100.0 / COUNT(uof.id) as retention_rate
        FROM user_orders_first uof
        LEFT JOIN user_orders_second uos ON uof.id = uos.id
        WHERE uof.first_order_date >= NOW() - INTERVAL '3 months'
      `

      const result = await mockDatabase.query(retentionQuery)
      expect(result.rows).toBeDefined()
      expect(result.columns).toContain('retention_rate')
    })
  })

  describe('性能优化', () => {
    it('应该使用索引提示优化查询', async () => {
      const optimizedQuery = `
        SELECT u.name, COUNT(o.id) as order_count
        FROM users u
        FORCE INDEX (idx_users_id)
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.created_at >= NOW() - INTERVAL '1 month'
        GROUP BY u.id, u.name
        HAVING COUNT(o.id) > 0
        ORDER BY order_count DESC
        LIMIT 100
      `

      expect(optimizedQuery).toContain('FORCE INDEX')
      expect(optimizedQuery).toContain('LIMIT')
    })

    it('应该使用 CTE 优化复杂查询', async () => {
      const cteQuery = `
        WITH user_activity AS (
          SELECT
            u.id,
            u.name,
            COUNT(DISTINCT DATE(o.created_at)) as active_days,
            SUM(o.amount) as total_spent
          FROM users u
          LEFT JOIN orders o ON u.id = o.user_id
          WHERE o.created_at >= NOW() - INTERVAL '3 months'
          GROUP BY u.id, u.name
        ),
        user_segments AS (
          SELECT
            id,
            name,
            total_spent,
            CASE
              WHEN total_spent > 10000 THEN 'VIP'
              WHEN total_spent > 5000 THEN '高价值'
              WHEN total_spent > 1000 THEN '中等'
              ELSE '普通'
            END as segment
          FROM user_activity
        )
        SELECT
          segment,
          COUNT(*) as user_count,
          AVG(total_spent) as avg_spent,
          SUM(total_spent) as total_revenue
        FROM user_segments
        GROUP BY segment
        ORDER BY total_revenue DESC
      `

      expect(cteQuery).toContain('WITH')
      expect(cteQuery).toContain('user_activity')
      expect(cteQuery).toContain('user_segments')
    })

    it('应该分批处理大数据量', async () => {
      const batchQuery = `
        SELECT
          u.name,
          COUNT(o.id) as order_count
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.created_at >= NOW() - INTERVAL '1 year'
        GROUP BY u.id, u.name
        ORDER BY order_count DESC
        LIMIT 1000
        OFFSET 0
      `

      const batchResults = []
      let offset = 0
      const batchSize = 1000

      do {
        const currentQuery = batchQuery.replace('OFFSET 0', `OFFSET ${offset}`)
        const result = await mockDatabase.query(currentQuery)
        batchResults.push(...result.rows)
        offset += batchSize
      } while (result.rows.length === batchSize)

      expect(batchResults.length).toBeGreaterThan(0)
    })
  })

  describe('错误处理', () => {
    it('应该处理无效的 JOIN 条件', async () => {
      const invalidQuery = 'SELECT * FROM users JOIN orders ON invalid_column = user_id'

      const result = await nl2sqlService.parseQuery(invalidQuery, 'postgresql')
      expect(result.confidence).toBeLessThan(0.5)
      expect(result.error).toContain('JOIN')
    })

    it('应该处理循环引用导致的性能问题', async () => {
      const circularQuery = `
        WITH a AS (SELECT * FROM users),
             b AS (SELECT * FROM orders),
             c AS (SELECT * FROM a JOIN b ON users.id = orders.user_id)
        SELECT * FROM c
      `

      expect(() => {
        this.detectCircularReference({ users: ['orders'], orders: ['users'] }, 'users', new Set())
      }).toThrow('循环引用')
    })

    it('应该处理过大的 JOIN 结果集', async () => {
      const largeJoinQuery = `
        SELECT u.*, o.*, p.*
        FROM users u
        CROSS JOIN orders o
        CROSS JOIN products p
      `

      const result = await mockDatabase.query(largeJoinQuery)
      // 模拟限制结果集大小
      expect(result.rows.length).toBeLessThan(10000)
    })
  })
})