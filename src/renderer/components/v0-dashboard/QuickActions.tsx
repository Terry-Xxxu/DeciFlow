
import { cn } from "../../lib/utils"
import { Users, TrendingUp, Repeat, DollarSign, ArrowRight } from "lucide-react"
import { showToast } from "../../lib/download"

const actions = [
  {
    icon: Users,
    label: "留存分析",
    description: "分析用户留存情况",
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
    hoverBg: "hover:bg-chart-1/15",
  },
  {
    icon: TrendingUp,
    label: "增长趋势",
    description: "查看用户增长数据",
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
    hoverBg: "hover:bg-chart-3/15",
  },
  {
    icon: Repeat,
    label: "转化漏斗",
    description: "分析转化率",
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
    hoverBg: "hover:bg-chart-2/15",
  },
  {
    icon: DollarSign,
    label: "收入分析",
    description: "查看收入数据",
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
    hoverBg: "hover:bg-chart-4/15",
  },
]

export function QuickActions() {
  const handleAction = (actionName: string) => {
    showToast(`正在打开: ${actionName}`, "info")
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">快捷入口</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleAction(action.label)}
            className={cn(
              "group relative flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-transparent hover:shadow-lg",
              action.hoverBg
            )}
          >
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", action.bgColor)}>
              <action.icon className={cn("h-5 w-5", action.color)} />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>
            <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  )
}
