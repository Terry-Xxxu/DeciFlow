
import { Button } from "../v0-ui/Button"
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ArrowRight, Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

interface Insight {
  title: string
  content: string
  type: "trend" | "warning" | "suggestion"
}

interface AIInsightsProps {
  hasData?: boolean
  insights?: Insight[]
  isLoading?: boolean
}

const typeConfig = {
  trend: {
    icon: TrendingUp,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  suggestion: {
    icon: Lightbulb,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
}

export function AIInsights({ hasData = false, insights = [], isLoading = false }: AIInsightsProps) {
  // 还没有数据时显示引导
  if (!hasData && !isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted border border-border">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">AI 智能洞察</h2>
            <p className="text-sm text-muted-foreground">完成首次查询后，AI 将自动生成数据洞察</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 border border-border">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            提交您的第一个查询，AI 将分析数据并为您生成智能洞察
          </p>
        </div>
      </div>
    )
  }

  // AI 正在分析中
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">AI 智能洞察</h2>
            <p className="text-sm text-muted-foreground">正在分析数据...</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-4/5 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 有洞察数据
  if (insights.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">AI 智能洞察</h2>
            <p className="text-sm text-muted-foreground">基于您的数据自动生成</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {insights.map((insight, index) => {
          const config = typeConfig[insight.type] || typeConfig.suggestion
          const Icon = config.icon
          return (
            <div
              key={index}
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:shadow-lg",
                config.borderColor
              )}
            >
              <div className={cn("absolute inset-0 -z-10 opacity-30 transition-opacity group-hover:opacity-50", config.bgColor)} />
              <div className="space-y-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", config.bgColor)}>
                  <Icon className={cn("h-5 w-5", config.color)} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-foreground">{insight.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{insight.content}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
