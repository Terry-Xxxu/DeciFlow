import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'
import {
  TrendingUp, Users, Repeat, DollarSign, Filter, UserPlus, UserMinus,
  BarChart3, Activity, Clock, ShoppingCart, RefreshCw, Package,
  Receipt, FileText, Globe, LayoutDashboard, LineChart, LogIn,
  ChevronDown, Plus, AlertCircle, CheckCircle2, X, Search,
  ArrowRight, Settings, AlertTriangle, GitBranch, Zap, Grid3x3,
} from 'lucide-react'
import { useAnalysisTemplates, AnalysisTemplate } from '../../stores/AnalysisTemplateStore'
import { useDatabase } from '../../stores/DatabaseStore'

// 图标映射
const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp, Users, Repeat, DollarSign, Filter, UserPlus, UserMinus,
  BarChart3, Activity, Clock, ShoppingCart, RefreshCw, Package,
  Receipt, FileText, Globe, LayoutDashboard, LineChart, LogIn,
  AlertTriangle, GitBranch, CheckCircle2, Search, Zap, Grid3x3,
}

// 每行最多显示的按钮数，超出部分进入"更多"下拉
const VISIBLE_COUNT = 4

interface QuickActionsProps {
  onNavigate?: (page: string) => void
  onQuerySelect?: (query: string) => void
}

