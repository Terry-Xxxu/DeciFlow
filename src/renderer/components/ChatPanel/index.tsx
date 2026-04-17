/**
 * ChatPanel - 深入分析对话面板（支持双模式）
 * 支持持久化历史记录
 */

import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatPanelProps {
  context: { query: string; result: any; analysis: any; sessionId?: string } | null
  onClose: () => void
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ context, onClose }) => {
  const { mode } = useTheme()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const initializingRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isDark = mode === 'dark'

  const initializeSession = async () => {
    if (!context) return

    // 如果有 sessionId，尝试加载历史记录
    if (context.sessionId) {
      setSessionId(context.sessionId)

      try {
        const result = await window.electronAPI.chat.getSession(context.sessionId)
        if (result.success && result.data?.messages?.length > 0) {
          // 恢复历史消息
          const historyMessages = result.data.messages
            .filter((m: any) => m.role === 'user' || m.role === 'assistant')
            .map((m: any) => ({
              id: `history_${m.timestamp}`,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp)
            }))
          setMessages(historyMessages)
          return
        }
      } catch (error) {
        console.error('[ChatPanel] 加载历史失败:', error)
      }
    }

    // 没有历史记录或未找到会话，创建新会话
    try {
      const createResult = await window.electronAPI.chat.createSession(
        context.query,
        { query: context.query, result: context.result, analysis: context.analysis }
      )

      if (createResult.success) {
        const newSessionId = createResult.data.sessionId
        setSessionId(newSessionId)
        // 显示欢迎消息
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `我已基于"${context.query}"的分析结果准备好回答你的问题。你可以问：\n• 为什么会有这个结果？\n• 能按某个维度拆解吗？\n• 和上个月对比怎么样？`,
          timestamp: new Date()
        }])
      }
    } catch (error) {
      console.error('[ChatPanel] 创建会话失败:', error)
    }
  }

  useEffect(() => {
    // 防止重复初始化
    if (!context || initializingRef.current) {
      return
    }

    initializingRef.current = true
    initializeSession().finally(() => {
      initializingRef.current = false
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.sessionId, context?.query])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !context || !sessionId) return

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // 调用对话分析API（使用持久化的 sessionId）
      const result = await window.electronAPI.chat.withContext(sessionId, input)

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_1`,
        role: 'assistant',
        content: result.success && result.data
          ? result.data.answer || '分析完成'
          : '抱歉，分析时出现错误',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}_1`,
        role: 'assistant',
        content: '抱歉，我无法回答这个问题。请换个问法或重新分析。',
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestions = [
    { icon: '🤔', text: '为什么会有这个结果？' },
    { icon: '📊', text: '按渠道拆解看看' },
    { icon: '📈', text: '和上个月对比' },
  ]

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
          <span className="text-lg">💬</span>
          <span className="text-sm font-medium text-text-primary">深入分析</span>
        </div>
        <button
          onClick={onClose}
          className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
            isDark
              ? 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
              : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
          }`}
        >
          ✕
        </button>
      </div>

      {/* 上下文提示 */}
      {context && (
        <div className={`px-4 py-3 border-b ${
          isDark
            ? 'bg-blue-500/10 border-blue-500/20'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            基于: {context.query}
          </p>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                message.role === 'user'
                  ? isDark
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-600 text-white shadow-sm'
                  : isDark
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-[10px] opacity-50 mt-1">
                {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className={`rounded-2xl px-4 py-2 ${
              isDark ? 'bg-slate-800' : 'bg-gray-100 border border-gray-200'
            }`}>
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
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷建议 */}
      {messages.length <= 1 && (
        <div className={`px-4 py-2 border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
          <p className={`text-xs mb-2 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>试试问：</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setInput(suggestion.text)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                }`}
              >
                {suggestion.icon} {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入框 */}
      <div className={`p-4 border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="继续追问..."
            className={`flex-1 px-4 py-2 rounded-lg text-sm focus:outline-none transition-colors ${
              isDark
                ? 'bg-slate-800 border border-slate-700 text-text-primary placeholder-slate-500 focus:border-blue-500'
                : 'bg-white border border-gray-300 text-text-primary placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatPanel
