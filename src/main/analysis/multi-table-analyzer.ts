/**
 * 多表关联分析器
 * 支持跨表查询、JOIN 操作和复杂业务分析
 */

import { DatabaseConfig } from '../../shared/types'
import { databaseManager } from '../database/manager'

export interface TableRelationship {
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
  type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many'
  joinType: 'INNER JOIN' | 'LEFT JOIN' | 'RIGHT JOIN'
}

export interface MultiTableQuery {
  id: string
  name: string
  description: string
  sql: string
  tables: string[]
  relationships: TableRelationship[]
  metrics: {
    mainMetric: string
    groupBy?: string[]
    aggregations: string[]
  }
  filters?: string[]
}

export class MultiTableAnalyzer {
  private relationships: Map<string, TableRelationship[]> = new Map()
  private cachedQueries: Map<string, MultiTableQuery> = new Map()

  /**
   * 初始化表关系
   */
  async initializeRelationships(databaseConfig: DatabaseConfig): Promise<void> {
    // 这里可以从数据库的系统表中获取外键关系
    // 目前使用预定义的关系
    const predefinedRelationships: TableRelationship[] = [
      {
        fromTable: 'orders',
        fromColumn: 'user_id',
        toTable: 'users',
        toColumn: 'id',
        type: 'many_to_one',
        joinType: 'LEFT JOIN'
      },
      {
        fromTable: 'order_items',
        fromColumn: 'order_id',
        toTable: 'orders',
        toColumn: 'id',
        type: 'many_to_one',
        joinType: 'INNER JOIN'
      },
      {
        fromTable: 'order_items',
        fromColumn: 'product_id',
        toTable: 'products',
        toColumn: 'id',
        type: 'many_to_one',
        joinType: 'INNER JOIN'
      },
      {
        fromTable: 'users',
        fromColumn: 'id',
        toTable: 'user_preferences',
        toColumn: 'user_id',
        type: 'one_to_one',
        joinType: 'LEFT JOIN'
      }
    ]

    // 构建关系图
    predefinedRelationships.forEach(rel => {
      if (!this.relationships.has(rel.fromTable)) {
        this.relationships.set(rel.fromTable, [])
      }
      this.relationships.get(rel.fromTable)!.push(rel)
    })
  }

  /**
   * 分析自然语言查询并生成多表 SQL
   */
  async analyzeQuery(
    naturalLanguage: string,
    databaseConfig: DatabaseConfig
  ): Promise<MultiTableQuery> {
    const queryId = this.generateQueryId(naturalLanguage)

    // 检查缓存
    if (this.cachedQueries.has(queryId)) {
      return this.cachedQueries.get(queryId)!
    }

    // 根据自然语言确定需要的表和关系
    const queryInfo = this.parseNaturalLanguage(naturalLanguage)

    // 生成 SQL
    const sql = await this.generateMultiTableSQL(queryInfo, databaseConfig)

    // 创建查询对象
    const query: MultiTableQuery = {
      id: queryId,
      name: queryInfo.name,
      description: queryInfo.description,
      sql,
      tables: queryInfo.tables,
      relationships: queryInfo.relationships,
      metrics: queryInfo.metrics,
      filters: queryInfo.filters
    }

    // 缓存查询
    this.cachedQueries.set(queryId, query)

    return query
  }

  /**
   * 解析自然语言查询
   */
  private parseNaturalLanguage(naturalLanguage: string): {
    name: string
    description: string
    tables: string[]
    relationships: TableRelationship[]
    metrics: {
      mainMetric: string
      groupBy?: string[]
      aggregations: string[]
    }
    filters?: string[]
  } {
    const normalizedQuery = naturalLanguage.toLowerCase()

    // 定义查询模式
    const patterns = {
      userOrders: {
        keywords: ['用户订单', '用户消费', '购买记录', '订单统计'],
        tables: ['users', 'orders'],
        relationships: this.getTableRelationships('users', 'orders'),
        metrics: {
          mainMetric: 'COUNT',
          groupBy: ['users.id', 'users.name'],
          aggregations: ['COUNT(orders.id) as order_count', 'SUM(orders.amount) as total_amount']
        }
      },
      productSales: {
        keywords: ['产品销售', '商品统计', '销量分析', '产品收入'],
        tables: ['products', 'order_items', 'orders'],
        relationships: this.getTableRelationships('products', 'order_items', 'orders'),
        metrics: {
          mainMetric: 'SUM',
          groupBy: ['products.category', 'products.name'],
          aggregations: ['SUM(order_items.quantity * order_items.price) as revenue', 'COUNT(DISTINCT orders.id) as order_count']
        }
      },
      userBehavior: {
        keywords: ['用户行为', '用户活跃度', '购买频率', '用户留存'],
        tables: ['users', 'orders', 'order_items', 'products'],
        relationships: this.getTableRelationships('users', 'orders', 'order_items', 'products'),
        metrics: {
          mainMetric: 'COUNT',
          groupBy: ['users.id', 'users.name'],
          aggregations: [
            'COUNT(DISTINCT orders.id) as order_count',
            'COUNT(DISTINCT DATE(orders.created_at)) as active_days',
            'SUM(orders.amount) as total_spent',
            'AVG(order_items.quantity) as avg_quantity'
          ]
        },
        filters: ['orders.created_at >= NOW() - INTERVAL \'3 months\'']
      }
    }

    // 匹配查询模式
    let matchedPattern: any = null
    for (const [key, pattern] of Object.entries(patterns)) {
      if (pattern.keywords.some(keyword => normalizedQuery.includes(keyword))) {
        matchedPattern = pattern
        break
      }
    }

    if (!matchedPattern) {
      // 默认用户订单模式
      matchedPattern = patterns.userOrders
    }

    return {
      name: `多表分析 - ${matchedPattern.metrics.mainMetric}`,
      description: naturalLanguage,
      tables: matchedPattern.tables,
      relationships: matchedPattern.relationships,
      metrics: matchedPattern.metrics,
      filters: matchedPattern.filters
    }
  }

