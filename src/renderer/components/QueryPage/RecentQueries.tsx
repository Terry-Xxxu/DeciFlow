/**
 * RecentQueries - 最近查询组件（支持双模式）
 */

import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export const RecentQueries: React.FC = () => {
  const { mode } = useTheme()
  const [recent] = React.useState([
    '上个月新用户留存率是多少？',
    '对比一下这周和上周的转化率',
  ])
  const isDark = mode === 'dark'

  if (recent.length === 0) return null

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className={`text-xs text-center mb-3 ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
        最近查询
      </div>
      <div className="space-y-2">
        {recent.map((query, index) => (
          <button
            key={index}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  )
}
