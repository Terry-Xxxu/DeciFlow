import React from 'react'
import { QueryPage } from '../QueryPage'
import { AnalysisView } from '../AnalysisView'
import { ManagementView } from '../ManagementView'

type MainViewType = 'query' | 'analysis' | 'management'
type ChatContext = { query: string; result: any; analysis: any } | null

interface MainViewProps {
  view: MainViewType
  onViewChange: (view: MainViewType) => void
  onAnalyze: (context: ChatContext) => void
  onChat: (context: ChatContext) => void
  chatContext: ChatContext
}

export const MainView: React.FC<MainViewProps> = ({
  view,
  onViewChange,
  onAnalyze,
  onChat,
  chatContext
}) => {
  const renderView = () => {
    switch (view) {
      case 'query':
        return <QueryPage />
      case 'analysis':
        return <AnalysisView context={chatContext} onChat={onChat} />
      case 'management':
        return <ManagementView />
      default:
        return <QueryPage />
    }
  }

  return (
    <div className="flex-1 overflow-hidden">
      {renderView()}
    </div>
  )
}
