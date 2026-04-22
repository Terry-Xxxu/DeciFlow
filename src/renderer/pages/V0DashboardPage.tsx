// 模块级变量：保存分析结果，切换页面不丢失
let _persistedQueryResult: any = null
let _persistedQueryError: any = null
let _persistedChartRecommendation: any = null
let _persistedTableInfo: any = null
let _persistedAiInsights: any[] = []
let _persistedTableName: string = ''

import { useState, useEffect, useRef } from "react"
import { PageLayout } from "../components/v0-layout/PageLayout"
import { QueryInput } from "../components/v0-dashboard/QueryInput"
import { StatsCards } from "../components/v0-dashboard/StatsCards"
import { AIInsights } from "../components/v0-dashboard/AIInsights"
import { DataPreview } from "../components/v0-dashboard/DataPreview"
import { ChartPreview } from "../components/v0-dashboard/ChartPreview"
import { QuickActions } from "../components/v0-dashboard/QuickActions"
import { RecentQueries } from "../components/v0-dashboard/RecentQueries"
import { EmptyStates } from "../components/v0-dashboard/EmptyStates"
import { TableSchemaOverview } from "../components/v0-dashboard/TableSchemaOverview"
import { useDatabase } from "../stores/DatabaseStore"
import { useProjects } from "../stores/ProjectStore"
import { useAnalysisTemplates } from "../stores/AnalysisTemplateStore"
import { addQueryToHistory } from "../stores/QueryHistoryStore"
import { showToast } from "../lib/download"
import { cn } from "../lib/utils"
import { AlertTriangle, ChevronDown, Check, Database, Zap, FolderOpen, Table } from "lucide-react"

interface QueryResult {
  columns: string[]
  rows: Record<string, any>[]
  rowCount: number
  duration: number
  sql: string
}

interface ChartRecommendation {
  type: string
  confidence: number
  reason: string
}

interface V0DashboardPageProps {
  onNavigate?: (page: string) => void
}

