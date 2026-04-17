/**
 * Schema 管理系统
 * 缓存数据库表结构和字段描述
 */

import { DatabaseConfig, DatabaseType } from '../../shared/types'

export interface EnhancedDatabaseConfig extends DatabaseConfig {
  type: DatabaseType | string
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
}

export interface TableSchema {
  tableName: string
  columns: ColumnSchema[]
  rowCount?: number
  lastUpdated: Date
}

export interface ColumnSchema {
  columnName: string
  dataType: string
  nullable: boolean
  defaultValue?: any
  description?: string  // 业务含义描述
  sampleData?: any   // 示例数据
  tags?: string[]
}

export interface DatabaseSchema {
  databaseType: DatabaseType | string
  host: string
  database: string
  schemas: Map<string, TableSchema>
  lastSync: Date
}

export class SchemaManager {
  private schemas: Map<string, DatabaseSchema> = new Map()

  /**
   * 缓存数据库 Schema
   */
  async cacheSchema(config: EnhancedDatabaseConfig): Promise<void> {
    const key = this.getSchemaKey(config)

    // 获取所有表
    const tables = await this.fetchTables(config)

    // 获取每个表的列信息
    const tableSchemas: Map<string, TableSchema> = new Map()

    for (const table of tables) {
      const columns = await this.fetchColumns(config, table)
      tableSchemas.set(table, {
        tableName: table,
        columns,
        lastUpdated: new Date(),
      })
    }

    this.schemas.set(key, {
      databaseType: config.type,
      host: config.host,
      database: config.database,
      schemas: tableSchemas,
      lastSync: new Date(),
    })
  }

  /**
   * 获取表的 Schema
   */
  getSchema(config: EnhancedDatabaseConfig): DatabaseSchema | undefined {
    return this.schemas.get(this.getSchemaKey(config))
  }

  /**
   * 获取表的列信息
   */
  getTableSchema(config: EnhancedDatabaseConfig, tableName: string): TableSchema | undefined {
    const schema = this.getSchema(config)
    return schema?.schemas.get(tableName)
  }

  /**
   * 更新字段描述
   */
  updateColumnDescription(
    config: EnhancedDatabaseConfig,
    tableName: string,
    columnName: string,
    description: string
  ): boolean {
    const schema = this.getSchema(config)
    if (!schema) return false

    const tableSchema = schema.schemas.get(tableName)
    if (!tableSchema) return false

    const column = tableSchema.columns.find(c => c.columnName === columnName)
    if (!column) return false

    column.description = description
    schema.lastSync = new Date()

    return true
  }

  /**
   * 搜索字段
   */
  searchColumns(
    config: EnhancedDatabaseConfig,
    keyword: string
  ): Array<{ tableName: string; columnName: string; description?: string }> {
    const results: Array<{ tableName: string; columnName: string; description?: string }> = []

    const schema = this.getSchema(config)
    if (!schema) return results

    schema.schemas.forEach((tableSchema) => {
      tableSchema.columns.forEach(column => {
        const matchInName = column.columnName.toLowerCase().includes(keyword.toLowerCase())
        const matchInDesc = column.description?.toLowerCase().includes(keyword.toLowerCase())

        if (matchInName || matchInDesc) {
          results.push({
            tableName: tableSchema.tableName,
            columnName: column.columnName,
            description: column.description,
          })
        }
      })
    })

    return results
  }

  /**
   * 生成 Schema 描述（用于 AI Prompt）
   */
  generateSchemaDescription(config: EnhancedDatabaseConfig): string {
    const schema = this.getSchema(config)
    if (!schema) return '暂无 Schema 信息'

    let description = `【数据库】${schema.databaseType} @ ${schema.host}\n`

    schema.schemas.forEach((table, tableName) => {
      description += `\n【表名】${tableName}\n`
      description += `字段：\n`

      table.columns.forEach(column => {
        const desc = column.description || '无描述'
        description += `  - ${column.columnName} (${column.dataType}): ${desc}\n`
      })
    })

    return description
  }

  /**
   * 生成 Schema Key
   */
  private getSchemaKey(config: EnhancedDatabaseConfig): string {
    return `${config.type}://${config.host}:${config.port}/${config.database}`
  }

