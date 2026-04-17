/**
 * 图表编辑对话框
 * 支持创建和编辑图表配置
 */

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../v0-ui/Card"
import { Input } from "../v0-ui/Input"
import { Select } from "../v0-ui/Select"
import { Textarea } from "../v0-ui/Textarea"
import { Button } from "../v0-ui/Button"
import { Switch } from "../v0-ui/Switch"
import { Badge } from "../v0-ui/Badge"
import { ChartType, ChartConfig, AggregationType } from "../../types/chart"
import { useDatabase } from "../../stores/DatabaseStore"
import { useTheme } from "../../contexts/ThemeContext"
import { TableBrowser } from "./TableBrowser"
import {
  LineChart,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Filter,
  Grid3x3,
  X,
  Database,
} from "lucide-react"
import { cn } from "../../lib/utils"

interface ChartEditDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: ChartConfig) => void
  editChart?: ChartConfig
}

const chartTypeOptions = [
  { value: "line" as ChartType, label: "折线图", description: "展示趋势变化", icon: LineChart },
  { value: "bar" as ChartType, label: "柱状图", description: "对比数据差异", icon: BarChart3 },
  { value: "pie" as ChartType, label: "饼图", description: "展示占比分布", icon: PieChartIcon },
  { value: "area" as ChartType, label: "面积图", description: "强调累计趋势", icon: TrendingUp },
  { value: "funnel" as ChartType, label: "漏斗图", description: "展示转化流程", icon: Filter },
  { value: "heatmap" as ChartType, label: "热力图", description: "展示密度分布", icon: Grid3x3 },
]

const aggregationOptions = [
  { value: "sum" as AggregationType, label: "求和" },
  { value: "avg" as AggregationType, label: "平均值" },
  { value: "count" as AggregationType, label: "计数" },
  { value: "max" as AggregationType, label: "最大值" },
  { value: "min" as AggregationType, label: "最小值" },
]

