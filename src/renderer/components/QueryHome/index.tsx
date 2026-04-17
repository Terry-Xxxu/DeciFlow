import React, { useState, useRef, useEffect } from 'react'
import { useDatabase } from '../../stores/DatabaseStore'
import { notificationManager } from '../NotificationCenter'
import { EnhancedQueryInput, type QueryInputRef } from '../EnhancedQueryInput'

interface QueryHomeProps {
  onAnalyze: (context: { query: string; result: any; analysis: any }) => void
}

export const QueryHome: React.FC<QueryHomeProps> = ({ onAnalyze }) => {
  const { currentDatabase, databases } = useDatabase()
  const [isQuerying, setIsQuerying] = useState(false)
  const [result, setResult] = useState<any>(null)
  const queryInputRef = useRef<QueryInputRef>(null)

  // 示例问题
  const examples = [
    { text: '上个月新用户留存率是多少？', icon: '📈' },
    { text: '对比一下这周和上周的转化率', icon: '📊' },
    { text: '哪个渠道带来的用户质量最高？', icon: '🎯' },
  ]

  // 加载历史查询
  const [recentQueries, setRecentQueries] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('query_history')
    if (saved) {
      try {
        const history = JSON.parse(saved)
        setRecentQueries(history.slice(0, 3).map((h: any) => h.query))
      } catch (e) {
        console.error('Failed to load history', e)
      }
    }
  }, [])

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim()) return

    setIsQuerying(true)
    setResult(null)

    try {
      // 生成SQL
      const sqlResult = await window.electronAPI.nl.generateSQL(currentDatabase, queryText)

      if (!sqlResult.success || !sqlResult.data) {
        notificationManager.error('查询失败', sqlResult.message || '无法生成SQL')
        setIsQuerying(false)
        return
      }

      // 执行查询 - 使用实际的数据库配置
      const dbConfig = databases.find(db => db.type === currentDatabase)
      if (!dbConfig) {
        notificationManager.error('配置错误', '未找到数据库配置')
        setIsQuerying(false)
        return
      }

      const queryResult = await window.electronAPI.database.query(
        {
          type: dbConfig.type,
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          username: dbConfig.username,
          password: '' // 从存储中获取
        },
        sqlResult.data.sql
      )

      if (!queryResult.success) {
        notificationManager.error('查询失败', queryResult.message || '执行SQL失败')
        setIsQuerying(false)
        return
      }

      setResult({
        sql: sqlResult.data.sql,
        data: queryResult.data,
        executionTime: queryResult.executionTime || 0
      })

      // 保存到历史
      const history = JSON.parse(localStorage.getItem('query_history') || '[]')
      history.unshift({ query: queryText, timestamp: new Date().toISOString() })
      localStorage.setItem('query_history', JSON.stringify(history.slice(0, 50)))
      setRecentQueries(JSON.parse(localStorage.getItem('query_history') || '[]').slice(0, 3).map((h: any) => h.query))

    } catch (error) {
      notificationManager.error('查询失败', error instanceof Error ? error.message : '未知错误')
    } finally {
      setIsQuerying(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      {/* 查询输入区 */}
      <div className="max-w-3xl mx-auto w-full mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center">
              <span className="text-xl">💬</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">请输入你想了解的数据</h1>
              <p className="text-xs text-text-muted">
                使用自然语言描述，AI 会自动帮你查询
                <span className="ml-2 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">
                  {currentDatabase === 'postgresql' ? 'PostgreSQL' : currentDatabase === 'mysql' ? 'MySQL' : 'MongoDB'}
                </span>
              </p>
            </div>
          </div>

          <EnhancedQueryInput
            ref={queryInputRef}
            onSubmit={handleQuery}
            placeholder="例如：上个月新用户留存率是多少？"
          />

          {/* 示例问题 */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-text-muted self-center mr-1">试试：</span>
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={() => {
                  queryInputRef.current?.setValue(example.text)
                }}
                className="px-3 py-1.5 text-xs bg-white/5 text-text-secondary rounded-lg hover:bg-white/10 hover:text-text-primary transition-all border border-white/5 hover:border-white/10"
              >
                {example.icon} {example.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 查询结果 */}
      {result && (
        <div className="max-w-5xl mx-auto w-full">
          <div className="card p-6">
            {/* 结果头部 */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">查询结果</h2>
                <p className="text-xs text-text-muted">
                  执行时间: {result.executionTime}ms
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onAnalyze({ query, result, analysis: null })}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg text-sm font-medium transition-all"
                >
                  🧠 AI 分析
                </button>
              </div>
            </div>

            {/* 数据表格 */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    {result.data.columns?.map((col: string) => (
                      <th key={col} className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.data.rows?.slice(0, 20).map((row: any, index: number) => (
                    <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/50">
                      {result.data.columns?.map((col: string) => (
                        <td key={col} className="px-4 py-3 text-sm text-text-primary">
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.data.rows?.length > 20 && (
              <p className="text-xs text-text-muted mt-2 text-center">
                显示前 20 行，共 {result.data.rows.length} 行数据
              </p>
            )}
          </div>
        </div>
      )}

      {/* 最近查询 */}
      {!result && recentQueries.length > 0 && (
        <div className="max-w-3xl mx-auto w-full">
          <div className="card p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-3">最近查询</h3>
            <div className="space-y-2">
              {recentQueries.map((q, index) => (
                <button
                  key={index}
                  onClick={() => {
                    queryInputRef.current?.setValue(q)
                  }}
                  className="w-full text-left px-3 py-2 bg-slate-900/50 hover:bg-slate-900 rounded-lg text-sm text-text-primary transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
