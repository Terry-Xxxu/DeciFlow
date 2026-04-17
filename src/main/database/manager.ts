/**
 * 数据库连接管理器
 * 支持 PostgreSQL、MySQL、MongoDB、SQLite、Redis、ClickHouse 等
 */

import { Pool, PoolConfig, PoolClient, QueryResult as PGQueryResult, FieldDef } from 'pg'
import mysql from 'mysql2/promise'
import { MongoClient, Db } from 'mongodb'
import Database from 'better-sqlite3'
import { createClient, RedisClientType } from 'redis'
import { createClient as createClickHouseClient } from '@clickhouse/client'
import { DatabaseConfig, DatabaseType } from '../../shared/types'
import { sqlSecurityValidator } from '../security/sql-validator'
import * as fs from 'fs'
import * as path from 'path'

export interface QueryResult {
  columns: string[]
  rows: Record<string, any>[]
  executionTime: number
  rowCount: number
  warnings?: string[]
  fixedSQL?: string
}

/**
 * 数据库连接基类
 */
abstract class DatabaseConnection {
  protected config: DatabaseConfig
  protected isConnected: boolean = false

  constructor(config: DatabaseConfig) {
    this.config = config
  }

  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>
  abstract testConnection(): Promise<boolean>
  abstract query(sql: string): Promise<QueryResult>
  abstract getTables(): Promise<string[]>

  getStatus() {
    return this.isConnected
  }
}

/**
 * PostgreSQL 连接
 */
class PostgreSQLConnection extends DatabaseConnection {
  private pool?: Pool

  async connect(): Promise<void> {
    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }

    this.pool = new Pool(poolConfig)

    try {
      const client = await this.pool.connect()
      client.release()
      this.isConnected = true
    } catch (error) {
      this.isConnected = false
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = undefined
      this.isConnected = false
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool!.connect()
      await client.query('SELECT 1')
      client.release()
      return true
    } catch {
      return false
    }
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.pool || !this.isConnected) {
      throw new Error('数据库未连接')
    }

    // SQL 安全验证
    const validation = sqlSecurityValidator.validate(sql)
    if (!validation.isValid) {
      throw new Error(`SQL 安全验证失败：${validation.errors.join(', ')}`)
    }

    // 使用修复后的 SQL（如果有）
    const querySQL = validation.fixedSQL || sql

    const startTime = Date.now()

    try {
      const result = await this.pool.query(querySQL)
      const executionTime = Date.now() - startTime

      const columns = result.fields.map((f: FieldDef) => f.name)
      const rows = result.rows

      return {
        columns,
        rows,
        executionTime,
        rowCount: rows.length,
        warnings: validation.warnings,  // 添加安全警告
      }
    } catch (error) {
      throw new Error(`查询失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async getTables(): Promise<string[]> {
    const result = await this.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    return result.rows.map(row => row.table_name)
  }
}

/**
 * MySQL 连接
 */
class MySQLConnection extends DatabaseConnection {
  private pool?: mysql.Pool

  async connect(): Promise<void> {
    this.pool = mysql.createPool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    })

    try {
      const connection = await this.pool.getConnection()
      connection.release()
      this.isConnected = true
    } catch (error) {
      this.isConnected = false
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = undefined
      this.isConnected = false
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const connection = await this.pool!.getConnection()
      await connection.ping()
      connection.release()
      return true
    } catch {
      return false
    }
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.pool || !this.isConnected) {
      throw new Error('数据库未连接')
    }

    const startTime = Date.now()

    try {
      const [rows, fields] = await this.pool.execute(sql)
      const executionTime = Date.now() - startTime

      const columns = fields.map(f => f.name)
      const resultRows = Array.isArray(rows) ? rows : []

      return {
        columns,
        rows: resultRows as Record<string, any>[],
        executionTime,
        rowCount: resultRows.length,
      }
    } catch (error) {
      throw new Error(`查询失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async getTables(): Promise<string[]> {
    const result = await this.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    return result.rows.map(row => row.table_name)
  }
}

/**
 * MongoDB 连接
 */
class MongoDBConnection extends DatabaseConnection {
  private client?: MongoClient
  private db?: Db

  async connect(): Promise<void> {
    const uri = `mongodb://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}`

    this.client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 2000,
      socketTimeoutMS: 30000,
    })

    try {
      await this.client.connect()
      this.db = this.client.db(this.config.database)
      this.isConnected = true
    } catch (error) {
      this.isConnected = false
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = undefined
      this.db = undefined
      this.isConnected = false
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.db!.admin().ping()
      return true
    } catch {
      return false
    }
  }

  async query(sql: string): Promise<QueryResult> {
    // MongoDB 不使用 SQL，这里提供一个简单的查询接口
    // 实际使用中应该使用 MongoDB 查询语法
    throw new Error('MongoDB 查询功能开发中，请使用原生 MongoDB 客户端')
  }

  async getTables(): Promise<string[]> {
    if (!this.db) {
      throw new Error('数据库未连接')
    }

    const collections = await this.db.listCollections().toArray()
    return collections.map(c => c.name)
  }
}

