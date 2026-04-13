import React, { useEffect, useState } from "react"
import { Button } from "../ui/button"
import { Bell, Moon, Sun, Zap, Menu } from "lucide-react"
import { useTheme } from "../../contexts/ThemeContext"

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { mode, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">打开菜单</span>
        </Button>

        <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5">
          <Zap className="h-4 w-4 text-accent" />
          <span className="hidden text-sm font-medium text-accent sm:inline">AI 增强模式</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
        >
          {mounted && mode === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="sr-only">切换主题</span>
        </Button>
        <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
          U
        </div>
      </div>
    </header>
  )
}
