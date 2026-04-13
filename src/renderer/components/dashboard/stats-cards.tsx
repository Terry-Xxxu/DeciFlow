import { Users, TrendingUp, Activity, DollarSign } from "lucide-react"
import { cn } from "../../lib/utils"

const stats = [
  {
    label: "日活用户",
    value: "24,521",
    change: "+12.5%",
    trend: "up",
    icon: Users,
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
  },
  {
    label: "7日留存率",
    value: "68.2%",
    change: "+3.2%",
    trend: "up",
    icon: TrendingUp,
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
  },
  {
    label: "转化率",
    value: "4.8%",
    change: "+0.8%",
    trend: "up",
    icon: Activity,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
  {
    label: "收入 (本月)",
    value: "¥128.5K",
    change: "+18.2%",
    trend: "up",
    icon: DollarSign,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
]

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
        >
          {/* Subtle gradient background */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-transparent to-muted/30 opacity-0 transition-opacity group-hover:opacity-100" />
          
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
            </div>
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", stat.bgColor)}>
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </div>
          </div>
          
          <div className="mt-3 flex items-center gap-1.5">
            <span className={cn(
              "text-sm font-medium",
              stat.trend === "up" ? "text-emerald-500" : "text-red-500"
            )}>
              {stat.change}
            </span>
            <span className="text-sm text-muted-foreground">vs 上周</span>
          </div>
        </div>
      ))}
    </div>
  )
}
