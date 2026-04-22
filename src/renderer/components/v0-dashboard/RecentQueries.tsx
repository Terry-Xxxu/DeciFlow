
import { useState, useEffect } from "react"
import { Button } from "../v0-ui/Button"
import { Clock, Play, MoreHorizontal, CheckCircle2, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { showToast } from "../../lib/download"
import { cn } from "../../lib/utils"
import { getQueryHistory, removeFromHistory, type QueryHistoryItem } from "../../stores/QueryHistoryStore"

const PAGE_SIZE = 10

export function RecentQueries() {
  const [queries, setQueries] = useState<QueryHistoryItem[]>([])
  const [page, setPage] = useState(0)
  const [jumpInput, setJumpInput] = useState('')

  // Load query history on mount
  useEffect(() => {
    setQueries(getQueryHistory())
  }, [])

  // Listen for storage changes to sync across tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setQueries(getQueryHistory())
    }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const totalPages = Math.ceil(queries.length / PAGE_SIZE)
  const pageQueries = queries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleReRun = (query: QueryHistoryItem) => {
    showToast(`正在重新执行: ${query.query.substring(0, 20)}...`, "info")
    window.dispatchEvent(new CustomEvent("rerun-query", { detail: query.query }))
  }

  const handleDelete = (id: string) => {
    removeFromHistory(id)
    setQueries(getQueryHistory())
    showToast("查询已删除", "success")
  }

  const handleViewAll = () => {
    showToast("查看全部查询历史", "info")
  }

  if (queries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">暂无查询历史</p>
        <p className="mt-1 text-sm text-muted-foreground/70">执行查询后会显示在这里</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">最近查询</h2>
            <p className="text-sm text-muted-foreground">快速重新执行历史查询</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{queries.length} 条记录</span>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleViewAll}>
            查看全部
          </Button>
        </div>
      </div>

      {/* Query List */}
      <div className="divide-y divide-border">
        {pageQueries.map((item) => (
          <div
            key={item.id}
            className="group flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                item.status === "success" ? "bg-emerald-500/10" : "bg-red-500/10"
              )}>
                <CheckCircle2 className={cn(
                  "h-4 w-4",
                  item.status === "success" ? "text-emerald-500" : "text-red-500"
                )} />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">{item.query}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{item.time}</span>
                  {item.rows && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                      <span>{item.rows} 行</span>
                    </>
                  )}
                  {item.duration && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                      <span>{item.duration}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleReRun(item)}
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDelete(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-xs text-muted-foreground">
            显示 {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, queries.length)} / 共 {queries.length} 条
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[60px] text-center">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 ml-1 border border-border rounded-md px-2 py-1">
              <span className="text-xs text-muted-foreground">跳至</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                className="w-10 text-xs bg-transparent text-foreground text-center outline-none"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const p = parseInt(jumpInput, 10)
                    if (!isNaN(p) && p >= 1 && p <= totalPages) {
                      setPage(p - 1)
                      setJumpInput('')
                    }
                  }
                }}
              />
              <span className="text-xs text-muted-foreground">页</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
