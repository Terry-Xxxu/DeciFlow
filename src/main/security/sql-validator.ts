/**
 * SQL 安全校验系统
 * 确保只执行安全的查询操作
 */

export interface SQLValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: SQLFix[]
  originalSQL: string
  fixedSQL?: string
}

export interface SQLFix {
  description: string
  severity: 'error' | 'warning' | 'info'
  original: string
  fixed: string
}

export class SQLSecurityValidator {
  private readonly MAX_LIMIT = 10000  // 默认最大查询行数
  private readonly ALLOWED_KEYWORDS = ['SELECT', 'WITH', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'UNION', 'UNION ALL']
  private readonly FORBIDDEN_KEYWORDS = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE']
  private auditLog: Array<{ timestamp: Date; sql: string; isValid: boolean }> = []

  /**
   * 验证 SQL 安全性
   */
  validate(sql: string): SQLValidationResult {
    const trimmedSQL = sql.trim()
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: SQLFix[] = []
    let fixedSQL = trimmedSQL

    // 1. 检查是否为空
    if (!trimmedSQL) {
      return {
        isValid: false,
        errors: ['SQL 语句不能为空'],
        warnings: [],
        suggestions: [],
        originalSQL: sql,
      }
    }

    // 2. 检查是否包含危险关键词
    const upperSQL = trimmedSQL.toUpperCase()
    for (const keyword of this.FORBIDDEN_KEYWORDS) {
      if (upperSQL.includes(keyword)) {
        errors.push(`不允许执行 ${keyword} 操作，只允许 SELECT 查询`)
      }
    }

    // 如果有错误，直接返回
    if (errors.length > 0) {
      this.auditLog.push({ timestamp: new Date(), sql, isValid: false })
      return {
        isValid: false,
        errors,
        warnings,
        suggestions,
        originalSQL: sql,
      }
    }

    // 3. 检查是否以 SELECT 开头
    if (!trimmedSQL.toUpperCase().startsWith('SELECT')) {
      warnings.push('建议以 SELECT 开头')
      suggestions.push({
        description: '查询应以 SELECT 开头',
        severity: 'warning',
        original: trimmedSQL,
        fixed: `SELECT ${trimmedSQL}`,
      })
    }

    // 4. 检查是否有 LIMIT
    const hasLimit = upperSQL.includes('LIMIT')
    if (!hasLimit) {
      warnings.push('建议添加 LIMIT 限制查询结果数量')

      // 自动添加 LIMIT
      const insertPoint = trimmedSQL.lastIndexOf(';')
      if (insertPoint === -1) {
        fixedSQL = `${trimmedSQL} LIMIT ${this.MAX_LIMIT}`
      } else {
        fixedSQL = `${trimmedSQL.substring(0, insertPoint)} LIMIT ${this.MAX_LIMIT};`
      }

      suggestions.push({
        description: `自动添加 LIMIT ${this.MAX_LIMIT}`,
        severity: 'info',
        original: trimmedSQL,
        fixed: fixedSQL,
      })
    } else {
      // 检查 LIMIT 值是否过大
      const limitMatch = upperSQL.match(/LIMIT\s+(\d+)/i)
      if (limitMatch) {
        const limitValue = parseInt(limitMatch[1])
        if (limitValue > this.MAX_LIMIT) {
          warnings.push(`LIMIT ${limitValue} 超过最大值 ${this.MAX_LIMIT}`)

          // 自动修正 LIMIT
          fixedSQL = trimmedSQL.replace(/LIMIT\s+\d+/gi, `LIMIT ${this.MAX_LIMIT}`)

          suggestions.push({
            description: `自动将 LIMIT 调整为 ${this.MAX_LIMIT}`,
            severity: 'warning',
            original: trimmedSQL,
            fixed: fixedSQL,
          })
        }
      }
    }

    // 5. 检查是否有分页偏移量过大
    const offsetMatch = upperSQL.match(/OFFSET\s+(\d+)/i)
    if (offsetMatch) {
      const offsetValue = parseInt(offsetMatch[1])
      if (offsetValue > 10000) {
        warnings.push('OFFSET 值过大，可能导致查询缓慢')

        fixedSQL = trimmedSQL.replace(/OFFSET\s+\d+/gi, 'OFFSET 0')

        suggestions.push({
          description: '将 OFFSET 重置为 0',
          severity: 'warning',
          original: trimmedSQL,
          fixed: fixedSQL,
        })
      }
    }

    // 6. 检查是否有 WHERE 条件（大数据表警告）
    const hasWhere = upperSQL.includes('WHERE')
    const hasJoin = upperSQL.includes('JOIN')
    if (!hasWhere && !hasJoin) {
      warnings.push('全表扫描警告：建议添加 WHERE 条件以减少查询范围')
    }

    // 7. 检查常见的 SQL 错误
    const commonErrors = this.detectCommonSQLErrors(trimmedSQL)
    errors.push(...commonErrors.errors)
    warnings.push(...commonErrors.warnings)
    suggestions.push(...commonErrors.suggestions)

    // 8. 格式化 SQL（去除多余空格、统一大小写）
    fixedSQL = this.formatSQL(fixedSQL)

    // 记录审计日志
    this.auditLog.push({
      timestamp: new Date(),
      sql: trimmedSQL,
      isValid: errors.length === 0,
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      originalSQL: sql,
      fixedSQL: suggestions.length > 0 ? fixedSQL : undefined,
    }
  }

  /**
   * 检测常见 SQL 错误
   */
  private detectCommonSQLErrors(sql: string): {
    errors: string[]
    warnings: string[]
    suggestions: SQLFix[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: SQLFix[] = []

    // 检查 1: 未闭合的引号
    const singleQuoteCount = (sql.match(/'/g) || []).length
    const doubleQuoteCount = (sql.match(/"/g) || []).length
    if (singleQuoteCount % 2 !== 0) {
      errors.push('单引号未闭合')
    }
    if (doubleQuoteCount % 2 !== 0) {
      errors.push('双引号未闭合')
    }

    // 检查 2: 括号不匹配
    const openParens = (sql.match(/\(/g) || []).length
    const closeParens = (sql.match(/\)/g) || []).length
    if (openParens !== closeParens) {
      errors.push('括号不匹配')
    }

    // 检查 3: 常见语法错误
    if (sql.includes('* FROM') && sql.includes('GROUP BY')) {
      warnings.push('GROUP BY 通常不应该与 SELECT * 一起使用')
    }

    // 检查 4: 日期格式问题
    if (sql.includes("'2026-4-12'")) {
      // PostgreSQL 日期格式应该是 '2026-04-12'
      warnings.push('建议使用标准日期格式 YYYY-MM-DD')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 格式化 SQL
   */
  private formatSQL(sql: string): string {
    // 移除多余空格
    let formatted = sql.replace(/\s+/g, ' ').trim()

    // 确保关键字大写
    const keywords = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'UNION', 'UNION ALL', 'WITH', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'ASC', 'DESC']
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      formatted = formatted.replace(regex, keyword)
    })

    return formatted
  }

  /**
   * 尝试修复 SQL
   */
  attemptFix(sql: string): string {
    const validation = this.validate(sql)
    return validation.fixedSQL || sql
  }

  /**
   * 获取审计日志
   */
  getAuditLog(limit: number = 100): typeof this.auditLog {
    return this.auditLog.slice(-limit)
  }

  /**
   * 清空审计日志
   */
  clearAuditLog(): void {
    this.auditLog = []
  }

  /**
   * 生成查询摘要
   */
  generateQuerySummary(sql: string): {
    estimatedRows: number
    estimatedTime: number
    riskLevel: 'low' | 'medium' | 'high'
  } {
    const upperSQL = sql.toUpperCase()

    // 估算返回行数
    let estimatedRows = this.MAX_LIMIT
    const limitMatch = upperSQL.match(/LIMIT\s+(\d+)/i)
    if (limitMatch) {
      estimatedRows = Math.min(parseInt(limitMatch[1]), this.MAX_LIMIT)
    }

    // 估算查询时间（简单估算）
    let estimatedTime = 1  // 1秒基础时间
    if (upperSQL.includes('JOIN')) estimatedTime += 2
    if (upperSQL.includes('GROUP BY')) estimatedTime += 1
    if (upperSQL.includes('ORDER BY')) estimatedTime += 0.5
    if (estimatedRows > 1000) estimatedTime += 2

    // 评估风险等级
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    if (estimatedRows > 5000) riskLevel = 'high'
    else if (estimatedRows > 1000) riskLevel = 'medium'

    return {
      estimatedRows,
      estimatedTime,
      riskLevel,
    }
  }
}

// 导出单例
export const sqlSecurityValidator = new SQLSecurityValidator()
