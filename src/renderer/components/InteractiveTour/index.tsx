/**
 * InteractiveTour - 交互式应用引导系统
 * 为新用户提供逐步的功能介绍和使用指导
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

export interface TourStep {
  id: string
  title: string
  description: string
  target: string // CSS selector for the target element
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: () => void // Optional action to perform when this step is shown
  image?: string // Optional illustrative image
  spotlightPadding?: number // Padding around the spotlight
  skipable?: boolean // Whether this step can be skipped
}

interface InteractiveTourProps {
  steps: TourStep[]
  isOpen: boolean
  onComplete: () => void
  onSkip?: () => void
  currentStepIndex?: number
  onStepChange?: (index: number) => void
  showProgress?: boolean
  showSkipButton?: boolean
}

export const InteractiveTour: React.FC<InteractiveTourProps> = ({
  steps,
  isOpen,
  onComplete,
  onSkip,
  currentStepIndex = 0,
  onStepChange,
  showProgress = true,
  showSkipButton = true
}) => {
  const [currentIndex, setCurrentIndex] = useState(currentStepIndex)
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({})

  const currentStep = steps[currentIndex]
  const isLastStep = currentIndex === steps.length - 1
  const progress = ((currentIndex + 1) / steps.length) * 100

  // 更新步骤
  useEffect(() => {
    setCurrentIndex(currentStepIndex)
  }, [currentStepIndex])

  // 计算高亮区域位置
  const updateHighlightPosition = useCallback(() => {
    if (!isOpen || !currentStep) {
      setHighlightRect(null)
      return
    }

    // 全屏引导（没有特定目标）
    if (currentStep.target === 'body' || currentStep.target === 'center') {
      setHighlightRect(null)
      setSpotlightStyle({})
      return
    }

    const targetElement = document.querySelector(currentStep.target)
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect()
      const padding = currentStep.spotlightPadding || 8

      setHighlightRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        right: rect.right + padding,
        bottom: rect.bottom + padding,
        x: rect.x - padding,
        y: rect.y - padding,
        toJSON: () => ''
      })

      // 设置聚光灯位置
      setSpotlightStyle({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2
      })
    } else {
      // 找不到目标元素时，降级到全屏显示
      console.warn(`Tour target not found: ${currentStep.target}`)
      setHighlightRect(null)
      setSpotlightStyle({})
    }
  }, [isOpen, currentStep])

  // 监听步骤变化和窗口大小变化
  useEffect(() => {
    updateHighlightPosition()

    const handleResize = () => updateHighlightPosition()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateHighlightPosition])

  // 执行步骤动作
  useEffect(() => {
    if (isOpen && currentStep?.action) {
      currentStep.action()
    }
  }, [isOpen, currentStep])

  // 导航函数
  const goToNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      onStepChange?.(nextIndex)
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1
      setCurrentIndex(prevIndex)
      onStepChange?.(prevIndex)
    }
  }

  const handleSkip = () => {
    onSkip?.()
    onComplete()
  }

  const goToStep = (index: number) => {
    setCurrentIndex(index)
    onStepChange?.(index)
  }

  // 计算卡片位置
  const getCardPosition = (): React.CSSProperties => {
    if (!highlightRect || currentStep.target === 'body' || currentStep.target === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '90vw',
        width: '500px'
      }
    }

    const position = currentStep.position || 'bottom'
    const cardWidth = 400
    const cardHeight = 300
    const offset = 20

    let top = 0
    let left = 0

    switch (position) {
      case 'top':
        top = highlightRect.top - cardHeight - offset
        left = highlightRect.left + highlightRect.width / 2 - cardWidth / 2
        break
      case 'bottom':
        top = highlightRect.bottom + offset
        left = highlightRect.left + highlightRect.width / 2 - cardWidth / 2
        break
      case 'left':
        top = highlightRect.top + highlightRect.height / 2 - cardHeight / 2
        left = highlightRect.left - cardWidth - offset
        break
      case 'right':
        top = highlightRect.top + highlightRect.height / 2 - cardHeight / 2
        left = highlightRect.right + offset
        break
    }

    // 边界检查
    const maxLeft = window.innerWidth - cardWidth - 20
    const maxTop = window.innerHeight - cardHeight - 20

    left = Math.max(20, Math.min(left, maxLeft))
    top = Math.max(20, Math.min(top, maxTop))

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      maxWidth: '90vw',
      width: '500px'
    }
  }

  if (!isOpen || !currentStep) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* 聚光灯效果 */}
      {highlightRect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute border-4 border-blue-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] pointer-events-none transition-all"
          style={spotlightStyle}
        >
          {/* 脉冲动画 */}
          <div className="absolute inset-0 border-2 border-blue-400 rounded-lg animate-ping opacity-30" />
        </motion.div>
      )}

      {/* 引导卡片 */}
      <motion.div
        key={currentStep.id}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden"
        style={getCardPosition()}
      >
        {/* 进度条 */}
        {showProgress && (
          <div className="h-1 bg-gray-200 dark:bg-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        {/* 内容 */}
        <div className="p-6">
          {/* 标题 */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {currentStep.title}
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {currentIndex + 1} / {steps.length}
              </div>
            </div>
            {currentStep.image && (
              <span className="text-4xl">{currentStep.image}</span>
            )}
          </div>

          {/* 描述 */}
          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            {currentStep.description}
          </p>

          {/* 步骤指示器 */}
          {showProgress && (
            <div className="flex justify-center gap-1.5 mb-6">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => goToStep(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'w-8 bg-blue-500'
                      : index < currentIndex
                      ? 'bg-blue-300 dark:bg-blue-700'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-label={`跳转到第 ${index + 1} 步`}
                />
              ))}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between gap-3">
            {/* 返回按钮 */}
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentIndex === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              上一步
            </button>

            <div className="flex gap-2">
              {/* 跳过按钮 */}
              {showSkipButton && currentStep.skipable !== false && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  跳过引导
                </button>
              )}

              {/* 下一步/完成按钮 */}
              <button
                onClick={goToNext}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl"
              >
                {isLastStep ? '完成' : '下一步'}
              </button>
            </div>
          </div>
        </div>

        {/* 装饰元素 */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-bl-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-tr-full pointer-events-none" />
      </motion.div>

      {/* 键盘快捷键提示 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
        <kbd className="px-2 py-1 bg-gray-800/50 dark:bg-white/5 rounded border border-gray-700 dark:border-white/10">
          ← →
        </kbd>
        <span>导航步骤</span>
        <kbd className="px-2 py-1 bg-gray-800/50 dark:bg-white/5 rounded border border-gray-700 dark:border-white/10">
          Esc
        </kbd>
        <span>关闭</span>
      </div>
    </div>,
    document.body
  )
}

export default InteractiveTour

/**
 * Hook 用于管理引导状态
 */
export const useTour = (tourId: string) => {
  const storageKey = `tour_completed_${tourId}`

  const [isCompleted, setIsCompleted] = useState(() => {
    return localStorage.getItem(storageKey) === 'true'
  })

  const [isSkipped, setIsSkipped] = useState(() => {
    return localStorage.getItem(`${storageKey}_skipped`) === 'true'
  })

  const completeTour = useCallback(() => {
    localStorage.setItem(storageKey, 'true')
    localStorage.removeItem(`${storageKey}_skipped`)
    setIsCompleted(true)
    setIsSkipped(false)
  }, [storageKey])

  const skipTour = useCallback(() => {
    localStorage.setItem(`${storageKey}_skipped}`, 'true')
    setIsSkipped(true)
  }, [storageKey])

  const resetTour = useCallback(() => {
    localStorage.removeItem(storageKey)
    localStorage.removeItem(`${storageKey}_skipped}`)
    setIsCompleted(false)
    setIsSkipped(false)
  }, [storageKey])

  const shouldShowTour = useCallback(() => {
    return !isCompleted && !isSkipped
  }, [isCompleted, isSkipped])

  return {
    isCompleted,
    isSkipped,
    completeTour,
    skipTour,
    resetTour,
    shouldShowTour
  }
}