const generateId = () => `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export function ChartEditDialog({ isOpen, onClose, onSave, editChart }: ChartEditDialogProps) {
  const { databases, getDatabaseById } = useDatabase()
  const { mode } = useTheme()
  const isEditing = !!editChart
  const isDark = mode === 'dark'

  // 表浏览器状态
  const [showTableBrowser, setShowTableBrowser] = useState(false)

  // 表单状态
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [chartType, setChartType] = useState<ChartType>("bar")
  const [databaseId, setDatabaseId] = useState("")
  const [tableName, setTableName] = useState("")
  const [query, setQuery] = useState("")
  const [xAxis, setXAxis] = useState("")
  const [yAxis, setYAxis] = useState("")
  const [groupBy, setGroupBy] = useState("")
  const [valueField, setValueField] = useState("")
  const [aggregation, setAggregation] = useState<AggregationType>("sum")
  const [showLegend, setShowLegend] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [smoothLine, setSmoothLine] = useState(false)
  const [innerRadius, setInnerRadius] = useState(50)

  // 初始化表单数据
  useEffect(() => {
    if (editChart) {
      setName(editChart.name)
      setDescription(editChart.description || "")
      setChartType(editChart.type)
      setDatabaseId(editChart.dataSource.databaseId)
      setTableName(editChart.dataSource.tableName)
      setQuery(editChart.dataSource.query || "")
      setXAxis(editChart.dimensions.xAxis)
      setYAxis(editChart.dimensions.yAxis || "")
      setGroupBy(editChart.dimensions.groupBy || "")
      setValueField(editChart.metrics.value)
      setAggregation(editChart.metrics.aggregation)
      setShowLegend(editChart.styling.showLegend)
      setShowGrid(editChart.styling.showGrid)
      setSmoothLine(editChart.styling.smoothLine || false)
      setInnerRadius(editChart.styling.innerRadius || 50)
    } else {
      setName("")
      setDescription("")
      setChartType("bar")
      setDatabaseId(databases[0]?.id || "")
      setTableName("")
      setQuery("")
      setXAxis("")
      setYAxis("")
      setGroupBy("")
      setValueField("")
      setAggregation("sum")
      setShowLegend(true)
      setShowGrid(true)
      setSmoothLine(false)
      setInnerRadius(50)
    }
  }, [editChart, isOpen, databases])

  // 数据源选项
  const databaseOptions = databases.map((db) => ({
    value: db.id,
    label: db.name,
  }))

  // 获取当前选择的数据库配置
  const selectedDatabase = getDatabaseById(databaseId)

  // 处理打开表浏览器
  const handleOpenTableBrowser = () => {
    if (!selectedDatabase?.connected) {
      // 数据库未连接，可以显示提示或阻止打开
      console.log("数据库未连接，请先连接数据库")
      return
    }
    setShowTableBrowser(true)
  }

  // 处理表选择
  const handleTableSelect = (selectedTableName: string, columns?: any[]) => {
    setTableName(selectedTableName)
    // 如果有列信息，可以自动填充 X 轴和数值字段
    if (columns && columns.length > 0) {
      // 尝试找到合适的 X 轴字段（通常是字符串或日期类型）
      const xField = columns.find((c) =>
        c.type?.toLowerCase().includes("char") ||
        c.type?.toLowerCase().includes("text") ||
        c.type?.toLowerCase().includes("date") ||
        c.type?.toLowerCase().includes("time")
      )
      if (xField && !xAxis) {
        setXAxis(xField.name)
      }

      // 尝试找到合适的数值字段
      const numField = columns.find((c) =>
        c.type?.toLowerCase().includes("int") ||
        c.type?.toLowerCase().includes("number") ||
        c.type?.toLowerCase().includes("decimal") ||
        c.type?.toLowerCase().includes("float") ||
        c.type?.toLowerCase().includes("double")
      )
      if (numField && !valueField) {
        setValueField(numField.name)
      }
    }
  }

  // 验证表单
  const isFormValid = name.trim() !== "" && tableName.trim() !== "" && xAxis.trim() !== "" && valueField.trim() !== ""

  const handleSave = () => {
    if (!isFormValid) return

    const config: ChartConfig = {
      id: editChart?.id || generateId(),
      name: name.trim(),
      description: description.trim() || undefined,
      type: chartType,
      dataSource: {
        databaseId,
        tableName: tableName.trim(),
        query: query.trim() || undefined,
      },
      dimensions: {
        xAxis: xAxis.trim(),
        yAxis: yAxis.trim() || undefined,
        groupBy: groupBy.trim() || undefined,
      },
      metrics: {
        value: valueField.trim(),
        aggregation,
      },
      styling: {
        showLegend,
        showGrid,
        smoothLine: chartType === "line" || chartType === "area" ? smoothLine : undefined,
        innerRadius: chartType === "pie" ? innerRadius : undefined,
        colors: editChart?.styling.colors || ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981"],
      },
      createdAt: editChart?.createdAt || Date.now(),
      updatedAt: Date.now(),
    }

    onSave(config)
    onClose()
  }

  // Section容器样式
  const sectionClass = cn(
    "rounded-xl border p-4",
    isDark
      ? "bg-white/5 border-white/10"
      : "bg-muted/30 border-gray-200"
  )

  // Section标题样式（白色）
  const headingClass = cn(
    "text-sm font-semibold mb-3",
    isDark ? "text-foreground" : "text-gray-900"
  )

  // 标签文字样式（灰色）
  const labelClass = isDark ? "text-muted-foreground" : "text-gray-600"

  // Switch标签样式（灰色）
  const switchLabelClass = isDark ? "text-muted-foreground" : "text-gray-700"

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 modal-backdrop-animate"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden modal-content-animate" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>{isEditing ? "编辑图表" : "新建图表"}</CardTitle>
          <CardDescription>配置图表的数据源、样式和显示选项</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto custom-scrollbar flex-1">
        {/* 基本信息 */}
        <div className={sectionClass}>
          <h3 className={headingClass}>基本信息</h3>
          <div className="space-y-3">
            <Input
              label={<span className={labelClass}>图表名称 <span className="text-destructive">*</span></span>}
              placeholder="输入图表名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Textarea
              label={<span className={labelClass}>图表描述</span>}
              placeholder="输入图表描述（可选）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* 图表类型选择 */}
        <div className={sectionClass}>
          <h3 className={headingClass}>图表类型</h3>
          <div className="grid grid-cols-3 gap-2">
            {chartTypeOptions.map((option, index) => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChartType(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all duration-200 hover-lift",
                    chartType === option.value
                      ? isDark
                        ? "border-primary bg-primary/20 text-primary shadow-sm"
                        : "border-primary bg-primary/10 text-primary shadow-sm"
                      : isDark
                        ? "border-white/10 hover:border-white/20 hover:bg-white/5 text-muted-foreground"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-100 text-gray-600"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    chartType === option.value ? "scale-110" : "group-hover:scale-110"
                  )} />
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 数据源配置 */}
        <div className={sectionClass}>
          <h3 className={headingClass}>数据源</h3>
          <div className="space-y-3">
            <div>
              <label className={cn("text-sm mb-1.5 block", labelClass)}>选择数据库</label>
              <Select
                options={databaseOptions}
                value={databaseId}
                onChange={setDatabaseId}
                placeholder="选择数据库"
              />
            </div>
            <div>
              <label className={cn("text-sm mb-1.5 block", labelClass)}>
                数据表 <span className="text-destructive">*</span>
              </label>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start gap-2 h-auto py-3",
                  !tableName && isDark && "text-muted-foreground",
                  !tableName && !isDark && "text-gray-500"
                )}
                onClick={handleOpenTableBrowser}
                disabled={!selectedDatabase?.connected}
              >
                <Database className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {tableName || (selectedDatabase?.connected ? "点击选择数据表" : "请先连接数据库")}
                </span>
              </Button>
              {tableName && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Database className="h-3 w-3" />
                    {tableName}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setTableName("")}
                  >
                    清除
                  </Button>
                </div>
              )}
              {!selectedDatabase?.connected && databaseId && (
                <p className={cn(
                  "mt-1.5 text-xs",
                  isDark ? "text-muted-foreground" : "text-gray-500"
                )}>
                  请先在数据源页面连接此数据库
                </p>
              )}
            </div>
            <Textarea
              label={<span className={labelClass}>自定义查询（可选）</span>}
              placeholder="SELECT * FROM table WHERE ..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* 坐标轴配置 */}
        <div className={sectionClass}>
          <h3 className={headingClass}>数据字段</h3>
          <div className="space-y-3">
            <Input
              label={<span className={labelClass}>X轴字段 <span className="text-destructive">*</span></span>}
              placeholder="例如：date, category, name"
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value)}
            />
            <Input
              label={<span className={labelClass}>Y轴字段（可选）</span>}
              placeholder="用于双轴图表"
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value)}
            />
            <Input
              label={<span className={labelClass}>分组字段（可选）</span>}
              placeholder="用于热力图等复杂图表"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={<span className={labelClass}>数值字段 <span className="text-destructive">*</span></span>}
                placeholder="例如：amount, count"
                value={valueField}
                onChange={(e) => setValueField(e.target.value)}
              />
              <div>
                <label className={cn("text-sm mb-1.5 block", labelClass)}>聚合方式</label>
                <Select
                  options={aggregationOptions}
                  value={aggregation}
                  onChange={setAggregation}
                  placeholder="选择聚合方式"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 样式配置 */}
        <div className={sectionClass}>
          <h3 className={headingClass}>样式配置</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1">
              <span className={cn("text-sm", switchLabelClass)}>显示图例</span>
              <Switch checked={showLegend} onCheckedChange={setShowLegend} />
            </div>
            <div className="flex items-center justify-between py-1">
              <span className={cn("text-sm", switchLabelClass)}>显示网格</span>
              <Switch checked={showGrid} onCheckedChange={setShowGrid} />
            </div>

            {/* 折线图/面积图特有选项 */}
            {(chartType === "line" || chartType === "area") && (
              <div className="flex items-center justify-between py-1">
                <span className={cn("text-sm", switchLabelClass)}>平滑曲线</span>
                <Switch checked={smoothLine} onCheckedChange={setSmoothLine} />
              </div>
            )}

            {/* 饼图特有选项 */}
            {chartType === "pie" && (
              <Input
                label={<span className={labelClass}>内半径</span>}
                type="number"
                min={0}
                max={80}
                value={innerRadius}
                onChange={(e) => setInnerRadius(Number(e.target.value))}
              />
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            取消
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid} className="gap-2">
            {isEditing ? "保存" : "创建"}
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* 表浏览器 */}
    {selectedDatabase && (
      <TableBrowser
        isOpen={showTableBrowser}
        onClose={() => setShowTableBrowser(false)}
        database={selectedDatabase}
        onSelect={handleTableSelect}
        selectedTable={tableName}
      />
    )}
  </div>
  )
}
