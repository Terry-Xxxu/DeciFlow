/**
 * 混合NL2SQL服务
 * 根据是否有AI配置，智能选择使用AI或规则解析器
 */

import { AIChatManager } from '../ai/adapter'
import { ruleBasedParser } from './rule-based-parser'
import { DatabaseType } from '../../shared/types'
import { dataDictionary, type DictionaryMetric } from '../dictionary/data-dictionary'

export interface HybridQueryResult {
  sql: string
  explanation: string
  confidence: number
  usingAI: boolean
  error?: string
  suggestions?: string[]
}

export class HybridNL2SQLService {
  private aiManager: AIChatManager | null = null
  private ruleParser = ruleBasedParser

  constructor(aiManager: AIChatManager | null = null) {
    this.aiManager = aiManager
  }

  /**
   * 设置AI管理器
   */
  setAIManager(aiManager: AIChatManager) {
    this.aiManager = aiManager
  }

  /**
   * 移除AI管理器（切换到无AI模式）
   */
  removeAIManager() {
    this.aiManager = null
  }

  /**
   * 检查是否有可用的AI
   */
  hasAI(): boolean {
    return this.aiManager !== null
  }

  /**
   * 解析自然语言查询
   */
  async parseQuery(
    naturalLanguage: string,
    databaseType: DatabaseType,
    tableInfo?: { tableName: string; fields: string[] }
  ): Promise<HybridQueryResult> {
    // 如果有AI配置，优先使用AI
    if (this.hasAI()) {
      try {
        return await this.parseWithAI(naturalLanguage, databaseType)
      } catch (error) {
        // AI调用失败，回退到规则解析器
        console.warn('AI解析失败，回退到规则解析器:', error)
        return this.parseWithRules(naturalLanguage, tableInfo)
      }
    }

    // 无AI模式，使用规则解析器
    return this.parseWithRules(naturalLanguage, tableInfo)
  }

  /**
   * 使用AI解析
   */
  private async parseWithAI(
    naturalLanguage: string,
    databaseType: DatabaseType
  ): Promise<HybridQueryResult> {
    // 构建AI提示
    const systemPrompt = '你是一个专业的SQL查询生成助手。根据用户的自然语言描述，生成准确的SQL查询语句。'
    const userPrompt = this.buildAIPrompt(naturalLanguage, databaseType)

    // 调用AI生成SQL - 先设置系统消息
    const manager = this.aiManager as any
    const originalHistory = manager.conversationHistory

    // 临时设置系统消息
    manager.conversationHistory = [
      { role: 'system', content: systemPrompt }
    ]

    try {
      const response = await this.aiManager!.chat(userPrompt)

      // 解析AI响应
      const sql = this.extractSQLFromResponse(response.content)

      return {
        sql,
        explanation: 'AI根据您的查询描述生成的SQL',
        confidence: 0.9,
        usingAI: true
      }
    } finally {
      // 恢复历史
      manager.conversationHistory = originalHistory
    }
  }

  /**
   * 使用规则解析
   */
  private parseWithRules(
    naturalLanguage: string,
    tableInfo?: { tableName: string; fields: string[] }
  ): HybridQueryResult {
    // 设置表上下文：表名 + 推断类型 + 实际列名
    if (tableInfo) {
      const tableType = this.ruleParser.inferTableTypeFromName(tableInfo.tableName)
      this.ruleParser.setTableContext(tableInfo.tableName, tableType, tableInfo.fields)
    }

    // 尝试规则匹配
    const result = this.ruleParser.parse(naturalLanguage)

    if (result.sql) {
      return {
        sql: result.sql,
        explanation: `基于规则匹配：${result.matchedPattern || '常规查询'}`,
        confidence: result.confidence,
        usingAI: false,
        suggestions: this.ruleParser.getExamples()
      }
    }

    // 无法解析
    return {
      sql: '',
      explanation: '',
      confidence: 0,
      usingAI: false,
      error: result.error || '无法理解您的查询',
      suggestions: [
        '尝试使用更具体的描述',
        '参考以下支持的查询格式：',
        ...this.ruleParser.getExamples()
      ]
    }
  }

  /**
   * 构建AI提示
   */
  private buildAIPrompt(naturalLanguage: string, databaseType: DatabaseType): string {
    // 获取数据字典描述
    const dictionaryDesc = dataDictionary.generateAIDescription()

    return `请将以下自然语言查询转换为${databaseType} SQL语句。

${dictionaryDesc}

查询需求：${naturalLanguage}

要求：
1. 优先使用数据字典中定义的指标和字段
2. 只返回SELECT查询语句
3. 使用正确的${databaseType}语法
4. 添加合理的LIMIT限制（默认100条）
5. 返回格式：只返回SQL语句，不要其他解释`
  }

