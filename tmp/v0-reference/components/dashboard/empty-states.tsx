"use client"

import { Button } from "@/components/ui/button"
import {
  Database,
  Search,
  BarChart3,
  Sparkles,
  Plus,
  ArrowRight,
  FileText,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  type: "no-data" | "no-charts" | "no-queries" | "no-insights" | "no-datasource"
  onAction?: () => void
  className?: string
}

const emptyStates = {
  "no-data": {
    icon: Database,
    title: "尚未连接数据源",
    description: "连接你的第一个数据源，开始探索数据洞察",
    action: "连接数据源",
    secondaryAction: "查看支持的数据源",
  },
  "no-charts": {
    icon: BarChart3,
    title: "还没有图表",
    description: "通过自然语言查询或手动创建你的第一个数据可视化",
    action: "创建图表",
    secondaryAction: "使用模板",
  },
  "no-queries": {
    icon: Search,
    title: "开始你的第一次查询",
    description: "用自然语言描述你想了解的数据，AI 会帮你生成结果",
    action: "开始查询",
    secondaryAction: "查看示例",
  },
  "no-insights": {
    icon: Sparkles,
    title: "等待数据分析",
    description: "连接数据源后，AI 会自动分析并提供智能洞察",
    action: "连接数据",
    secondaryAction: "了解更多",
  },
  "no-datasource": {
    icon: FileText,
    title: "添加数据源",
    description: "支持 PostgreSQL、MySQL、ClickHouse 等多种数据库",
    action: "添加数据源",
    secondaryAction: "导入文件",
  },
}

export function EmptyState({ type, onAction, className }: EmptyStateProps) {
  const state = emptyStates[type]
  const Icon = state.icon

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center",
        className
      )}
    >
      {/* Icon with gradient background */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 ring-1 ring-white/10">
          <Icon className="h-7 w-7 text-primary" />
        </div>
      </div>

      {/* Content */}
      <h3 className="mb-2 text-lg font-semibold text-foreground">{state.title}</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">{state.description}</p>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={onAction} className="gap-2">
          <Plus className="h-4 w-4" />
          {state.action}
        </Button>
        <Button variant="ghost" className="gap-2 text-muted-foreground">
          {state.secondaryAction}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Premium empty state with more visual impact
export function PremiumEmptyState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/30",
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/5 blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative flex flex-col items-center justify-center px-8 py-20">
        {/* Animated icon */}
        <div className="relative mb-8">
          {/* Pulse rings */}
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" style={{ animationDuration: "3s" }} />
          <div className="absolute inset-2 animate-ping rounded-full bg-primary/10" style={{ animationDuration: "3s", animationDelay: "0.5s" }} />
          
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
            <Zap className="h-9 w-9 text-white" />
          </div>
        </div>

        {/* Content */}
        <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground">
          开启 AI 数据分析之旅
        </h2>
        <p className="mb-8 max-w-md text-center text-muted-foreground">
          连接你的数据源，用自然语言与数据对话。AI 将帮助你发现隐藏的趋势和洞察。
        </p>

        {/* Feature pills */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {["自然语言查询", "智能可视化", "趋势预测", "异常检测"].map((feature) => (
            <span
              key={feature}
              className="rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-foreground"
            >
              {feature}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-4">
          <Button size="lg" className="gap-2 shadow-lg shadow-primary/25">
            <Database className="h-5 w-5" />
            连接数据源
          </Button>
          <Button size="lg" variant="outline" className="gap-2">
            查看演示
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
