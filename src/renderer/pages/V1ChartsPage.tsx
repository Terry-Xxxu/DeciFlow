import { useState } from "react"
import { PageLayout } from "../components/dashboard/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { EmptyState } from "../components/dashboard/empty-states"
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Plus,
  Download,
  Share2,
  Filter,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts"

const areaData = [
  { name: "1月", value: 4000, prev: 3200 },
  { name: "2月", value: 3000, prev: 2800 },
  { name: "3月", value: 5000, prev: 4100 },
  { name: "4月", value: 4500, prev: 3900 },
  { name: "5月", value: 6000, prev: 4800 },
  { name: "6月", value: 5500, prev: 5200 },
]

const barData = [
  { name: "直接访问", value: 4200 },
  { name: "搜索引擎", value: 3800 },
  { name: "社交媒体", value: 2900 },
  { name: "邮件营销", value: 2100 },
  { name: "联盟推广", value: 1800 },
]

const pieData = [
  { name: "移动端", value: 45 },
  { name: "桌面端", value: 35 },
  { name: "平板", value: 15 },
  { name: "其他", value: 5 },
]

// Premium color palette - more sophisticated and modern
const CHART_COLORS = {
  primary: "#6366f1",    // Indigo
  secondary: "#8b5cf6",  // Violet
  tertiary: "#06b6d4",   // Cyan
  quaternary: "#10b981", // Emerald
  accent: "#f59e0b",     // Amber
}

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981"]

const chartTemplates = [
  { icon: LineChart, title: "折线图", description: "展示趋势变化" },
  { icon: BarChart3, title: "柱状图", description: "对比数据差异" },
  { icon: PieChart, title: "饼图", description: "展示占比分布" },
  { icon: TrendingUp, title: "面积图", description: "强调累计趋势" },
]

interface ChartsPageProps {
  onNavigate?: (page: string) => void
}

export function V1ChartsPage({ onNavigate }: ChartsPageProps) {
  const [hasData] = useState(true) // Toggle to test empty state

  if (!hasData) {
    return (
      <PageLayout currentPage="charts" onNavigate={onNavigate}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              数据可视化
            </h1>
            <p className="text-sm text-muted-foreground">
              创建和管理你的数据图表
            </p>
          </div>
        </div>
        <EmptyState type="no-charts" />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            数据可视化
          </h1>
          <p className="text-sm text-muted-foreground">
            创建和管理你的数据图表
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            筛选
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            新建图表
          </Button>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {chartTemplates.map((template, index) => (
          <Card
            key={index}
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <template.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium text-foreground">{template.title}</div>
                <div className="text-xs text-muted-foreground">{template.description}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Area Chart */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">用户增长趋势</CardTitle>
              <CardDescription>月度活跃用户对比</CardDescription>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.tertiary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={CHART_COLORS.primary} 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="prev" 
                    stroke={CHART_COLORS.tertiary} 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorPrev)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.primary }} />
                <span className="text-sm text-muted-foreground">本期</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.tertiary }} />
                <span className="text-sm text-muted-foreground">上期</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">流量来源</CardTitle>
              <CardDescription>各渠道访问量分布</CardDescription>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={CHART_COLORS.primary} />
                      <stop offset="100%" stopColor={CHART_COLORS.secondary} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }}
                    width={80} 
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Bar dataKey="value" fill="url(#barGradient)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Redesigned for premium look */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">设备分布</CardTitle>
              <CardDescription>用户访问设备占比</CardDescription>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="h-56 w-56 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <defs>
                      {PIE_COLORS.map((color, index) => (
                        <linearGradient key={index} id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={1} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`url(#pieGradient${index})`}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                      itemStyle={{ color: "hsl(var(--muted-foreground))" }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend on the side */}
              <div className="flex flex-col gap-3">
                {pieData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: PIE_COLORS[index] }}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary - Premium design */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">数据概览</CardTitle>
            <CardDescription>关键指标汇总</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "24.5K", label: "总访问量", change: "+12.3%", positive: true },
                { value: "8.2K", label: "独立用户", change: "+8.1%", positive: true },
                { value: "3.2%", label: "转化率", change: "+0.5%", positive: true },
                { value: "4m 32s", label: "平均时长", change: "-0.8%", positive: false },
              ].map((stat, index) => (
                <div 
                  key={index} 
                  className="group relative overflow-hidden rounded-xl bg-secondary/50 p-4 transition-all hover:bg-secondary"
                >
                  <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary/5 transition-all group-hover:scale-150" />
                  <div className="relative">
                    <div className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                    <div className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      stat.positive 
                        ? "bg-emerald-500/10 text-emerald-500" 
                        : "bg-red-500/10 text-red-500"
                    }`}>
                      {stat.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
