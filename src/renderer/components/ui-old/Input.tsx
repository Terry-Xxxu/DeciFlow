/**
 * Input - 输入框组件（支持双模式）
 */

import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: string
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  return (
    <div className="space-y-2">
      {label && (
        <label className={`text-sm font-medium ${isDark ? 'text-text-secondary' : 'text-gray-700'}`}>{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-text-muted' : 'text-gray-400'}`}>{icon}</span>
        )}
        <input
          className={`
            w-full px-4 py-3
            rounded-2xl
            text-text-primary
            outline-none
            transition-all duration-200
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-danger' : ''}
            ${className}
            ${isDark
              ? 'bg-background-secondary border border-white/[0.08] placeholder:text-text-muted focus:border-primary/50 focus:ring-4 focus:ring-primary/10'
              : 'bg-white border border-gray-300 placeholder:text-gray-400 focus:border-primary/50 focus:ring-4 focus:ring-primary/10'
            }
          `}
          {...props}
        />
      </div>
      {error && (
        <p className={`text-xs ${isDark ? 'text-danger' : 'text-red-600'}`}>{error}</p>
      )}
    </div>
  )
}
