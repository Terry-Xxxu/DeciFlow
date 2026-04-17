
import { Activity, Hash, Clock, Table } from "lucide-react"

interface QueryResult {
  columns: string[]
  rows: Record<string, any>[]
  rowCount: number
  duration: number
  sql: string
}

interface StatsCardsProps {
  result: QueryResult
}

export function StatsCards({ result }: StatsCardsProps) {
  const { columns, rows, rowCount, duration } = result

  // 找第一个数字列的合计/最大值
  const numericCols = columns.filter((col) => {
    const sample = rows[0]?.[col]
    return typeof sample === "number" || (!isNaN(Number(sample)) && sample !== null && sample !== "")
  })

  const firstNumCol = numericCols[0]
  const sum = firstNumCol
    ? rows.reduce((acc, row) => acc + (Number(row[firstNumCol]) || 0), 0)
    : null

  const stats = [
    {
      label: "返回行数",
      value: rowCount.toLocaleString(),
      icon: Hash,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      label: "字段数量",
      value: columns.length.toString(),
      icon: Table,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      label: "查询耗时",
      value: `${duration}ms`,
      icon: Clock,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    ...(firstNumCol && sum !== null
      ? [
          {
            label: `合计 ${firstNumCol}`,
            value: sum > 1000000
              ? `${(sum / 1000000).toFixed(1)}M`
              : sum > 1000
              ? `${(sum / 1000).toFixed(1)}K`
              : sum.toLocaleString(),
            icon: Activity,
            color: "text-chart-4",
            bgColor: "bg-chart-4/10",
          },
        ]
      : []),
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-transparent to-muted/30 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
