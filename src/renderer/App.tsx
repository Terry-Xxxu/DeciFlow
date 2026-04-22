import React, { useState } from 'react'
import { ErrorBoundary } from './components/ErrorDisplay'
import { V0DashboardPage } from './pages/V0DashboardPage'
import { V0AnalysisPage } from './pages/V0AnalysisPage'
import { V0ChartsPage } from './pages/V0ChartsPage'
import { V0DataSourcesPage } from './pages/V0DataSourcesPage'
import { V0DictionaryPage } from './pages/V0DictionaryPage'
import { V0HistoryPage } from './pages/V0HistoryPage'
import { V0SettingsPage } from './pages/V0SettingsPage'
import { DatabaseProvider, useDatabase, DatabaseConfig, TableSchemaInfo } from './stores/DatabaseStore'
import { ProjectProvider } from './stores/ProjectStore'
import ChartProvider from './stores/ChartStore'
import { ThemeProvider } from './contexts/ThemeContext'
import { KeyboardShortcutsProvider } from './contexts/KeyboardShortcutsContext'
import { PerformanceMonitorProvider } from './contexts/PerformanceMonitorContext'
import { AnalysisTemplateProvider, useAnalysisTemplates } from './stores/AnalysisTemplateStore'
import { OnboardingFlow } from './components/OnboardingFlow'

type PageType = 'dashboard' | 'analysis' | 'charts' | 'datasources' | 'dictionary' | 'history' | 'settings'

function AppContent() {
  const [activePage, setActivePage] = useState<PageType>('dashboard')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const { addDatabase, updateDatabase } = useDatabase()
  const { setRecommendedIds, setUnconfirmedSourceIds } = useAnalysisTemplates()

  React.useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed')
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true)
    }
  }, [])

  const handleOnboardingComplete = async (csvFiles?: { name: string; path?: string; content?: string }[]) => {
    if (csvFiles && csvFiles.length > 0) {
      const api = (window as any).electronAPI
      const configs: DatabaseConfig[] = []

      for (let i = 0; i < csvFiles.length; i++) {
        const file = csvFiles[i]
        const dbId = `file-${Date.now()}-${i}`
        const baseName = file.name.replace(/\.[^/.]+$/, '')

        const config: DatabaseConfig = {
          id: dbId,
          name: baseName,
          type: 'file' as any,
          host: file.path || '',
          port: 0,
          database: file.name,
          username: '',
          connected: true,
          filePath: file.path || '',
          fileContent: file.content || '',
        }
        configs.push(config)

        // 注册文件到 fileTableRegistry（有 content就走这个路径）
        if (file.content) {
          await api?.file?.register(dbId, '', file.name, file.content)
        } else if (file.path) {
          await api?.file?.register(dbId, file.path, file.name)
        }
      }

      addDatabase(configs)

      // 异步在后台分析每个文件的 schema
      analyzeImportedFiles(configs, csvFiles)
    }
    localStorage.setItem('onboarding_completed', 'true')
    setShowOnboarding(false)
  }

  const analyzeImportedFiles = async (
    configs: DatabaseConfig[],
    files: { name: string; path?: string }[],
  ) => {
    const api = (window as any).electronAPI
    if (!api?.tableAnalysis) return

    const allRecommended = new Set<string>()
    const unconfirmedIds: string[] = []

    await Promise.all(
      configs.map(async (config, i) => {
        try {
          const file = files[i]
          const res = await api.tableAnalysis.analyzeSchema(file.path || '', file.name)
          if (res?.success && res.data) {
            const info: TableSchemaInfo = {
              tableType: res.data.tableType,
              confidence: res.data.confidence,
              suggestedTemplateIds: res.data.suggestedTemplateIds,
              needsConfirmation: res.data.needsConfirmation,
              analysisSource: res.data.analysisSource,
              columns: res.data.columns,
            }
            // 把 schema 信息写回数据源
            updateDatabase(config.id, { schemaInfo: info })

            // 汇总推荐模板
            info.suggestedTemplateIds.forEach(id => allRecommended.add(id))

            if (info.needsConfirmation) {
              unconfirmedIds.push(config.id)
            }
          }
        } catch {
          // 分析失败不影响主流程
        }
      })
    )

    setRecommendedIds(Array.from(allRecommended))
    setUnconfirmedSourceIds(unconfirmedIds)
  }

  const handleNavigate = (page: PageType | string) => {
    if (page === '__show_onboarding__') {
      localStorage.removeItem('onboarding_completed')
      setShowOnboarding(true)
      return
    }
    setActivePage(page as PageType)
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <V0DashboardPage onNavigate={handleNavigate} />
      case 'analysis':
        return <V0AnalysisPage onNavigate={handleNavigate} />
      case 'charts':
        return <V0ChartsPage onNavigate={handleNavigate} />
      case 'datasources':
        return <V0DataSourcesPage onNavigate={handleNavigate} />
      case 'dictionary':
        return <V0DictionaryPage onNavigate={handleNavigate} />
      case 'history':
        return <V0HistoryPage onNavigate={handleNavigate} />
      case 'settings':
        return <V0SettingsPage onNavigate={handleNavigate} />
      default:
        return <V0DashboardPage onNavigate={handleNavigate} />
    }
  }

  return (
    <ErrorBoundary>
      {showOnboarding && (
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onClose={() => setShowOnboarding(false)}
        />
      )}
      {renderPage()}
    </ErrorBoundary>
  )
}

function App() {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <ProjectProvider>
          <AnalysisTemplateProvider>
            <ChartProvider>
              <KeyboardShortcutsProvider>
                <PerformanceMonitorProvider>
                  <AppContent />
                </PerformanceMonitorProvider>
              </KeyboardShortcutsProvider>
            </ChartProvider>
          </AnalysisTemplateProvider>
        </ProjectProvider>
      </DatabaseProvider>
    </ThemeProvider>
  )
}

export default App
