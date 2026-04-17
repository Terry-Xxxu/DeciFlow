/**
 * QueryInput - 大输入框组件（支持双模式）
 * ChatGPT 风格 + Stripe/Linear 高级感
 */

import React, { forwardRef, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface QueryInputProps {
  ref?: React.RefObject<HTMLInputElement>
  onSubmit: (query: string) => void
  placeholder: string
  compact?: boolean
}

export const QueryInput = forwardRef<HTMLInputElement, QueryInputProps>(
  ({ onSubmit, placeholder, compact = false }, ref
) => {
  const { mode } = useTheme()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isDark = mode === 'dark'

  // 暴露给父组件
  React.useImperativeHandle(ref || ({} as any), () => ({
    focus: () => inputRef.current?.focus(),
    getValue: () => query,
    setValue: (val: string) => setQuery(val),
  }))

  const handleSubmit = () => {
    if (query.trim()) {
      onSubmit(query)
    }
  }

  return (
    <div className={compact ? 'w-full' : 'w-full'}>
      <motion.div
        initial={compact ? false : { scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={`
          relative rounded-2xl border transition-all duration-200
          ${compact ? 'p-3' : 'p-4'}
          ${isDark
            ? 'bg-background-secondary border-white/[0.08] hover:border-white/12'
            : 'bg-white border-gray-200 hover:border-gray-300 shadow-[0_1px_3px_rgba(0,0,0,0.06),_0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-lg'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted outline-none text-base"
            autoFocus
          />
          {!compact && (
            <button
              onClick={handleSubmit}
              disabled={!query.trim()}
              className="btn btn-primary px-5 py-2.5 rounded-xl text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <span>🔍</span>
                <span>Analyze</span>
              </span>
            </button>
          )}
        </div>

        {/* 数据源标签 */}
        {!compact && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <span className={`px-2 py-1 text-xs rounded-lg ${
              isDark
                ? 'bg-background-tertiary text-text-muted'
                : 'bg-gray-100 text-gray-600'
            }`}>
              PostgreSQL
            </span>
          </div>
        )}
      </motion.div>
    </div>
  )
})
