/**
 * Sidebar - 侧边导航栏组件（支持双模式）
 */

import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { BarChart3, Cpu, Settings, MessageSquare, HelpCircle } from 'lucide-react'

interface SidebarProps {
  activeView: 'query' | 'analysis' | 'management'
  onViewChange: (view: 'query' | 'analysis' | 'management') => void
  hasChatContext: boolean
  onStartTour?: () => void
}

const sidebarItems = [
  { id: 'query' as const, icon: BarChart3, label: '查询' },
  { id: 'analysis' as const, icon: Cpu, label: '分析' },
  { id: 'management' as const, icon: Settings, label: '管理' },
]

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, hasChatContext, onStartTour }) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  return (
    <div className={`w-16 flex flex-col items-center py-2 pt-12 gap-2 ${
      isDark
        ? 'bg-[#0a101f]/50 border-r border-white/5'
        : 'bg-gray-50 border-r border-gray-200'
    }`} data-tour="sidebar">
      {sidebarItems.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              activeView === item.id
                ? isDark
                  ? 'bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 text-blue-400'
                  : 'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 border border-blue-200'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
            title={item.label}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] leading-none">{item.label}</span>
          </button>
        )
      })}

      {/* 对话入口 - 只在有上下文时显示 */}
      {hasChatContext && (
        <>
          <div className="flex-1" />
          <div className={`w-8 h-px ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />
          <button
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              isDark
                ? 'text-purple-400 bg-purple-500/10 hover:bg-purple-500/20'
                : 'text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200'
            }`}
            title="继续对话"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] leading-none">对话</span>
          </button>
        </>
      )}

      {/* 帮助和引导按钮 */}
      <div className="flex-1" />
      {onStartTour && (
        <>
          <div className={`w-8 h-px ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />
          <button
            onClick={onStartTour}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              isDark
                ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200'
            }`}
            title="开始功能引导"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="text-[10px] leading-none">引导</span>
          </button>
        </>
      )}
    </div>
  )
}
