/**
 * 国际化 (i18n) 系统
 * 支持中文和英文
 */

export type Language = 'zh' | 'en'

export interface Translations {
  common: {
    confirm: string
    cancel: string
    save: string
    delete: string
    edit: string
    close: string
    loading: string
    error: string
    success: string
    warning: string
    info: string
    search: string
    filter: string
    export: string
    import: string
    refresh: string
    clear: string
    submit: string
    retry: string
    back: string
    next: string
    previous: string
    finish: string
  }
  app: {
    title: string
    subtitle: string
    description: string
  }
  nav: {
    aiChat: string
    dataQuery: string
    insights: string
    funnel: string
    datasource: string
    dictionary: string
  }
  query: {
    title: string
    subtitle: string
    placeholder: string
    examples: {
      title: string
      items: string[]
    }
    generating: string
    query: string
    sqlGenerated: string
  }
  result: {
    title: string
    subtitle: string
    table: string
    chart: string
    export: string
    rows: string
    executionTime: string
    metric: string
    noData: string
    noDataTitle: string
    noDataDesc: string
    deepAnalysis: string
    analyzing: string
  }
  aiChat: {
    title: string
    subtitle: string
    online: string
    offline: string
    placeholder: string
    placeholderConfigured: string
    placeholderNotConfigured: string
    send: string
    configRequired: string
    configRequiredMessage: string
    configTip: string
    welcome: string
    quickQuestions: {
      title: string
      items: string[]
    }
  }
  datasource: {
    title: string
    addConnection: string
    testConnection: string
    save: string
    connectionName: string
    host: string
    port: string
    database: string
    username: string
    password: string
    connected: string
    disconnected: string
    testStatus: {
      idle: string
      testing: string
      success: string
      error: string
    }
    aiConfig: {
      title: string
      provider: string
      apiKey: string
      model: string
      test: string
      save: string
      tip: string
    }
  }
  confidence: {
    title: string
    high: string
    medium: string
    low: string
    breakdown: string
    overall: string
    details: string
    sqlValidity: string
    metricMatch: string
    dataCompleteness: string
    queryComplexity: string
    fallbackUsage: string
  }
  security: {
    title: string
    subtitle: string
    dataAccessMode: string
    localOnly: string
    localOnlyDesc: string
    proxy: string
    proxyDesc: string
    sendRawData: string
    sendRawDataDesc: string
    anonymization: string
    anonymizationDesc: string
    auditLog: string
    auditLogDesc: string
    queryLimits: string
    maxRows: string
    maxExecutionTime: string
    tips: string
    saveSuccess: string
  }
  auditLog: {
    title: string
    subtitle: string
    refresh: string
    exportJson: string
    exportCsv: string
    clear: string
    clearConfirm: string
    totalQueries: string
    successRate: string
    avgExecutionTime: string
    avgRowCount: string
    time: string
    status: string
    query: string
    executionTime: string
    rowCount: string
    confidence: string
    operations: string
    details: string
    filters: {
      all: string
      success: string
      failed: string
    }
  }
  analysis: {
    conclusion: string
    keyChanges: string
    current: string
    previous: string
    change: string
    trend: string
    drivers: string
    impact: string
    recommendations: string
    positive: string
    negative: string
    neutral: string
  }
  privacy: {
    title: string
    lastUpdated: string
    effectiveDate: string
  }
  errors: {
    unknown: string
    networkError: string
    databaseError: string
    aiError: string
    configError: string
  }
}

