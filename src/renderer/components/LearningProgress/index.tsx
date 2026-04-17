/**
 * LearningProgress - 学习进度和建议组件
 * 展示AI学习业务语言的进度和改进建议
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface LearningStats {
  totalQueries: number
  acceptanceRate: number
  correctionRate: number
  commonMistakes: Array<{ pattern: string; count: number }>
  improvedMappings: string[]
}

interface LearningProgressProps {
  onOpenMappingEditor?: () => void
}

export const LearningProgress: React.FC<LearningProgressProps> = ({ onOpenMappingEditor }) => {
  const { mode } = useTheme()
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const isDark = mode === 'dark'

  useEffect(() => {
    loadLearningData()
  }, [])

  const loadLearningData = async () => {
    try {
      // 获取学习分析数据
      const result = await window.electronAPI.learning.getAnalytics()
      if (result.success) {
        setStats(result.data)
      }

      // 获取学习建议
      const suggestionsResult = await window.electronAPI.learning.getSuggestions()
      if (suggestionsResult.success) {
        setSuggestions(suggestionsResult.data)
      }
    } catch (error) {
      console.error('Failed to load learning data:', error)
    }
  }

  if (!stats) {
    return (
      <div className={`p-6 rounded-xl border text-center ${isDark ? 'bg-slate-800/30 border-white/[0.05]' : 'bg-gray-50 border-gray-200'}`}>
        <div className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>
          使用次数增加后，AI 将学习您的业务语言
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
          <div className={`text-3xl font-bold mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            {stats.totalQueries}
          </div>
          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>
            学习查询
          </div>
        </div>

        <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
          <div className={`text-3xl font-bold mb-1 ${stats.acceptanceRate > 0.7 ? 'text-green-400' : stats.acceptanceRate > 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
            {(stats.acceptanceRate * 100).toFixed(0)}%
          </div>
          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>
            接受率
          </div>
        </div>

        <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
          <div className={`text-3xl font-bold mb-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
            {stats.improvedMappings.length}
          </div>
          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>
            学会指标
          </div>
        </div>
      </div>

      {/* 学习建议 */}
      {suggestions.length > 0 && (
        <div className={`p-4 rounded-xl border ${
          isDark
            ? 'bg-blue-500/10 border-blue-500/20'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎓</span>
            <h4 className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              学习建议
            </h4>
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div key={index} className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 常见错误 */}
      {stats.commonMistakes.length > 0 && (
        <div className={`p-4 rounded-xl border ${
          isDark
            ? 'bg-orange-500/10 border-orange-500/20'
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔧</span>
            <h4 className={`text-sm font-semibold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
              可改进项
            </h4>
          </div>
          <div className="space-y-2">
            {stats.commonMistakes.map((mistake, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${isDark ? 'bg-orange-500/5' : 'bg-orange-100'}`}
              >
                <div className="flex items-start justify-between">
                  <div className={`text-sm flex-1 ${isDark ? 'text-orange-300' : 'text-orange-900'}`}>
                    {mistake.pattern}
                  </div>
                  <div className={`text-xs font-medium ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                    {mistake.count}次
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={onOpenMappingEditor}
          className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors border ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/[0.08]'
              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
          }`}
        >
          📝 管理指标映射
        </button>
        <button
          className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors border ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/[0.08]'
              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
          }`}
        >
          📊 查看详细报告
        </button>
      </div>
    </div>
  )
}

/**
 * MappingEditor - 指标映射编辑器
 */
interface MappingEditorProps {
  isOpen: boolean
  onClose: () => void
}

export const MappingEditor: React.FC<MappingEditorProps> = ({ isOpen, onClose }) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  const [mappings, setMappings] = useState<Array<{
    businessName: string
    sqlExpression: string
    description: string
    category: string
    confidence: number
  }>>([])

  const [newMapping, setNewMapping] = useState({
    businessName: '',
    sqlExpression: '',
    description: '',
    category: 'custom'
  })

  useEffect(() => {
    if (isOpen) {
      loadMappings()
    }
  }, [isOpen])

  const loadMappings = async () => {
    try {
      const result = await window.electronAPI.learning.getMappings()
      if (result.success) {
        setMappings(result.data)
      }
    } catch (error) {
      console.error('Failed to load mappings:', error)
    }
  }

  const handleAddMapping = async () => {
    if (!newMapping.businessName || !newMapping.sqlExpression) return

    try {
      await window.electronAPI.learning.addMapping(newMapping)
      await loadMappings()
      setNewMapping({
        businessName: '',
        sqlExpression: '',
        description: '',
        category: 'custom'
      })
    } catch (error) {
      console.error('Failed to add mapping:', error)
    }
  }

  const handleDeleteMapping = async (businessName: string) => {
    try {
      await window.electronAPI.learning.removeMapping(businessName)
      setMappings(mappings.filter(m => m.businessName !== businessName))
    } catch (error) {
      console.error('Failed to delete mapping:', error)
    }
  }

  return (
    isOpen && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl border w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col ${
            isDark
              ? 'bg-[#111827] border-white/[0.08]'
              : 'bg-white border-gray-200'
          }`}
        >
          {/* 标题栏 */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                指标映射管理
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              ✕
            </button>
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 现有映射 */}
            {mappings.length > 0 && (
              <div>
                <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                  已学习的指标
                </h3>
                <div className="space-y-2">
                  {mappings.map((mapping) => (
                    <div
                      key={mapping.businessName}
                      className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800/50 border-white/[0.05]' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                            {mapping.businessName}
                          </div>
                          <div className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>
                            {mapping.description}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteMapping(mapping.businessName)}
                          className="text-red-500 hover:text-red-600 text-xs"
                        >
                          删除
                        </button>
                      </div>
                      <div className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                        {mapping.sqlExpression}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-1 text-xs rounded ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                          {mapping.category}
                        </span>
                        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                          置信度: {(mapping.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 添加新映射 */}
            <div>
              <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                添加自定义映射
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newMapping.businessName}
                  onChange={(e) => setNewMapping({ ...newMapping, businessName: e.target.value })}
                  placeholder="业务名称（如：新用户增长率）"
                  className={`w-full px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-slate-700 border border-slate-600 text-slate-200 placeholder-slate-500 focus:ring-blue-500/50'
                      : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500/20'
                  }`}
                />
                <input
                  type="text"
                  value={newMapping.sqlExpression}
                  onChange={(e) => setNewMapping({ ...newMapping, sqlExpression: e.target.value })}
                  placeholder="SQL 表达式（如：COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')）"
                  className={`w-full px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-slate-700 border border-slate-600 text-slate-200 placeholder-slate-500 focus:ring-blue-500/50'
                      : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500/20'
                  }`}
                />
                <input
                  type="text"
                  value={newMapping.description}
                  onChange={(e) => setNewMapping({ ...newMapping, description: e.target.value })}
                  placeholder="描述（如：过去7天注册的新用户比例）"
                  className={`w-full px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-slate-700 border border-slate-600 text-slate-200 placeholder-slate-500 focus:ring-blue-500/50'
                      : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500/20'
                  }`}
                />
                <button
                  onClick={handleAddMapping}
                  disabled={!newMapping.businessName || !newMapping.sqlExpression}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  + 添加映射
                </button>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className={`px-6 py-4 border-t flex justify-end ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm transition-colors"
            >
              完成
            </button>
          </div>
        </motion.div>
      </div>
    )
  )
}

export default LearningProgress
