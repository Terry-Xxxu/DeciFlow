/**
 * QueryModeSwitcher - 查询模式切换器
 * 支持AI自然语言、SQL直接输入、可视化构建器三种模式
 */

import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

export type QueryMode = 'ai' | 'sql' | 'visual'

interface QueryModeSwitcherProps {
  currentMode: QueryMode
  onModeChange: (mode: QueryMode) => void
  compact?: boolean
}

export const QueryModeSwitcher: React.FC<QueryModeSwitcherProps> = ({
  currentMode,
  onModeChange,
  compact = false
}) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  const modes = [
    {
      id: 'ai' as QueryMode,
      label: 'AI 查询',
      icon: '🤖',
      description: '用自然语言描述，AI自动生成SQL',
      shortDesc: '自然语言'
    },
    {
      id: 'sql' as QueryMode,
      label: 'SQL 查询',
      icon: '💾',
      description: '直接编写SQL语句，精确控制',
      shortDesc: 'SQL编辑器'
    },
    {
      id: 'visual' as QueryMode,
      label: '可视化构建',
      icon: '📊',
      description: '拖拽式构建查询，无需写代码',
      shortDesc: '可视化'
    }
  ]

  if (compact) {
    return (
      <div className={`flex items-center gap-1 p-1 rounded-lg ${
        isDark ? 'bg-slate-800' : 'bg-gray-200'
      }`}>
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
              currentMode === mode.id
                ? isDark
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-blue-600 text-white shadow-lg'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
            title={mode.description}
          >
            <span>{mode.icon}</span>
            <span>{!compact && mode.shortDesc}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-2">
      {modes.map((mode) => (
        <motion.button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`flex-1 p-3 rounded-xl border-2 transition-all ${
            currentMode === mode.id
              ? isDark
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-blue-500 bg-blue-50'
              : isDark
                ? 'border-transparent bg-slate-800/50 hover:bg-slate-800 hover:border-white/10'
                : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-300'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">{mode.icon}</span>
            <div className={`text-sm font-semibold ${
              currentMode === mode.id
                ? isDark
                  ? 'text-blue-400'
                  : 'text-blue-700'
                : isDark
                  ? 'text-slate-400'
                  : 'text-gray-600'
            }`}>
              {mode.label}
            </div>
            <div className={`text-xs text-center ${
              currentMode === mode.id
                ? isDark
                  ? 'text-blue-300/80'
                  : 'text-blue-600/80'
                : isDark
                  ? 'text-slate-500'
                  : 'text-gray-500'
            }`}>
              {mode.description}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  )
}
