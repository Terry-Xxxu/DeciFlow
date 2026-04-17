/**
 * 敏感字段检测器
 * 自动识别数据库中的敏感字段，如邮箱、手机号、身份证、密码等
 */

export interface SensitiveField {
  tableName: string
  columnName: string
  fieldType: SensitiveFieldType
  confidence: 'high' | 'medium' | 'low'
  sampleValue?: string
  recommendation: string
}

export type SensitiveFieldType =
  | 'email'
  | 'phone'
  | 'id_card'
  | 'password'
  | 'credit_card'
  | 'address'
  | 'name'
  | 'ssn'
  | 'secret_key'
  | 'other'

export interface SensitiveFieldDetectionResult {
  sensitiveFields: SensitiveField[]
  totalFields: number
  riskLevel: 'low' | 'medium' | 'high'
  recommendations: string[]
}

/**
 * 敏感字段检测器
 */
export class SensitiveFieldDetector {
  // 字段名称模式映射
  private readonly fieldPatterns: Map<SensitiveFieldType, RegExp[]> = new Map([
    ['email', [
      /\bemail\b/i,
      /\bmail\b/i,
      /\bmailto\b/i,
      /\bcontact.*email\b/i
    ]],
    ['phone', [
      /\bphone\b/i,
      /\bmobile\b/i,
      /\bcell\b/i,
      /\btelephone\b/i,
      /\bcontact.*phone\b/i,
      /\b\d{11}\b/ // 11位数字
    ]],
    ['password', [
      /\bpassword\b/i,
      /\bpasswd\b/i,
      /\bpwd\b/i,
      /\bsecret\b/i,
      /\bhash\b/i
    ]],
    ['id_card', [
      /\bid_card\b/i,
      /\bidcard\b/i,
      /\bidentity\b/i,
      /\bssn\b/i, // 社会安全号
      /\bnational_id\b/i
    ]],
    ['credit_card', [
      /\bcredit_card\b/i,
      /\bcreditcard\b/i,
      /\bcc_number\b/i,
      /\bcard_number\b/i,
      /\bcvv\b/i
    ]],
    ['address', [
      /\baddress\b/i,
      /\blocation\b/i,
      /\bstreet\b/i,
      /\bcity\b/i,
      /\bstate\b/i,
      /\bzip\b/i,
      /\bpostal\b/i
    ]],
    ['name', [
      /\bname\b/i,
      /\busername\b/i,
      /\buser_name\b/i,
      /\bfullname\b/i,
      /\breal_name\b/i
    ]],
    ['secret_key', [
      /\bapi_key\b/i,
      /\bapikey\b/i,
      /\bsecret\b/i,
      /\btoken\b/i,
      /\bkey\b/i
    ]]
  ])

  // 数据类型模式
  private readonly dataTypePatterns: Map<SensitiveFieldType, RegExp[]> = new Map([
    ['email', [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    ]],
    ['phone', [
      /^\+?[\d\s\-()]{10,20}$/
    ]],
    ['credit_card', [
      /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/
    ]]
  ])

  /**
   * 检测表中的敏感字段
   */
  async detectSensitiveFields(
    tableName: string,
    columns: Array<{ name: string; type: string }>,
    sampleData: Record<string, any>[]
  ): Promise<SensitiveFieldDetectionResult> {
    const sensitiveFields: SensitiveField[] = []

    for (const column of columns) {
      const detection = this.detectColumn(tableName, column.name, column.type, sampleData)
      if (detection) {
        sensitiveFields.push(detection)
      }
    }

    // 计算风险等级
    const riskLevel = this.calculateRiskLevel(sensitiveFields, columns.length)

    // 生成建议
    const recommendations = this.generateRecommendations(sensitiveFields)

    return {
      sensitiveFields,
      totalFields: columns.length,
      riskLevel,
      recommendations
    }
  }

  /**
   * 检测单个字段
   */
  private detectColumn(
    tableName: string,
    columnName: string,
    columnType: string,
    sampleData: Record<string, any>[]
  ): SensitiveField | null {
    let bestMatch: SensitiveField | null = null
    let bestScore = 0

    // 检查字段名模式
    for (const [fieldType, patterns] of this.fieldPatterns.entries()) {
      for (const pattern of patterns) {
        if (pattern.test(columnName)) {
          let confidence: 'high' | 'medium' | 'low' = 'medium'

          // 根据匹分位置调整置信度
          if (columnName.toLowerCase() === fieldType.toLowerCase() ||
              columnName.toLowerCase() === fieldType + '_id') {
            confidence = 'high'
          } else if (columnName.toLowerCase().includes(fieldType.toLowerCase())) {
            confidence = 'medium'
          } else {
            confidence = 'low'
          }

          // 检查样本值确认
          const sampleValue = this.getSampleValue(columnName, sampleData)
          if (sampleValue) {
            const valueMatch = this.checkValuePattern(fieldType, sampleValue)
            if (valueMatch) {
              confidence = confidence === 'high' ? 'high' : 'medium'
            }
          }

          const score = this.calculateConfidenceScore(confidence)
          if (score > bestScore) {
            bestMatch = {
              tableName,
              columnName,
              fieldType,
              confidence,
              sampleValue,
              recommendation: this.getRecommendation(fieldType)
            }
            bestScore = score
          }
        }
      }
    }

    return bestMatch
  }

