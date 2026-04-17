
import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "../v0-ui/Button"
import { Badge } from "../v0-ui/Badge"
import { Bell, Moon, Sun, Zap, Menu, Check, X } from "lucide-react"
import { cn } from "../../lib/utils"
import { useTheme } from "../../contexts/ThemeContext"

const notifications = [
  { id: 1, title: "查询完成", message: "用户增长分析已完成", time: "2分钟前", read: false },
  { id: 2, title: "数据更新", message: "数据源已同步最新数据", time: "1小时前", read: false },
  { id: 3, title: "异常预警", message: "检测到留存率异常下降", time: "3小时前", read: true },
]

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { mode, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationList, setNotificationList] = useState(notifications)
  const bellRef = useRef<HTMLDivElement>(null)
  const [panelPosition, setPanelPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const [aiConfigured, setAiConfigured] = useState(false)

  useEffect(() => {
    setMounted(true)
    // 检查 AI 是否已配置
    if (window.electronAPI) {
      window.electronAPI.store.get('ai_config').then((config: any) => {
        setAiConfigured(!!(config?.apiKey))
      }).catch(() => setAiConfigured(false))
    }
  }, [])

  // Calculate panel position when opening
  const handleToggleNotifications = () => {
    if (!showNotifications && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect()
      setPanelPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
    setShowNotifications(!showNotifications)
  }

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

        {aiConfigured && (
          <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5">
            <Zap className="h-4 w-4 text-accent" />
            <span className="hidden text-sm font-medium text-accent sm:inline">AI 增强模式</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <div className="relative" ref={bellRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative text-foreground"
            onClick={handleToggleNotifications}
          >
            <Bell className="h-5 w-5" />
            {notificationList.some((n) => !n.read) && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            )}
            <span className="sr-only">通知</span>
          </Button>

          {/* Notification Panel - Rendered via Portal to avoid z-index issues */}
          {showNotifications &&
            createPortal(
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-[100]"
                  onClick={() => setShowNotifications(false)}
                />

                {/* Panel */}
                <div
                  className="fixed z-[101] w-80 rounded-lg border border-border bg-card shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
                  style={{
                    top: `${panelPosition.top}px`,
                    right: `${panelPosition.right}px`,
                  }}
                >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="font-semibold text-foreground">通知</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => {
                      setNotificationList(notificationList.map((n) => ({ ...n, read: true })))
                    }}
                  >
                    全部已读
                  </Button>
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto">
                  {notificationList.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="mx-auto h-10 w-10 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">暂无通知</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {notificationList.map((notif) => (
                        <div
                          key={notif.id}
                          className={cn(
                            "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                            !notif.read && "bg-muted/30"
                          )}
                        >
                          <div className={cn(
                            "mt-0.5 h-2 w-2 rounded-full shrink-0",
                            !notif.read ? "bg-primary" : "bg-transparent"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{notif.title}</p>
                            <p className="text-xs text-muted-foreground">{notif.message}</p>
                            <p className="mt-1 text-xs text-muted-foreground/70">{notif.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 rounded-none rounded-bl-lg h-9"
                    onClick={() => {
                      setNotificationList([])
                      setShowNotifications(false)
                    }}
                  >
                    清空全部
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 rounded-none rounded-br-lg h-9"
                    onClick={() => setShowNotifications(false)}
                  >
                    关闭
                  </Button>
                </div>
              </div>
              </>,
              document.body
            )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-foreground"
          onClick={toggleTheme}
        >
          {mounted && mode === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="sr-only">切换主题</span>
        </Button>
      </div>
    </header>
  )
}
