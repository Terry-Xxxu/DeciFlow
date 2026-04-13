import React, { useState } from "react"
import { cn } from "../../lib/utils"
import {
  Search,
  BarChart3,
  Database,
  Settings,
  Sparkles,
  BookOpen,
  Clock,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react"
import { DeciFlowLogo } from "./deciflow-logo"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
  onNavigate?: (page: string) => void
  currentPage?: string
}

interface NavItem {
  icon: any
  label: string
  id: string
  badge: string | null
}

const navItems: NavItem[] = [
  { icon: Search, label: "查询", id: "dashboard", badge: null },
  { icon: Sparkles, label: "AI 分析", id: "analysis", badge: "AI" },
  { icon: BarChart3, label: "数据可视化", id: "charts", badge: null },
  { icon: Database, label: "数据源", id: "datasources", badge: null },
  { icon: BookOpen, label: "数据字典", id: "dictionary", badge: null },
  { icon: Clock, label: "历史记录", id: "history", badge: null },
]

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  onNavigate,
  currentPage = "dashboard"
}: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const handleNavigate = (itemId: string) => {
    if (onNavigate) {
      onNavigate(itemId)
    }
    if (onMobileClose) {
      onMobileClose()
    }
  }

  const sidebarContent = (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-4">
        <DeciFlowLogo showText={!collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all w-full",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-border p-3">
        <button
          onClick={() => handleNavigate("settings")}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground w-full",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "设置" : undefined}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span>设置</span>}
        </button>
      </div>

      {/* Toggle Button - hidden on mobile */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-secondary hover:text-foreground md:flex"
        title={collapsed ? "展开侧边栏" : "收起侧边栏"}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block">{sidebarContent}</div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          {/* Sidebar */}
          <div className="absolute left-0 top-0 h-full w-64 border-r border-border bg-sidebar shadow-xl">
            {/* Mobile header */}
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <DeciFlowLogo />
              <button
                onClick={onMobileClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-3">
              {navItems.map((item) => {
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all w-full",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
            {/* Settings */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3">
              <button
                onClick={() => handleNavigate("settings")}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground w-full"
              >
                <Settings className="h-5 w-5 shrink-0" />
                <span>设置</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
