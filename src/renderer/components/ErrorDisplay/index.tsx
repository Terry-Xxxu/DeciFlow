/**
 * ErrorDisplay - 错误显示组件（支持双模式）
 * 在应用中显示错误信息和处理建议
 */

import React from 'react'
import { AppError, ErrorSeverity, errorHandler } from '../../utils/error-handler'
import { useTheme } from '../../contexts/ThemeContext'
import {
  AlertTriangle, AlertCircle, AlertOctagon, XCircle, Inbox, Zap
} from 'lucide-react'

interface ErrorDisplayProps {
  error: AppError | null
  onDismiss: () => void
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  if (!error) return null

  const getSeverityColor = (severity: ErrorSeverity) => {
    if (isDark) {
      switch (severity) {
        case ErrorSeverity.LOW:      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        case ErrorSeverity.MEDIUM:   return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
        case ErrorSeverity.HIGH:     return 'bg-red-500/20 text-red-400 border-red-500/30'
        case ErrorSeverity.CRITICAL: return 'bg-red-600/20 text-red-500 border-red-600/30'
        default:                     return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      }
    }
    switch (severity) {
      case ErrorSeverity.LOW:      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case ErrorSeverity.MEDIUM:   return 'bg-orange-100 text-orange-700 border-orange-200'
      case ErrorSeverity.HIGH:     return 'bg-red-100 text-red-700 border-red-200'
      case ErrorSeverity.CRITICAL: return 'bg-red-200 text-red-800 border-red-300'
      default:                     return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: ErrorSeverity) => {
    const cls = 'w-5 h-5 flex-shrink-0'
    switch (severity) {
      case ErrorSeverity.LOW:      return <AlertTriangle className={cls} />
      case ErrorSeverity.MEDIUM:   return <AlertCircle className={cls} />
      case ErrorSeverity.HIGH:     return <AlertOctagon className={cls} />
      case ErrorSeverity.CRITICAL: return <AlertOctagon className={cls} />
      default:                     return <XCircle className={cls} />
    }
  }

  return (
    <div className="fixed top-4 right-4 max-w-md w-full z-50 animate-slideIn">
      <div className={`p-4 rounded-xl border ${getSeverityColor(error.severity)}`}>
        <div className="flex items-start gap-3">
          {getSeverityIcon(error.severity)}

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1">{error.userMessage}</h4>

            {error.message !== error.userMessage && (
              <p className="text-xs opacity-80 mb-2">{error.message}</p>
            )}

            {error.details && (
              <details className="text-xs mt-2">
                <summary className="cursor-pointer hover:opacity-80">详细信息</summary>
                <pre className={`mt-2 p-2 rounded overflow-x-auto ${isDark ? 'bg-black/20' : 'bg-black/5'}`}>
                  {error.details}
                </pre>
              </details>
            )}

            {error.actionable && error.actions && error.actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {error.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      action.primary
                        ? isDark
                          ? 'bg-white/20 hover:bg-white/30 text-white font-medium'
                          : 'bg-white/50 hover:bg-white/70 text-gray-900 font-medium'
                        : isDark
                          ? 'bg-black/20 hover:bg-black/30 text-white/80'
                          : 'bg-black/10 hover:bg-black/20 text-gray-700'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onDismiss}
            className={`p-1 rounded transition-colors flex-shrink-0 ${isDark ? 'hover:bg-black/20' : 'hover:bg-black/5'}`}
            aria-label="关闭"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 错误边界组件
 * 捕获 React 组件树中的错误
 */

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)

    errorHandler.createError(
      'unknown' as any,
      error.message,
      '组件渲染出错',
      {
        severity: 'critical' as any,
        stack: error.stack,
        details: errorInfo.componentStack,
      }
    )
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />
      }

      return <ErrorFallback error={this.state.error!} resetError={this.resetError} />
    }

    return this.props.children
  }
}

/**
 * 默认错误回退 UI
 */
interface ErrorFallbackProps {
  error: Error
  resetError: () => void
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  return (
    <div className={`flex items-center justify-center min-h-screen p-6 ${
      isDark ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-md w-full text-center">
        <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
          isDark ? 'bg-red-500/20' : 'bg-red-100'
        }`}>
          <Zap className={`w-10 h-10 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
        </div>
        <h1 className={`text-2xl font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>出错了</h1>
        <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          应用遇到了一个意外错误。您可以尝试刷新页面或重新启动应用。
        </p>
        <div className="space-y-3">
          <button
            onClick={resetError}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            重试
          </button>
          <button
            onClick={() => window.location.reload()}
            className={`w-full px-6 py-3 rounded-lg transition-colors ${
              isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            刷新页面
          </button>
        </div>

        {error && (
          <details className="mt-6 text-left">
            <summary className={`text-sm cursor-pointer ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
              技术详情
            </summary>
            <pre className={`mt-2 p-4 rounded-lg text-xs overflow-x-auto ${
              isDark ? 'bg-slate-800 text-red-400' : 'bg-gray-100 text-red-600'
            }`}>
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

/**
 * 加载状态组件
 */

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; message?: string }> = ({
  size = 'md',
  message,
}) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin`} />
      {message && <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{message}</p>}
    </div>
  )
}

/**
 * 空状态组件
 */

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className={`w-16 h-16 mb-4 rounded-2xl flex items-center justify-center ${
        isDark ? 'bg-slate-800' : 'bg-gray-100'
      }`}>
        {icon ?? <Inbox className={`w-8 h-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />}
      </div>
      <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>{title}</h3>
      {description && <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default ErrorDisplay
