/**
 * DataSource - 数据源管理组件（支持双模式）
 */

import React, { useState } from 'react'
import { DatabaseType } from '../../types/database'
import { AlertDialog } from '../Modal'
import { useTheme } from '../../contexts/ThemeContext'

const DataSource: React.FC = () => {
  const { mode } = useTheme()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAIConfig, setShowAIConfig] = useState(false)
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
  const [connections, setConnections] = useState([
    {
      id: '1',
      type: DatabaseType.PostgreSQL,
      host: 'localhost',
      port: 5432,
      database: 'mydb',
      username: 'postgres',
      connected: true,
    },
  ])

  const [newConnection, setNewConnection] = useState({
    type: DatabaseType.PostgreSQL,
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
  })

  const [aiConfig, setAiConfig] = useState({
    provider: 'openai' as const,
    apiKey: '',
    model: 'gpt-4',
  })

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const isDark = mode === 'dark'

  const handleTestConnection = async () => {
    setTestStatus('testing')
    try {
      // 模拟测试连接
      await new Promise(resolve => setTimeout(resolve, 1000))
      setTestStatus('success')
      setTimeout(() => setTestStatus('idle'), 2000)
    } catch {
      setTestStatus('error')
      setTimeout(() => setTestStatus('idle'), 2000)
    }
  }

  const handleSaveConnection = async () => {
    try {
      const result = await window.electronAPI.database.connect(newConnection)
      if (result.success) {
        setConnections([...connections, {
          id: Date.now().toString(),
          ...newConnection,
          connected: true,
        }])
        setShowAddForm(false)
        setNewConnection({
          type: DatabaseType.PostgreSQL,
          host: '',
          port: 5432,
          database: '',
          username: '',
          password: '',
        })
        setAlertDialog({
          isOpen: true,
          title: '连接成功',
          message: '数据库连接已成功添加！',
          variant: 'success'
        })
      } else {
        setAlertDialog({
          isOpen: true,
          title: '连接失败',
          message: result.message || '未知错误',
          variant: 'error'
        })
      }
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        title: '连接失败',
        message: error instanceof Error ? error.message : '未知错误',
        variant: 'error'
      })
    }
  }

  const handleSaveAIConfig = async () => {
    try {
      const result = await window.electronAPI.ai.init(aiConfig)
      if (result) {
        setShowAIConfig(false)
        setAlertDialog({
          isOpen: true,
          title: '配置成功',
          message: 'AI 服务配置成功！',
          variant: 'success'
        })
      } else {
        setAlertDialog({
          isOpen: true,
          title: '配置失败',
          message: 'AI 服务配置失败，请检查配置信息',
          variant: 'error'
        })
      }
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        title: '配置失败',
        message: error instanceof Error ? error.message : '未知错误',
        variant: 'error'
      })
    }
  }

  const getDatabaseIcon = (type: DatabaseType) => {
    switch (type) {
      case DatabaseType.PostgreSQL:
        return '🐘'
      case DatabaseType.MySQL:
        return '🐬'
      case DatabaseType.MongoDB:
        return '🍃'
      default:
        return '💾'
    }
  }

  return (
    <div className="card p-6 flex flex-col" style={{ height: '100%' }}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDark
              ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20'
              : 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200'
          }`}>
            <span className="text-xl">🔌</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">数据源管理</h2>
            <p className="text-xs text-text-muted">连接你的数据库</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary flex items-center gap-2"
        >
          <span>➕</span>
          <span>添加数据源</span>
        </button>
      </div>

      {/* 添加数据源表单 */}
      {showAddForm && (
        <div className={`mb-6 p-5 rounded-xl border flex-shrink-0 ${
          isDark
            ? 'bg-white/5 border-white/10'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <h3 className="text-text-primary font-semibold mb-4">添加数据库连接</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-2">数据库类型</label>
              <select
                value={newConnection.type}
                onChange={(e) => setNewConnection({ ...newConnection, type: e.target.value as DatabaseType })}
                className="input"
              >
                <option value={DatabaseType.PostgreSQL}>PostgreSQL</option>
                <option value={DatabaseType.MySQL}>MySQL</option>
                <option value={DatabaseType.MongoDB}>MongoDB</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">主机地址</label>
              <input
                type="text"
                value={newConnection.host}
                onChange={(e) => setNewConnection({ ...newConnection, host: e.target.value })}
                placeholder="localhost"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">端口</label>
              <input
                type="number"
                value={newConnection.port}
                onChange={(e) => setNewConnection({ ...newConnection, port: parseInt(e.target.value) })}
                placeholder="5432"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">数据库名</label>
              <input
                type="text"
                value={newConnection.database}
                onChange={(e) => setNewConnection({ ...newConnection, database: e.target.value })}
                placeholder="mydb"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">用户名</label>
              <input
                type="text"
                value={newConnection.username}
                onChange={(e) => setNewConnection({ ...newConnection, username: e.target.value })}
                placeholder="postgres"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">密码</label>
              <input
                type="password"
                value={newConnection.password}
                onChange={(e) => setNewConnection({ ...newConnection, password: e.target.value })}
                placeholder="••••••••"
                className="input"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing' || !newConnection.host}
              className="btn btn-secondary flex items-center gap-2"
            >
              {testStatus === 'testing' ? '测试中...' : '🔍 测试连接'}
            </button>
            <button
              onClick={handleSaveConnection}
              disabled={!newConnection.host || !newConnection.database}
              className="btn btn-primary flex items-center gap-2"
            >
              ✓ 保存连接
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="btn btn-secondary"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 已连接的数据源列表 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar mb-4 min-h-0">
        <div className="space-y-3">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className={`p-5 rounded-xl border transition-all duration-200 ${
                isDark
                  ? 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:border-white/15'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                    isDark
                      ? 'bg-blue-500/20 border-blue-500/20'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <span className="text-xl">{getDatabaseIcon(conn.type)}</span>
                  </div>
                  <div>
                    <h4 className="text-text-primary font-medium">{conn.type}</h4>
                    <p className="text-text-muted text-sm">{conn.host}:{conn.port}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 text-xs rounded-lg border flex items-center gap-1.5 ${
                    conn.connected
                      ? isDark
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                        : 'bg-green-100 text-green-700 border-green-200'
                      : isDark
                        ? 'bg-gray-500/20 text-gray-400 border-gray-500/20'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}>
                    {conn.connected && <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      isDark ? 'bg-emerald-400' : 'bg-green-500'
                    }`}></span>}
                    {conn.connected ? '已连接' : '未连接'}
                  </span>
                  <button className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                  }`}>⚙️</button>
                  <button className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                  }`}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI 服务配置提示 */}
      <div className="flex-shrink-0">
        <div className={`p-4 rounded-xl border ${
          isDark
            ? 'bg-gradient-to-r from-brand-primary/10 via-brand-secondary/10 to-brand-accent/10 border-brand-primary/20'
            : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isDark
                ? 'bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20'
                : 'bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200'
            }`}>
              <span className="text-xl">🤖</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-text-primary font-semibold text-sm mb-1">配置 AI 服务</h4>
              <p className="text-text-secondary text-xs leading-relaxed mb-2">
                设置 API Key 以启用智能查询和分析功能
              </p>
              <button
                onClick={() => setShowAIConfig(true)}
                className="btn btn-primary text-xs py-1.5 px-3"
              >
                立即配置
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI 配置弹窗 */}
      {showAIConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`card p-6 max-w-md w-full mx-4 ${
            !isDark && 'shadow-xl'
          }`}>
            <h3 className="text-lg font-semibold text-text-primary mb-4">配置 AI 服务</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">AI 服务提供商</label>
                <select
                  value={aiConfig.provider}
                  onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value as any })}
                  className="input"
                >
                  <option value="openai">OpenAI (GPT-4)</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="minimax">MiniMax</option>
                  <option value="glm">智谱 GLM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">API Key</label>
                <input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">模型</label>
                <input
                  type="text"
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                  placeholder="gpt-4"
                  className="input"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveAIConfig}
                disabled={!aiConfig.apiKey}
                className="btn btn-primary flex-1"
              >
                保存配置
              </button>
              <button
                onClick={() => setShowAIConfig(false)}
                className="btn btn-secondary flex-1"
              >
                取消
              </button>
            </div>
            <p className="text-xs text-text-muted mt-4 text-center">
              🔒 你的 API Key 仅保存在本地，不会上传到任何服务器
            </p>
          </div>
        </div>
      )}

      {/* 提示对话框 */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        variant={alertDialog.variant}
        confirmText="我知道了"
      />
    </div>
  )
}

export default DataSource
