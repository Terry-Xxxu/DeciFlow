// 分析模板 Store - 管理用户固定的快捷分析和模板库

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'

export interface AnalysisTemplate {
  id: string
  name: string
  icon: string
  description: string
  category: string
  categoryLabel: string
  dataRequirements: string
  sampleQuestion: string
  color: string
  bgColor: string
}

export interface CategoryLabels {
  [key: string]: string
}

interface AnalysisTemplateContextType {
  // 完整模板库
  templateLibrary: AnalysisTemplate[]
  categoryLabels: CategoryLabels
  // 用户固定的模板 id 列表（显示在快捷入口）
  pinnedIds: string[]
  // 通过 schema 分析推荐的模板 id（去重合并自所有已导入表格）
  recommendedIds: string[]
  // 哪些数据源 id 需要用户去数据字典确认
  unconfirmedSourceIds: string[]
  // 操作
  pinTemplate: (id: string) => void
  unpinTemplate: (id: string) => void
  setRecommendedIds: (ids: string[]) => void
  setUnconfirmedSourceIds: (ids: string[]) => void
  markSourceConfirmed: (sourceId: string) => void
  getDisplayTemplates: () => AnalysisTemplate[]
  isLoading: boolean
}

const STORAGE_KEY = 'deciflow_pinned_template_ids'

const AnalysisTemplateContext = createContext<AnalysisTemplateContextType | undefined>(undefined)

const DEFAULT_PINNED: string[] = []

export const AnalysisTemplateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [templateLibrary, setTemplateLibrary] = useState<AnalysisTemplate[]>([])
  const [categoryLabels, setCategoryLabels] = useState<CategoryLabels>({})
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [recommendedIds, setRecommendedIdsState] = useState<string[]>([])
  const [unconfirmedSourceIds, setUnconfirmedSourceIdsState] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const api = (window as any).electronAPI
        if (api?.tableAnalysis) {
          const res = await api.tableAnalysis.getTemplateLibrary()
          if (res?.success) {
            setTemplateLibrary(res.data.templates)
            setCategoryLabels(res.data.categoryLabels)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadLibrary()

    // 加载持久化的 pinned ids
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setPinnedIds(JSON.parse(saved))
      } else {
        setPinnedIds(DEFAULT_PINNED)
      }
    } catch {
      setPinnedIds(DEFAULT_PINNED)
    }
  }, [])

  const savePinnedIds = (ids: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  }

  const pinTemplate = useCallback((id: string) => {
    setPinnedIds(prev => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      savePinnedIds(next)
      return next
    })
  }, [])

  const unpinTemplate = useCallback((id: string) => {
    setPinnedIds(prev => {
      const next = prev.filter(p => p !== id)
      savePinnedIds(next)
      return next
    })
  }, [])

  const setRecommendedIds = useCallback((ids: string[]) => {
    setRecommendedIdsState(ids)
  }, [])

  const setUnconfirmedSourceIds = useCallback((ids: string[]) => {
    setUnconfirmedSourceIdsState(ids)
  }, [])

  const markSourceConfirmed = useCallback((sourceId: string) => {
    setUnconfirmedSourceIdsState(prev => prev.filter(id => id !== sourceId))
  }, [])

  // 只返回推荐模板（recommendedIds），无固定模板
  const getDisplayTemplates = useCallback((): AnalysisTemplate[] => {
    return recommendedIds
      .map(id => templateLibrary.find(t => t.id === id))
      .filter(Boolean) as AnalysisTemplate[]
  }, [recommendedIds, templateLibrary])

  return (
    <AnalysisTemplateContext.Provider
      value={{
        templateLibrary,
        categoryLabels,
        pinnedIds,
        recommendedIds,
        unconfirmedSourceIds,
        pinTemplate,
        unpinTemplate,
        setRecommendedIds,
        setUnconfirmedSourceIds,
        markSourceConfirmed,
        getDisplayTemplates,
        isLoading,
      }}
    >
      {children}
    </AnalysisTemplateContext.Provider>
  )
}

export const useAnalysisTemplates = () => {
  const ctx = useContext(AnalysisTemplateContext)
  if (!ctx) throw new Error('useAnalysisTemplates must be used within AnalysisTemplateProvider')
  return ctx
}
