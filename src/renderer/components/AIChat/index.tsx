import React, { useState, useRef, useEffect } from 'react'
import { AlertDialog } from '../Modal'
import { AIConfigDialog } from '../AIConfigDialog'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是你的 AI 数据顾问。作为一名数据驱动的增长型产品经理，我可以帮你：\n\n📊 **数据分析** - 深度解读数据，给出可执行建议\n🔍 **异常发现** - 主动识别数据异常和机会点\n💡 **决策支持** - 基于数据提供产品增长策略\n\n你想了解什么数据？或者直接告诉我你的问题！',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    variant: 'info' | 'warning' | 'error' | 'success'
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info'
  })
  const [showAIConfig, setShowAIConfig] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 检查 AI 是否已配置
  useEffect(() => {
    checkAIStatus()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const checkAIStatus = async () => {
    try {
      const history = await window.electronAPI.ai.getHistory()
      setIsInitialized(history.length > 0)
    } catch (error) {
      console.error('检查 AI 状态失败:', error)
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    // 检查 AI 是否已初始化
    if (!isInitialized) {
      setAlertDialog({
        isOpen: true,
        title: 'AI 服务未配置',
        message: '请先配置 AI 服务后才能使用对话功能。\n\n点击右上角 ⚙️ 设置按钮，选择「AI 服务配置」，输入你的 API Key。\n\n支持 OpenAI、Claude、MiniMax、GLM 等服务。',
        variant: 'warning'
      })
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      // 调用 AI API
      const response = await window.electronAPI.ai.chat(input)

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        title: '请求失败',
        message: `${error instanceof Error ? error.message : '未知错误'}\n\n请检查：\n1. API Key 是否正确\n2. 网络连接是否正常\n3. API 额度是否充足`,
        variant: 'error'
      })
    } finally {
      setIsTyping(false)
    }
  }

  const quickQuestions = [
    { text: '最近一周的数据有什么异常？', icon: '🔍' },
    { text: '哪些用户群体需要重点关注？', icon: '👥' },
    { text: '如何提升下周的增长？', icon: '📈' },
    { text: '当前最大的问题是什么？', icon: '⚠️' },
  ]

  return (
    <div className="card p-6 h-full flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">AI 数据顾问</h2>
            <p className="text-xs text-text-muted flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isInitialized ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              {isInitialized ? '在线 - 增长型产品经理模式' : '未配置 - 请先设置 AI 服务'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAIConfig(true)}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors text-text-muted hover:text-text-primary"
          title="配置 AI 服务"
        >
          <span className="text-sm">⚙️</span>
        </button>
      </div>

      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white'
                  : 'bg-white/5 text-text-primary border border-white/10'
              }`}
            >
              {/* AI 头像 */}
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                  <span className="text-sm">🤖</span>
                  <span className="text-xs text-text-muted">AI 数据顾问</span>
                </div>
              )}

              {/* 消息内容 */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </div>

              {/* 时间戳 */}
              <div
                className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-white/60' : 'text-text-muted'
                }`}
              >
                {message.timestamp.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}

        {/* AI 正在输入 */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-sm">🤖</span>
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 快捷问题 */}
      {messages.length === 1 && (
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-3">试试这些问题：</p>
          <div className="grid grid-cols-2 gap-2">
            {quickQuestions.map((q, index) => (
              <button
                key={index}
                onClick={() => setInput(q.text)}
                className="px-3 py-2.5 text-sm bg-white/5 text-text-secondary rounded-xl hover:bg-white/10 hover:text-text-primary transition-all duration-200 border border-white/5 text-left flex items-center gap-2"
              >
                <span>{q.icon}</span>
                <span className="truncate">{q.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入框 */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isInitialized ? "问我任何数据相关的问题..." : "请先配置 AI 服务 ⚙️"}
            className="input pr-12"
          />
          {input && (
            <button
              onClick={() => setInput('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>发送</span>
          <span className="text-lg">→</span>
        </button>
      </div>

      {/* 提示信息 */}
      <div className="mt-3 text-xs text-text-muted text-center">
        {isInitialized ? (
          <span>💡 我会基于数据给出可执行的产品增长建议，而非简单解释数据</span>
        ) : (
          <span className="text-amber-400">⚠️ 点击右上角 ⚙️ 配置 AI 服务后即可使用</span>
        )}
      </div>

      {/* 警告对话框 */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        variant={alertDialog.variant}
        confirmText="我知道了"
      />

      {/* AI 配置弹窗 */}
      <AIConfigDialog
        isOpen={showAIConfig}
        onClose={() => setShowAIConfig(false)}
        onSave={() => {
          // 重新检查 AI 状态
          checkAIStatus()
        }}
      />
    </div>
  )
}

export default AIChat
