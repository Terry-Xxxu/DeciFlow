"use client"

import { Button } from "@/components/ui/button"
import { Table, Download, Eye, Code2, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

const tableData = [
  { date: "2024-01", users: 12345, retention: 68.5, trend: "up", change: "+5.2%" },
  { date: "2024-02", users: 13567, retention: 72.1, trend: "up", change: "+3.6%" },
  { date: "2024-03", users: 14892, retention: 70.8, trend: "down", change: "-1.3%" },
  { date: "2024-04", users: 16234, retention: 74.2, trend: "up", change: "+3.4%" },
  { date: "2024-05", users: 18567, retention: 76.5, trend: "up", change: "+2.3%" },
]

export function DataPreview() {
  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Table className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">查询结果</h2>
            <p className="text-sm text-muted-foreground">1,234 行数据 · 156ms</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2">
            <Code2 className="h-4 w-4" />
            SQL
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            预览
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            导出
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                日期
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                用户数
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                留存率
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                趋势
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tableData.map((row) => (
              <tr key={row.date} className="transition-colors hover:bg-muted/20">
                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-foreground">
                  {row.date}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-muted-foreground">
                  {row.users.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-muted-foreground">
                  {row.retention}%
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <div className="flex items-center gap-2">
                    {row.trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={cn(
                        "text-sm font-medium",
                        row.trend === "up" ? "text-emerald-500" : "text-red-500"
                      )}
                    >
                      {row.change}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <span className="text-sm text-muted-foreground">
          显示 1-5 / 共 1,234 条
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled>
            上一页
          </Button>
          <Button variant="ghost" size="sm">
            下一页
          </Button>
        </div>
      </div>
    </div>
  )
}
