import { app, BrowserWindow, ipcMain, screen, dialog } from 'electron'
import * as fs from 'fs'
import Store from 'electron-store'
import path from 'path'
import { isDev } from './utils/env'
import { AIChatManager } from './ai/adapter'
import { databaseManager } from './database/manager'
import { fileTableRegistry, parseCSVContent } from './database/file-registry'
import { NaturalLanguageQueryService } from './ai/nl2sql'
import { InsightsEngine } from './ai/insights'
import { metricLayer } from './metrics/layer'
import { resultMetadataService } from './security/metadata'
import { sqlSecurityValidator } from './security/sql-validator'
import { chartAutoSelector } from './charts/selector'
import { DatabaseConnectionManager } from './database/enhanced'
import { schemaManager } from './database/schema-manager'
import { dataDictionary } from './dictionary/data-dictionary'
import { metricLayerV2 } from './metrics/layer-v2'
import { confidenceEngine } from './trust/confidence-engine'
import { AnalysisEngineV2 } from './ai/analysis-engine-v2'
import { dataSecurityManager } from './security/data-policy'
import { dataAnonymizer } from './security/anonymization'
import { auditLoggerV2 } from './security/audit-log-v2'
import { analyzeEngine } from './ai/analyze-engine'
import { initFunnelService } from './funnel-handlers'
import { analyzeTableSchema } from './analysis/table-schema-analyzer'
import { generateTemplateSQL, autoSelectAnalysis, getSupportedTemplateIds } from './analysis/template-sql-generator'
import { ANALYSIS_TEMPLATES, CATEGORY_LABELS } from './analysis/template-library'
import { chatHistoryStore } from './storage/chat-history-store'
import { memoryManager } from './memory/memory-manager'
import { queryTemplateManager } from './templates/template-manager'
import { AIConfig, AIProvider, DatabaseConfig } from '../shared/types'

const dbConnectionManager = new DatabaseConnectionManager()
const appStore = new Store()

let mainWindow: BrowserWindow | null = null

// ─── IPC 安全工具函数 ────────────────────────────────────────────────────────

/** 验证字符串输入长度，防止超大请求导致主进程 OOM */
function guardString(value: unknown, maxLen: number, name: string): string {
  if (typeof value !== 'string') throw new Error(`${name} 必须是文本`)
  if (value.length > maxLen) throw new Error(`${name} 超过最大长度 ${maxLen} 字符`)
  return value
}

/** 对返回前端的错误信息脱敏，防止暴露内部路径/凭据 */
function sanitizeError(error: unknown): string {
  if (!(error instanceof Error)) return '操作失败'
  const msg = error.message
  // 过滤包含文件路径或过长的错误信息
  if (msg.length > 300) return msg.slice(0, 300) + '…'
  // 过滤路径信息（可能暴露服务器内部结构）
  if (/\/[a-z]+\/[a-z]+|C:\\|\/etc\/|\/var\//.test(msg)) return '数据库连接失败，请检查连接配置'
  return msg
}

/** 验证数据库配置基本结构 */
function guardDbConfig(config: unknown): DatabaseConfig {
  if (!config || typeof config !== 'object') throw new Error('数据库配置无效')
  const c = config as any
  const VALID_TYPES = ['postgresql', 'mysql', 'mongodb', 'clickhouse', 'redis', 'sqlite', 'demo']
  if (!VALID_TYPES.includes(c.type)) throw new Error(`不支持的数据库类型: ${c.type}`)
  if (c.host && (typeof c.host !== 'string' || c.host.length > 255 || /[\n\r]/.test(c.host))) {
    throw new Error('主机地址格式无效')
  }
  return config as DatabaseConfig
}
let aiChatManager: AIChatManager | null = null
let nl2sqlService: NaturalLanguageQueryService | null = null
let insightsEngine: InsightsEngine | null = null

/**
 * 初始化 AI 服务
 */
function initAIService(config: AIConfig) {
  try {
    aiChatManager = new AIChatManager(config)
    nl2sqlService = new NaturalLanguageQueryService(aiChatManager)
    insightsEngine = new InsightsEngine(aiChatManager)
    initFunnelService(aiChatManager)  // 初始化漏斗服务

    // 初始化记忆管理器
    memoryManager.setAIManager(aiChatManager)

    console.log('AI 服务初始化成功:', config.provider)
    return true
  } catch (error) {
    console.error('AI 服务初始化失败:', error)
    return false
  }
}

function createWindow() {
  // Set icon for Windows and Linux (Mac uses .icns from package.json)
  let iconPath: string | undefined
  if (process.platform !== 'darwin') {
    // Try multiple possible icon locations
    const possiblePaths = [
      path.join(__dirname, '../resources/icon.png'), // Packaged app
      path.join(__dirname, '../../resources/icon.png'), // Dev mode
      path.join(process.resourcesPath, 'icon.png'), // Asar resources
    ]
    iconPath = possiblePaths.find(p => {
      try { return require('fs').existsSync(p) } catch { return false }
    })
  }

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: '#0F172A',
    titleBarStyle: 'default',
    frame: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    fullscreenable: true,
    show: false,
    icon: iconPath,
    title: 'DeciFlow',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    // 等待 Vite 开发服务器启动
    mainWindow.loadURL('http://localhost:5173')
    // DevTools 单独窗口，不压缩主窗口内容区域
    // 需要调试时按 Ctrl+Shift+I 手动打开
    // mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-renderer/index.html'))
  }

  // 页面加载完成后：应用缩放比例
  // 优先读取用户上次保存的缩放，否则用系统 DPI 倍数
  mainWindow.webContents.on('did-finish-load', () => {
    const { scaleFactor } = screen.getPrimaryDisplay()
    const savedZoom = appStore.get('ui.zoomFactor') as number | undefined
    const zoom = savedZoom ?? scaleFactor
    mainWindow?.webContents.setZoomFactor(zoom)
    console.log(`[Zoom] scaleFactor=${scaleFactor}, applied=${zoom}`)
  })

  // 键盘缩放：Ctrl+= 放大 / Ctrl+- 缩小 / Ctrl+0 重置
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!input.control) return
    const current = mainWindow?.webContents.getZoomFactor() ?? 1
    if (input.key === '=' || input.key === '+') {
      const next = Math.min(parseFloat((current + 0.1).toFixed(1)), 2.5)
      mainWindow?.webContents.setZoomFactor(next)
      appStore.set('ui.zoomFactor', next)
      event.preventDefault()
    } else if (input.key === '-') {
      const next = Math.max(parseFloat((current - 0.1).toFixed(1)), 0.5)
      mainWindow?.webContents.setZoomFactor(next)
      appStore.set('ui.zoomFactor', next)
      event.preventDefault()
    } else if (input.key === '0') {
      const reset = screen.getPrimaryDisplay().scaleFactor
      mainWindow?.webContents.setZoomFactor(reset)
      appStore.delete('ui.zoomFactor')
      event.preventDefault()
    }
  })

  // 窗口准备好显示时：最大化启动，与浏览器全屏体验一致
  mainWindow.on('ready-to-show', () => {
    mainWindow?.maximize()
    mainWindow?.show()
    console.log('窗口已准备就绪')
  })

  // 加载失败处理
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription)
  })

  // 控制台消息监听
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message}`)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ========== IPC 处理器 ==========

// 测试连接
ipcMain.handle('ping', () => 'pong')

// AI 服务配置
ipcMain.handle('ai:init', (_, config: AIConfig) => {
  return initAIService(config)
})

// 检查 AI 是否已就绪
ipcMain.handle('ai:isReady', () => {
  return !!aiChatManager
})

// AI 对话
ipcMain.handle('ai:chat', async (_, message: string, context?: any) => {
  if (!aiChatManager) {
    throw new Error('AI 服务未初始化，请先配置 API Key')
  }
  guardString(message, 8000, '消息内容')
  if (context !== undefined && typeof context !== 'object') throw new Error('context 参数无效')

  try {
    const response = await aiChatManager.chat(message, context)
    return response
  } catch (error) {
    console.error('AI 对话错误:', error)
    throw new Error(sanitizeError(error))
  }
})

// 清空对话历史
ipcMain.handle('ai:clear-history', () => {
  if (aiChatManager) {
    aiChatManager.clearHistory()
    return true
  }
  return false
})

// 获取对话历史
ipcMain.handle('ai:get-history', () => {
  if (aiChatManager) {
    return aiChatManager.getHistory()
  }
  return []
})

// 测试 AI 配置
ipcMain.handle('ai:test', async (_, config: any) => {
  try {
    const { AIChatManager } = require('./ai/adapter')
    const testManager = new AIChatManager(config)
    await testManager.chat([{ role: 'user', content: 'Hello' }])
    return { success: true, message: '连接成功！' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '测试连接失败'
    }
  }
})

// ========== 数据库 IPC 处理器 ==========

// 创建数据库连接（带审计日志）
ipcMain.handle('db:connect', async (_, config: DatabaseConfig) => {
  const startTime = Date.now()
  try {
    guardDbConfig(config)
    await databaseManager.createConnection(config)
    const executionTime = Date.now() - startTime

    // 记录成功的连接
    auditLoggerV2.log({
      userQuery: `连接到数据库: ${config.host}:${config.port}/${config.database}`,
      generatedSQL: '',
      sqlModified: false,
      executionTime,
      rowCount: 0,
      success: true,
      tablesUsed: [],
      wasAnonymized: false
    })

    return { success: true, message: '数据库连接成功' }
  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : '连接失败'

    // 记录失败的连接
    auditLoggerV2.log({
      userQuery: `连接到数据库: ${config.host}:${config.port}/${config.database}`,
      generatedSQL: '',
      sqlModified: false,
      executionTime,
      rowCount: 0,
      success: false,
      errorMessage,
      tablesUsed: [],
      wasAnonymized: false
    })

    return {
      success: false,
      message: sanitizeError(error)  // 返回脱敏后的错误，内部完整错误已记录审计日志
    }
  }
})

// 移除数据库连接
ipcMain.handle('db:disconnect', async (_, config: DatabaseConfig) => {
  try {
    await databaseManager.removeConnection(config)
    // File 类型：同时清理注册表
    if ((config.type as string) === 'file' && config.id) {
      fileTableRegistry.removeDb(config.id)
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '断开连接失败'
    }
  }
})

// 测试数据库连接
ipcMain.handle('db:test', async (_, config: DatabaseConfig) => {
  try {
    const result = await databaseManager.testConnection(config)
    return { success: result, message: result ? '连接正常' : '连接失败' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '测试连接失败'
    }
  }
})

// 执行查询（增强版 - 带可信度和审计）
ipcMain.handle('db:query', async (_, config: DatabaseConfig, sql: string) => {
  const startTime = Date.now()
  let success = false
  let errorMessage = ''

  try {
    const result = await databaseManager.query(config, sql)
    success = true
    const executionTime = Date.now() - startTime

    // 提取 SQL 统计信息
    const sqlStats = confidenceEngine.extractSQLStats(sql)

    // 计算可信度分数
    const confidence = confidenceEngine.calculate({
      sql,
      tables: sqlStats.tables,
      rowCount: result.rowCount || 0,
      joinCount: sqlStats.joinCount,
      subqueryCount: sqlStats.subqueryCount,
      hasFallback: false,
      missingFields: []
    })

    // 记录到审计日志
    auditLoggerV2.log({
      userQuery: '',
      generatedSQL: sql,
      sqlModified: false,
      executionTime,
      rowCount: result.rowCount || 0,
      success: true,
      tablesUsed: sqlStats.tables,
      wasAnonymized: false,
      confidenceScore: confidence.overall
    })

    // 返回增强的结果
    return {
      success: true,
      data: result,
      confidence,
      executionTime
    }
  } catch (error) {
    const executionTime = Date.now() - startTime
    errorMessage = error instanceof Error ? error.message : '查询失败'

    // 记录失败的查询到审计日志
    auditLoggerV2.log({
      userQuery: '',
      generatedSQL: sql,
      sqlModified: false,
      executionTime,
      rowCount: 0,
      success: false,
      errorMessage,
      tablesUsed: [],
      wasAnonymized: false
    })

    return {
      success: false,
      message: errorMessage,
      data: null
    }
  }
})

// 获取数据库表列表（直接返回数组，与渲染端期望格式一致）
ipcMain.handle('db:tables', async (_, config: DatabaseConfig) => {
  try {
    const tables = await databaseManager.getTables(config)
    return tables
  } catch (error) {
    console.error('[db:tables] 获取表列表失败:', error)
    return []
  }
})

// ========== 增强数据库连接 IPC 处理器 ==========

// 增强版连接测试
ipcMain.handle('db:test-enhanced', async (_, config: any) => {
  try {
    const result = await dbConnectionManager.testConnectionEnhanced(config)
    return { success: result.success, data: result }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '测试连接失败',
      data: null
    }
  }
})

// 生成安全提示
ipcMain.handle('db:security-tips', async (_, config: any) => {
  try {
    const tips = dbConnectionManager.generateSecurityTips(config)
    return { success: true, data: tips }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '生成安全提示失败',
      data: []
    }
  }
})

// ========== Schema 管理 IPC 处理器 ==========

// 缓存数据库 Schema
ipcMain.handle('schema:cache', async (_, config: any) => {
  try {
    await schemaManager.cacheSchema(config)
    return { success: true, message: 'Schema 缓存成功' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '缓存 Schema 失败'
    }
  }
})

// 获取表 Schema
ipcMain.handle('schema:get-table', async (_, config: any, tableName: string) => {
  try {
    const tableSchema = schemaManager.getTableSchema(config, tableName)
    return { success: true, data: tableSchema }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取表 Schema 失败',
      data: null
    }
  }
})

// 更新字段描述
ipcMain.handle('schema:update-column', async (_, config: any, tableName: string, columnName: string, description: string) => {
  try {
    const success = schemaManager.updateColumnDescription(config, tableName, columnName, description)
    return { success, message: success ? '字段描述更新成功' : '字段描述更新失败' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新字段描述失败'
    }
  }
})

// 搜索字段
ipcMain.handle('schema:search', async (_, config: any, keyword: string) => {
  try {
    const results = schemaManager.searchColumns(config, keyword)
    return { success: true, data: results }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '搜索字段失败',
      data: []
    }
  }
})

// 生成 Schema 描述
ipcMain.handle('schema:describe', async (_, config: any) => {
  try {
    const description = schemaManager.generateSchemaDescription(config)
    return { success: true, data: description }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '生成 Schema 描述失败',
      data: ''
    }
  }
})

// ========== 自然语言查询 IPC 处理器 ==========

// 自然语言转 SQL
ipcMain.handle('nl:generate-sql', async (_, databaseType: any, query: string, context?: any) => {
  guardString(query, 2000, '查询内容')
  if (context !== undefined && typeof context !== 'object') throw new Error('context 参数无效')
  const selectedTables: string[] = context?.selectedTables || []

  // ── 有 AI：全功能路径 ──────────────────────────────────────────
  if (nl2sqlService) {
    try {
      // 把真实 schema 注入到 context，让 AI 看到实际表结构
      const enrichedContext = { ...context }
      if (context?.databaseConfig) {
        const dbType = context.databaseConfig.type as string
        // 文件类型从 fileTableRegistry 获取 CSV 列信息
        if (dbType === 'file' && context.databaseConfig.id) {
          const tables = fileTableRegistry.getTablesForDb(context.databaseConfig.id)
          if (tables.length > 0) {
            const table = tables[0]
            const schemaDesc = `表: ${table.tableName}\n列: ${table.columns.map(c => `${c.name} (${c.inferredType})`).join(', ')}`
            enrichedContext.schemaDescription = schemaDesc
            enrichedContext.tableName = table.tableName
          }
        // Demo 内置数据库：硬编码表结构
        } else if (dbType === 'demo') {
          const demoSchema = `内置示例电商数据库，包含以下表：
