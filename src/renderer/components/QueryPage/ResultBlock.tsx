/**
 * ResultBlock - 结果块组件（支持双模式）
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface ResultBlockProps {
  data: {
    sql: string
    data: any[]
    executionTime: number
  }
  queryText?: string
}

export const ResultBlock: React.FC<ResultBlockProps> = ({ data, queryText }) => {
  const { mode } = useTheme()
  const [showSQL, setShowSQL] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const isDark = mode === 'dark'

  // 保存为模板
  const handleSaveAsTemplate = async () => {
    if (!templateName.trim() || !queryText) return

    try {
      const result = await window.electronAPI.templates.create({
        name: templateName,
        description: templateDesc || templateName,
        naturalLanguage: queryText,
        sql: data.sql,
        tags: [],
        category: 'custom'
      })

      if (result.success) {
        setShowSaveDialog(false)
        setTemplateName('')
        setTemplateDesc('')
        // 显示成功提示
        alert('模板已保存！')
      }
    } catch (error) {
      console.error('保存模板失败:', error)
      alert('保存模板失败')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card p-6 rounded-2xl ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">Query Results</span>
          <span className="text-xs text-text-muted">•</span>
          <span className="text-xs text-text-muted">{data.data.length} rows</span>
          <span className="text-xs text-text-muted">•</span>
          <span className="text-xs text-text-muted">{data.executionTime}ms</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 保存模板按钮 */}
          {queryText && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                isDark
                  ? 'text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30'
                  : 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              📋 保存模板
            </button>
          )}
          <button
            onClick={() => setShowSQL(!showSQL)}
            className={`text-xs px-3 py-1 rounded-lg transition-colors ${
              isDark
                ? 'text-text-secondary hover:text-text-primary bg-background-tertiary hover:bg-background-elevated'
                : 'text-text-secondary hover:text-text-primary bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {showSQL ? 'Hide' : 'View'} SQL
          </button>
        </div>
      </div>

      {/* SQL */}
      {showSQL && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 p-4 rounded-xl bg-background-primary overflow-hidden"
        >
          <pre className="text-xs text-green-400 overflow-x-auto">{data.sql}</pre>
        </motion.div>
      )}

      {/* 数据表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              {Object.keys(data.data[0] || {}).map((key) => (
                <th key={key} className="px-4 py-3 text-left text-xs font-medium text-text-muted">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.data.slice(0, 5).map((row, index) => (
              <tr key={index} className={`border-b ${isDark ? 'border-white/[0.05]' : 'border-gray-100'} hover:bg-gray-50/50`}>
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

      {data.data.length > 5 && (
        <div className="text-center py-3 text-xs text-text-muted">
          Showing first 5 of {data.data.length} rows
        </div>
      )}

      {/* 保存模板对话框 */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowSaveDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-96 rounded-xl p-6 shadow-2xl ${
                isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border-gray-200'
              }`}
            >
              <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                保存为查询模板
              </h3>

              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    模板名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="例如：用户留存率分析"
                    className={`w-full px-3 py-2 rounded-lg text-sm ${
                      isDark
                        ? 'bg-slate-800 border border-slate-700 text-text-primary placeholder-slate-500'
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    描述（可选）
                  </label>
                  <textarea
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder="简要描述这个查询的用途"
                    rows={3}
                    className={`w-full px-3 py-2 rounded-lg text-sm resize-none ${
                      isDark
                        ? 'bg-slate-800 border border-slate-700 text-text-primary placeholder-slate-500'
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                </div>

                <div className={`p-3 rounded-lg text-xs ${
                  isDark
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <div className="font-medium mb-1">查询内容：</div>
                  <div className={`line-clamp-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {queryText || '无'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAsTemplate}
                    disabled={!templateName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setShowSaveDialog(false)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDark
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    取消
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
