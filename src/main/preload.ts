import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  // 测试连接
  ping: () => ipcRenderer.invoke('ping'),

  // ========== AI API ==========
  ai: {
    // 初始化 AI 服务
    init: (config: any) => ipcRenderer.invoke('ai:init', config),

    // 发送聊天消息
    chat: (message: string, context?: any) => ipcRenderer.invoke('ai:chat', message, context),

    // 清空对话历史
    clearHistory: () => ipcRenderer.invoke('ai:clear-history'),

    // 获取对话历史
    getHistory: () => ipcRenderer.invoke('ai:get-history'),
    // 检查 AI 是否已初始化（有 apiKey 且已 init）
    isReady: () => ipcRenderer.invoke('ai:isReady'),
  },

  // ========== 数据库 API ==========
  database: {
    connect: (config: any) => ipcRenderer.invoke('db:connect', config),
    disconnect: (config: any) => ipcRenderer.invoke('db:disconnect', config),
    test: (config: any) => ipcRenderer.invoke('db:test', config),
    query: (config: any, sql: string) => ipcRenderer.invoke('db:query', config, sql),
    tables: (config: any) => ipcRenderer.invoke('db:tables', config),

    // 增强功能
    testEnhanced: (config: any) => ipcRenderer.invoke('db:test-enhanced', config),
    securityTips: (config: any) => ipcRenderer.invoke('db:security-tips', config),
  },

  // ========== Schema 管理 API ==========
  schema: {
    cache: (config: any) => ipcRenderer.invoke('schema:cache', config),
    getTable: (config: any, tableName: string) => ipcRenderer.invoke('schema:get-table', config, tableName),
    updateColumn: (config: any, tableName: string, columnName: string, description: string) =>
      ipcRenderer.invoke('schema:update-column', config, tableName, columnName, description),
    search: (config: any, keyword: string) => ipcRenderer.invoke('schema:search', config, keyword),
    describe: (config: any) => ipcRenderer.invoke('schema:describe', config),
  },

  // ========== 指标 API ==========
  metrics: {
    getAll: () => ipcRenderer.invoke('metrics:getAll'),
    getByCategory: (category: string) => ipcRenderer.invoke('metrics:getByCategory', category),
    add: (metric: any) => ipcRenderer.invoke('metrics:add', metric),
    update: (metricId: string, updates: any) => ipcRenderer.invoke('metrics:update', metricId, updates),
    delete: (metricId: string) => ipcRenderer.invoke('metrics:delete', metricId),
    generateSQL: (query: any, tableName?: string) => ipcRenderer.invoke('metrics:generateSQL', query, tableName),
  },

  // ========== SQL 安全 API ==========
  sql: {
    validate: (sql: string) => ipcRenderer.invoke('sql:validate', sql),
    auditLog: (limit?: number) => ipcRenderer.invoke('sql:auditLog', limit),
    summary: (sql: string) => ipcRenderer.invoke('sql:summary', sql),
  },

  // ========== 结果元数据 API ==========
  result: {
    generateMetadata: (params: any) => ipcRenderer.invoke('result:generate-metadata', params),
    formatMetadata: (metadata: any) => ipcRenderer.invoke('result:format-metadata', metadata),
  },

  // ========== 图表推荐 API ==========
  charts: {
    recommend: (result: any) => ipcRenderer.invoke('charts:recommend', result),
    recommendMultiple: (results: any[]) => ipcRenderer.invoke('charts:recommend-multiple', results),
  },

  // ========== 数据字典 API ==========
  dictionary: {
    metrics: {
      getAll: () => ipcRenderer.invoke('dict:getAllMetrics'),
      search: (keyword: string) => ipcRenderer.invoke('dict:searchMetrics', keyword),
      add: (metric: any) => ipcRenderer.invoke('dict:addMetric', metric),
      update: (id: string, updates: any) => ipcRenderer.invoke('dict:updateMetric', id, updates),
      delete: (id: string) => ipcRenderer.invoke('dict:deleteMetric', id),
    },
    fields: {
      getAll: () => ipcRenderer.invoke('dict:getAllFields'),
      getByTable: (table: string) => ipcRenderer.invoke('dict:getFields', table),
      update: (table: string, column: string, updates: any) =>
        ipcRenderer.invoke('dict:updateField', table, column, updates),
      search: (keyword: string) => ipcRenderer.invoke('dict:searchFields', keyword),
    },
    dimensions: {
      getAll: () => ipcRenderer.invoke('dict:getAllDimensions'),
      add: (dimension: any) => ipcRenderer.invoke('dict:addDimension', dimension),
    },
    generateAIDesc: () => ipcRenderer.invoke('dict:generateAIDesc'),
    export: () => ipcRenderer.invoke('dict:export'),
    import: (data: any) => ipcRenderer.invoke('dict:import', data),
  },

  // ========== 指标层 V2 API ==========
  metricsV2: {
    getAll: () => ipcRenderer.invoke('metricsV2:getAll'),
    get: (id: string) => ipcRenderer.invoke('metricsV2:get', id),
    search: (keyword: string) => ipcRenderer.invoke('metricsV2:search', keyword),
    add: (metric: any) => ipcRenderer.invoke('metricsV2:add', metric),
    update: (id: string, updates: any) => ipcRenderer.invoke('metricsV2:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('metricsV2:delete', id),
    validateUsage: (metricId: string, dimensions?: string[]) =>
      ipcRenderer.invoke('metricsV2:validateUsage', metricId, dimensions),
    generateConstrainedSQL: (metricId: string, dimensions?: string[], timeRange?: string) =>
      ipcRenderer.invoke('metricsV2:generateConstrainedSQL', metricId, dimensions, timeRange),
    composite: {
      getAll: () => ipcRenderer.invoke('metricsV2:getAllComposite'),
      add: (metric: any) => ipcRenderer.invoke('metricsV2:addComposite', metric),
      generateSQL: (compositeMetricId: string) =>
        ipcRenderer.invoke('metricsV2:generateCompositeSQL', compositeMetricId),
    },
  },

  // ========== 可信度系统 API ==========
  confidence: {
    calculate: (input: any) => ipcRenderer.invoke('confidence:calculate', input),
    extractSQLStats: (sql: string) => ipcRenderer.invoke('confidence:extractSQLStats', sql),
    quickAssess: (sql: string, hasMetric: boolean) =>
      ipcRenderer.invoke('confidence:quickAssess', sql, hasMetric),
  },

  // ========== AI 分析引擎 V2 API ==========
  analysis: {
    analyze: (request: any) => ipcRenderer.invoke('analysis:analyze', request),
    generateSummary: (result: any) => ipcRenderer.invoke('analysis:generateSummary', result),
    // 识别表类型（采样推断）
    recognizeTable: (db: any, tableName: string) =>
      ipcRenderer.invoke('analysis:recognize-table', db, tableName),
    // 执行分析（自动选择或指定模板）
    run: (db: any, tableName: string, templateId?: string) =>
      ipcRenderer.invoke('analysis:run', db, tableName, templateId),
    // 执行指定模板的分析
    runTemplate: (db: any, tableName: string, templateId: string) =>
      ipcRenderer.invoke('analysis:run-template', db, tableName, templateId),
    // 获取表数据预览（前 N 行）
    getTableData: (db: any, tableName: string, limit?: number) =>
      ipcRenderer.invoke('analysis:getTableData', db, tableName, limit),
  },

  // ========== 新分析引擎 (Analyze Mode) API ==========
  analyze: {
    run: (request: any) => ipcRenderer.invoke('analyze:run', request),
  },

  // ========== 对话式分析 API ==========
  chat: {
    withContext: (sessionId: string, question: string) =>
      ipcRenderer.invoke('chat:withContext', sessionId, question),

    // 对话历史管理
    createSession: (initialMessage?: string, metadata?: any) =>
      ipcRenderer.invoke('chat:createSession', initialMessage, metadata),
    getSession: (sessionId: string) =>
      ipcRenderer.invoke('chat:getSession', sessionId),
    getAllSessions: () =>
      ipcRenderer.invoke('chat:getAllSessions'),
    getCurrentSession: () =>
      ipcRenderer.invoke('chat:getCurrentSession'),
    setCurrentSession: (sessionId: string) =>
      ipcRenderer.invoke('chat:setCurrentSession', sessionId),
    deleteSession: (sessionId: string) =>
      ipcRenderer.invoke('chat:deleteSession', sessionId),
    clearAllSessions: () =>
      ipcRenderer.invoke('chat:clearAllSessions'),
  },

  // ========== 记忆系统 API (四层架构) ==========
  memory: {
    // 智能召回 - 根据问题检索相关历史
    recall: (query: string, options?: any) =>
      ipcRenderer.invoke('memory:recall', query, options),

    // 获取会话上下文窗口（用于AI对话）
    getContextWindow: (query: string, sessionId?: string, maxTokens?: number) =>
      ipcRenderer.invoke('memory:getContextWindow', query, sessionId, maxTokens),

    // 获取会话详情（包含语义摘要）
    getSession: (sessionId: string) =>
      ipcRenderer.invoke('memory:getSession', sessionId),

    // 获取所有会话（包含语义摘要）
    getAllSessions: () =>
      ipcRenderer.invoke('memory:getAllSessions'),

    // 添加消息（自动语义化）
    addMessage: (sessionId: string, role: 'user' | 'assistant', content: string) =>
      ipcRenderer.invoke('memory:addMessage', sessionId, role, content),

    // 删除会话（删除所有层的记忆）
    deleteSession: (sessionId: string) =>
      ipcRenderer.invoke('memory:deleteSession', sessionId),

    // 获取记忆统计信息
    getStats: () =>
      ipcRenderer.invoke('memory:getStats'),
  },

  // ========== 数据安全策略 API ==========
  security: {
    getConfig: () => ipcRenderer.invoke('security:getConfig'),
    updateConfig: (updates: any) => ipcRenderer.invoke('security:updateConfig', updates),
    checkTableAccess: (tableName: string) => ipcRenderer.invoke('security:checkTableAccess', tableName),
    checkSQLSecurity: (sql: string) => ipcRenderer.invoke('security:checkSQLSecurity', sql),
    getTips: () => ipcRenderer.invoke('security:getTips'),
    getDescription: () => ipcRenderer.invoke('security:getDescription'),
  },

  // ========== 数据脱敏 API ==========
  anonymize: {
    anonymizeData: (tableName: string, rows: any[], enabled: boolean) =>
      ipcRenderer.invoke('anonymize:anonymizeData', tableName, rows, enabled),
    prepareForAI: (data: any[], config?: any) =>
      ipcRenderer.invoke('anonymize:prepareForAI', data, config),
    isSensitiveField: (fieldName: string) =>
      ipcRenderer.invoke('anonymize:isSensitiveField', fieldName),
    generateReport: (result: any) => ipcRenderer.invoke('anonymize:generateReport', result),
    getAllRules: () => ipcRenderer.invoke('anonymize:getAllRules'),
  },

  // ========== 审计日志 API ==========
  audit: {
    log: (entry: any) => ipcRenderer.invoke('audit:log', entry),
    getLogs: (limit: number, offset: number) => ipcRenderer.invoke('audit:getLogs', limit, offset),
    getStats: (timeRange?: any) => ipcRenderer.invoke('audit:getStats', timeRange),
    export: (format: 'json' | 'csv') => ipcRenderer.invoke('audit:export', format),
    getSummary: (limit: number) => ipcRenderer.invoke('audit:getSummary', limit),
    clear: () => ipcRenderer.invoke('audit:clear'),
  },

  // ========== 智能分析 API ==========
  insights: {
    detectAnomalies: (metrics: any[]) => ipcRenderer.invoke('insights:detect-anomalies', metrics),
    generateReport: (metrics: any[]) => ipcRenderer.invoke('insights:generate-report', metrics),
    breakdownSQL: (metricName: string, tableName: string, dateField: string) =>
      ipcRenderer.invoke('insights:breakdown-sql', metricName, tableName, dateField),
  },

  // ========== 数据存储 API ==========
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
  },

  // ========== 文件系统 API ==========
  dialog: {
    // 弹出系统原生文件选择框，返回文件路径字符串，用户取消则返回 null
    openFile: (options?: any) => ipcRenderer.invoke('dialog:openFile', options),
  },
  file: {
    // 读取文件内容（由主进程通过 Node.js fs 读取）
    read: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
    // 注册文件到 FileTableRegistry（读取内容并加载到内存）
    register: (dbId: string, filePath: string, fileName: string, content?: string) =>
      ipcRenderer.invoke('file:register', dbId, filePath, fileName, content),
    // 获取文件表的列信息
    getTable: (dbId: string, tableName: string) =>
      ipcRenderer.invoke('file:get-table', dbId, tableName),
    // 调试：获取 fileTableRegistry 状态
    debugRegistry: () => ipcRenderer.invoke('debug:file-registry'),
  },

  // ========== 自然语言查询 API ==========
  nl: {
    generateSQL: (databaseType: any, query: string, context?: any) => ipcRenderer.invoke('nl:generate-sql', databaseType, query, context),
    explainSQL: (sql: string) => ipcRenderer.invoke('nl:explain-sql', sql),
    getSuggestions: (query: string) => ipcRenderer.invoke('nl:getSuggestions', query),
    getRelevantMetrics: (query: string) => ipcRenderer.invoke('nl:getRelevantMetrics', query),
    recordCorrection: (naturalLanguage: string, generatedSQL: string, correctedSQL: string, userFeedback?: string) =>
      ipcRenderer.invoke('nl:recordCorrection', naturalLanguage, generatedSQL, correctedSQL, userFeedback),
  },

  // ========== 漏斗分析 API ==========
  funnel: {
    discover: (config: any) => ipcRenderer.invoke('funnel:discover', config),
    save: (funnel: any) => ipcRenderer.invoke('funnel:save', funnel),
    list: () => ipcRenderer.invoke('funnel:list'),
    delete: (id: string) => ipcRenderer.invoke('funnel:delete', id),
    get: (id: string) => ipcRenderer.invoke('funnel:get', id),
  },

  // ========== 查询模板 API ==========
  templates: {
    getAll: () => ipcRenderer.invoke('templates:getAll'),
    create: (template: any) => ipcRenderer.invoke('templates:create', template),
    update: (id: string, updates: any) => ipcRenderer.invoke('templates:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('templates:delete', id),
    use: (id: string) => ipcRenderer.invoke('templates:use', id),
    search: (keyword: string) => ipcRenderer.invoke('templates:search', keyword),
    getPopular: (limit?: number) => ipcRenderer.invoke('templates:getPopular', limit),
  },

  // ========== 表格 Schema 智能分析 API ==========
  tableAnalysis: {
    // 分析单个 CSV 文件，返回表格类型 + 匹配的分析模板
    analyzeSchema: (filePath: string, fileName: string) =>
      ipcRenderer.invoke('table:analyze-schema', filePath, fileName),
    // 获取完整分析模板库（含分类标签）
    getTemplateLibrary: () => ipcRenderer.invoke('table:get-template-library'),
    // 批量分析多张表
    batchAnalyze: (tables: Array<{ filePath: string; fileName: string }>) =>
      ipcRenderer.invoke('table:batch-analyze', tables),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
