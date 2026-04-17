/**
 * 分析对话组件
 * 支持用户基于分析结果持续追问
 */

import React, { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: Date
  questionType?: string
}

interface FollowUpQuestion {
  id: string
  question: string
  icon?: string
}

interface AnalysisChatProps {
  sessionId?: string
  metric?: string
  timeRange?: string
  onQuestionClick?: (question: string) => void
  disabled?: boolean
  contextSummary?: {
    metric: string
    currentTrend?: { changePercent: number; trend: string }
    problems?: Array<{ dimension: string; issue: string }>
    drivers?: Array<{ key: string; contribution: number }>
  }
}

export const AnalysisChat: React.FC<AnalysisChatProps> = ({
  sessionId,
  metric,
  timeRange,
  onQuestionClick,
  disabled = false,
  contextSummary
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 初始化推荐问题
  useEffect(() => {
    if (contextSummary) {
      generateFollowUpQuestions()
    }
  }, [contextSummary])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * 生成推荐追问问题
   */
  const generateFollowUpQuestions = () => {
    const questions: FollowUpQuestion[] = []

    if (!contextSummary) return

    // 基于问题生成追问
    if (contextSummary.problems && contextSummary.problems.length > 0) {
      const topProblem = contextSummary.problems[0]
      questions.push({
        id: 'q1',
        question: `为什么 ${topProblem.dimension} 会${topProblem.issue.includes('下降') ? '下降' : '异常'}？`,
        icon: '🔍'
      })
    }

    // 基于驱动因素生成追问
    if (contextSummary.drivers && contextSummary.drivers.length > 0) {
      const topDriver = contextSummary.drivers[0]
      questions.push({
        id: 'q2',
        question: `哪些因素推动了 ${topDriver.key} 的变化？`,
        icon: '📊'
      })
    }

    // 通用追问
    if (contextSummary.currentTrend && Math.abs(contextSummary.currentTrend.changePercent) > 10) {
      questions.push({
        id: 'q3',
        question: '这个变化趋势可持续吗？',
        icon: '📈'
      })
    }

    // 兜底问题
    if (questions.length < 3) {
      questions.push(
        { id: 'q4', question: '按渠道拆解的结果如何？', icon: '🎯' },
        { id: 'q5', question: '哪些设备类型的用户最多？', icon: '📱' }
      )
    }

    setFollowUpQuestions(questions.slice(0, 3))
  }

  /**
   * 发送消息
   */
  const handleSend = async () => {
    if (!input.trim() || isLoading || disabled || !sessionId) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])

    try {
      // 调用后端 API
      const response = await window.electronAPI.chat.withContext({
        sessionId,
        question: userMessage
      })

      if (response.success && response.data) {
        // 添加 AI 回复
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: response.data.answer,
          timestamp: new Date(),
          questionType: response.data.questionType
        }
        setMessages(prev => [...prev, aiMsg])

        // 如果有新的追问建议，更新
        if (response.data.followUpQuestions) {
          setFollowUpQuestions(response.data.followUpQuestions.map((q: string, i: number) => ({
            id: `fq${i}`,
            question: q,
            icon: '💡'
          })))
        }
      } else {
        throw new Error(response.message || '分析失败')
      }
    } catch (error) {
      console.error('对话失败:', error)
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: `抱歉，分析时出现错误：${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 点击推荐问题
   */
  const handleFollowUpClick = (question: string) => {
    setInput(question)
    setTimeout(() => {
      handleSend()
    }, 100)
  }

  /**
   * 格式化时间
   */
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (!sessionId) {
    return (
      <div className="p-6 text-center text-slate-400">
        <span className="text-4xl mb-3 block">💬</span>
        <p>完成分析后即可开始对话追问</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-xl border border-slate-700/50">
      {/* 上下文信息栏 */}
      {contextSummary && (
        <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-700/50">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">当前分析：</span>
              <span className="text-slate-200 font-medium">{contextSummary.metric}</span>
            </div>
            {contextSummary.currentTrend && (
              <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                contextSummary.currentTrend.changePercent > 0
                  ? 'bg-green-500/20 text-green-400'
                  : contextSummary.currentTrend.changePercent < 0
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-slate-500/20 text-slate-400'
              }`}>
                {contextSummary.currentTrend.changePercent > 0 ? '+' : ''}
                {contextSummary.currentTrend.changePercent.toFixed(1)}%
              </div>
            )}
            {timeRange && (
              <div className="text-slate-500 text-xs">
                {timeRange}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 对话区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 初始提示 */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">开始深入分析</h3>
            <p className="text-sm text-slate-400 mb-6">
              你可以继续问，比如：
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {followUpQuestions.map(q => (
                <button
                  key={q.id}
                  onClick={() => handleFollowUpClick(q.question)}
                  disabled={disabled || isLoading}
                  className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm border border-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {q.icon && <span className="mr-1">{q.icon}</span>}
                  {q.question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 消息列表 */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-200 border border-slate-700'
              }`}
            >
              {/* AI 消息带类型标签 */}
              {msg.role === 'ai' && msg.questionType && (
                <div className="text-xs text-slate-500 mb-1">
                  {msg.questionType === 'explanation' && '📝 解释'}
                  {msg.questionType === 'breakdown' && '📊 拆解'}
                  {msg.questionType === 'deep_dive' && '🔍 深挖'}
                  {msg.questionType === 'unsupported' && '⚠️ 超出范围'}
                </div>
              )}

              {/* 消息内容 */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>

              {/* 时间戳 */}
              <div
                className={`text-xs mt-1 ${
                  msg.role === 'user' ? 'text-blue-200' : 'text-slate-500'
                }`}
              >
                {formatTime(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {/* 加载中 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl px-4 py-3 border border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 推荐问题（有对话历史后显示） */}
      {messages.length > 0 && followUpQuestions.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-900/30">
          <div className="text-xs text-slate-500 mb-2">👉 推荐追问：</div>
          <div className="flex flex-wrap gap-2">
            {followUpQuestions.map(q => (
              <button
                key={q.id}
                onClick={() => handleFollowUpClick(q.question)}
                disabled={disabled || isLoading}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {q.icon && <span className="mr-1">{q.icon}</span>}
                {q.question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入框 */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="继续追问，比如：为什么渠道A会下降？"
            disabled={disabled || isLoading}
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || disabled}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '...' : '发送'}
          </button>
        </div>
        <div className="text-xs text-slate-500 mt-2">
          💡 提示：你可以询问具体维度的表现、变化原因、未来趋势等
        </div>
      </div>
    </div>
  )
}

export default AnalysisChat
