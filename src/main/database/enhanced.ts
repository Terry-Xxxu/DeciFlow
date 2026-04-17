/**
 * 增强的数据库连接配置
 * 支持只读模式、安全提示、连接测试增强
 */

import { DatabaseConfig, DatabaseType } from '../../shared/types'

export interface EnhancedDatabaseConfig extends DatabaseConfig {
  // 基础配置
  type: DatabaseType | string
  host: string
  port: number
  database: string
  username: string
  password: string

  // 增强配置
  name?: string              // 连接名称
  readOnly?: boolean         // 只读模式
  connectionTimeout?: number // 连接超时（秒）
  queryTimeout?: number     // 查询超时（秒）
  maxConnections?: number   // 最大连接数
  ssl?: boolean             // 是否使用 SSL
}

export interface ConnectionTestResult {
  success: boolean
  message: string
  details?: {
    latency: number        // 延迟（毫秒）
    version: string        // 数据库版本
    tables?: string[]      // 可访问的表列表
    permissions: string[]  // 用户权限
  }
}

export class DatabaseConnectionManager {
  /**
   * 测试数据库连接（增强版）
   */
  async testConnectionEnhanced(config: EnhancedDatabaseConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now()

    try {
      // 1. 建立连接
      const connection = await this.createConnection(config)

      // 2. 测试查询
      const testResult = await this.performTestQuery(connection, config)

      // 3. 获取数据库信息
      const details = await this.getDatabaseInfo(connection, config)

      // 4. 关闭连接
      await this.closeConnection(connection, config)

      const latency = Date.now() - startTime

      return {
        success: true,
        message: '连接成功',
        details: {
          latency,
          version: details.version,
          tables: details.tables,
          permissions: details.permissions,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 生成安全提示
   */
  generateSecurityTips(config: EnhancedDatabaseConfig): string[] {
    const tips: string[] = []

    // 只读模式提示
    if (!config.readOnly) {
      tips.push('⚠️ 建议开启只读模式以防止意外修改数据')
    }

    // 默认端口安全提示
    const defaultPorts = {
      PostgreSQL: 5432,
      MySQL: 3306,
      MongoDB: 27017,
    }

    for (const [db, port] of Object.entries(defaultPorts)) {
      if (config.type === db && config.port === port) {
        tips.push(`🔓 使用了 ${db} 的默认端口，生产环境建议修改`)
      }
    }

    // 权限提示
    tips.push('🔒 建议使用只读权限账号进行数据分析')

    // SSL 提示
    if (!config.ssl && config.type !== DatabaseType.MongoDB) {
      tips.push('🔐 建议启用 SSL 加密连接')
    }

    return tips
  }

  /**
   * 创建连接（内部方法）
   */
  private async createConnection(config: EnhancedDatabaseConfig) {
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
          connectionTimeoutMillis: (config.connectionTimeout || 30) * 1000,
        })
        await client.connect()
        return client
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
          connectTimeout: (config.connectionTimeout || 30) * 1000,
        })
        return connection
      }

      case 'MongoDB': {
        const { MongoClient } = await import('mongodb')
        const url = `mongodb://${username}:${password}@${host}:${port}`
        const client = new MongoClient(url, {
          minPoolSize: 1,
          maxPoolSize: config.maxConnections || 10,
        })
        await client.connect()
        return client
      }

      default:
        throw new Error(`不支持的数据库类型: ${type}`)
    }
  }

  /**
   * 执行测试查询
   */
  private async performTestQuery(connection: any, config: EnhancedDatabaseConfig): Promise<any> {
    switch (config.type) {
      case 'PostgreSQL': {
        const result = await connection.query('SELECT 1 as test')
        return result.rows[0]
      }

      case 'MySQL': {
        const [rows] = await connection.execute('SELECT 1 as test')
        return (rows as any)[0]
      }

      case 'MongoDB': {
        const db = connection.db(config.database)
        const result = await db.admin().ping()
        return result
      }

      default:
        throw new Error(`不支持的数据库类型: ${config.type}`)
    }
  }

  /**
   * 获取数据库信息
   */
  private async getDatabaseInfo(connection: any, config: EnhancedDatabaseConfig): Promise<{
    version: string
    tables: string[]
    permissions: string[]
  }> {
    switch (config.type) {
      case 'PostgreSQL': {
        // 获取版本
        const versionResult = await connection.query('SELECT version()')
        const version = versionResult.rows[0].version.split(',')[0]

        // 获取表列表
        const tablesResult = await connection.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          ORDER BY table_name
          LIMIT 100
        `)
        const tables = tablesResult.rows.map((row: any) => String(row.table_name))

        // 获取权限
        const permsResult = await connection.query(`
          SELECT privilege_type
          FROM information_schema.role_table_grants
          WHERE grantee = current_user
          LIMIT 20
        `)
        const permissions = Array.from(new Set(permsResult.rows.map((r: any) => String(r.privilege_type))))

        const result = {
          version,
          tables: tables as string[],
          permissions: permissions as string[],
        }
        return result
      }

      case 'MySQL': {
        // 获取版本
        const [versionRows] = await connection.execute('SELECT VERSION() as version')
        const version = (versionRows as any)[0].version

        // 获取表列表
        const [tableRows] = await connection.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = ?
          AND table_type = 'BASE TABLE'
          ORDER BY table_name
          LIMIT 100
        `, [config.database])
        const tables = (tableRows as any[]).map(row => row.table_name)

        // 获取权限
        const [permRows] = await connection.execute('SHOW GRANTS FOR CURRENT_USER()')
        const permissions = (permRows as any[]).map(row => {
          const grantsText = Object.values(row)[0] as string || ''
          const match = grantsText.match(/(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)/gi) || []
          return [...new Set(match)]
        }).flat()

        const result = {
          version,
          tables: tables as string[],
          permissions: permissions as string[],
        }
        return result
      }

      case 'MongoDB': {
        const db = connection.db(config.database)

        // 获取版本
        const buildInfo = await connection.db('admin').admin().serverInfo()
        const version = buildInfo.version

        // 获取集合列表
        const collections = await db.listCollections().toArray()
        const tables = collections.map((c: any) => c.name)

        // MongoDB 权限复杂，简化处理
        const permissions = ['find', 'aggregate']

        return { version, tables, permissions }
      }

      default:
        throw new Error(`不支持的数据库类型: ${config.type}`)
    }
  }

  /**
   * 关闭连接
   */
  private async closeConnection(connection: any, config: EnhancedDatabaseConfig): Promise<void> {
    switch (config.type) {
      case 'PostgreSQL':
        await connection.end()
        break

      case 'MySQL':
        await connection.end()
        break

      case 'MongoDB':
        await connection.close()
        break

      default:
        throw new Error(`不支持的数据库类型: ${config.type}`)
    }
  }
}
