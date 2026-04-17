/**
 * QueryHomeLight - 浅色模式查询首页
 * Stripe/Linear 风格：极简、大量留白、居中输入
 */

import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface QueryHomeLightProps {
  onQuery: (query: string) => void
  isLoading?: boolean
}

const exampleQuestions = [
  { text: 'What is our retention rate?', icon: '📊' },
  { text: 'Show me the conversion funnel', icon: '📈' },
  { text: 'Analyze user churn', icon: '🎯' },
]

export const QueryHomeLight: React.FC<QueryHomeLightProps> = ({ onQuery, isLoading }) => {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    if (query.trim()) {
      onQuery(query)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      {/* 品牌标识 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold text-text-primary mb-3">
          DeciFlow
        </h1>
        <p className="text-text-secondary text-lg">
          AI-Powered Decision Intelligence
        </p>
      </motion.div>

      {/* 主输入区 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-2xl"
      >
        {/* 输入框容器 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-2">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="What do you want to analyze?"
              className="flex-1 px-4 py-3 text-text-primary placeholder-text-tertiary outline-none text-base"
              disabled={isLoading}
            />
            <button
              onClick={handleSubmit}
              disabled={!query.trim() || isLoading}
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Analyzing</span>
                </div>
              ) : (
                <span>Analyze</span>
              )}
            </button>
          </div>
        </div>

        {/* 示例问题 */}
        {!query && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <p className="text-sm text-text-tertiary text-center mb-4">
              Try asking:
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {exampleQuestions.map((example, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + index * 0.05 }}
                  onClick={() => {
                    setQuery(example.text)
                    inputRef.current?.focus()
                  }}
                  className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-xl text-text-secondary hover:text-text-primary text-sm font-medium transition-all"
                >
                  {example.icon} {example.text}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* 底部提示 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-16 text-center"
      >
        <p className="text-xs text-text-tertiary">
          Connected to your data source • AI-powered analysis
        </p>
      </motion.div>
    </div>
  )
}