const translations: Record<Language, Translations> = {
  zh: {
    common: {
      confirm: '确定',
      cancel: '取消',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      close: '关闭',
      loading: '加载中...',
      error: '错误',
      success: '成功',
      warning: '警告',
      info: '信息',
      search: '搜索',
      filter: '筛选',
      export: '导出',
      import: '导入',
      refresh: '刷新',
      clear: '清空',
      submit: '提交',
      retry: '重试',
      back: '返回',
      next: '下一步',
      previous: '上一步',
      finish: '完成',
    },
    app: {
      title: 'DataInsight Pro',
      subtitle: 'AI 数据分析平台',
      description: '专为产品经理打造的智能数据分析工具',
    },
    nav: {
      aiChat: 'AI 对话',
      dataQuery: '数据查询',
      insights: '智能洞察',
      funnel: '漏斗分析',
      datasource: '数据源',
      dictionary: '数据字典',
    },
    query: {
      title: '请输入你想了解的数据',
      subtitle: '使用自然语言描述，AI 会自动帮你查询',
      placeholder: '例如：上个月新用户留存率是多少？',
      examples: {
        title: '试试：',
        items: [
          '上个月新用户留存率是多少？',
          '对比一下这周和上周的转化率',
          '哪个渠道带来的用户质量最高？',
        ],
      },
      generating: '生成中...',
      query: '查询',
      sqlGenerated: 'AI 生成的 SQL',
    },
    result: {
      title: '查询结果',
      subtitle: '数据可视化与分析',
      table: '表格',
      chart: '图表',
      export: '导出',
      rows: '行',
      executionTime: '执行时间',
      metric: '指标',
      noData: '暂无数据',
      noDataTitle: '开始你的数据探索之旅',
      noDataDesc: '在上方输入框中用自然语言描述你想了解的数据，AI 会自动帮你生成查询并展示结果',
      deepAnalysis: '深度分析',
      analyzing: '分析中...',
    },
    aiChat: {
      title: 'AI 数据顾问',
      subtitle: '在线 - 增长型产品经理模式',
      offline: '未配置 - 请先设置 AI 服务',
      placeholder: '问我任何数据相关的问题...',
      placeholderConfigured: '💡 我会基于数据给出可执行的产品增长建议，而非简单解释数据',
      placeholderNotConfigured: '⚠️ 点击右上角 ⚙️ 配置 AI 服务后即可使用',
      send: '发送',
      configRequired: 'AI 服务未配置',
      configRequiredMessage:
        '请先配置 AI 服务后才能使用对话功能。\n\n点击右上角 ⚙️ 设置按钮，选择「AI 服务配置」，输入你的 API Key。\n\n支持 OpenAI、Claude、MiniMax、GLM 等服务。',
      configTip: '点击右上角 ⚙️ 配置 AI 服务后即可使用',
      welcome:
        '你好！我是你的 AI 数据顾问。作为一名数据驱动的增长型产品经理，我可以帮你：\n\n📊 **数据分析** - 深度解读数据，给出可执行建议\n🔍 **异常发现** - 主动识别数据异常和机会点\n💡 **决策支持** - 基于数据提供产品增长策略\n\n你想了解什么数据？或者直接告诉我你的问题！',
      quickQuestions: {
        title: '试试这些问题：',
        items: [
          '最近一周的数据有什么异常？',
          '哪些用户群体需要重点关注？',
          '如何提升下周的增长？',
          '当前最大的问题是什么？',
        ],
      },
    },
    datasource: {
      title: '数据源管理',
      addConnection: '添加连接',
      testConnection: '测试连接',
      save: '保存',
      connectionName: '连接名称',
      host: '主机地址',
      port: '端口',
      database: '数据库',
      username: '用户名',
      password: '密码',
      connected: '已连接',
      disconnected: '未连接',
      testStatus: {
        idle: '测试连接',
        testing: '测试中...',
        success: '连接正常',
        error: '连接失败',
      },
      aiConfig: {
        title: 'AI 服务配置',
        provider: '服务提供商',
        apiKey: 'API Key',
        model: '模型',
        test: '测试连接',
        save: '保存',
        tip: '🔒 你的 API Key 仅保存在本地，不会上传到任何服务器',
      },
    },
    confidence: {
      title: '查询可信度',
      high: '高',
      medium: '中',
      low: '低',
      breakdown: '分项评分',
      overall: '总体评分',
      details: '详细说明',
      sqlValidity: 'SQL 合法性',
      metricMatch: '指标匹配度',
      dataCompleteness: '数据完整度',
      queryComplexity: '查询复杂度',
      fallbackUsage: 'AI 猜测程度',
    },
    security: {
      title: '数据安全策略',
      subtitle: '配置数据访问和隐私保护策略',
      dataAccessMode: '数据访问模式',
      localOnly: '仅本地访问',
      localOnlyDesc: '所有数据仅在本地处理，不会上传到任何远程服务器',
      proxy: '代理模式',
      proxyDesc: '通过企业代理服务器访问数据（需要配置代理）',
      sendRawData: '发送原始数据到 AI',
      sendRawDataDesc:
        '⚠️ 如果启用，原始查询数据将发送给 AI 服务进行分析。建议禁用此选项。',
      anonymization: '启用敏感字段自动脱敏',
      anonymizationDesc:
        '自动识别并脱敏敏感字段（email、phone、user_id 等），防止隐私数据泄露',
      auditLog: '启用查询审计日志',
      auditLogDesc: '记录所有查询操作的详细信息，包括 SQL、执行时间、使用的数据表等',
      queryLimits: '查询限制',
      maxRows: '最大返回行数',
      maxExecutionTime: '最大执行时间 (ms)',
      tips: '🔒 安全建议',
      saveSuccess: '✓ 保存成功',
    },
    auditLog: {
      title: '查询审计日志',
      subtitle: '查看所有查询操作的历史记录',
      refresh: '刷新',
      exportJson: '导出 JSON',
      exportCsv: '导出 CSV',
      clear: '清空日志',
      clearConfirm: '确定要清空所有审计日志吗？此操作不可撤销。',
      totalQueries: '总查询数',
      successRate: '成功率',
      avgExecutionTime: '平均执行时间',
      avgRowCount: '平均返回行数',
      time: '时间',
      status: '状态',
      query: '查询',
      executionTime: '执行时间',
      rowCount: '行数',
      confidence: '可信度',
      operations: '操作',
      details: '详情',
      filters: {
        all: '全部',
        success: '成功',
        failed: '失败',
      },
    },
    analysis: {
      conclusion: '核心结论',
      keyChanges: '关键变化',
      current: '当前值',
      previous: '上期值',
      change: '变化',
      trend: '趋势',
      drivers: '主要驱动因素',
      impact: '影响判断',
      recommendations: '行动建议',
      positive: '正面',
      negative: '负面',
      neutral: '中性',
    },
    privacy: {
      title: '隐私政策',
      lastUpdated: '最后更新日期',
      effectiveDate: '生效日期',
    },
    errors: {
      unknown: '未知错误',
      networkError: '网络连接失败，请检查您的网络设置',
      databaseError: '数据库连接失败，请检查配置',
      aiError: 'AI 服务调用失败，请检查 API Key 和网络',
      configError: '配置保存失败',
    },
  },
  en: {
    common: {
      confirm: 'Confirm',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Info',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      refresh: 'Refresh',
      clear: 'Clear',
      submit: 'Submit',
      retry: 'Retry',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      finish: 'Finish',
    },
    app: {
      title: 'DataInsight Pro',
      subtitle: 'AI Data Analysis Platform',
      description: 'Intelligent data analysis tool designed for product managers',
    },
    nav: {
      aiChat: 'AI Chat',
      dataQuery: 'Data Query',
      insights: 'Insights',
      funnel: 'Funnel',
      datasource: 'Data Source',
      dictionary: 'Dictionary',
    },
    query: {
      title: 'What data would you like to explore?',
      subtitle: 'Describe in natural language, AI will automatically query for you',
      placeholder: 'e.g., What was the new user retention rate last month?',
      examples: {
        title: 'Try:',
        items: [
          'What was the new user retention rate last month?',
          'Compare conversion rates for this week vs last week',
          'Which channel brings the highest quality users?',
        ],
      },
      generating: 'Generating...',
      query: 'Query',
      sqlGenerated: 'AI Generated SQL',
    },
    result: {
      title: 'Query Results',
      subtitle: 'Data Visualization & Analysis',
      table: 'Table',
      chart: 'Chart',
      export: 'Export',
      rows: 'rows',
      executionTime: 'Execution Time',
      metric: 'Metric',
      noData: 'No data available',
      noDataTitle: 'Start Your Data Exploration Journey',
      noDataDesc:
        'Describe what data you want to explore in natural language above, and AI will automatically generate queries and display results',
      deepAnalysis: 'Deep Analysis',
      analyzing: 'Analyzing...',
    },
    aiChat: {
      title: 'AI Data Advisor',
      subtitle: 'Online - Growth Product Manager Mode',
      offline: 'Not Configured - Please set up AI service first',
      placeholder: 'Ask me any data-related questions...',
      placeholderConfigured:
        '💡 I provide actionable product growth insights based on data, not just explain data',
      placeholderNotConfigured:
        '⚠️ Click the ⚙️ settings button in the top right to configure AI service',
      send: 'Send',
      configRequired: 'AI Service Not Configured',
      configRequiredMessage:
        'Please configure AI service first.\n\nClick the ⚙️ settings button in the top right, select "AI Service Config", and enter your API Key.\n\nSupports OpenAI, Claude, MiniMax, GLM and more.',
      configTip: 'Click the ⚙️ settings button in the top right to configure AI service',
      welcome:
        'Hello! I am your AI Data Advisor. As a data-driven growth product manager, I can help you with:\n\n📊 **Data Analysis** - In-depth data interpretation with actionable recommendations\n🔍 **Anomaly Detection** - Proactively identify data anomalies and opportunities\n💡 **Decision Support** - Product growth strategies based on data\n\nWhat would you like to know? Or just tell me your question!',
      quickQuestions: {
        title: 'Try these questions:',
        items: [
          'Any anomalies in the data this week?',
          'Which user segments need attention?',
          'How to improve growth next week?',
          'What is the biggest issue right now?',
        ],
      },
    },
    datasource: {
      title: 'Data Source Management',
      addConnection: 'Add Connection',
      testConnection: 'Test Connection',
      save: 'Save',
      connectionName: 'Connection Name',
      host: 'Host',
      port: 'Port',
      database: 'Database',
      username: 'Username',
      password: 'Password',
      connected: 'Connected',
      disconnected: 'Disconnected',
      testStatus: {
        idle: 'Test Connection',
        testing: 'Testing...',
        success: 'Connected',
        error: 'Failed',
      },
      aiConfig: {
        title: 'AI Service Configuration',
        provider: 'Provider',
        apiKey: 'API Key',
        model: 'Model',
        test: 'Test',
        save: 'Save',
        tip: '🔒 Your API Key is stored locally only and never uploaded to any server',
      },
    },
    confidence: {
      title: 'Query Confidence',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      breakdown: 'Score Breakdown',
      overall: 'Overall Score',
      details: 'Details',
      sqlValidity: 'SQL Validity',
      metricMatch: 'Metric Match',
      dataCompleteness: 'Data Completeness',
      queryComplexity: 'Query Complexity',
      fallbackUsage: 'AI Guessing',
    },
    security: {
      title: 'Data Security Policy',
      subtitle: 'Configure data access and privacy protection policies',
      dataAccessMode: 'Data Access Mode',
      localOnly: 'Local Only',
      localOnlyDesc:
        'All data is processed locally only, never uploaded to any remote server',
      proxy: 'Proxy Mode',
      proxyDesc: 'Access data through enterprise proxy server (requires proxy configuration)',
      sendRawData: 'Send Raw Data to AI',
      sendRawDataDesc:
        '⚠️ If enabled, raw query data will be sent to AI service for analysis. Recommended to disable.',
      anonymization: 'Enable Auto Anonymization',
      anonymizationDesc:
        'Automatically identify and mask sensitive fields (email, phone, user_id, etc.) to prevent privacy data leaks',
      auditLog: 'Enable Query Audit Log',
      auditLogDesc:
        'Record detailed information for all queries, including SQL, execution time, tables used, etc.',
      queryLimits: 'Query Limits',
      maxRows: 'Max Rows',
      maxExecutionTime: 'Max Execution Time (ms)',
      tips: '🔒 Security Recommendations',
      saveSuccess: '✓ Saved Successfully',
    },
    auditLog: {
      title: 'Query Audit Log',
      subtitle: 'View history of all query operations',
      refresh: 'Refresh',
      exportJson: 'Export JSON',
      exportCsv: 'Export CSV',
      clear: 'Clear Logs',
      clearConfirm: 'Are you sure you want to clear all audit logs? This action cannot be undone.',
      totalQueries: 'Total Queries',
      successRate: 'Success Rate',
      avgExecutionTime: 'Avg Execution Time',
      avgRowCount: 'Avg Row Count',
      time: 'Time',
      status: 'Status',
      query: 'Query',
      executionTime: 'Execution Time',
      rowCount: 'Rows',
      confidence: 'Confidence',
      operations: 'Actions',
      details: 'Details',
      filters: {
        all: 'All',
        success: 'Success',
        failed: 'Failed',
      },
    },
    analysis: {
      conclusion: 'Key Conclusion',
      keyChanges: 'Key Changes',
      current: 'Current',
      previous: 'Previous',
      change: 'Change',
      trend: 'Trend',
      drivers: 'Main Drivers',
      impact: 'Impact',
      recommendations: 'Recommendations',
      positive: 'Positive',
      negative: 'Negative',
      neutral: 'Neutral',
    },
    privacy: {
      title: 'Privacy Policy',
      lastUpdated: 'Last Updated',
      effectiveDate: 'Effective Date',
    },
    errors: {
      unknown: 'Unknown error',
      networkError: 'Network connection failed. Please check your network settings',
      databaseError: 'Database connection failed. Please check configuration',
      aiError: 'AI service call failed. Please check API Key and network',
      configError: 'Failed to save configuration',
    },
  },
}

class I18n {
  private currentLanguage: Language = 'zh'

  setLanguage(language: Language) {
    this.currentLanguage = language
    localStorage.setItem('language', language)
  }

  getLanguage(): Language {
    const saved = localStorage.getItem('language')
    if (saved && (saved === 'zh' || saved === 'en')) {
      this.currentLanguage = saved as Language
    }
    return this.currentLanguage
  }

  t(key: string): string {
    const keys = key.split('.')
    let value: any = translations[this.currentLanguage]

    for (const k of keys) {
      value = value?.[k]
    }

    if (typeof value === 'string') {
      return value
    }

    // Fallback to Chinese if translation not found
    value = translations.zh
    for (const k of keys) {
      value = value?.[k]
    }

    return value || key
  }
}

export const i18n = new I18n()

// Helper function for translations
export const t = (key: string) => i18n.t(key)

export default i18n
