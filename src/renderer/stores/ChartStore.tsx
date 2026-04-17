/**
 * 图表状态管理
 * 管理图表配置、创建、编辑、删除
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { ChartConfig } from "../types/chart"
import { notificationManager } from "../components/NotificationCenter"

interface ChartContextType {
  charts: ChartConfig[]
  addChart: (config: ChartConfig) => void
  updateChart: (id: string, config: Partial<ChartConfig>) => void
  removeChart: (id: string) => void
  getChartById: (id: string) => ChartConfig | undefined
}

const ChartContext = createContext<ChartContextType | undefined>(undefined)

// 版本号用于清除旧的假数据缓存
const CHARTS_STORAGE_KEY = "data_insight_charts_v2"

export const ChartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [charts, setCharts] = useState<ChartConfig[]>([])

  // 初始化：从 localStorage 加载配置
  useEffect(() => {
    loadCharts()
  }, [])

  const loadCharts = () => {
    try {
      const saved = localStorage.getItem(CHARTS_STORAGE_KEY)
      if (saved) {
        setCharts(JSON.parse(saved))
      }
      // 首次使用时保持空列表，等用户真实创建图表
    } catch (error) {
      console.error("加载图表配置失败:", error)
    }
  }

  const saveCharts = (chartList: ChartConfig[]) => {
    localStorage.setItem(CHARTS_STORAGE_KEY, JSON.stringify(chartList))
  }

  const addChart = (config: ChartConfig) => {
    const newCharts = [...charts, config]
    setCharts(newCharts)
    saveCharts(newCharts)
    notificationManager.success("创建成功", `图表 "${config.name}" 已创建`)
  }

  const updateChart = (id: string, updates: Partial<ChartConfig>) => {
    const newCharts = charts.map((chart) =>
      chart.id === id ? { ...chart, ...updates, updatedAt: Date.now() } : chart
    )
    setCharts(newCharts)
    saveCharts(newCharts)
    notificationManager.success("更新成功", "图表配置已更新")
  }

  const removeChart = (id: string) => {
    const chart = charts.find((c) => c.id === id)
    const newCharts = charts.filter((c) => c.id !== id)
    setCharts(newCharts)
    saveCharts(newCharts)
    if (chart) {
      notificationManager.success("删除成功", `图表 "${chart.name}" 已删除`)
    }
  }

  const getChartById = (id: string) => {
    return charts.find((c) => c.id === id)
  }

  return (
    <ChartContext.Provider
      value={{
        charts,
        addChart,
        updateChart,
        removeChart,
        getChartById,
      }}
    >
      {children}
    </ChartContext.Provider>
  )
}

export const useChart = () => {
  const context = useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within ChartProvider")
  }
  return context
}

export default ChartProvider