  /**
   * 获取所有表（内部方法）
   */
  private async fetchTables(config: EnhancedDatabaseConfig): Promise<string[]> {
    const { type, host, port, database, username, password, ssl } = config

    switch (type) {
      case 'PostgreSQL': {
        const { Client } = await import('pg')
        const client = new Client({
          host,
          port,
          database,
          user: username,
          password,
          ssl: ssl ? { rejectUnauthorized: false } : undefined,
        })
        await client.connect()

        try {
          const result = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
          `)
          return result.rows.map((row: any) => row.table_name)
        } finally {
          await client.end()
        }
      }

      case 'MySQL': {
        const mysql = await import('mysql2/promise')
        const connection = await mysql.createConnection({
          host,
          port,
          database,
          user: username,
          password,
          ssl: ssl ? {} : undefined,
        })

        try {
          const [rows] = await connection.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = ?
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
          `, [database])
          return (rows as any[]).map(row => row.table_name)
        } finally {
          await connection.end()
        }
      }

      case 'MongoDB': {
        const { MongoClient } = await import('mongodb')
        const url = `mongodb://${username}:${password}@${host}:${port}`
        const client = new MongoClient(url)

        try {
          await client.connect()
          const db = client.db(database)
          const collections = await db.listCollections().toArray()
          return collections.map(c => c.name)
        } finally {
          await client.close()
        }
      }

      default:
        throw new Error(`不支持的数据库类型: ${type}`)
    }
  }

  /**
   * 获取列信息（内部方法）
   */
  private async fetchColumns(config: EnhancedDatabaseConfig, tableName: string): Promise<ColumnSchema[]> {
    const { type, host, port, database, username, password, ssl } = config

    switch (type) {
      case 'PostgreSQL': {
        const { Client } = await import('pg')
        const client = new Client({
          host,
          port,
          database,
          user: username,
          password,
          ssl: ssl ? { rejectUnauthorized: false } : undefined,
        })
        await client.connect()

        try {
          const result = await client.query(`
            SELECT
              column_name,
              data_type,
              is_nullable,
              column_default,
              data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = $1
            ORDER BY ordinal_position
          `, [tableName])

          return result.rows.map((row: any) => ({
            columnName: row.column_name,
            dataType: row.data_type,
            nullable: row.is_nullable === 'YES',
            defaultValue: row.column_default,
          }))
        } finally {
          await client.end()
        }
      }

      case 'MySQL': {
        const mysql = await import('mysql2/promise')
        const connection = await mysql.createConnection({
          host,
          port,
          database,
          user: username,
          password,
          ssl: ssl ? {} : undefined,
        })

        try {
          const [rows] = await connection.query(`
            SELECT
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_schema = ?
            AND table_name = ?
            ORDER BY ordinal_position
          `, [database, tableName])

          return (rows as any[]).map(row => ({
            columnName: row.column_name,
            dataType: row.data_type,
            nullable: row.is_nullable === 'YES',
            defaultValue: row.column_default,
          }))
        } finally {
          await connection.end()
        }
      }

      case 'MongoDB': {
        const { MongoClient } = await import('mongodb')
        const url = `mongodb://${username}:${password}@${host}:${port}`
        const client = new MongoClient(url)

        try {
          await client.connect()
          const db = client.db(database)
          const collection = db.collection(tableName)

          // 获取一个样本文档来推断字段
          const sampleDoc = await collection.findOne()

          if (!sampleDoc) {
            return []
          }

          // MongoDB 字段类型推断
          return Object.keys(sampleDoc).map(key => {
            const value = sampleDoc[key]
            let dataType = 'unknown'

            if (value === null) dataType = 'null'
            else if (typeof value === 'string') dataType = 'string'
            else if (typeof value === 'number') dataType = 'number'
            else if (typeof value === 'boolean') dataType = 'boolean'
            else if (value instanceof Date) dataType = 'date'
            else if (Array.isArray(value)) dataType = 'array'
            else if (typeof value === 'object') dataType = 'object'

            return {
              columnName: key,
              dataType,
              nullable: value === null,
              sampleData: value,
            }
          })
        } finally {
          await client.close()
        }
      }

      default:
        throw new Error(`不支持的数据库类型: ${type}`)
    }
  }
}

export const schemaManager = new SchemaManager()
