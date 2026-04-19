
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
  // 多选表格：空数组 = 全部
  const [selectedIds, setSelectedIds] = useState<string[]>([])
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

    setIsLoading(true)
    setLoadingStage('正在生成 SQL…')
    setQueryError(null)
    setQueryResult(null)
    setChartRecommendation(null)
    setAiInsights([])

    const startTime = Date.now()

    try {
      // Step 1: 自然语言 → SQL
      const selectedTableNames = selectedIds.length > 0
        ? selectedIds
            .map(id => connectedDatabases.find(d => d.id === id)?.name)
            .filter(Boolean) as string[]
        : []

      const nlContext: Record<string, any> = {
        databaseName: db.database,
        databaseConfig: db,
        selectedTables: selectedTableNames,
      }
      if (selectedIds.length === 1) {
        nlContext.tableName = db.name
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
                      ? connectedDatabases.find(d => d.id === selectedIds[0])?.name || '选择的表格'
                      : `已选 ${selectedIds.length} 个表格`}
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
                          return (
                            <button
                              key={db.id}
                              onClick={() => toggleSource(db.id)}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/50",
                                isSelected ? "text-primary font-medium" : "text-foreground"
                              )}
                            >
                              {isSelected ? <Check className="h-3.5 w-3.5 flex-shrink-0" /> : <span className="w-3.5 h-3.5 flex-shrink-0" />}
                              <Database className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{db.name}</span>
                            </button>
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
              onClick={() =>
                selectedIds.length === 1
                  ? handleQuery('对这张表做一个基础统计分析，包括总记录数、主要字段的分布情况')
                  : handleQuery('对所有数据表做基础统计分析，列出每张表的记录数')
              }
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
