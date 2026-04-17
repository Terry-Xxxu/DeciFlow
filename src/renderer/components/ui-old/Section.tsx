import React from 'react'

interface SectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export const Section: React.FC<SectionProps> = ({
  title,
  description,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          )}
          {description && (
            <p className="text-sm text-text-secondary">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
