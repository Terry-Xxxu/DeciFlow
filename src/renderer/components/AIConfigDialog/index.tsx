/**
 * AI 服务配置弹窗
 * 替换临时的 alert 提示，提供完整的 AI 配置界面
 */

import React, { useState, useEffect } from 'react'
import { Modal } from '../Modal'
import { Bot, BrainCircuit, Sparkles, Star, Settings, Lock, CheckCircle2, XCircle, FlaskConical, Lightbulb } from 'lucide-react'

type AIProvider = 'openai' | 'anthropic' | 'minimax' | 'zhipu' | 'custom'

interface AIConfig {
  provider: AIProvider
  apiKey: string
  apiEndpoint?: string
  model: string
}

interface AIConfigDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (config: AIConfig) => void
}

const providerConfigs: Record<
  AIProvider,
  {
    name: string
    icon: React.ReactNode
    defaultEndpoint: string
    models: string[]
    description: string
  }
> = {
  openai: {
    name: 'OpenAI',
    icon: <Bot className="w-6 h-6" />,
    defaultEndpoint: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    description: '业界领先的 AI 模型服务',
  },
  anthropic: {
    name: 'Anthropic',
    icon: <BrainCircuit className="w-6 h-6" />,
    defaultEndpoint: 'https://api.anthropic.com',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    description: '强大的 AI 助手，擅长分析和推理',
  },
  minimax: {
    name: 'MiniMax',
    icon: <Sparkles className="w-6 h-6" />,
    defaultEndpoint: 'https://api.minimax.chat/v1',
    models: ['abab6.5s-chat', 'abab5.5-chat'],
    description: '国内 AI 服务，响应快速',
  },
  zhipu: {
    name: '智谱 GLM',
    icon: <Star className="w-6 h-6" />,
    defaultEndpoint: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-plus', 'glm-4', 'glm-3-turbo'],
    description: '清华大学出品，中文理解优秀',
  },
  custom: {
    name: '自定义',
    icon: <Settings className="w-6 h-6" />,
    defaultEndpoint: '',
    models: [],
    description: '使用兼容 OpenAI API 格式的其他服务',
  },
}

export const AIConfigDialog: React.FC<AIConfigDialogProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'openai',
    apiKey: '',
    apiEndpoint: '',
    model: 'gpt-4o',
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // 当对话框打开时，加载已保存的配置
  useEffect(() => {
    if (isOpen) {
      loadSavedConfig()
    }
  }, [isOpen])

  const loadSavedConfig = async () => {
    try {
      // 从本地存储加载配置
      const savedConfig = localStorage.getItem('ai_config')
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig)
        setConfig(parsed)
        setTestResult(null)
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    }
  }

  const handleProviderChange = (provider: AIProvider) => {
    const providerConfig = providerConfigs[provider]
    setConfig({
      ...config,
      provider,
      apiEndpoint: providerConfig.defaultEndpoint,
      model: providerConfig.models[0] || '',
    })
    setTestResult(null)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      // 测试连接
      const result = await window.electronAPI.ai.chat(
        '你好！这是一条测试消息。',
        undefined
      )

      setTestResult({
        success: true,
        message: '连接成功！AI 服务响应正常。',
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: `连接失败：${error instanceof Error ? error.message : '未知错误'}`,
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    try {
      // 保存到本地存储
      localStorage.setItem('ai_config', JSON.stringify(config))

      // 初始化 AI 服务
      const result = await window.electronAPI.ai.init({
        provider: config.provider,
        apiKey: config.apiKey,
        apiEndpoint: config.apiEndpoint,
        model: config.model,
      })

      if (result) {
        onSave?.(config)
        onClose()
      } else {
        setTestResult({
          success: false,
          message: '初始化失败，请检查配置信息',
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `保存失败：${error instanceof Error ? error.message : '未知错误'}`,
      })
    }
  }

  const currentProviderConfig = providerConfigs[config.provider]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="AI 服务配置">
      <div className="space-y-6">
        {/* 服务提供商选择 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            选择 AI 服务提供商
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(providerConfigs) as AIProvider[]).map((provider) => (
              <button
                key={provider}
                onClick={() => handleProviderChange(provider)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  config.provider === provider
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-slate-300">{providerConfigs[provider].icon}</div>
                  <div>
                    <div className="font-medium text-slate-200 text-sm">
                      {providerConfigs[provider].name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {providerConfigs[provider].description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* API 配置 */}
        <div className="space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Key <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="sk-..."
              className="input w-full"
            />
            <p className="text-xs text-slate-500 mt-1">
              <Lock className="w-3 h-3 inline-block mr-1" />您的 API Key 仅保存在本地，不会上传到任何服务器
            </p>
          </div>

          {/* API Endpoint (可选) */}
          {config.provider === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                API 端点地址
              </label>
              <input
                type="text"
                value={config.apiEndpoint}
                onChange={(e) => setConfig({ ...config, apiEndpoint: e.target.value })}
                placeholder="https://api.example.com/v1"
                className="input w-full"
              />
            </div>
          )}

          {/* 模型选择 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              选择模型
            </label>
            <select
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              className="input w-full"
            >
              {currentProviderConfig.models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 测试结果 */}
        {testResult && (
          <div
            className={`p-4 rounded-xl border ${
              testResult.success
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span className="text-sm">{testResult.message}</span>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700">
          <button
            onClick={handleTest}
            disabled={testing || !config.apiKey}
            className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {testing ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>测试中...</span>
              </>
            ) : (
              <>
                <FlaskConical className="w-4 h-4" />
                <span>测试连接</span>
              </>
            )}
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!config.apiKey}
              className="px-6 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              保存配置
            </button>
          </div>
        </div>

        {/* 帮助信息 */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-1.5"><Lightbulb className="w-4 h-4" />如何获取 API Key？</h4>
          <div className="space-y-2 text-xs text-slate-400">
            <div>
              <strong className="text-slate-300">OpenAI:</strong>
              <span> 访问 platform.openai.com → API Keys → 创建新密钥</span>
            </div>
            <div>
              <strong className="text-slate-300">Anthropic:</strong>
              <span> 访问 console.anthropic.com → API Keys → 创建密钥</span>
            </div>
            <div>
              <strong className="text-slate-300">MiniMax:</strong>
              <span> 访问 api.minimax.chat → 获取 API Key</span>
            </div>
            <div>
              <strong className="text-slate-300">智谱 GLM:</strong>
              <span> 访问 open.bigmodel.cn → API Keys → 创建密钥</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default AIConfigDialog
