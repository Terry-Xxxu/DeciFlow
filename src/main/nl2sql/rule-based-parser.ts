/**
 * 基于规则的自然语言转SQL解析器
 * 在没有AI配置时使用，提供基础的查询功能
 */

export interface ParsedQuery {
  sql: string
  confidence: number
  matchedPattern?: string
  error?: string
}

interface RulePattern {
  pattern: RegExp
  template: (matches: RegExpMatchArray) => string
  confidence: number
  description: string
}

export class RuleBasedNL2SQLParser {
  private rules: RulePattern[] = []
  private tableName: string = 'users'
  private availableFields: string[] = []

  constructor() {
    this.initializeRules()
  }

  /**
   * 初始化解析规则
   */
  private initializeRules() {
    this.rules = [
      // 查询所有/数量
      {
        pattern: /查询所有|全部用户|显示所有|列出所有/,
        template: () => `SELECT * FROM ${this.tableName} LIMIT 100;`,
        confidence: 0.8,
        description: '查询所有数据'
      },
      {
        pattern: /有多少用户|用户数量|用户总数|统计用户/,
        template: () => `SELECT COUNT(*) as total FROM ${this.tableName};`,
        confidence: 0.9,
        description: '统计数量'
      },

      // 时间范围查询
      {
        pattern: /(今天|昨天|最近|今天)(\d*)天?的用户/,
        template: (matches) => {
          const timeKeyword = matches[1]
          let timeCondition = ''

          if (timeKeyword === '今天') {
            timeCondition = "DATE(created_at) = CURRENT_DATE"
          } else if (timeKeyword === '昨天') {
            timeCondition = "DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'"
          } else if (timeKeyword === '最近') {
            const days = matches[2] || '7'
            timeCondition = `created_at >= NOW() - INTERVAL '${days} days'`
          }

          return `SELECT * FROM ${this.tableName} WHERE ${timeCondition} ORDER BY created_at DESC LIMIT 100;`
        },
        confidence: 0.85,
        description: '时间范围查询'
      },

      // 特定指标查询
      {
        pattern: /留存率|retention/,
        template: () => {
          return `SELECT
  COUNT(DISTINCT CASE WHEN last_active > NOW() - INTERVAL '7 days' THEN user_id END) * 100.0 / COUNT(*) as retention_rate
FROM ${this.tableName};`
        },
        confidence: 0.9,
        description: '留存率查询'
      },
      {
        pattern: /转化率|conversion/,
        template: () => {
          return `SELECT
  COUNT(DISTINCT CASE WHEN status = 'converted' THEN user_id END) * 100.0 / COUNT(*) as conversion_rate
FROM ${this.tableName};`
        },
        confidence: 0.9,
        description: '转化率查询'
      },
      {
        pattern: /日活|DAU|dau/,
        template: () => {
          return `SELECT
  COUNT(DISTINCT user_id) as dau
FROM ${this.tableName}
WHERE DATE(last_active) = CURRENT_DATE;`
        },
        confidence: 0.95,
        description: '日活查询'
      },

      // 排序查询
      {
        pattern: /(?:最|排名)?(?:top|前)?(\d+)(?:个|名)?/,
        template: (matches) => {
          const limit = matches[1]
          return `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT ${limit};`
        },
        confidence: 0.7,
        description: 'Top N查询'
      },

      // 分组统计
      {
        pattern: /按(.+)统计|分组统计(.+)/,
        template: (matches) => {
          const field = matches[1] || matches[2]
          // 简单的字段映射
          const fieldMap: Record<string, string> = {
            '渠道': 'channel',
            '渠道来源': 'channel',
            '状态': 'status',
            '类型': 'type'
          }
          const actualField = fieldMap[field] || field
          return `SELECT ${actualField}, COUNT(*) as count FROM ${this.tableName} GROUP BY ${actualField} ORDER BY count DESC;`
        },
        confidence: 0.75,
        description: '分组统计'
      },

      // 对比查询
      {
        pattern: /(?:对比|比较)(.+?)和(.+?)的/,
        template: (matches) => {
          const metric1 = matches[1]
          const metric2 = matches[2]
          // 简化的对比查询
          return `SELECT
  '${metric1}' as metric,
  COUNT(*) FILTER (WHERE condition_for_${metric1}) as value1,
  COUNT(*) FILTER (WHERE condition_for_${metric2}) as value2
FROM ${this.tableName};`
        },
        confidence: 0.5,
        description: '对比查询（简化）'
      }
    ]
  }

  /**
   * 设置数据库表信息
   */
  public setTableInfo(tableName: string, fields: string[]) {
    this.tableName = tableName
    this.availableFields = fields
    // 根据字段更新规则
    this.updateRulesWithFields()
  }

  /**
   * 根据可用字段更新规则
   */
  private updateRulesWithFields() {
    // 动态添加字段相关规则
    this.availableFields.forEach(field => {
      // 可以根据字段类型添加特定规则
    })
  }

  /**
   * 解析自然语言查询
   */
  public parse(naturalLanguage: string): ParsedQuery {
    const trimmedQuery = naturalLanguage.trim().toLowerCase()

    // 尝试匹配规则
    for (const rule of this.rules) {
      const matches = trimmedQuery.match(rule.pattern)
      if (matches) {
        try {
          const sql = rule.template(matches)
          return {
            sql,
            confidence: rule.confidence,
            matchedPattern: rule.description
          }
        } catch (error) {
          console.error('Rule template error:', error)
        }
      }
    }

    // 没有匹配到任何规则
    return {
      sql: '',
      confidence: 0,
      error: '无法理解您的查询，请尝试更具体的描述'
    }
  }

  /**
   * 获取支持的查询示例
   */
  public getSupportedQueries(): string[] {
    return [
      '查询所有用户',
      '用户数量是多少',
      '今天的活跃用户',
      '最近7天的新用户',
      '用户留存率',
      '转化率是多少',
      '日活用户数',
      '前10名用户',
      '按渠道分组统计'
    ]
  }

  /**
   * 检查查询是否支持
   */
  public isSupported(query: string): boolean {
    const trimmedQuery = query.trim().toLowerCase()
    return this.rules.some(rule => rule.pattern.test(trimmedQuery))
  }
}

export const ruleBasedParser = new RuleBasedNL2SQLParser()
