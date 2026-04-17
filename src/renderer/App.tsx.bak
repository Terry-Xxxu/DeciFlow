import React, { useState } from 'react'
import { ErrorBoundary } from './components/ErrorDisplay'
import { V0DashboardPage } from './pages/V0DashboardPage'
import { V0AnalysisPage } from './pages/V0AnalysisPage'
import { V0ChartsPage } from './pages/V0ChartsPage'
import { V0DataSourcesPage } from './pages/V0DataSourcesPage'
import { V0DictionaryPage } from './pages/V0DictionaryPage'
import { V0HistoryPage } from './pages/V0HistoryPage'
import { V0SettingsPage } from './pages/V0SettingsPage'
import { DatabaseProvider } from './stores/DatabaseStore'
import { ThemeProvider } from './contexts/ThemeContext'
import { KeyboardShortcutsProvider } from './contexts/KeyboardShortcutsContext'
import { PerformanceMonitorProvider } from './contexts/PerformanceMonitorContext'
import { OnboardingFlow } from './components/OnboardingFlow'
import { NotificationCenter } from './components/NotificationCenter'

type PageType = 'dashboard' | 'analysis' | 'charts' | 'datasources' | 'dictionary' | 'history' | 'settings'

// 内部App内容组件 - 在ThemeProvider内部使用
function AppContent() {
  const [activePage, setActivePage] = useState<PageType>('dashboard')
  const [showOnboarding, setShowOnboarding] = useState(false)

  // 检查是否首次运行
  React.useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed')
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true)
    }
  }, [])

  const handleOnboardingComplete = () => {
    localStorage.setItem('onboarding_completed', 'true')
    setShowOnboarding(false)
  }

  // 根据页面类型渲染对应的 v0 页面
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <V0DashboardPage onNavigate={setActivePage} />
      case 'analysis':
        return <V0AnalysisPage onNavigate={setActivePage} />
      case 'charts':
        return <V0ChartsPage onNavigate={setActivePage} />
      case 'datasources':
        return <V0DataSourcesPage onNavigate={setActivePage} />
      case 'dictionary':
        return <V0DictionaryPage onNavigate={setActivePage} />
      case 'history':
        return <V0HistoryPage onNavigate={setActivePage} />
      case 'settings':
        return <V0SettingsPage onNavigate={setActivePage} />
      default:
        return <V0DashboardPage onNavigate={setActivePage} />
    }
  }

  return (
    <ErrorBoundary>
      {/* 数据接入引导 */}
      {showOnboarding && (
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onClose={() => setShowOnboarding(false)}
        />
      )}

      {/* 页面导航 - 通过 prop 传递给子组件 */}
      {React.cloneElement(renderPage() as React.ReactElement, {
        onNavigate: setActivePage
      })}
    </ErrorBoundary>
  )
}

// App根组件 - 包含Provider
function App() {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <KeyboardShortcutsProvider>
          <PerformanceMonitorProvider>
            <AppContent />
          </PerformanceMonitorProvider>
        </KeyboardShortcutsProvider>
      </DatabaseProvider>
    </ThemeProvider>
  )
}

export default App
