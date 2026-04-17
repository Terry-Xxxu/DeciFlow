/**
 * DeciFlow 分析页面 - 核心价值页面（支持双模式）
 * 设计理念：结论 > 数据 > 图表
 * 浅色模式：Stripe/Linear 风格
 * 暗色模式：Premium Glow 风格
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'

interface AnalysisPageProps {
  query?: string
  onBack?: () => void
}

// 模拟数据
const mockAnalysis = {
  conclusion: {
    icon: '🔥',
    title: 'User growth is healthy, but Day 3 retention shows noticeable drop-off',
    suggestion: 'Prioritize onboarding flow optimization',
    confidence: 'high'
  },
  metrics: [
    {
      label: 'Retention',
      value: '45.2%',
      change: '+3.2%',
      status: 'good' as const,
      insight: '⚠️ Day 3 drop-off'
    },
    {
      label: 'New Users',
      value: '23,456',
      change: '+5.6%',
      status: 'good' as const,
      insight: null
    },
    {
      label: 'Growth',
      value: '+12.5%',
      change: null,
      status: 'neutral' as const,
      insight: null
    }
  ],
  trendData: {
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
    values: [42, 44, 43, 46, 48, 52, 45, 47],
    anomalies: [
      null,
      null,
      null,
      null,
      null,
      { index: 5, value: 52, reason: 'Abnormally high' },
      { index: 6, value: 45, reason: 'Significant drop' },
      null
    ]
  },
  risks: [
    {
      level: 'high' as const,
      title: 'Day 3 churn rate at 35% (anomaly)',
      description: '12% increase from last month'
    },
    {
      level: 'medium' as const,
      title: 'Android retention 18% below average',
      description: 'iOS at 52%, Android at 34%'
    }
  ],
  opportunities: [
    {
      level: 'high' as const,
      title: 'App Store users retain 22% better',
      description: 'Highest quality user segment'
    },
    {
      level: 'medium' as const,
      title: 'New user onboarding performs well',
      description: '78% completion rate'
    }
  ],
  aiSuggestions: [
    'Add push notification on Day 3 to re-engage users',
    'Optimize Android first-time experience',
    'Increase investment in high-quality channels'
  ]
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({ query, onBack }) => {
  const { mode } = useTheme()
  const [selectedAnomaly, setSelectedAnomaly] = useState<number | null>(null)
  const isDark = mode === 'dark'

  return (
    <div className="h-full flex">
      {/* 左侧边栏 */}
      <aside className={`w-16 flex flex-col items-center py-4 gap-2 ${
        'bg-background-secondary border-r border-border'
      }`}>
        <button className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
          isDark
            ? 'bg-primary/20 text-primary'
            : 'bg-primary/10 text-primary hover:bg-primary/15'
        }`}>
          <span className="text-lg">📊</span>
        </button>
        <button className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
          isDark
            ? 'text-text-muted hover:text-text-primary hover:bg-white/5'
            : 'text-text-tertiary hover:text-text-primary hover:bg-gray-100'
        }`}>
          <span className="text-lg">🧠</span>
        </button>
        <button className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
          isDark
            ? 'text-text-muted hover:text-text-primary hover:bg-white/5'
            : 'text-text-tertiary hover:text-text-primary hover:bg-gray-100'
        }`}>
          <span className="text-lg">⚙️</span>
        </button>
      </aside>

      {/* 中间分析核心区 */}
      <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* 1️⃣ 结论爆点区 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`conclusion-card p-6 rounded-2xl border ${
              isDark
                ? 'shadow-[0_0_40px_rgba(99,102,241,0.3),_inset_0_1px_0_rgba(255,255,255,0.1)]'
                : 'shadow-card'
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">{mockAnalysis.conclusion.icon}</span>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-text-primary mb-2">
                  {mockAnalysis.conclusion.title}
                </h1>
                <div className="flex items-center gap-3">
                  <span className="text-text-secondary">👉</span>
                  <span className="text-primary font-medium">{mockAnalysis.conclusion.suggestion}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    isDark
                      ? 'bg-success/20 text-success'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    High Confidence
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 2️⃣ 指标区 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4"
          >
            {mockAnalysis.metrics.map((metric, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + index * 0.05 }}
                className="metric-card relative"
              >
                <div className="text-xs text-text-muted mb-2">{metric.label}</div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-text-primary">{metric.value}</span>
                  {metric.change && (
                    <span className={`text-sm font-medium ${
                      metric.status === 'good' ? 'text-success' :
                      metric.status === 'bad' ? 'text-danger' :
                      'text-text-muted'
                    }`}>
                      {metric.change}
                    </span>
                  )}
                </div>
                {metric.insight && (
                  <div className="text-xs text-warning mt-2">
                    {metric.insight}
                  </div>
                )}
                {/* 状态指示点 */}
                <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
                  metric.status === 'good' ? 'bg-success shadow-[0_0_6px_rgba(34,197,94,0.5)]' :
                  metric.status === 'bad' ? 'bg-danger shadow-[0_0_6px_rgba(239,68,68,0.5)]' :
                  'bg-text-muted'
                }`} />
              </motion.div>
            ))}
          </motion.div>

          {/* 3️⃣ 趋势图 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card p-6 rounded-2xl border-border"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <span>📈</span> Retention Trend
              </h3>
              <span className="text-xs text-text-muted">Anomaly Detection</span>
            </div>

            {/* 趋势图 */}
            <div className="h-48 flex items-end justify-between gap-2 px-4">
              {mockAnalysis.trendData.values.map((value, index) => {
                const anomaly = mockAnalysis.trendData.anomalies[index]
                const isSelected = selectedAnomaly === index

                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="relative w-full">
                      {/* 柱状 */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${value * 2}%` }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        className={`w-full rounded-t-sm transition-colors ${
                          anomaly
                            ? 'bg-danger'
                            : `bg-primary/60 hover:bg-primary ${isDark ? '' : 'hover:opacity-80'}`
                        }`}
                        style={{ minHeight: '20%' }}
                      />
                      {/* 异常点标记 */}
                      {anomaly && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="anomaly-dot absolute -top-1 left-1/2 -translate-x-1/2 cursor-pointer"
                          onClick={() => setSelectedAnomaly(isSelected ? null : index)}
                        />
                      )}
                    </div>
                    <span className="text-xs text-text-muted">{mockAnalysis.trendData.labels[index]}</span>
                  </div>
                )
              })}
            </div>

            {/* 异常点说明 */}
            <AnimatePresence>
              {selectedAnomaly !== null && mockAnalysis.trendData.anomalies[selectedAnomaly] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`mt-4 p-3 rounded-xl ${
                    isDark
                      ? 'bg-danger/10 border-danger/30'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-danger">⚠️</span>
                    <div>
                      <div className="text-sm font-medium text-text-primary">Anomaly Detected</div>
                      <div className="text-xs text-text-secondary mt-1">
                        {mockAnalysis.trendData.anomalies[selectedAnomaly!]?.reason}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* 4️⃣ 风险区 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span className="text-danger">⚠️</span> Risks
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {mockAnalysis.risks.map((risk, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="risk-card p-5 rounded-2xl"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      risk.level === 'high'
                        ? isDark
                          ? 'bg-danger/20'
                          : 'bg-red-100'
                        : isDark
                          ? 'bg-warning/20'
                          : 'bg-yellow-100'
                    }`}>
                      <span>{risk.level === 'high' ? '🔴' : '🟡'}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-text-primary mb-1">{risk.title}</h4>
                      <p className="text-xs text-text-secondary">{risk.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* 5️⃣ 机会区 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span className="text-success">🎯</span> Growth Opportunities
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {mockAnalysis.opportunities.map((opp, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className={`opportunity-card p-5 rounded-2xl border ${
                    isDark ? '' : 'hover:shadow-md hover:-translate-y-0.5 transition-all'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isDark
                        ? 'bg-success/20'
                        : 'bg-green-100'
                    }`}>
                      <span>🟢</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-text-primary mb-1">{opp.title}</h4>
                      <p className="text-xs text-text-secondary">{opp.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* 6️⃣ AI 建议 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="ai-card p-6 rounded-2xl border"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">💡</span>
              <h3 className="text-lg font-semibold gradient-text">AI Recommendations</h3>
            </div>
            <ul className="space-y-3">
              {mockAnalysis.aiSuggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  <span className="text-text-secondary flex-1">{suggestion}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 mt-6">
              <button className="btn btn-primary flex-1">
                📄 Generate Report
              </button>
              <button className="btn btn-secondary flex-1">
                💬 Continue Analysis
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      {/* 右侧 AI 对话 */}
      <aside className="w-80 flex flex-col bg-background-secondary/50 border-l border-border">
        <div className="h-full flex flex-col">
          <div className={`p-4 border-b ${
            'border-border'
          }`}>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <span>💬</span> Deep Dive
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="space-y-4">
              <div className="text-xs text-text-muted text-center">Today</div>
              <div className={`p-3 rounded-xl rounded-tl-none ${
                isDark ? 'bg-primary/10' : 'bg-primary/5'
              }`}>
                <p className="text-sm text-text-primary">Found 3 key issues</p>
              </div>

              <div className="space-y-2">
                <button className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                  isDark
                    ? 'bg-background-secondary hover:bg-background-tertiary text-text-secondary hover:text-text-primary'
                    : 'bg-gray-50 hover:bg-gray-100 text-text-secondary hover:text-text-primary'
                }`}>
                  Why is Day 3 churn high?
                </button>
                <button className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                  isDark
                    ? 'bg-background-secondary hover:bg-background-tertiary text-text-secondary hover:text-text-primary'
                    : 'bg-gray-50 hover:bg-gray-100 text-text-secondary hover:text-text-primary'
                }`}>
                  Break down by channel
                </button>
                <button className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                  isDark
                    ? 'bg-background-secondary hover:bg-background-tertiary text-text-secondary hover:text-text-primary'
                    : 'bg-gray-50 hover:bg-gray-100 text-text-secondary hover:text-text-primary'
                }`}>
                  Compare with last month
                </button>
              </div>
            </div>
          </div>

          <div className={`p-4 border-t ${
            'border-border'
          }`}>
            <div className="relative">
              <input
                type="text"
                placeholder="Follow up..."
                className="input pr-10 text-sm"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                →
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
