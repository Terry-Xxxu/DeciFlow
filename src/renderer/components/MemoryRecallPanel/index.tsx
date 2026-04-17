/**
 * 记忆召回面板 - 展示智能检索到的相关历史
 *
 * 功能：
 * - 根据用户问题智能检索相关历史对话
 * - 展示相似度评分
 * - 提供追问建议
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface SemanticMemory {
  memoryId: string
  sessionId: string
  content: string
  intent: string
  similarity: number
  timestamp: number
}

interface RecallResult {
  relevantMemories: Array<{
    memory: SemanticMemory
    similarity: number
  }>
  summary: string
  suggestedQuestions: string[]
  confidence: number
}

interface MemoryRecallPanelProps {
  query: string
  onSelectMemory?: (memory: SemanticMemory) => void
  onAskQuestion?: (question: string) => void
}

export const MemoryRecallPanel: React.FC<MemoryRecallPanelProps> = ({
  query,
  onSelectMemory,
  onAskQuestion
}) => {
  const { mode } = useTheme()
  const [result, setResult] = useState<RecallResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const isDark = mode === 'dark'

  useEffect(() => {
    if (query && isOpen) {
      performRecall()
    }
  }, [query, isOpen])

  const performRecall = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const response = await window.electronAPI.memory.recall(query, { topK: 5 })
      if (response.success && response.data) {
        setResult(response.data)
      }
    } catch (error) {
      console.error('记忆召回失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          isDark
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        <span>🔍</span>
        <span>查找相关历史</span>
      </button>
    )
  }

  return (
    <div className={`w-96 border-l flex flex-col ${
      isDark
        ? 'bg-[#0a101f]/80 border-white/5'
        : 'bg-white border-gray-200'
    }`}>
      {/* 头部 */}
      <div className={`h-14 flex items-center justify-between px-4 ${
        isDark ? 'border-b border-white/5' : 'border-b border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="text-sm font-medium text-text-primary">相关历史</span>
          {result && (
            <span className={`text-xs px-2 py-0.5 rounded ${
              result.confidence > 0.7
                ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                : isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
            }`}>
              置信度: {(result.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
            isDark
              ? 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
              : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
          }`}
        >
          ✕
        </button>
      </div>

      {/* 查询显示 */}
      <div className={`px-4 py-3 border-b ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>查询</p>
        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{query}</p>
      </div>

      {/* 摘要 */}
      {result?.summary && (
        <div className={`px-4 py-3 border-b ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>摘要</p>
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{result.summary}</p>
        </div>
      )}

      {/* 相关记忆 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex gap-1">
              <div className={`w-2 h-2 rounded-full animate-bounce ${
                isDark ? 'bg-slate-500' : 'bg-gray-400'
              }`} />
              <div className={`w-2 h-2 rounded-full animate-bounce delay-100 ${
                isDark ? 'bg-slate-500' : 'bg-gray-400'
              }`} />
              <div className={`w-2 h-2 rounded-full animate-bounce delay-200 ${
                isDark ? 'bg-slate-500' : 'bg-gray-400'
              }`} />
            </div>
          </div>
        ) : result?.relevantMemories.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
            没有找到相关历史
          </div>
        ) : (
          result?.relevantMemories.map((item, index) => (
            <motion.div
              key={item.memory.memoryId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                isDark
                  ? 'bg-slate-900 border-slate-700 hover:border-blue-500/50'
                  : 'bg-gray-50 border-gray-200 hover:border-blue-500'
              }`}
              onClick={() => onSelectMemory?.(item.memory)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                    {item.memory.content}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-gray-600'
                    }`}>
                      {item.memory.intent}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                      {new Date(item.memory.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className={`text-sm font-medium ${
                  item.similarity > 0.8
                    ? 'text-green-500'
                    : item.similarity > 0.6
                    ? 'text-yellow-500'
                    : 'text-gray-400'
                }`}>
                  {(item.similarity * 100).toFixed(0)}%
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* 追问建议 */}
      {result?.suggestedQuestions.length > 0 && onAskQuestion && (
        <div className={`p-4 border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
          <p className={`text-xs mb-2 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>继续追问</p>
          <div className="flex flex-wrap gap-2">
            {result.suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => onAskQuestion(question)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  isDark
                    ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                }`}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MemoryRecallPanel
