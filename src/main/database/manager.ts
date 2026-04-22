/**
 * 数据库连接管理器
 * 支持 PostgreSQL、MySQL、MongoDB、SQLite、Redis、ClickHouse 等
 */

import { Pool, PoolConfig, Client as PgClient } from 'pg'
import mysql from 'mysql2/promise'
import { MongoClient, Db } from 'mongodb'
import Database from 'better-sqlite3'
import { createClient, RedisClientType } from 'redis'
import { createClient as createClickHouseClient } from '@clickhouse/client'
import { DatabaseConfig, DatabaseType } from '../../shared/types'
import { sqlSecurityValidator } from '../security/sql-validator'
import { fileTableRegistry } from './file-registry'
import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'
import * as net from 'net'

// ─── 代理工具 ─────────────────────────────────────────────────────────────────
/** 从环境变量读取 HTTP 代理配置（WSL2 等环境常见） */
function getProxyConfig(): { host: string; port: number } | null {
  const raw = process.env.https_proxy || process.env.HTTPS_PROXY ||
              process.env.http_proxy  || process.env.HTTP_PROXY
  if (!raw) return null
  try {
    const u = new URL(raw)
    return { host: u.hostname, port: parseInt(u.port || '8080') }
  } catch { return null }
}

/** 通过 HTTP CONNECT 代理建立 TCP 隧道 */
function createTunnelSocket(
  proxy: { host: string; port: number },
  target: { host: string; port: number }
): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: proxy.host,
      port: proxy.port,
      method: 'CONNECT',
      path: `${target.host}:${target.port}`,
      headers: { Host: `${target.host}:${target.port}` },
    })
    req.on('connect', (res, socket) => {
      if (res.statusCode === 200) resolve(socket)
      else reject(new Error(`Proxy CONNECT failed: HTTP ${res.statusCode}`))
    })
    req.on('error', reject)
    req.end()
  })
}

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
 * PostgreSQL 连接（支持 HTTP CONNECT 代理，适用于 WSL2 / 企业网络等环境）
 */
class PostgreSQLConnection extends DatabaseConnection {
  private pool?: Pool
  private singleClient?: PgClient  // 代理模式下使用单连接

  /** 构建通用 pg 连接参数 */
  private buildClientConfig() {
    return {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      connectionTimeoutMillis: 12000,
      ssl: this.config.ssl
        ? { rejectUnauthorized: this.config.sslRejectUnauthorized ?? false }
        : undefined,
    }
  }

  /** 检测是否为本地地址 */
  private isLocal() {
    const h = this.config.host
    return !h || h === 'localhost' || h === '127.0.0.1' || h === '::1'
  }

  async connect(): Promise<void> {
    const proxy = getProxyConfig()

    // 存在代理且不是本地连接 → 通过 HTTP CONNECT 隧道
    if (proxy && !this.isLocal()) {
      const socket = await createTunnelSocket(proxy, { host: this.config.host, port: this.config.port })
      const cfg = this.buildClientConfig()
      // pg.Client 支持 stream 选项接入自定义 socket
      this.singleClient = new PgClient({ ...cfg, stream: socket as any })
      try {
        await this.singleClient.connect()
        this.isConnected = true
      } catch (error) {
        await this.singleClient.end().catch(() => {})
        this.singleClient = undefined
        this.isConnected = false
        throw error
      }
      return
    }

    // 无代理 → 使用连接池（更高效）
    this.pool = new Pool({ ...this.buildClientConfig(), max: 5, idleTimeoutMillis: 30000 })
    try {
      const client = await this.pool.connect()
      client.release()
      this.isConnected = true
    } catch (error) {
      await this.pool.end().catch(() => {})
      this.pool = undefined
      this.isConnected = false
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.singleClient) {
      await this.singleClient.end().catch(() => {})
      this.singleClient = undefined
    }
    if (this.pool) {
      await this.pool.end().catch(() => {})
      this.pool = undefined
    }
    this.isConnected = false
  }

  async testConnection(): Promise<boolean> {
    try {
      if (this.singleClient) {
        await this.singleClient.query('SELECT 1')
      } else {
        const client = await this.pool!.connect()
        await client.query('SELECT 1')
        client.release()
      }
      return true
    } catch {
      return false
    }
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.isConnected || (!this.pool && !this.singleClient)) {
      throw new Error('数据库未连接')
    }

    const validation = sqlSecurityValidator.validate(sql)
    if (!validation.isValid) {
      throw new Error(`SQL 安全验证失败：${validation.errors.join(', ')}`)
    }
    const querySQL = validation.fixedSQL || sql
    const startTime = Date.now()

