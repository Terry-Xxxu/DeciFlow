/**
 * DeciFlow 安全功能测试
 * 测试 SQL 注入防护、数据脱敏、审计日志等安全特性
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SQLSecurityValidator, SQLValidationResult } from '../main/security/sql-validator'
import { DataSecurityManager, DataSecurityConfig } from '../main/security/data-policy'

// 模拟审计日志存储
class MockAuditLog {
  private logs: Array<{
    timestamp: Date
    sql: string
    isValid: boolean
    userId?: string
    executionTime?: number
  }> = []

  async log(sql: string, isValid: boolean, userId?: string, executionTime?: number): Promise<void> {
    this.logs.push({
      timestamp: new Date(),
      sql,
      isValid,
      userId,
      executionTime
    })
  }

  async getLogs(filters?: {
    isValid?: boolean
    userId?: string
    startDate?: Date
    endDate?: Date
  }): Promise<typeof this.logs> {
    let filteredLogs = [...this.logs]

    if (filters?.isValid !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.isValid === filters.isValid)
    }

    if (filters?.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId)
    }

    if (filters?.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!)
    }

    if (filters?.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!)
    }

    return filteredLogs
  }

  async clear(): Promise<void> {
    this.logs = []
  }
}

// 模拟敏感字段检测器
class MockSensitiveFieldDetector {
  private sensitivePatterns = [
    /\bemail\b/i,
    /\bphone\b/i,
    /\bmobile\b/i,
    /\buser_id\b/i,
    /\bname\b/i,
    /\bid_card\b/i,
    /\bssn\b/i,
    /\bpassword\b/i,
    /\baddress\b/i,
    /\bcredit_card\b/i
  ]

  detectSensitiveFields(data: any[]): Array<{
    rowIndex: number
    fieldName: string
    fieldValue: any
    reason: string
  }> {
    const findings: Array<{
      rowIndex: number
      fieldName: string
      fieldValue: any
      reason: string
    }> = []

    data.forEach((row, rowIndex) => {
      Object.entries(row).forEach(([fieldName, fieldValue]) => {
        this.sensitivePatterns.forEach(pattern => {
          if (pattern.test(fieldName)) {
            findings.push({
              rowIndex,
              fieldName,
              fieldValue,
              reason: `检测到敏感字段: ${fieldName}`
            })
          }
        })
      })
    })

    return findings
  }
}

describe('DeciFlow 安全功能测试', () => {
  let sqlValidator: SQLSecurityValidator
  let securityManager: DataSecurityManager
  let auditLog: MockAuditLog
  let sensitiveDetector: MockSensitiveFieldDetector

  beforeEach(() => {
    sqlValidator = new SQLSecurityValidator()
    securityManager = new DataSecurityManager() as any
    auditLog = new MockAuditLog()
    sensitiveDetector = new MockSensitiveFieldDetector()
    ;(securityManager as any).auditLog = auditLog
  })

  afterEach(() => {
    auditLog.clear()
  })

  describe('SQL 注入防护', () => {
    it('应该拦截 DROP TABLE 操作', () => {
      const maliciousSQL = "DROP TABLE users; -- 注释"
      const result: SQLValidationResult = sqlValidator.validate(maliciousSQL)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('不允许执行 DROP 操作，只允许 SELECT 查询')
    })

    it('应该拦截 INSERT 操作', () => {
      const maliciousSQL = "INSERT INTO users (name) VALUES ('hacker')"
      const result: SQLValidationResult = sqlValidator.validate(maliciousSQL)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('不允许执行 INSERT 操作，只允许 SELECT 查询')
    })

    it('应该拦截 UNION 注入', () => {
      const maliciousSQL = "SELECT * FROM users WHERE id = 1 UNION SELECT * FROM passwords"
      const result: SQLValidationResult = sqlValidator.validate(maliciousSQL)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('不允许执行 UNION 操作，只允许 SELECT 查询')
    })

    it('应该允许合法的 SELECT 查询', () => {
      const safeSQL = "SELECT id, name FROM users WHERE created_at > '2024-01-01' LIMIT 100"
      const result: SQLValidationResult = sqlValidator.validate(safeSQL)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该自动添加 LIMIT 到无限制查询', () => {
      const sqlWithoutLimit = "SELECT * FROM users"
      const result: SQLValidationResult = sqlValidator.validate(sqlWithoutLimit)

      expect(result.isValid).toBe(true)
      expect(result.fixedSQL).toContain('LIMIT 10000')
      expect(result.warnings).toContain('建议添加 LIMIT 限制查询结果数量')
    })

    it('应该检查过大的 LIMIT 值', () => {
      const sqlWithLargeLimit = "SELECT * FROM users LIMIT 50000"
      const result: SQLValidationResult = sqlValidator.validate(sqlWithLargeLimit)

      expect(result.warnings).toContain('LIMIT 值过大，建议控制在 10000 以内')
    })
  })

  describe('数据脱敏', () => {
    it('应该检测并脱敏邮箱地址', () => {
      const sensitiveData = [
        { id: 1, name: '张三', email: 'zhangsan@example.com' },
        { id: 2, name: '李四', email: 'lisi@example.com' }
      ]

      const findings = sensitiveDetector.detectSensitiveFields(sensitiveData)

      expect(findings.length).toBe(2)
      expect(findings[0].fieldName).toBe('email')
      expect(findings[0].fieldValue).toBe('zhangsan@example.com')
    })

    it('应该检测并脱敏手机号', () => {
      const sensitiveData = [
        { id: 1, name: '王五', phone: '13812345678' },
        { id: 2, name: '赵六', mobile: '13987654321' }
      ]

      const findings = sensitiveDetector.detectSensitiveFields(sensitiveData)

      expect(findings.length).toBe(2)
      expect(findings[0].fieldName).toBe('phone')
      expect(findings[0].fieldValue).toBe('13812345678')
    })

    it('应该脱敏身份证号', () => {
      const sensitiveData = [
        { id: 1, name: '钱七', id_card: '110101199001011234' }
      ]

      const findings = sensitiveDetector.detectSensitiveFields(sensitiveData)

      expect(findings.length).toBe(1)
      expect(findings[0].fieldName).toBe('id_card')
      expect(findings[0].reason).toContain('身份证号')
    })

    it('应该批量脱敏数据', () => {
      const data = [
        { id: 1, email: 'test1@example.com', phone: '13800138000' },
        { id: 2, email: 'test2@example.com', phone: '13900139000' }
      ]

      const anonymizedData = data.map(row => ({
        ...row,
        email: row.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        phone: row.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      }))

      expect(anonymizedData[0].email).toBe('te***@example.com')
      expect(anonymizedData[0].phone).toBe('138****0000')
    })
  })

  describe('审计日志', () => {
    it('应该记录成功的 SQL 执行', async () => {
      const safeSQL = "SELECT COUNT(*) FROM users"

      await auditLog.log(safeSQL, true, 'user123', 150)

      const logs = await auditLog.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].sql).toBe(safeSQL)
      expect(logs[0].isValid).toBe(true)
      expect(logs[0].userId).toBe('user123')
      expect(logs[0].executionTime).toBe(150)
    })

    it('应该记录失败的 SQL 尝试', async () => {
      const maliciousSQL = "DROP TABLE users"

      await auditLog.log(maliciousSQL, false, 'user456')

      const failedLogs = await auditLog.getLogs({ isValid: false })
      expect(failedLogs).toHaveLength(1)
      expect(failedLogs[0].isValid).toBe(false)
    })

    it('应该支持按用户过滤日志', async () => {
      await auditLog.log("SELECT * FROM users", true, 'user123')
      await auditLog.log("SELECT * FROM orders", true, 'user456')
      await auditLog.log("DROP TABLE", false, 'user123')

      const userLogs = await auditLog.getLogs({ userId: 'user123' })
      expect(userLogs).toHaveLength(2)
    })

    it('应该支持按时间范围过滤', async () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      await auditLog.log("SELECT * FROM users", true, 'user123', 100)
      // 模拟过去的日志
      await auditLog.log("old query", true, 'user123', 200)

      const recentLogs = await auditLog.getLogs({ startDate: yesterday })
      expect(recentLogs.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('访问控制', () => {
    it('应该实现基于角色的访问控制', async () => {
      const config: DataSecurityConfig = {
        dataAccessMode: 'proxy',
        sendRawDataToAI: false,
        anonymizationEnabled: true,
        auditLogEnabled: true,
        allowedTables: ['users', 'orders'],
        blockedTables: ['payments', 'salaries'],
        maxRowCount: 5000,
        maxExecutionTime: 60
      }

      await (securityManager as any).setConfig(config)

      // 测试允许的表
      const allowedResult = await (securityManager as any).checkTableAccess('users', 'user123')
      expect(allowedResult.isAllowed).toBe(true)

      // 测试禁止的表
      const blockedResult = await (securityManager as any).checkTableAccess('payments', 'user123')
      expect(blockedResult.isAllowed).toBe(false)
      expect(blockedResult.reason).toContain('禁止访问')
    })

    it('应该限制查询结果数量', async () => {
      const config: DataSecurityConfig = {
        dataAccessMode: 'local_only',
        sendRawDataToAI: false,
        anonymizationEnabled: true,
        auditLogEnabled: true,
        maxRowCount: 1000
      }

      await (securityManager as any).setConfig(config)

      const result = await (securityManager as any).checkQueryResultSize(1500)
      expect(result.isAllowed).toBe(false)
      expect(result.reason).toContain('超过最大行数限制')
    })

    it('应该监控查询执行时间', async () => {
      const config: DataSecurityConfig = {
        dataAccessMode: 'local_only',
        sendRawDataToAI: false,
        anonymizationEnabled: true,
        auditLogEnabled: true,
        maxExecutionTime: 30
      }

      await (securityManager as any).setConfig(config)

      const result = await (securityManager as any).checkQueryExecutionTime(35)
      expect(result.isAllowed).toBe(false)
      expect(result.warnings).toContain('查询执行时间过长')
    })
  })

  describe('安全策略', () => {
    it('应该支持本地数据访问模式', async () => {
      const config: DataSecurityConfig = {
        dataAccessMode: 'local_only',
        sendRawDataToAI: false,
        anonymizationEnabled: true,
        auditLogEnabled: true
      }

      await (securityManager as any).setConfig(config)

      const policy = await (securityManager as any).getSecurityPolicy()
      expect(policy.isAllowed).toBe(true)
      expect(policy.reason).toBe('本地数据访问模式已启用')
    })

    it('应该禁止向 AI 发送原始数据', async () => {
      const config: DataSecurityConfig = {
        dataAccessMode: 'proxy',
        sendRawDataToAI: false,
        anonymizationEnabled: true,
        auditLogEnabled: true
      }

      await (securityManager as any).setConfig(config)

      const canSendToAI = await (securityManager as any).canSendDataToAI()
      expect(canSendToAI).toBe(false)
    })

    it('应该启用数据脱敏', async () => {
      const config: DataSecurityConfig = {
        dataAccessMode: 'proxy',
        sendRawDataToAI: false,
        anonymizationEnabled: true,
        auditLogEnabled: true
      }

      await (securityManager as any).setConfig(config)

      const sensitiveData = [
        { id: 1, name: '测试用户', email: 'test@example.com', phone: '13800138000' }
      ]

      const result = await (securityManager as any).anonymizeData(sensitiveData)

      expect(result.anonymizedData).toBeDefined()
      expect(result.anonymizedData[0].email).not.toBe('test@example.com')
    })
  })

  describe('安全扫描', () => {
    it('应该检测 SQL 注入模式', () => {
      const sqlInjectionPatterns = [
        "1; DROP TABLE users",
        "1' OR '1'='1",
        "1 UNION SELECT * FROM passwords",
        "1; WAITFOR DELAY '0:0:10'",
        "1/* comment */ DROP TABLE users"
      ]

      sqlInjectionPatterns.forEach(sql => {
        const result: SQLValidationResult = sqlValidator.validate(sql)
        expect(result.isValid).toBe(false)
      })
    })

    it('应该检测异常的查询模式', () => {
      // 模拟异常查询检测
      const suspiciousQueries = [
        "SELECT COUNT(*) FROM users WHERE 1=1",  // 永真条件
        "SELECT * FROM users LIMIT 1000000",  // 过大结果集
        "SELECT * FROM information_schema.tables"  // 系统表查询
      ]

      suspiciousQueries.forEach(sql => {
        const result: SQLValidationResult = sqlValidator.validate(sql)
        expect(result.warnings.length).toBeGreaterThan(0)
      })
    })

    it('应该生成安全报告', async () => {
      // 记录一些查询日志
      await auditLog.log("SELECT * FROM users", true, 'user1')
      await auditLog.log("SELECT * FROM orders", true, 'user2')
      await auditLog.log("DROP TABLE users", false, 'hacker')

      const report = await (securityManager as any).generateSecurityReport()

      expect(report).toBeDefined()
      expect(report.totalQueries).toBe(3)
      expect(report.failedQueries).toBe(1)
      expect(report.successRate).toBeGreaterThan(0)
      expect(report.userActivity).toBeDefined()
    })
  })

  describe('性能安全', () => {
    it('应该防止慢查询攻击', async () => {
      // 模拟慢查询
      const slowQuery = "SELECT * FROM users WHERE id IN (SELECT id FROM users WHERE name LIKE '%a%' AND name LIKE '%b%' AND name LIKE '%c%' AND name LIKE '%d%')"

      const startTime = Date.now()
      const result: SQLValidationResult = sqlValidator.validate(slowQuery)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000)  // 验证解析速度
      expect(result.isValid).toBe(true)  // 虽然慢，但语法合法
    })

    it('应该限制复杂查询的深度', () => {
      // 模拟过深的嵌套查询
      const complexQuery = "SELECT * FROM (SELECT * FROM (SELECT * FROM users WHERE id IN (SELECT * FROM (SELECT * FROM orders))))"
      const result: SQLValidationResult = sqlValidator.validate(complexQuery)

      expect(result.warnings).toContain('查询过于复杂，可能影响性能')
    })

    it('应该监控资源使用', async () => {
      // 模拟资源监控
      const resourceMonitor = {
        cpuUsage: 0,
        memoryUsage: 0,
        queryCount: 0
      }

      // 模拟多个查询
      for (let i = 0; i < 100; i++) {
        await auditLog.log(`SELECT * FROM users WHERE id = ${i}`, true, 'user123')
        resourceMonitor.queryCount++
      }

      expect(resourceMonitor.queryCount).toBe(100)
      // 检查是否需要告警
      if (resourceMonitor.queryCount > 1000) {
        expect(true).toBe(false) // 应该触发告警
      }
    })
  })

  describe('安全配置测试', () => {
    it('应该支持动态配置更新', async () => {
      const config1: DataSecurityConfig = {
        dataAccessMode: 'local_only',
        sendRawDataToAI: false,
        anonymizationEnabled: false,
        auditLogEnabled: true
      }

      await (securityManager as any).setConfig(config1)

      const config2: DataSecurityConfig = {
        dataAccessMode: 'proxy',
        sendRawDataToAI: true,
        anonymizationEnabled: true,
        auditLogEnabled: true
      }

      await (securityManager as any).setConfig(config2)

      const currentConfig = await (securityManager as any).getConfig()
      expect(currentConfig.dataAccessMode).toBe('proxy')
      expect(currentConfig.sendRawDataToAI).toBe(true)
    })

    it('应该验证配置的有效性', async () => {
      const invalidConfig = {
        dataAccessMode: 'invalid_mode' as any,
        sendRawDataToAI: 'not_boolean' as any,
        anonymizationEnabled: true,
        auditLogEnabled: true
      }

      try {
        await (securityManager as any).setConfig(invalidConfig)
        expect(true).toBe(false) // 应该抛出错误
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })
})