export function V0DashboardPage({ onNavigate }: V0DashboardPageProps) {
  const { databases } = useDatabase()
  const { projects } = useProjects()
  const { setRecommendedIds } = useAnalysisTemplates()
  const connectedDatabases = databases.filter((db) => db.connected)
  const hasDataSource = connectedDatabases.length > 0

  const [isLoading, setIsLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState<string>('')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(_persistedQueryResult)
  const [queryError, setQueryError] = useState<string | null>(_persistedQueryError)
  const [pendingQuery, setPendingQuery] = useState<string | undefined>(undefined)
  const [chartRecommendation, setChartRecommendation] = useState<ChartRecommendation | null>(_persistedChartRecommendation)
  const [tableInfo, setTableInfo] = useState<any>(_persistedTableInfo)
  const [aiInsights, setAiInsights] = useState<any[]>(_persistedAiInsights)
  const [isInsightLoading, setIsInsightLoading] = useState(false)
  // 多选数据源 ID：空数组 = 全部
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // 每个数据库下选中的表格：{ [dbId]: [tableName, ...] }
  const [selectedTables, setSelectedTables] = useState<Record<string, string[]>>({})
  // 每个数据库下的表格列表缓存
  const [dbTableLists, setDbTableLists] = useState<Record<string, string[]>>({})
  const [loadingTables, setLoadingTables] = useState<Set<string>>(new Set())
  // 当前展开的数据库（点击后展开显示表格）
  const [expandedDbId, setExpandedDbId] = useState<string | null>(null)

  // 当前选中的表名（从 selectedIds/selectedTables 派生，用于 JSX）
  const currentTableName = (() => {
    const dbId = selectedIds[0] || connectedDatabases[0]?.id
    if (!dbId) return undefined
    const db = connectedDatabases.find(d => d.id === dbId)
    if (!db) return undefined
    const selTables = selectedTables[dbId] || []
    if ((db as any).type === 'file') {
      const name = (db as any).database
      return typeof name === 'string' ? name.replace(/\.[^/.]+$/, '') : (selTables[0] || 'data')
    }
    return selTables[0] || db.database || db.name
  })()
  // 当前选中的数据库（同上派生）
  const currentDb = (() => {
    const dbId = selectedIds[0] || connectedDatabases[0]?.id
    return dbId ? (connectedDatabases.find(d => d.id === dbId) || connectedDatabases[0]) : connectedDatabases[0]
  })()
  // AI 是否已配置
  const [hasAI, setHasAI] = useState(false)
  // 分析目标选择器下拉状态
  const [selectorOpen, setSelectorOpen] = useState(false)
  const selectorRef = useRef<HTMLDivElement>(null)

  // ── 持久化辅助：同时更新 React state 和模块级变量 ────────────────────────
  const persistResult = (result: any) => {
    setQueryResult(result)
    _persistedQueryResult = result
    _persistedQueryError = null
  }
  const persistError = (error: string | null) => {
    setQueryError(error)
    _persistedQueryError = error
    _persistedQueryResult = null
  }
  const persistChart = (rec: any) => {
    setChartRecommendation(rec)
    _persistedChartRecommendation = rec
  }
  const persistTableInfo = (info: any) => {
    setTableInfo(info)
    _persistedTableInfo = info
  }
  const persistInsights = (insights: any[]) => {
    setAiInsights(insights)
    _persistedAiInsights = insights
  }
  const clearResults = () => {
    setQueryResult(null); _persistedQueryResult = null
    setQueryError(null); _persistedQueryError = null
    setChartRecommendation(null); _persistedChartRecommendation = null
    setAiInsights([]); _persistedAiInsights = []
  }

  useEffect(() => {
    window.electronAPI.ai.isReady().then(setHasAI).catch(() => setHasAI(false))
  }, [])

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setSelectorOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const query = (e as CustomEvent).detail as string
      handleQuery(query)
    }
    window.addEventListener("rerun-query", handler)
    return () => window.removeEventListener("rerun-query", handler)
  }, [connectedDatabases, selectedIds, hasAI])

  const toggleSource = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    // 取消选择数据库时同时清除其表格选择
    if (selectedIds.includes(id)) {
      setSelectedTables(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  // 展开数据库时获取表格列表
  const handleExpandDb = async (dbId: string) => {
    if (expandedDbId === dbId) {
      setExpandedDbId(null)
      return
    }
    setExpandedDbId(dbId)
    if (dbTableLists[dbId]) return // 已缓存
    setLoadingTables(prev => new Set(prev).add(dbId))
    try {
      const db = connectedDatabases.find(d => d.id === dbId)
      if (!db) return
      // Demo 数据库直接使用已知表名
      if (db.type === 'demo') {
        setDbTableLists(prev => ({ ...prev, [dbId]: ['users', 'orders', 'products', 'events'] }))
        return
      }
      const tables: string[] = await (window as any).electronAPI.database.tables(db)
      setDbTableLists(prev => ({ ...prev, [dbId]: tables || [] }))
    } catch {
      setDbTableLists(prev => ({ ...prev, [dbId]: [] }))
    } finally {
      setLoadingTables(prev => {
        const next = new Set(prev)
        next.delete(dbId)
        return next
      })
    }
  }

  // 切换表格选中状态
  const toggleTable = (dbId: string, tableName: string) => {
    // 选中表格时，自动选中该数据库
    if (!selectedIds.includes(dbId)) {
      setSelectedIds(prev => [...prev, dbId])
    }
    setSelectedTables(prev => {
      const current = prev[dbId] || []
      const next = current.includes(tableName)
        ? current.filter(t => t !== tableName)
        : [...current, tableName]
      return { ...prev, [dbId]: next }
    })
  }

  // 清除某数据库下所有表格
  const clearDbTables = (dbId: string) => {
    setSelectedTables(prev => {
      const next = { ...prev }
      delete next[dbId]
      return next
    })
  }

  // ── 一键分析：自动识别表类型，执行对应的统计 SQL ──────────────────────────
  const handleOneClickAnalysis = async () => {
    if (connectedDatabases.length === 0) {
      showToast("请先连接数据库", "error")
      return
    }
    const primaryDb = selectedIds.length > 0
      ? (connectedDatabases.find(d => d.id === selectedIds[0]) || connectedDatabases[0])
      : connectedDatabases[0]
    const db = primaryDb

    // 确定表名
    const dbId = selectedIds[0] || connectedDatabases[0]?.id
    const selectedTableNames = dbId ? (selectedTables[dbId] || []) : []
    const tableName = (() => {
      if ((db as any).type === 'file') {
        const name = (db as any).database
        return typeof name === 'string' ? name.replace(/\.[^/.]+$/, '') : (selectedTableNames[0] || 'data')
      }
      return selectedTableNames[0] || db.database || db.name
    })()

    setIsLoading(true)
    setLoadingStage('正在识别表类型…')
    clearResults()

    try {
      // Step 1: 识别表类型
      const recResult = await (window as any).electronAPI.analysis.recognizeTable(db, tableName)
      setLoadingStage('正在分析数据…')
      const tableInfo = recResult.success ? recResult.data : null
      persistTableInfo(tableInfo)
      const tableType = tableInfo?.tableType || '未知类型'
      // 根据识别的表类型更新推荐模板
      if (tableInfo?.suggestedTemplateIds?.length > 0) {
        setRecommendedIds(tableInfo.suggestedTemplateIds)
      }
      showToast(`识别为：${tableType}，已推荐相关快捷分析`, "info")

      // Step 2: 执行自动分析
      const result = await (window as any).electronAPI.analysis.run(db, tableName)
      if (!result.success) {
        throw new Error(result.error || '分析执行失败')
      }

      const data = result.data
      persistResult({
        columns: data.columns || [],
        rows: data.rows || [],
        rowCount: data.rowCount || 0,
        duration: data.duration || 0,
        sql: data.sql || '',
      })

      // 图表推荐
      if (data.charts?.length > 0) {
        persistChart(data.charts[0])
      }

      setLoadingStage('')
    } catch (err: any) {
      persistError(err?.message || "一键分析失败")
      showToast(err?.message || "分析失败", "error")
    } finally {
      setIsLoading(false)
    }
  }

  // ── 执行自定义 SQL ──────────────────────────────────────────────────────────
  const handleSqlSubmit = async (sql: string) => {
    if (!sql.trim()) return
    if (connectedDatabases.length === 0) {
      showToast("请先连接数据库", "error")
      return
    }
    const primaryDb = selectedIds.length > 0
      ? (connectedDatabases.find(d => d.id === selectedIds[0]) || connectedDatabases[0])
      : connectedDatabases[0]
    const db = primaryDb

    setIsLoading(true)
    setLoadingStage('正在执行 SQL…')
    clearResults()

    try {
      const dbResult = await (window as any).electronAPI.database.query(db, sql)
      if (!dbResult.success) {
        throw new Error(dbResult.error || "查询执行失败")
      }
      const data = dbResult.data || dbResult
      persistResult({
        columns: data.columns || [],
        rows: data.rows || [],
        rowCount: data.rowCount ?? (data.rows?.length || 0),
        duration: dbResult.executionTime || 0,
        sql,
      })
      setLoadingStage('')
    } catch (err: any) {
      persistError(err?.message || "SQL 执行失败")
      showToast(err?.message || "SQL 执行失败", "error")
    } finally {
      setIsLoading(false)
    }
  }

  // ── 执行模板分析（快捷分析点击）────────────────────────────────────────────
  // ① 填入自然语言到输入框（用户可见，可调整）② 同时后台直接执行模板 SQL（无需 AI）
  const handleTemplateRun = async (templateId: string, templateName: string) => {
    if (connectedDatabases.length === 0) {
      showToast("请先选择数据源", "error")
      return
    }

    // ① 填入自然语言，让用户看到分析意图
    const templateNLMap: Record<string, string> = {
      user_growth_trend: '分析最近30天的新增用户增长趋势，按天统计',
      dau_wau_mau: '统计最近30天的日活跃用户数（DAU）、周活跃（WAU）和月活跃（MAU）',
      new_user_acquisition: '按来源渠道统计新用户数量，对比各渠道的获客效果',
      growth_rate: '计算最近3个月的用户数、收入的环比增长率',
      user_retention: '计算用户的次日留存率（D1）、7日留存率（D7）和30日留存率（D30）',
      churn_analysis: '分析近90天内流失的用户比例，流失定义为超过30天未活跃',
      cohort_retention: '生成同期群分析：按注册月份分组，查看各月用户在后续每月的留存情况',
      revenue_trend: '统计最近6个月每月的总收入，展示收入趋势',
      arpu_arppu: '计算过去30天的ARPU（每活跃用户平均收入）和ARPPU（每付费用户平均收入）',
      ltv_analysis: '按注册渠道统计用户的累计消费金额（LTV），找出高价值用户来源',
      payment_distribution: '分析用户付款金额的分布：0-100、100-500、500-2000、2000以上各区间的用户占比',
      conversion_funnel: '分析用户从注册到首次付款的转化漏斗，计算每步的转化率',
      signup_conversion: '分析最近7天每天的注册转化率，即注册用户数/访问用户数',
      purchase_conversion: '统计最近30天活跃用户中完成首次购买的比例，按来源渠道分组对比',
      feature_usage: '统计各功能模块的使用次数和使用用户数，找出最受欢迎的功能',
      session_analysis: '分析用户平均会话时长、每日会话次数分布，以及高峰使用时段',
      peak_hour_analysis: '分析用户每天24小时的活跃分布，找出流量最高和最低的时段',
      error_analysis: '统计最近7天出现最多的错误类型TOP10，以及每种错误影响的用户数',
      order_analysis: '统计最近30天每天的订单数量、总GMV和平均客单价，展示趋势',
      repurchase_rate: '计算最近90天的用户复购率，以及购买次数的分布情况',
      product_performance: '统计销售量前10的商品，以及各商品的收入贡献占比',
      category_performance: '按商品品类统计本月销售额和占比，并与上月对比变化',
      regional_sales: '按省份统计本季度销售额TOP10，以及各省的客单价对比',
      cart_abandonment: '分析最近30天的购物车放弃率，以及放弃率最高的商品类目',
      expense_analysis: '按支出类别统计最近3个月的支出总额，并展示各类别的占比',
      profit_trend: '对比每月的收入和支出，计算净利润并展示利润率趋势',
      refund_analysis: '分析最近30天的退款率，以及退款最多的商品品类和退款原因分布',
      content_performance: '统计浏览量前10的内容，并分析内容的平均互动率（点赞+评论/浏览）',
      traffic_analysis: '分析最近7天的总PV、UV，以及流量来源（直接访问/搜索/社交媒体）分布',
      bounce_rate: '统计各页面的跳出率（访问后直接离开的比例），并找出跳出率最高的落地页',
      mrr_arr: '统计每月的MRR（月度经常性收入）变化趋势，以及新签、扩容、流失的MRR构成',
      trial_conversion: '分析最近3个月每月的试用转付费转化率，以及从注册到付费的平均天数',
      plan_distribution: '统计各套餐（基础版/专业版/企业版）的订阅用户数和收入贡献占比',
      ab_test: '对比A/B实验中实验组和对照组的转化率、人均收入，判断实验是否显著',
      funnel_drop_analysis: '分析用户在注册流程（填写信息→验证邮箱→完善资料→首次登录）中各步的流失率',
      user_segmentation: '按活跃程度（高/中/低）和消费金额（高/中/低）将用户分为9个象限，统计各群体规模',
      headcount_trend: '统计每月的员工总数变化，以及各部门的人员规模对比',
      attrition_rate: '计算最近12个月的员工离职率（年化），以及主要离职原因的分布',
      data_overview: '对这张表做一个基础统计概览，包括总记录数、各字段的取值分布',
      time_series: '按时间维度统计主要指标的变化趋势，找出波峰和波谷',
      top_n_ranking: '按某个维度（如城市、渠道、品类）统计数值指标的TOP10排名',
      anomaly_detection: '检测数据中的异常值：找出订单金额、用户消费等字段中明显偏离正常范围的记录',
    }
    const nlQuery = templateNLMap[templateId] || `执行${templateName}分析`

    // 只做一件事：把 NL 语句填入输入框，滚动到顶部让用户看到
    // 用户按回车后，QueryInput 会触发 handleQuery 执行自然语言分析
    setPendingQuery(nlQuery)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    showToast(`${templateName} 已填入输入框，按回车执行`, "info")
  }

  const handleQuery = async (query: string) => {
    if (!query.trim()) return
    if (connectedDatabases.length === 0) {
      showToast("请先连接数据库", "error")
      return
    }

    const isMultiSelect = selectedIds.length > 1

    // 无 AI + 多表：直接拦截
    if (isMultiSelect && !hasAI) {
      persistError("多表关联分析需要配置 AI。请前往「设置」添加 AI API Key，或只选择单个数据表。")
      return
    }

    // 确定主目标数据库
    const primaryDb = selectedIds.length > 0
      ? (connectedDatabases.find(d => d.id === selectedIds[0]) || connectedDatabases[0])
      : connectedDatabases[0]
    const db = primaryDb

    setIsLoading(true)
    setLoadingStage('正在生成 SQL…')
    clearResults()

    const startTime = Date.now()

    try {
      // Step 1: 自然语言 → SQL
      // 优先使用选中的具体表格名，否则回退到数据库名
      const selectedTableNames = (() => {
        if (selectedIds.length === 0) return []
        if (selectedIds.length === 1) {
          const dbId = selectedIds[0]
          const tables = selectedTables[dbId]
          if (tables && tables.length > 0) return tables
        }
        // 多数据库时使用数据库名
        return selectedIds
          .map(id => connectedDatabases.find(d => d.id === id)?.name)
          .filter(Boolean) as string[]
      })()

      const nlContext: Record<string, any> = {
        databaseName: db.database,
        databaseConfig: db,
        selectedTables: selectedTableNames,
      }
      if (selectedIds.length === 1) {
        nlContext.tableName = selectedTableNames[0] || db.name
      }

      const sqlResult = await window.electronAPI.nl.generateSQL(db.type, query, nlContext)

      if (!sqlResult.success || !sqlResult.sql) {
        if (sqlResult.needsAI || !hasAI) {
          throw new Error("AI 未配置，无法理解此查询。配置 AI Key 后可使用自然语言分析，或点击「一键概览」自动分析。")
        }
        throw new Error(sqlResult.error || sqlResult.message || "SQL 生成失败")
      }

      const generatedSQL = sqlResult.sql

      // Step 2: SQL 安全校验
      setLoadingStage('安全校验中…')
      const validation = await window.electronAPI.sql.validate(generatedSQL)
      const finalSQL = validation.fixedSQL || generatedSQL

      // Step 3: 执行查询
      setLoadingStage('正在查询数据库…')
      const dbResult = await window.electronAPI.database.query(db, finalSQL)
      if (!dbResult.success) {
        throw new Error(dbResult.error || "查询执行失败")
      }

      const resultData = dbResult.data || dbResult
      const duration = Date.now() - startTime
      const result: QueryResult = {
        columns: resultData.columns || [],
        rows: resultData.rows || [],
        rowCount: resultData.rowCount ?? (resultData.rows?.length || 0),
        duration,
        sql: finalSQL,
      }
      persistResult(result)
      setLoadingStage('')

      // Step 4 + 5: 图表推荐 & AI 洞察并行执行
      const chartPromise = window.electronAPI.charts.recommend(resultData)
        .then((rec: any) => { if (rec?.type) persistChart(rec) })
        .catch((err: any) => console.warn('图表推荐失败:', err?.message))

      const insightPromise = hasAI ? (() => {
        setIsInsightLoading(true)
        return window.electronAPI.ai.chat(
          `根据以下查询结果给出3条简短的数据洞察，每条不超过40字，直接返回JSON数组格式：[{"title":"...","content":"...","type":"trend|warning|suggestion"}]\n\n查询：${query}\n数据行数：${result.rowCount}\nSQL：${finalSQL}`,
        ).then((res: any) => {
          try {
            const text = typeof res === 'string' ? res : (res?.content || res?.message || '')
            const match = text.match(/\[[\s\S]*\]/)
            if (match) {
              const parsed = JSON.parse(match[0])
              persistInsights(Array.isArray(parsed) ? parsed.slice(0, 3) : [])
            }
          } catch (parseErr) {
            console.warn('AI 洞察解析失败:', parseErr)
          }
        }).catch((err: any) => {
          console.warn('AI 洞察生成失败:', err?.message)
        }).finally(() => setIsInsightLoading(false))
      })() : Promise.resolve()

      // 并行等待（不阻塞主流程，已通过 persistResult 展示结果）
      Promise.allSettled([chartPromise, insightPromise])

      addQueryToHistory(query, "success", result.rowCount, `${duration}ms`)
    } catch (err: any) {
      const errorMsg = err?.message || (err as any)?.response?.message || (err as any)?.message || "查询失败"
      persistError(errorMsg)
      setLoadingStage('')
      addQueryToHistory(query, "error")
      showToast(errorMsg, "error")
    } finally {
      setIsLoading(false)
    }
  }

  const isMultiSelected = selectedIds.length > 1
  const showMultiTableWarning = isMultiSelected && !hasAI

  return (
    <PageLayout activeItem="query" onNavigate={onNavigate}>
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          欢迎回来
        </h1>
        <p className="text-muted-foreground">
          用自然语言探索你的数据，AI 将帮助你发现洞察
        </p>
      </div>

      {/* 分析目标选择器 — 下拉菜单 */}
      {hasDataSource && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground flex-shrink-0">分析目标：</span>
            <div className="relative flex-1 min-w-0 max-w-xs" ref={selectorRef}>
              {/* 触发按钮 */}
              <button
                onClick={() => setSelectorOpen(!selectorOpen)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-card hover:border-primary/50 text-foreground",
                  selectorOpen ? "border-primary shadow-sm" : "border-border"
                )}
              >
                <Database className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-left truncate">
                  {selectedIds.length === 0
                    ? '全部表格'
                    : selectedIds.length === 1
                      ? (() => {
                          const dbId = selectedIds[0]
                          const tables = selectedTables[dbId]
                          const dbName = connectedDatabases.find(d => d.id === dbId)?.name || ''
                          if (tables && tables.length > 0) {
                            return tables.length === 1 ? `${dbName} › ${tables[0]}` : `${dbName} › ${tables.length} 张表`
                          }
                          return dbName
                        })()
                      : `已选 ${selectedIds.length} 个数据源`}
                </span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform", selectorOpen && "rotate-180")} />
              </button>

              {/* 下拉菜单 */}
              {selectorOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl border border-border bg-card shadow-lg py-1 animate-in fade-in slide-in-from-top-2 duration-150 min-w-[220px]">
                  {/* 全部表格 */}
                  <button
                    onClick={() => { setSelectedIds([]); setSelectorOpen(false) }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/50",
                      selectedIds.length === 0 ? "text-primary font-medium" : "text-foreground"
                    )}
                  >
                    {selectedIds.length === 0 && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                    {selectedIds.length !== 0 && <span className="w-3.5 h-3.5 flex-shrink-0" />}
                    <span>全部表格</span>
                  </button>

                  <div className="mx-3 my-1 border-t border-border" />

                  {/* 按项目分组 */}
                  {projects.map((project) => {
                    const projectDbs = connectedDatabases.filter(db => (db.projectId || 'default') === project.id)
                    if (projectDbs.length === 0) return null
                    return (
                      <div key={project.id}>
                        <div className="flex items-center gap-1.5 px-3 py-1.5">
                          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{project.name}</span>
                        </div>
                        {projectDbs.map((db) => {
                          const isSelected = selectedIds.includes(db.id)
                          const tables = dbTableLists[db.id] || []
                          const isExpanded = expandedDbId === db.id
                          const isLoadingTables = loadingTables.has(db.id)
                          const selectedDbTables = selectedTables[db.id] || []
                          const hasTables = tables.length > 0 || db.type === 'demo'

                          return (
                            <div key={db.id} className="relative">
                              <div className="flex items-center">
                                {/* 数据库行 */}
                                <button
                                  onClick={() => toggleSource(db.id)}
                                  className={cn(
                                    "flex-1 flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/50",
                                    isSelected ? "text-primary font-medium" : "text-foreground"
                                  )}
                                >
                                  {isSelected ? <Check className="h-3.5 w-3.5 flex-shrink-0" /> : <span className="w-3.5 h-3.5 flex-shrink-0" />}
                                  <Database className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate">{db.name}</span>
                                </button>
                                {/* 展开/折叠表格按钮（仅已选中的数据库显示） */}
                                {isSelected && hasTables && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleExpandDb(db.id) }}
                                    className="flex-shrink-0 p-1 mr-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title={isExpanded ? "收起表格" : "查看表格"}
                                  >
                                    {isLoadingTables ? (
                                      <div className="h-3.5 w-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* 表格列表（展开时） */}
                              {isExpanded && (
                                <div className="pl-9 pr-3 pb-1 space-y-0.5">
                                  {isLoadingTables ? (
                                    <p className="text-xs text-muted-foreground py-1">加载中…</p>
                                  ) : tables.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-1">暂无法获取表列表</p>
                                  ) : (
                                    <>
                                      {tables.map(tableName => {
                                        const isTableSelected = selectedDbTables.includes(tableName)
                                        return (
                                          <button
                                            key={tableName}
                                            onClick={() => toggleTable(db.id, tableName)}
                                            className={cn(
                                              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-muted/50",
                                              isTableSelected ? "text-primary font-medium" : "text-foreground/80"
                                            )}
                                          >
                                            {isTableSelected
                                              ? <Check className="h-3 w-3 flex-shrink-0" />
                                              : <span className="w-3 h-3 flex-shrink-0" />
                                            }
                                            <span className="text-xs truncate">{tableName}</span>
                                          </button>
                                        )
                                      })}
                                      {selectedDbTables.length > 0 && (
                                        <button
                                          onClick={() => clearDbTables(db.id)}
                                          className="w-full text-xs text-muted-foreground hover:text-foreground py-1 pl-2 transition-colors"
                                        >
                                          清除选择
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 一键概览 */}
            <button
              onClick={handleOneClickAnalysis}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Zap className="h-3.5 w-3.5" />
              一键分析
            </button>
            {/* 表概览按钮：点击展开/收起概览 */}
            {tableInfo && (
              <button
                onClick={() => {
                  // 触发 TableSchemaOverview 的展开状态，需要通过 DOM 操作
                  const btn = document.querySelector('[data-table-overview] button')
                  btn?.click()
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex-shrink-0"
                title="查看当前表的字段结构"
              >
                <Table className="h-3.5 w-3.5" />
                表概览
              </button>
            )}
          </div>

          {/* 多表无 AI 警告 */}
          {showMultiTableWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                多表关联分析需要 AI 支持。
                <button
                  onClick={() => onNavigate?.('settings')}
                  className="ml-1 underline underline-offset-2 hover:opacity-80"
                >
                  前往设置配置 AI
                </button>
              </span>
            </div>
          )}
        </div>
      )}

      {/* 表概览弹窗（需挂载在页面中才能被按钮触发） */}
      {tableInfo && currentTableName && (
        <TableSchemaOverview tableInfo={tableInfo} tableName={currentTableName} db={currentDb} />
      )}

      {/* Query Input */}
      <QueryInput
        onSubmit={handleQuery}
        onSqlSubmit={handleSqlSubmit}
        isLoading={isLoading}
        pendingQuery={pendingQuery}
        onPendingQueryConsumed={() => setPendingQuery(undefined)}
      />

      {/* 查询阶段提示 */}
      {isLoading && loadingStage && (
        <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground animate-pulse">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          {loadingStage}
        </div>
      )}

      {!hasDataSource ? (
        <EmptyStates type="no-datasource" onAction={() => onNavigate?.('datasources')} />
      ) : (
        <>
          {/* Quick Actions */}
          <QuickActions
            onNavigate={onNavigate}
            onQuerySelect={(q) => {
              setPendingQuery(q)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            onTemplateRun={(id, name) => handleTemplateRun(id, name)}
          />

          {/* 查询错误提示 */}
          {queryError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
              {queryError}
              {queryError.includes('AI') && (
                <button
                  onClick={() => onNavigate?.('settings')}
                  className="ml-2 underline underline-offset-2 hover:opacity-80"
                >
                  去设置
                </button>
              )}
            </div>
          )}

          {queryResult && <StatsCards result={queryResult} />}

          <AIInsights
            hasData={!!queryResult}
            insights={aiInsights}
            isLoading={isInsightLoading}
          />

          {queryResult && (
            <div className="grid gap-6 lg:grid-cols-2">
              <DataPreview result={queryResult} />
              <ChartPreview result={queryResult} recommendation={chartRecommendation} />
            </div>
          )}

          <RecentQueries />
        </>
      )}
    </PageLayout>
  )
}
