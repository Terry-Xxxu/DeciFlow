/**
 * SensitiveFieldAlert - 敏感字段识别警告组件
 * 展示检测到的敏感字段并提供脱敏建议
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface SensitiveField {
  tableName: string
  columnName: string
  fieldType: string
  confidence: 'high' | 'medium' | 'low'
  sampleValue?: string
  recommendation: string
}

interface DetectionResult {
  sensitiveFields: SensitiveField[]
  totalFields: number
  riskLevel: 'low' | 'medium' | 'high'
  recommendations: string[]
}

interface SensitiveFieldAlertProps {
  result: DetectionResult
  onConfirm: () => void
  onApplyMasking: () => void
}

export const SensitiveFieldAlert: React.FC<SensitiveFieldAlertProps> = ({
  result,
  onConfirm,
  onApplyMasking
}) => {
  const { mode } = useTheme()
  const [showDetails, setShowDetails] = useState(false)
  const [selectedField, setSelectedField] = useState<SensitiveField | null>(null)
  const [enableMasking, setEnableMasking] = useState(true)
  const isDark = mode === 'dark'

  const getRiskBadge = () => {
    switch (result.riskLevel) {
      case 'high':
        return (
          <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-medium">
            🔴 高风险
          </span>
        )
      case 'medium':
        return (
          <span className="px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full text-xs font-medium">
            🟡 中风险
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-medium">
            🟢 低风险
          </span>
        )
    }
  }

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-red-500/20 text-red-400 border-red-500/30',
      medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
    const labels = {
      high: '高置信度',
      medium: '中置信度',
      low: '低置信度'
    }
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${colors[confidence as keyof typeof colors]}`}>
        {labels[confidence as keyof typeof labels]}
      </span>
    )
  }

  const getFieldTypeIcon = (fieldType: string) => {
    const icons: Record<string, string> = {
      email: '📧',
      phone: '📱',
      id_card: '🪪',
      password: '🔑',
      credit_card: '💳',
      address: '📍',
      name: '👤',
      ssn: '📋',
      secret_key: '🔐',
      other: '⚠️'
    }
    return icons[fieldType] || icons.other
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-6 space-y-6 ${
        isDark
          ? 'bg-orange-500/10 border-orange-500/30'
          : 'bg-orange-50 border-orange-200'
      }`}
    >
      {/* 标题 */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-orange-500/20' : 'bg-orange-100'
          }`}>
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
              检测到敏感字段
            </h3>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              我们在您的数据库中发现了可能包含敏感信息的字段
            </p>
          </div>
        </div>
        {getRiskBadge()}
      </div>

      {/* 统计 */}
      <div className={`p-4 rounded-xl grid grid-cols-3 gap-4 ${
        isDark ? 'bg-slate-800/50' : 'bg-white'
      }`}>
        <div className="text-center">
          <div className={`text-2xl font-bold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
            {result.sensitiveFields.length}
          </div>
          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
            敏感字段
          </div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
            {result.totalFields}
          </div>
          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
            总字段数
          </div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold text-orange-500`}>
            {Math.round((result.sensitiveFields.length / result.totalFields) * 100)}%
          </div>
          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
            占比
          </div>
        </div>
      </div>

      {/* 建议 */}
      {result.recommendations.length > 0 && (
        <div className={`p-4 rounded-xl space-y-2 ${
          isDark ? 'bg-slate-800/50' : 'bg-white'
        }`}>
          <div className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
            💡 安全建议：
          </div>
          {result.recommendations.map((rec, index) => (
            <div key={index} className={`text-xs flex items-start gap-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              <span className="mt-0.5">•</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      )}

      {/* 字段列表 */}
      <div className="space-y-3">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`w-full p-3 rounded-xl text-left flex items-center justify-between transition-colors ${
            isDark
              ? 'bg-slate-800/50 hover:bg-slate-800'
              : 'bg-white hover:bg-gray-50'
          }`}
        >
          <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
            {showDetails ? '隐藏' : '查看'}详细字段列表 ({result.sensitiveFields.length})
          </span>
          <span className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2">
                {result.sensitiveFields.map((field, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedField(field)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border border-border hover:border-border/50 bg-muted/30 hover:bg-muted/50 ${selectedField === field ? 'border-primary/50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getFieldTypeIcon(field.fieldType)}</span>
                        <div>
                          <div className={`font-medium text-sm ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                            {field.columnName}
                          </div>
                          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                            {field.tableName}
                          </div>
                        </div>
                      </div>
                      {getConfidenceBadge(field.confidence)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 选中字段详情 */}
      <AnimatePresence>
        {selectedField && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getFieldTypeIcon(selectedField.fieldType)}</span>
                <h4 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                  {selectedField.columnName}
                </h4>
              </div>
              <button
                onClick={() => setSelectedField(null)}
                className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                  isDark
                    ? 'hover:bg-slate-700 text-slate-500 hover:text-slate-300'
                    : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className={isDark ? 'text-slate-500' : 'text-gray-500'}>类型</span>
                <span className={isDark ? 'text-slate-300' : 'text-gray-900'}>
                  {selectedField.fieldType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-slate-500' : 'text-gray-500'}>置信度</span>
                <span>{getConfidenceBadge(selectedField.confidence)}</span>
              </div>
              {selectedField.sampleValue && (
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-500' : 'text-gray-500'}>示例值</span>
                  <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                    {selectedField.fieldType === 'email'
                      ? selectedField.sampleValue.replace(/(.{2}).*(@.*)/, '$1***$2')
                      : selectedField.fieldType === 'phone'
                        ? selectedField.sampleValue.replace(/(\d{3}).*(\d{4})/, '$1****$2')
                        : '***'}
                  </span>
                </div>
              )}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-900/50' : 'bg-gray-100'}`}>
                <div className={`text-xs mb-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>建议</div>
                <div className={isDark ? 'text-slate-300' : 'text-gray-900'}>
                  {selectedField.recommendation}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 脱敏选项 */}
      <div className={`p-4 rounded-xl space-y-3 ${
        isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
      }`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enableMasking}
            onChange={(e) => setEnableMasking(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              自动启用数据脱敏
            </div>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              查询结果中的敏感字段将自动脱敏显示（如：u***@example.com, 138****5678）
            </div>
          </div>
        </label>

        {enableMasking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`pl-7 text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}
          >
            <div>• 邮箱：显示前1位 + *** + 域名</div>
            <div>• 手机号：显示前3位 + **** + 后4位</div>
            <div>• 身份证：显示前6位 + ******** + 后4位</div>
            <div>• 您可以随时在设置中关闭或自定义脱敏规则</div>
          </motion.div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20"
        >
          我已了解，继续连接
        </button>
        {result.sensitiveFields.length > 0 && (
          <button
            onClick={onApplyMasking}
            className={`px-4 py-3 rounded-xl font-medium transition-colors border ${
              'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border'
            }`}
          >
            配置脱敏规则
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default SensitiveFieldAlert
