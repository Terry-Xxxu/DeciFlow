/**
 * 图表类型定义
 */
export type ChartType =
  | "line"      // 折线图
  | "bar"       // 柱状图
  | "pie"       // 饼图
  | "area"      // 面积图
  | "funnel"    // 漏斗图
  | "heatmap"   // 热力图

/**
 * 聚合方式
 */
export type AggregationType = "sum" | "avg" | "count" | "max" | "min"

/**
 * 图表配置
 */
export interface ChartConfig {
  id: string
  name: string                    // 图表标题
  description?: string            // 图表描述
  type: ChartType                 // 图表类型
  dataSource: {
    databaseId: string            // 数据源ID
    tableName: string             // 表名
    query?: string                // 自定义SQL查询
  }
  dimensions: {
    xAxis: string                 // X轴字段
    yAxis?: string                // Y轴字段 (用于分组)
    groupBy?: string              // 分组字段
  }
  metrics: {
    value: string                 // 数值字段
    aggregation: AggregationType  // 聚合方式
  }
  styling: {
    colors?: string[]             // 自定义颜色
    showLegend: boolean           // 是否显示图例
    showGrid: boolean             // 是否显示网格
    smoothLine?: boolean          // 折线图平滑 (仅折线图)
    innerRadius?: number          // 饼图内半径 (仅饼图)
  }
  createdAt: number
  updatedAt: number
}

/**
 * 图表数据
 */
export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color?: string
  }[]
}

/**
 * 图表类型选项
 */
export interface ChartTypeOption {
  value: ChartType
  label: string
  description: string
  icon: string
}
