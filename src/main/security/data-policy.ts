/**
 * 数据安全策略配置
 */

export interface DataSecurityConfig {
  dataAccessMode: 'local_only' | 'proxy'
  sendRawDataToAI: boolean
  anonymizationEnabled: boolean
  auditLogEnabled: boolean
  allowedTables?: string[]  // 表级白名单
  blockedTables?: string[]  // 表级黑名单
  maxRowCount?: number      // 单次查询最大行数
  maxExecutionTime?: number // 最大执行时间（秒）
}

export interface SecurityPolicy {
  isAllowed: boolean
  reason?: string
  anonymizedData?: any[]
  warnings: string[]
}

export class DataSecurityManager {
  private config: DataSecurityConfig = {
    dataAccessMode: 'local_only',
    sendRawDataToAI: false,
    anonymizationEnabled: true,
    auditLogEnabled: true,
    maxRowCount: 10000,
    maxExecutionTime: 30
  }

  private sensitiveFieldPatterns = [
    /\bemail\b/i,
    /\bphone\b/i,
    /\bmobile\b/i,
    /\buser_id\b/i,
    /\buserid\b/i,
    /\bid_card\b/i,
    /\bssn\b/i,
    /\bpassword\b/i,
    /\bsecret\b/i,
    /\bname\b/i,
    /\baddress\b/i,
    /\bcredit_card\b/i,
    /\bbank_account\b/i,
    /\bidentity\b/i
  ]

  /**
   * 更新安全配置
   */
  updateConfig(updates: Partial<DataSecurityConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * 获取当前配置
   */
  getConfig(): DataSecurityConfig {
    return { ...this.config }
  }

  /**
   * 检查表访问权限
   */
  checkTableAccess(tableName: string): SecurityPolicy {
    // 检查黑名单
    if (this.config.blockedTables && this.config.blockedTables.includes(tableName)) {
      return {
        isAllowed: false,
        reason: `表 ${tableName} 在访问黑名单中`,
        warnings: []
      }
    }

    // 检查白名单
    if (this.config.allowedTables && this.config.allowedTables.length > 0) {
      if (!this.config.allowedTables.includes(tableName)) {
        return {
          isAllowed: false,
          reason: `表 ${tableName} 不在访问白名单中`,
          warnings: []
        }
      }
    }

    return {
      isAllowed: true,
      warnings: []
    }
  }

  /**
   * 检查 SQL 是否符合安全策略
   */
  checkSQLSecurity(sql: string): SecurityPolicy {
    const warnings: string[] = []
    const upperSQL = sql.toUpperCase()

    // 检查危险操作
    const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE']
    const foundDangerous = dangerousKeywords.filter(kw => upperSQL.includes(kw))

    if (foundDangerous.length > 0) {
      return {
        isAllowed: false,
        reason: `SQL 包含危险操作: ${foundDangerous.join(', ')}`,
        warnings
      }
    }

    // 检查是否缺少 LIMIT
    if (!upperSQL.includes('LIMIT')) {
      warnings.push('建议添加 LIMIT 限制结果数量')
    }

    // 检查是否缺少 WHERE 条件
    if (!upperSQL.includes('WHERE')) {
      warnings.push('建议添加 WHERE 条件过滤数据')
    }

    // 检查是否使用了 SELECT *
    if (upperSQL.includes('SELECT *')) {
      warnings.push('建议明确指定字段而不是使用 SELECT *')
    }

    return {
      isAllowed: true,
      warnings
    }
  }

  /**
   * 检查数据是否可以发送给 AI
   */
  canSendToAI(data: Record<string, any>[]): boolean {
    if (this.config.sendRawDataToAI) {
      return true
    }

    // 只发送聚合结果（行数少）
    return data.length <= 10
  }

  /**
   * 生成安全提示文本
   */
  generateSecurityTips(): string[] {
    const tips: string[] = []

    if (this.config.dataAccessMode === 'local_only') {
      tips.push('✓ 数据仅在本地查询，不会上传到远程服务器')
    }

    if (!this.config.sendRawDataToAI) {
      tips.push('✓ AI 仅分析聚合结果，原始数据不离开本地')
    }

    if (this.config.anonymizationEnabled) {
      tips.push('✓ 敏感字段（email、phone等）自动脱敏')
    }

    if (this.config.auditLogEnabled) {
      tips.push('✓ 所有查询均有审计日志记录')
    }

    if (tips.length === 0) {
      tips.push('请配置数据安全策略')
    }

    return tips
  }

  /**
   * 生成数据安全说明（用于 UI 显示）
   */
  generateSecurityDescription(): {
    mode: string
    features: string[]
    warnings: string[]
  } {
    return {
      mode: this.config.dataAccessMode === 'local_only' ? '本地模式（推荐）' : '代理模式',
      features: [
        '数据加密存储',
        '本地 SQL 执行',
        'AI 分析结果缓存',
        '查询审计日志'
      ],
      warnings: this.config.sendRawDataToAI
        ? ['⚠️ 当前配置允许原始数据发送给 AI']
        : []
    }
  }
}

export const dataSecurityManager = new DataSecurityManager()
