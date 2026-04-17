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
  type: DatabaseType | string
  host: string
  port: number
  database: string
  username: string
  password: string
  name?: string
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
