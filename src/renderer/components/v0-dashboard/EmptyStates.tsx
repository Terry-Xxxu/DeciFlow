
import { Button } from "../v0-ui/Button"
import { Database, Sparkles, FileText, Clock } from "lucide-react"
import { cn } from "../../lib/utils"
import { showToast } from "../../lib/download"

interface EmptyStateProps {
  type: "no-datasource" | "no-insights" | "no-charts" | "no-history"
  onAction?: () => void
}

const emptyStates = {
  "no-datasource": {
    icon: Database,
    title: "连接数据源",
    description: "添加您的第一个数据源，开始 AI 数据分析之旅",
    action: "添加数据源",
    gradient: "from-blue-500 to-cyan-500",
  },
  "no-insights": {
    icon: Sparkles,
    title: "暂无洞察",
    description: "完成首次查询后，AI 将自动生成数据洞察",
    action: "开始查询",
    gradient: "from-primary to-accent",
  },
  "no-charts": {
    icon: FileText,
    title: "暂无图表",
    description: "创建您的第一个数据可视化图表",
    action: "创建图表",
    gradient: "from-chart-1 to-chart-2",
  },
  "no-history": {
    icon: Clock,
    title: "暂无历史记录",
    description: "您的查询历史将显示在这里",
    action: null,
    gradient: "from-muted-foreground to-muted",
  },
}

export function EmptyStates({ type, onAction }: EmptyStateProps) {
  const state = emptyStates[type]

  const handleAction = () => {
    if (onAction) {
      onAction()
    } else {
      // Default behavior based on type
      switch (type) {
        case "no-datasource":
          showToast("正在打开数据源配置...", "info")
          break
        case "no-insights":
          showToast("正在开始新的查询...", "info")
          break
        case "no-charts":
          showToast("正在创建图表...", "info")
          break
        default:
          break
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      {/* Icon - simple without background */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-card border border-border">
        <state.icon className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Content */}
      <h3 className="mb-2 text-xl font-semibold text-foreground">
        {state.title}
      </h3>
      <p className="mb-6 max-w-sm text-muted-foreground">
        {state.description}
      </p>

      {/* Action Button */}
      {state.action && (
        <Button className="gap-2" onClick={handleAction}>
          {state.action}
        </Button>
      )}
    </div>
  )
}
