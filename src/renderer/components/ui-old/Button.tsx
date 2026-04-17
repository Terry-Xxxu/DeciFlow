/**
 * Button - 按钮组件（支持双模式）
 */

import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  onClick,
  type = 'button'
}) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    primary: isDark
      ? 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
      : 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 shadow-md hover:shadow-lg hover:-translate-y-0.5',
    secondary: isDark
      ? 'bg-background-tertiary text-text-primary hover:bg-background-elevated border border-white/[0.08]'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200',
    ghost: isDark
      ? 'text-text-secondary hover:text-text-primary hover:bg-white/[0.05]'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
    danger: 'bg-danger text-white hover:bg-red-600',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </button>
  )
}
