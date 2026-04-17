/**
 * QueryPage - 首页（支持浅色/暗色双模式）
 * 统一的自然语言查询，根据AI配置自动切换处理模式
 */

import React, { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIState } from '../../hooks/useUIState'
import { useTheme } from '../../contexts/ThemeContext'
import { useDatabase } from '../../stores/DatabaseStore'
import { EnhancedQueryInput, type QueryInputRef } from '../EnhancedQueryInput'
import { ResultBlock } from './ResultBlock'
import { AnalyzeButton } from './AnalyzeButton'
import { InsightSection } from './InsightSection'
import { RecentQueries } from './RecentQueries'
import { ExampleQuestions } from './ExampleQuestions'
import { LoadingState } from './LoadingState'
import { useRegisterShortcuts, commonShortcuts } from '../../hooks/useRegisterShortcuts'
import { QueryTemplatesPanel } from '../QueryTemplatesPanel'
import type { QueryTemplate } from '../QueryTemplatesPanel'
import { Bot, Zap, ClipboardList, TrendingUp, BarChart3, Target } from 'lucide-react'

export const QueryPage: React.FC = () => {
  const {
    state,
    queryData,
    analysisData,
    config,
    startQuery,
    completeQuery,
    startAnalysis,
    completeAnalysis,
    startChat,
    canDoAction,
  } = useUIState()

  const { mode } = useTheme()
  const { currentDatabase, databases } = useDatabase()
  const inputRef = useRef<QueryInputRef>(null)

  // AI配置状态
  const [hasAIConfigured, setHasAIConfigured] = useState(false)

  // 模板面板状态
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false)
  const [currentQueryText, setCurrentQueryText] = useState('')

  // 检查AI配置状态
  useEffect(() => {
    checkAIStatus()
  }, [])

  const checkAIStatus = async () => {
    try {
      const result = await window.electronAPI.ai.getConfig()
      setHasAIConfigured(result.success && !!result.data?.apiKey)
    } catch {
      setHasAIConfigured(false)
    }
  }

  // 注册查询页面快捷键
  useRegisterShortcuts([
    {
      ...commonShortcuts.focusSearch,
      action: () => inputRef.current?.focus()
    },
    {
      ...commonShortcuts.executeQuery,
      action: () => {
        // 这个快捷键只在输入框中有内容时有效
        // 实际逻辑在 EnhancedQueryInput 组件内部处理
      }
    },
    {
      ...commonShortcuts.runAnalysis,
      action: () => {
        if (canDoAction('analyze')) {
          handleAnalyze()
        }
      }
    }
  ])

  // 示例问题
  const examples = [
    { text: 'What is our retention rate?', icon: <TrendingUp className="w-3.5 h-3.5 inline-block mr-1" /> },
    { text: 'Show me the conversion funnel', icon: <BarChart3 className="w-3.5 h-3.5 inline-block mr-1" /> },
    { text: 'Analyze user churn by channel', icon: <Target className="w-3.5 h-3.5 inline-block mr-1" /> },
  ]

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim()) return

    // 保存当前查询文本，用于保存模板
    setCurrentQueryText(queryText)
    startQuery()

    try {
      // 获取数据库配置
      const dbConfig = databases.find(db => db.type === currentDatabase)
      if (!dbConfig) {
        throw new Error('未找到数据库配置，请先连接数据库')
      }

      // 调用混合NL2SQL服务（自动选择AI或规则解析）
      const sqlResult = await window.electronAPI.nl.generateSQL(
        {
          type: dbConfig.type,
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          username: dbConfig.username,
          password: '' // 从存储中获取
        },
        queryText
      )

      if (!sqlResult.success) {
        throw new Error(sqlResult.message || '查询生成失败')
      }

      // 执行SQL查询
      const queryResult = await window.electronAPI.database.query(
        {
          type: dbConfig.type,
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          username: dbConfig.username,
          password: ''
        },
        sqlResult.data.sql
      )

      if (!queryResult.success) {
        throw new Error(queryResult.message || '查询执行失败')
      }

      completeQuery({
        sql: sqlResult.data.sql,
        data: queryResult.data.data?.rows || [],
        executionTime: queryResult.data.executionTime || 0,
        explanation: sqlResult.data.explanation,
        usingAI: sqlResult.data.usingAI || false
      })
    } catch (error) {
      console.error('Query failed:', error)
      // 显示错误信息
      alert(`查询失败: ${error instanceof Error ? error.message : '未知错误'}`)
      completeQuery({
        sql: '',
        data: [],
        executionTime: 0
      })
    }
  }

  const handleAnalyze = async () => {
    if (!queryData) return

    startAnalysis()

    try {
      // 调用AI分析API
      const analysisResult = await window.electronAPI.analysis.analyze({
        query: queryData.sql,
        result: queryData.data,
        sql: queryData.sql
      })

      if (!analysisResult.success) {
        throw new Error(analysisResult.message || '分析失败')
      }

      completeAnalysis({
        metrics: analysisResult.data.metrics || [],
        insights: analysisResult.data.insights || [],
        chartType: analysisResult.data.chartType || 'line'
      })
    } catch (error) {
      console.error('Analysis failed:', error)
      // 使用默认分析结果作为fallback
      completeAnalysis({
        metrics: [
          {
            label: 'Total Rows',
            value: String(queryData.data.length),
            trend: 'neutral'
          }
        ],
        insights: [
          { text: '查询返回 ' + queryData.data.length + ' 行数据' }
        ],
        chartType: 'line'
      })
    }
  }

  const handleExampleSelect = (exampleText: string) => {
    if (inputRef.current) {
      ;(inputRef.current as any).setValue(exampleText)
    }
  }

  // 选择模板
  const handleSelectTemplate = (template: QueryTemplate) => {
    if (inputRef.current) {
      ;(inputRef.current as any).setValue(template.naturalLanguage)
    }
    setShowTemplatesPanel(false)
  }

  const isDark = mode === 'dark'

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {/* 初始态 - 居中大输入 */}
        {state === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col justify-center p-8"
          >
            <div className="w-full max-w-4xl mx-auto space-y-6">
              {/* 品牌展示 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <h1 className="text-4xl font-bold text-text-primary mb-2">
                  DeciFlow
                </h1>
                <p className="text-text-secondary text-lg">
                  智能数据分析平台
                </p>
              </motion.div>

              {/* AI状态指示器 */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                  isDark
                    ? 'bg-slate-900 border border-slate-700'
                    : 'bg-gray-100 border-gray-300'
                }`}>
                  <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    当前模式:
                  </span>
                  {hasAIConfigured ? (
                    <>
                      <Bot className="w-4 h-4 text-green-500" />
                      <span className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                        AI增强
                      </span>
                      <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                        智能分析 + 主动建议
                      </span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                        基础模式
                      </span>
                      <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                        快速响应，无需AI配置
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* 统一的自然语言输入框 */}
              <div className="relative" data-tour="search-box">
                <EnhancedQueryInput
                  ref={inputRef}
                  onSubmit={handleQuery}
                  placeholder="你想分析什么数据？试试：'用户留存率是多少'"
                />
                {/* 模板按钮 */}
                <button
                  onClick={() => setShowTemplatesPanel(true)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isDark
                      ? 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-700'
                      : 'bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200 border border-gray-300'
                  }`}
                  title="查询模板"
                >
                  <ClipboardList className="w-3.5 h-3.5 inline-block mr-1" />模板
                </button>
              </div>

              {/* 示例问题 */}
              <ExampleQuestions examples={examples} onSelect={handleExampleSelect} />
            </div>
          </motion.div>
        )}

        {/* 加载态 */}
        {state === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center"
          >
            <LoadingState />
          </motion.div>
        )}

        {/* 结果态 + 分析态 */}
        {(state === 'result' || state === 'analyzing' || state === 'insight') && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 space-y-6 p-8 overflow-y-auto custom-scrollbar"
          >
            {/* AI状态指示器和输入框 */}
            <div className="w-full max-w-3xl mx-auto space-y-4">
              {/* AI状态 */}
              <div className="flex items-center justify-center">
                {hasAIConfigured && queryData && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                    isDark
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-green-100 text-green-700 border border-green-200'
                  }`}>
                    <Bot className="w-3.5 h-3.5" /><span>AI增强</span>
                    <span>•</span>
                    <span>智能分析已启用</span>
                  </div>
                )}
              </div>

              {/* 统一输入框 */}
              <div className="relative" data-tour="search-box-compact">
                <EnhancedQueryInput
                  ref={inputRef}
                  onSubmit={handleQuery}
                  placeholder="继续分析..."
                  compact
                />
                {/* 模板按钮 */}
                <button
                  onClick={() => setShowTemplatesPanel(true)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isDark
                      ? 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-700'
                      : 'bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200 border border-gray-300'
                  }`}
                  title="查询模板"
                >
                  <ClipboardList className="w-3.5 h-3.5 inline-block mr-1" />模板
                </button>
              </div>
            </div>

            {/* 结果块 */}
            {queryData && <div data-tour="results-display"><ResultBlock data={queryData} queryText={currentQueryText} /></div>}

            {/* AI分析按钮 */}
            {state === 'result' && canDoAction('analyze') && (
              <div data-tour="ai-analysis">
                <AnalyzeButton onAnalyze={handleAnalyze} />
              </div>
            )}

            {/* 分析中 */}
            {state === 'analyzing' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center py-12"
              >
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center"
                  >
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </motion.div>
                  <p className="text-text-secondary">AI is analyzing...</p>
                </div>
              </motion.div>
            )}

            {/* 洞察态 */}
            {state === 'insight' && analysisData && (
              <InsightSection
                analysis={analysisData}
                onStartChat={startChat}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 查询模板面板 */}
      {showTemplatesPanel && (
        <QueryTemplatesPanel
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplatesPanel(false)}
        />
      )}
    </div>
  )
}
