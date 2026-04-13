"use client"

import { useState } from "react"
import { Button } from "../v0-ui/Button"
import { BarChart3, LineChart, PieChart, Download, Share2, Check } from "lucide-react"
import { downloadChartAsImage, showToast } from "../../lib/download"
import { cn } from "../../lib/utils"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const chartData = [
  { name: "1月", users: 12345, retention: 68 },
  { name: "2月", users: 13567, retention: 72 },
  { name: "3月", users: 14892, retention: 71 },
  { name: "4月", users: 16234, retention: 74 },
  { name: "5月", users: 18567, retention: 77 },
  { name: "6月", users: 21234, retention: 79 },
  { name: "7月", users: 24521, retention: 82 },
]

// Premium color palette
const COLORS = {
  primary: "#6366f1",   // Indigo
  secondary: "#06b6d4", // Cyan
}

export function ChartPreview() {
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">("line")
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    showToast("图表导出中...", "info")
    // In a real implementation, you'd capture the chart
    setTimeout(() => {
      showToast("图表已导出", "success")
    }, 500)
  }

  const handleShare = async () => {
    setCopied(true)
    // Simulate copying to clipboard
    setTimeout(() => {
      setCopied(false)
    }, 2000)
    showToast("链接已复制到剪贴板", "success")
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">数据趋势</h2>
            <p className="text-sm text-muted-foreground">用户增长与留存率</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7", chartType === "line" && "bg-background shadow-sm")}
            onClick={() => setChartType("line")}
          >
            <LineChart className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7", chartType === "bar" && "bg-background shadow-sm")}
            onClick={() => setChartType("bar")}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7", chartType === "pie" && "bg-background shadow-sm")}
            onClick={() => setChartType("pie")}
          >
            <PieChart className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="p-5">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                itemStyle={{ color: "hsl(var(--muted-foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke={COLORS.primary}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorUsers)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.primary }} />
            <span className="text-sm text-muted-foreground">用户数</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.secondary }} />
            <span className="text-sm text-muted-foreground">留存率</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="ghost" size="sm" className="gap-2" onClick={handleShare}>
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              已复制
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              分享
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
          <Download className="h-4 w-4" />
          导出图表
        </Button>
      </div>
    </div>
  )
}
