/**
 * MetricCard - 指标卡片组件（支持双模式）
 */

import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export type MetricStatus = 'positive' | 'negative' | 'neutral' | 'warning'

interface MetricCardProps {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  status?: MetricStatus
  description?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  trend,
  status = 'neutral',
  description
}) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  // 根据趋势或状态确定颜色
  const getTrendColor = () => {
    if (status === 'positive') return isDark ? 'text-success' : 'text-green-600'
    if (status === 'negative') return isDark ? 'text-danger' : 'text-red-600'
    if (status === 'warning') return isDark ? 'text-warning' : 'text-yellow-600'
    // 默认根据趋势
    if (trend === 'up') return isDark ? 'text-success' : 'text-green-600'
    if (trend === 'down') return isDark ? 'text-danger' : 'text-red-600'
    return isDark ? 'text-text-muted' : 'text-gray-500'
  }

  // 状态指示器背景色
  const getStatusBg = () => {
    if (status === 'positive') return isDark ? 'bg-success/20' : 'bg-green-100'
    if (status === 'negative') return isDark ? 'bg-danger/20' : 'bg-red-100'
    if (status === 'warning') return isDark ? 'bg-warning/20' : 'bg-yellow-100'
    return isDark ? 'bg-background-tertiary' : 'bg-gray-100'
  }

  // 状态指示器文本色
  const getStatusText = () => {
    if (status === 'positive') return isDark ? 'text-success' : 'text-green-700'
    if (status === 'negative') return isDark ? 'text-danger' : 'text-red-700'
    if (status === 'warning') return isDark ? 'text-warning' : 'text-yellow-700'
    return isDark ? 'text-text-secondary' : 'text-gray-600'
  }

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'

  return (
    <div className={`metric-card p-5 hover:scale-[1.02] transition-all duration-200 ${
      !isDark && 'hover:shadow-md'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs text-text-muted">{label}</div>
        {status !== 'neutral' && (
          <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${getStatusBg()} ${getStatusText()}`}>
            {status === 'positive' ? '正常' : status === 'negative' ? '异常' : status === 'warning' ? '注意' : '中性'}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div className="text-3xl font-semibold text-text-primary">{value}</div>
        {change && (
          <div className={`text-sm font-medium ${getTrendColor()} flex items-center gap-1`}>
            <span>{trendIcon}</span>
            <span>{change}</span>
          </div>
        )}
      </div>
      {description && (
        <div className={`text-xs mt-2 ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
          {description}
        </div>
      )}
    </div>
  )
}