// 单个快捷分析按钮
function TemplateButton({
  template,
  isPinned,
  isFromUnconfirmedSource,
  onClick,
  onUnpin,
  compact = false,
}: {
  template: AnalysisTemplate
  isPinned: boolean
  isFromUnconfirmedSource: boolean
  onClick: () => void
  onUnpin?: () => void
  compact?: boolean
}) {
  const Icon = ICON_MAP[template.icon] || LayoutDashboard

  if (compact) {
    // 下拉菜单里的紧凑样式
    return (
      <button
        onClick={onClick}
        className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
      >
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', template.bgColor)}>
          <Icon className={cn('h-4 w-4', template.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{template.name}</span>
            {isFromUnconfirmedSource && (
              <AlertCircle className="h-3 w-3 shrink-0 text-amber-500" />
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">{template.description}</p>
        </div>
        {onUnpin && isPinned && (
          <button
            onClick={e => { e.stopPropagation(); onUnpin() }}
            className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all',
        'hover:border-transparent hover:shadow-lg',
        'hover:bg-muted/50',
      )}
    >
      {/* 警告徽标 */}
      {isFromUnconfirmedSource && (
        <span className="absolute right-3 top-3 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
      )}

      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', template.bgColor)}>
        <Icon className={cn('h-5 w-5', template.color)} />
      </div>
      <div className="space-y-0.5">
        <p className="font-medium text-foreground">{template.name}</p>
        <p className="text-xs text-muted-foreground">{template.description}</p>
      </div>
      <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

// 模板库弹窗
function TemplateLibraryModal({
  onClose,
  onPin,
  pinnedIds,
}: {
  onClose: () => void
  onPin: (id: string) => void
  pinnedIds: string[]
}) {
  const { templateLibrary, categoryLabels } = useAnalysisTemplates()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const categories = ['all', ...Object.keys(categoryLabels)]

  const filtered = templateLibrary.filter(t => {
    const q = search.toLowerCase()
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.categoryLabel.toLowerCase().includes(q)
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-border bg-card px-6 py-4">
          <div>
            <h2 className="font-semibold text-foreground">分析模板库</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              共 {templateLibrary.length} 个模板，覆盖增长、留存、收入、电商等场景
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search + Category filter */}
        <div className="flex gap-3 px-6 py-4 border-b border-border">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索模板名称或描述..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select
            value={activeCategory}
            onChange={e => setActiveCategory(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer min-w-[130px]"
          >
            <option value="all">全部分类</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Template grid — no inner scroll, content flows naturally */}
        <div className="px-6 py-5">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">未找到匹配的模板</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                {activeCategory === 'all' ? '全部' : categoryLabels[activeCategory]}
                &nbsp;· {filtered.length} 个模板
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filtered.map(template => {
                  const Icon = ICON_MAP[template.icon] || LayoutDashboard
                  const alreadyPinned = pinnedIds.includes(template.id)
                  return (
                    <div
                      key={template.id}
                      className={cn(
                        'group flex items-start gap-3 rounded-xl border p-3 transition-colors',
                        alreadyPinned
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border hover:border-primary/30 hover:bg-muted/40'
                      )}
                    >
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', template.bgColor)}>
                        <Icon className={cn('h-4 w-4', template.color)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground leading-snug">{template.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{template.description}</p>
                        <span className="mt-1.5 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {template.categoryLabel}
                        </span>
                      </div>
                      <button
                        onClick={() => { onPin(template.id); if (!alreadyPinned) onClose() }}
                        className={cn(
                          'mt-0.5 shrink-0 rounded-lg p-1.5 transition-colors',
                          alreadyPinned
                            ? 'text-primary'
                            : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary',
                        )}
                        title={alreadyPinned ? '已添加' : '添加到快捷入口'}
                      >
                        {alreadyPinned ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function QuickActions({ onNavigate, onQuerySelect }: QuickActionsProps) {
  const {
    pinnedIds,
    recommendedIds,
    unconfirmedSourceIds,
    pinTemplate,
    unpinTemplate,
    getDisplayTemplates,
    isLoading,
  } = useAnalysisTemplates()
  const { databases } = useDatabase()

  const [showMore, setShowMore] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMore(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const displayTemplates = getDisplayTemplates()
  const visibleTemplates = displayTemplates.slice(0, VISIBLE_COUNT)
  const hiddenTemplates = displayTemplates.slice(VISIBLE_COUNT)

  // 判断模板是否来自未确认的数据源
  const isFromUnconfirmed = (templateId: string): boolean => {
    if (unconfirmedSourceIds.length === 0) return false
    // 如果该模板只来自 recommended（未来自 pinned），且有未确认数据源，认为需要提示
    return !pinnedIds.includes(templateId) && recommendedIds.includes(templateId)
  }

  const handleTemplateClick = (template: AnalysisTemplate) => {
    setShowMore(false)
    if (onQuerySelect) {
      onQuerySelect(template.sampleQuestion)
    }
    // 结果直接在 Dashboard 的查询框下方展示，不跳转到分析页
  }

  const hasUnconfirmed = unconfirmedSourceIds.length > 0
  const unconfirmedCount = databases.filter(
    db => db.type === 'file' && db.schemaInfo?.needsConfirmation && !db.schemaConfirmed
  ).length

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[100px] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">快捷分析</h3>
        <button
          onClick={() => setShowLibrary(true)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-3.5 w-3.5" />
          管理
        </button>
      </div>

      {/* Unconfirmed table banner */}
      {hasUnconfirmed && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="flex-1 text-xs text-amber-700 dark:text-amber-400">
            {unconfirmedCount > 0
              ? `${unconfirmedCount} 个数据表字段含义待确认，确认后分析更精准`
              : '部分数据表字段含义待确认，确认后分析更精准'}
          </p>
          <button
            onClick={() => onNavigate?.('dictionary')}
            className="shrink-0 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
          >
            去确认
          </button>
        </div>
      )}

      {/* Visible buttons + More dropdown */}
      <div className="flex gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          {visibleTemplates.map(template => (
            <TemplateButton
              key={template.id}
              template={template}
              isPinned={pinnedIds.includes(template.id)}
              isFromUnconfirmedSource={isFromUnconfirmed(template.id)}
              onClick={() => handleTemplateClick(template)}
              onUnpin={() => unpinTemplate(template.id)}
            />
          ))}
          {/* 如果不足4个，补一个"添加"占位 */}
          {visibleTemplates.length < VISIBLE_COUNT && (
            <button
              onClick={() => setShowLibrary(true)}
              className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-0.5">
                <p className="font-medium text-muted-foreground">添加分析</p>
                <p className="text-xs text-muted-foreground/70">从模板库选择</p>
              </div>
            </button>
          )}
        </div>

        {/* 更多按钮 */}
        {hiddenTemplates.length > 0 && (
          <div className="relative self-start" ref={dropdownRef}>
            <button
              onClick={() => setShowMore(v => !v)}
              className={cn(
                'flex h-full min-h-[100px] flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-4 transition-all',
                showMore
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/40 hover:text-foreground',
              )}
            >
              <span className="text-xs font-medium">更多</span>
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform', showMore && 'rotate-180')}
              />
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                {hiddenTemplates.length}
              </span>
            </button>

            {showMore && (
              <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-card shadow-xl">
                <div className="p-1.5">
                  {hiddenTemplates.map(template => (
                    <TemplateButton
                      key={template.id}
                      template={template}
                      isPinned={pinnedIds.includes(template.id)}
                      isFromUnconfirmedSource={isFromUnconfirmed(template.id)}
                      onClick={() => handleTemplateClick(template)}
                      onUnpin={() => unpinTemplate(template.id)}
                      compact
                    />
                  ))}
                </div>
                <div className="border-t border-border p-1.5">
                  <button
                    onClick={() => { setShowMore(false); setShowLibrary(true) }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    从模板库添加更多
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template library modal */}
      {showLibrary && (
        <TemplateLibraryModal
          onClose={() => setShowLibrary(false)}
          onPin={pinTemplate}
          pinnedIds={pinnedIds}
        />
      )}
    </div>
  )
}
