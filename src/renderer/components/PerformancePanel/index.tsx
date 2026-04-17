/**
 * PerformancePanel - 性能监控面板
 * 显示查询性能指标、慢查询分析和优化建议
 */

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { usePerformanceMonitor } from '../../contexts/PerformanceMonitorContext'

interface PerformancePanelProps {
  isOpen: boolean
  onClose: () => void
}

export const PerformancePanel: React.FC<PerformancePanelProps> = ({ isOpen, onClose }) => {
  const { mode } = useTheme()
  const { metrics, getSummary, getSlowQueries, clearMetrics, isMonitoring, stopMonitoring, startMonitoring } = usePerformanceMonitor()
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'all'>('all')
  const [slowQueryThreshold, setSlowQueryThreshold] = useState(2000)
  const isDark = mode === 'dark'

  // 计算时间范围
  const timeRangeDates = useMemo(() => {
    const now = new Date()
    const start = new Date()

    switch (timeRange) {
      case 'hour':
        start.setHours(now.getHours() - 1)
        break
      case 'day':
        start.setDate(now.getDate() - 1)
        break
      case 'week':
        start.setDate(now.getDate() - 7)
        break
      case 'all':
      default:
        start.setFullYear(now.getFullYear() - 1) // 很久以前
        break
    }

    return { start, end: now }
  }, [timeRange])

  const summary = useMemo(() => getSummary(timeRangeDates), [getSummary, timeRangeDates])
  const slowQueries = useMemo(() => getSlowQueries(slowQueryThreshold), [getSlowQueries, slowQueryThreshold])

  // 生成优化建议
  const suggestions = useMemo(() => {
    const suggestions: string[] = []

    if (summary.averageQueryTime > 3000) {
      suggestions.push('平均查询时间较长，考虑添加数据库索引或优化查询语句')
    }

    if (summary.cacheHitRate < 50) {
      suggestions.push('缓存命中率较低，建议启用查询缓存以提高重复查询的性能')
    }

    if (summary.slowQueries > summary.totalQueries * 0.2) {
      suggestions.push('超过 20% 的查询属于慢查询，建议分析这些查询并优化')
    }

    if (suggestions.length === 0) {
      suggestions.push('性能表现良好，继续保持！')
    }

    return suggestions
  }, [summary])

  // 格式化时间
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
  }

  // 获取性能等级颜色
  const getPerformanceColor = (duration: number) => {
    if (duration < 500) return 'text-green-500'
    if (duration < 1500) return 'text-yellow-500'
    if (duration < 3000) return 'text-orange-500'
    return 'text-red-500'
  }

  // 获取性能等级
  const getPerformanceGrade = () => {
    const avgTime = summary.averageQueryTime
    if (avgTime < 500) return { grade: 'A', color: 'text-green-500', bg: 'bg-green-500/20', label: '优秀' }
    if (avgTime < 1500) return { grade: 'B', color: 'text-blue-500', bg: 'bg-blue-500/20', label: '良好' }
    if (avgTime < 3000) return { grade: 'C', color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: '一般' }
    return { grade: 'D', color: 'text-red-500', bg: 'bg-red-500/20', label: '较差' }
  }

  const performanceGrade = getPerformanceGrade()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 面板 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-2xl border shadow-2xl flex flex-col ${
          isDark
            ? 'bg-[#111827] border-white/[0.08]'
            : 'bg-white border-gray-200'
        }`}
      >
        {/* 标题栏 */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                性能监控
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                查询执行性能分析和优化建议
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 监控开关 */}
            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                isMonitoring
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {isMonitoring ? '● 监控中' : '○ 已暂停'}
            </button>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 时间范围选择 */}
          <div className="flex items-center gap-2 mb-6">
            <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>时间范围:</span>
            <div className="flex gap-1">
              {(['hour', 'day', 'week', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    timeRange === range
                      ? isDark
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-blue-100 text-blue-700'
                      : isDark
                        ? 'text-slate-400 hover:bg-white/5'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {range === 'hour' && '最近1小时'}
                  {range === 'day' && '今天'}
                  {range === 'week' && '最近7天'}
                  {range === 'all' && '全部'}
                </button>
              ))}
            </div>
          </div>

          {/* 性能概览 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* 性能等级 */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-white/[0.05]' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-600'} mb-1`}>
                性能等级
              </div>
              <div className={`flex items-center gap-2`}>
                <span className={`text-3xl font-bold ${performanceGrade.color}`}>
                  {performanceGrade.grade}
                </span>
                <span className={`text-sm ${performanceGrade.color} ${performanceGrade.bg} px-2 py-0.5 rounded`}>
                  {performanceGrade.label}
                </span>
              </div>
            </div>

            {/* 总查询数 */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-white/[0.05]' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-600'} mb-1`}>
                总查询数
              </div>
              <div className={`text-3xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                {summary.totalQueries}
              </div>
            </div>

            {/* 平均查询时间 */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-white/[0.05]' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-600'} mb-1`}>
                平均查询时间
              </div>
              <div className={`text-3xl font-bold ${getPerformanceColor(summary.averageQueryTime)}`}>
                {formatDuration(summary.averageQueryTime)}
              </div>
            </div>

            {/* 缓存命中率 */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-white/[0.05]' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-600'} mb-1`}>
                缓存命中率
              </div>
              <div className={`text-3xl font-bold ${summary.cacheHitRate > 70 ? 'text-green-500' : summary.cacheHitRate > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                {summary.cacheHitRate}%
              </div>
            </div>
          </div>

          {/* 慢查询列表 */}
          {slowQueries.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                  慢查询 ({slowQueries.length})
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                    阈值: {slowQueryThreshold}ms
                  </span>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="500"
                    value={slowQueryThreshold}
                    onChange={(e) => setSlowQueryThreshold(Number(e.target.value))}
                    className="w-24"
                  />
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {slowQueries.slice(0, 10).map((query) => (
                  <div
                    key={query.id}
                    className={`p-3 rounded-lg border ${
                      isDark
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                        {query.operation}
                      </div>
                      <div className={`text-sm font-mono ${getPerformanceColor(query.duration)}`}>
                        {formatDuration(query.duration)}
                      </div>
                    </div>
                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                      {new Date(query.timestamp).toLocaleString()}
                      {query.metadata?.rowCount && ` • ${query.metadata.rowCount} 行`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 优化建议 */}
          <div className={`p-4 rounded-xl border ${
            isDark
              ? 'bg-blue-500/10 border-blue-500/20'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💡</span>
              <h4 className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                优化建议
              </h4>
            </div>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div key={index} className={`text-sm flex items-start gap-2 ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                  <span>•</span>
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                if (confirm('确定要清除所有性能数据吗？')) {
                  clearMetrics()
                }
              }}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/[0.08]'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
              }`}
            >
              清除数据
            </button>
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              关闭
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default PerformancePanel
