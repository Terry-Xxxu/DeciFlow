/**
 * CacheSettings - 缓存设置组件
 * 允许用户配置本地缓存和清理选项
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface CacheStats {
  totalEntries: number
  totalSize: number
  databases: Record<string, { entries: number; size: number }>
  oldestEntry?: number
  newestEntry?: number
}

interface CacheSettingsProps {
  onConfigChange?: (config: CacheConfig) => void
}

interface CacheConfig {
  maxEntries: number
  maxSize: number
  ttl: number
  autoClear: boolean
  clearOnDisconnect: boolean
}

export const CacheSettings: React.FC<CacheSettingsProps> = ({ onConfigChange }) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  const [config, setConfig] = useState<CacheConfig>({
    maxEntries: 1000,
    maxSize: 100,
    ttl: 30 * 60 * 1000,
    autoClear: true,
    clearOnDisconnect: true
  })

  const [stats, setStats] = useState<CacheStats | null>(null)
  const [isClearing, setIsClearing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    loadConfig()
    loadStats()
  }, [])

  const loadConfig = async () => {
    try {
      const savedConfig = await window.electronAPI.cache.getConfig()
      if (savedConfig) {
        setConfig(savedConfig)
      }
    } catch (error) {
      console.error('Failed to load cache config:', error)
    }
  }

  const loadStats = async () => {
    try {
      const result = await window.electronAPI.cache.getStats()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Failed to load cache stats:', error)
    }
  }

  const handleConfigChange = async (newConfig: Partial<CacheConfig>) => {
    const updatedConfig = { ...config, ...newConfig }
    setConfig(updatedConfig)

    try {
      await window.electronAPI.cache.setConfig(updatedConfig)
      onConfigChange?.(updatedConfig)
    } catch (error) {
      console.error('Failed to save cache config:', error)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('确定要清除所有缓存吗？这将释放本地存储空间。')) return

    setIsClearing(true)
    try {
      await window.electronAPI.cache.clearAll()
      await loadStats()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    } finally {
      setIsClearing(false)
    }
  }

  const handleClearDatabase = async (database: string) => {
    if (!confirm(`确定要清除 ${database} 的缓存吗？`)) return

    try {
      await window.electronAPI.cache.clearDatabase(database)
      await loadStats()
    } catch (error) {
      console.error('Failed to clear database cache:', error)
    }
  }

  const formatSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024)
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${mb.toFixed(1)} MB`
  }

  const formatTime = (timestamp?: number): string => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 60) {
      return `${diffMins} 分钟前`
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)} 小时前`
    } else {
      return `${Math.floor(diffMins / 1440)} 天前`
    }
  }

  const getTTLLabel = (ttl: number): string => {
    const mins = ttl / (60 * 1000)
    if (mins < 60) {
      return `${mins} 分钟`
    } else {
      return `${Math.floor(mins / 60)} 小时`
    }
  }

  return (
    <div className="space-y-6">
      {/* 缓存统计 */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl border ${
            isDark
              ? 'bg-slate-800/50 border-white/[0.08]'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
              📊 缓存统计
            </h3>
            <button
              onClick={handleClearAll}
              disabled={isClearing || stats.totalEntries === 0}
              className="px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-red-500 hover:bg-red-600 text-white"
            >
              {isClearing ? '清除中...' : '清除全部'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
              <div className={`text-xs mb-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                总条目数
              </div>
              <div className={`text-2xl font-bold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                {stats.totalEntries}
              </div>
            </div>
            <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
              <div className={`text-xs mb-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                总大小
              </div>
              <div className={`text-2xl font-bold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                {formatSize(stats.totalSize)}
              </div>
            </div>
            <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
              <div className={`text-xs mb-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                数据库数量
              </div>
              <div className={`text-2xl font-bold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                {Object.keys(stats.databases).length}
              </div>
            </div>
          </div>

          {/* 按数据库统计 */}
          {Object.keys(stats.databases).length > 0 && (
            <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
              <div className={`text-xs font-medium mb-3 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                按数据库统计
              </div>
              <div className="space-y-2">
                {Object.entries(stats.databases).map(([db, dbStats]) => (
                  <div
                    key={db}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isDark ? 'bg-slate-800/50' : 'bg-white'
                    }`}
                  >
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                        {db}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                        {dbStats.entries} 条 · {formatSize(dbStats.size)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleClearDatabase(db)}
                      className="px-3 py-1 text-xs rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                    >
                      清除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 时间范围 */}
          <div className="flex justify-between mt-4 pt-4 border-t">
            <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
              最老条目: {formatTime(stats.oldestEntry)}
            </div>
            <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
              最新条目: {formatTime(stats.newestEntry)}
            </div>
          </div>
        </motion.div>
      )}

      {/* 基础设置 */}
      <div className={`p-6 rounded-2xl border ${
        isDark
          ? 'bg-slate-800/50 border-white/[0.08]'
          : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
          ⚙️ 缓存设置
        </h3>

        <div className="space-y-4">
          {/* 断开时清除 */}
          <label className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={config.clearOnDisconnect}
              onChange={(e) => handleConfigChange({ clearOnDisconnect: e.target.checked })}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className={`font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                断开连接时自动清除缓存
              </div>
              <div className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>
                当您断开数据库连接时，自动清除该数据库的所有本地缓存。这可以确保您的数据不会在本地残留。
              </div>
            </div>
          </label>

          {/* 自动清理过期缓存 */}
          <label className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={config.autoClear}
              onChange={(e) => handleConfigChange({ autoClear: e.target.checked })}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className={`font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                自动清理过期缓存
              </div>
              <div className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>
                定期自动清理超过时间限制的缓存条目，释放本地存储空间。
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* 高级设置 */}
      <div className={`p-6 rounded-2xl border ${
        isDark
          ? 'bg-slate-800/50 border-white/[0.08]'
          : 'bg-white border-gray-200'
      }`}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between mb-4"
        >
          <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
            🔧 高级设置
          </h3>
          <span className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4"
          >
            {/* 缓存时间限制 */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                缓存时间限制
              </label>
              <select
                value={config.ttl}
                onChange={(e) => handleConfigChange({ ttl: parseInt(e.target.value) })}
                className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'bg-slate-700 border border-slate-600 text-slate-200 focus:ring-blue-500/50'
                    : 'bg-white border border-gray-300 text-gray-900 focus:ring-blue-500/20'
                }`}
              >
                <option value={15 * 60 * 1000}>15 分钟</option>
                <option value={30 * 60 * 1000}>30 分钟</option>
                <option value={60 * 60 * 1000}>1 小时</option>
                <option value={2 * 60 * 60 * 1000}>2 小时</option>
                <option value={6 * 60 * 60 * 1000}>6 小时</option>
                <option value={24 * 60 * 60 * 1000}>24 小时</option>
              </select>
              <div className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                当前设置：{getTTLLabel(config.ttl)}
              </div>
            </div>

            {/* 最大缓存大小 */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                最大缓存大小
              </label>
              <select
                value={config.maxSize}
                onChange={(e) => handleConfigChange({ maxSize: parseInt(e.target.value) })}
                className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'bg-slate-700 border border-slate-600 text-slate-200 focus:ring-blue-500/50'
                    : 'bg-white border border-gray-300 text-gray-900 focus:ring-blue-500/20'
                }`}
              >
                <option value={50}>50 MB</option>
                <option value={100}>100 MB</option>
                <option value={200}>200 MB</option>
                <option value={500}>500 MB</option>
                <option value={1000}>1 GB</option>
              </select>
              <div className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                当前设置：{config.maxSize} MB
              </div>
            </div>

            {/* 最大条目数 */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                最大缓存条目数
              </label>
              <select
                value={config.maxEntries}
                onChange={(e) => handleConfigChange({ maxEntries: parseInt(e.target.value) })}
                className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'bg-slate-700 border border-slate-600 text-slate-200 focus:ring-blue-500/50'
                    : 'bg-white border border-gray-300 text-gray-900 focus:ring-blue-500/20'
                }`}
              >
                <option value={500}>500 条</option>
                <option value={1000}>1000 条</option>
                <option value={2000}>2000 条</option>
                <option value={5000}>5000 条</option>
              </select>
              <div className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                当前设置：{config.maxEntries} 条
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* 安全提示 */}
      <div className={`p-4 rounded-xl border ${
        isDark
          ? 'bg-green-500/10 border-green-500/20'
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-start gap-2">
          <span className="text-lg">🔒</span>
          <div className={`text-sm ${isDark ? 'text-green-400' : 'text-green-700'}`}>
            <div className="font-semibold mb-1">隐私保护</div>
            <div className="opacity-80">
              本地缓存使用 AES-256 加密存储，仅存储查询结果，不存储任何凭据信息。您可以随时清除缓存。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CacheSettings
