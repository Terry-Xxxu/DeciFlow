/**
 * HistorySidebar - 历史记录和收藏侧边栏（支持双模式）
 */

import React, { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import {
  getHistory,
  getFavorites,
  deleteFromHistory,
  toggleFavorite,
  searchHistory,
  addTag,
  getHistoryStats,
  type QueryHistory
} from '../../utils/history-manager'

interface HistorySidebarProps {
  onSelectHistory?: (item: QueryHistory) => void
  onClose?: () => void
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  onSelectHistory,
  onClose
}) => {
  const { mode } = useTheme()
  const [activeTab, setActiveTab] = useState<'history' | 'favorites' | 'stats'>('history')
  const [history, setHistory] = useState<QueryHistory[]>([])
  const [favorites, setFavorites] = useState<QueryHistory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    totalQueries: 0,
    favorites: 0,
    thisWeek: 0,
    topQueries: [] as string[]
  })
  const isDark = mode === 'dark'

  // 加载数据
  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setHistory(getHistory())
    setFavorites(getFavorites())
    setStats(getHistoryStats())
  }

  // 搜索处理
  useEffect(() => {
    if (searchTerm) {
      setHistory(searchHistory(searchTerm))
    } else {
      setHistory(getHistory())
    }
  }, [searchTerm])

  /**
   * 删除历史
   */
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('确定要删除这条记录吗？')) {
      deleteFromHistory(id)
      loadData()
    }
  }

  /**
   * 切换收藏
   */
  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFavorite(id)
    loadData()
  }

  /**
   * 选择历史
   */
  const handleSelect = (item: QueryHistory) => {
    onSelectHistory?.(item)
    onClose?.()
  }

  /**
   * 格式化时间
   */
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  const getTabButtonClass = (tab: string) => {
    const isActive = activeTab === tab
    if (isDark) {
      return isActive
        ? 'bg-blue-500/20 text-blue-400'
        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
    }
    return isActive
      ? 'bg-blue-100 text-blue-600 border border-blue-200'
      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
  }

  return (
    <div className={`w-80 border-l flex flex-col h-full ${
      isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
    }`}>
      {/* 标题栏 */}
      <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>历史记录</h3>
          <button
            onClick={onClose}
            className={isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}
          >
            ✕
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${getTabButtonClass('history')}`}
          >
            历史 ({history.length})
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${getTabButtonClass('favorites')}`}
          >
            收藏 ({favorites.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${getTabButtonClass('stats')}`}
          >
            统计
          </button>
        </div>

        {/* 搜索框 */}
        {(activeTab === 'history' || activeTab === 'favorites') && (
          <div className="mt-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索历史..."
              className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 ${
                isDark
                  ? 'bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-blue-500/50'
                  : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500/20'
              }`}
            />
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 统计视图 */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`text-sm mb-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>总查询次数</div>
              <div className={`text-2xl font-bold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>{stats.totalQueries}</div>
            </div>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`text-sm mb-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>收藏数</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.favorites}</div>
            </div>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`text-sm mb-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>本周查询</div>
              <div className="text-2xl font-bold text-blue-400">{stats.thisWeek}</div>
            </div>
            {stats.topQueries.length > 0 && (
              <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-50 border border-gray-200'}`}>
                <div className={`text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>常用查询</div>
                <div className="space-y-2">
                  {stats.topQueries.map((query, index) => (
                    <div key={index} className={`text-sm truncate ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {index + 1}. {query}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 历史列表 */}
        {activeTab === 'history' && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                <span className="text-4xl mb-2 block">📋</span>
                <p>暂无历史记录</p>
              </div>
            ) : (
              history.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`p-3 rounded-lg cursor-pointer group transition-colors ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>{item.query}</div>
                      <div className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                        {item.resultCount} 条结果 · {formatTime(item.timestamp)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleToggleFavorite(item.id, e)}
                        className={`p-1 rounded transition-colors ${
                          isDark
                            ? 'hover:bg-slate-600'
                            : 'hover:bg-gray-200'
                        } ${item.favorite ? 'text-yellow-400' : isDark ? 'text-slate-500' : 'text-gray-400'}`}
                      >
                        {item.favorite ? '⭐' : '☆'}
                      </button>
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className={`p-1 rounded transition-colors ${
                          isDark
                            ? 'hover:bg-slate-600 text-slate-500'
                            : 'hover:bg-gray-200 text-gray-400'
                        }`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 收藏列表 */}
        {activeTab === 'favorites' && (
          <div className="space-y-2">
            {favorites.length === 0 ? (
              <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                <span className="text-4xl mb-2 block">⭐</span>
                <p>暂无收藏</p>
              </div>
            ) : (
              favorites.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`p-3 rounded-lg cursor-pointer group transition-colors ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>{item.query}</div>
                      <div className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                        {item.resultCount} 条结果 · {formatTime(item.timestamp)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleToggleFavorite(item.id, e)}
                        className={`p-1 rounded transition-colors text-yellow-400 ${
                          isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-200'
                        }`}
                      >
                        ⭐
                      </button>
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className={`p-1 rounded transition-colors ${
                          isDark
                            ? 'hover:bg-slate-600 text-slate-500'
                            : 'hover:bg-gray-200 text-gray-400'
                        }`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default HistorySidebar
