/**
 * ResultCard - 结果卡片组件（支持双模式）
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface ResultCardProps {
  sql: string
  data: any[]
  executionTime: number
}

export const ResultCard: React.FC<ResultCardProps> = ({ sql, data, executionTime }) => {
  const { mode } = useTheme()
  const [showSQL, setShowSQL] = useState(false)
  const isDark = mode === 'dark'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">查询结果</span>
          <span className="text-xs text-text-muted">•</span>
          <span className="text-xs text-text-muted">{data.length} 行</span>
          <span className="text-xs text-text-muted">•</span>
          <span className="text-xs text-text-muted">{executionTime}ms</span>
        </div>
        <button
          onClick={() => setShowSQL(!showSQL)}
          className={`text-xs px-3 py-1 rounded-lg transition-colors ${
            isDark
              ? 'text-text-secondary hover:text-text-primary bg-background-tertiary hover:bg-background-elevated'
              : 'text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {showSQL ? '隐藏' : '查看'} SQL
        </button>
      </div>

      {/* SQL 预览 */}
      {showSQL && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={`mb-4 p-4 rounded-xl border ${
            isDark
              ? 'bg-background-primary border-white/[0.08]'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <pre className={`text-xs overflow-x-auto ${isDark ? 'text-green-400' : 'text-green-700'}`}>{sql}</pre>
        </motion.div>
      )}

      {/* 数据表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              {Object.keys(data[0] || {}).map((key) => (
                <th key={key} className="px-4 py-3 text-left text-xs font-medium text-text-primary">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((row, index) => (
              <tr key={index} className={`border-b transition-colors ${
                isDark
                  ? 'border-white/[0.05] hover:bg-white/[0.02]'
                  : 'border-gray-100 hover:bg-gray-50'
              }`}>
                {Object.values(row).map((value, i) => (
                  <td key={i} className="px-4 py-3 text-sm text-text-primary">
                    {value?.toString() || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 10 && (
        <div className={`text-center py-3 text-xs ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
          显示前 10 行，共 {data.length} 行
        </div>
      )}
    </motion.div>
  )
}
