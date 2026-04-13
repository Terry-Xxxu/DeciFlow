"use client"

import { useState } from "react"
import { PageLayout } from "@/components/dashboard/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  Search,
  Play,
  Star,
  StarOff,
  Trash2,
  Copy,
  MoreVertical,
  Filter,
  Calendar,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/dashboard/empty-states"

const queryHistory = [
  {
    id: 1,
    query: "分析过去30天的用户增长趋势",
    timestamp: "2024-03-15 14:32",
    duration: "2.3s",
    rows: 1250,
    starred: true,
    type: "AI 分析",
  },
  {
    id: 2,
    query: "SELECT * FROM users WHERE created_at > '2024-01-01' ORDER BY id DESC LIMIT 100",
    timestamp: "2024-03-15 13:15",
    duration: "0.8s",
    rows: 100,
    starred: false,
    type: "SQL",
  },
  {
    id: 3,
    query: "统计各渠道的转化率并按降序排列",
    timestamp: "2024-03-15 11:42",
    duration: "1.5s",
    rows: 8,
    starred: true,
    type: "自然语言",
  },
  {
    id: 4,
    query: "计算本月的 DAU、WAU 和 MAU",
    timestamp: "2024-03-14 16:20",
    duration: "3.1s",
    rows: 30,
    starred: false,
    type: "自然语言",
  },
  {
    id: 5,
    query: "找出留存率最高的用户群体特征",
    timestamp: "2024-03-14 10:05",
    duration: "4.2s",
    rows: 156,
    starred: true,
    type: "AI 分析",
  },
  {
    id: 6,
    query: "SELECT product_id, SUM(quantity) as total FROM orders GROUP BY product_id",
    timestamp: "2024-03-13 15:30",
    duration: "1.2s",
    rows: 45,
    starred: false,
    type: "SQL",
  },
]

function TypeBadge({ type }: { type: string }) {
  const config = {
    "AI 分析": { className: "bg-violet-500/10 text-violet-500 border-violet-500/20" },
    "自然语言": { className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    "SQL": { className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  }[type] || { className: "" }

  return (
    <Badge variant="outline" className={config.className}>
      {type}
    </Badge>
  )
}

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [history, setHistory] = useState(queryHistory)

  const toggleStar = (id: number) => {
    setHistory(
      history.map((item) =>
        item.id === id ? { ...item, starred: !item.starred } : item
      )
    )
  }

  const filteredHistory = history.filter((item) =>
    item.query.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const hasHistory = history.length > 0 // Toggle for empty state

  if (!hasHistory) {
    return (
      <PageLayout>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              查询历史
            </h1>
            <p className="text-sm text-muted-foreground">
              查看和管理你的查询记录
            </p>
          </div>
        </div>
        <EmptyState type="no-queries" />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            查询历史
          </h1>
          <p className="text-sm text-muted-foreground">
            查看和管理你的查询记录
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            日期范围
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            筛选
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索查询历史..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{history.length}</div>
            <div className="text-sm text-muted-foreground">总查询数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {history.filter((h) => h.starred).length}
            </div>
            <div className="text-sm text-muted-foreground">已收藏</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">2.1s</div>
            <div className="text-sm text-muted-foreground">平均耗时</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">1,589</div>
            <div className="text-sm text-muted-foreground">平均行数</div>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">查询记录</CardTitle>
          <CardDescription>点击查询可重新执行</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 transition-colors hover:bg-secondary/50"
              >
                <button
                  onClick={() => toggleStar(item.id)}
                  className="mt-1 text-muted-foreground hover:text-amber-500"
                >
                  {item.starred ? (
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  ) : (
                    <StarOff className="h-4 w-4" />
                  )}
                </button>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <TypeBadge type={item.type} />
                    <span className="text-xs text-muted-foreground">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="font-mono text-sm text-foreground">{item.query}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.duration}
                    </span>
                    <span>{item.rows} 行</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Play className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        复制查询
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Play className="mr-2 h-4 w-4" />
                        重新执行
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
