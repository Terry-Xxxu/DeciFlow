/**
 * 报表生成服务
 * 支持多种图表类型和导出格式
 */

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color?: string
  }[]
}

export interface ReportConfig {
  id: string
  name: string
  description?: string
  chartType: 'line' | 'bar' | 'pie' | 'funnel' | 'table'
  data: ChartData
  options?: any
}

export interface ExportFormat {
  type: 'pdf' | 'excel' | 'png' | 'json'
  quality?: 'low' | 'medium' | 'high'
}

export class ReportGenerator {
  /**
   * 创建折线图配置
   */
  createLineChart(
    title: string,
    labels: string[],
    datasets: { label: string; data: number[]; color?: string }[]
  ): ReportConfig {
    return {
      id: Date.now().toString(),
      name: title,
      chartType: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top' as const,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    }
  }

  /**
   * 创建柱状图配置
   */
  createBarChart(
    title: string,
    labels: string[],
    datasets: { label: string; data: number[]; color?: string }[]
  ): ReportConfig {
    return {
      id: Date.now().toString(),
      name: title,
      chartType: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top' as const,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    }
  }

  /**
   * 创建饼图配置
   */
  createPieChart(
    title: string,
    labels: string[],
    data: number[],
    colors?: string[]
  ): ReportConfig {
    const defaultColors = [
      'rgb(59, 130, 246)',
      'rgb(139, 92, 246)',
      'rgb(6, 182, 212)',
      'rgb(16, 185, 129)',
      'rgb(245, 158, 11)',
    ]

    return {
      id: Date.now().toString(),
      name: title,
      chartType: 'pie',
      data: {
        labels,
        datasets: [{
          label: title,
          data,
          color: colors ? colors[0] : defaultColors[0],
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right' as const,
          },
        },
      },
    }
  }

  /**
   * 创建表格配置
   */
  createTable(
    title: string,
    columns: string[],
    rows: Record<string, any>[]
  ): ReportConfig {
    return {
      id: Date.now().toString(),
      name: title,
      chartType: 'table',
      data: {
        labels: columns,
        datasets: rows.map((row, index) => ({
          label: `Row ${index + 1}`,
          data: columns.map(col => row[col]),
        })),
      },
    }
  }

  /**
   * 导出为 JSON
   */
  exportToJSON(report: ReportConfig): string {
    return JSON.stringify(report, null, 2)
  }

  /**
   * 导出为 CSV
   */
  exportToCSV(report: ReportConfig): string {
    const { labels, datasets } = report.data

    // 表头
    let csv = labels.join(',') + '\n'

    // 数据行
    const maxDataLength = Math.max(...datasets.map(d => d.data.length))
    for (let i = 0; i < maxDataLength; i++) {
      const row = datasets.map(d => d.data[i] ?? '').join(',')
      csv += row + '\n'
    }

    return csv
  }

  /**
   * 创建仪表盘配置
   */
  createDashboard(
    name: string,
    reports: ReportConfig[]
  ): { name: string; reports: ReportConfig[]; layout: string[][] } {
    // 简单的网格布局
    const layout = this.generateGridLayout(reports.length)

    return {
      name,
      reports,
      layout,
    }
  }

  /**
   * 生成网格布局
   */
  private generateGridLayout(count: number): string[][] {
    const layouts: string[][] = []

    if (count === 1) {
      layouts.push(['full'])
    } else if (count === 2) {
      layouts.push(['half', 'half'])
    } else if (count === 3) {
      layouts.push(['half', 'half'])
      layouts.push(['full'])
    } else if (count === 4) {
      layouts.push(['half', 'half'])
      layouts.push(['half', 'half'])
    } else {
      // 5个及以上，使用 3 列布局
      for (let i = 0; i < count; i += 3) {
        const row = []
        for (let j = 0; j < 3 && i + j < count; j++) {
          row.push('third')
        }
        layouts.push(row)
      }
    }

    return layouts
  }

  /**
   * 获取报表预览数据
   */
  getPreviewData(report: ReportConfig): any {
    return {
      type: report.chartType,
      data: report.data,
      options: report.options,
    }
  }

  /**
   * 验证报表配置
   */
  validateReport(report: ReportConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!report.name) {
      errors.push('报表名称不能为空')
    }

    if (!report.data || !report.data.labels || report.data.labels.length === 0) {
      errors.push('报表数据不能为空')
    }

    if (!report.data.datasets || report.data.datasets.length === 0) {
      errors.push('报表必须包含至少一个数据集')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 克隆报表
   */
  cloneReport(report: ReportConfig, newName?: string): ReportConfig {
    return {
      ...report,
      id: Date.now().toString(),
      name: newName || `${report.name} (副本)`,
    }
  }

  /**
   * 合并多个报表
   */
  mergeReports(reports: ReportConfig[], name: string): ReportConfig {
    // 简化实现：合并第一个报表的数据
    const primaryReport = reports[0]

    return {
      id: Date.now().toString(),
      name,
      chartType: primaryReport.chartType,
      data: primaryReport.data,
      options: primaryReport.options,
    }
  }
}

export const reportGenerator = new ReportGenerator()
