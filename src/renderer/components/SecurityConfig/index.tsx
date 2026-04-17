/**
 * 数据安全策略配置组件
 * 允许用户配置数据访问模式、脱敏等安全策略
 */

import React, { useState, useEffect } from 'react'
import { AlertDialog } from '../Modal'

interface DataSecurityConfig {
  dataAccessMode: 'local_only' | 'proxy'
  sendRawDataToAI: boolean
  anonymizationEnabled: boolean
  auditLogEnabled: boolean
  allowedTables?: string[]
  blockedTables?: string[]
  maxRowCount?: number
  maxExecutionTime?: number
}

interface SecurityConfigProps {
  onSave?: (config: DataSecurityConfig) => void
}

export const SecurityConfig: React.FC<SecurityConfigProps> = ({ onSave }) => {
  const [config, setConfig] = useState<DataSecurityConfig>({
    dataAccessMode: 'local_only',
    sendRawDataToAI: false,
    anonymizationEnabled: true,
    auditLogEnabled: true,
    maxRowCount: 10000,
    maxExecutionTime: 30000,
  })

  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    variant: 'info' | 'warning' | 'error' | 'success'
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'error'
  })

  const [tips, setTips] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const result = await window.electronAPI.security.getConfig()
      if (result.success && result.data) {
        setConfig(result.data)
      }
    } catch (error) {
      console.error('加载安全配置失败:', error)
    }
  }

  const loadTips = async () => {
    try {
      const result = await window.electronAPI.security.getTips()
      if (result.success && result.data) {
        setTips(result.data)
      }
    } catch (error) {
      console.error('加载安全提示失败:', error)
    }
  }

  useEffect(() => {
    loadTips()
  }, [])

  const handleUpdate = async (updates: Partial<DataSecurityConfig>) => {
    setLoading(true)
    try {
      const newConfig = { ...config, ...updates }
      const result = await window.electronAPI.security.updateConfig(updates)

      if (result.success) {
        setConfig(newConfig)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)
        onSave?.(newConfig)
      } else {
        setAlertDialog({
          isOpen: true,
          title: '更新失败',
          message: result.message || '未知错误',
          variant: 'error'
        })
      }
    } catch (error) {
      console.error('更新安全配置失败:', error)
      setAlertDialog({
        isOpen: true,
        title: '更新失败',
        message: '更新安全配置时发生错误，请稍后重试',
        variant: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <div className="space-y-6 p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">数据安全策略</h2>
          <p className="text-sm text-slate-400 mt-1">配置数据访问和隐私保护策略</p>
        </div>
        {saveSuccess && (
          <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm">
            ✓ 保存成功
          </div>
        )}
      </div>

      {/* 数据访问模式 */}
      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-4">
        <h3 className="text-lg font-semibold text-slate-200">数据访问模式</h3>

        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="dataAccessMode"
              checked={config.dataAccessMode === 'local_only'}
              onChange={() => handleUpdate({ dataAccessMode: 'local_only' })}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-300">仅本地访问</div>
              <div className="text-sm text-slate-500 mt-1">
                所有数据仅在本地处理，不会上传到任何远程服务器
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="dataAccessMode"
              checked={config.dataAccessMode === 'proxy'}
              onChange={() => handleUpdate({ dataAccessMode: 'proxy' })}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-300">代理模式</div>
              <div className="text-sm text-slate-500 mt-1">
                通过企业代理服务器访问数据（需要配置代理）
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* AI 数据发送策略 */}
      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-4">
        <h3 className="text-lg font-semibold text-slate-200">AI 数据发送策略</h3>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.sendRawDataToAI}
            onChange={(e) => handleUpdate({ sendRawDataToAI: e.target.checked })}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-300">发送原始数据到 AI</div>
            <div className="text-sm text-slate-500 mt-1">
              ⚠️ 如果启用，原始查询数据将发送给 AI 服务进行分析。建议禁用此选项。
            </div>
          </div>
        </label>
      </div>

      {/* 数据脱敏 */}
      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-4">
        <h3 className="text-lg font-semibold text-slate-200">数据脱敏</h3>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.anonymizationEnabled}
            onChange={(e) => handleUpdate({ anonymizationEnabled: e.target.checked })}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-300">启用敏感字段自动脱敏</div>
            <div className="text-sm text-slate-500 mt-1">
              自动识别并脱敏敏感字段（email、phone、user_id 等），防止隐私数据泄露
            </div>
          </div>
        </label>

        {config.anonymizationEnabled && (
          <div className="mt-4 p-3 rounded-lg bg-slate-900/50">
            <div className="text-sm text-slate-400 mb-2">脱敏字段类型：</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div>• Email 地址</div>
              <div>• 电话号码</div>
              <div>• 用户 ID</div>
              <div>• 身份证号</div>
              <div>• 真实姓名</div>
              <div>• 地址信息</div>
              <div>• 信用卡号</div>
              <div>• 银行账户</div>
            </div>
          </div>
        )}
      </div>

      {/* 审计日志 */}
      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-4">
        <h3 className="text-lg font-semibold text-slate-200">审计日志</h3>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.auditLogEnabled}
            onChange={(e) => handleUpdate({ auditLogEnabled: e.target.checked })}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-300">启用查询审计日志</div>
            <div className="text-sm text-slate-500 mt-1">
              记录所有查询操作的详细信息，包括 SQL、执行时间、使用的数据表等
            </div>
          </div>
        </label>
      </div>

      {/* 查询限制 */}
      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-4">
        <h3 className="text-lg font-semibold text-slate-200">查询限制</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">最大返回行数</label>
            <input
              type="number"
              value={config.maxRowCount || 10000}
              onChange={(e) => handleUpdate({ maxRowCount: parseInt(e.target.value) || 10000 })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">最大执行时间 (ms)</label>
            <input
              type="number"
              value={config.maxExecutionTime || 30000}
              onChange={(e) => handleUpdate({ maxExecutionTime: parseInt(e.target.value) || 30000 })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* 安全提示 */}
      {tips.length > 0 && (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-2">
          <h4 className="text-sm font-semibold text-blue-400">🔒 安全建议</h4>
          <ul className="space-y-1">
            {tips.map((tip, index) => (
              <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="text-slate-400">保存中...</div>
        </div>
      )}
    </div>

    <AlertDialog
      isOpen={alertDialog.isOpen}
      onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
      title={alertDialog.title}
      message={alertDialog.message}
      variant={alertDialog.variant}
      confirmText="我知道了"
    />
    </>
  )
}

export default SecurityConfig
