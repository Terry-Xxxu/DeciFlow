"use client"

import { Button } from "@/components/ui/button"
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

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

export function AIInsights() {
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
        <Button variant="ghost" size="sm" className="gap-2 text-primary">
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

              <Button variant="ghost" size="sm" className={cn("mt-2 gap-2 px-0", insight.color)}>
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
