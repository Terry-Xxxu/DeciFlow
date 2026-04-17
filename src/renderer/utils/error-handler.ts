/**
 * 错误处理系统
 * 统一处理应用中的错误，提供友好的错误提示
 */

import React from 'react'

export enum ErrorType {
  NETWORK = 'network',
  DATABASE = 'database',
  AI_SERVICE = 'ai_service',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown',
}

export enum ErrorSeverity {
  LOW = 'low',       // 不影响核心功能
  MEDIUM = 'medium', // 影响部分功能
  HIGH = 'high',     // 影响核心功能
  CRITICAL = 'critical', // 应用无法使用
}

export interface AppError {
  id: string
  type: ErrorType
  severity: ErrorSeverity
  code?: string
  message: string
  userMessage: string
  details?: string
  stack?: string
  timestamp: Date
  context?: Record<string, any>
  actionable: boolean
  actions?: Array<{
    label: string
    action: () => void
    primary?: boolean
  }>
}

class ErrorHandler {
  private errors: AppError[] = []
  private maxErrors = 100
  private errorCallbacks: Array<(error: AppError) => void> = []

  /**
   * 创建标准化的应用错误
   */
  createError(
    type: ErrorType,
    message: string,
    userMessage?: string,
    options?: {
      severity?: ErrorSeverity
      code?: string
      details?: string
      context?: Record<string, any>
      stack?: string
      actions?: AppError['actions']
    }
  ): AppError {
    const error: AppError = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity: options?.severity || ErrorSeverity.MEDIUM,
      message,
      userMessage: userMessage || this.getDefaultUserMessage(type),
      details: options?.details,
      code: options?.code,
      stack: options?.stack,
      timestamp: new Date(),
      context: options?.context,
      actionable: !!options?.actions,
      actions: options?.actions,
    }

    // 记录错误
    this.logError(error)

    // 通知监听器
    this.notifyCallbacks(error)

