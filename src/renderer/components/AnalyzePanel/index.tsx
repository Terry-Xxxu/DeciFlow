/**
 * 分析面板组件
 * 展示深度分析结果
 */

import React, { useState } from 'react'
import { AnalyzeResult } from '../../../main/ai/analyze-engine'
import { AnalysisChat } from '../AnalysisChat'

interface AnalyzePanelProps {
  result: AnalyzeResult | null
  loading?: boolean
  onCopy?: (text: string) => void
  sessionId?: string  // 新增：会话ID，用于对话上下文
}

export const AnalyzePanel: React.FC<AnalyzePanelProps> = ({ result, loading, onCopy, sessionId }) => {
  const [showChat, setShowChat] = useState(true)
  if (loading) {
    return (
      <div className="space-y-6 p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4 mx-auto" />
            <p className="text-slate-300">正在深度分析数据...</p>
            <p className="text-sm text-slate-500 mt-2">这可能需要几秒钟</p>
          </div>
        </div>
      </div>
    )
  }

  if (!result) {
    return null
  }

  const getImpactColor = (judgment: string) => {
    switch (judgment) {
      case 'positive':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'negative':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'neutral':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/20 text-red-400'
      case 'medium':
        return 'bg-orange-500/20 text-orange-400'
      case 'low':
        return 'bg-yellow-500/20 text-yellow-400'
      default:
        return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0':
        return 'bg-red-500/20 text-red-400 border border-red-500/30'
      case 'P1':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
      case 'P2':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
    }
  }

  const handleCopy = (text: string) => {
    if (onCopy) {
      onCopy(text)
    } else {
      navigator.clipboard.writeText(text)
    }
  }

  return (
    <div className="space-y-6">
      {/* 一句话总结 */}
      <div className="p-5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🎯</span>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-purple-300 mb-1">一句话总结</h3>
            <p className="text-lg text-slate-200 font-medium">{result.summary}</p>
          </div>
          <button
            onClick={() => handleCopy(result.summary)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
            title="复制"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2h-2" />
              <path d="M15 9a3 3 0 11-6 0 3 3 0 016 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* 核心结论 */}
      <div className="p-5 bg-slate-800/50 border border-slate-700 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📌</span>
          <h3 className="text-lg font-semibold text-slate-200">核心结论</h3>
        </div>
        <p className="text-slate-300 leading-relaxed">{result.conclusion}</p>
      </div>

      {/* 关键问题 */}
      {result.problems && result.problems.length > 0 && (
        <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⚠️</span>
            <h3 className="text-lg font-semibold text-red-400">关键问题</h3>
          </div>
          <div className="space-y-2">
            {result.problems.map((problem, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-red-500/10 rounded-lg">
                <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(problem.severity)}`}>
                  {problem.severity.toUpperCase()}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-slate-300">{problem.issue}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    变化幅度: {problem.value.toFixed(1)}% (阈值: {problem.threshold}%)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 主要驱动因素 */}
      {result.drivers && result.drivers.length > 0 && (
        <div className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔥</span>
            <h3 className="text-lg font-semibold text-blue-400">主要驱动因素</h3>
          </div>
          <div className="space-y-2">
            {result.drivers.map((driver, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`text-lg ${
                    driver.impact === 'positive' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {driver.impact === 'positive' ? '📈' : '📉'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{driver.key}</p>
                    <p className="text-xs text-slate-500">{driver.dimension} 维度</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-200">{driver.contribution.toFixed(1)}%</p>
                  <p className="text-xs text-slate-500">贡献度</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 影响判断 */}
      <div className="p-5 bg-slate-800/50 border border-slate-700 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📊</span>
          <h3 className="text-lg font-semibold text-slate-200">影响判断</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-lg ${getImpactColor(result.impact.judgment)}`}>
            <p className="text-sm font-medium">{result.impact.judgment === 'positive' ? '正面' : result.impact.judgment === 'negative' ? '负面' : '中性'}</p>
          </div>
          <div className={`px-3 py-1 rounded text-xs ${getSeverityColor(result.impact.severity)}`}>
            {result.impact.severity === 'high' ? '高影响' : result.impact.severity === 'medium' ? '中等影响' : '低影响'}
          </div>
        </div>
        <p className="text-sm text-slate-400 mt-3">{result.impact.description}</p>
      </div>

      {/* 行动建议 */}
      {result.actions && result.actions.length > 0 && (
        <div className="p-5 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🚀</span>
            <h3 className="text-lg font-semibold text-green-400">行动建议</h3>
          </div>
          <div className="space-y-2">
            {result.actions.map((action, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded flex-shrink-0 ${getPriorityColor(action.priority)}`}>
                  {action.priority}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-slate-300">{action.action}</p>
                  {action.expectedImpact && (
                    <p className="text-xs text-slate-500 mt-1">预期: {action.expectedImpact}</p>
                  )}
                </div>
                {action.target && (
                  <button
                    onClick={() => {/* 跳转到相关维度或指标 */}}
                    className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0"
                  >
                    查看 →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 元数据 */}
      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>分析时间: {result.metadata.analyzedAt.toLocaleString('zh-CN')}</span>
          <span>数据范围: {result.metadata.dataTimeRange}</span>
          <span>耗时: {result.metadata.analysisDuration}ms</span>
          <span>数据质量: {result.metadata.dataQuality === 'good' ? '良好' : result.metadata.dataQuality === 'fair' ? '一般' : '较差'}</span>
        </div>
      </div>

      {/* 对话式分析区域 - 新增 */}
      {sessionId && showChat && (
        <div className="border-t border-slate-700/50 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <h3 className="text-lg font-semibold text-slate-200">继续追问</h3>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              收起
            </button>
          </div>

          <AnalysisChat
            sessionId={sessionId}
            contextSummary={{
              metric: result.summary,
              currentTrend: result.metadata ? {
                changePercent: 0,  // 从数据中提取
                trend: 'stable'
              } : undefined,
              problems: result.problems,
              drivers: result.drivers
            }}
            timeRange={result.metadata?.dataTimeRange}
          />
        </div>
      )}
    </div>
  )
}

export default AnalyzePanel
