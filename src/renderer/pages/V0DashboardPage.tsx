
import { useState, useEffect } from "react"
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
import { addQueryToHistory } from "../stores/QueryHistoryStore"
import { showToast } from "../lib/download"

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
  const connectedDatabases = databases.filter((db) => db.connected)
  const hasDataSource = connectedDatabases.length > 0

  const [isLoading, setIsLoading] = useState(false)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [chartRecommendation, setChartRecommendation] = useState<ChartRecommendation | null>(null)
  const [aiInsights, setAiInsights] = useState<any[]>([])
  const [isInsightLoading, setIsInsightLoading] = useState(false)

  // 监听来自 RecentQueries 的重新运行事件
  useEffect(() => {
    const handler = (e: Event) => {
      const query = (e as CustomEvent).detail as string
      handleQuery(query)
    }
    window.addEventListener("rerun-query", handler)
    return () => window.removeEventListener("rerun-query", handler)
  }, [connectedDatabases])

  const handleQuery = async (query: string) => {
    if (!query.trim()) return
    if (connectedDatabases.length === 0) {
      showToast("请先连接数据库", "error")
      return
    }

    const db = connectedDatabases[0]
    setIsLoading(true)
    setQueryError(null)
    setQueryResult(null)
    setChartRecommendation(null)
    setAiInsights([])

    const startTime = Date.now()

    try {
      // Step 1: 自然语言 → SQL
      const sqlResult = await window.electronAPI.nl.generateSQL(db.type, query, { databaseName: db.database })
      if (!sqlResult.success || !sqlResult.sql) {
        throw new Error(sqlResult.error || "AI 生成 SQL 失败，请检查 AI 配置")
      }

      const generatedSQL = sqlResult.sql

      // Step 2: SQL 安全校验
      const validation = await window.electronAPI.sql.validate(generatedSQL)
      const finalSQL = validation.fixedSQL || generatedSQL

      // Step 3: 执行查询
      const dbResult = await window.electronAPI.database.query(db, finalSQL)
      if (!dbResult.success) {
        throw new Error(dbResult.error || "查询执行失败")
      }

      const duration = Date.now() - startTime
      const result: QueryResult = {
        columns: dbResult.columns || [],
        rows: dbResult.rows || [],
        rowCount: dbResult.rowCount ?? (dbResult.rows?.length || 0),
        duration,
        sql: finalSQL,
      }
      setQueryResult(result)

      // Step 4: 图表推荐（异步，不阻塞结果展示）
      window.electronAPI.charts.recommend(dbResult).then((rec: any) => {
        if (rec?.type) setChartRecommendation(rec)
      }).catch(() => {})

      // Step 5: AI 洞察（异步）
      setIsInsightLoading(true)
      window.electronAPI.ai.chat(
        `根据以下查询结果给出3条简短的数据洞察，每条不超过40字，直接返回JSON数组格式：[{"title":"...","content":"...","type":"trend|warning|suggestion"}]\n\n查询：${query}\n数据行数：${result.rowCount}\nSQL：${finalSQL}`,
      ).then((res: any) => {
        try {
          const text = typeof res === 'string' ? res : (res?.content || res?.message || '')
          const match = text.match(/\[[\s\S]*\]/)
          if (match) {
            const parsed = JSON.parse(match[0])
            setAiInsights(Array.isArray(parsed) ? parsed.slice(0, 3) : [])
          }
        } catch {
          // 解析失败静默处理
        }
      }).catch(() => {}).finally(() => setIsInsightLoading(false))

      // 记录到查询历史
      const durationStr = `${duration}ms`
      addQueryToHistory(query, "success", result.rowCount, durationStr)

    } catch (err: any) {
      const errorMsg = err?.message || "查询失败"
      setQueryError(errorMsg)
      addQueryToHistory(query, "error")
      showToast(errorMsg, "error")
    } finally {
      setIsLoading(false)
    }
  }

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

      {/* Query Input */}
      <QueryInput onSubmit={handleQuery} isLoading={isLoading} />

      {!hasDataSource ? (
        <EmptyStates type="no-datasource" />
      ) : (
        <>
          {/* Quick Actions */}
          <QuickActions />

          {/* 查询错误提示 */}
          {queryError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
              {queryError}
            </div>
          )}

          {/* Stats Overview — 只在有查询结果时显示 */}
          {queryResult && (
            <StatsCards result={queryResult} />
          )}

          {/* AI Insights */}
          <AIInsights
            hasData={!!queryResult}
            insights={aiInsights}
            isLoading={isInsightLoading}
          />

          {/* Results Section */}
          {queryResult && (
            <div className="grid gap-6 lg:grid-cols-2">
              <DataPreview result={queryResult} />
              <ChartPreview result={queryResult} recommendation={chartRecommendation} />
            </div>
          )}

          {/* Recent Queries */}
          <RecentQueries />
        </>
      )}
    </PageLayout>
  )
}
