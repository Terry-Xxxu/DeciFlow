/**
 * ActionabilityBadge - 可执行性评分徽章组件
 * 展示AI洞察和建议的可执行性评分
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface ActionabilityScore {
  score: number
  level: 'high' | 'medium' | 'low'
  factors: {
    clarity: number
    feasibility: number
    impact: number
    effort: number
    urgency: number
  }
  bottlenecks: string[]
  prerequisites: string[]
  estimatedTimeframe: string
  resources: string[]
}

interface ActionabilityBadgeProps {
  score: ActionabilityScore
  size?: 'small' | 'medium' | 'large'
  showDetails?: boolean
}

export const ActionabilityBadge: React.FC<ActionabilityBadgeProps> = ({
  score,
  size = 'medium',
  showDetails = false
}) => {
  const { mode } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const isDark = mode === 'dark'

  const sizeStyles = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-1.5',
    large: 'text-base px-4 py-2'
  }

  const getLevelConfig = () => {
    switch (score.level) {
      case 'high':
        return {
          bg: isDark ? 'bg-green-500/20' : 'bg-green-100',
          text: isDark ? 'text-green-400' : 'text-green-700',
          border: isDark ? 'border-green-500/30' : 'border-green-200',
          icon: '🚀',
          label: '高可执行'
        }
      case 'medium':
        return {
          bg: isDark ? 'bg-yellow-500/20' : 'bg-yellow-100',
          text: isDark ? 'text-yellow-400' : 'text-yellow-700',
          border: isDark ? 'border-yellow-500/30' : 'border-yellow-200',
          icon: '📋',
          label: '中等可执行'
        }
      case 'low':
        return {
          bg: isDark ? 'bg-red-500/20' : 'bg-red-100',
          text: isDark ? 'text-red-400' : 'text-red-700',
          border: isDark ? 'border-red-500/30' : 'border-red-200',
          icon: '⚠️',
          label: '低可执行'
        }
    }
  }

  const config = getLevelConfig()

  if (!showDetails) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border ${sizeStyles[size]} ${config.bg} ${config.text} ${config.border}`}>
        <span>{config.icon}</span>
        <span className="font-medium">{score.score}</span>
      </span>
    )
  }

  return (
    <div className="relative">
      {/* 徽章 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`inline-flex items-center gap-2 rounded-full border transition-all ${sizeStyles[size]} ${config.bg} ${config.text} ${config.border} cursor-pointer hover:opacity-80`}
      >
        <span>{config.icon}</span>
        <span className="font-semibold">{config.label}</span>
        <span className="opacity-75">{score.score}/100</span>
      </button>

      {/* 详细信息弹窗 */}
      {isExpanded && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsExpanded(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`absolute z-20 w-80 rounded-xl border shadow-xl p-4 ${isDark ? 'bg-slate-800 border-white/[0.1]' : 'bg-white border-gray-200'}`}
          >
            {/* 标题 */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{config.icon}</span>
              <h4 className={`font-bold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                可执行性分析
              </h4>
            </div>

            {/* 评分因素 */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>清晰度</span>
                <div className="flex items-center gap-2">
                  <div className={`w-20 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${score.factors.clarity}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {score.factors.clarity}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>可行性</span>
                <div className="flex items-center gap-2">
                  <div className={`w-20 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${score.factors.feasibility}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {score.factors.feasibility}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>影响力</span>
                <div className="flex items-center gap-2">
                  <div className={`w-20 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${score.factors.impact}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {score.factors.impact}
                  </span>
                </div>
              </div>
            </div>

            {/* 时间框架 */}
            <div className={`p-3 rounded-lg mb-3 ${isDark ? 'bg-slate-900/50' : 'bg-gray-100'}`}>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'} mb-1`}>
                预计周期
              </div>
              <div className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                {score.estimatedTimeframe}
              </div>
            </div>

            {/* 瓶颈 */}
            {score.bottlenecks.length > 0 && (
              <div className="mb-3">
                <div className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                  ⚠️ 潜在瓶颈
                </div>
                <div className="space-y-1">
                  {score.bottlenecks.map((bottleneck, index) => (
                    <div key={index} className={`text-xs flex items-start gap-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                      <span>•</span>
                      <span>{bottleneck}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 前置条件 */}
            {score.prerequisites.length > 0 && (
              <div className="mb-3">
                <div className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                  📋 前置条件
                </div>
                <div className="space-y-1">
                  {score.prerequisites.map((prereq, index) => (
                    <div key={index} className={`text-xs flex items-start gap-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                      <span>•</span>
                      <span>{prereq}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 所需资源 */}
            {score.resources.length > 0 && (
              <div>
                <div className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                  👥 所需资源
                </div>
                <div className="flex flex-wrap gap-1">
                  {score.resources.map((resource, index) => (
                    <span
                      key={index}
                      className={`px-2 py-1 text-xs rounded-full ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}
                    >
                      {resource}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  )
}

/**
 * ActionabilityPanel - 可执行性详情面板
 */
interface ActionabilityPanelProps {
  insights: Array<{
    text: string
    score: ActionabilityScore
    suggestedActions?: Array<{
      action: string
      priority: 'high' | 'medium' | 'low'
      owner: string
      effort: 'low' | 'medium' | 'high'
      timeframe: string
    }>
  }>
}

export const ActionabilityPanel: React.FC<ActionabilityPanelProps> = ({ insights }) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
      case 'medium':
        return isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
      case 'low':
        return isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
    }
  }

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low':
        return isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
      case 'medium':
        return isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
      case 'high':
        return isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
    }
  }

  return (
    <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🎯</span>
        <h3 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
          可执行性评估
        </h3>
      </div>

      <div className="space-y-4">
        {insights.map((insight, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border ${isDark ? 'bg-slate-900/50 border-white/[0.05]' : 'bg-white border-gray-200'}`}
          >
            {/* 洞察内容 */}
            <div className="mb-3">
              <div className="flex items-start justify-between gap-3">
                <p className={`text-sm flex-1 ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                  {insight.text}
                </p>
                <ActionabilityBadge score={insight.score} />
              </div>
            </div>

            {/* 建议行动 */}
            {insight.suggestedActions && insight.suggestedActions.length > 0 && (
              <div className="space-y-2">
                <div className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>
                  建议行动
                </div>
                {insight.suggestedActions.map((action, actionIndex) => (
                  <div
                    key={actionIndex}
                    className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/30' : 'bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                          {action.action}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded ${getPriorityColor(action.priority)}`}>
                            {action.priority === 'high' ? '高' : action.priority === 'medium' ? '中' : '低'}优先级
                          </span>
                          <span className={`px-2 py-0.5 rounded ${getEffortColor(action.effort)}`}>
                            {action.effort === 'low' ? '低' : action.effort === 'medium' ? '中' : '高'}难度
                          </span>
                        </div>
                      </div>
                      <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                        {action.timeframe}
                      </div>
                    </div>
                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>
                      责任方：{action.owner}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default ActionabilityBadge
