/**
 * ExampleQuestions - 示例问题组件（支持双模式）
 */

import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface ExampleQuestionsProps {
  examples: Array<{ text: string; icon?: React.ReactNode }>
  onSelect: (query: string) => void
}

export const ExampleQuestions: React.FC<ExampleQuestionsProps> = ({ examples, onSelect }) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {examples.map((example, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(example.text)}
          className={`px-4 py-2 rounded-xl text-sm transition-all ${
            isDark
              ? 'bg-background-tertiary hover:bg-background-elevated text-text-secondary hover:text-text-primary border border-white/[0.05] hover:border-white/[0.1]'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }`}
        >
          {example.icon} {example.text}
        </motion.button>
      ))}
    </div>
  )
}
