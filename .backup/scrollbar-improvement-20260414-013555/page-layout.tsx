import React, { useState, type ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"

interface PageLayoutProps {
  children: ReactNode
  currentPage?: string
  onNavigate?: (page: string) => void
}

export function PageLayout({ children, currentPage, onNavigate }: PageLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onNavigate={onNavigate}
        currentPage={currentPage}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="mx-auto max-w-7xl space-y-6 p-4 md:space-y-8 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
