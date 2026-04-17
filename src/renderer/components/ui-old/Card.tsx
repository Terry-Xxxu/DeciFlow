/**
 * Card - 卡片组件（支持双模式）
 */

import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  padding = 'md'
}) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  const paddingMap = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  return (
    <div
      className={`
        rounded-xl
        transition-all duration-200
        ${paddingMap[padding]}
        ${isDark
          ? 'bg-background-secondary border border-white/[0.08] shadow-sm'
          : 'bg-white border border-gray-200 shadow-sm'
        }
        ${hover ? (isDark ? 'hover:shadow-md hover:-translate-y-0.5' : 'hover:shadow-lg hover:-translate-y-0.5') : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
