/**
 * ExportDialog - 导出对话框组件
 * 支持导出为 PDF、Excel、PNG 格式
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Modal } from '../Modal'
import { useTheme } from '../../contexts/ThemeContext'
import { notificationManager } from '../NotificationCenter'

type ExportFormat = 'pdf' | 'excel' | 'png'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  data: {
    query: string
    sql: string
    result: any[]
    metrics?: any[]
    insights?: any[]
    conclusion?: any
  }
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, data }) => {
  const { mode } = useTheme()
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [includeSQL, setIncludeSQL] = useState(true)
  const [includeChart, setIncludeChart] = useState(true)
  const [includeInsights, setIncludeInsights] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [title, setTitle] = useState('')
  const isDark = mode === 'dark'

  const formatOptions = [
    {
      id: 'pdf' as ExportFormat,
      name: 'PDF 文档',
      icon: '📄',
      description: '适合打印和分享的文档格式',
      color: 'bg-red-500/20 text-red-400 border-red-500/30'
    },
    {
      id: 'excel' as ExportFormat,
      name: 'Excel 表格',
      icon: '📊',
      description: '可编辑的数据表格，包含多个工作表',
      color: 'bg-green-500/20 text-green-400 border-green-500/30'
    },
    {
      id: 'png' as ExportFormat,
      name: 'PNG 图片',
      icon: '🖼️',
      description: '高质量图片，适合演示文稿',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  ]

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const result = await window.electronAPI.export.export({
        query: data.query,
        sql: data.sql,
        data: data.result,
        metrics: data.metrics,
        insights: data.insights,
        conclusion: data.conclusion,
        chartType: includeChart ? 'auto' : undefined
      }, {
        format,
        includeSQL,
        includeChart,
        includeInsights,
        title: title || undefined
      })

      if (result.success) {
        notificationManager.success(
          '导出成功',
          `文件已保存至：${result.filePath}`
        )
        onClose()
      } else {
        notificationManager.error('导出失败', result.error || '未知错误')
      }
    } catch (error) {
      notificationManager.error('导出失败', error instanceof Error ? error.message : '未知错误')
    } finally {
      setIsExporting(false)
    }
  }

  const getFormatDescription = () => {
    const selected = formatOptions.find(f => f.id === format)
    return selected?.description || ''
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="space-y-6">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📤</span>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
              导出结果
            </h2>
          </div>
        </div>

        {/* 格式选择 */}
        <div className="space-y-3">
          <label className={`block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
            选择导出格式
          </label>
          <div className="grid grid-cols-3 gap-3">
            {formatOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setFormat(option.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  format === option.id
                    ? `${option.color} border-current`
                    : isDark
                      ? 'bg-slate-800/50 border-transparent hover:border-white/10'
                      : 'bg-gray-50 border-transparent hover:border-gray-200'
                }`}
              >
                <div className="text-2xl mb-2">{option.icon}</div>
                <div className={`font-semibold text-sm mb-1 ${
                  format === option.id ? 'text-current' : isDark ? 'text-slate-300' : 'text-gray-900'
                }`}>
                  {option.name}
                </div>
                <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 导出选项 */}
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
          <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
            导出内容
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSQL}
                onChange={(e) => setIncludeSQL(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                包含 SQL 语句
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeChart}
                onChange={(e) => setIncludeChart(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                包含图表
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInsights}
                onChange={(e) => setIncludeInsights(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                包含 AI 洞察
              </div>
            </label>
          </div>
        </div>

        {/* 自定义标题 */}
        <div className="space-y-2">
          <label className={`block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
            自定义标题（可选）
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="数据查询结果"
            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
              isDark
                ? 'bg-slate-700 border border-slate-600 text-slate-200 placeholder-slate-500 focus:ring-blue-500/50'
                : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500/20'
            }`}
          />
        </div>

        {/* 预览信息 */}
        <div className={`p-4 rounded-xl border ${
          isDark
            ? 'bg-blue-500/10 border-blue-500/20'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              <div className="font-medium mb-1">导出预览</div>
              <div className={`text-xs space-y-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                <div>• 格式：{getFormatDescription()}</div>
                <div>• 数据行数：{data.result.length} 行</div>
                {data.metrics && <div>• 指标数：{data.metrics.length} 个</div>}
                {data.insights && <div>• 洞察数：{data.insights.length} 条</div>}
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className={`flex justify-end gap-3 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-6 py-2 text-sm transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
          >
            {isExporting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>导出中...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>📤</span>
                <span>导出</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ExportDialog
