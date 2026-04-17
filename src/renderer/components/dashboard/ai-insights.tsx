import { Button } from "../ui/button"
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ArrowRight } from "lucide-react"
import { cn } from "../../lib/utils"

const insights = [
  {
    type: "trend",
    icon: TrendingUp,
    title: "用户增长趋势良好",
    description: "过去30天新用户增长率达到23%，主要来源于应用商店推荐和社交媒体分享",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  {
    type: "warning",
    icon: AlertTriangle,
    title: "7日留存率下降预警",
    description: "iOS端7日留存率较上周下降2.1%，建议检查最近的版本更新是否影响用户体验",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  {
    type: "suggestion",
    icon: Lightbulb,
    title: "优化建议",
    description: "数据显示周末活跃度较低，可考虑在周末推送个性化内容提升用户参与度",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
]

interface AIInsightsProps {
  hasData?: boolean
}

export function AIInsights({ hasData = false }: AIInsightsProps) {
  const handleDeepAnalysis = (insight: typeof insights[0]) => {
    // Show detailed analysis modal or navigate to detailed view
    console.log("Deep analysis for:", insight.title)
    // For now, show a toast - this can be enhanced to open a modal
    alert(`正在深入分析: ${insight.title}\n\n${insight.description}\n\n详细分析功能即将推出...`)
  }

  const handleViewAll = () => {
    console.log("View all insights")
    alert("所有洞察记录功能即将推出...")
  }

  // Show empty state when no data
  if (!hasData) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted border border-border">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI 智能洞察</h2>
              <p className="text-sm text-muted-foreground">完成首次查询后，AI 将自动生成数据洞察</p>
            </div>
          </div>
        </div>

        {/* Empty State */}
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

  return (
    <div className="space-y-4">
      {/* Header */}
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
        <Button variant="ghost" size="sm" className="gap-2 text-primary" onClick={handleViewAll}>
          查看全部
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Insights Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:shadow-lg",
              insight.borderColor
            )}
          >
            {/* Gradient overlay */}
            <div className={cn(
              "absolute inset-0 -z-10 opacity-30 transition-opacity group-hover:opacity-50",
              insight.bgColor
            )} />

            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", insight.bgColor)}>
                  <insight.icon className={cn("h-5 w-5", insight.color)} />
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  刚刚
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-semibold text-foreground">{insight.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {insight.description}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className={cn("mt-2 gap-2 px-0", insight.color)}
                onClick={() => handleDeepAnalysis(insight)}
              >
                深入分析
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
