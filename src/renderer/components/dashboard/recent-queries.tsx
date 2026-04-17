import { Button } from "../ui/button"
import { Clock, Play, MoreHorizontal, CheckCircle2 } from "lucide-react"

const recentQueries = [
  {
    query: "近7天新用户注册趋势分析",
    time: "2小时前",
    rows: 1234,
    duration: "156ms",
    status: "success",
  },
  {
    query: "用户留存率分析 - 按渠道分组",
    time: "昨天",
    rows: 856,
    duration: "203ms",
    status: "success",
  },
  {
    query: "转化漏斗：注册到首次付费",
    time: "2天前",
    rows: 2341,
    duration: "312ms",
    status: "success",
  },
  {
    query: "月度收入增长对比分析",
    time: "3天前",
    rows: 567,
    duration: "89ms",
    status: "success",
  },
]

export function RecentQueries() {
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
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          查看全部
        </Button>
      </div>

      {/* Query List */}
      <div className="divide-y divide-border">
        {recentQueries.map((item, index) => (
          <div
            key={index}
            className="group flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">{item.query}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{item.time}</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                  <span>{item.rows} 行</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                  <span>{item.duration}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Play className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
