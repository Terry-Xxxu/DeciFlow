"use client"

import { PageLayout } from "@/components/dashboard/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Database,
  Plus,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/dashboard/empty-states"

const dataSources = [
  {
    id: 1,
    name: "生产数据库",
    type: "PostgreSQL",
    status: "connected",
    lastSync: "5 分钟前",
    tables: 24,
    records: "1.2M",
    icon: "🐘",
  },
  {
    id: 2,
    name: "用户行为数据",
    type: "MongoDB",
    status: "connected",
    lastSync: "10 分钟前",
    tables: 8,
    records: "5.6M",
    icon: "🍃",
  },
  {
    id: 3,
    name: "营销数据",
    type: "Google Analytics",
    status: "syncing",
    lastSync: "同步中...",
    tables: 12,
    records: "890K",
    icon: "📊",
  },
  {
    id: 4,
    name: "财务报表",
    type: "Excel/CSV",
    status: "error",
    lastSync: "1 小时前",
    tables: 5,
    records: "12K",
    icon: "📑",
  },
]

const availableConnectors = [
  { name: "PostgreSQL", icon: "🐘", category: "数据库" },
  { name: "MySQL", icon: "🐬", category: "数据库" },
  { name: "MongoDB", icon: "🍃", category: "数据库" },
  { name: "Google Analytics", icon: "📊", category: "分析平台" },
  { name: "Mixpanel", icon: "📈", category: "分析平台" },
  { name: "Snowflake", icon: "❄️", category: "数据仓库" },
  { name: "BigQuery", icon: "🔍", category: "数据仓库" },
  { name: "Excel/CSV", icon: "📑", category: "文件" },
]

function StatusBadge({ status }: { status: string }) {
  const config = {
    connected: { label: "已连接", variant: "default" as const, icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    syncing: { label: "同步中", variant: "secondary" as const, icon: RefreshCw, className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    error: { label: "连接错误", variant: "destructive" as const, icon: AlertCircle, className: "bg-red-500/10 text-red-500 border-red-500/20" },
  }[status] || { label: status, variant: "secondary" as const, icon: Clock, className: "" }

  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={`gap-1 ${config.className}`}>
      <Icon className={`h-3 w-3 ${status === "syncing" ? "animate-spin" : ""}`} />
      {config.label}
    </Badge>
  )
}

export default function DataSourcesPage() {
  const hasDataSources = true // Toggle to test empty state

  if (!hasDataSources) {
    return (
      <PageLayout>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              数据源管理
            </h1>
            <p className="text-sm text-muted-foreground">
              连接和管理你的数据源
            </p>
          </div>
        </div>
        <EmptyState type="no-datasource" />
        
        {/* Available Connectors */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">可用连接器</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {availableConnectors.map((connector) => (
              <Card
                key={connector.name}
                className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
              >
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <span className="text-2xl">{connector.icon}</span>
                  <span className="text-sm font-medium text-foreground">{connector.name}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            数据源管理
          </h1>
          <p className="text-sm text-muted-foreground">
            连接和管理你的数据源
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          添加数据源
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">4</div>
            <div className="text-sm text-muted-foreground">数据源</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">49</div>
            <div className="text-sm text-muted-foreground">数据表</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">7.7M</div>
            <div className="text-sm text-muted-foreground">总记录数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-500">3</div>
            <div className="text-sm text-muted-foreground">正常连接</div>
          </CardContent>
        </Card>
      </div>

      {/* Connected Sources */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">已连接的数据源</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {dataSources.map((source) => (
            <Card key={source.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-xl">
                      {source.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{source.name}</h3>
                      <p className="text-sm text-muted-foreground">{source.type}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        同步数据
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        设置
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <StatusBadge status={source.status} />
                  <span className="text-xs text-muted-foreground">
                    上次同步: {source.lastSync}
                  </span>
                </div>
                <div className="mt-4 flex gap-4 border-t border-border pt-4 text-center">
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-foreground">{source.tables}</div>
                    <div className="text-xs text-muted-foreground">数据表</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-foreground">{source.records}</div>
                    <div className="text-xs text-muted-foreground">记录数</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Available Connectors */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">可用连接器</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {availableConnectors.map((connector) => (
            <Card
              key={connector.name}
              className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            >
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                <span className="text-2xl">{connector.icon}</span>
                <span className="text-sm font-medium text-foreground">{connector.name}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}
