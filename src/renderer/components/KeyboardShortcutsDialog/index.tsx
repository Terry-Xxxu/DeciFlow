/**
 * KeyboardShortcutsDialog - 快捷键帮助对话框
 * 显示所有可用的键盘快捷键
 */

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { useKeyboardShortcuts, getShortcutDisplayText } from '../../contexts/KeyboardShortcutsContext'

interface CategoryGroup {
  category: string
  label: string
  icon: string
  shortcuts: Array<{
    key: string
    keys: string
    description: string
  }>
}

export const KeyboardShortcutsDialog: React.FC = () => {
  const { mode } = useTheme()
  const { shortcuts, closeShortcutDialog, isShortcutDialogOpen } = useKeyboardShortcuts()
  const isDark = mode === 'dark'

  // 如果对话框未打开，不渲染任何内容
  if (!isShortcutDialogOpen) {
    return null
  }

  // 按类别分组快捷键
  const groupedShortcuts = useMemo(() => {
    const groups: Map<string, CategoryGroup> = new Map([
      ['global', {
        category: 'global',
        label: '全局快捷键',
        icon: '🌍',
        shortcuts: []
      }],
      ['navigation', {
        category: 'navigation',
        label: '导航快捷键',
        icon: '🧭',
        shortcuts: []
      }],
      ['query', {
        category: 'query',
        label: '查询快捷键',
        icon: '🔍',
        shortcuts: []
      }],
      ['analysis', {
        category: 'analysis',
        label: '分析快捷键',
        icon: '📊',
        shortcuts: []
      }],
      ['export', {
        category: 'export',
        label: '导出快捷键',
        icon: '💾',
        shortcuts: []
      }]
    ])

    shortcuts.forEach(shortcut => {
      if (shortcut.enabled === false) return

      const category = shortcut.category || 'global'
      const group = groups.get(category)

      if (group) {
        group.shortcuts.push({
          key: shortcut.key,
          keys: getShortcutDisplayText(shortcut),
          description: shortcut.description
        })
      }
    })

    return Array.from(groups.values()).filter(g => g.shortcuts.length > 0)
  }, [shortcuts])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeShortcutDialog}
      />

      {/* 对话框 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-2xl border shadow-2xl ${
          isDark
            ? 'bg-[#111827] border-white/[0.08]'
            : 'bg-white border-gray-200'
        }`}
      >
        {/* 标题栏 */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">⌨️</span>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                键盘快捷键
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                使用快捷键提升您的操作效率
              </p>
            </div>
          </div>
          <button
            onClick={closeShortcutDialog}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            ✕
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {/* 提示信息 */}
          <div className={`mb-6 p-4 rounded-xl border ${
            isDark
              ? 'bg-blue-500/10 border-blue-500/20'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <div className={`text-sm font-semibold mb-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                  快速访问
                </div>
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                  在使用过程中按 <kbd className={`px-1.5 py-0.5 rounded border ${isDark ? 'border-white/10' : 'border-gray-300'} ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>Ctrl + ?</kbd> (Mac: <kbd className={`px-1.5 py-0.5 rounded border ${isDark ? 'border-white/10' : 'border-gray-300'} ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>⌘ + ?</kbd>) 随时打开此帮助
                </div>
              </div>
            </div>
          </div>

          {/* 快捷键列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groupedShortcuts.map((group) => (
              <div
                key={group.category}
                className={`p-4 rounded-xl border ${
                  isDark
                    ? 'bg-slate-800/50 border-white/[0.05]'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                {/* 类别标题 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{group.icon}</span>
                  <h3 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                    {group.label}
                  </h3>
                </div>

                {/* 快捷键列表 */}
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                        isDark
                          ? 'bg-slate-900/30 hover:bg-slate-900/50'
                          : 'bg-white hover:bg-gray-100'
                      } transition-colors`}
                    >
                      <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        {shortcut.description}
                      </span>
                      <kbd className={`px-2 py-1 text-xs rounded border font-mono ${
                        isDark
                          ? 'bg-slate-700 border-slate-600 text-slate-300'
                          : 'bg-gray-100 border-gray-300 text-gray-700'
                      }`}>
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 自定义提示 */}
          <div className={`mt-6 p-4 rounded-xl border ${
            isDark
              ? 'bg-purple-500/10 border-purple-500/20'
              : 'bg-purple-50 border-purple-200'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-xl">🎯</span>
              <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                <div className="font-semibold mb-1">输入框中的快捷键</div>
                <ul className="space-y-1 text-xs">
                  <li>• <kbd className={`px-1 py-0.5 rounded border ${isDark ? 'border-white/10' : 'border-gray-300'}`}>↑</kbd> <kbd className={`px-1 py-0.5 rounded border ${isDark ? 'border-white/10' : 'border-gray-300'}`}>↓</kbd> 在建议列表中导航</li>
                  <li>• <kbd className={`px-1 py-0.5 rounded border ${isDark ? 'border-white/10' : 'border-gray-300'}`}>Enter</kbd> 选中当前建议</li>
                  <li>• <kbd className={`px-1 py-0.5 rounded border ${isDark ? 'border-white/10' : 'border-gray-300'}`}>Esc</kbd> 关闭建议列表</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className={`px-6 py-4 border-t flex justify-between items-center ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
            按任意快捷键或点击外部关闭
          </div>
          <button
            onClick={closeShortcutDialog}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            关闭
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default KeyboardShortcutsDialog
