/**
 * ChartDisplay - 图表展示组件（支持双模式）
 * 支持多种图表类型，自动适配数据
 */

import React, { useState, useMemo, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { formatNumber } from '../../utils/format'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'

export type ChartType = 'line' | 'bar' | 'pie' | 'area'

interface ChartData {
  name: string
  value: number
  [key: string]: any
}

interface ChartDisplayProps {
  data: any[]
  chartType?: ChartType
  title?: string
  color?: string
  onChartTypeChange?: (type: ChartType) => void
}

// 图表配色方案
const COLORS = [
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#10B981', // green
  '#F59E0B', // orange
  '#EF4444', // red
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
]

/**
 * 推荐图表类型
 */
export function recommendChartType(data: any[]): ChartType {
  if (!data || data.length === 0) return 'bar'

  // 检查是否有时间序列数据
  const hasTimeField = data.some(row => {
    const keys = Object.keys(row)
    return keys.some(key =>
      key.toLowerCase().includes('date') ||
      key.toLowerCase().includes('time') ||
      key.toLowerCase().includes('day') ||
      key.toLowerCase().includes('month')
    )
  })

  if (hasTimeField && data.length > 5) {
    return 'line' // 时间序列用折线图
  }

  // 检查是否适合饼图（少数据，单一维度）
  if (data.length <= 8 && Object.keys(data[0]).length <= 2) {
    return 'pie'
  }

  // 默认柱状图
  return 'bar'
}

/**
 * 转换数据为图表格式
 */
function transformDataToChart(data: any[]): ChartData[] {
  if (!data || data.length === 0) return []

  // 查找数值列和标签列
  const firstRow = data[0]
  const keys = Object.keys(firstRow)

  let labelKey = keys.find(k =>
    k.toLowerCase().includes('name') ||
    k.toLowerCase().includes('label') ||
    k.toLowerCase().includes('date') ||
    k.toLowerCase().includes('channel') ||
    k.toLowerCase().includes('platform')
  ) || keys[0]

  let valueKey = keys.find(k =>
    typeof firstRow[k] === 'number' ||
    k.toLowerCase().includes('count') ||
    k.toLowerCase().includes('value') ||
    k.toLowerCase().includes('amount') ||
    k.toLowerCase().includes('total')
  ) || keys.find(k => k !== labelKey) || keys[1]

  // 转换数据
  return data.slice(0, 20).map((row, index) => ({
    name: row[labelKey]?.toString() || `项${index + 1}`,
    value: Number(row[valueKey]) || 0,
    ...row
  }))
}

/**
 * 折线图
 */
const LineChartComponent: React.FC<{ data: ChartData[]; color?: string; isDark: boolean }> = ({ data, color, isDark }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
      <XAxis
        dataKey="name"
        stroke={isDark ? '#94A3B8' : '#475569'}
        fontSize={12}
        tick={{ fill: isDark ? '#94A3B8' : '#475569' }}
      />
      <YAxis
        stroke={isDark ? '#94A3B8' : '#475569'}
        fontSize={12}
        tick={{ fill: isDark ? '#94A3B8' : '#475569' }}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: isDark ? '#1E293B' : '#ffffff',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          borderRadius: '8px',
          color: isDark ? '#F1F5F9' : '#1e293b',
          boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
        formatter={(value: number) => [formatNumber(value), '数值']}
      />
      <Legend
        wrapperStyle={{ color: isDark ? '#94A3B8' : '#475569' }}
      />
      <Line
        type="monotone"
        dataKey="value"
        stroke={color || '#3B82F6'}
        strokeWidth={2}
        dot={{ fill: color || '#3B82F6', r: 4 }}
        activeDot={{ r: 6 }}
      />
    </LineChart>
  </ResponsiveContainer>
)

/**
 * 柱状图
 */
const BarChartComponent: React.FC<{ data: ChartData[]; color?: string; isDark: boolean }> = ({ data, color, isDark }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
      <XAxis
        dataKey="name"
        stroke={isDark ? '#94A3B8' : '#475569'}
        fontSize={12}
        tick={{ fill: isDark ? '#94A3B8' : '#475569' }}
        angle={-45}
        textAnchor="end"
        height={60}
      />
      <YAxis
        stroke={isDark ? '#94A3B8' : '#475569'}
        fontSize={12}
        tick={{ fill: isDark ? '#94A3B8' : '#475569' }}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: isDark ? '#1E293B' : '#ffffff',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          borderRadius: '8px',
          color: isDark ? '#F1F5F9' : '#1e293b',
          boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
        formatter={(value: number) => [formatNumber(value), '数值']}
      />
      <Legend
        wrapperStyle={{ color: isDark ? '#94A3B8' : '#475569' }}
      />
      <Bar
        dataKey="value"
        fill={color || '#3B82F6'}
        radius={[4, 4, 0, 0]}
      />
    </BarChart>
  </ResponsiveContainer>
)

/**
 * 饼图
 */
const PieChartComponent: React.FC<{ data: ChartData[]; isDark: boolean }> = ({ data, isDark }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip
        contentStyle={{
          backgroundColor: isDark ? '#1E293B' : '#ffffff',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          borderRadius: '8px',
          color: isDark ? '#F1F5F9' : '#1e293b',
          boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
        formatter={(value: number) => [formatNumber(value), '数值']}
      />
      <Legend
        wrapperStyle={{ color: isDark ? '#94A3B8' : '#475569' }}
      />
    </PieChart>
  </ResponsiveContainer>
)

/**
 * 面积图
 */
const AreaChartComponent: React.FC<{ data: ChartData[]; color?: string; isDark: boolean }> = ({ data, color, isDark }) => (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
      <XAxis
        dataKey="name"
        stroke={isDark ? '#94A3B8' : '#475569'}
        fontSize={12}
        tick={{ fill: isDark ? '#94A3B8' : '#475569' }}
      />
      <YAxis
        stroke={isDark ? '#94A3B8' : '#475569'}
        fontSize={12}
        tick={{ fill: isDark ? '#94A3B8' : '#475569' }}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: isDark ? '#1E293B' : '#ffffff',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          borderRadius: '8px',
          color: isDark ? '#F1F5F9' : '#1e293b',
          boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
        formatter={(value: number) => [formatNumber(value), '数值']}
      />
      <Legend
        wrapperStyle={{ color: isDark ? '#94A3B8' : '#475569' }}
      />
      <Area
        type="monotone"
        dataKey="value"
        stroke={color || '#3B82F6'}
        fill={color || '#3B82F6'}
        fillOpacity={0.6}
      />
    </AreaChart>
  </ResponsiveContainer>
)

/**
 * 主图表组件
 */
export const ChartDisplay: React.FC<ChartDisplayProps> = ({
  data,
  chartType: initialChartType,
  title,
  color = '#3B82F6',
  onChartTypeChange
}) => {
  const { mode } = useTheme()
  const [internalChartType, setInternalChartType] = useState<ChartType>(initialChartType || 'bar')
  const isDark = mode === 'dark'
  const chartData = useMemo(() => transformDataToChart(data), [data])
  const recommendedType = initialChartType || recommendChartType(data)

  // 同步外部传入的 chartType
  useEffect(() => {
    if (initialChartType) {
      setInternalChartType(initialChartType)
    }
  }, [initialChartType])

  const handleChartTypeChange = (newType: ChartType) => {
    setInternalChartType(newType)
    onChartTypeChange?.(newType)
  }

  const currentChartType = internalChartType

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        <div className="text-center">
          <span className="text-4xl mb-2 block">📊</span>
          <p>暂无数据可显示</p>
        </div>
      </div>
    )
  }

  const renderChart = () => {
    switch (currentChartType) {
      case 'line':
        return <LineChartComponent data={chartData} color={color} isDark={isDark} />
      case 'bar':
        return <BarChartComponent data={chartData} color={color} isDark={isDark} />
      case 'pie':
        return <PieChartComponent data={chartData} isDark={isDark} />
      case 'area':
        return <AreaChartComponent data={chartData} color={color} isDark={isDark} />
      default:
        return <BarChartComponent data={chartData} color={color} isDark={isDark} />
    }
  }

  const getChartTypeButtonClass = (type: ChartType) => {
    const isActive = currentChartType === type
    if (isDark) {
      return isActive
        ? 'bg-blue-500/20 text-blue-400'
        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
    }
    return isActive
      ? 'bg-blue-100 text-blue-600 border border-blue-200'
      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
  }

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className={`text-base font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>{title}</h3>
          <div className="flex gap-1">
            {(['line', 'bar', 'area', 'pie'] as ChartType[]).map(type => (
              <button
                key={type}
                onClick={() => handleChartTypeChange(type)}
                className={`px-2 py-1 text-xs rounded transition-colors ${getChartTypeButtonClass(type)}`}
                title={type === 'line' ? '折线图' : type === 'bar' ? '柱状图' : type === 'area' ? '面积图' : '饼图'}
              >
                {type === 'line' && '📈'}
                {type === 'bar' && '📊'}
                {type === 'area' && '🌊'}
                {type === 'pie' && '🥧'}
              </button>
            ))}
          </div>
        </div>
      )}
      {renderChart()}

      {/* 数据统计 */}
      <div className={`grid grid-cols-3 gap-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="text-center">
          <div className={`text-2xl font-bold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
            {chartData.length}
          </div>
          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>数据点</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {formatNumber(Math.max(...chartData.map(d => d.value)))}
          </div>
          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>最大值</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">
            {formatNumber(chartData.reduce((sum, d) => sum + d.value, 0))}
          </div>
          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>总计</div>
        </div>
      </div>
    </div>
  )
}

export default ChartDisplay