users(id(int), name(text), email(text), channel(text), city(text), status(text), created_at(date))
orders(id(int), user_id(int), amount(float), status(text), product_category(text), created_at(date))
products(id(int), name(text), category(text), price(float), stock(int))
events(id(int), user_id(int), event_type(text), page(text), created_at(datetime))`
          enrichedContext.schemaDescription = demoSchema
        // 真实数据库从 schemaManager 获取
        } else {
          const filteredDesc = selectedTables.length > 0
            ? schemaManager.generateSchemaDescriptionForTables(context.databaseConfig, selectedTables)
            : schemaManager.generateSchemaDescription(context.databaseConfig)
          if (filteredDesc && filteredDesc !== '暂无 Schema 信息') {
            enrichedContext.schemaDescription = filteredDesc
          }
        }
      }
      const result = await nl2sqlService.generateSQL(databaseType, query, enrichedContext)
      return {
        success: true,
        sql: result.sql,
        explanation: result.explanation,
        confidence: result.confidence,
        data: result,
        usingAI: true,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'SQL 生成失败',
        data: null,
      }
    }
  }

  // ── 无 AI：规则解析路径，能力有限 ────────────────────────────
  // 多表关联必须有 AI，直接告知用户
  if (selectedTables.length > 1) {
    return {
      success: false,
      message: '多表关联分析需要配置 AI。请前往「设置 → AI 配置」添加 API Key 后再试。',
      needsAI: true,
      data: null,
    }
  }

  try {
    const { hybridNL2SQLService } = await import('./nl2sql/hybrid-nl2sql-service')

    // 尽量从 schema 缓存中拿真实字段，提升规则解析准确率
    let tableInfo: { tableName: string; fields: string[] } | undefined
    const targetTable = selectedTables[0] || context?.tableName || ''
    if (targetTable && context?.databaseConfig) {
      const dbType = context.databaseConfig.type as string
      // 文件类型从 fileTableRegistry 获取 CSV 列信息
      if (dbType === 'file' && context.databaseConfig.id) {
        const tables = fileTableRegistry.getTablesForDb(context.databaseConfig.id)
        if (tables.length > 0) {
          tableInfo = {
            tableName: tables[0].tableName,
            fields: tables[0].columns.map(c => c.name),
          }
        }
      // Demo 内置数据库：硬编码字段
      } else if (dbType === 'demo') {
        const demoFields: Record<string, string[]> = {
          users: ['id','name','email','channel','city','status','created_at'],
          orders: ['id','user_id','amount','status','product_category','created_at'],
          products: ['id','name','category','price','stock'],
          events: ['id','user_id','event_type','page','created_at'],
        }
        tableInfo = { tableName: targetTable, fields: demoFields[targetTable] || [] }
      } else {
        try {
          const tableSchema = schemaManager.getTableSchema(context.databaseConfig, targetTable)
          if (tableSchema) {
            tableInfo = {
              tableName: targetTable,
              fields: tableSchema.columns.map((c: any) => c.columnName),
            }
          }
        } catch { /* schema 未缓存，跳过 */ }
      }
    }

    const result = await hybridNL2SQLService.parseQuery(query, databaseType, tableInfo)

    if (!result.sql) {
      return {
        success: false,
        message: result.error || '无法理解此查询。未配置 AI 时仅支持基础分析，建议前往「设置」配置 AI 以获得完整能力。',
        needsAI: true,
        suggestions: result.suggestions,
        data: null,
      }
    }

    return {
      success: true,
      sql: result.sql,
      explanation: `${result.explanation}（规则解析，未使用 AI）`,
      confidence: result.confidence,
      data: result,
      usingAI: false,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'SQL 生成失败',
      data: null,
    }
  }
})

// 解释 SQL
ipcMain.handle('nl:explain-sql', async (_, sql: string) => {
  if (!nl2sqlService) {
    throw new Error('AI 服务未初始化')
  }

  try {
    const explanation = await nl2sqlService.explainSQL(sql)
    return { success: true, data: explanation }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'SQL 解释失败',
      data: null
    }
  }
})

// 获取查询建议（基于数据字典）
ipcMain.handle('nl:getSuggestions', async (_, query: string) => {
  try {
    const { hybridNL2SQLService } = await import('./nl2sql/hybrid-nl2sql-service')
    const suggestions = hybridNL2SQLService.getQuerySuggestions(query)
    return { success: true, data: suggestions }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取建议失败',
      data: []
    }
  }
})

// 获取相关指标
ipcMain.handle('nl:getRelevantMetrics', async (_, query: string) => {
  try {
    const { hybridNL2SQLService } = await import('./nl2sql/hybrid-nl2sql-service')
    const metrics = hybridNL2SQLService.getRelevantMetrics(query)
    return { success: true, data: metrics }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取指标失败',
      data: []
    }
  }
})

// 记录用户修正
ipcMain.handle('nl:recordCorrection', async (_, naturalLanguage: string, generatedSQL: string, correctedSQL: string, userFeedback?: string) => {
  try {
    const { hybridNL2SQLService } = await import('./nl2sql/hybrid-nl2sql-service')
    await hybridNL2SQLService.recordCorrection(naturalLanguage, generatedSQL, correctedSQL, userFeedback)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '记录修正失败'
    }
  }
})

// ========== 智能分析 IPC 处理器 ==========

// 检测异常
ipcMain.handle('insights:detect-anomalies', async (_, metrics: any[]) => {
  if (!insightsEngine) {
    throw new Error('AI 服务未初始化')
  }

  try {
    const anomalies = await insightsEngine.detectAnomalies(metrics)
    return { success: true, data: anomalies }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '异常检测失败',
      data: []
    }
  }
})

// 生成分析报告
ipcMain.handle('insights:generate-report', async (_, metrics: any[]) => {
  if (!insightsEngine) {
    throw new Error('AI 服务未初始化')
  }

  try {
    const report = await insightsEngine.generateReport(metrics)
    return { success: true, data: report }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '报告生成失败',
      data: null
    }
  }
})

// 生成拆解分析 SQL
ipcMain.handle('insights:breakdown-sql', async (_, metricName: string, tableName: string, dateField: string) => {
  if (!insightsEngine) {
    throw new Error('AI 服务未初始化')
  }

  try {
    const breakdownSQLs = insightsEngine.generateBreakdownSQL(metricName, tableName, dateField)
    return { success: true, data: breakdownSQLs }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '生成拆解 SQL 失败',
      data: []
    }
  }
})

// ========== 结果可信度 IPC 处理器 ==========

// 生成结果元数据
ipcMain.handle('result:generate-metadata', async (_, params: any) => {
  try {
    const metadata = resultMetadataService.generateMetadata(params)
    return { success: true, data: metadata }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '生成元数据失败',
      data: null
    }
  }
})

// 格式化元数据为显示
ipcMain.handle('result:format-metadata', async (_, metadata: any) => {
  try {
    const formatted = resultMetadataService.formatForDisplay(metadata)
    return { success: true, data: formatted }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '格式化失败',
      data: null
    }
  }
})

// ========== 图表自动选择 IPC 处理器 ==========

// 推荐图表类型
ipcMain.handle('charts:recommend', async (_, result: any) => {
  try {
    const recommendation = chartAutoSelector.recommend(result)
    const chartConfig = chartAutoSelector.getChartConfig(recommendation.chartType)
    return {
      success: true,
      data: {
        ...recommendation,
        chartConfig,
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '推荐失败',
      data: null
    }
  }
})

// 批量推荐
ipcMain.handle('charts:recommend-multiple', async (_, results: any[]) => {
  try {
    const recommendations = chartAutoSelector.recommendMultiple(results)
    return { success: true, data: Array.from(recommendations.entries()) }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '批量推荐失败',
      data: []
    }
  }
})

// ========== 指标层 IPC 处理器 ==========

// 获取所有指标
ipcMain.handle('metrics:getAll', () => {
  try {
    const metrics = metricLayer.getAllMetrics()
    return { success: true, data: metrics }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取指标失败',
      data: []
    }
  }
})

// 按分类获取指标
ipcMain.handle('metrics:getByCategory', async (_, category: string) => {
  try {
    const metrics = metricLayer.getMetricsByCategory(category as any)
    return { success: true, data: metrics }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取指标失败',
      data: []
    }
  }
})

// 添加自定义指标
ipcMain.handle('metrics:add', async (_, metric: any) => {
  try {
    const validation = metricLayer.validateMetric(metric)
    if (!validation.valid) {
      return {
        success: false,
        message: `指标验证失败：${validation.errors.join(', ')}`,
        data: null
      }
    }

    metricLayer.addCustomMetric(metric)
    return { success: true, data: metric }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '添加指标失败',
      data: null
    }
  }
})

// 更新指标
ipcMain.handle('metrics:update', async (_, metricId: string, updates: any) => {
  try {
    const success = metricLayer.updateMetric(metricId, updates)
    if (!success) {
      return {
        success: false,
        message: '指标不存在',
        data: null
      }
    }

    const updated = metricLayer.getMetric(metricId)
    return { success: true, data: updated }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新指标失败',
      data: null
    }
  }
})

// 删除指标
ipcMain.handle('metrics:delete', async (_, metricId: string) => {
  try {
    const success = metricLayer.deleteMetric(metricId)
    return { success: true, data: { deleted: success } }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '删除指标失败',
      data: null
    }
  }
})

// ========== 数据字典 IPC 处理器 ==========

// 获取所有指标
ipcMain.handle('dict:getAllMetrics', () => {
  try {
    const metrics = dataDictionary.getAllMetrics()
    return { success: true, data: metrics }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取指标失败',
      data: []
    }
  }
})

// 搜索指标
ipcMain.handle('dict:searchMetrics', async (_, keyword: string) => {
  try {
    const metrics = dataDictionary.searchMetrics(keyword)
    return { success: true, data: metrics }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '搜索指标失败',
      data: []
    }
  }
})

// 添加自定义指标
ipcMain.handle('dict:addMetric', async (_, metric: any) => {
  try {
    const newMetric = dataDictionary.addMetric(metric)
    return { success: true, data: newMetric }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '添加指标失败',
      data: null
    }
  }
})

// 更新指标
ipcMain.handle('dict:updateMetric', async (_, id: string, updates: any) => {
  try {
    const success = dataDictionary.updateMetric(id, updates)
    return { success, data: { updated: success } }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新指标失败',
      data: null
    }
  }
})

// 删除指标
ipcMain.handle('dict:deleteMetric', async (_, id: string) => {
  try {
    const success = dataDictionary.deleteMetric(id)
    return { success: true, data: { deleted: success } }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '删除指标失败',
      data: null
    }
  }
})

// 获取所有字段
ipcMain.handle('dict:getAllFields', () => {
  try {
    const fields = dataDictionary.getAllFields()
    return { success: true, data: fields }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取字段失败',
      data: []
    }
  }
})

// 获取指定表的字段
ipcMain.handle('dict:getFields', async (_, table: string) => {
  try {
    const fields = dataDictionary.getFields(table)
    return { success: true, data: fields }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取表字段失败',
      data: []
    }
  }
})

// 更新字段描述
ipcMain.handle('dict:updateField', async (_, table: string, column: string, updates: any) => {
  try {
    const success = dataDictionary.updateField(table, column, updates)
    return { success: true, data: { updated: success } }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新字段失败',
      data: null
    }
  }
})

// 搜索字段
ipcMain.handle('dict:searchFields', async (_, keyword: string) => {
  try {
    const fields = dataDictionary.searchFields(keyword)
    return { success: true, data: fields }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '搜索字段失败',
      data: []
    }
  }
})

// 获取所有维度
ipcMain.handle('dict:getAllDimensions', () => {
  try {
    const dimensions = dataDictionary.getAllDimensions()
    return { success: true, data: dimensions }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取维度失败',
      data: []
    }
  }
})

// 添加自定义维度
ipcMain.handle('dict:addDimension', async (_, dimension: any) => {
  try {
    const newDimension = dataDictionary.addDimension(dimension)
    return { success: true, data: newDimension }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '添加维度失败',
      data: null
    }
  }
})

// 生成 AI 描述
ipcMain.handle('dict:generateAIDesc', () => {
  try {
    const description = dataDictionary.generateAIDescription()
    return { success: true, data: description }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '生成AI描述失败',
      data: ''
    }
  }
})

// 导出数据字典
ipcMain.handle('dict:export', () => {
  try {
    const data = dataDictionary.export()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '导出数据字典失败',
      data: null
    }
  }
})

// 导入数据字典
ipcMain.handle('dict:import', async (_, data: any) => {
  try {
    dataDictionary.import(data)
    return { success: true, message: '导入成功' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '导入数据字典失败'
    }
  }
})

// ========== SQL 安全 IPC 处理器 ==========

// 验证 SQL
ipcMain.handle('sql:validate', async (_, sql: string) => {
  try {
    const result = sqlSecurityValidator.validate(sql)
    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '验证失败',
      data: null
    }
  }
})

// 获取审计日志
ipcMain.handle('sql:auditLog', async (_, limit: number = 100) => {
  try {
    const log = sqlSecurityValidator.getAuditLog(limit)
    return { success: true, data: log }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取日志失败',
      data: []
    }
  }
})

// 生成查询摘要
ipcMain.handle('sql:summary', async (_, sql: string) => {
  try {
    const summary = sqlSecurityValidator.generateQuerySummary(sql)
    return { success: true, data: summary }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '生成摘要失败',
      data: null
    }
  }
})

// 生成指标查询 SQL
ipcMain.handle('metrics:generateSQL', async (_, query: any, tableName?: string) => {
  try {
    const sql = metricLayer.generateMetricSQL(query, tableName)
    return { success: true, data: { sql, metric: metricLayer.getMetric(query.metricId) } }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '生成 SQL 失败',
      data: null
    }
  }
})

// ========== 指标层 V2 IPC 处理器 ==========

// 获取所有指标 V2
ipcMain.handle('metricsV2:getAll', () => {
  try {
    const metrics = metricLayerV2.getAllMetrics()
    return { success: true, data: metrics }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取指标失败',
      data: []
    }
  }
})

// 获取单个指标 V2
ipcMain.handle('metricsV2:get', async (_, id: string) => {
  try {
    const metric = metricLayerV2.getMetric(id)
    return { success: true, data: metric }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取指标失败',
      data: null
    }
  }
})

// 搜索指标 V2
ipcMain.handle('metricsV2:search', async (_, keyword: string) => {
  try {
    const metrics = metricLayerV2.searchMetrics(keyword)
    return { success: true, data: metrics }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '搜索指标失败',
      data: []
    }
  }
})

// 添加指标 V2
ipcMain.handle('metricsV2:add', async (_, metric: any) => {
  try {
    const newMetric = metricLayerV2.addMetric(metric)
    return { success: true, data: newMetric }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '添加指标失败',
      data: null
    }
  }
})

// 更新指标 V2
ipcMain.handle('metricsV2:update', async (_, id: string, updates: any) => {
  try {
    const success = metricLayerV2.updateMetric(id, updates)
    return { success, data: { updated: success } }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新指标失败',
      data: null
    }
  }
})

// 删除指标 V2
ipcMain.handle('metricsV2:delete', async (_, id: string) => {
  try {
    const success = metricLayerV2.deleteMetric(id)
    return { success: true, data: { deleted: success } }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '删除指标失败',
      data: null
    }
  }
})

// 验证指标使用约束
ipcMain.handle('metricsV2:validateUsage', async (_, metricId: string, dimensions?: string[]) => {
  try {
    const check = metricLayerV2.validateMetricUsage(metricId, dimensions)
    return { success: true, data: check }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '验证失败',
      data: null
    }
  }
})

// 生成带约束的 SQL
ipcMain.handle('metricsV2:generateConstrainedSQL', async (_, metricId: string, dimensions?: string[], timeRange?: string) => {
  try {
    const result = metricLayerV2.generateConstrainedSQL(metricId, dimensions, timeRange)
    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '生成 SQL 失败',
      data: null
    }
  }
})

// 获取所有组合指标
ipcMain.handle('metricsV2:getAllComposite', () => {
  try {
    const metrics = metricLayerV2.getAllCompositeMetrics()
    return { success: true, data: metrics }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取组合指标失败',
      data: []
    }
  }
})

// 添加组合指标
ipcMain.handle('metricsV2:addComposite', async (_, metric: any) => {
  try {
    const newMetric = metricLayerV2.addCompositeMetric(metric)
    return { success: true, data: newMetric }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '添加组合指标失败',
      data: null
    }
  }
})

// 生成组合指标 SQL
ipcMain.handle('metricsV2:generateCompositeSQL', async (_, compositeMetricId: string) => {
  try {
    const sql = metricLayerV2.generateCompositeMetricSQL(compositeMetricId)
    return { success: true, data: { sql, compositeMetricId } }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '生成组合指标 SQL 失败',
      data: null
    }
  }
})

// ========== 可信度系统 IPC 处理器 ==========

// 计算可信度分数
ipcMain.handle('confidence:calculate', async (_, input: any) => {
  try {
    const confidence = confidenceEngine.calculate(input)
    return { success: true, data: confidence }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '计算可信度失败',
      data: null
    }
  }
})

// 从 SQL 提取统计信息
ipcMain.handle('confidence:extractSQLStats', async (_, sql: string) => {
  try {
    const stats = confidenceEngine.extractSQLStats(sql)
    return { success: true, data: stats }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '提取 SQL 统计失败',
      data: null
    }
  }
})

// 快速评估可信度
ipcMain.handle('confidence:quickAssess', async (_, sql: string, hasMetric: boolean) => {
  try {
    const score = confidenceEngine.quickAssess(sql, hasMetric)
    return { success: true, data: { score } }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '快速评估失败',
      data: null
    }
  }
})

// ========== AI 分析引擎 V2 IPC 处理器 ==========

// 执行深度分析
ipcMain.handle('analysis:analyze', async (_, request: any) => {
  try {
    // 需要先初始化 analysisEngineV2
    if (!aiChatManager) {
      throw new Error('AI 服务未初始化')
    }

    // 创建临时的 analysisEngineV2 实例
    const engine = new (AnalysisEngineV2 as any)(aiChatManager)
    const result = await engine.analyze(request)
    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '分析失败',
      data: null
    }
  }
})

// 生成分析报告摘要
ipcMain.handle('analysis:generateSummary', async (_, result: any) => {
  try {
    // 临时实例来调用方法
    const engine = new (AnalysisEngineV2 as any)(null)
    const summary = engine.generateSummary(result)
    return { success: true, data: summary }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '生成摘要失败',
      data: ''
    }
  }
})

// ========== 新分析引擎 (Analyze Mode) IPC 处理器 ==========

// 执行深入分析 (新功能)
ipcMain.handle('analyze:run', async (_, request: any) => {
  try {
    if (!aiChatManager) {
      throw new Error('AI 服务未初始化')
    }
    // 设置 AI Manager
    ;(analyzeEngine as any).aiManager = aiChatManager
    const result = await analyzeEngine.analyze(request)

    // 创建持久化对话会话
    const queryText = request.queryResult?.sql || request.metric || '数据分析'
    const sessionId = chatHistoryStore.createSession(
      queryText,
      {
        metric: request.metric,
        queryResult: request.queryResult,
        analysis: result,
        databaseConfig: request.databaseConfig,
        timeRange: request.timeRange
      }
    )

    // 同时在内存中创建上下文（用于后续对话）
    const { conversationContextManager } = require('./ai/conversation-context')
    conversationContextManager.createContext(
      request.metric || 'unknown',
      request.queryResult?.sql || 'unknown',
      result,
      request.databaseConfig,
      request.timeRange
    )

    return { success: true, data: result, sessionId }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '分析失败',
      data: null
    }
  }
})

// 带上下文的对话
ipcMain.handle('chat:withContext', async (_, sessionId: string, question: string) => {
  try {
    if (!aiChatManager) {
      throw new Error('AI 服务未初始化')
    }

    // 保存用户消息
    chatHistoryStore.addMessage(sessionId, 'user', question)

    const result = await analyzeEngine.chatWithContext(sessionId, question)

    // 保存AI回复
    if (result.answer) {
      chatHistoryStore.addMessage(sessionId, 'assistant', result.answer)
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '对话失败',
      data: null
    }
  }
})

// ========== 对话历史 IPC 处理器 ==========

// 创建新会话
ipcMain.handle('chat:createSession', async (_, initialMessage?: string, metadata?: any) => {
  try {
    const sessionId = chatHistoryStore.createSession(initialMessage, metadata)
    return { success: true, data: { sessionId } }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '创建会话失败',
      data: null
    }
  }
})

// 获取会话详情
ipcMain.handle('chat:getSession', async (_, sessionId: string) => {
  try {
    const session = chatHistoryStore.getSession(sessionId)
    if (!session) {
      return { success: false, message: '会话不存在', data: null }
    }
    return { success: true, data: session }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取会话失败',
      data: null
    }
  }
})

// 获取所有会话列表
ipcMain.handle('chat:getAllSessions', async () => {
  try {
    const sessions = chatHistoryStore.getAllSessions()
    return { success: true, data: sessions }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取会话列表失败',
      data: null
    }
  }
})

// 获取当前会话
ipcMain.handle('chat:getCurrentSession', async () => {
  try {
    const sessionId = chatHistoryStore.getCurrentSessionId()
    const session = sessionId ? chatHistoryStore.getSession(sessionId) : null
    return { success: true, data: session }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取当前会话失败',
      data: null
    }
  }
})

// 设置当前会话
ipcMain.handle('chat:setCurrentSession', async (_, sessionId: string) => {
  try {
    const success = chatHistoryStore.setCurrentSession(sessionId)
    return { success, message: success ? '设置成功' : '会话不存在' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '设置当前会话失败'
    }
  }
})

// 删除会话
ipcMain.handle('chat:deleteSession', async (_, sessionId: string) => {
  try {
    const success = chatHistoryStore.deleteSession(sessionId)
    return { success, message: success ? '删除成功' : '会话不存在' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '删除会话失败'
    }
  }
})

// 清空所有会话
ipcMain.handle('chat:clearAllSessions', async () => {
  try {
    chatHistoryStore.clearAllSessions()
    return { success: true, message: '已清空所有会话' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '清空会话失败'
    }
  }
})

// ========== 记忆系统 (Memory) IPC 处理器 ==========

// 智能召回 - 根据问题检索相关历史
ipcMain.handle('memory:recall', async (_, query: string, options?: any) => {
  try {
    const result = await memoryManager.recall(query, options)
    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '召回失败',
      data: null
    }
  }
})

// 获取会话上下文窗口（用于AI对话）
ipcMain.handle('memory:getContextWindow', async (_, query: string, sessionId?: string, maxTokens?: number) => {
  try {
    const context = await memoryManager.getContextWindow(query, sessionId, maxTokens)
    return { success: true, data: { context } }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取上下文失败',
      data: null
    }
  }
})

// 获取会话详情（包含语义摘要）
ipcMain.handle('memory:getSession', async (_, sessionId: string) => {
  try {
    const session = await memoryManager.getSession(sessionId)
    return { success: true, data: session }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取会话失败',
      data: null
    }
  }
})

// 获取所有会话（包含语义摘要）
ipcMain.handle('memory:getAllSessions', async () => {
  try {
    const sessions = await memoryManager.getAllSessions()
    return { success: true, data: sessions }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取会话列表失败',
      data: null
    }
  }
})

// 添加消息（自动语义化）
ipcMain.handle('memory:addMessage', async (_, sessionId: string, role: 'user' | 'assistant', content: string) => {
  try {
    const messageId = await memoryManager.addMessage(sessionId, role, content)
    return { success: true, data: { messageId } }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '添加消息失败',
      data: null
    }
  }
})

// 删除会话（删除所有层的记忆）
ipcMain.handle('memory:deleteSession', async (_, sessionId: string) => {
  try {
    const success = await memoryManager.deleteSession(sessionId)
    return { success, message: success ? '删除成功' : '会话不存在' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '删除会话失败'
    }
  }
})

// 获取记忆统计信息
ipcMain.handle('memory:getStats', async () => {
  try {
    const stats = memoryManager.getStats()
    return { success: true, data: stats }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取统计信息失败',
      data: null
    }
  }
})

// ========== 查询模板 IPC 处理器 ==========

// 获取所有模板
ipcMain.handle('templates:getAll', async () => {
  try {
    const templates = queryTemplateManager.getAllTemplates()
    return { success: true, data: templates }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取模板失败',
      data: null
    }
  }
})

// 创建模板
ipcMain.handle('templates:create', async (_, template: Omit<any, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
  try {
    const created = await queryTemplateManager.createTemplate(template)
    return { success: true, data: created }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '创建模板失败',
      data: null
    }
  }
})

// 更新模板
ipcMain.handle('templates:update', async (_, id: string, updates: any) => {
  try {
    const success = await queryTemplateManager.updateTemplate(id, updates)
    return { success, message: success ? '更新成功' : '模板不存在' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新模板失败'
    }
  }
})

// 删除模板
ipcMain.handle('templates:delete', async (_, id: string) => {
  try {
    const success = await queryTemplateManager.deleteTemplate(id)
    return { success, message: success ? '删除成功' : '模板不存在' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '删除模板失败'
    }
  }
})

// 使用模板（增加使用次数）
ipcMain.handle('templates:use', async (_, id: string) => {
  try {
    await queryTemplateManager.useTemplate(id)
    return { success: true, message: '记录使用成功' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '记录失败'
    }
  }
})

// 搜索模板
ipcMain.handle('templates:search', async (_, keyword: string) => {
  try {
    const templates = queryTemplateManager.searchTemplates(keyword)
    return { success: true, data: templates }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '搜索失败',
      data: null
    }
  }
})

// 获取热门模板
ipcMain.handle('templates:getPopular', async (_, limit: number = 5) => {
  try {
    const templates = queryTemplateManager.getPopularTemplates(limit)
    return { success: true, data: templates }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取热门模板失败',
      data: null
    }
  }
})

// ========== 数据安全策略 IPC 处理器 ==========

// 获取安全配置
ipcMain.handle('security:getConfig', () => {
  try {
    const config = dataSecurityManager.getConfig()
    return { success: true, data: config }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取配置失败',
      data: null
    }
  }
})

// 更新安全配置
ipcMain.handle('security:updateConfig', async (_, updates: any) => {
  try {
    dataSecurityManager.updateConfig(updates)
    return { success: true, message: '配置已更新' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新配置失败'
    }
  }
})

// 检查表访问权限
ipcMain.handle('security:checkTableAccess', async (_, tableName: string) => {
  try {
    const policy = dataSecurityManager.checkTableAccess(tableName)
    return { success: true, data: policy }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '检查表权限失败',
      data: null
    }
  }
})

// 检查 SQL 安全
ipcMain.handle('security:checkSQLSecurity', async (_, sql: string) => {
  try {
    const policy = dataSecurityManager.checkSQLSecurity(sql)
    return { success: true, data: policy }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '检查 SQL 安全失败',
      data: null
    }
  }
})

// 生成安全提示
ipcMain.handle('security:getTips', () => {
  try {
    const tips = dataSecurityManager.generateSecurityTips()
    return { success: true, data: tips }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取安全提示失败',
      data: []
    }
  }
})

// 生成安全说明
ipcMain.handle('security:getDescription', () => {
  try {
    const description = dataSecurityManager.generateSecurityDescription()
    return { success: true, data: description }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '生成安全说明失败',
      data: null
    }
  }
})

// ========== 数据脱敏 IPC 处理器 ==========

// 脱敏数据
ipcMain.handle('anonymize:anonymizeData', async (_, tableName: string, rows: any[], enabled: boolean) => {
  try {
    const result = dataAnonymizer.anonymizeData(tableName, rows, enabled)
    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '脱敏失败',
      data: null
    }
  }
})

// 为 AI 准备数据
ipcMain.handle('anonymize:prepareForAI', async (_, data: any[], config?: any) => {
  try {
    const result = dataAnonymizer.prepareDataForAI(data, config)
    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '准备数据失败',
      data: null
    }
  }
})

// 检查字段是否敏感
ipcMain.handle('anonymize:isSensitiveField', async (_, fieldName: string) => {
  try {
    const isSensitive = dataAnonymizer.isSensitiveField(fieldName)
    return { success: true, data: { isSensitive } }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '检查失败',
      data: null
    }
  }
})

// 生成脱敏报告
ipcMain.handle('anonymize:generateReport', async (_, result: any) => {
  try {
    const report = dataAnonymizer.generateAnonymizationReport(result)
    return { success: true, data: report }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '生成报告失败',
      data: ''
    }
  }
})

// 获取所有脱敏规则
ipcMain.handle('anonymize:getAllRules', () => {
  try {
    const rules = dataAnonymizer.getAllRules()
    return { success: true, data: rules }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取规则失败',
      data: []
    }
  }
})

// ========== 漏斗分析 IPC 处理器 ==========
import('./funnel-handlers')

// ========== 审计日志 IPC 处理器 ==========

// 记录查询
ipcMain.handle('audit:log', async (_, entry: any) => {
  try {
    auditLoggerV2.log(entry)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '记录日志失败'
    }
  }
})

// 获取日志
ipcMain.handle('audit:getLogs', async (_, limit: number, offset: number) => {
  try {
    const logs = auditLoggerV2.getLogs(limit, offset)
    return { success: true, data: logs }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取日志失败',
      data: []
    }
  }
})

// 获取日志统计
ipcMain.handle('audit:getStats', async (_, timeRange?: any) => {
  try {
    const stats = auditLoggerV2.generateStats(timeRange)
    return { success: true, data: stats }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '生成统计失败',
      data: null
    }
  }
})

// 导出日志
ipcMain.handle('audit:export', async (_, format: 'json' | 'csv') => {
  try {
    if (format === 'json') {
      const json = auditLoggerV2.exportLogsJSON()
      return { success: true, data: { content: json, format: 'json' } }
    } else {
      const csv = auditLoggerV2.exportLogsCSV()
      return { success: true, data: { content: csv, format: 'csv' } }
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '导出失败',
      data: null
    }
  }
})

// 获取日志摘要
ipcMain.handle('audit:getSummary', async (_, limit: number) => {
  try {
    const summary = auditLoggerV2.getSummary(limit)
    return { success: true, data: summary }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取摘要失败',
      data: null
    }
  }
})

// 清空日志
ipcMain.handle('audit:clear', () => {
  try {
    auditLoggerV2.clearLogs()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '清空失败'
    }
  }
})

// ========== 缓存管理 IPC 处理器 ==========

// 获取缓存统计
ipcMain.handle('cache:getStats', async () => {
  try {
    const { cacheManager } = await import('./cache/cache-manager')
    const stats = cacheManager.getStats()
    return { success: true, data: stats }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取缓存统计失败',
      data: null
    }
  }
})

// 清除指定数据库的缓存
ipcMain.handle('cache:clearDatabase', async (_, database: string) => {
  try {
    const { cacheManager } = await import('./cache/cache-manager')
    await cacheManager.clearDatabase(database)
    return { success: true, message: '缓存已清除' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '清除缓存失败'
    }
  }
})

// 清除所有缓存
ipcMain.handle('cache:clearAll', async () => {
  try {
    const { cacheManager } = await import('./cache/cache-manager')
    await cacheManager.clearAll()
    return { success: true, message: '所有缓存已清除' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '清除缓存失败'
    }
  }
})

// 获取缓存配置
ipcMain.handle('cache:getConfig', async () => {
  try {
    const { cacheManager } = await import('./cache/cache-manager')
    const config = cacheManager.getConfig()
    return { success: true, data: config }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取配置失败',
      data: null
    }
  }
})

// 更新缓存配置
ipcMain.handle('cache:setConfig', async (_, config: any) => {
  try {
    const { cacheManager } = await import('./cache/cache-manager')
    cacheManager.setConfig(config)
    return { success: true, message: '配置已更新' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新配置失败'
    }
  }
})

// 重置缓存统计
ipcMain.handle('cache:resetStats', async () => {
  try {
    const { cacheManager } = await import('./cache/cache-manager')
    cacheManager.resetStats()
    return { success: true, message: '统计已重置' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '重置统计失败'
    }
  }
})

// 获取热门查询模式
ipcMain.handle('cache:getTopPatterns', async (_, limit: number = 10) => {
  try {
    const { cacheManager } = await import('./cache/cache-manager')
    const patterns = cacheManager.getTopPatterns(limit)
    return { success: true, data: patterns }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取查询模式失败',
      data: []
    }
  }
})

// 获取缓存预热建议
ipcMain.handle('cache:getWarmingSuggestions', async () => {
  try {
    const { cacheManager } = await import('./cache/cache-manager')
    const suggestions = cacheManager.getWarmingSuggestions()
    return { success: true, data: suggestions }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取预热建议失败',
      data: []
    }
  }
})

// ========== 持久化存储 IPC 处理器 ==========
// 用于保存 AI 配置、用户偏好等跨会话数据

ipcMain.handle('store:get', (_, key: string) => {
  return appStore.get(key)
})

ipcMain.handle('store:set', (_, key: string, value: any) => {
  appStore.set(key, value)
})

ipcMain.handle('store:delete', (_, key: string) => {
  appStore.delete(key)
})

// ========== 文件系统 IPC 处理器 ==========

// 弹出系统原生文件选择对话框
ipcMain.handle('dialog:openFile', async (_, options?: any) => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择数据文件',
    properties: ['openFile'],
    filters: [
      { name: '数据文件', extensions: ['csv', 'xlsx', 'xls', 'json', 'parquet'] },
      { name: 'CSV 文件', extensions: ['csv'] },
      { name: '所有文件', extensions: ['*'] },
    ],
    ...(options || {}),
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

// 读取文件内容（主进程有 fs 访问权限）
ipcMain.handle('file:read', async (_, filePath: string) => {
  try {
    guardString(filePath, 1000, '文件路径')

    // 路径遍历防护：规范化路径，禁止访问用户目录之外
    const resolved = path.resolve(filePath)
    const allowedRoots = [app.getPath('home'), app.getPath('downloads'), app.getPath('documents'), app.getPath('temp')]
    const isAllowed = allowedRoots.some(root => resolved.startsWith(root))
    if (!isAllowed) {
      return { success: false, error: '无权限访问该路径' }
    }

    // 文件大小限制：50MB
    const stats = fs.statSync(resolved)
    if (stats.size > 50 * 1024 * 1024) {
      return { success: false, error: '文件超过 50MB 限制' }
    }

    const content = fs.readFileSync(resolved, 'utf-8')
    return {
      success: true,
      content,
      size: stats.size,
      name: path.basename(resolved),
      path: resolved,
    }
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error),
    }
  }
})

// 获取文件表的列信息
ipcMain.handle('file:get-table', async (_, dbId: string, tableName: string) => {
  try {
    const table = fileTableRegistry.getTable(dbId, tableName)
    if (!table) {
      return { success: false, error: `表 "${tableName}" 不存在` }
    }
    return {
      success: true,
      data: {
        tableName: table.tableName,
        columns: table.columns,
      },
    }
  } catch (error) {
    return { success: false, error: sanitizeError(error) }
  }
})

// 注册文件到 FileTableRegistry（读取内容并加载到内存）
ipcMain.handle('file:register', async (_, dbId: string, filePath: string, fileName: string, content?: string) => {
  try {
    guardString(fileName, 200, '文件名')

    // 有 content 表示拖拽过来的文件（无路径），直接用内容加载
    if (content !== undefined) {
      if (content.length > 100 * 1024 * 1024) {
        return { success: false, error: '文件超过 100MB 限制' }
      }
      fileTableRegistry.loadFileContent(dbId, content, fileName)
      return { success: true, content }
    }

    // 无 content，走路径读取
    guardString(filePath, 1000, '文件路径')
    const resolved = path.resolve(filePath)
    const allowedRoots = [app.getPath('home'), app.getPath('downloads'), app.getPath('documents'), app.getPath('temp')]
    const isAllowed = allowedRoots.some(root => resolved.startsWith(root))
    if (!isAllowed) {
      return { success: false, error: '无权限访问该路径，请将文件放在桌面、下载或文档文件夹中' }
    }
    const stats = fs.statSync(resolved)
    if (stats.size > 100 * 1024 * 1024) {
      return { success: false, error: '文件超过 100MB 限制' }
    }
    fileTableRegistry.loadFile(dbId, filePath, fileName)
    // 读取文件内容返回给前端，以便存储到 localStorage
    const fileContent = fs.readFileSync(resolved, 'utf-8')
    return { success: true, content: fileContent }
  } catch (error) {
    return {
      success: false,
      error: `文件读取失败：${sanitizeError(error)}`,
    }
  }
})

// ========== 表格 Schema 智能分析 ==========

// 分析单个 CSV 文件的 schema，返回表格类型 + 匹配的分析模板
ipcMain.handle('table:analyze-schema', async (_, filePath: string, fileName: string) => {
  try {
    let content = ''
    if (filePath) {
      try {
        content = fs.readFileSync(filePath, 'utf-8')
      } catch {
        // 路径无法读取（如拖拽时无 path），返回低置信度结果
      }
    }
    const result = await analyzeTableSchema(fileName, content, aiChatManager)
    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '分析失败',
    }
  }
})

// 获取完整的分析模板库
ipcMain.handle('table:get-template-library', () => {
  return {
    success: true,
    data: {
      templates: ANALYSIS_TEMPLATES,
      categoryLabels: CATEGORY_LABELS,
    },
  }
})

// 批量分析多张表并汇总匹配到的模板（限制并发数，防止 CPU 过载）
ipcMain.handle('table:batch-analyze', async (_, tables: Array<{ filePath: string; fileName: string }>) => {
  try {
    const CONCURRENCY = 3  // 同时最多 3 个 AI 请求
    const results: any[] = new Array(tables.length)
    let index = 0

    async function runNext(): Promise<void> {
      if (index >= tables.length) return
      const i = index++
      results[i] = await analyzeTableSchema(tables[i].fileName, '', aiChatManager)
      await runNext()
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tables.length) }, runNext))
    return { success: true, data: results }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '批量分析失败',
    }
  }
})

// ── 分析引擎：自动分析 + 模板执行 ──────────────────────────────────────────────

/**
 * 识别表类型（采样推断）
 */
ipcMain.handle('analysis:recognize-table', async (_, db: DatabaseConfig, tableName: string) => {
  try {
    // 从 fileTableRegistry 获取已加载的表结构（含懒加载）
    if ((db.type as string) === 'file' && db.id) {
      let tables = fileTableRegistry.getTablesForDb(db.id)
      // 去掉扩展名，与 loadFile/loadFileContent 保持一致
      const dbName = (db as any).database || tableName
      const tableNameKey = dbName.replace(/\.[^/.]+$/, '') || tableName
      if (tables.length === 0 && (db as any).filePath) {
        try { fileTableRegistry.loadFile(db.id, (db as any).filePath, dbName); tables = fileTableRegistry.getTablesForDb(db.id) } catch { /* ignore */ }
      }
      if (tables.length === 0 && (db as any).fileContent) {
        try { fileTableRegistry.loadFileContent(db.id, (db as any).fileContent, dbName); tables = fileTableRegistry.getTablesForDb(db.id) } catch { /* ignore */ }
      }
      const table = tables.find(t => t.tableName === tableNameKey)
      if (table) {
        const colNames = table.columns.map(c => c.name)
        const tableType = inferTableType(colNames, tableName)
        const suggestedTemplateIds = getSuggestedTemplates(colNames, tableType, table.columns, 'file', tableName)
        const analysis = await analyzeTableSchema(tableName, '', aiChatManager).catch(() => ({
          tableType: tableType.label,
          confidence: 0.5,
          suggestedTemplateIds,
          needsConfirmation: false,
          analysisSource: 'heuristic' as const,
        }))
        return {
          success: true,
          data: {
            ...analysis,
            tableType: analysis.tableType || tableType.label,
            suggestedTemplateIds,
            columns: table.columns,
          },
        }
      }
    }
    // 真实数据库：查前 20 行推断类型
    let rows: any[] = []
    let colNames: string[] = []
    try {
      const sampleResult = await databaseManager.query(db, `SELECT * FROM "${tableName}" LIMIT 20`)
      rows = sampleResult.rows || []
      colNames = sampleResult.columns || []
    } catch {
      return { success: false, error: '无法获取表结构' }
    }
    const columns = colNames.map((name: string) => ({
      name,
      sampleValues: rows.slice(0, 5).map((r: any) => String(r[name] ?? '')).filter(Boolean),
      inferredType: 'string' as const,
    }))
    const analysis = await analyzeTableSchema(tableName, '', aiChatManager)
    return { success: true, data: { ...analysis, columns } }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '表类型识别失败' }
  }
})

/**
 * 获取表的前 N 行数据（用于预览弹窗）
 */
ipcMain.handle('analysis:getTableData', async (_, db: DatabaseConfig, tableName: string, limit = 50) => {
  try {
    if ((db.type as string) === 'file' && db.id) {
      let tables = fileTableRegistry.getTablesForDb(db.id)
      if (tables.length === 0 && (db as any).filePath) {
        try { fileTableRegistry.loadFile(db.id, (db as any).filePath, db.database || tableName); tables = fileTableRegistry.getTablesForDb(db.id) } catch { /* ignore */ }
      }
      if (tables.length === 0 && (db as any).fileContent) {
        try { fileTableRegistry.loadFileContent(db.id, (db as any).fileContent, db.database || tableName); tables = fileTableRegistry.getTablesForDb(db.id) } catch { /* ignore */ }
      }
      const table = tables.find(t => t.tableName === tableName)
      if (!table) return { success: false, error: `表 ${tableName} 未找到` }
      const rows = table.rows.slice(0, limit)
      const columns = table.columns.map(c => c.name)
      return { success: true, data: { columns, rows, total: table.rows.length } }
    }
    // 真实数据库
    const result = await databaseManager.query(db, `SELECT * FROM "${tableName}" LIMIT ${limit}`)
    return { success: true, data: { columns: result.columns || [], rows: result.rows || [], total: result.rowCount || 0 } }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '获取表数据失败' }
  }
})

// ─────────────────────────────────────────────────────────────────
// 表类型推断引擎（两层：表名匹配 → 列信息重新判断）
// 原则：表名是最强信号，列信息用于确认或覆盖
// ─────────────────────────────────────────────────────────────────

// 表名关键词 → 表类型映射
const TABLE_NAME_PATTERNS: Array<{
  keywords: string[]
  type: string
  label: string
  // 列字段精化：表名匹配后，验证列是否支持该判断
  // 返回 false 则用列字段重新判断（覆盖表名结果）
  confirm?: (cols: string[], has: Record<string, boolean>) => boolean
}> = [
  // ── 记账交易表（金额 + 时间 + 分类/支付，无商品/产品字段）────────
  {
    keywords: ['transaction', 'transactions', 'txn', 'txns', 'payment', 'payments', 'pay', 'bill', 'invoice', 'charge', 'ledger', 'entry', '流水'],
    type: 'transaction', label: '记账交易表',
    // 表名已明确是交易类，不需要列字段二次确认
  },
  // ── 电商/订单表（金额 + 商品/产品字段）──────────────────────────
  {
    keywords: ['order', 'orders', 'trade', 'purchase', 'cart', 'checkout'],
    type: 'ecommerce', label: '电商/订单表',
    confirm: (cols, has) => has.hasAmount && (has.hasProduct || has.hasCategory),
  },
  // ── 财务/收入表（金额 + 财务相关关键词）────────────────────────
  {
    keywords: ['revenue', 'income', 'profit', 'sales', 'gmv', 'earnings', 'billing', 'settlement'],
    type: 'revenue', label: '财务/收入表',
    confirm: (cols, has) => has.hasAmount,
  },
  // ── 用户行为事件表 ────────────────────────────────────────────
  {
    keywords: ['event', 'log', 'action', 'activity', 'audit', 'click', 'visit', 'access'],
    type: 'conversion', label: '用户行为表',
    confirm: (cols, has) => has.hasUser || has.hasEvent,
  },
  // ── 用户分析表 ────────────────────────────────────────────────
  {
    keywords: ['user', 'users', 'customer', 'customers', 'member', 'members', 'account', 'accounts', 'signup', 'register', 'cohort'],
    type: 'retention', label: '用户分析表',
    confirm: (cols, has) => has.hasTime || has.hasUser,
  },
  // ── SaaS 指标表 ──────────────────────────────────────────────
  {
    keywords: ['mrr', 'arr', 'subscription', 'trial', 'churn', 'recurring'],
    type: 'saas', label: 'SaaS 指标表',
    confirm: (cols, has) => has.hasAmount || cols.some(c => /amount|revenue|mrr|plan/.test(c)),
  },
  // ── 营销分析表 ───────────────────────────────────────────────
  {
    keywords: ['campaign', 'ads', 'ad', 'marketing', 'channel', 'seo', 'conversion', 'attribution'],
    type: 'marketing', label: '营销分析表',
    confirm: (cols, has) => has.hasAmount || has.hasChannel,
  },
  // ── 产品分析表 ───────────────────────────────────────────────
  {
    keywords: ['ab_test', 'abtest', 'experiment', 'variant', 'nps', 'feedback', 'survey'],
    type: 'product', label: '产品分析表',
    confirm: (cols, has) => cols.some(c => /test|variant|experiment|nps|feedback|ab/.test(c)),
  },
  // ── 内容流量表 ───────────────────────────────────────────────
  {
    keywords: ['page', 'view', 'views', 'traffic', 'bounce', 'article', 'post', 'content', 'read'],
    type: 'content', label: '内容流量表',
    confirm: (cols, has) => cols.some(c => /page|view|traffic|bounce|content|article|click/.test(c)),
  },
  // ── 人员管理表 ───────────────────────────────────────────────
  {
    keywords: ['employee', 'staff', 'hire', 'recruit', 'headcount', 'attrition', 'salary', 'payroll', 'team'],
    type: 'hr', label: '人员管理表',
    confirm: (cols, has) => cols.some(c => /employee|hire|salary|department|headcount|attrition/.test(c)),
  },
  // ── 库存/商品表 ───────────────────────────────────────────────
  {
    keywords: ['product', 'products', 'sku', 'inventory', 'stock', 'goods', 'item', 'items', 'catalog'],
    type: 'inventory', label: '商品/库存表',
    confirm: (cols, has) => cols.some(c => /product|sku|stock|price|category|inventory/.test(c)),
  },
  // ── 工单/客服表 ─────────────────────────────────────────────
  {
    keywords: ['ticket', 'tickets', 'support', 'issue', 'complaint', 'case', 'service'],
    type: 'support', label: '工单/客服表',
    confirm: (cols, has) => cols.some(c => /ticket|support|issue|status|priority|category/.test(c)),
  },
  // ── 通知/消息表 ─────────────────────────────────────────────
  {
    keywords: ['notification', 'notifications', 'message', 'messages', 'email_log', 'sms_log', 'push_log', 'mail_log', 'alert'],
    type: 'notification', label: '通知/消息表',
    confirm: (cols, has) => cols.some(c => /notification|message|email|sms|push|status|type|channel/.test(c)),
  },
  // ── 评价/评分表 ─────────────────────────────────────────────
  {
    keywords: ['review', 'reviews', 'rating', 'ratings', 'comment', 'comments', 'feedback', 'rating_log'],
    type: 'review', label: '评价/评分表',
    confirm: (cols, has) => cols.some(c => /rating|review|comment|score|star|feedback|user|product/.test(c)),
  },
  // ── 会话/登录日志表 ──────────────────────────────────────────
  {
    keywords: ['session', 'sessions', 'login_log', 'access_log', 'auth_log', 'online'],
    type: 'session', label: '会话/登录表',
    confirm: (cols, has) => cols.some(c => /session|login|logout|access|auth|online|ip|device/.test(c)),
  },
  // ── 库存流水表 ───────────────────────────────────────────────
  {
    keywords: ['inventory_log', 'stock_log', 'movement', 'warehouse', 'fulfillment', 'shipment', 'delivery'],
    type: 'inventory_log', label: '库存流水表',
    confirm: (cols, has) => cols.some(c => /inventory|stock|movement|in|out|warehouse|shipment|quantity/.test(c)),
  },
]

// 模糊匹配：kw 是关键词，target 是表名
// 匹配：直接包含 / 忽略下划线连字符后包含 / 子串匹配（kw>=3字符）
function fuzzyMatch(kw: string, target: string): boolean {
  if (target.includes(kw)) return true
  const norm = kw.replace(/[_-]/g, '')
  if (target.replace(/[_-]/g, '').includes(norm)) return true
  if (kw.length >= 3 && target.includes(kw)) return true
  return false
}

// 仅用列字段判断表类型（无表名时使用，也是表名不匹配时的唯一依据）
function inferFromColumns(cols: string[]): { label: string; type: string } {
  const has = {
    hasAmount:   cols.some(c => /amount|revenue|income|gmv|sales|profit|fee|cost|price|tvl|volume|expense|budget|margin/.test(c)),
    hasTime:     cols.some(c => /time|date|created|updated|period|dt$|at$|timestamp/.test(c)),
    hasUser:     cols.some(c => /user|account|member|uid|customer|client/.test(c)),
    hasStatus:   cols.some(c => /status|state|step|stage|result|condition/.test(c)),
    hasEvent:    cols.some(c => /event|action|behavior|activity|trigger|method|page|funnel/.test(c)),
    hasProduct:  cols.some(c => /product|item|sku|goods|name|title|article|content|post/.test(c)),
    hasChannel:  cols.some(c => /channel|source|medium|platform|region|city/.test(c)),
    hasPayment:  cols.some(c => /payment|method|pay|bank|card|wallet/.test(c)),
    hasCategory: cols.some(c => /category|type$|tag|segment|industry|grade|level/.test(c)),
  }
  const colStr = cols.join(' ')
  // 记账交易表：有金额 + (支付方式|分类) + 无商品字段
  if (has.hasAmount && (has.hasPayment || has.hasCategory) && !/product|sku|goods|item_name|item_title/.test(colStr))
    return { label: '记账交易表', type: 'transaction' }
  // 电商/订单：有金额 + (商品|订单|支付|txn|transaction)
  if (has.hasAmount && (has.hasProduct || /order|txn|transaction|purchase|sku|item/i.test(colStr)))
    return { label: '电商/订单表', type: 'ecommerce' }
  // 财务/收入：有金额 + 时间
  if (has.hasAmount && has.hasTime)
    return { label: '财务/收入表', type: 'revenue' }
  // 记账交易表（有金额 + 支付方式，无商品名称字段）
  if (has.hasAmount && has.hasPayment && !/product|sku|goods|item_name|item_title/i.test(colStr))
    return { label: '记账交易表', type: 'transaction' }
  // 转化漏斗：事件 + (用户|状态)
  if (has.hasEvent && (has.hasUser || has.hasStatus))
    return { label: '用户行为表', type: 'conversion' }
  // 增长分析：用户 + 时间（无金额）
  if (has.hasUser && has.hasTime && !has.hasAmount)
    return { label: '增长分析', type: 'growth' }
  // 用户分析：用户 + 时间
  if (has.hasUser && has.hasTime)
    return { label: '用户分析表', type: 'retention' }
  // 运营效率：事件为主（无金额）
  if (has.hasEvent && !has.hasAmount)
    return { label: '运营效率表', type: 'operations' }
  // 营销分析：渠道
  if (has.hasChannel && (has.hasAmount || has.hasUser))
    return { label: '营销分析表', type: 'marketing' }
  // SaaS 指标
  if (/plan|mrr|arr|subscription|trial/.test(colStr))
    return { label: 'SaaS 指标表', type: 'saas' }
  // 产品分析
  if (/ab_test|variant|experiment|nps|feedback|funnel_drop/.test(colStr))
    return { label: '产品分析表', type: 'product' }
  // 内容流量
  if (/page|view|click|traffic|seo|keyword|bounce|content|post|article/.test(colStr))
    return { label: '内容流量表', type: 'content' }
  // HR 表
  if (/employee|hire|recruit|department|salary|headcount|attrition/.test(colStr))
    return { label: '人员管理表', type: 'hr' }
  // 商品/库存
  if (/product|sku|inventory|stock|goods|catalog/.test(colStr) && !has.hasAmount)
    return { label: '商品/库存表', type: 'inventory' }
  // 工单/客服
  if (/ticket|support|issue|complaint|case|service/.test(colStr) && has.hasStatus)
    return { label: '工单/客服表', type: 'support' }
  // 通知/消息
  if (/notification|message|email_log|sms_log|push_log|mail_log|alert/.test(colStr))
    return { label: '通知/消息表', type: 'notification' }
  // 评价/评分
  if (/review|rating|comment|feedback/.test(colStr) && (has.hasUser || /rating|score|star/.test(colStr)))
    return { label: '评价/评分表', type: 'review' }
  // 会话/登录
  if (/session|login_log|access_log|auth_log|online/.test(colStr))
    return { label: '会话/登录表', type: 'session' }
  // 库存流水
  if (/inventory_log|stock_log|movement|warehouse|fulfillment|shipment|delivery/.test(colStr) && /quantity|in|out|stock/.test(colStr))
    return { label: '库存流水表', type: 'inventory_log' }
  // 有金额无时间：财务表
  if (has.hasAmount && !has.hasTime)
    return { label: '财务分析表', type: 'finance' }
  return { label: '通用数据表', type: 'generic' }
}

function inferTableType(colNames: string[], tableNameHint?: string): { label: string; type: string } {
  const cols = colNames.map(c => c.toLowerCase())

  // ── 第一步：表名模糊匹配（表名是强信号，直接采纳）────────────
  if (tableNameHint) {
    const tableLower = tableNameHint.toLowerCase()
    for (const pattern of TABLE_NAME_PATTERNS) {
      if (pattern.keywords.some(kw => fuzzyMatch(kw, tableLower))) {
        // 表名匹配：优先采纳表名结果；仅当 confirm 明确否定时才继续尝试其他模式
        if (pattern.confirm) {
          const flags = {
            hasAmount:   cols.some(c => /amount|revenue|income|gmv|sales|profit|fee|cost|price|tvl|volume|expense|budget|margin/.test(c)),
            hasTime:     cols.some(c => /time|date|created|updated|period|dt$|at$|timestamp/.test(c)),
            hasUser:     cols.some(c => /user|account|member|uid|customer|client/.test(c)),
            hasStatus:   cols.some(c => /status|state|step|stage|result|condition/.test(c)),
            hasProduct:  cols.some(c => /product|item|sku|goods|name|title|article|content|post/.test(c)),
            hasChannel:  cols.some(c => /channel|source|medium|platform|region|city/.test(c)),
            hasPayment:  cols.some(c => /payment|method|pay|bank|card|wallet/.test(c)),
            hasCategory: cols.some(c => /category|type$|tag|segment|industry|grade|level/.test(c)),
          }
          if (pattern.confirm(cols, flags)) {
            return { label: pattern.label, type: pattern.type }
          }
          // confirm 不匹配 → 继续尝试其他表名模式，不回退列检测
          continue
        }
        return { label: pattern.label, type: pattern.type }
      }
    }
  }

  // ── 第二步：列字段判断（无表名时兜底）───────────────
  return inferFromColumns(cols)
}

// 根据表类型和列名推荐快捷分析模板（过滤掉 CSV 不支持的模板）
function getSuggestedTemplates(colNames: string[], tableType: { label: string; type: string }, columns?: any[], dbType?: string, tableNameHint?: string): string[] | null {
  const cols = colNames.map(c => c.toLowerCase())
  const allStr = [...cols]
  if (tableNameHint) allStr.push(tableNameHint.toLowerCase())

  const hasAmount  = cols.some(c => /amount|revenue|income|gmv|sales|profit|fee|cost|tvl|volume|expense|budget/.test(c))
  const hasTime     = cols.some(c => /time|date|created|updated|period|at$|timestamp/.test(c))
  const hasUser     = cols.some(c => /user|account|member|uid|customer|client/.test(c))
  const hasStatus   = cols.some(c => /status|state|step|stage|result/.test(c))
  const hasEvent    = cols.some(c => /event|action|behavior|activity|trigger|method|funnel/.test(c))
  const hasCategory = cols.some(c => /category|type$|tag|segment|industry|region|channel|platform/.test(c))
  const hasPayment  = cols.some(c => /payment|method|pay|bank|card|wallet/.test(c))
  const hasProduct  = cols.some(c => /product|item|sku|goods|name|title|article|content/.test(c))

  // ── 优先用 inferTableType 已推断出的 tableType（表名匹配，最可靠）────
  const fallbackByType: Record<string, string[]> = {
    ecommerce:     ['order_analysis', 'revenue_trend', 'category_performance', hasPayment ? 'payment_distribution' : '', 'repurchase_rate', 'top_n_ranking'].filter(Boolean),
    transaction:   ['revenue_trend', 'data_overview', hasTime ? 'time_series' : '', hasCategory ? 'category_performance' : '', hasPayment ? 'payment_distribution' : '', hasStatus ? 'refund_analysis' : '', 'top_n_ranking'].filter(Boolean),
    revenue:       ['revenue_trend', 'arpu_arppu', 'profit_trend', hasCategory ? 'category_performance' : '', hasPayment ? 'payment_distribution' : '', 'expense_analysis'].filter(Boolean),
    growth:        ['time_series', 'new_user_acquisition', hasAmount ? 'revenue_trend' : '', 'top_n_ranking', 'data_overview'].filter(Boolean),
    retention:     ['time_series', 'churn_analysis', hasAmount ? 'ltv_analysis' : '', hasAmount ? 'arpu_arppu' : '', 'data_overview', 'top_n_ranking'].filter(Boolean),
    conversion:    ['conversion_funnel', 'signup_conversion', 'purchase_conversion', 'time_series', hasAmount ? 'revenue_trend' : ''].filter(Boolean),
    operations:    ['feature_usage', 'error_analysis', 'session_analysis', hasTime ? 'time_series' : ''].filter(Boolean),
    marketing:     ['campaign_performance', 'channel_roi', hasAmount ? 'revenue_trend' : '', 'top_n_ranking'].filter(Boolean),
    saas:          ['mrr_arr', 'trial_conversion', hasAmount ? 'revenue_trend' : '', 'churn_mrr', 'arpu_arppu'].filter(Boolean),
    product:       ['ab_test', 'funnel_drop_analysis', 'user_segmentation', 'nps_analysis'].filter(Boolean),
    hr:            ['headcount_trend', 'attrition_rate', 'recruitment_pipeline'].filter(Boolean),
    content:       ['content_performance', 'traffic_analysis', 'bounce_rate', 'search_keyword', hasTime ? 'time_series' : ''].filter(Boolean),
    inventory:     ['product_performance', 'category_performance', 'top_n_ranking', 'data_overview'].filter(Boolean),
    finance:       ['expense_analysis', 'arpu_arppu', 'top_n_ranking', hasCategory ? 'category_performance' : ''].filter(Boolean),
    support:       ['data_overview', 'top_n_ranking', hasTime ? 'time_series' : ''].filter(Boolean),
    notification:  ['time_series', 'data_overview', 'top_n_ranking'].filter(Boolean),
    review:        ['data_overview', 'top_n_ranking', 'product_performance', hasTime ? 'time_series' : ''].filter(Boolean),
    session:       ['session_analysis', 'time_series', 'top_n_ranking', hasUser ? 'user_segmentation' : ''].filter(Boolean),
    inventory_log: ['time_series', 'data_overview', 'top_n_ranking', hasCategory ? 'category_performance' : ''].filter(Boolean),
    generic:       [hasAmount ? 'revenue_trend' : hasCategory ? 'category_performance' : '', hasTime ? 'time_series' : '', 'data_overview', 'top_n_ranking'].filter(Boolean),
  }

  if (tableType.type && fallbackByType[tableType.type]) {
    const base = fallbackByType[tableType.type]
    const valid = base.filter(id => {
      if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
      return true
    })
    console.log('[getSuggestedTemplates] tableType.type:', tableType.type, 'base:', base, 'valid:', valid, 'columns:', columns?.map(c => c.name))
    return valid.length > 0 ? valid : []
  }

  // ── 兜底：列字段检测（仅在无法确定表类型时使用）───────────────
  // 记账交易类表（无商品字段）
  if (/\b(transaction|txn|payment|bill|invoice|charge|ledger|entry)\b/i.test(allStr.join(' '))) {
    const isEcom = /product|sku|goods|item_name|item_title/.test(cols.join(' '))
    if (isEcom) {
      const nameBased: string[] = ['order_analysis', 'revenue_trend']
      if (hasCategory) nameBased.push('category_performance')
      if (hasPayment) nameBased.push('payment_distribution')
      if (hasStatus) nameBased.push('refund_analysis')
      nameBased.push('top_n_ranking')
      const valid = nameBased.filter(id => {
        if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
        return true
      })
      return valid.slice(0, 4)
    } else {
      const nameBased: string[] = ['revenue_trend']
      if (hasCategory) nameBased.push('category_performance')
      if (hasPayment) nameBased.push('payment_distribution')
      if (hasStatus) nameBased.push('refund_analysis')
      nameBased.push('top_n_ranking')
      const valid = nameBased.filter(id => {
        if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
        return true
      })
      return valid.slice(0, 4)
    }
  }
  // 电商/订单类表
  if (/\b(order|orders|trade|purchase|cart|checkout)\b/i.test(allStr.join(' '))) {
    const nameBased: string[] = ['order_analysis', 'revenue_trend']
    if (hasCategory) nameBased.push('category_performance')
    if (hasPayment) nameBased.push('payment_distribution')
    if (hasStatus) nameBased.push('refund_analysis')
    nameBased.push('repurchase_rate')
    const valid = nameBased.filter(id => {
      if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
      return true
    })
    return valid.slice(0, 4)
  }
  // 财务/收入类表
  if (/\b(revenue|income|profit|sales|gmv|earnings|billing)\b/i.test(allStr.join(' '))) {
    const nameBased: string[] = ['revenue_trend', 'arpu_arppu']
    if (hasCategory) nameBased.push('category_performance')
    if (hasPayment) nameBased.push('payment_distribution')
    nameBased.push('expense_analysis')
    const valid = nameBased.filter(id => {
      if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
      return true
    })
    return valid.slice(0, 4)
  }
  // 事件/日志类表
  if (/\b(event|log|action|activity|audit|click|visit|access)\b/i.test(allStr.join(' '))) {
    const nameBased: string[] = ['time_series', 'data_overview']
    if (hasUser) nameBased.push('feature_usage')
    if (hasAmount) nameBased.push('revenue_trend')
    if (hasStatus) nameBased.push('conversion_funnel')
    nameBased.push('top_n_ranking')
    const valid = nameBased.filter(id => {
      if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
      return true
    })
    return valid.slice(0, 4)
  }
  // 用户分析类表
  if (/\b(user|customer|member|account|signup|register)\b/i.test(allStr.join(' '))) {
    const nameBased: string[] = ['time_series']
    if (hasAmount) { nameBased.push('ltv_analysis'); nameBased.push('arpu_arppu') }
    nameBased.push('churn_analysis')
    nameBased.push('data_overview')
    const valid = nameBased.filter(id => {
      if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
      return true
    })
    return valid.slice(0, 4)
  }
  // SaaS 指标类表
  if (/\b(mrr|arr|subscription|trial|plan|churn|cohort)\b/i.test(allStr.join(' '))) {
    const nameBased: string[] = ['mrr_arr', 'trial_conversion']
    if (hasAmount) nameBased.push('revenue_trend')
    nameBased.push('churn_mrr')
    nameBased.push('arpu_arppu')
    const valid = nameBased.filter(id => {
      if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
      return true
    })
    return valid.slice(0, 4)
  }
  // 营销类表
  if (/\b(campaign|channel|seo|ads|marketing|funnel)\b/i.test(allStr.join(' '))) {
    const nameBased: string[] = ['campaign_performance', 'channel_roi']
    if (hasAmount) nameBased.push('revenue_trend')
    nameBased.push('top_n_ranking')
    const valid = nameBased.filter(id => {
      if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
      return true
    })
    return valid.slice(0, 4)
  }
  // 产品分析类表
  if (/\b(ab_test|variant|experiment|nps|feedback|funnel_drop)\b/i.test(allStr.join(' '))) {
    const nameBased: string[] = ['ab_test', 'funnel_drop_analysis']
    if (hasUser) nameBased.push('user_segmentation')
    nameBased.push('nps_analysis')
    const valid = nameBased.filter(id => {
      if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
      return true
    })
    return valid.slice(0, 4)
  }
  // 工单/客服类表
  if (/\b(ticket|tickets|support|issue|complaint|case|service)\b/i.test(allStr.join(' '))) {
    const nameBased: string[] = ['data_overview', 'top_n_ranking']
    if (hasTime) nameBased.unshift('time_series')
    if (hasUser) nameBased.push('user_segmentation')
    const valid = nameBased.filter(id => {
      if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
      return true
    })
    return valid.slice(0, 4)
  }
  // 通知/消息类表
  if (/\b(notification|notifications|message|messages|email_log|sms_log|push_log|mail_log|alert)\b/i.test(allStr.join(' '))) {
    const nameBased: string[] = ['time_series', 'data_overview']
    nameBased.push('top_n_ranking')
    const valid = nameBased.filter(id => {
      if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
      return true
    })
    return valid.slice(0, 4)
  }
  // 评价/评分类表
  if (/\b(review|reviews|rating|ratings|comment|comments)\b/i.test(allStr.join(' '))) {
    const nameBased: string[] = ['data_overview', 'top_n_ranking']
    if (hasTime) nameBased.unshift('time_series')
    if (hasProduct) nameBased.push('product_performance')
    const valid = nameBased.filter(id => {
      if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
      return true
    })
    return valid.slice(0, 4)
  }
  // 会话/登录类表
  if (/\b(session|sessions|login_log|access_log|auth_log|online)\b/i.test(allStr.join(' '))) {
    const nameBased: string[] = ['session_analysis', 'time_series']
    nameBased.push('top_n_ranking')
    const valid = nameBased.filter(id => {
      if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
      return true
    })
    return valid.slice(0, 4)
  }
  // 库存流水类表
  if (/\b(inventory_log|stock_log|movement|warehouse|fulfillment|shipment|delivery)\b/i.test(allStr.join(' '))) {
    const nameBased: string[] = ['data_overview', 'top_n_ranking']
    if (hasTime) nameBased.unshift('time_series')
    if (hasCategory) nameBased.push('category_performance')
    const valid = nameBased.filter(id => {
      if (columns?.length) { const gen = generateTemplateSQL(id, '_csv_check', columns, dbType); return gen !== null }
      return true
    })
    return valid.slice(0, 4)
  }

  // ── 第二优先级：列字段组合（无表名时兜底）─────────────────
  // hasAmount/hasTime 等已在第一优先级分支前声明过，此处直接复用
  // fallbackByType 已在函数开头声明，此处直接使用

  const typeFallback = fallbackByType[tableType.type] || fallbackByType.generic

  // 全局补充推荐
  const extras: string[] = []
  if (hasAmount && hasCategory && !extras.includes('category_performance')) extras.push('category_performance')
  if (hasAmount && hasPayment && !extras.includes('payment_distribution')) extras.push('payment_distribution')
  if (hasAmount && hasStatus && !extras.includes('refund_analysis')) extras.push('refund_analysis')
  if (hasAmount && hasUser && !extras.includes('ltv_analysis')) extras.push('ltv_analysis')
  if (hasTime && hasAmount && !extras.includes('revenue_trend')) extras.push('revenue_trend')
  if (hasTime && !extras.includes('time_series')) extras.push('time_series')
  if (hasEvent && hasUser && !extras.includes('feature_usage')) extras.push('feature_usage')
  if (hasStatus && !extras.includes('top_n_ranking')) extras.push('top_n_ranking')

  const combined = [...typeFallback]
  for (const s of extras) { if (!combined.includes(s)) combined.push(s) }

  // CSV 模式：过滤无效模板
  if (dbType === 'file' && columns && columns.length > 0) {
    return combined.filter(id => generateTemplateSQL(id, '_csv_check', columns, dbType) !== null).slice(0, 4)
  }
  return combined.slice(0, 4)
}

/**
 * 执行分析：自动选择分析或按模板执行
 * templateId 可选，不传则自动推断
 */
// 调试接口：返回 fileTableRegistry 当前状态
ipcMain.handle('debug:file-registry', () => {
  const keys = [...fileTableRegistry['tables'].keys()]
  const tables = keys.map(k => {
    const parts = k.split('::')
    const t = fileTableRegistry.getTable(parts[0], parts[1] || '')
    return t ? { key: k, tableName: t.tableName, rowCount: t.rows.length, columns: t.columns.map(c => c.name) } : { key: k }
  })
  return { keys, tables }
})

ipcMain.handle('analysis:run', async (_, db: DatabaseConfig, tableName: string, templateId?: string) => {
  try {
    // 1. 获取表结构
    let columns: any[] = []
    const dbgDbType = db.type as string
    const fileContent = (db as any).fileContent as string | undefined
    const filePath = (db as any).filePath as string | undefined

    if (dbgDbType === 'file' && db.id) {
      let tables = fileTableRegistry.getTablesForDb(db.id)
      // 优先用 fileContent（最可靠，避免路径问题）
      if (tables.length === 0 && fileContent) {
        try {
          fileTableRegistry.loadFileContent(db.id, fileContent, db.database || tableName)
          tables = fileTableRegistry.getTablesForDb(db.id)
        } catch (e) {
          console.warn('[analysis:run] loadFileContent failed:', e)
        }
      }
      // 其次用 filePath
      if (tables.length === 0 && filePath) {
        try {
          fileTableRegistry.loadFile(db.id, filePath, db.database || tableName)
          tables = fileTableRegistry.getTablesForDb(db.id)
        } catch (e) {
          console.warn('[analysis:run] loadFile failed:', e)
        }
      }
      const table = tables.find(t => t.tableName === tableName)
      if (table) {
        columns = table.columns.map((c: any) => ({ name: c.name, inferredType: c.inferredType, sampleValues: [] }))
      }
    }

    // 真实数据库采样
    if (columns.length === 0 && dbgDbType !== 'file') {
      try {
        const sample = await databaseManager.query(db, `SELECT * FROM "${tableName}" LIMIT 20`)
        const rows = sample.rows || []
        const colNames = sample.columns || []
        columns = colNames.map((name: string) => ({
          name,
          sampleValues: rows.slice(0, 5).map((r: any) => String(r[name] ?? '')).filter(Boolean),
          inferredType: 'string' as const,
        }))
        console.log('[analysis:run] sampled columns:', colNames)
      } catch (err) {
        console.warn('[analysis:run] sampling failed:', err)
      }
    }

    // 2. 生成分析 SQL
    const dbType = (db.type as string) || ''
    const tid = templateId || autoSelectAnalysis(columns, dbType).templateId
    const analysis = generateTemplateSQL(tid, tableName, columns, dbType)
    if (!analysis) {
      return { success: false, error: `不支持的分析模板: ${tid}（检测到 ${columns.length} 个字段）` }
    }

    // 3. 执行 SQL
    let dbResult: any
    try {
      if (dbgDbType === 'file' && db.id) {
        console.log('[analysis:run] executing SQL:', analysis.sql)
        // CSV 模式：优先尝试 JS 聚合（时间类模板），否则走 SQL
        const tables = fileTableRegistry.getTablesForDb(db.id)
        const table = tables.find(t => t.tableName === tableName)
        const rawRows = table?.rows || []
        const { tryAggregateForTemplate } = require('./analysis/template-sql-generator')
        const aggregated = tryAggregateForTemplate(tid, columns, rawRows, 'file')
        if (aggregated) {
          console.log('[analysis:run] JS aggregation: ' + aggregated.rowCount + ' rows')
          dbResult = aggregated
        } else {
          dbResult = await databaseManager.query(db, analysis.sql)
        }
        console.log('[analysis:run] RESULT:', JSON.stringify({ columns: dbResult.columns, rows: dbResult.rows?.slice(0, 5), rowCount: dbResult.rowCount }))
      } else {
        dbResult = await databaseManager.query(db, analysis.sql)
      }
    } catch (err: any) {
      return { success: false, error: `SQL执行失败：${err?.message || '未知错误'}。SQL：${analysis.sql}` }
    }

    const data = dbResult
    return {
      success: true,
      data: {
        columns: data.columns || [],
        rows: data.rows || [],
        rowCount: data.rowCount ?? (data.rows?.length || 0),
        duration: data.executionTime || 0,
        sql: analysis.sql,
        title: analysis.title,
        description: analysis.description,
        charts: analysis.charts,
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '分析执行失败' }
  }
})

/**
 * 执行指定模板的分析（快捷分析点击时调用）
 */
ipcMain.handle('analysis:run-template', async (_, db: DatabaseConfig, tableName: string, templateId: string) => {
  try {
    // 获取表结构
    let columns: any[] = []
    const dbgDbType = (db.type as string) || ''
    if (dbgDbType === 'file' && db.id) {
      let tables = fileTableRegistry.getTablesForDb(db.id)
      if (tables.length === 0 && (db as any).filePath) {
        try { fileTableRegistry.loadFile(db.id, (db as any).filePath, db.database || tableName); tables = fileTableRegistry.getTablesForDb(db.id) } catch { /* ignore */ }
      }
      if (tables.length === 0 && (db as any).fileContent) {
        try { fileTableRegistry.loadFileContent(db.id, (db as any).fileContent, db.database || tableName); tables = fileTableRegistry.getTablesForDb(db.id) } catch { /* ignore */ }
      }
      const table = tables.find(t => t.tableName === tableName)
      if (table) columns = table.columns
    }
    if (columns.length === 0) {
      try {
        const sample = await databaseManager.query(db, `SELECT * FROM "${tableName}" LIMIT 20`)
        const rows = sample.rows || []
        const colNames = sample.columns || []
        columns = colNames.map((name: string) => ({
          name,
          sampleValues: rows.slice(0, 5).map((r: any) => String(r[name] ?? '')).filter(Boolean),
          inferredType: 'string' as const,
        }))
      } catch {
        // 采样失败
      }
    }

    const dbType = (db.type as string) || ''
    const analysis = generateTemplateSQL(templateId, tableName, columns, dbType)
    if (!analysis) {
      return { success: false, error: `不支持的分析模板: ${templateId}` }
    }

    let dbResult: any
    try {
      if (dbgDbType === 'file' && db.id) {
        const tables = fileTableRegistry.getTablesForDb(db.id)
        const table = tables.find(t => t.tableName === tableName)
        const rawRows = table?.rows || []
        const { tryAggregateForTemplate } = require('./analysis/template-sql-generator')
        const aggregated = tryAggregateForTemplate(templateId, columns, rawRows, dbType)
        if (aggregated) {
          dbResult = aggregated
        } else {
          dbResult = fileTableRegistry.query(db.id, analysis.sql)
          dbResult = { columns: dbResult.columns, rows: dbResult.rows, rowCount: dbResult.rowCount }
        }
      } else {
        dbResult = await databaseManager.query(db, analysis.sql)
      }
    } catch (err: any) {
      return { success: false, error: `SQL执行失败：${err?.message || '未知错误'}。SQL：${analysis.sql}` }
    }

    const data = dbResult
    return {
      success: true,
      data: {
        columns: data.columns || [],
        rows: data.rows || [],
        rowCount: data.rowCount ?? (data.rows?.length || 0),
        duration: data.executionTime || 0,
        sql: analysis.sql,
        title: analysis.title,
        description: analysis.description,
        charts: analysis.charts,
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '分析执行失败' }
  }
})
