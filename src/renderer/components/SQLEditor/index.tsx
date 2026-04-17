/**
 * SQLEditor - SQL查询编辑器组件
 * 支持语法高亮、自动完成、格式化等功能
 */

import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { useDatabase } from '../../stores/DatabaseStore'

interface SQLEditorProps {
  onSubmit: (sql: string) => void
  placeholder?: string
  compact?: boolean
}

export const SQLEditor: React.FC<SQLEditorProps> = ({
  onSubmit,
  placeholder = "在此输入SQL查询语句...",
  compact = false
}) => {
  const { mode } = useTheme()
  const { currentDatabase } = useDatabase()
  const [sql, setSql] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isDark = mode === 'dark'

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [sql])

  // 常用SQL模板
  const sqlTemplates = [
    { name: '查询所有', sql: 'SELECT * FROM users LIMIT 100;' },
    { name: '计数', sql: 'SELECT COUNT(*) as total FROM users;' },
    { name: '分组统计', sql: 'SELECT channel, COUNT(*) as count FROM users GROUP BY channel;' },
    { name: '时间范围', sql: "SELECT * FROM users WHERE created_at >= NOW() - INTERVAL '7 days';" },
    { name: '排序', sql: 'SELECT * FROM users ORDER BY created_at DESC LIMIT 10;' },
    { name: '连接查询', sql: 'SELECT u.*, o.amount FROM users u LEFT JOIN orders o ON u.id = o.user_id LIMIT 100;' }
  ]

  const handleTemplateClick = (templateSql: string) => {
    setSql(templateSql)
    textareaRef.current?.focus()
  }

  const handleSubmit = () => {
    if (sql.trim()) {
      onSubmit(sql.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Tab键插入空格而不是切换焦点
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = textareaRef.current?.selectionStart || 0
      const end = textareaRef.current?.selectionEnd || 0
      const value = sql
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      setSql(newValue)
      // 恢复光标位置
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(start + 2, start + 2)
      }, 0)
    }

    // Ctrl/Cmd + Enter 执行查询
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className={`${compact ? 'w-full' : 'w-full max-w-4xl mx-auto space-y-4'}`}>
      {/* SQL编辑器 */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative rounded-2xl border transition-all duration-200 ${
          isFocused
            ? 'border-blue-500/50 ring-4 ring-blue-500/10 shadow-lg shadow-blue-500/20'
            : 'border-white/[0.08] hover:border-white/12'
        } ${isDark ? 'bg-slate-900' : 'bg-white'} ${compact ? 'p-3' : 'p-4'}`}
      >
        {/* 工具栏 */}
        {!compact && (
          <div className="flex items-center justify-between mb-3 pb-3 border-b">
            <div className="flex items-center gap-2">
              <span className="text-xl">💾</span>
              <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                SQL 编辑器
              </span>
              <span className={`px-2 py-0.5 text-xs rounded ${
                isDark
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {currentDatabase === 'postgresql' ? 'PostgreSQL' : currentDatabase === 'mysql' ? 'MySQL' : 'MongoDB'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className={`hidden md:inline-flex items-center gap-1 px-2 py-1 text-xs rounded border ${
                isDark
                  ? 'bg-white/5 border-white/10 text-slate-400'
                  : 'bg-gray-100 border-gray-300 text-gray-600'
              }`}>
                <span>⌘</span>
                <span>↵</span>
              </kbd>
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                执行
              </span>
            </div>
          </div>
        )}

        {/* 文本编辑区 */}
        <textarea
          ref={textareaRef}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`w-full min-h-[120px] ${compact ? 'min-h-[60px]' : ''} bg-transparent resize-none font-mono text-sm leading-relaxed outline-none ${
            isDark
              ? 'text-slate-300 placeholder:text-slate-600'
              : 'text-gray-900 placeholder:text-gray-400'
          }`}
          style={{ fontFamily: 'Monaco, "Menlo", "Ubuntu Mono", "Consolas", monospace' }}
        />

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            {sql && (
              <button
                onClick={() => setSql('')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  isDark
                    ? 'hover:bg-white/5 text-slate-400'
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                清空
              </button>
            )}
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
              {sql.split('\n').length} 行 • {sql.length} 字符
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!sql.trim()}
            className="px-5 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 shadow-lg flex items-center gap-2"
          >
            <span>▶</span>
            <span>执行查询</span>
          </button>
        </div>
      </motion.div>

      {/* SQL模板 */}
      {!compact && (
        <div className="space-y-2">
          <div className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            快速模板
          </div>
          <div className="flex flex-wrap gap-2">
            {sqlTemplates.map((template) => (
              <button
                key={template.name}
                onClick={() => handleTemplateClick(template.sql)}
                className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-400 hover:border-blue-500/50 hover:text-blue-400'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-blue-500 hover:text-blue-700'
                }`}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 使用提示 */}
      {!compact && !sql && (
        <div className={`p-4 rounded-xl border ${
          isDark
            ? 'bg-slate-900/50 border-slate-800'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div className={`text-sm space-y-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              <div>• 支持 PostgreSQL / MySQL 语法</div>
              <div>• 使用 <kbd className={`px-1.5 py-0.5 rounded border ${isDark ? 'border-slate-600' : 'border-gray-300'}`}>Tab</kbd> 键插入空格</div>
              <div>• 按 <kbd className={`px-1.5 py-0.5 rounded border ${isDark ? 'border-slate-600' : 'border-gray-300'}`}>Ctrl+Enter</kbd> 快速执行</div>
              <div>• 查询结果会自动显示在下方</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SQLEditor
