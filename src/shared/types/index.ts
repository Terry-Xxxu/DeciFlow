// 数据源类型
export enum DatabaseType {
  PostgreSQL = 'postgresql',
  MySQL = 'mysql',
  MongoDB = 'mongodb',
  SQLServer = 'sqlserver',
  Oracle = 'oracle',
  Redis = 'redis',
  Snowflake = 'snowflake',
  BigQuery = 'bigquery',
  ClickHouse = 'clickhouse',
  SQLite = 'sqlite',
}

export interface DatabaseConfig {
  id?: string
  type: DatabaseType | string
  host: string
  port: number
  database: string
  username: string
  password: string
  name?: string
  ssl?: boolean                    // 启用 SSL/TLS（Neon、RDS、Supabase 等需要）
  sslRejectUnauthorized?: boolean  // 是否严格验证服务器证书（默认 false，自签名证书需关闭）
  isSRV?: boolean                  // mongodb+srv:// 协议（Atlas 等）
  rawConnectionString?: string     // SRV 模式下保存原始连接字符串供 MongoClient 直接使用
  filePath?: string               // 文件上传时的真实路径（仅 file 类型使用）
}

// AI 服务类型
export enum AIProvider {
  OpenAI = 'openai',
  Claude = 'claude',
  MiniMax = 'minimax',
  GLM = 'glm',
}

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  baseURL?: string
  model: string
}

// 查询结果类型
export interface QueryResult {
  columns: string[]
  rows: Record<string, any>[]
  executionTime: number
  rowCount: number
  warnings?: string[]
  fixedSQL?: string
}

// 洞察类型
export interface Insight {
  id: string
  type: 'anomaly' | 'trend' | 'opportunity'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  suggestion: string
  createdAt: Date
}

// 漏斗类型
export interface FunnelStep {
  id: string
  name: string
  count: number
  conversionRate: number
}

export interface Funnel {
  id: string
  name: string
  steps: FunnelStep[]
  overallConversionRate: number
  createdAt: Date
}

// 报表类型
export enum ChartType {
  Line = 'line',
  Bar = 'bar',
  Pie = 'pie',
  Funnel = 'funnel',
  Heatmap = 'heatmap',
}

export interface Report {
  id: string
  name: string
  chartType: ChartType
  query: string
  config: any
  createdAt: Date
}
