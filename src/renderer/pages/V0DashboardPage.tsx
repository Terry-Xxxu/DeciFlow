
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
import { useDatabase } from "../stores/DatabaseStore"
import { useProjects } from "../stores/ProjectStore"
import { addQueryToHistory } from "../stores/QueryHistoryStore"
import { showToast } from "../lib/download"
import { cn } from "../lib/utils"
import { AlertTriangle, ChevronDown, Check, Database, Zap, FolderOpen } from "lucide-react"

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
  const connectedDatabases = databases.filter((db) => db.connected)
  const hasDataSource = connectedDatabases.length > 0

  const [isLoading, setIsLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState<string>('')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [pendingQuery, setPendingQuery] = useState<string | undefined>(undefined)
  const [chartRecommendation, setChartRecommendation] = useState<ChartRecommendation | null>(null)
  const [aiInsights, setAiInsights] = useState<any[]>([])
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
  // AI 是否已配置
  const [hasAI, setHasAI] = useState(false)
  // 分析目标选择器下拉状态
  const [selectorOpen, setSelectorOpen] = useState(false)
  const selectorRef = useRef<HTMLDivElement>(null)

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

  const handleQuery = async (query: string) => {
    if (!query.trim()) return
    if (connectedDatabases.length === 0) {
      showToast("请先连接数据库", "error")
      return
    }

    const isMultiSelect = selectedIds.length > 1

    // 无 AI + 多表：直接拦截
    if (isMultiSelect && !hasAI) {
      setQueryError("多表关联分析需要配置 AI。请前往「设置」添加 AI API Key，或只选择单个数据表。")
      return
    }

    // 确定主目标数据库
    const primaryDb = selectedIds.length > 0
      ? (connectedDatabases.find(d => d.id === selectedIds[0]) || connectedDatabases[0])
      : connectedDatabases[0]
    const db = primaryDb

    // ── Demo 数据库 + 无 AI：跑统计 SQL，给出有意义的分析结果 ──
    const isDemoDb = db.type === 'demo'
    if (isDemoDb && !hasAI) {
      const dbId = selectedIds[0] || connectedDatabases[0]?.id
      const tables = dbId ? (selectedTables[dbId] || []) : []
      const targetTables = tables.length > 0 ? tables : ['users']
      setIsLoading(true)
      setLoadingStage('正在分析表结构…')
      setQueryError(null)
      setQueryResult(null)
      setChartRecommendation(null)
      setAiInsights([])
      try {
        const tableName = targetTables[0]

        // Step 1: 先拿字段信息
        setLoadingStage('获取字段…')
        const schemaResult = await window.electronAPI.database.query(
          db, `SELECT * FROM "${tableName}" WHERE 1=0`
        )
        const columns: string[] = schemaResult.data?.columns || schemaResult.columns || []
        if (columns.length === 0) throw new Error('无法获取表结构')

        // Step 2: 跑 COUNT 等统计
        setLoadingStage('统计记录数…')
        const countResult = await window.electronAPI.database.query(
          db, `SELECT COUNT(*) as cnt FROM "${tableName}"`
        )
        const totalRows = countResult.data?.rows?.[0]?.cnt ?? 0

        // Step 3: 跑各字段统计（数字字段取 min/max/avg，非数字取 count distinct + top5）
        const analysisRows: Record<string, any>[] = []
        for (const col of columns) {
          const lowerCol = col.toLowerCase()
          const isNumeric = /^(id|amount|price|stock|count|total|sum|value|num|qty)$/i.test(col) ||
            col.includes('_id') || col.includes('count') || col.includes('amount') ||
            col.includes('price') || col.includes('total')

          const colResult = await window.electronAPI.database.query(
            db,
            isNumeric
              ? `SELECT MIN("${col}") as min_val, MAX("${col}") as max_val, AVG("${col}") as avg_val FROM "${tableName}"`
              : `SELECT COUNT(DISTINCT "${col}") as distinct_count FROM "${tableName}"`
          )
          const row0 = colResult.data?.rows?.[0]
          analysisRows.push({
            字段: col,
            类型: isNumeric ? '数值' : '文本',
            ...(isNumeric
              ? {
                  最小值: row0?.min_val != null ? Number(row0.min_val).toFixed(2) : '—',
                  最大值: row0?.max_val != null ? Number(row0.max_val).toFixed(2) : '—',
                  平均值: row0?.avg_val != null ? Number(row0.avg_val).toFixed(2) : '—',
                }
              : {
                  不同值数: row0?.distinct_count ?? 0,
                }),
          })
        }

        const result: QueryResult = {
          columns: analysisRows.length > 0 ? Object.keys(analysisRows[0]) : [],
          rows: analysisRows,
          rowCount: totalRows,
          duration: 0,
          sql: `统计分析 — ${tableName}`,
        }
        setQueryResult(result)
        setLoadingStage('')

        // 同时跑原始数据样本供图表推荐用
        const sampleResult = await window.electronAPI.database.query(
          db, `SELECT * FROM "${tableName}" LIMIT 100`
        )
        if (sampleResult.success) {
          window.electronAPI.charts.recommend(sampleResult.data)
            .then((rec: any) => { if (rec?.type) setChartRecommendation(rec) })
            .catch(() => {})
        }
        addQueryToHistory(query, "success", totalRows, '0ms')
      } catch (err: any) {
        setQueryError(err?.message || "分析失败")
        addQueryToHistory(query, "error")
        showToast(err?.message || "分析失败", "error")
      } finally {
        setIsLoading(false)
      }
      return
    }

    setIsLoading(true)
    setLoadingStage('正在生成 SQL…')
    setQueryError(null)
    setQueryResult(null)
    setChartRecommendation(null)
    setAiInsights([])

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
        if (sqlResult.needsAI) {
          throw new Error(sqlResult.message || "此查询需要 AI 支持，请前往设置配置 API Key")
        }
        throw new Error(sqlResult.error || sqlResult.message || "SQL 生成失败，请检查 AI 配置")
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
      setQueryResult(result)
      setLoadingStage('')

      // Step 4 + 5: 图表推荐 & AI 洞察并行执行
      const chartPromise = window.electronAPI.charts.recommend(resultData)
        .then((rec: any) => { if (rec?.type) setChartRecommendation(rec) })
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
              setAiInsights(Array.isArray(parsed) ? parsed.slice(0, 3) : [])
            }
          } catch (parseErr) {
            console.warn('AI 洞察解析失败:', parseErr)
          }
        }).catch((err: any) => {
          console.warn('AI 洞察生成失败:', err?.message)
        }).finally(() => setIsInsightLoading(false))
      })() : Promise.resolve()

      // 并行等待（不阻塞主流程，已通过 setQueryResult 展示结果）
      Promise.allSettled([chartPromise, insightPromise])

      addQueryToHistory(query, "success", result.rowCount, `${duration}ms`)
    } catch (err: any) {
      const errorMsg = err?.message || "查询失败"
      setQueryError(errorMsg)
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
              onClick={() => {
                if (selectedIds.length === 0) {
                  handleQuery('对所有数据表做基础统计分析，列出每张表的记录数')
                } else if (selectedIds.length === 1) {
                  handleQuery('对选中的表做一个基础统计分析，包括总记录数、主要字段的分布情况')
                } else {
                  handleQuery('对所有数据表做基础统计分析，列出每张表的记录数')
                }
              }}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Zap className="h-3.5 w-3.5" />
              {selectedIds.length === 0 ? '全部分析' : '一键概览'}
            </button>
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

      {/* Query Input */}
      <QueryInput
        onSubmit={handleQuery}
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
