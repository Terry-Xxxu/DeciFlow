import { useState } from "react"
import { PageLayout } from "../components/dashboard/page-layout"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Checkbox } from "../components/ui/checkbox"
import {
  Clock,
  Search,
  Trash2,
  RotateCcw,
  Filter,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  Code,
  Calendar,
} from "lucide-react"
import { EmptyState } from "../components/dashboard/empty-states"

interface HistoryPageProps {
  onNavigate?: (page: string) => void
}

const mockHistory = [
  {
    id: "1",
    query: "最近7天的日活用户趋势",
    sql: "SELECT DATE(activity_date), COUNT(DISTINCT user_id) FROM user_activities WHERE activity_date >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE(activity_date)",
    timestamp: "2024-01-15 14:30:25",
    duration: "156ms",
    rows: 7,
    result: "success",
    chart: "line",
  },
  {
    id: "2",
    query: "用户留存率分析",
    sql: "SELECT cohort, COUNT(DISTINCT user_id) * 1.0 / COUNT(*) as retention_rate FROM user_retention WHERE retention_day = 7 GROUP BY cohort",
    timestamp: "2024-01-15 14:25:10",
    duration: "234ms",
    rows: 5,
    result: "success",
    chart: "bar",
  },
  {
    id: "3",
    query: "各渠道转化率对比",
    sql: "SELECT channel, COUNT(DISTINCT user_id) as users, COUNT(DISTINCT CASE WHEN converted THEN user_id END) * 1.0 / COUNT(DISTINCT user_id) as conversion_rate FROM user_acquisition GROUP BY channel",
    timestamp: "2024-01-15 14:20:00",
    duration: "189ms",
    rows: 4,
    result: "success",
    chart: "pie",
  },
  {
    id: "4",
    query: "本月新增用户按来源分布",
    sql: "SELECT source, COUNT(*) as new_users FROM users WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) GROUP BY source",
    timestamp: "2024-01-15 14:15:30",
    duration: "145ms",
    rows: 6,
    result: "error",
    chart: null,
  },
]

const timeFilters = [
  { id: "today", name: "今天" },
  { id: "week", name: "本周" },
  { id: "month", name: "本月" },
  { id: "all", name: "全部" },
]

const resultFilters = [
  { id: "all", name: "全部" },
  { id: "success", name: "成功" },
  { id: "error", name: "失败" },
]

export function V1HistoryPage({ onNavigate }: HistoryPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [timeFilter, setTimeFilter] = useState("all")
  const [resultFilter, setResultFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  // Toggle this to test empty state
  const hasHistory = true

  const filteredHistory = mockHistory.filter((item) => {
    const matchesSearch = item.query.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesResult =
      resultFilter === "all" ||
      (resultFilter === "success" && item.result === "success") ||
      (resultFilter === "error" && item.result === "error")
    return matchesSearch && matchesResult
  })

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedItems.size === filteredHistory.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredHistory.map((item) => item.id)))
    }
  }

  const handleReRun = (id: string) => {
    console.log("Re-run query:", id)
  }

  const handleDelete = (id: string) => {
    console.log("Delete query:", id)
  }

  const handleDeleteSelected = () => {
    console.log("Delete selected:", Array.from(selectedItems))
    setSelectedItems(new Set())
  }

  const successCount = mockHistory.filter((h) => h.result === "success").length
  const errorCount = mockHistory.filter((h) => h.result === "error").length
  const avgDuration = Math.round(
    mockHistory.reduce((sum, h) => sum + parseInt(h.duration), 0) / mockHistory.length
  )

  if (!hasHistory) {
    return (
      <PageLayout currentPage="history" onNavigate={onNavigate}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                查询历史
              </h1>
              <p className="text-sm text-muted-foreground">
                查看和重新执行历史查询
              </p>
            </div>
          </div>
        </div>
        <EmptyState type="no-history" />
      </PageLayout>
    )
  }

  return (
    <PageLayout currentPage="history" onNavigate={onNavigate}>
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Clock className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              查询历史
            </h1>
            <p className="text-sm text-muted-foreground">
              查看和重新执行历史查询
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{mockHistory.length}</div>
                <div className="text-xs text-muted-foreground">总查询数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{successCount}</div>
                <div className="text-xs text-muted-foreground">成功查询</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-500/10 p-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{errorCount}</div>
                <div className="text-xs text-muted-foreground">失败查询</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Code className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{avgDuration}ms</div>
                <div className="text-xs text-muted-foreground">平均耗时</div>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            筛选
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </Button>
          {selectedItems.size > 0 && (
            <Button variant="destructive" className="gap-2" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4" />
              删除已选 ({selectedItems.size})
            </Button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">时间范围</label>
                <div className="flex gap-2">
                  {timeFilters.map((filter) => (
                    <Button
                      key={filter.id}
                      variant={timeFilter === filter.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeFilter(filter.id)}
                    >
                      {filter.name}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">结果状态</label>
                <div className="flex gap-2">
                  {resultFilters.map((filter) => (
                    <Button
                      key={filter.id}
                      variant={resultFilter === filter.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setResultFilter(filter.id)}
                    >
                      {filter.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History List */}
      <div className="space-y-3">
        {/* Select All */}
        <Card className="border-dashed">
          <CardContent className="p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={selectedItems.size === filteredHistory.length && filteredHistory.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium text-foreground">
                全选 ({filteredHistory.length} 条记录)
              </span>
            </label>
          </CardContent>
        </Card>

        {filteredHistory.map((item) => (
          <Card
            key={item.id}
            className={`group overflow-hidden transition-all hover:shadow-md ${
              selectedItems.has(item.id) ? "border-primary ring-1 ring-primary" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <Checkbox
                  checked={selectedItems.has(item.id)}
                  onCheckedChange={() => handleSelect(item.id)}
                  className="mt-1"
                />

                {/* Icon */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    item.result === "success" ? "bg-emerald-500/10" : "bg-red-500/10"
                  }`}
                >
                  {item.result === "success" ? (
                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">{item.query}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {item.timestamp}
                        </span>
                        <span>·</span>
                        <span>{item.duration}</span>
                        <span>·</span>
                        <span>{item.rows} 行结果</span>
                        {item.result === "success" ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-transparent">
                            成功
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-transparent">
                            失败
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {item.result === "success" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleReRun(item.id)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          重新运行
                        </Button>
                      )}
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

                  {/* SQL Code */}
                  <div className="rounded-lg bg-muted/50 p-3">
                    <code className="text-xs text-muted-foreground break-all">{item.sql}</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredHistory.length === 0 && (
        <Card className="p-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">暂无历史记录</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "没有找到匹配的查询" : "您的查询历史将显示在这里"}
          </p>
        </Card>
      )}
    </PageLayout>
  )
}
