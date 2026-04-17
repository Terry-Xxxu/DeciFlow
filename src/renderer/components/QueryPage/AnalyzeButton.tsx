/**
 * AnalyzeButton - AI分析按钮（支持双模式）
 */

import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface AnalyzeButtonProps {
  onAnalyze: () => void
}

export const AnalyzeButton: React.FC<AnalyzeButtonProps> = ({ onAnalyze }) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex justify-center"
    >
      <motion.button
        onClick={onAnalyze}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          px-8 py-4 rounded-2xl font-medium text-base flex items-center gap-3
          transition-all duration-200
          ${isDark
            ? 'bg-gradient-to-r from-primary to-secondary text-white'
            : 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
          }
        `}
        style={{
          boxShadow: isDark
            ? '0 4px 20px rgba(99, 102, 241, 0.3)'
            : '0 4px 20px rgba(99, 102, 241, 0.25)'
        }}
      >
        <span className="text-2xl">🧠</span>
        <span>AI Deep Analysis</span>
      </motion.button>
    </motion.div>
  )
}
