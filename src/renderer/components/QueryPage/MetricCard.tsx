/**
 * MetricCard - 指标卡片组件
 * 支持状态显示（好/坏/中性）
 */

import React from 'react'
import { motion } from 'framer-motion'

export type MetricStatus = 'good' | 'bad' | 'neutral'

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
  description,
}) => {
  const statusConfig = {
    good: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      text: 'text-green-400',
      icon: '✓'
    },
    bad: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-400',
      icon: '⚠'
    },
    neutral: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      icon: '—'
    }
  }

  const config = statusConfig[status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-background-secondary rounded-xl border border-white/[0.08] p-5 hover:shadow-md transition-all hover:-translate-y-0.5"
    >
      {/* 状态指示器 */}
      {status !== 'neutral' && (
        <div className={`absolute top-3 right-3 w-5 h-5 rounded-full ${config.bg} ${config.border} border flex items-center justify-center ${config.text} text-xs`}>
          {config.icon}
        </div>
      )}

      <div className="text-xs text-text-muted mb-2">{label}</div>
      <div className="text-2xl font-bold text-text-primary mb-2">{value}</div>

      {change && (
        <div className={`text-xs flex items-center gap-1 ${
          trend === 'up' ? 'text-green-400' :
          trend === 'down' ? 'text-red-400' :
          'text-text-muted'
        }`}>
          <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
          <span>{change}</span>
        </div>
      )}

      {description && (
        <div className="mt-3 pt-3 border-t border-white/[0.05]">
          <p className="text-xs text-text-secondary">{description}</p>
        </div>
      )}
    </motion.div>
  )
}