/**
 * SQLite 连接
 */
class SQLiteConnection extends DatabaseConnection {
  private db?: Database.Database

  async connect(): Promise<void> {
    const dbPath = this.config.host || ':memory:'
    this.db = new Database(dbPath)
    this.isConnected = true
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = undefined
      this.isConnected = false
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.db) return false
      this.db.prepare('SELECT 1').get()
      return true
    } catch {
      return false
    }
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.db || !this.isConnected) {
      throw new Error('数据库未连接')
    }

    const startTime = Date.now()

    try {
      const statement = this.db.prepare(sql)
      const rows = statement.all() as Record<string, any>[]
      const executionTime = Date.now() - startTime

      // 获取列名
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []

      return {
        columns,
        rows,
        executionTime,
        rowCount: rows.length,
      }
    } catch (error) {
      throw new Error(`查询失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async getTables(): Promise<string[]> {
    const result = await this.query(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `)
    return result.rows.map(row => row.name)
  }
}

/**
 * Redis 连接
 */
class RedisConnection extends DatabaseConnection {
  private client?: RedisClientType

  async connect(): Promise<void> {
    this.client = createClient({
      socket: {
        host: this.config.host,
        port: this.config.port,
      },
      password: this.config.password || undefined,
      database: parseInt(this.config.database) || 0,
    })

    await this.client.connect()
    this.isConnected = true
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit()
      this.client = undefined
      this.isConnected = false
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client?.ping()
      return true
    } catch {
      return false
    }
  }

  async query(sql: string): Promise<QueryResult> {
    // Redis 使用命令而非 SQL，这里提供简单的键值查询支持
    if (!this.client || !this.isConnected) {
      throw new Error('数据库未连接')
    }

    const startTime = Date.now()

    try {
      // 解析简单的查询命令，如: GET key, KEYS pattern, etc.
      const parts = sql.trim().split(/\s+/)
      const command = parts[0].toUpperCase()

      let result: any
      let rows: Record<string, any>[] = []
      let columns: string[] = []

      switch (command) {
        case 'GET':
          result = await this.client.get(parts[1])
          rows = [{ key: parts[1], value: result }]
          columns = ['key', 'value']
          break
        case 'KEYS':
          const keys = parts[1] === '*' ? await this.client.keys('*') : await this.client.keys(parts[1])
          rows = keys.map(k => ({ key: k }))
          columns = ['key']
          break
        case 'DBSIZE':
          const size = await this.client.dbSize()
          rows = [{ count: size }]
          columns = ['count']
          break
        case 'INFO':
          const info = await this.client.info()
          rows = [{ info }]
          columns = ['info']
          break
        default:
          throw new Error(`不支持的 Redis 命令: ${command}。支持的命令: GET, KEYS, DBSIZE, INFO`)
      }

      const executionTime = Date.now() - startTime

      return {
        columns,
        rows,
        executionTime,
        rowCount: rows.length,
      }
    } catch (error) {
      throw new Error(`查询失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async getTables(): Promise<string[]> {
    // Redis 没有表的概念，返回数据库名
    return [`database_${this.config.database || 0}`]
  }
}

/**
 * ClickHouse 连接
 */
class ClickHouseConnection extends DatabaseConnection {
  private client?: ReturnType<typeof createClickHouseClient>

  async connect(): Promise<void> {
    this.client = createClickHouseClient({
      host: `http://${this.config.host}:${this.config.port}`,
      username: this.config.username,
      password: this.config.password,
      database: this.config.database,
    })

    // 测试连接
    await this.client.ping()
    this.isConnected = true
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = undefined
      this.isConnected = false
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client?.ping()
      return true
    } catch {
      return false
    }
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.client || !this.isConnected) {
      throw new Error('数据库未连接')
    }

    const startTime = Date.now()

    try {
      const resultSet = await this.client.query({
        query: sql,
        format: 'JSON',
      })

      const jsonResult = await resultSet.json() as { data: any[] }
      const rows = jsonResult.data || []
      const executionTime = Date.now() - startTime

      // 获取列名
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []

      return {
        columns,
        rows: rows as Record<string, any>[],
        executionTime,
        rowCount: rows.length,
      }
    } catch (error) {
      throw new Error(`查询失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async getTables(): Promise<string[]> {
    const result = await this.query(`
      SELECT name FROM system.tables
      WHERE database = '${this.config.database}'
      ORDER BY name
    `)
    return result.rows.map((row: any) => row.name)
  }
}

/**
 * 数据库管理器
 */
export class DatabaseManager {
  private connections: Map<string, DatabaseConnection> = new Map()

  /**
   * 创建数据库连接
   */
  async createConnection(config: DatabaseConfig): Promise<void> {
    const connectionId = this.getConnectionId(config)

    if (this.connections.has(connectionId)) {
      throw new Error('数据库连接已存在')
    }

    let connection: DatabaseConnection

    switch (config.type) {
      case DatabaseType.PostgreSQL:
        connection = new PostgreSQLConnection(config)
        break
      case DatabaseType.MySQL:
        connection = new MySQLConnection(config)
        break
      case DatabaseType.MongoDB:
        connection = new MongoDBConnection(config)
        break
      case DatabaseType.SQLite:
        connection = new SQLiteConnection(config)
        break
      case DatabaseType.Redis:
        connection = new RedisConnection(config)
        break
      case DatabaseType.ClickHouse:
        connection = new ClickHouseConnection(config)
        break
      case DatabaseType.SQLServer:
        throw new Error('SQL Server 支持开发中，请稍后再试')
      case DatabaseType.Oracle:
        throw new Error('Oracle 支持开发中，请稍后再试')
      case DatabaseType.Snowflake:
        throw new Error('Snowflake 支持开发中，请稍后再试')
      case DatabaseType.BigQuery:
        throw new Error('BigQuery 支持开发中，请稍后再试')
      default:
        throw new Error(`不支持的数据库类型: ${config.type}`)
    }

    await connection.connect()
    this.connections.set(connectionId, connection)
  }

  /**
   * 移除数据库连接
   */
  async removeConnection(config: DatabaseConfig): Promise<void> {
    const connectionId = this.getConnectionId(config)
    const connection = this.connections.get(connectionId)

    if (connection) {
      await connection.disconnect()
      this.connections.delete(connectionId)
    }
  }

  /**
   * 获取数据库连接
   */
  getConnection(config: DatabaseConfig): DatabaseConnection {
    const connectionId = this.getConnectionId(config)
    const connection = this.connections.get(connectionId)

    if (!connection) {
      throw new Error('数据库连接不存在')
    }

    return connection
  }

  /**
   * 测试数据库连接
   */
  async testConnection(config: DatabaseConfig): Promise<boolean> {
    const connectionId = this.getConnectionId(config)
    const connection = this.connections.get(connectionId)

    if (!connection) {
      throw new Error('数据库连接不存在')
    }

    return await connection.testConnection()
  }

  /**
   * 执行查询
   */
  async query(config: DatabaseConfig, sql: string): Promise<QueryResult> {
    const connection = this.getConnection(config)
    return await connection.query(sql)
  }

  /**
   * 获取数据库表列表
   */
  async getTables(config: DatabaseConfig): Promise<string[]> {
    const connection = this.getConnection(config)
    return await connection.getTables()
  }

  /**
   * 获取所有连接
   */
  getAllConnections(): Map<string, DatabaseConnection> {
    return this.connections
  }

  /**
   * 生成连接 ID
   */
  private getConnectionId(config: DatabaseConfig): string {
    return `${config.type}://${config.host}:${config.port}/${config.database}`
  }
}

// 单例
export const databaseManager = new DatabaseManager()
