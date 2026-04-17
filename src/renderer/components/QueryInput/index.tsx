import React, { forwardRef, useEffect, useState } from 'react'
import { useDatabase } from '../../stores/DatabaseStore'
import { DatabaseSelector } from '../DatabaseSelector'

interface QueryInputProps {
  ref?: React.RefObject<HTMLInputElement>
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  examples?: Array<{ text: string; icon: string }>
  compact?: boolean
}

export const QueryInput = forwardRef<HTMLInputElement, QueryInputProps>(({
  value,
  onChange,
  onSubmit,
  placeholder,
  examples = [],
  compact = false
}, ref) => {
  const { currentDatabase } = useDatabase()
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref) {
      (ref as any).current = inputRef.current
    }
  }, [ref])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className={compact ? 'w-full' : 'w-full max-w-2xl mx-auto'}>
      <div
        className={`
          relative bg-background-secondary rounded-2xl border transition-all duration-200
          ${isFocused ? 'border-brand-primary/50 ring-4 ring-brand-primary/10' : 'border-white/[0.08]'}
          ${compact ? 'p-3' : 'p-4'}
        `}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none text-base"
          />
          {!compact && (
            <button
              onClick={onSubmit}
              disabled={!value.trim()}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <span>🔍</span>
                <span>查询</span>
              </span>
            </button>
          )}
        </div>

        {/* 数据库选择器 */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <DatabaseSelector compact />
        </div>
      </div>

      {/* 示例问题 */}
      {!compact && examples.length > 0 && !value && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs text-text-muted self-center">试试：</span>
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => onChange(example.text)}
              className="px-3 py-1.5 text-xs bg-background-tertiary hover:bg-background-elevated text-text-secondary rounded-xl transition-all border border-white/[0.05] hover:border-white/[0.1]"
            >
              {example.icon} {example.text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