    return error
  }

  /**
   * 从普通 Error 创建 AppError
   */
  fromError(error: Error, type: ErrorType = ErrorType.UNKNOWN): AppError {
    return this.createError(
      type,
      error.message,
      undefined,
      {
        severity: ErrorSeverity.MEDIUM,
        stack: error.stack,
      }
    )
  }

  /**
   * 网络错误
   */
  networkError(message: string, context?: Record<string, any>): AppError {
    return this.createError(
      ErrorType.NETWORK,
      message,
      '网络连接失败，请检查您的网络设置',
      {
        severity: ErrorSeverity.HIGH,
        context,
        actions: [
          {
            label: '重试',
            action: () => window.location.reload(),
            primary: true,
          },
          {
            label: '检查网络',
            action: () => {
              // 打开网络设置或提供帮助
              console.log('Opening network settings...')
            },
          },
        ],
      }
    )
  }

  /**
   * 数据库错误
   */
  databaseError(message: string, context?: Record<string, any>): AppError {
    return this.createError(
      ErrorType.DATABASE,
      message,
      '数据库连接失败，请检查配置和连接状态',
      {
        severity: ErrorSeverity.HIGH,
        context,
        actions: [
          {
            label: '重新连接',
            action: () => {
              // 触发重新连接
              console.log('Reconnecting to database...')
            },
            primary: true,
          },
          {
            label: '检查配置',
            action: () => {
              // 打开配置页面
              console.log('Opening database config...')
            },
          },
        ],
      }
    )
  }

  /**
   * AI 服务错误
   */
  aiServiceError(message: string, context?: Record<string, any>): AppError {
    return this.createError(
      ErrorType.AI_SERVICE,
      message,
      'AI 服务调用失败，请检查 API Key 和配置',
      {
        severity: ErrorSeverity.MEDIUM,
        context,
        actions: [
          {
            label: '重新配置',
            action: () => {
              // 打开 AI 配置页面
              console.log('Opening AI config...')
            },
            primary: true,
          },
        ],
      }
    )
  }

  /**
   * 验证错误
   */
  validationError(message: string, field?: string): AppError {
    return this.createError(
      ErrorType.VALIDATION,
      message,
      field ? `请检查 "${field}" 字段` : '请检查输入信息',
      {
        severity: ErrorSeverity.LOW,
        context: { field },
      }
    )
  }

  /**
   * 权限错误
   */
  permissionError(message: string): AppError {
    return this.createError(
      ErrorType.PERMISSION,
      message,
      '您没有执行此操作的权限',
      {
        severity: ErrorSeverity.MEDIUM,
        actions: [
          {
            label: '了解更多',
            action: () => {
              // 打开帮助文档
              console.log('Opening permission help...')
            },
          },
        ],
      }
    )
  }

  /**
   * 获取默认用户友好的错误消息
   */
  private getDefaultUserMessage(type: ErrorType): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: '网络连接出现问题',
      [ErrorType.DATABASE]: '数据库操作失败',
      [ErrorType.AI_SERVICE]: 'AI 服务调用失败',
      [ErrorType.VALIDATION]: '输入信息有误',
      [ErrorType.PERMISSION]: '权限不足',
      [ErrorType.UNKNOWN]: '发生了未知错误',
    }
    return messages[type]
  }

  /**
   * 记录错误到本地存储
   */
  private logError(error: AppError): void {
    this.errors.push(error)

    // 限制错误数量
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }

    // 保存到 localStorage
    try {
      const errorLogs = this.getErrorLogs()
      errorLogs.push({
        id: error.id,
        type: error.type,
        severity: error.severity,
        message: error.message,
        timestamp: error.timestamp.toISOString(),
      })

      // 只保留最近 100 条
      if (errorLogs.length > 100) {
        errorLogs.splice(0, errorLogs.length - 100)
      }

      localStorage.setItem('error_logs', JSON.stringify(errorLogs))
    } catch (e) {
      console.error('Failed to save error log:', e)
    }
  }

  /**
   * 获取错误日志
   */
  getErrorLogs(): any[] {
    try {
      const logs = localStorage.getItem('error_logs')
      return logs ? JSON.parse(logs) : []
    } catch {
      return []
    }
  }

  /**
   * 清空错误日志
   */
  clearErrorLogs(): void {
    this.errors = []
    localStorage.removeItem('error_logs')
  }

  /**
   * 注册错误回调
   */
  onError(callback: (error: AppError) => void): () => void {
    this.errorCallbacks.push(callback)
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback)
    }
  }

  /**
   * 通知所有回调
   */
  private notifyCallbacks(error: AppError): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error)
      } catch (e) {
        console.error('Error callback failed:', e)
      }
    })
  }

  /**
   * 获取最近的错误
   */
  getRecentErrors(limit: number = 10): AppError[] {
    return this.errors.slice(-limit).reverse()
  }

  /**
   * 按类型获取错误
   */
  getErrorsByType(type: ErrorType): AppError[] {
    return this.errors.filter(e => e.type === type)
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): Record<ErrorType, number> {
    const stats: Record<ErrorType, number> = {
      [ErrorType.NETWORK]: 0,
      [ErrorType.DATABASE]: 0,
      [ErrorType.AI_SERVICE]: 0,
      [ErrorType.VALIDATION]: 0,
      [ErrorType.PERMISSION]: 0,
      [ErrorType.UNKNOWN]: 0,
    }

    this.errors.forEach(error => {
      stats[error.type]++
    })

    return stats
  }

  /**
   * 导出错误报告
   */
  exportErrorReport(): string {
    const report = {
      exportTime: new Date().toISOString(),
      totalErrors: this.errors.length,
      stats: this.getErrorStats(),
      errors: this.errors.map(e => ({
        id: e.id,
        type: e.type,
        severity: e.severity,
        message: e.message,
        timestamp: e.timestamp.toISOString(),
        context: e.context,
      })),
    }

    return JSON.stringify(report, null, 2)
  }
}

// 导出单例
export const errorHandler = new ErrorHandler()

// 便捷函数
export const handleAsync = async <T>(
  promise: Promise<T>,
  errorType: ErrorType = ErrorType.UNKNOWN
): Promise<T | null> => {
  try {
    return await promise
  } catch (error) {
    if (error instanceof Error) {
      throw errorHandler.fromError(error, errorType)
    }
    throw errorHandler.createError(errorType, String(error))
  }
}

// React Hook
export const useErrorHandler = () => {
  const [error, setError] = React.useState<AppError | null>(null)

  React.useEffect(() => {
    const unsubscribe = errorHandler.onError((err) => {
      setError(err)
    })

    return unsubscribe
  }, [])

  const clearError = () => setError(null)

  return {
    error,
    clearError,
    handleError: (error: Error | AppError, type?: ErrorType) => {
      if (error instanceof Error) {
        setError(errorHandler.fromError(error, type))
      } else {
        setError(error)
      }
    },
  }
}

export default errorHandler
