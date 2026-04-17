/**
 * 查询审计日志系统 V2
 * 记录所有查询操作用于安全和分析
 */

export interface AuditLogEntry {
  // 基本信息
  id: string
  timestamp: Date

  // 查询信息
  userQuery: string          // 用户的自然语言查询
  generatedSQL: string       // 生成的 SQL
  sqlModified: boolean       // SQL 是否被修改（如自动添加 LIMIT）

  // 执行信息
  executionTime: number      // 执行耗时（毫秒）
  rowCount: number          // 返回行数
  success: boolean          // 是否成功
  errorMessage?: string     // 错误信息

  // 数据信息
  tablesUsed: string[]       // 使用的表
  metricUsed?: string       // 使用的指标

  // 安全信息
  wasAnonymized: boolean    // 是否进行了数据脱敏
  confidenceScore?: number  // 可信度分数

  // 用户信息（可选）
  userId?: string
  sessionId?: string
}

export interface AuditLogStats {
  totalQueries: number
  successRate: number
  avgExecutionTime: number
  avgRowCount: number
  topTables: Array<{ table: string; count: number }>
  topMetrics: Array<{ metric: string; count: number }>
  queriesByHour: Array<{ hour: number; count: number }>
}

export class AuditLoggerV2 {
  private logs: AuditLogEntry[] = []
  private maxLogs = 10000  // 最多保存 10000 条日志

  /**
   * 记录查询
   */
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const logEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }

    this.logs.push(logEntry)

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  /**
   * 获取日志
   */
  getLogs(limit: number = 100, offset: number = 0): AuditLogEntry[] {
    return this.logs
      .slice(-offset - limit, -offset || undefined)
      .reverse()  // 最新的在前
  }

  /**
   * 按时间范围获取日志
   */
  getLogsByTimeRange(startDate: Date, endDate: Date): AuditLogEntry[] {
    return this.logs.filter(
      log => log.timestamp >= startDate && log.timestamp <= endDate
    )
  }

  /**
   * 按用户获取日志
   */
  getLogsByUser(userId: string, limit: number = 100): AuditLogEntry[] {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(-limit)
      .reverse()
  }

  /**
   * 按表获取日志
   */
  getLogsByTable(tableName: string, limit: number = 100): AuditLogEntry[] {
    return this.logs
      .filter(log => log.tablesUsed.includes(tableName))
      .slice(-limit)
      .reverse()
  }

  /**
   * 生成统计信息
   */
  generateStats(timeRange?: { start: Date; end: Date }): AuditLogStats {
    let filteredLogs = this.logs

    if (timeRange) {
      filteredLogs = this.logs.filter(
        log => log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
      )
    }

    if (filteredLogs.length === 0) {
      return {
        totalQueries: 0,
        successRate: 0,
        avgExecutionTime: 0,
        avgRowCount: 0,
        topTables: [],
        topMetrics: [],
        queriesByHour: []
      }
    }

    // 总查询数
    const totalQueries = filteredLogs.length

    // 成功率
    const successCount = filteredLogs.filter(l => l.success).length
    const successRate = (successCount / totalQueries) * 100

    // 平均执行时间
    const totalExecutionTime = filteredLogs.reduce((sum, l) => sum + l.executionTime, 0)
    const avgExecutionTime = totalExecutionTime / totalQueries

    // 平均行数
    const totalRowCount = filteredLogs.reduce((sum, l) => sum + l.rowCount, 0)
    const avgRowCount = totalRowCount / totalQueries

    // Top 表
    const tableCounts = new Map<string, number>()
    filteredLogs.forEach(log => {
      log.tablesUsed.forEach(table => {
        tableCounts.set(table, (tableCounts.get(table) || 0) + 1)
      })
    })
    const topTables = Array.from(tableCounts.entries())
      .map(([table, count]) => ({ table, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Top 指标
    const metricCounts = new Map<string, number>()
    filteredLogs.forEach(log => {
      if (log.metricUsed) {
        metricCounts.set(log.metricUsed, (metricCounts.get(log.metricUsed) || 0) + 1)
      }
    })
    const topMetrics = Array.from(metricCounts.entries())
      .map(([metric, count]) => ({ metric, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 按小时统计
    const hourlyCounts = new Map<number, number>()
    filteredLogs.forEach(log => {
      const hour = log.timestamp.getHours()
      hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1)
    })
    const queriesByHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourlyCounts.get(hour) || 0
    }))

    return {
      totalQueries,
      successRate,
      avgExecutionTime,
      avgRowCount,
      topTables,
      topMetrics,
      queriesByHour
    }
  }

  /**
   * 导出日志为 JSON
   */
  exportLogsJSON(format: 'pretty' | 'compact' = 'pretty'): string {
    return JSON.stringify(
      this.logs,
      null,
      format === 'pretty' ? 2 : 0
    )
  }

  /**
   * 导出日志为 CSV
   */
  exportLogsCSV(): string {
    if (this.logs.length === 0) {
      return ''
    }

    const headers = Object.keys(this.logs[0])
    const csvRows = [
      headers.join(','),
      ...this.logs.map(log =>
        headers.map(header => {
          const value = log[header as keyof AuditLogEntry]
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`
          }
          return String(value)
        }).join(',')
      )
    ]

    return csvRows.join('\n')
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * 删除指定时间之前的日志
   */
  deleteLogsBefore(date: Date): number {
    const beforeCount = this.logs.length
    this.logs = this.logs.filter(log => log.timestamp >= date)
    return beforeCount - this.logs.length
  }

  /**
   * 获取日志摘要
   */
  getSummary(limit: number = 10): {
    recent: AuditLogEntry[]
    failed: AuditLogEntry[]
    slowest: AuditLogEntry[]
  } {
    const recent = this.getLogs(limit)

    const failed = this.logs
      .filter(l => !l.success)
      .slice(-limit)
      .reverse()

    const slowest = [...this.logs]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit)

    return { recent, failed, slowest }
  }
}

export const auditLoggerV2 = new AuditLoggerV2()
