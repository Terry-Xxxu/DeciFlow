/**
 * 渲染进程的类型定义
 * 避免跨边界的导入问题
 */

export enum DatabaseType {
  PostgreSQL = 'postgresql',
  MySQL = 'mysql',
  MongoDB = 'mongodb',
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