  /**
   * 获取样本值
   */
  private getSampleValue(columnName: string, sampleData: Record<string, any>[]): string | undefined {
    for (const row of sampleData) {
      const value = row[columnName]
      if (value != null && value !== '') {
        return String(value)
      }
    }
    return undefined
  }

  /**
   * 检查值模式
   */
  private checkValuePattern(fieldType: SensitiveFieldType, value: string): boolean {
    const patterns = this.dataTypePatterns.get(fieldType)
    if (!patterns) return false

    return patterns.some(pattern => pattern.test(value))
  }

  /**
   * 计算置信度分数
   */
  private calculateConfidenceScore(confidence: 'high' | 'medium' | 'low'): number {
    const scores = { high: 3, medium: 2, low: 1 }
    return scores[confidence]
  }

  /**
   * 计算风险等级
   */
  private calculateRiskLevel(
    sensitiveFields: SensitiveField[],
    totalFields: number
  ): 'low' | 'medium' | 'high' {
    if (sensitiveFields.length === 0) return 'low'

    const highRiskFields = sensitiveFields.filter(f => f.confidence === 'high')
    const mediumRiskFields = sensitiveFields.filter(f => f.confidence === 'medium')

    // 有密码或密钥字段，高风险
    const hasSecrets = sensitiveFields.some(f =>
      f.fieldType === 'password' || f.fieldType === 'secret_key' || f.fieldType === 'credit_card'
    )
    if (hasSecrets) return 'high'

    // 高置信度敏感字段超过3个，高风险
    if (highRiskFields.length >= 3) return 'high'

    // 中等置信度敏感字段超过5个，中等风险
    if (mediumRiskFields.length >= 5) return 'medium'

    // 敏感字段占比超过30%，中等风险
    if (sensitiveFields.length / totalFields > 0.3) return 'medium'

    return 'medium'
  }

  /**
   * 生成建议
   */
  private generateRecommendations(sensitiveFields: SensitiveField[]): string[] {
    const recommendations: string[] = []

    const fieldTypes = new Set(sensitiveFields.map(f => f.fieldType))

    if (fieldTypes.has('password') || fieldTypes.has('secret_key')) {
      recommendations.push('⚠️ 检测到密码或密钥字段，建议使用只读权限访问')
    }

    if (fieldTypes.has('email') || fieldTypes.has('phone')) {
      recommendations.push('建议对邮箱和手机号字段进行脱敏处理')
    }

    if (fieldTypes.has('id_card') || fieldTypes.has('ssn')) {
      recommendations.push('⚠️ 检测到身份证号字段，请确保数据访问符合隐私法规')
    }

    if (fieldTypes.has('credit_card')) {
      recommendations.push('🚨 检测到信用卡号字段，强烈建议使用脱敏查询')
    }

    if (sensitiveFields.length > 0) {
      recommendations.push('查询时请注意保护敏感信息，避免在导出结果中包含敏感数据')
    }

    return recommendations
  }

  /**
   * 获取建议
   */
  private getRecommendation(fieldType: SensitiveFieldType): string {
    const recommendations: Record<SensitiveFieldType, string> = {
      email: '建议脱敏显示，如：u***@example.com',
      phone: '建议脱敏显示，如：138****5678',
      id_card: '建议脱敏显示，如：110101********1234',
      password: '⚠️ 密码字段不应被查询',
      credit_card: '🚨 信用卡号应严格保护',
      address: '地址信息属于隐私，建议限制访问',
      name: '姓名属于个人隐私，建议脱敏',
      ssn: '🚨 社会安全号应严格保护',
      secret_key: '⚠️ 密钥字段不应被查询',
      other: '建议确认是否需要脱敏'
    }
    return recommendations[fieldType]
  }

  /**
   * 生成脱敏SQL
   */
  generateMaskedSQL(
    tableName: string,
    sensitiveFields: SensitiveField[],
    columns: string[]
  ): string {
    const selectClauses: string[] = []

    for (const column of columns) {
      const sensitive = sensitiveFields.find(f => f.columnName === column)
      if (sensitive) {
        // 生成脱敏SQL
        selectClauses.push(this.generateMaskedColumn(column, sensitive.fieldType))
      } else {
        selectClauses.push(`"${column}"`)
      }
    }

    return `SELECT ${selectClauses.join(', ')} FROM "${tableName}" LIMIT 1000;`
  }

  /**
   * 生成脱敏列
   */
  private generateMaskedColumn(column: string, fieldType: SensitiveFieldType): string {
    const dbType = 'postgresql' // 可以根据实际数据库类型调整

    switch (fieldType) {
      case 'email':
        // PostgreSQL: CONCAT(LEFT(email, 1), '***', SUBSTRING(email FROM '@'))
        return `CONCAT(LEFT("${column}", 1), '***', SUBSTRING("${column}" FROM '@')) AS "${column}"`
      case 'phone':
        // PostgreSQL: CONCAT(SUBSTRING(phone, 1, 3), '****', SUBSTRING(phone, -4))
        return `CONCAT(SUBSTRING("${column}", 1, 3), '****', SUBSTRING("${column}", -4)) AS "${column}"`
      case 'id_card':
        // PostgreSQL: CONCAT(SUBSTRING(id_card, 1, 6), '********', SUBSTRING(id_card, -4))
        return `CONCAT(SUBSTRING("${column}", 1, 6), '********', SUBSTRING("${column}", -4)) AS "${column}"`
      default:
        return `LEFT("${column}", 1) || '***' AS "${column}"`
    }
  }
}

// 导出单例
export const sensitiveFieldDetector = new SensitiveFieldDetector()
