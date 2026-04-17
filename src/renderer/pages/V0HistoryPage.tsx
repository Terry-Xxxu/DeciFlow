import { useState, useEffect } from "react"
import { PageLayout } from "../components/v0-layout/PageLayout"
import { Card, CardContent } from "../components/v0-ui/Card"
import { Button } from "../components/v0-ui/Button"
import { Input } from "../components/v0-ui/Input"
import { Badge } from "../components/v0-ui/Badge"
import { Modal, AlertDialog } from "../components/Modal"
import { useTheme } from "../contexts/ThemeContext"
import {
  Clock,
  Search,
  Trash2,
  RotateCcw,
  Filter,
  TrendingUp,
  BarChart3,
  Database,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock as ClockIcon,
} from "lucide-react"
import { cn } from "../lib/utils"
import {
  getQueryHistory,
  removeFromHistory,
  clearQueryHistory,
  type QueryHistoryItem,
} from "../stores/QueryHistoryStore"

interface V0Props {
  onNavigate?: (page: string) => void
}

export function V0HistoryPage({ onNavigate }: V0Props) {
  const { mode } = useTheme()
  const isDark = mode === "dark"
  const [history, setHistory] = useState<QueryHistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [detailItem, setDetailItem] = useState<QueryHistoryItem | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [showClearDialog, setShowClearDialog] = useState(false)

  // 加载历史记录
  const loadHistory = () => setHistory(getQueryHistory())

  useEffect(() => {
    loadHistory()
    // 监听 storage 变化（其他组件写入后同步刷新）
    const handler = () => loadHistory()
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  const filteredHistory = history.filter(
    (item) =>
      item.query.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelect = (id: string) => {
    const next = new Set(selectedItems)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedItems(next)
  }

  const handleSelectAll = () => {
    if (selectedItems.size === filteredHistory.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredHistory.map((item) => item.id)))
    }
  }

  const handleReRun = (query: string) => {
    // 触发主页查询
    window.dispatchEvent(new CustomEvent("rerun-query", { detail: query }))
    onNavigate?.("query")
  }

  const handleDelete = (id: string) => {
    setItemToDelete(id)
    setShowDeleteDialog(true)
  }

  const confirmDelete = () => {
    if (itemToDelete) {
      removeFromHistory(itemToDelete)
      loadHistory()
      setSelectedItems((prev) => {
        const next = new Set(prev)
        next.delete(itemToDelete)
        return next
      })
      setShowDeleteDialog(false)
      setItemToDelete(null)
    }
  }

  const handleDeleteSelected = () => {
    selectedItems.forEach((id) => removeFromHistory(id))
    loadHistory()
    setSelectedItems(new Set())
  }

  const confirmClearAll = () => {
    clearQueryHistory()
    loadHistory()
    setShowClearDialog(false)
  }

  const checkboxClass = cn(
    "h-4 w-4 rounded border transition-colors cursor-pointer appearance-none",
    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0",
    isDark
      ? "border-white/15 bg-transparent"
      : "border-gray-300 bg-white"
  )

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  return (
    <PageLayout activeItem="history" onNavigate={onNavigate}>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            查询历史
          </h1>
          <p className="text-sm text-muted-foreground">
            查看和重新执行历史查询（共 {history.length} 条）
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={() => setShowClearDialog(true)}>
            <Trash2 className="h-4 w-4" />
            清空全部
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索历史查询..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {selectedItems.size > 0 && (
            <Button variant="destructive" className="gap-2" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4" />
              删除已选 ({selectedItems.size})
            </Button>
          )}
        </div>
      </div>

      {/* History List */}
      {filteredHistory.length > 0 ? (
        <div className="space-y-3">
          {/* Select All */}
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors",
              isDark ? "bg-white/5 hover:bg-white/10" : "bg-muted/30 hover:bg-muted/50"
            )}
            onClick={handleSelectAll}
          >
            <div className={cn("relative", checkboxClass)}>
              {selectedItems.size === filteredHistory.length && filteredHistory.length > 0 && (
                <svg className="h-3 w-3 text-primary absolute top-0.5 left-0.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium text-foreground">
              全选（{filteredHistory.length} 条）
            </span>
          </div>

          {filteredHistory.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "transition-all cursor-pointer hover:border-primary/30",
                selectedItems.has(item.id) && "border-primary bg-primary/5"
              )}
              onClick={() => setDetailItem(item)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div
                    className={cn("mt-1 cursor-pointer relative", checkboxClass)}
                    onClick={(e) => { e.stopPropagation(); handleSelect(item.id) }}
                  >
                    {selectedItems.has(item.id) && (
                      <svg className="h-3 w-3 text-primary absolute top-0.5 left-0.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>

                  {/* Icon */}
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    item.status === "success" ? "bg-primary/10" : "bg-destructive/10"
                  )}>
                    {item.status === "success" ? (
                      <TrendingUp className="h-5 w-5 text-primary" />
                    ) : (
                      <BarChart3 className="h-5 w-5 text-destructive" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{item.query}</p>
                          {item.status === "success" ? (
                            <Badge variant="success" className="gap-1 shrink-0">
                              <CheckCircle2 className="h-3 w-3" />
                              成功
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1 shrink-0">
                              <XCircle className="h-3 w-3" />
                              失败
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(item.timestamp)}</span>
                          </div>
                          {item.duration && (
                            <div className="flex items-center gap-1">
                              <ClockIcon className="h-3 w-3" />
                              <span>{item.duration}</span>
                            </div>
                          )}
                          {item.rows !== undefined && (
                            <span>{item.rows.toLocaleString()} 行</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleReRun(item.query)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          重新运行
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">暂无历史记录</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "没有找到匹配的查询" : "您的查询历史将在此处显示"}
          </p>
        </Card>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <Modal isOpen={!!detailItem} onClose={() => setDetailItem(null)} title="查询详情" size="auto">
          <div className="space-y-4">
            <div className={cn("flex items-center gap-2 p-3 rounded-lg border", isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
              {detailItem.status === "success" ? (
                <><CheckCircle2 className="h-5 w-5 text-green-500" /><span className="text-sm font-medium text-foreground">查询成功</span></>
              ) : (
                <><XCircle className="h-5 w-5 text-destructive" /><span className="text-sm font-medium text-foreground">查询失败</span></>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={cn("p-3 rounded-lg border", isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">查询时间</span>
                </div>
                <p className="text-sm font-medium text-foreground">{formatDate(detailItem.timestamp)}</p>
              </div>
              {detailItem.duration && (
                <div className={cn("p-3 rounded-lg border", isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
                  <div className="flex items-center gap-2 mb-1">
                    <ClockIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">执行时间</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{detailItem.duration}</p>
                </div>
              )}
              {detailItem.rows !== undefined && (
                <div className={cn("p-3 rounded-lg border", isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">返回行数</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{detailItem.rows.toLocaleString()} 行</p>
                </div>
              )}
            </div>

            <div className={cn("p-3 rounded-lg border", isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
              <span className="text-xs text-muted-foreground mb-2 block">查询内容</span>
              <p className="text-sm text-foreground">{detailItem.query}</p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setDetailItem(null)}>关闭</Button>
              <Button onClick={() => { handleReRun(detailItem.query); setDetailItem(null) }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                重新运行
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="删除查询记录"
        message="确定要删除这条查询记录吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        variant="error"
      />

      {/* Clear All Confirmation */}
      <AlertDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        title="清空所有历史"
        message="确定要清空全部查询历史吗？此操作无法撤销。"
        confirmText="清空"
        cancelText="取消"
        onConfirm={confirmClearAll}
        variant="error"
      />
    </PageLayout>
  )
}
