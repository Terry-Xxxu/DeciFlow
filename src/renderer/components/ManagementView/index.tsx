/**
 * ManagementView - 管理视图组件（支持双模式）
 */

import React, { useState, useEffect } from 'react'
import { notificationManager } from '../NotificationCenter'
import { useDatabase } from '../../stores/DatabaseStore'
import { useTheme } from '../../contexts/ThemeContext'

type ManagementTab = 'datasource' | 'ai' | 'security' | 'about'

export const ManagementView: React.FC = () => {
  const { mode } = useTheme()
  const [activeTab, setActiveTab] = useState<ManagementTab>('datasource')
  const { databases, setDatabaseType } = useDatabase()
  const isDark = mode === 'dark'

  // AI配置状态
  const [aiConfig, setAiConfig] = useState({
    provider: 'openai',
    apiKey: '',
    apiUrl: '',
    model: 'gpt-4'
  })

  // 数据源状态
  const [dataSources, setDataSources] = useState([
    { type: 'postgresql', name: 'PostgreSQL 本地', status: 'connected', host: 'localhost' },
    { type: 'mysql', name: 'MySQL 测试环境', status: 'disconnected', host: 'test.db' },
  ])

  useEffect(() => {
    // 加载AI配置
    const saved = localStorage.getItem('ai_config')
    if (saved) {
      setAiConfig(JSON.parse(saved))
    }
  }, [])

  const handleSaveAI = async () => {
    try {
      localStorage.setItem('ai_config', JSON.stringify(aiConfig))
      await window.electronAPI.store.set('ai_config', aiConfig)
      notificationManager.success('保存成功', 'AI 配置已保存')
    } catch (error) {
      notificationManager.error('保存失败', error instanceof Error ? error.message : '未知错误')
    }
  }

  const handleTestConnection = async () => {
    if (!aiConfig.apiKey) {
      notificationManager.warning('提示', '请先输入 API Key')
      return
    }

    try {
      const result = await window.electronAPI.ai.test(aiConfig)
      if (result.success) {
        notificationManager.success('连接成功', 'AI 服务连接正常')
      } else {
        notificationManager.error('连接失败', result.message || '连接失败')
      }
    } catch (error) {
      notificationManager.error('测试失败', error instanceof Error ? error.message : '未知错误')
    }
  }

  const tabs = [
    { id: 'datasource' as const, icon: '🔌', label: '数据源' },
    { id: 'ai' as const, icon: '🤖', label: 'AI 服务' },
    { id: 'security' as const, icon: '🔒', label: '安全' },
    { id: 'about' as const, icon: 'ℹ️', label: '关于' },
  ]

  const getTabButtonClass = (tabId: ManagementTab) => {
    const isActive = activeTab === tabId
    if (isDark) {
      return isActive
        ? 'bg-blue-600 text-white'
        : 'text-text-secondary hover:text-text-primary hover:bg-slate-800'
    }
    return isActive
      ? 'bg-blue-600 text-white'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold text-text-primary mb-6">数据管理</h2>

      {/* 标签切换 */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${getTabButtonClass(tab.id)}`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="card p-6">
        {/* 数据源 */}
        {activeTab === 'datasource' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-text-primary">已连接的数据源</h3>
            <div className="space-y-3">
              {dataSources.map((source, index) => (
                <div key={index} className={`flex items-center justify-between p-4 rounded-lg ${
                  isDark ? 'bg-slate-900/50' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      source.status === 'connected' ? 'bg-green-500' : isDark ? 'bg-slate-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <div className="text-sm font-medium text-text-primary">{source.name}</div>
                      <div className="text-xs text-text-muted">{source.host}</div>
                    </div>
                  </div>
                  <button className={`px-3 py-1 text-xs rounded ${
                    isDark
                      ? 'bg-slate-700 hover:bg-slate-600 text-text-secondary'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}>
                    {source.status === 'connected' ? '断开' : '连接'}
                  </button>
                </div>
              ))}
            </div>
            <button className={`w-full py-3 rounded-lg transition-colors border-2 border-dashed ${
              isDark
                ? 'border-slate-700 text-text-muted hover:border-blue-500 hover:text-blue-500'
                : 'border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-500'
            }`}>
              + 添加新数据源
            </button>
          </div>
        )}

        {/* AI 服务 */}
        {activeTab === 'ai' && (
          <div className="space-y-6 max-w-lg">
            <h3 className="text-lg font-semibold text-text-primary">AI 服务配置</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">服务提供商</label>
                <select
                  value={aiConfig.provider}
                  onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg text-text-primary focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-slate-900 border border-slate-700 focus:ring-blue-500/50'
                      : 'bg-white border border-gray-300 focus:ring-blue-500/20'
                  }`}
                >
                  <option value="openai">OpenAI (GPT-4/GPT-3.5)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="minimax">MiniMax</option>
                  <option value="zhipu">智谱 GLM</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1">API Key</label>
                <input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className={`w-full px-4 py-2 rounded-lg text-text-primary focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-slate-900 border border-slate-700 placeholder-slate-500 focus:ring-blue-500/50'
                      : 'bg-white border border-gray-300 placeholder-gray-400 focus:ring-blue-500/20'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1">模型</label>
                <select
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg text-text-primary focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-slate-900 border border-slate-700 focus:ring-blue-500/50'
                      : 'bg-white border border-gray-300 focus:ring-blue-500/20'
                  }`}
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleTestConnection}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDark
                      ? 'bg-slate-700 hover:bg-slate-600 text-text-primary'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  🔗 测试连接
                </button>
                <button
                  onClick={handleSaveAI}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  保存配置
                </button>
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${
              isDark
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>💡 API Key 仅保存在本地，不会上传到任何服务器</p>
            </div>
          </div>
        )}

        {/* 安全 */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-text-primary">数据安全</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-text-primary">本地优先模式</div>
                  <div className="text-xs text-text-muted">所有数据在本地处理，不会上传到远程服务器</div>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-text-primary">自动脱敏敏感数据</div>
                  <div className="text-xs text-text-muted">自动识别并脱敏邮箱、电话等敏感字段</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* 关于 */}
        {activeTab === 'about' && (
          <div className="space-y-6 text-center">
            <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center ${
              !isDark && 'border border-blue-200 shadow-lg'
            }`}>
              <span className="text-white font-bold text-3xl">D</span>
            </div>
            <h3 className="text-2xl font-bold text-text-primary">DeciFlow</h3>
            <p className="text-text-muted">AI 决策系统</p>
            <div className="text-xs text-text-muted">版本 1.0.0</div>
          </div>
        )}
      </div>
    </div>
  )
}