  /**
   * 生成多表 SQL
   */
  private async generateMultiTableSQL(
    queryInfo: any,
    databaseConfig: DatabaseConfig
  ): Promise<string> {
    let sql = 'SELECT '

    // 选择指标
    sql += queryInfo.metrics.aggregations.join(', ')

    // FROM 子句
    sql += ` FROM ${queryInfo.tables[0]} t0`

    // JOIN 子句
    queryInfo.relationships.forEach((rel: TableRelationship, index: number) => {
      sql += ` ${rel.joinType} ${rel.toTable} t${index + 1} ON t${index}.${rel.fromColumn} = t${index + 1}.${rel.toColumn}`
    })

    // WHERE 子句
    if (queryInfo.filters && queryInfo.filters.length > 0) {
      sql += ' WHERE ' + queryInfo.filters.join(' AND ')
    }

    // GROUP BY 子句
    if (queryInfo.metrics.groupBy) {
      sql += ' GROUP BY ' + queryInfo.metrics.groupBy.join(', ')
    }

    // ORDER BY 子句
    sql += ' ORDER BY ' + queryInfo.metrics.aggregations[0] + ' DESC'

    // LIMIT 子句
    sql += ' LIMIT 1000'

    return sql
  }

  /**
   * 获取表之间的关系
   */
  private getTableRelationships(...tables: string[]): TableRelationship[] {
    const relationships: TableRelationship[] = []

    for (let i = 0; i < tables.length - 1; i++) {
      const fromTable = tables[i]
      const toTable = tables[i + 1]

      const tableRelationships = this.relationships.get(fromTable) || []
      const relationship = tableRelationships.find(rel => rel.toTable === toTable)

      if (relationship) {
        relationships.push(relationship)
      }
    }

    return relationships
  }

  /**
   * 生成查询 ID
   */
  private generateQueryId(naturalLanguage: string): string {
    return 'query_' + Buffer.from(naturalLanguage).toString('base64').replace(/[^a-zA-Z0-9]/g, '')
  }

  /**
   * 获取所有可用的表关系
   */
  getAvailableRelationships(): TableRelationship[] {
    const allRelationships: TableRelationship[] = []

    this.relationships.forEach((rels, table) => {
      rels.forEach(rel => {
        allRelationships.push({
          ...rel,
          fromTable: table
        })
      })
    })

    return allRelationships
  }

  /**
   * 检查查询是否有循环引用
   */
  detectCircularRelationships(tables: string[]): boolean {
    const graph: { [key: string]: string[] } = {}

    // 构建关系图
    tables.forEach(table => {
      graph[table] = []
    })

    this.relationships.forEach((rels, fromTable) => {
      rels.forEach(rel => {
        if (tables.includes(fromTable) && tables.includes(rel.toTable)) {
          graph[fromTable].push(rel.toTable)
        }
      })
    })

    // 检测循环
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const hasCycle = (node: string): boolean => {
      visited.add(node)
      recursionStack.add(node)

      for (const neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) {
            return true
          }
        } else if (recursionStack.has(neighbor)) {
          return true
        }
      }

      recursionStack.delete(node)
      return false
    }

    return tables.some(table => hasCycle(table))
  }

  /**
   * 优化 JOIN 顺序
   */
  optimizeJoinOrder(tables: string[]): string[] {
    // 简单优化：从最小表开始，到最大表结束
    // 实际实现可以使用更复杂的算法
    return tables.sort((a, b) => {
      const aSize = this.getTableSize(a) || 0
      const bSize = this.getTableSize(b) || 0
      return aSize - bSize
    })
  }

  /**
   * 获取表大小（模拟）
   */
  private getTableSize(tableName: string): number {
    const sizes: { [key: string]: number } = {
      users: 10000,
      orders: 50000,
      products: 1000,
      order_items: 100000,
      user_preferences: 10000
    }

    return sizes[tableName] || 0
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cachedQueries.clear()
  }
}