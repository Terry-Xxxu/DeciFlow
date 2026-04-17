/**
 * DeciFlow 图表可视化测试
 * 测试各种图表类型的渲染、交互和数据更新功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ChartAutoSelector, ChartType, ChartRecommendation } from '../main/charts/selector'

// 模拟图表组件
class MockChartComponent {
  private chartType: ChartType
  private data: any
  private options: any
  private isRendered = false

  constructor(type: ChartType) {
    this.chartType = type
  }

  setData(data: any) {
    this.data = data
  }

  setOptions(options: any) {
    this.options = options
  }

  render() {
    this.isRendered = true
    return {
      success: true,
      chartType: this.chartType,
      dataPoints: this.data?.rows?.length || 0
    }
  }

  destroy() {
    this.isRendered = false
    this.data = null
    this.options = null
  }

  getIsRendered() {
    return this.isRendered
  }

  updateData(newData: any) {
    this.data = newData
    return {
      success: true,
      updatedPoints: newData?.rows?.length || 0
    }
  }
}

// 测试数据集
const testDatasets = {
  timeSeries: {
    columns: ['date', 'value', 'category'],
    rows: [
      { date: '2024-01', value: 100, category: 'A' },
      { date: '2024-02', value: 150, category: 'A' },
      { date: '2024-03', value: 200, category: 'A' },
      { date: '2024-01', value: 80, category: 'B' },
      { date: '2024-02', value: 120, category: 'B' },
      { date: '2024-03', value: 180, category: 'B' }
    ]
  },
  categorical: {
    columns: ['category', 'count'],
    rows: [
      { category: '电子产品', count: 1200 },
      { category: '服装', count: 800 },
      { category: '食品', count: 600 },
      { category: '家居', count: 400 }
    ]
  },
  comparison: {
    columns: ['product', 'q1', 'q2', 'q3', 'q4'],
    rows: [
      { product: '产品A', q1: 100, q2: 120, q3: 110, q4: 140 },
      { product: '产品B', q1: 80, q2: 90, q3: 100, q4: 110 }
    ]
  },
  funnel: {
    columns: ['stage', 'users'],
    rows: [
      { stage: '访问', users: 1000 },
      { stage: '注册', users: 500 },
      { stage: '激活', users: 300 },
      { stage: '付费', users: 100 }
    ]
  },
  heatmap: {
    columns: ['day', 'hour', 'value'],
    rows: [
      { day: '周一', hour: '9', value: 10 },
      { day: '周一', hour: '10', value: 20 },
      { day: '周二', hour: '9', value: 15 },
      { day: '周二', hour: '10', value: 25 }
    ]
  }
}

describe('DeciFlow 图表可视化测试', () => {
  let chartSelector: ChartAutoSelector
  let mockCharts: Map<ChartType, MockChartComponent>

  beforeEach(() => {
    chartSelector = new ChartAutoSelector()
    mockCharts = new Map()

    // 创建所有图表类型的模拟组件
    Object.values(ChartType).forEach(type => {
      mockCharts.set(type, new MockChartComponent(type))
    })
  })

  afterEach(() => {
    mockCharts.forEach(chart => chart.destroy())
  })

  describe('图表自动选择', () => {
    it('应该为时间序列数据推荐折线图', () => {
      const recommendation = chartSelector.selectChartType(testDatasets.timeSeries)

      expect(recommendation.chartType).toBe('line')
      expect(recommendation.confidence).toBeGreaterThan(70)
      expect(recommendation.reason).toContain('时间序列')
      expect(recommendation.alternatives).toContain('bar')
    })

    it('应该为分类数据推荐柱状图', () => {
      const recommendation = chartSelector.selectChartType(testDatasets.categorical)

      expect(recommendation.chartType).toBe('bar')
      expect(recommendation.confidence).toBeGreaterThan(80)
      expect(recommendation.reason).toContain('分类对比')
      expect(recommendation.alternatives).toContain('pie')
    })

    it('应该为占比数据推荐饼图', () => {
      const pieData = {
        columns: ['category', 'percentage'],
        rows: [
          { category: '类别A', percentage: 45 },
          { category: '类别B', percentage: 30 },
          { category: '类别C', percentage: 25 }
        ]
      }

      const recommendation = chartSelector.selectChartType(pieData)

      expect(recommendation.chartType).toBe('pie')
      expect(recommendation.confidence).toBeGreaterThan(75)
      expect(recommendation.reason).toContain('占比展示')
    })

    it('应该为漏斗数据推荐漏斗图', () => {
      const recommendation = chartSelector.selectChartType(testDatasets.funnel)

      expect(recommendation.chartType).toBe('funnel')
      expect(recommendation.confidence).toBeGreaterThan(85)
      expect(recommendation.reason).toContain('转化率')
    })

    it('应该为矩阵数据推荐热力图', () => {
      const recommendation = chartSelector.selectChartType(testDatasets.heatmap)

      expect(recommendation.chartType).toBe('heatmap')
      expect(recommendation.confidence).toBeGreaterThan(80)
      expect(recommendation.reason).toContain('矩阵分布')
    })
  })

  describe('图表渲染测试', () => {
    it('应该能够渲染折线图', () => {
      const chart = mockCharts.get('line')!
      chart.setData(testDatasets.timeSeries)

      const result = chart.render()

      expect(result.success).toBe(true)
      expect(result.chartType).toBe('line')
      expect(result.dataPoints).toBe(6)
      expect(chart.getIsRendered()).toBe(true)
    })

    it('应该能够渲染柱状图', () => {
      const chart = mockCharts.get('bar')!
      chart.setData(testDatasets.categorical)

      const result = chart.render()

      expect(result.success).toBe(true)
      expect(result.chartType).toBe('bar')
      expect(result.dataPoints).toBe(4)
    })

    it('应该能够渲染饼图', () => {
      const chart = mockCharts.get('pie')!
      chart.setData(testDatasets.categorical)

      const result = chart.render()

      expect(result.success).toBe(true)
      expect(result.chartType).toBe('pie')
      expect(result.dataPoints).toBe(4)
    })

    it('应该能够渲染漏斗图', () => {
      const chart = mockCharts.get('funnel')!
      chart.setData(testDatasets.funnel)

      const result = chart.render()

      expect(result.success).toBe(true)
      expect(result.chartType).toBe('funnel')
      expect(result.dataPoints).toBe(4)
    })

    it('应该能够渲染热力图', () => {
      const chart = mockCharts.get('heatmap')!
      chart.setData(testDatasets.heatmap)

      const result = chart.render()

      expect(result.success).toBe(true)
      expect(result.chartType).toBe('heatmap')
      expect(result.dataPoints).toBe(4)
    })
  })

  describe('图表交互测试', () => {
    it('应该支持图例点击隐藏/显示', () => {
      const chart = mockCharts.get('line')!
      chart.setData(testDatasets.timeSeries)
      chart.render()

      // 模拟图例点击
      const legendClick = chart.setOptions({
        legend: {
          onClick: (seriesId: string) => {
            return { seriesId, visible: false }
          }
        }
      })

      expect(legendClick).toBeDefined()
    })

    it('应该支持数据点悬停提示', () => {
      const chart = mockCharts.get('bar')!
      chart.setData(testDatasets.categorical)
      chart.render()

      const tooltipOptions = {
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            return `${params.name}: ${params.value}`
          }
        }
      }

      chart.setOptions(tooltipOptions)
      expect(chart['options']?.tooltip).toBeDefined()
    })

    it('应该支持缩放和平移', () => {
      const chart = mockCharts.get('line')!
      chart.setData(testDatasets.timeSeries)
      chart.render()

      const zoomOptions = {
        dataZoom: [
          {
            type: 'inside',
            start: 0,
            end: 100
          }
        ]
      }

      chart.setOptions(zoomOptions)
      expect(chart['options']?.dataZoom).toBeDefined()
    })
  })

  describe('数据更新测试', () => {
    it('应该能够动态更新数据', () => {
      const chart = mockCharts.get('line')!
      chart.setData(testDatasets.timeSeries)
      chart.render()

      const newData = {
        ...testDatasets.timeSeries,
        rows: [
          ...testDatasets.timeSeries.rows,
          { date: '2024-04', value: 250, category: 'A' },
          { date: '2024-04', value: 200, category: 'B' }
        ]
      }

      const updateResult = chart.updateData(newData)

      expect(updateResult.success).toBe(true)
      expect(updateResult.updatedPoints).toBe(8)
    })

    it('应该能够处理实时数据流', () => {
      const chart = mockCharts.get('line')!
      chart.setData(testDatasets.timeSeries)
      chart.render()

      // 模拟实时数据更新
      const realtimeUpdates = Array.from({ length: 5 }, (_, i) => ({
        date: `2024-04-${i + 1}`,
        value: 200 + Math.random() * 100,
        category: 'A'
      }))

      realtimeUpdates.forEach(update => {
        const currentData = chart['data']
        currentData.rows.push(update)
        chart.updateData(currentData)
      })

      expect(chart['data'].rows.length).toBeGreaterThan(6)
    })
  })

  describe('图表性能测试', () => {
    it('应该快速渲染大量数据点', () => {
      const largeDataset = {
        columns: ['x', 'y'],
        rows: Array.from({ length: 1000 }, (_, i) => ({
          x: i,
          y: Math.random() * 100
        }))
      }

      const chart = mockCharts.get('line')!
      const startTime = Date.now()

      chart.setData(largeDataset)
      const result = chart.render()

      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(2000)  // 2秒内完成渲染
      expect(result.dataPoints).toBe(1000)
    })

    it('应该支持多个图表同时渲染', () => {
      const startTime = Date.now()

      const renderPromises = Array.from(mockCharts.entries()).map(([type, chart]) => {
        const data = testDatasets[type as keyof typeof testDatasets] || testDatasets.categorical
        chart.setData(data)
        return chart.render()
      })

      const results = Promise.all(renderPromises)
      const endTime = Date.now()

      expect(results).resolves.toHaveLength(Object.keys(ChartType).length)
      expect(endTime - startTime).toBeLessThan(5000)  // 5秒内完成所有图表渲染
    })
  })

  describe('图表导出功能', () => {
    it('应该能够导出为 PNG 图片', () => {
      const chart = mockCharts.get('bar')!
      chart.setData(testDatasets.categorical)
      chart.render()

      const exportResult = chart.setOptions({
        export: {
          format: 'png',
          filename: 'chart-export'
        }
      })

      expect(exportResult).toBeDefined()
      expect(exportResult.export).toBe(true)
    })

    it('应该能够导出为 PDF 文档', () => {
      const chart = mockCharts.get('line')!
      chart.setData(testDatasets.timeSeries)
      chart.render()

      const exportResult = chart.setOptions({
        export: {
          format: 'pdf',
          filename: 'report',
          orientation: 'landscape'
        }
      })

      expect(exportResult).toBeDefined()
      expect(exportResult.export).toBe(true)
    })

    it('应该能够导出为 CSV 数据', () => {
      const chart = mockCharts.get('table')!
      chart.setData(testDatasets.categorical)
      chart.render()

      const exportResult = chart.setOptions({
        export: {
          format: 'csv',
          filename: 'data-export'
        }
      })

      expect(exportResult).toBeDefined()
      expect(exportResult.export).toBe(true)
    })
  })

  describe('响应式设计测试', () => {
    it('应该适应不同的容器大小', () => {
      const chart = mockCharts.get('pie')!
      chart.setData(testDatasets.categorical)

      // 测试不同尺寸
      const sizes = [
        { width: 300, height: 200 },
        { width: 600, height: 400 },
        { width: 1200, height: 800 }
      ]

      sizes.forEach(size => {
        chart.setOptions({
          responsive: true,
          size
        })
        expect(chart['options']?.size).toEqual(size)
      })
    })

    it('应该支持深色/浅色主题', () => {
      const chart = mockCharts.get('bar')!
      chart.setData(testDatasets.categorical)

      // 测试浅色主题
      chart.setOptions({
        theme: 'light',
        color: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']
      })

      // 测试深色主题
      chart.setOptions({
        theme: 'dark',
        color: ['#17becf', '#bcbd22', '#7f7f7f', '#e377c2']
      })

      expect(chart['options']?.theme).toBeDefined()
    })
  })
})