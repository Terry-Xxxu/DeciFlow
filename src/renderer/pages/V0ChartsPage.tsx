import { useState, useEffect, useRef } from "react"
import { PageLayout } from "../components/v0-layout/PageLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/v0-ui/Card"
import { Button } from "../components/v0-ui/Button"
import { EmptyStates } from "../components/v0-dashboard/EmptyStates"
import { ChartEditDialog } from "../components/v0-dashboard/ChartEditDialog"
import { AlertDialog } from "../components/Modal"
import { showToast } from "../lib/download"
import { useChart } from "../stores/ChartStore"
import { useDatabase } from "../stores/DatabaseStore"
import { ChartConfig, ChartType } from "../types/chart"
import html2canvas from "html2canvas"
import {
  BarChart3,
  LineChart,
  PieChart as PieChartIcon,
  TrendingUp,
  Plus,
  Download,
  Edit,
  Filter,
  Trash2,
  Funnel,
  Grid3x3,
  RefreshCw,
  Database,
  AlertTriangle,
} from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  FunnelChart,
  Funnel as FunnelChartType,
  LabelList,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts"
import { cn } from "../lib/utils"

// 图表类型到图标的映射
const chartTypeIcons: Record<ChartType, React.ComponentType<{ className?: string }>> = {
  line: LineChart,
  bar: BarChart3,
  pie: PieChartIcon,
  area: TrendingUp,
  funnel: Funnel,
  heatmap: Grid3x3,
}

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981"]

// 根据图表配置生成 SQL
function buildChartSQL(config: ChartConfig): string {
  if (config.dataSource.query) return config.dataSource.query
  const { tableName } = config.dataSource
  const xAxis = config.dimensions.xAxis
  const { value, aggregation } = config.metrics
  const aggFn = aggregation === 'count_distinct' ? `COUNT(DISTINCT ${value})` : `${aggregation}(${value})`
  return `SELECT ${xAxis} AS name, ${aggFn} AS value FROM ${tableName} GROUP BY ${xAxis} ORDER BY value DESC LIMIT 100`
}

