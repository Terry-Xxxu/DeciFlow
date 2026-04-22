"use client"

import { useState, useRef } from "react"
import { Button } from "../v0-ui/Button"
import { BarChart3, LineChart, PieChart, Download, Check } from "lucide-react"
import { downloadChartAsImage, showToast, downloadAsCSV } from "../../lib/download"
import { formatNumber } from "../../utils/format"
import { cn } from "../../lib/utils"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

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

interface ChartPreviewProps {
  result: QueryResult
  recommendation?: ChartRecommendation | null
}

const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export function ChartPreview({ result, recommendation }: ChartPreviewProps) {
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">(
    recommendation?.type === "bar" ? "bar" : recommendation?.type === "pie" ? "pie" : "line"
  )
  const [isExporting, setIsExporting] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  const { columns, rows } = result

  // 自动选择最合适的字段映射
  // xKey: 第一个字符串或日期类列
  // yKeys: 其余数字列
  const xKey = columns.find((col) => {
    const sample = rows[0]?.[col]
    return typeof sample === "string" || sample instanceof Date
  }) || columns[0]

  const yKeys = columns.filter((col) => {
    if (col === xKey) return false
    const sample = rows[0]?.[col]
    return typeof sample === "number" || (!isNaN(Number(sample)) && sample !== null && sample !== "")
  })

  // 规范化数据（把字符串数字转为 number）
  const chartData = rows.slice(0, 100).map((row) => {
    const item: Record<string, any> = { [xKey]: row[xKey] }
    yKeys.forEach((k) => {
      item[k] = Number(row[k]) || 0
    })
    return item
  })

  // 饼图数据：用第一个 yKey 作为 value
  const pieData = chartData.map((d) => ({
    name: String(d[xKey] ?? ""),
    value: yKeys[0] ? (d[yKeys[0]] as number) : 0,
  }))

  const handleDownload = async () => {
    setIsExporting(true)
    try {
      if (chartContainerRef.current) {
        await downloadChartAsImage(chartContainerRef.current, `deciflow-chart-${Date.now()}.png`)
        showToast("图表已导出", "success")
      } else {
        downloadAsCSV(rows, `deciflow-data-${Date.now()}.csv`)
        showToast("数据已导出为 CSV", "success")
      }
    } catch {
      showToast("导出失败，请重试", "error")
    } finally {
      setIsExporting(false)
    }
  }

  const renderChart = () => {
    if (chartData.length === 0 || yKeys.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          暂无可绘制的数值数据
        </div>
      )
    }

    if (chartType === "pie") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number) => [formatNumber(value), '']}
            />
            <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
          </RePieChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: 0.5, fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: 0.5, fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number) => [formatNumber(value), '']}
            />
            {yKeys.slice(0, 4).map((key, i) => (
              <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )
    }

    // 默认 line/area
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {yKeys.slice(0, 4).map((key, i) => (
              <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.2} />
                <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: 0.5, fontSize: 11 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: 0.5, fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              color: "hsl(var(--foreground))",
            }}
          />
          {yKeys.slice(0, 4).map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#grad-${key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    )
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
            <h2 className="font-semibold text-foreground">数据图表</h2>
            <p className="text-sm text-muted-foreground">
              {recommendation ? `推荐：${recommendation.type}（${Math.round(recommendation.confidence * 100)}% 置信度）` : "自动生成"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 text-muted-foreground", chartType === "line" && "bg-background shadow-sm text-foreground")}
            onClick={() => setChartType("line")}
          >
            <LineChart className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 text-muted-foreground", chartType === "bar" && "bg-background shadow-sm text-foreground")}
            onClick={() => setChartType("bar")}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 text-muted-foreground", chartType === "pie" && "bg-background shadow-sm text-foreground")}
            onClick={() => setChartType("pie")}
          >
            <PieChart className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="p-5">
        <div className="h-[300px] w-full text-foreground" ref={chartContainerRef}>
          {renderChart()}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleDownload}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              导出中...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              导出图表
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
