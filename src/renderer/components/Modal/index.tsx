/**
 * Modal - 通用模态对话框组件（支持双模式）
 * 用于替换原生 alert/confirm
 */

import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useTheme } from '../../contexts/ThemeContext'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'default' | 'lg' | 'auto'
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  zIndex?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'default',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  zIndex = 'z-50',
}) => {
  const { mode } = useTheme()
  const modalRef = useRef<HTMLDivElement>(null)
  const isDark = mode === 'dark'

  useEffect(() => {
    if (!isOpen) return

    // 处理 ESC 键关闭
    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)

    // 禁止背景滚动
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, closeOnEscape])

  // 聚焦管理
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      firstElement?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'w-[480px]',
    md: 'w-[600px]',
    default: 'w-[720px]',
    lg: 'w-[800px]',
    auto: 'w-[700px] max-h-[85vh]',
  }

  const sizeHeights = {
    sm: 'h-[400px]',
    md: 'h-[460px]',
    default: 'h-[520px]',
    lg: 'h-[600px]',
    auto: 'max-h-[85vh]',
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`relative ${sizeClasses[size]} ${sizeHeights[size]} rounded-2xl shadow-2xl border flex flex-col animate-slideIn overflow-hidden ${
          isDark
            ? 'bg-card border-border'
            : 'bg-white border-gray-200'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* 标题栏 */}
        {(title || showCloseButton) && (
          <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${
            isDark ? 'border-border' : 'border-gray-200'
          }`}>
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={`p-2 text-text-muted hover:text-text-primary rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                }`}
                aria-label="关闭"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 内容区 - 可滚动 */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${
          size === 'auto' ? 'px-6 pt-5 pb-6' : 'px-6 pt-4 pb-5'
        }`}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

// 预设的对话框类型
export interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  variant?: 'info' | 'warning' | 'error' | 'success'
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  variant = 'info',
}) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  const handleConfirm = () => {
    onConfirm?.()
    onClose()
  }

  const variantStyles = {
    info: {
      icon: 'ℹ️',
      iconBg: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
      iconText: isDark ? 'text-blue-400' : 'text-blue-600',
      confirmBtn: 'bg-blue-600 hover:bg-blue-500',
    },
    warning: {
      icon: '⚠️',
      iconBg: isDark ? 'bg-yellow-500/20' : 'bg-yellow-100',
      iconText: isDark ? 'text-yellow-400' : 'text-yellow-600',
      confirmBtn: 'bg-yellow-600 hover:bg-yellow-500',
    },
    error: {
      icon: '❌',
      iconBg: isDark ? 'bg-red-500/20' : 'bg-red-100',
      iconText: isDark ? 'text-red-400' : 'text-red-600',
      confirmBtn: 'bg-red-600 hover:bg-red-500',
    },
    success: {
      icon: '✅',
      iconBg: isDark ? 'bg-green-500/20' : 'bg-green-100',
      iconText: isDark ? 'text-green-400' : 'text-green-600',
      confirmBtn: 'bg-green-600 hover:bg-green-500',
    },
  }

  const style = variantStyles[variant]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="auto">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${style.iconBg} ${style.iconText} flex items-center justify-center flex-shrink-0`}>
          <span className="text-2xl">{style.icon}</span>
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{title}</h3>
          <p className={`leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{message}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            isDark
              ? 'text-slate-300 hover:text-slate-200 hover:bg-slate-700/50'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${style.confirmBtn}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  )
}

export interface PromptDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  placeholder?: string
  defaultValue?: string
  onConfirm: (value: string) => void
  confirmText?: string
  cancelText?: string
}

export const PromptDialog: React.FC<PromptDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  placeholder = '',
  defaultValue = '',
  onConfirm,
  confirmText = '确定',
  cancelText = '取消',
}) => {
  const { mode } = useTheme()
  const [value, setValue] = React.useState(defaultValue)
  const isDark = mode === 'dark'

  const handleConfirm = () => {
    onConfirm(value)
    setValue('')
    onClose()
  }

  const handleClose = () => {
    setValue('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm">
      <div className="space-y-4">
        <div>
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{title}</h3>
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{message}</p>
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={`input w-full`}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          autoFocus
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              isDark
                ? 'text-slate-300 hover:text-slate-200 hover:bg-slate-700/50'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!value.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// 全局对话框管理器
class DialogManager {
  private alertCallback: ((result: boolean) => void) | null = null
  private promptCallback: ((result: string | null) => void) | null = null

  // 使用示例：
  // const confirmed = await dialog.confirm('确定要删除吗？')
  async confirm(options: Omit<AlertDialogProps, 'isOpen' | 'onClose'>): Promise<boolean> {
    return new Promise((resolve) => {
      this.alertCallback = resolve
      // 这里需要配合状态管理使用
      // 实际使用时会通过 React 状态来控制
      resolve(true) // 临时返回
    })
  }

  async prompt(options: Omit<PromptDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>): Promise<string | null> {
    return new Promise((resolve) => {
      this.promptCallback = resolve
      resolve(null) // 临时返回
    })
  }
}

export const dialogManager = new DialogManager()

export default Modal
