import React from 'react'

interface InsightBlockProps {
  insights: Array<{
    icon: string
    text: string
  }>
}

export const InsightBlock: React.FC<InsightBlockProps> = ({ insights }) => {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
        <span>💡</span>
        <span>AI 洞察</span>
      </h3>
      <div className="space-y-3">
        {insights.slice(0, 3).map((insight, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-background-tertiary/50 rounded-xl hover:bg-background-tertiary transition-colors"
          >
            <span className="text-lg mt-0.5">{insight.icon}</span>
            <p className="text-sm text-text-secondary leading-relaxed">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
