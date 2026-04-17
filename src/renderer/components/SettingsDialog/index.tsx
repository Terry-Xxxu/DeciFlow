/**
 * SettingsDialog - 设置对话框组件（支持双模式）
 * 包含 AI 配置、主题切换、数据安全等设置
 */

import React, { useState, useEffect } from 'react'
import { Modal } from '../Modal'
import { testAIConfig } from '../../utils/ai-test'
import { notificationManager } from '../NotificationCenter'
import { useTheme } from '../../contexts/ThemeContext'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsTab = 'ai' | 'appearance' | 'security' | 'about'

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const { mode, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai')
  const [aiConfig, setAiConfig] = useState({
    provider: 'openai',
    apiKey: '',
    apiUrl: '',
    model: 'gpt-4'
  })
  const [theme, setTheme] = useState(mode)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const isDark = mode === 'dark'

  useEffect(() => {
    // 加载当前配置
    loadSettings()
    setTheme(mode)
  }, [isOpen, mode])

  const loadSettings = async () => {
    try {
      // 优先从 electron store 加载配置
      const aiConfigResult = await window.electronAPI.store.get('ai_config')
      if (aiConfigResult.success && aiConfigResult.data) {
        setAiConfig(aiConfigResult.data)
      } else {
        // fallback 到 localStorage
        const savedConfig = localStorage.getItem('ai_config')
        if (savedConfig) {
          setAiConfig(JSON.parse(savedConfig))
        }
      }

      const themeResult = await window.electronAPI.store.get('theme')
      if (themeResult.success && themeResult.data) {
        setTheme(themeResult.data)
      } else {
        const savedTheme = localStorage.getItem('theme')
        if (savedTheme) {
          setTheme(savedTheme)
        }
      }
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }

  const handleSave = async () => {
    try {
      // 保存 AI 配置到 localStorage
      localStorage.setItem('ai_config', JSON.stringify(aiConfig))

      // 保存主题到 localStorage
      localStorage.setItem('theme', theme)

      // 保存到后端 store
      if (aiConfig.apiKey) {
        await window.electronAPI.store.set('ai_config', aiConfig)
      }
      await window.electronAPI.store.set('theme', theme)

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)

      // 通知用户
      notificationManager.success('设置已保存', 'AI 配置和外观设置已成功保存')
    } catch (error) {
      console.error('保存设置失败:', error)
      notificationManager.error('保存失败', error instanceof Error ? error.message : '未知错误')
    }
  }

  const handleTestConnection = async () => {
    if (!aiConfig.apiKey) {
      setTestResult({
        success: false,
        message: '请先输入 API Key'
      })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const result = await testAIConfig(aiConfig)
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '测试失败'
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>设置</h2>
          </div>
          {saveSuccess && (
            <div className={`px-4 py-2 rounded-lg text-sm ${
              isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
            }`}>
              ✓ 保存成功
            </div>
          )}
        </div>

        {/* 标签切换 */}
        <div className={`flex gap-2 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'ai'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🤖 AI 配置
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'appearance'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🎨 外观
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'security'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔒 安全
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'about'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ℹ️ 关于
          </button>
        </div>

        {/* AI 配置 */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg space-y-4 ${
              isDark ? 'bg-slate-800/50' : 'bg-gray-50 border border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>AI 服务配置</h3>

              <div className="space-y-3">
                <label className="block">
                  <div className={`text-sm mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>服务提供商</div>
                  <select
                    value={aiConfig.provider}
                    onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                      isDark
                        ? 'bg-slate-900 border border-slate-700 text-slate-200 focus:ring-blue-500/50'
                        : 'bg-white border border-gray-300 text-gray-900 focus:ring-blue-500/20'
                    }`}
                  >
                    <option value="openai">OpenAI (GPT-4/GPT-3.5)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="minimax">MiniMax</option>
                    <option value="zhipu">智谱 GLM</option>
                    <option value="custom">自定义</option>
                  </select>
                </label>

                <label className="block">
                  <div className={`text-sm mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>API Key</div>
                  <input
                    type="password"
                    value={aiConfig.apiKey}
                    onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                      isDark
                        ? 'bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-blue-500/50'
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500/20'
                    }`}
                  />
                </label>

                <label className="block">
                  <div className={`text-sm mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>API 地址（可选）</div>
                  <input
                    type="text"
                    value={aiConfig.apiUrl}
                    onChange={(e) => setAiConfig({ ...aiConfig, apiUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                      isDark
                        ? 'bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-blue-500/50'
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500/20'
                    }`}
                  />
                </label>

                <label className="block">
                  <div className={`text-sm mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>模型</div>
                  <select
                    value={aiConfig.model}
                    onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                      isDark
                        ? 'bg-slate-900 border border-slate-700 text-slate-200 focus:ring-blue-500/50'
                        : 'bg-white border border-gray-300 text-gray-900 focus:ring-blue-500/20'
                    }`}
                  >
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </label>

                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || !aiConfig.apiKey}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                    isDark
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {isTesting ? (
                    <>
                      <div className={`w-4 h-4 border-2 rounded-full animate-spin ${
                        isDark ? 'border-slate-500 border-t-slate-500' : 'border-gray-500 border-t-gray-700'
                      }`}></div>
                      <span>测试中...</span>
                    </>
                  ) : (
                    <>
                      <span>🔗</span>
                      <span>测试连接</span>
                    </>
                  )}
                </button>

                {/* 测试结果 */}
                {testResult && (
                  <div className={`mt-2 text-xs p-2 rounded ${
                    testResult.success
                      ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                      : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                  }`}>
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${
              isDark
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className={`text-sm mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>💡 提示</div>
              <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                API Key 仅保存在本地，不会上传到任何服务器。请妥善保管您的 API Key。
              </div>
            </div>
          </div>
        )}

        {/* 外观设置 */}
        {activeTab === 'appearance' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg space-y-4 ${
              isDark ? 'bg-slate-800/50' : 'bg-gray-50 border border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>主题</h3>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    checked={theme === 'dark'}
                    onChange={() => {
                      setTheme('dark')
                      if (mode !== 'dark') toggleTheme()
                    }}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>深色主题</div>
                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>默认主题，护眼舒适</div>
                  </div>
                  <div className={`w-8 h-8 rounded border ${
                    isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-900 border-gray-300'
                  }`}></div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    checked={theme === 'light'}
                    onChange={() => {
                      setTheme('light')
                      if (mode !== 'light') toggleTheme()
                    }}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>浅色主题</div>
                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>清新明亮，SaaS 风格</div>
                  </div>
                  <div className={`w-8 h-8 rounded border ${
                    isDark ? 'bg-white border-slate-300' : 'bg-white border-gray-300'
                  }`}></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 安全设置 */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg space-y-4 ${
              isDark ? 'bg-slate-800/50' : 'bg-gray-50 border border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>数据安全</h3>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-1" />
                  <div className="flex-1">
                    <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>本地优先模式</div>
                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                      所有数据在本地处理，不会上传到远程服务器
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-1" />
                  <div className="flex-1">
                    <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>自动脱敏敏感数据</div>
                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                      自动识别并脱敏邮箱、电话等敏感字段
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-1" />
                  <div className="flex-1">
                    <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>启用查询审计日志</div>
                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                      记录所有查询操作，便于追溯和审计
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <button
              onClick={() => {/* 打开详细安全设置 */}}
              className={`w-full px-4 py-2 rounded-lg text-sm transition-colors ${
                isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              高级安全设置 →
            </button>
          </div>
        )}

        {/* 关于 */}
        {activeTab === 'about' && (
          <div className="space-y-4">
            <div className={`p-6 rounded-lg text-center ${
              isDark ? 'bg-slate-800/50' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">D</span>
              </div>
              <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>DeciFlow</h3>
              <div className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>AI 决策系统</div>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>版本 1.0.0</div>
            </div>

            <div className={`p-4 rounded-lg space-y-3 ${
              isDark ? 'bg-slate-800/50' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                <strong>核心功能：</strong>
              </div>
              <div className={`text-xs space-y-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                <div>• 自然语言查询数据</div>
                <div>• AI 智能分析建议</div>
                <div>• 可视化图表展示</div>
                <div>• 漏斗分析</div>
                <div>• 对话式深入分析</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
                isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}>
                用户协议
              </button>
              <button className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
                isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}>
                隐私政策
              </button>
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className={`flex justify-end gap-3 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-6 py-2 text-sm transition-colors ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            保存设置
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default SettingsDialog
