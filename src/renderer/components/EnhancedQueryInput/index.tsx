/**
 * EnhancedQueryInput - 增强型查询输入组件
 * 支持历史记录、智能提示、快捷键等高级功能
 */

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { useDatabase } from '../../stores/DatabaseStore'

interface Suggestion {
  text: string
  icon: string
  category?: 'recent' | 'template' | 'example'
  sql?: string
}

interface QueryHistory {
  query: string
  timestamp: Date
  success: boolean
  executionTime?: number
}

export interface QueryInputRef {
  focus: () => void
  getValue: () => string
  setValue: (val: string) => void
}

interface EnhancedQueryInputProps {
  onSubmit: (query: string) => void
  placeholder?: string
  compact?: boolean
  showHistory?: boolean
  maxHistory?: number
}

export const EnhancedQueryInput = forwardRef<QueryInputRef, EnhancedQueryInputProps>(({
  onSubmit,
  placeholder = "你想分析什么数据？试试问：\"上个月新用户留存率是多少\"",
  compact = false,
  showHistory = true,
  maxHistory = 10
}, ref) => {
  const { mode } = useTheme()
  const { currentDatabase } = useDatabase()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const isDark = mode === 'dark'

  // 固定占位符，避免每次渲染都变化
  const [fixedPlaceholder] = useState(() => {
    const placeholders = [
      '试试问："上个月新用户留存率是多少？"',
      '或者问："哪个渠道的用户质量最高？"',
      '支持中英文自然语言查询'
    ]
    return placeholders[Math.floor(Math.random() * placeholders.length)]
  })

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    getValue: () => query,
    setValue: (val: string) => {
      setQuery(val)
      inputRef.current?.focus()
    },
  }))

  // 示例问题
  const exampleSuggestions: Suggestion[] = [
    {
      text: '上个月新用户留存率是多少？',
      icon: '📈',
      category: 'example'
    },
    {
      text: '对比一下这周和上周的转化率',
      icon: '📊',
      category: 'example'
    },
    {
      text: '哪个渠道带来的用户质量最高？',
      icon: '🎯',
      category: 'example'
    },
    {
      text: '分析用户流失的主要原因是什​​么？',
      icon: '🔍',
      category: 'example'
    }
  ]

  // 加载历史记录 - 只在组件挂载时加载一次
  useEffect(() => {
    loadHistory()
  }, [])

  // 显示建议 - 仅在聚焦且无内容时显示
  useEffect(() => {
    if (isFocused && query.length === 0 && showHistory) {
      setSuggestions(exampleSuggestions)
      setShowSuggestions(true)
    } else if (query.length > 0) {
      // 有内容时隐藏建议，避免闪烁
      setShowSuggestions(false)
    } else if (!isFocused) {
      setShowSuggestions(false)
    }
  }, [isFocused, query.length, showHistory])

  const loadHistory = async () => {
    if (!showHistory) return
    try {
      // 从 localStorage 加载历史
      const savedHistory = localStorage.getItem('query_history')
      if (savedHistory) {
        const history: QueryHistory[] = JSON.parse(savedHistory)
        const historySuggestions: Suggestion[] = history
          .slice(0, maxHistory)
          .map(h => ({
            text: h.query,
            icon: h.success ? '✅' : '❌',
            category: 'recent' as const
          }))
        // 只在组件挂载时设置历史，不频繁更新
        if (query.length === 0) {
          setSuggestions(historySuggestions)
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  }

  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      onSubmit(query)
      setQuery('')
      setShowSuggestions(false)
      setIsLoading(false)

      // 保存到历史
      try {
        const savedHistory = JSON.parse(localStorage.getItem('query_history') || '[]')
        savedHistory.unshift({
          query: query.trim(),
          timestamp: new Date(),
          success: true
        })
        localStorage.setItem('query_history', JSON.stringify(savedHistory.slice(0, 50)))
      } catch (error) {
        console.error('Failed to save history:', error)
      }
    }
  }, [query, onSubmit])

  const handleSuggestionSelect = (suggestion: Suggestion) => () => {
    setQuery(suggestion.text)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 上/下箭头选择建议
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : 0))
      } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault()
        handleSuggestionSelect(suggestions[selectedSuggestionIndex])()
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
      }
    }

    // Ctrl/Cmd + K 快速聚焦
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      inputRef.current?.focus()
    }
  }

  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`relative flex items-center gap-3 rounded-xl border transition-all duration-200 ${
          isFocused
            ? 'border-primary/50 ring-4 ring-primary/10'
            : 'border-white/[0.08] hover:border-white/12'
        } ${isDark ? 'bg-background-secondary' : 'bg-white'} p-3`}
      >
        <span className="text-2xl">💬</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true)
          }}
          onBlur={() => {
            setIsFocused(false)
            setTimeout(() => setShowSuggestions(false), 200)
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted outline-none text-base min-w-0"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-gray-100 text-gray-400'
            }`}
          >
            ✕
          </button>
        )}
      </motion.div>
    )
  }

  return (
    <div className={`${compact ? 'w-full' : 'w-full max-w-3xl mx-auto space-y-4'}`}>
      {/* 输入框 */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`relative rounded-2xl border transition-all duration-200 ${
          isFocused
            ? 'border-primary/50 ring-4 ring-primary/10 shadow-lg shadow-primary/20'
            : 'border-white/[0.08] hover:border-white/12'
        } ${isDark ? 'bg-background-secondary' : 'bg-white'} ${compact ? 'p-3' : 'p-4'}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true)
              if (query.length === 0) {
                setShowSuggestions(true)
              }
            }}
            onBlur={() => {
              setIsFocused(false)
              setTimeout(() => setShowSuggestions(false), 200)
            }}
            placeholder={query.length > 0 ? '' : fixedPlaceholder}
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted outline-none text-base min-w-0"
            autoFocus
          />
          {!compact && (
            <>
              {/* 数据库标签 - 放在输入框内部右侧 */}
              <span className={`px-2 py-1 text-xs rounded-lg flex-shrink-0 ${
                isDark
                  ? 'bg-background-tertiary text-text-muted'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {currentDatabase === 'postgresql' ? '🐘 PostgreSQL' : currentDatabase === 'mysql' ? '🐬 MySQL' : '🍃 MongoDB'}
              </span>
            </>
          )}
          {query && (
            <button
              onClick={() => setQuery('')}
              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-gray-100 text-gray-400'
              }`}
            >
              ✕
            </button>
          )}
          {!compact && (
            <button
              onClick={handleSubmit}
              disabled={!query.trim()}
              className="px-5 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 shadow-lg flex-shrink-0"
            >
              <span className="flex items-center gap-2">
                <span>🔍</span>
                <span>分析</span>
              </span>
            </button>
          )}
        </div>
      </motion.div>

      {/* 智能建议 */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            ref={suggestionsRef}
            className={`absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-xl z-50 overflow-hidden ${
              isDark
                ? 'bg-background-secondary border-white/[0.08]'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className={`p-3 border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              <div className="text-xs font-medium mb-1">建议</div>
              <div className="text-xs opacity-60">
                {suggestions.length} 项 • 使用 ↑↓ 选择 • Enter 确认
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  onClick={handleSuggestionSelect(suggestion)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                    selectedSuggestionIndex === index
                      ? isDark
                        ? 'bg-primary/20 text-primary'
                        : 'bg-blue-100 text-blue-700'
                      : isDark
                        ? 'hover:bg-white/5'
                        : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{suggestion.icon}</span>
                    <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                      {suggestion.text}
                    </span>
                    {suggestion.category === 'recent' && (
                      <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                        最近使用
                      </span>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

EnhancedQueryInput.displayName = 'EnhancedQueryInput'

export default EnhancedQueryInput
