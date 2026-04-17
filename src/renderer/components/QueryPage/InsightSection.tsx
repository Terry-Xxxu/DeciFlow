/**
 * InsightSection - 洞察区块组件（支持双模式）
 * 包含指标卡、图表、洞察、结论、风险、机会
 */

import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { MetricCard, MetricStatus } from './MetricCard'
import { InsightBlock } from './InsightBlock'
import { ClipboardList, AlertTriangle, Target, Zap, CheckCircle2, Lightbulb, MessageSquare } from 'lucide-react'

interface Insight {
  icon: string
  text: string
}

interface Conclusion {
  title: string
  description: string
  confidence: 'high' | 'medium' | 'low'
}

interface Risk {
  level: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
}

interface Opportunity {
  level: 'high' | 'medium' | 'low'
  title: string
  description: string
  potential: string
}

interface InsightSectionProps {
  analysis: {
    metrics: Array<{
      label: string
      value: string | number
      change?: string
      trend?: 'up' | 'down' | 'neutral'
      status?: MetricStatus
      description?: string
    }>
    insights: Array<{
      icon: string
      text: string
    }>
    conclusion?: Conclusion
    risks?: Risk[]
    opportunities?: Opportunity[]
    aiSuggestions?: string[]
    chartType?: 'line' | 'bar' | 'pie' | 'area'
  }
  onStartChat: () => void
}

export const InsightSection: React.FC<InsightSectionProps> = ({
  analysis,
  onStartChat
}) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  return (
    <div className="space-y-6">
      {/* 指标卡 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4"
      >
        {analysis.metrics.map((metric, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
          >
            <MetricCard {...metric} />
          </motion.div>
        ))}
      </motion.div>

      {/* 结论卡 */}
      {analysis.conclusion && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`conclusion-card p-6 rounded-2xl border ${
            isDark ? 'shadow-[0_0_40px_rgba(99,102,241,0.3)]' : 'shadow-card'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isDark
                ? 'bg-gradient-to-br from-primary/20 to-secondary/20'
                : 'bg-gradient-to-br from-primary/10 to-secondary/10'
            }`}>
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-text-primary">{analysis.conclusion.title}</h3>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  analysis.conclusion.confidence === 'high'
                    ? isDark
                      ? 'bg-success/20 text-success'
                      : 'bg-green-100 text-green-700'
                    : isDark
                      ? 'bg-warning/20 text-warning'
                      : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {analysis.conclusion.confidence === 'high' ? 'High' : 'Medium'} Confidence
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{analysis.conclusion.description}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 风险区 */}
      {analysis.risks && analysis.risks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h4 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger" /> Risks
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {analysis.risks.map((risk, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + index * 0.05 }}
                className="risk-card p-4 rounded-xl border"
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
                    {risk.level === 'high'
                      ? <AlertTriangle className="w-4 h-4 text-danger" />
                      : <AlertTriangle className="w-4 h-4 text-warning" />
                    }
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-text-primary mb-1">{risk.title}</h5>
                    <p className="text-xs text-text-secondary">{risk.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 机会区 */}
      {analysis.opportunities && analysis.opportunities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h4 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-success" /> Growth Opportunities
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {analysis.opportunities.map((opp, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className={`opportunity-card p-4 rounded-xl border ${
                  !isDark && 'hover:shadow-md hover:-translate-y-0.5 transition-all'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isDark
                      ? 'bg-success/20'
                      : 'bg-green-100'
                  }`}>
                    {opp.level === 'high'
                      ? <Zap className="w-4 h-4 text-success" />
                      : <CheckCircle2 className="w-4 h-4 text-success" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="text-sm font-medium text-text-primary">{opp.title}</h5>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        opp.level === 'high'
                          ? isDark
                            ? 'bg-success/20 text-success'
                            : 'bg-green-100 text-green-700'
                          : isDark
                            ? 'bg-success/10 text-success'
                            : 'bg-green-50 text-green-600'
                      }`}>
                        {opp.level === 'high' ? 'Quick Win' : 'Strategic'}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">{opp.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI洞察 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <InsightBlock insights={analysis.insights} />
      </motion.div>

      {/* AI建议 */}
      {analysis.aiSuggestions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="ai-card p-6 rounded-2xl border"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-6 h-6 text-yellow-400" />
            <h3 className="text-lg font-semibold gradient-text">AI Recommendations</h3>
          </div>
          <ul className="space-y-2">
            {analysis.aiSuggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span className="text-text-secondary flex-1">{suggestion}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* 继续对话按钮 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="flex justify-center"
      >
        <button
          onClick={onStartChat}
          className="btn btn-primary px-6 py-3 rounded-xl font-medium"
        >
          <MessageSquare className="w-4 h-4 inline-block mr-1.5" />Deep Dive
        </button>
      </motion.div>
    </div>
  )
}
