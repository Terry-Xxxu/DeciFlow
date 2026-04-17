/**
 * 图表自动选择服务
 * 根据数据特征自动推荐最合适的图表类型
 */

export type ChartType = 'line' | 'bar' | 'pie' | 'table' | 'funnel' | 'heatmap' | 'number'

export interface ChartRecommendation {
  chartType: ChartType
  confidence: number  // 推荐置信度（0-100）
  reason: string     // 推荐理由
  alternatives: ChartType[]  // 备选方案
}

export interface DataFeatures {
  rowCount: number
  columnCount: number
  columns: Array<{
    name: string
    type: 'string' | 'number' | 'date' | 'boolean'
    uniqueValues?: number
    sampleData?: any[]
  }>
  hasTimeSeries: boolean  // 是否有时间序列
  hasCategory: boolean    // 是否有分类字段
  hasComparison: boolean // 是否用于对比
}

export class ChartAutoSelector {
  /**
   * 分析数据特征
   */
  private analyzeDataFeatures(result: { columns: string[]; rows: Record<string, any>[] }): DataFeatures {
    const { columns, rows } = result

    // 分析每列的特征
    const columnFeatures = columns.map(col => {
      const values = rows.map(row => row[col])
      const uniqueValues = new Set(values).size

      // 推断列类型
      let type: 'string' | 'number' | 'date' | 'boolean' = 'string'
      if (values.every(v => typeof v === 'number')) {
        type = 'number'
      } else if (values.some(v => !isNaN(Date.parse(v)))) {
        type = 'date'
      } else if (values.every(v => typeof v === 'boolean')) {
        type = 'boolean'
      }

      return {
        name: col,
        type,
        uniqueValues,
        sampleData: values.slice(0, 5),  // 保存样本数据
      }
    })

    // 判断是否有时间序列
    const dateColumns = columnFeatures.filter(c => c.type === 'date')
    const hasTimeSeries = dateColumns.length > 0

    // 判断是否有分类字段
    const stringColumns = columnFeatures.filter(c => c.type === 'string')
    const hasCategory = stringColumns.some(c => c.uniqueValues && c.uniqueValues < 20)

    // 判断是否用于对比
    const hasComparison = rows.length <= 10 && columnFeatures.some(c => c.name.toLowerCase().includes('rate') || c.name.toLowerCase().includes('ratio'))

    return {
      rowCount: rows.length,
      columnCount: columns.length,
      columns: columnFeatures,
      hasTimeSeries,
      hasCategory,
      hasComparison,
    }
  }

  /**
   * 推荐图表类型
   */
  recommend(result: { columns: string[]; rows: Record<string, any>[] }): ChartRecommendation {
    const features = this.analyzeDataFeatures(result)

    // 规则 1: 只有 1 行 1-3 列 → 数字卡片
    if (features.rowCount === 1 && features.columnCount <= 3) {
      const numberCols = features.columns.filter(c => c.type === 'number')
      if (numberCols.length === features.columnCount) {
        return {
          chartType: 'number',
          confidence: 95,
          reason: '单行数值数据，使用数字卡片展示',
          alternatives: ['table'],
        }
      }
    }

    // 规则 2: 有时间序列 → 折线图
    if (features.hasTimeSeries && features.rowCount > 1) {
      return {
        chartType: 'line',
        confidence: 90,
        reason: `检测到时间序列数据 (${features.columns.find(c => c.type === 'date')?.name})，适合使用折线图展示趋势`,
        alternatives: ['bar'],
      }
    }

    // 规则 3: 有分类字段 + 数值字段 → 柱状图
    if (features.hasCategory && features.columns.some(c => c.type === 'number')) {
      const categoryCol = features.columns.find(c => c.type === 'string' && c.uniqueValues && c.uniqueValues < 20)
      const numberCol = features.columns.find(c => c.type === 'number')

      if (categoryCol && numberCol) {
        return {
          chartType: 'bar',
          confidence: 85,
          reason: `检测到分类字段 (${categoryCol.name}) 和数值字段 (${numberCol.name})，适合使用柱状图对比`,
          alternatives: ['table'],
        }
      }
    }

    // 规则 4: 行数过多（> 50）→ 表格
    if (features.rowCount > 50) {
      return {
        chartType: 'table',
        confidence: 80,
        reason: '数据量较大，表格展示最佳',
        alternatives: features.hasTimeSeries ? ['line'] : [],
      }
    }

    // 规则 5: 占比数据 → 饼图
    const hasPercentageInName = features.columns.some(c => c.name.toLowerCase().includes('rate') || c.name.toLowerCase().includes('ratio') || c.name.toLowerCase().includes('percent'))
    if (hasPercentageInName && features.rowCount <= 10) {
      return {
        chartType: 'pie',
        confidence: 75,
        reason: '检测到占比类数据，适合使用饼图展示',
        alternatives: ['bar'],
      }
    }

    // 默认：表格
    return {
      chartType: 'table',
      confidence: 70,
      reason: '默认使用表格展示，确保数据完整性',
      alternatives: features.hasTimeSeries ? ['line'] : features.hasCategory ? ['bar'] : [],
    }
  }

  /**
   * 批量推荐
   */
  recommendMultiple(results: Array<{ columns: string[]; rows: Record<string, any>[] }>): Map<number, ChartRecommendation> {
    const recommendations = new Map<number, ChartRecommendation>()

    results.forEach((result, index) => {
      recommendations.set(index, this.recommend(result))
    })

    return recommendations
  }

  /**
   * 获取推荐的图表配置
   */
  getChartConfig(chartType: ChartType): any {
    const configs: Record<ChartType, any> = {
      line: {
        type: 'line',
        smooth: true,
        responsive: true,
        plugins: {
          legend: { position: 'top' as const },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
          },
        },
        scales: {
          x: { type: 'category' as const },
          y: { beginAtZero: true },
        },
      },
      bar: {
        type: 'bar',
        responsive: true,
        plugins: {
          legend: { position: 'top' as const },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
      pie: {
        type: 'pie',
        responsive: true,
        plugins: {
          legend: { position: 'right' as const },
        },
      },
      table: {
        // 表格不需要特殊配置
      },
      number: {
        // 数字卡片配置
      },
      funnel: {
        type: 'funnel',
        responsive: true,
      },
      heatmap: {
        type: 'heatmap',
        responsive: true,
      },
    }

    return configs[chartType] || configs.table
  }
}

export const chartAutoSelector = new ChartAutoSelector()
