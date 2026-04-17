import React, { useState } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { QueryInput } from "./query-input"
import { StatsCards } from "./stats-cards"
import { AIInsights } from "./ai-insights"
import { RecentQueries } from "./recent-queries"
import { DataPreview } from "./data-preview"
import { ChartPreview } from "./chart-preview"
import { QuickActions } from "./quick-actions"
import { PremiumEmptyState, EmptyState } from "./empty-states"

interface DashboardProps {
  onNavigate?: (page: string) => void
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hasQueryResult, setHasQueryResult] = useState(false)
  const [hasDataSource, setHasDataSource] = useState(false) // Toggle for empty state demo

  const handleQuery = (query: string) => {
    console.log("[v0] Query submitted:", query)
    setHasQueryResult(true)
  }

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-8 p-6">
            {/* Welcome Section */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                欢迎回来
              </h1>
              <p className="text-muted-foreground">
                用自然语言探索你的数据，AI 将帮助你发现洞察
              </p>
            </div>

            {/* Query Input */}
            <QueryInput onSubmit={handleQuery} />

            {!hasDataSource ? (
              /* Empty State when no data source connected */
              <PremiumEmptyState />
            ) : (
              <>
                {/* Quick Actions */}
                <QuickActions />

                {/* Stats Overview */}
                <StatsCards />

                {/* AI Insights - Highlighted Section */}
                <AIInsights hasData={hasQueryResult} />

                {/* Results Section */}
                {hasQueryResult && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <DataPreview />
                    <ChartPreview />
                  </div>
                )}

                {/* Recent Queries */}
                <RecentQueries />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
