/**
 * LoadingState - 加载状态组件（支持双模式）
 */

import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export const LoadingState: React.FC = () => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className={`w-16 h-16 border-4 border-t-primary rounded-full animate-spin ${
          isDark
            ? 'border-primary/30'
            : 'border-blue-200'
        }`}></div>
      </div>
      <p className={`text-sm ${isDark ? 'text-text-secondary' : 'text-gray-600'}`}>
        正在查询数据...
      </p>
    </div>
  )
}