    try {
      const result = this.singleClient
        ? await this.singleClient.query(querySQL)
        : await this.pool!.query(querySQL)

      const executionTime = Date.now() - startTime
      const columns = result.fields.map((f: any) => f.name)
      const rows = result.rows

      return { columns, rows, executionTime, rowCount: rows.length, warnings: validation.warnings }
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
      // SSL 支持：PlanetScale、TiDB Cloud、Railway、RDS 等需要
      ssl: this.config.ssl ? { rejectUnauthorized: this.config.sslRejectUnauthorized ?? false } : undefined,
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
    const cfg = this.config as any
    const clientOptions = {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    }

    if (cfg.isSRV && cfg.rawConnectionString) {
      // mongodb+srv:// — Atlas、Cosmos DB 等，必须用完整 URI（含 DNS SRV 解析）
      this.client = new MongoClient(cfg.rawConnectionString, clientOptions)
    } else {
      // 普通连接，auth 对象方式避免密码出现在日志里
      this.client = new MongoClient(`mongodb://${this.config.host}:${this.config.port}`, {
        ...clientOptions,
        auth: { username: this.config.username, password: this.config.password },
        tls: this.config.ssl,
      })
    }

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
    // 对数据库名做白名单过滤，防止 SQL 注入
    const safeName = String(this.config.database).replace(/[^a-zA-Z0-9_\-]/g, '')
    if (!safeName) throw new Error('数据库名称无效')
    const result = await this.query(`
      SELECT name FROM system.tables
      WHERE database = '${safeName}'
      ORDER BY name
    `)
    return result.rows.map((row: any) => row.name)
  }
}

// ─── Demo（内置示例数据）连接 ─────────────────────────────────────────────────
/**
 * 内置电商示例数据库（SQLite 内存数据库，随 app 启动即可使用）
 */
class DemoConnection extends DatabaseConnection {
  private db: InstanceType<typeof Database> | null = null