  /**
   * 从AI响应中提取SQL
   */
  private extractSQLFromResponse(response: string): string {
    // 移除markdown代码块标记
    let sql = response
      .replace(/```sql\n?/g, '')
      .replace(/``\n?/g, '')
      .trim()

    // 移除常见的解释性文字
    const explanations = [
      '以下是',
      '这是',
      '生成的SQL',
      'SQL语句',
      '查询语句',
      ':',
      '：'
    ]

    for (const exp of explanations) {
      const index = sql.toLowerCase().indexOf(exp.toLowerCase())
      if (index !== -1 && index < 20) {
        sql = sql.substring(index + exp.length).trim()
      }
    }

    return sql
  }

  /**
   * 获取功能建议
   */
  getFeatureSuggestions(): string[] {
    if (this.hasAI()) {
      return [
        '✅ AI智能分析：自然语言理解，深度洞察',
        '✅ 主动建议：异常检测，趋势分析',
        '✅ 个性化学习：根据使用习惯优化',
        '💡 切换到无AI模式可节省成本'
      ]
    } else {
      return [
        '📋 基础查询：支持常见查询模式',
        '📋 规则匹配：快速响应',
        '📋 零成本使用：无需AI配置',
        '💡 配置AI后可获得智能分析和主动建议'
      ]
    }
  }

  /**
   * 获取当前模式说明
   */
  getModeDescription(): string {
    if (this.hasAI()) {
      return 'AI增强模式：使用AI理解自然语言，提供智能分析和主动洞察'
    } else {
      return '基础模式：使用规则匹配解析常见查询，快速响应'
    }
  }

  /**
   * 从查询中提取相关指标
   * 用于AI模式下的上下文增强
   */
  getRelevantMetrics(query: string): DictionaryMetric[] {
    const lowerQuery = query.toLowerCase()
    const relevant: DictionaryMetric[] = []

    // 搜索指标名称和描述
    for (const metric of dataDictionary.getAllMetrics()) {
      const nameMatch = metric.name.toLowerCase().includes(lowerQuery) ||
                       lowerQuery.includes(metric.name.toLowerCase())
      const descMatch = metric.description.toLowerCase().includes(lowerQuery)

      if (nameMatch || descMatch) {
        relevant.push(metric)
      }
    }

    return relevant
  }

  /**
   * 记录用户修正
   * 当用户纠正AI生成的SQL时，学习正确的映射关系
   */
  async recordCorrection(
    naturalLanguage: string,
    generatedSQL: string,
    correctedSQL: string,
    userFeedback?: string
  ): Promise<void> {
    // 这里可以记录修正日志，用于后续的模型优化
    console.log('[NL2SQL] 记录用户修正:', {
      naturalLanguage,
      generatedSQL,
      correctedSQL,
      userFeedback
    })

    // 实现学习机制
    // 1. 分析修正前后的SQL差异
    const analysis = this.analyzeSQLDiff(generatedSQL, correctedSQL)

    // 2. 提取字段映射关系
    const mappings = this.extractFieldMappings(analysis, naturalLanguage)

    // 3. 更新数据字典或创建新的学习规则
    if (mappings.length > 0) {
      await this.saveLearnedMappings(mappings)
    }

    // 4. 保存修正记录到本地存储（用于离线学习）
    this.saveCorrectionHistory({
      naturalLanguage,
      generatedSQL,
      correctedSQL,
      userFeedback,
      analysis,
      mappings,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 分析 SQL 差异
   */
  private analyzeSQLDiff(original: string, corrected: string): {
    tableChanges: string[]
    fieldChanges: Array<{ original: string; corrected: string }>
    clauseChanges: string[]
  } {
    const result = {
      tableChanges: [] as string[],
      fieldChanges: [] as Array<{ original: string; corrected: string }>,
      clauseChanges: [] as string[]
    }

    // 简单的文本差异分析（可以后续升级为 AST 分析）
    const originalWords = original.toLowerCase().split(/\s+/)
    const correctedWords = corrected.toLowerCase().split(/\s+/)

    // 提取表名变化（FROM/JOIN 后的内容）
    const extractTables = (sql: string) => {
      const matches = sql.match(/(?:from|join)\s+(\w+)/gi) || []
      return matches.map(m => m.split(/\s+/)[1].toLowerCase())
    }
    const originalTables = extractTables(original)
    const correctedTables = extractTables(corrected)
    result.tableChanges = [...new Set([...correctedTables.filter(t => !originalTables.includes(t))])]

    // 提取字段变化（SELECT 和 WHERE 中的字段）
    const extractFields = (sql: string) => {
      const selectMatch = sql.match(/select\s+(.*?)\s+from/i)
      if (selectMatch) {
        return selectMatch[1].split(',').map(f => f.trim().toLowerCase())
      }
      return []
    }

    const originalFields = extractFields(original)
    const correctedFields = extractFields(corrected)

    // 找出被修正的字段
    for (let i = 0; i < Math.max(originalFields.length, correctedFields.length); i++) {
      if (originalFields[i] && correctedFields[i] && originalFields[i] !== correctedFields[i]) {
        result.fieldChanges.push({
          original: originalFields[i],
          corrected: correctedFields[i]
        })
      }
    }

    return result
  }

  /**
   * 从差异中提取字段映射关系
   */
  private extractFieldMappings(
    analysis: { fieldChanges: Array<{ original: string; corrected: string }> },
    naturalLanguage: string
  ): Array<{
    naturalLanguageTerm: string
    fieldName: string
    confidence: number
  }> {
    const mappings: Array<{
      naturalLanguageTerm: string
      fieldName: string
      confidence: number
    }> = []

    // 从自然语言中提取可能的术语
    const terms = naturalLanguage.split(/[\s,，。]+/).filter(t => t.length > 1)

    // 为每个字段变化创建映射
    for (const change of analysis.fieldChanges) {
      // 清理字段名（去掉表名前缀、函数等）
      const cleanField = change.corrected.replace(/\w+\./, '').replace(/\(.*\)/, '')

      // 查找最匹配的自然语言术语
      for (const term of terms) {
        if (cleanField.toLowerCase().includes(term.toLowerCase()) ||
            term.toLowerCase().includes(cleanField.toLowerCase())) {
          mappings.push({
            naturalLanguageTerm: term,
            fieldName: cleanField,
            confidence: 0.8  // 用户修正的置信度较高
          })
        }
      }
    }

    return mappings
  }

  /**
   * 保存学习的映射关系到数据字典
   */
  private async saveLearnedMappings(
    mappings: Array<{
      naturalLanguageTerm: string
      fieldName: string
      confidence: number
    }>
  ): Promise<void> {
    // 更新数据字典中的字段映射
    const { dataDictionary } = await import('../dictionary/data-dictionary')

    for (const mapping of mappings) {
      // 这里可以扩展数据字典来支持学习到的映射
      console.log('[NL2SQL] 学习到新的映射:', mapping)
      // TODO: 在数据字典中添加学习方法来存储这些映射
    }
  }

  /**
   * 保存修正历史到本地存储
   */
  private saveCorrectionHistory(record: {
    naturalLanguage: string
    generatedSQL: string
    correctedSQL: string
    userFeedback?: string
    analysis: any
    mappings: any[]
    timestamp: string
  }): void {
    try {
      const { app } = require('electron')
      const path = require('path')
      const fs = require('fs')

      const userDataPath = app.getPath('userData')
      const historyPath = path.join(userDataPath, 'nl2sql-corrections.json')

      let history: any[] = []
      if (fs.existsSync(historyPath)) {
        const content = fs.readFileSync(historyPath, 'utf-8')
        history = JSON.parse(content)
      }

      history.push(record)

      // 只保留最近 1000 条记录
      if (history.length > 1000) {
        history = history.slice(-1000)
      }

      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2))
      console.log('[NL2SQL] 修正历史已保存')
    } catch (error) {
      console.error('[NL2SQL] 保存修正历史失败:', error)
    }
  }

  /**
   * 获取查询建议
   * 基于数据字典提供查询模板建议
   */
  getQuerySuggestions(query: string): string[] {
    const suggestions: string[] = []
    const relevantMetrics = this.getRelevantMetrics(query)

    // 添加相关指标建议
    for (const metric of relevantMetrics.slice(0, 3)) {
      suggestions.push(`💡 可用指标：${metric.name} - ${metric.description}`)
    }

    // 添加常用查询模式
    if (!this.hasAI()) {
      suggestions.push(...this.ruleParser.getExamples())
    }

    return suggestions
  }
}

// 导出单例
export const hybridNL2SQLService = new HybridNL2SQLService()
