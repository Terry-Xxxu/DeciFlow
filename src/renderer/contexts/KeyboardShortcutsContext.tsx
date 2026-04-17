/**
 * KeyboardShortcutsContext - 全局快捷键管理
 * 提供应用级键盘快捷键功能
 */

import React, { createContext, useContext, useCallback, useEffect, useState, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  description: string
  action: () => void
  category?: 'global' | 'navigation' | 'query' | 'analysis' | 'export'
  enabled?: boolean
}

interface KeyboardShortcutsContextType {
  shortcuts: KeyboardShortcut[]
  registerShortcut: (shortcut: KeyboardShortcut) => void
  unregisterShortcut: (key: string) => void
  isShortcutDialogOpen: boolean
  openShortcutDialog: () => void
  closeShortcutDialog: () => void
  executeShortcut: (key: string) => void
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined)

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext)
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider')
  }
  return context
}

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode
}

export const KeyboardShortcutsProvider: React.FC<KeyboardShortcutsProviderProps> = ({ children }) => {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([])
  const shortcutsRef = useRef<KeyboardShortcut[]>([])
  const [isShortcutDialogOpen, setIsShortcutDialogOpen] = useState(false)

  // Keep ref in sync with state
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts(prev => {
      const filtered = prev.filter(s => s.key !== shortcut.key)
      return [...filtered, { ...shortcut, enabled: shortcut.enabled !== false }]
    })
  }, [])

  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts(prev => prev.filter(s => s.key !== key))
  }, [])

  const executeShortcut = useCallback((key: string) => {
    const shortcut = shortcuts.find(s => s.key === key && s.enabled !== false)
    if (shortcut) {
      shortcut.action()
    }
  }, [shortcuts])

  const openShortcutDialog = useCallback(() => setIsShortcutDialogOpen(true), [])
  const closeShortcutDialog = useCallback(() => setIsShortcutDialogOpen(false), [])

  // 全局键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果在输入框中，不触发快捷键（除非是特定的全局快捷键）
      const target = e.target as HTMLElement
      const isInputFocused = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'

      // 检查是否匹配某个快捷键
      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue

        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey
        const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey
        const altMatch = shortcut.altKey ? e.altKey : !e.altKey

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          // 某些快捷键即使在输入框中也可以触发
          const globalShortcuts = ['?', 'escape']
          if (!isInputFocused || shortcut.category === 'global' || globalShortcuts.includes(shortcut.key.toLowerCase())) {
            e.preventDefault()
            shortcut.action()
            break
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, []) // Empty deps - using ref instead

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        shortcuts,
        registerShortcut,
        unregisterShortcut,
        isShortcutDialogOpen,
        openShortcutDialog,
        closeShortcutDialog,
        executeShortcut
      }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  )
}

/**
 * 获取快捷键的显示文本
 */
export const getShortcutDisplayText = (shortcut: Pick<KeyboardShortcut, 'key' | 'ctrlKey' | 'shiftKey' | 'altKey'>): string => {
  const parts: string[] = []

  if (shortcut.ctrlKey) {
    parts.push(navigator.userAgent.includes('Mac') ? '⌘' : 'Ctrl')
  }
  if (shortcut.shiftKey) {
    parts.push('⇧')
  }
  if (shortcut.altKey) {
    parts.push(navigator.userAgent.includes('Mac') ? '⌥' : 'Alt')
  }

  // 格式化按键名称
  let keyName = shortcut.key
  const keyMappings: Record<string, string> = {
    ' ': 'Space',
    'escape': 'Esc',
    'arrowup': '↑',
    'arrowdown': '↓',
    'arrowleft': '←',
    'arrowright': '→',
    'enter': '↵',
    'tab': 'Tab'
  }

  const lowerKey = keyName.toLowerCase()
  if (keyMappings[lowerKey]) {
    keyName = keyMappings[lowerKey]
  } else if (keyName.length === 1) {
    keyName = keyName.toUpperCase()
  }

  parts.push(keyName)
  return parts.join(' + ')
}
