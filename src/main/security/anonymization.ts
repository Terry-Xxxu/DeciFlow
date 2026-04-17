/**
 * 数据脱敏层
 * 自动识别并脱敏敏感字段
 */

import { dataSecurityManager } from './data-policy'

export interface AnonymizationRule {
  pattern: RegExp
  fieldType: string
  maskMethod: (value: any) => string
}

export interface AnonymizationResult {
  original: any[]
  anonymized: any[]
  anonymizedFields: string[]
  anonymizedCount: number
}

export class DataAnonymizer {
  private rules: AnonymizationRule[] = [
    {
      pattern: /\bemail\b/i,
      fieldType: 'email',
      maskMethod: (value: string) => {
        if (typeof value !== 'string') return '***@***.com'
        const [local, domain] = value.split('@')
        if (!domain) return '***@***.com'
        const maskedLocal = local.length > 2 ? local.substring(0, 2) + '***' : '***'
        return `${maskedLocal}@${domain}`
      }
    },
    {
      pattern: /\b(phone|mobile)\b/i,
      fieldType: 'phone',
      maskMethod: (value: string) => {
        if (typeof value !== 'string') return '***********'
        if (value.length >= 11) {
          return value.substring(0, 3) + '****' + value.substring(7)
        }
        return '***********'
      }
    },
    {
      pattern: /\b(user_id|userid)\b/i,
      fieldType: 'id',
      maskMethod: (value: any) => {
        return '***_***_***'
      }
    },
    {
      pattern: /\b(id_card|ssn|identity)\b/i,
      fieldType: 'id_card',
      maskMethod: (value: string) => {
        if (typeof value !== 'string') return '**************'
        if (value.length >= 14) {
          return value.substring(0, 6) + '********' + value.substring(14)
        }
        return '**************'
      }
    },
    {
      pattern: /\bpassword\b/i,
      fieldType: 'password',
      maskMethod: () => '********'
    },
    {
      pattern: /\bname\b/i,
      fieldType: 'name',
      maskMethod: (value: string) => {
        if (typeof value !== 'string' || value.length <= 1) return '***'
        return value[0] + '**'
      }
    },
    {
      pattern: /\b(address|location)\b/i,
      fieldType: 'address',
      maskMethod: (value: string) => {
        if (typeof value !== 'string') return '***省***市***区'
        // 保留省和市，隐藏详细地址
        const parts = value.split(/[省市自治区]/)
        if (parts.length >= 2) {
          return parts[0] + parts[1] + '***'
        }
        return '***省***市***区'
      }
    },
    {
      pattern: /\b(credit_card|bank_account)\b/i,
      fieldType: 'financial',
      maskMethod: (value: string) => {
        if (typeof value !== 'string') return '**** **** **** ****'
        // 显示最后4位
        if (value.length >= 4) {
          return '**** **** **** ' + value.substring(value.length - 4)
        }
        return '**** **** **** ****'
      }
    }
  ]

  /**
   * 检测字段是否敏感
   */
  isSensitiveField(fieldName: string): boolean {
    return this.rules.some(rule => rule.pattern.test(fieldName))
  }

  /**
   * 获取字段脱敏规则
   */
  getRuleForField(fieldName: string): AnonymizationRule | null {
    return this.rules.find(rule => rule.pattern.test(fieldName)) || null
  }

  /**
   * 脱敏单条数据
   */
  anonymizeValue(fieldName: string, value: any): any {
    if (value === null || value === undefined) {
      return value
    }

    const rule = this.getRuleForField(fieldName)
    if (!rule) {
      return value
    }

    try {
      return rule.maskMethod(String(value))
    } catch {
      return '***'
    }
  }

  /**
   * 脱敏整行数据
   */
  anonymizeRow(row: Record<string, any>): Record<string, any> {
    const anonymized: Record<string, any> = {}

    for (const [key, value] of Object.entries(row)) {
      if (this.isSensitiveField(key)) {
        anonymized[key] = this.anonymizeValue(key, value)
      } else {
        anonymized[key] = value
      }
    }

    return anonymized
  }

  /**
   * 脱敏数据集
   */
  anonymizeData(
    tableName: string,
    rows: Record<string, any>[],
    enabled: boolean = true
  ): AnonymizationResult {
    if (!enabled) {
      return {
        original: rows,
        anonymized: rows,
        anonymizedFields: [],
        anonymizedCount: 0
      }
    }

    const anonymized = rows.map(row => this.anonymizeRow(row))

    // 统计被脱敏的字段
    const anonymizedFields = new Set<string>()
    let anonymizedCount = 0

    rows.forEach((row, index) => {
      Object.keys(row).forEach(key => {
        if (this.isSensitiveField(key) && row[key] !== anonymized[index][key]) {
          anonymizedFields.add(key)
          anonymizedCount++
        }
      })
    })

    return {
      original: rows,
      anonymized,
      anonymizedFields: Array.from(anonymizedFields),
      anonymizedCount
    }
  }

  /**
   * 为 AI 分析准备数据（智能脱敏）
   */
  prepareDataForAI(
    data: Record<string, any>[],
    config: { sendRawData?: boolean; anonymize?: boolean } = {}
  ): { data: Record<string, any>[]; wasAnonymized: boolean; anonymizedFields: string[] } {
    const securityConfig = dataSecurityManager.getConfig()

    // 检查是否需要脱敏
    const shouldAnonymize = config.anonymize !== false && (
      !securityConfig.sendRawDataToAI ||
      !config.sendRawData
    )

    if (!shouldAnonymize) {
      return {
        data,
        wasAnonymized: false,
        anonymizedFields: []
      }
    }

    // 检查是否是聚合数据（行数少）
    const isAggregated = data.length <= 10

    if (isAggregated) {
      // 聚合数据：只脱敏敏感字段，保留数值字段
      const result = data.map(row => {
        const anonymized: Record<string, any> = {}
        for (const [key, value] of Object.entries(row)) {
          if (this.isSensitiveField(key)) {
            anonymized[key] = this.anonymizeValue(key, value)
          } else if (typeof value === 'number') {
            // 保留数值
            anonymized[key] = value
          } else {
            anonymized[key] = value
          }
        }
        return anonymized
      })

      const anonymizedFields = Object.keys(data[0] || {}).filter(k => this.isSensitiveField(k))

      return {
        data: result,
        wasAnonymized: true,
        anonymizedFields
      }
    }

    // 详细数据：完全脱敏
    const anonymizationResult = this.anonymizeData('', data, true)

    return {
      data: anonymizationResult.anonymized,
      wasAnonymized: true,
      anonymizedFields: anonymizationResult.anonymizedFields
    }
  }

  /**
   * 生成脱敏报告
   */
  generateAnonymizationReport(result: AnonymizationResult): string {
    if (result.anonymizedFields.length === 0) {
      return '无需脱敏处理'
    }

    return `已脱敏 ${result.anonymizedCount} 个数据点，涉及字段: ${result.anonymizedFields.join(', ')}`
  }

  /**
   * 添加自定义脱敏规则
   */
  addCustomRule(rule: AnonymizationRule): void {
    this.rules.push(rule)
  }

  /**
   * 获取所有脱敏规则
   */
  getAllRules(): Array<{ fieldType: string; pattern: string }> {
    return this.rules.map(r => ({
      fieldType: r.fieldType,
      pattern: r.pattern.source
    }))
  }
}

export const dataAnonymizer = new DataAnonymizer()
