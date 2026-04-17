/**
 * 数据导出工具
 * 支持 CSV、Excel、PDF 导出
 */

/**
 * 导出为 CSV
 */
export function exportToCSV(data: any[], filename: string = 'export.csv') {
  if (!data || data.length === 0) {
    throw new Error('没有数据可导出')
  }

  // 获取表头
  const headers = Object.keys(data[0])

  // 构建 CSV 内容
  const csvContent = [
    headers.join(','), // 表头
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        // 处理包含逗号或引号的值
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value ?? ''
      }).join(',')
    )
  ].join('\n')

  // 添加 BOM 以支持 Excel 正确显示中文
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

  downloadBlob(blob, filename)
}

/**
 * 导出为 Excel (使用 HTML 表格方式)
 */
export function exportToExcel(data: any[], filename: string = 'export.xlsx') {
  if (!data || data.length === 0) {
    throw new Error('没有数据可导出')
  }

  // 获取表头
  const headers = Object.keys(data[0])

  // 构建 HTML 表格
  let table = '<table>'

  // 表头
  table += '<thead><tr>'
  headers.forEach(header => {
    table += `<th>${header}</th>`
  })
  table += '</tr></thead>'

  // 表体
  table += '<tbody>'
  data.forEach(row => {
    table += '<tr>'
    headers.forEach(header => {
      table += `<td>${row[header] ?? ''}</td>`
    })
    table += '</tr>'
  })
  table += '</tbody></table>'

  // 创建完整的 HTML 文档
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 8px; }
          th { background-color: #f0f0f0; font-weight: bold; }
        </style>
      </head>
      <body>${table}</body>
    </html>
  `

  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8;'
  })

  downloadBlob(blob, filename)
}

/**
 * 导出为 PDF (使用浏览器打印功能)
 */
export function exportToPDF(data: any[], filename: string = 'export.pdf') {
  if (!data || data.length === 0) {
    throw new Error('没有数据可导出')
  }

  // 创建一个打印友好的 HTML 页面
  const headers = Object.keys(data[0])

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #4A5568; color: white; padding: 12px; text-align: left; }
          td { border: 1px solid #ddd; padding: 10px; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>DataInsight Pro - 数据导出</h1>
        <p>导出时间: ${new Date().toLocaleString('zh-CN')}</p>
        <p>数据量: ${data.length} 条</p>

        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>由 DataInsight Pro 导出</p>
        </div>
      </body>
    </html>
  `

  // 打开新窗口进行打印
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  } else {
    throw new Error('无法打开打印窗口，请检查浏览器弹窗设置')
  }
}

/**
 * 导出分析报告（带图表的完整报告）
 */
export function exportAnalysisReport(params: {
  data: any[]
  sql: string
  metric?: string
  confidence?: any
  analysis?: any
}, filename: string = 'analysis-report.pdf') {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>DataInsight Pro - 分析报告</title>
        <style>
          body { font-family: 'Microsoft YaHei', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #334155; margin-top: 30px; }
          .meta { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .meta-item { display: inline-block; margin-right: 20px; }
          .label { color: #64748b; font-size: 12px; }
          .value { color: #1e293b; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #3b82f6; color: white; padding: 12px; text-align: left; }
          td { border: 1px solid #e2e8f0; padding: 10px; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .sql-box { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; overflow-x: auto; }
          .confidence { background: #dbeafe; padding: 10px; border-radius: 8px; margin: 10px 0; }
          .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>📊 DataInsight Pro 分析报告</h1>

        <div class="meta">
          <div class="meta-item">
            <div class="label">生成时间</div>
            <div class="value">${new Date().toLocaleString('zh-CN')}</div>
          </div>
          <div class="meta-item">
            <div class="label">数据量</div>
            <div class="value">${params.data.length} 条</div>
          </div>
          ${params.metric ? `
            <div class="meta-item">
              <div class="label">指标</div>
              <div class="value">${params.metric}</div>
            </div>
          ` : ''}
        </div>

        ${params.confidence ? `
          <h2>可信度评估</h2>
          <div class="confidence">
            <strong>总体评分: ${params.confidence.overall}/100</strong>
            <p>级别: ${params.confidence.level === 'high' ? '高' : params.confidence.level === 'medium' ? '中' : '低'}</p>
          </div>
        ` : ''}

        ${params.analysis ? `
          <h2>分析结论</h2>
          <p>${params.analysis.conclusion || params.analysis.summary || '暂无'}</p>
        ` : ''}

        <h2>查询数据</h2>
        <table>
          <thead>
            <tr>
              ${Object.keys(params.data[0] || {}).map(k => `<th>${k}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${params.data.slice(0, 50).map(row => `
              <tr>
                ${Object.values(row).map(v => `<td>${v ?? ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${params.data.length > 50 ? `<p style="color: #64748b; font-size: 12px;">* 仅显示前 50 条数据，共 ${params.data.length} 条</p>` : ''}

        <h2>执行 SQL</h2>
        <div class="sql-box">${params.sql}</div>

        <div class="footer">
          <p>本报告由 DataInsight Pro 自动生成</p>
          <p>导出时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
      </body>
    </html>
  `

  // 打开新窗口进行打印
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  } else {
    throw new Error('无法打开打印窗口，请检查浏览器弹窗设置')
  }
}

/**
 * 下载 Blob 文件
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