// 图表渲染组件
function ChartRenderer({ config }: { config: ChartConfig }) {
  const { databases } = useDatabase()
  const [chartData, setChartData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorType, setErrorType] = useState<'browser' | 'no_db' | 'no_data' | 'query_error' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)

  // 监听深色模式变化
  useEffect(() => {
    const checkDarkMode = () => setIsDarkMode(document.documentElement.classList.contains('dark'))
    checkDarkMode()
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    loadData()
  }, [config.id, config.updatedAt])

  const loadData = async () => {
    setIsLoading(true)
    setErrorType(null)

    if (!window.electronAPI) {
      setErrorType('browser')
      setIsLoading(false)
      return
    }

    const db = databases.find(d => d.id === config.dataSource.databaseId && d.connected)
    if (!db) {
      setErrorType('no_db')
      setIsLoading(false)
      return
    }

    try {
      const sql = buildChartSQL(config)
      const result = await window.electronAPI.database.query(db, sql)
      // db:query 返回 { success, data: { columns, rows, ... } }，直接 query 返回 { columns, rows, ... }
      const rows = result.rows ?? result.data?.rows
      if (!rows || rows.length === 0) {
        setErrorType('no_data')
      } else {
        // 将查询结果转换为 recharts 格式，字段名取自实际列名
        const xKey = config.dimensions.xAxis
        const vKey = config.metrics.value
        const transformed = rows.map((row: any) => ({
          name: String(row[xKey] ?? row['name'] ?? Object.values(row)[0] ?? ''),
          value: Number(row[vKey] ?? row['value'] ?? Object.values(row)[1] ?? 0),
          ...row,
        }))
        setChartData(transformed)
      }
    } catch (err: any) {
      setErrorType('query_error')
      setErrorMsg(err?.message || '查询失败')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />
          加载数据中...
        </div>
      </div>
    )
  }

  if (errorType === 'browser') {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2 text-center px-4">
        <Database className="h-7 w-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">请在 Electron 应用中运行以加载真实数据</p>
      </div>
    )
  }

  if (errorType === 'no_db') {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2 text-center px-4">
        <Database className="h-7 w-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">数据库未连接，请先在数据源页面连接数据库</p>
      </div>
    )
  }

  if (errorType === 'no_data') {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2 text-center px-4">
        <BarChart3 className="h-7 w-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">该表暂无数据</p>
      </div>
    )
  }

  if (errorType === 'query_error') {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2 text-center px-4">
        <AlertTriangle className="h-7 w-7 text-amber-500" />
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
        <button onClick={loadData} className="text-xs text-primary hover:underline">重试</button>
      </div>
    )
  }

  const data = chartData

  const tooltipStyle = {
    backgroundColor: isDarkMode ? "#1a1a2e" : "#ffffff",
    border: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
    borderRadius: "12px",
    boxShadow: isDarkMode ? "0 4px 12px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.15)",
  }

  const labelStyle = { color: isDarkMode ? "#f5f5f5" : "#0f172a", fontWeight: 600 }
  const itemStyle = { color: isDarkMode ? "#a1a1aa" : "#64748b" }

  // 折线图
  if (config.type === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`color-${config.id}-1`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.2} />
              <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} />
          {config.styling.showLegend && <Legend />}
          <Area
            type={config.styling.smoothLine ? "monotone" : "linear"}
            dataKey="value"
            stroke={COLORS[0]}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#color-${config.id}-1)`}
            name="数值"
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  // 面积图
  if (config.type === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`color-${config.id}-1`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id={`color-${config.id}-2`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS[1]} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} />
          {config.styling.showLegend && <Legend />}
          <Area type={config.styling.smoothLine ? "monotone" : "linear"} dataKey="value" stroke={COLORS[0]} strokeWidth={2} fill={`url(#color-${config.id}-1)`} name="当前" />
          <Area type={config.styling.smoothLine ? "monotone" : "linear"} dataKey="prev" stroke={COLORS[1]} strokeWidth={2} fill={`url(#color-${config.id}-2)`} name="同期" />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  // 柱状图
  if (config.type === "bar") {
    return (
      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} formatter={(value: number) => [value.toLocaleString(), "数值"]} />
          <Bar dataKey="value" fill={COLORS[0]} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // 饼图
  if (config.type === "pie") {
    return (
      <>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={config.styling.innerRadius || 0}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} formatter={(value: number) => [`${value}%`, "占比"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {config.styling.showLegend && (
          <div className="mt-2 flex items-center justify-center gap-4">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        )}
      </>
    )
  }

  // 漏斗图
  if (config.type === "funnel") {
    return (
      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
        <FunnelChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <FunnelChartType dataKey="value" isAnimationActive stroke={COLORS[0]} fill={COLORS[0]}>
            <LabelList position="center" fill="#fff" stroke="none" dataKey="name" />
          </FunnelChartType>
          <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} />
        </FunnelChart>
      </ResponsiveContainer>
    )
  }

  // 热力图
  if (config.type === "heatmap") {
    const getColorByValue = (value: number) => {
      if (value > 200) return COLORS[0]
      if (value > 150) return COLORS[1]
      if (value > 100) return COLORS[2]
      return COLORS[3]
    }

    return (
      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
        <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
          <XAxis dataKey="x" axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }} />
          <YAxis dataKey="y" axisLine={false} tickLine={false} tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }} />
          <ZAxis dataKey="value" range={[100, 500]} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter fill={COLORS[0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColorByValue(entry.value)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  return <div className="flex items-center justify-center h-full text-muted-foreground">暂不支持此图表类型</div>
}

const chartTypeLabels: Record<ChartType, string> = {
  line: '折线图',
  bar: '柱状图',
  pie: '饼图',
  area: '面积图',
  funnel: '漏斗图',
  heatmap: '热力图',
}

interface V0Props {
  onNavigate?: (page: string) => void
}

export function V0ChartsPage({ onNavigate }: V0Props) {
  const { charts, addChart, updateChart, removeChart } = useChart()
  const { databases } = useDatabase()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingChart, setEditingChart] = useState<ChartConfig | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [chartToDelete, setChartToDelete] = useState<ChartConfig | undefined>()
  const [filterType, setFilterType] = useState<ChartType | 'all'>('all')
  const [showFilter, setShowFilter] = useState(false)

  // 存储每个图表卡片的ref
  const chartRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const handleDownload = async (chartId: string, chartName: string) => {
    const chartElement = chartRefs.current.get(chartId)
    if (!chartElement) {
      showToast("无法找到图表元素", "error")
      return
    }

    try {
      showToast(`正在导出 ${chartName}...`, "info")

      const canvas = await html2canvas(chartElement, {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1a1a2e' : '#ffffff',
        scale: 2,
        logging: false,
      })

      const link = document.createElement('a')
      link.download = `${chartName}-${new Date().toISOString().slice(0, 10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      showToast(`${chartName} 已导出`, "success")
    } catch (error) {
      console.error('Export failed:', error)
      showToast("导出失败，请重试", "error")
    }
  }

  const handleCreateChart = () => {
    setEditingChart(undefined)
    setEditDialogOpen(true)
  }

  const handleEditChart = (chart: ChartConfig) => {
    setEditingChart(chart)
    setEditDialogOpen(true)
  }

  const handleDeleteChart = (chart: ChartConfig) => {
    setChartToDelete(chart)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteChart = () => {
    if (chartToDelete) {
      removeChart(chartToDelete.id)
      setChartToDelete(undefined)
      setDeleteDialogOpen(false)
    }
  }

  const handleSaveChart = (config: ChartConfig) => {
    if (editingChart) {
      updateChart(config.id, config)
    } else {
      addChart(config)
    }
  }

  // 按类型筛选后的图表列表
  const filteredCharts = filterType === 'all' ? charts : charts.filter(c => c.type === filterType)

  // 当没有数据源时显示空状态
  if (databases.length === 0) {
    return (
      <PageLayout activeItem="charts" onNavigate={onNavigate}>
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
        <EmptyStates type="no-datasource" onAction={() => onNavigate?.("datasources")} />
      </PageLayout>
    )
  }

  return (
    <PageLayout activeItem="charts" onNavigate={onNavigate}>
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
          <Button
            variant={showFilter ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilter(v => !v)}
          >
            <Filter className="mr-2 h-4 w-4" />
            筛选{filterType !== 'all' ? `：${chartTypeLabels[filterType]}` : ''}
          </Button>
          <Button size="sm" onClick={handleCreateChart}>
            <Plus className="mr-2 h-4 w-4" />
            新建图表
          </Button>
        </div>
      </div>

      {/* 图表类型筛选器 */}
      {showFilter && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground mr-1">图表类型：</span>
          {(['all', ...Object.keys(chartTypeLabels)] as Array<'all' | ChartType>).map(type => {
            const Icon = type !== 'all' ? chartTypeIcons[type] : null
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                  filterType === type
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                )}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {type === 'all' ? '全部' : chartTypeLabels[type]}
              </button>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {charts.length === 0 && <EmptyStates type="no-charts" onAction={handleCreateChart} />}

      {/* 筛选结果为空 */}
      {charts.length > 0 && filteredCharts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Filter className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">没有 {chartTypeLabels[filterType as ChartType]} 类型的图表</p>
          <button onClick={() => setFilterType('all')} className="mt-2 text-xs text-primary hover:underline">
            清除筛选
          </button>
        </div>
      )}

      {/* Charts Grid */}
      {filteredCharts.length > 0 && <div className="grid gap-6 lg:grid-cols-2">
        {filteredCharts.map((chart) => {
          const ChartIcon = chartTypeIcons[chart.type]
          return (
            <Card
              key={chart.id}
              className="overflow-hidden"
              ref={(el) => {
                if (el) chartRefs.current.set(chart.id, el)
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-1.5">
                    <ChartIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{chart.name}</CardTitle>
                    {chart.description && (
                      <CardDescription>{chart.description}</CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditChart(chart)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(chart.id, chart.name)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteChart(chart)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ChartRenderer config={chart} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>}

      {/* Edit Dialog */}
      <ChartEditDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleSaveChart}
        editChart={editingChart}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="删除图表"
        message={`确定要删除图表 "${chartToDelete?.name}" 吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDeleteChart}
        variant="error"
      />
    </PageLayout>
  )
}