  async connect(): Promise<void> {
    this.db = new Database(':memory:')

    // 建表
    this.db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY, name TEXT, email TEXT,
        channel TEXT, city TEXT, status TEXT, created_at TEXT
      );
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY, user_id INTEGER, amount REAL,
        status TEXT, product_category TEXT, created_at TEXT
      );
      CREATE TABLE products (
        id INTEGER PRIMARY KEY, name TEXT, category TEXT,
        price REAL, stock INTEGER
      );
      CREATE TABLE events (
        id INTEGER PRIMARY KEY, user_id INTEGER,
        event_type TEXT, page TEXT, created_at TEXT
      );
    `)

    const channels = ['organic','paid','referral','social','email']
    const cities   = ['北京','上海','广州','深圳','杭州','成都','武汉','西安']
    const statuses = ['active','inactive','churned']
    const categories = ['电子产品','服装','食品','美妆','家居','运动']
    const eventTypes = ['view','click','add_cart','purchase','login','logout']
    const pages = ['home','product','cart','checkout','profile','search']

    const insert = this.db.transaction(() => {
      const uStmt = this.db!.prepare(
        'INSERT INTO users VALUES (?,?,?,?,?,?,?)'
      )
      for (let i = 1; i <= 500; i++) {
        const d = new Date(2023, Math.floor(Math.random()*12), Math.floor(Math.random()*28)+1)
        uStmt.run(
          i, `用户${i}`, `user${i}@example.com`,
          channels[i % channels.length],
          cities[i % cities.length],
          statuses[i % statuses.length],
          d.toISOString().slice(0,10)
        )
      }

      const pStmt = this.db!.prepare(
        'INSERT INTO products VALUES (?,?,?,?,?)'
      )
      const productNames = [
        '智能手机','笔记本电脑','蓝牙耳机','机械键盘','显示器',
        '休闲T恤','运动裤','连衣裙','羽绒服','牛仔裤',
        '有机大米','进口咖啡','坚果礼盒','红酒','绿茶',
        '保湿面霜','口红套装','香水','防晒霜','洗发水',
      ]
      productNames.forEach((name, i) => {
        pStmt.run(i+1, name, categories[Math.floor(i/4)], Math.round(50+Math.random()*500), Math.floor(10+Math.random()*200))
      })

      const oStmt = this.db!.prepare(
        'INSERT INTO orders VALUES (?,?,?,?,?,?)'
      )
      const orderStatuses = ['completed','pending','refunded','cancelled']
      for (let i = 1; i <= 2000; i++) {
        const d = new Date(2023, Math.floor(Math.random()*12), Math.floor(Math.random()*28)+1)
        oStmt.run(
          i, Math.floor(Math.random()*500)+1,
          Math.round((50+Math.random()*2000)*100)/100,
          orderStatuses[i % orderStatuses.length],
          categories[i % categories.length],
          d.toISOString().slice(0,10)
        )
      }

      const eStmt = this.db!.prepare(
        'INSERT INTO events VALUES (?,?,?,?,?)'
      )
      for (let i = 1; i <= 5000; i++) {
        const d = new Date(2023, Math.floor(Math.random()*12), Math.floor(Math.random()*28)+1)
        eStmt.run(
          i, Math.floor(Math.random()*500)+1,
          eventTypes[i % eventTypes.length],
          pages[i % pages.length],
          d.toISOString().slice(0,19).replace('T',' ')
        )
      }
    })
    insert()
    this.isConnected = true
  }

  async disconnect(): Promise<void> {
    this.db?.close()
    this.db = null
    this.isConnected = false
  }

  async testConnection(): Promise<boolean> { return true }

  async query(sql: string): Promise<QueryResult> {
    if (!this.db) throw new Error('Demo 数据库未连接')
    const start = Date.now()
    try {
      const stmt = this.db.prepare(sql)
      const rows = stmt.all() as Record<string, any>[]
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []
      return { columns, rows, executionTime: Date.now() - start, rowCount: rows.length }
    } catch (e: any) {
      throw new Error(`Demo 查询失败: ${e.message}`)
    }
  }

  async getTables(): Promise<string[]> {
    return ['users', 'orders', 'products', 'events']
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
        if ((config.type as string) === 'demo') {
          connection = new DemoConnection(config)
          break
        }
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
   * 测试数据库连接（临时连接，不保存到 connections）
   */
  async testConnection(config: DatabaseConfig): Promise<boolean> {
    const connectionId = this.getConnectionId(config)

    // 如果已有持久连接，直接复用
    const existing = this.connections.get(connectionId)
    if (existing) {
      return await existing.testConnection()
    }

    // 创建临时连接测试，完成后立即断开
    const tempConn = this.buildConnection(config)
    try {
      await tempConn.connect()
      return await tempConn.testConnection()
    } finally {
      await tempConn.disconnect().catch(() => {})
    }
  }

  /** 根据类型构造连接实例（不保存，供临时测试用）*/
  private buildConnection(config: DatabaseConfig): DatabaseConnection {
    switch (config.type) {
      case DatabaseType.PostgreSQL: return new PostgreSQLConnection(config)
      case DatabaseType.MySQL:      return new MySQLConnection(config)
      case DatabaseType.MongoDB:    return new MongoDBConnection(config)
      case DatabaseType.SQLite:     return new SQLiteConnection(config)
      case DatabaseType.Redis:      return new RedisConnection(config)
      case DatabaseType.ClickHouse: return new ClickHouseConnection(config)
      default:
        if ((config.type as string) === 'demo') return new DemoConnection(config)
        if ((config.type as string) === 'file') return new DemoConnection(config) // placeholder
        throw new Error(`不支持的数据库类型: ${config.type}`)
    }
  }

  /** Demo/File 数据库懒加载：首次访问时自动建连接并缓存 */
  private async ensureDemoConnection(config: DatabaseConfig): Promise<void> {
    const t = config.type as string
    if (t !== 'demo' && t !== 'file') return
    const connectionId = this.getConnectionId(config)
    if (!this.connections.has(connectionId)) {
      // File 类型：加载文件到注册表
      if (t === 'file') {
        const filePath = config.filePath || config.host?.replace('file://', '') || ''
        const fileName = config.database || 'file'
        if (config.id) fileTableRegistry.loadFile(config.id, filePath, fileName)
      }
      const conn = new DemoConnection(config)
      await conn.connect()
      this.connections.set(connectionId, conn)
    }
  }

  /**
   * 执行查询
   */
  async query(config: DatabaseConfig, sql: string): Promise<QueryResult> {
    if ((config.type as string) === 'file') {
      if (!config.id) throw new Error('文件数据源缺少 ID')
      // 懒加载：首次访问时自动将文件加载到注册表
      let existing = fileTableRegistry.getTablesForDb(config.id)
      if (existing.length === 0) {
        const filePath = config.filePath || config.host?.replace('file://', '') || ''
        const fileName = config.database || 'file'
        if (filePath) {
          fileTableRegistry.loadFile(config.id, filePath, fileName)
          existing = fileTableRegistry.getTablesForDb(config.id)
        }
      }
      if (existing.length === 0) {
        throw new Error(`文件 "${config.database}" 尚未加载，请重新导入该文件`)
      }
      const result = fileTableRegistry.query(config.id, sql)
      return {
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rowCount,
        executionTime: 0,
      }
    }
    await this.ensureDemoConnection(config)
    const connection = this.getConnection(config)
    return await connection.query(sql)
  }

  /**
   * 获取数据库表列表
   */
  async getTables(config: DatabaseConfig): Promise<string[]> {
    if ((config.type as string) === 'file') {
      // 懒加载：首次访问时自动将文件加载到注册表
      const existing = fileTableRegistry.getTablesForDb(config.id || '')
      if (existing.length === 0) {
        const filePath = config.filePath || config.host?.replace('file://', '') || ''
        const fileName = config.database || 'file'
        if (config.id) fileTableRegistry.loadFile(config.id, filePath, fileName)
      }
      const tables = fileTableRegistry.getTablesForDb(config.id || '')
      return tables.map(t => t.tableName)
    }
    await this.ensureDemoConnection(config)
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
