/**
 * useRegisterShortcuts - 注册组件级快捷键的 Hook
 */

import { useEffect } from 'react'
import { useKeyboardShortcuts, type KeyboardShortcut } from '../contexts/KeyboardShortcutsContext'

export const useRegisterShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts()

  useEffect(() => {
    shortcuts.forEach(shortcut => {
      registerShortcut(shortcut)
    })

    return () => {
      shortcuts.forEach(shortcut => {
        unregisterShortcut(shortcut.key)
      })
    }
  }, [shortcuts, registerShortcut, unregisterShortcut])
}

/**
 * 通用快捷键定义
 */
export const commonShortcuts = {
  // 全局
  showHelp: {
    key: '?',
    ctrlKey: true,
    description: '显示快捷键帮助',
    category: 'global' as const
  },
  closeDialog: {
    key: 'escape',
    description: '关闭对话框/面板',
    category: 'global' as const
  },

  // 导航
  goToQuery: {
    key: 'g',
    ctrlKey: true,
    shiftKey: true,
    description: '前往查询页',
    category: 'navigation' as const
  },
  goToAnalysis: {
    key: 'a',
    ctrlKey: true,
    shiftKey: true,
    description: '前往分析页',
    category: 'navigation' as const
  },
  goToHistory: {
    key: 'h',
    ctrlKey: true,
    shiftKey: true,
    description: '查看历史记录',
    category: 'navigation' as const
  },

  // 查询
  focusSearch: {
    key: 'k',
    ctrlKey: true,
    description: '聚焦搜索框',
    category: 'query' as const
  },
  newQuery: {
    key: 'n',
    ctrlKey: true,
    description: '新建查询',
    category: 'query' as const
  },
  executeQuery: {
    key: 'enter',
    description: '执行查询 (在搜索框中)',
    category: 'query' as const
  },

  // 分析
  runAnalysis: {
    key: 'r',
    ctrlKey: true,
    description: '运行 AI 分析',
    category: 'analysis' as const
  },
  exportResults: {
    key: 'e',
    ctrlKey: true,
    description: '导出结果',
    category: 'export' as const
  },
  saveReport: {
    key: 's',
    ctrlKey: true,
    description: '保存报告',
    category: 'export' as const
  }
}
