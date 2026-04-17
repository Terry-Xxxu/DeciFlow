/**
 * Theme Context - 主题管理
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { ThemeMode, getTokens } from '../constants/design-tokens'

interface ThemeContextType {
  mode: ThemeMode
  toggleTheme: () => void
  tokens: ReturnType<typeof getTokens>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // 从 localStorage 读取，或默认使用暗色模式
    const saved = localStorage.getItem('theme') as ThemeMode
    return saved || 'dark'
  })

  useEffect(() => {
    // 根据当前模式切换 class
    const root = document.documentElement
    if (mode === 'dark') {
      root.classList.add('dark')
      root.style.backgroundColor = 'oklch(0.1 0.015 260)'
    } else {
      root.classList.remove('dark')
      root.style.backgroundColor = 'oklch(0.985 0.002 240)'
    }
  }, [mode])

  const toggleTheme = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark'
    setMode(newMode)
    localStorage.setItem('theme', newMode)
  }

  const tokens = getTokens(mode)

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, tokens }}>
      {children}
    </ThemeContext.Provider>
  )
}
