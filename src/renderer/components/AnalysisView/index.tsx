/**
 * AnalysisView - 分析视图组件（支持双模式）
 */

import React, { useState, useEffect } from 'react'
import { ChartDisplay } from '../ChartDisplay'
import { useTheme } from '../../contexts/ThemeContext'
import { ExportDialog } from '../ExportDialog'
import { Lightbulb, TrendingUp, AlertTriangle, Info, MessageSquare, Upload } from 'lucide-react'

interface AnalysisViewProps {
  context: { query: string; result: any; analysis: any } | null
  onChat: (context: any) => void
}

interface Insight {
  type: 'trend' | 'anomaly' | 'opportunity'
  title: string
  description: string
}

interface Metric {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ context, onChat }) => {
  const { mode } = useTheme()
  const [insights, setInsights] = useState<Insight[]>([])
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const isDark = mode === 'dark'

  useEffect(() => {
    if (!context?.analysis) {
      // 如果没有分析结果，执行分析
      performAnalysis()
    } else {
      // 已有分析结果，直接使用
      parseAnalysisResult(context.analysis)
    }
  }, [context])

  const performAnalysis = async () => {
    if (!context?.result) return

    setIsLoading(true)
    try {
      const result = await window.electronAPI.analysis.analyze({
        query: context.query,
        result: context.result.data,
        sql: context.result.sql
      })

      if (result.success && result.data) {
        parseAnalysisResult(result.data)
      }
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const parseAnalysisResult = (data: any) => {
    // 解析AI分析结果
    // TODO: 根据实际的API响应格式调整
    if (data.metrics) {
      setMetrics(data.metrics)
    }
    if (data.insights) {
      setInsights(data.insights)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            isDark ? 'bg-blue-500/20' : 'bg-blue-100'
          }`}>
            <div className={`w-8 h-8 border-2 rounded-full animate-spin ${
              isDark ? 'border-blue-500 border-t-transparent' : 'border-blue-600 border-t-transparent'
            }`}></div>
          </div>
          <p className="text-text-secondary">AI 正在分析数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      {/* 顶部信息 */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-1">{context?.query}</h2>
        <p className="text-xs text-text-muted">
          基于 {context?.result?.data?.rows?.length || 0} 行数据的 AI 分析
        </p>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {metrics.map((metric, index) => (
          <div key={index} className="card p-4">
            <div className="text-xs text-text-muted mb-1">{metric.label}</div>
            <div className="text-2xl font-bold text-text-primary mb-1">{metric.value}</div>
            {metric.change && (
              <div className={`text-xs flex items-center gap-1 ${
                metric.trend === 'up' ? 'text-green-400' :
                metric.trend === 'down' ? 'text-red-400' :
                isDark ? 'text-slate-400' : 'text-gray-400'
              }`}>
                <span>{metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}</span>
                <span>{metric.change}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 图表 */}
      {context?.result?.data && (
        <div className="card p-6 mb-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">数据趋势</h3>
          <ChartDisplay
            data={context.result.data.rows}
            chartType="line"
            title=""
            onChartTypeChange={() => {}}
          />
        </div>
      )}

      {/* AI 洞察 */}
      <div className="card p-6 mb-6">
        <h3 className="text-sm font-medium text-text-secondary mb-4 flex items-center gap-1.5"><Lightbulb className="w-4 h-4" />AI 洞察</h3>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div key={index} className={`flex items-start gap-3 p-3 rounded-lg ${
              isDark ? 'bg-slate-800/50' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex-shrink-0 mt-0.5">
                {insight.type === 'trend'       && <TrendingUp     className="w-4 h-4 text-blue-400"   />}
                {insight.type === 'anomaly'     && <AlertTriangle  className="w-4 h-4 text-orange-400" />}
                {insight.type === 'opportunity' && <Lightbulb      className="w-4 h-4 text-yellow-400" />}
                {!['trend','anomaly','opportunity'].includes(insight.type) && <Info className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-text-primary">{insight.title}</h4>
                <p className="text-xs text-text-muted mt-1">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={() => onChat(context)}
          className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <MessageSquare className="w-4 h-4 inline-block mr-1.5" />深入对话
        </button>
        <button
          onClick={() => setShowExportDialog(true)}
          className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isDark
              ? 'bg-slate-700 hover:bg-slate-600 text-text-primary'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          <Upload className="w-4 h-4 inline-block mr-1.5" />导出报告
        </button>
      </div>

      {/* 导出对话框 */}
      {showExportDialog && (
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          data={{
            query: context?.query || '',
            sql: context?.result?.sql || '',
            result: context?.result?.data?.rows || [],
            metrics: metrics.length > 0 ? metrics : undefined,
            insights: insights.length > 0 ? insights : undefined
          }}
        />
      )}
    </div>
  )
}
