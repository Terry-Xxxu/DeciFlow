/**
 * DatabaseSelector - 数据库类型选择器组件（支持双模式）
 * 支持 PostgreSQL/MySQL/MongoDB 切换
 */

import React, { useState } from 'react'
import { useDatabase } from '../../stores/DatabaseStore'
import { useTheme } from '../../contexts/ThemeContext'
import { DatabaseType } from '../../types/database'
import { Server, Database, Leaf, Search, Check, X, Loader2, Lightbulb } from 'lucide-react'

interface DatabaseSelectorProps {
  compact?: boolean
}

export const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({ compact = false }) => {
  const { mode } = useTheme()
  const { currentDatabase, setDatabaseType, databases } = useDatabase()
  const [isOpen, setIsOpen] = useState(false)
  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const isDark = mode === 'dark'

  const dbConfig: Record<string, { icon: React.ReactNode; name: string; color: string; defaultPort: number }> = {
    postgresql: { icon: <Server className="w-4 h-4" />,   name: 'PostgreSQL', color: 'bg-blue-500/20 text-blue-400',   defaultPort: 5432  },
    mysql:      { icon: <Database className="w-4 h-4" />, name: 'MySQL',      color: 'bg-orange-500/20 text-orange-400', defaultPort: 3306  },
    mongodb:    { icon: <Leaf className="w-4 h-4" />,     name: 'MongoDB',    color: 'bg-green-500/20 text-green-400',  defaultPort: 27017 },
  }

  // 获取当前数据库的配置
  const getCurrentDBConfig = () => {
    return databases.find(db => db.type === currentDatabase) || databases[0]
  }

  // 测试连接
  const handleTestConnection = async () => {
    const dbConfig = getCurrentDBConfig()
    if (!dbConfig) return

    setTestingStatus('testing')
    try {
      const result = await window.electronAPI.database.test({
        type: dbConfig.type,
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        username: dbConfig.username,
        password: '' // 从存储中获取密码
      })

      if (result.success) {
        setTestingStatus('success')
        setTimeout(() => setTestingStatus('idle'), 2000)
      } else {
        setTestingStatus('error')
        setTimeout(() => setTestingStatus('idle'), 2000)
      }
    } catch (error) {
      setTestingStatus('error')
      setTimeout(() => setTestingStatus('idle'), 2000)
    }
  }

  // 切换数据库类型
  const handleSwitchDatabase = async (dbType: string) => {
    setDatabaseType(dbType as DatabaseType)
    setIsOpen(false)

    // 自动测试新数据库连接
    const newDbConfig = databases.find(db => db.type === dbType)
    if (newDbConfig) {
      setTestingStatus('testing')
      try {
        const result = await window.electronAPI.database.test({
          type: newDbConfig.type,
          host: newDbConfig.host,
          port: newDbConfig.port,
          database: newDbConfig.database,
          username: newDbConfig.username,
          password: ''
        })

        if (result.success) {
          setTestingStatus('success')
          setTimeout(() => setTestingStatus('idle'), 2000)
        } else {
          setTestingStatus('error')
          setTimeout(() => setTestingStatus('idle'), 2000)
        }
      } catch (error) {
        setTestingStatus('error')
        setTimeout(() => setTestingStatus('idle'), 2000)
      }
    }
  }

  if (compact) {
    return (
      <div className="relative group">
        <button className={`px-2 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
          isDark
            ? 'bg-background-tertiary hover:bg-background-elevated text-text-muted'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
        }`}>
          <span>{dbConfig[currentDatabase]?.icon}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-2 ${
            isDark
              ? 'bg-background-tertiary hover:bg-background-elevated text-text-secondary'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <span>{dbConfig[currentDatabase]?.icon}</span>
          <span>{dbConfig[currentDatabase]?.name}</span>
          <span className="text-text-muted">▼</span>
        </button>

        {/* 测试连接按钮 */}
        <button
          onClick={handleTestConnection}
          disabled={testingStatus === 'testing'}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            testingStatus === 'testing'
              ? 'opacity-50'
              : testingStatus === 'success'
                ? isDark
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-green-100 text-green-700'
                : testingStatus === 'error'
                  ? isDark
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-red-100 text-red-700'
                  : isDark
                    ? 'bg-background-tertiary hover:bg-background-elevated text-text-muted'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
          title="测试连接"
        >
          {testingStatus === 'testing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {testingStatus === 'success' && <Check className="w-3.5 h-3.5" />}
          {testingStatus === 'error' && <X className="w-3.5 h-3.5" />}
          {testingStatus === 'idle' && <Search className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
          <div className={`absolute top-full mt-2 right-0 z-50 rounded-xl shadow-xl overflow-hidden min-w-[200px] ${
            isDark
              ? 'bg-background-secondary border border-white/[0.08]'
              : 'bg-white border border-gray-200'
          }`}>
            {/* 标题 */}
            <div className={`px-4 py-2 border-b text-xs ${isDark ? 'border-white/[0.08] text-text-muted' : 'border-gray-200 text-gray-500'}`}>
              选择数据库类型
            </div>

            {/* 数据库列表 */}
            {(Object.keys(dbConfig) as string[]).map((db) => {
              const config = dbConfig[db]
              const isCurrent = currentDatabase === db
              const dbInStore = databases.find(d => d.type === db)

              return (
                <button
                  key={db}
                  onClick={() => handleSwitchDatabase(db)}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-white/[0.05] transition-colors flex items-center justify-between ${
                    isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-50'
                  } ${isCurrent ? 'text-brand-primary' : isDark ? 'text-text-secondary' : 'text-gray-700'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-base">{config.icon}</div>
                    <div>
                      <div className="font-medium">{config.name}</div>
                      <div className={`text-xs ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
                        默认端口: {config.defaultPort}
                      </div>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className={`w-2 h-2 rounded-full ${
                      dbInStore?.connected
                        ? 'bg-green-500'
                        : isDark ? 'bg-slate-500' : 'bg-gray-400'
                    }`} />
                  )}
                </button>
              )
            })}

            {/* 底部提示 */}
            <div className={`px-4 py-2 border-t text-xs ${isDark ? 'border-white/[0.08] text-text-muted' : 'border-gray-200 text-gray-500'}`}>
              <Lightbulb className="w-3 h-3 inline-block mr-1" />切换后将自动测试连接
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default DatabaseSelector
