import React, { useState } from 'react'
import { AlertDialog } from '../Modal'
import { AnalyzePanel } from '../AnalyzePanel'
import { ChartDisplay, recommendChartType } from '../ChartDisplay'
import { exportToCSV, exportToExcel, exportToPDF, exportAnalysisReport } from '../../utils/data-export'

interface AnalysisResult {
  conclusion: string
  keyChanges: {
    metric: string
    current: number
    previous: number
    changePercent: number
    trend: 'up' | 'down' | 'stable'
  }
  drivers: Array<{
    dimension: string
    topContributor: string
    contribution: number
    impact: 'positive' | 'negative'
  }>
  impact: 'positive' | 'negative' | 'neutral'
  recommendations: Array<{
    priority: 'P0' | 'P1' | 'P2'
    action: string
  }>
}

interface ResultDisplayProps {
  result?: {
    data: any[]
    sql: string
    confidence?: {
      overall: number
      breakdown: any
      explain: string[]
      level: 'high' | 'medium' | 'low'
    }
    metricUsed?: string
    executionTime?: number
  }
  databaseConfig?: any
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, databaseConfig }) => {
  const [view, setView] = useState<'table' | 'chart'>('table')
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie' | 'area'>('bar')
  const [showAnalyzePanel, setShowAnalyzePanel] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string>()
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    variant: 'info' | 'warning' | 'error' | 'success'
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning'
  })

  /**
   * 导出处理函数
   */
  const handleExport = async (format: 'csv' | 'excel' | 'pdf' | 'report') => {
    if (!result || result.data.length === 0) {
      setAlertDialog({
        isOpen: true,
        title: '无法导出',
        message: '暂无数据可导出',
        variant: 'warning'
      })
      return
    }

    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const baseFilename = `data-insight-${timestamp}`

      switch (format) {
        case 'csv':
          exportToCSV(result.data, `${baseFilename}.csv`)
          break
        case 'excel':
          exportToExcel(result.data, `${baseFilename}.xlsx`)
          break
        case 'pdf':
          exportToPDF(result.data, `${baseFilename}.pdf`)
          break
        case 'report':
          exportAnalysisReport(
            {
              data: result.data,
              sql: result.sql,
              metric: result.metricUsed,
              confidence: result.confidence,
              analysis: analyzeResult
            },
            `${baseFilename}-report.pdf`
          )
          break
      }

      setAlertDialog({
        isOpen: true,
        title: '导出成功',
        message: `已导出为 ${format.toUpperCase()} 格式`,
        variant: 'success'
      })
    } catch (error) {
      console.error('导出失败:', error)
      setAlertDialog({
        isOpen: true,
        title: '导出失败',
        message: error instanceof Error ? error.message : '未知错误',
        variant: 'error'
      })
    }

    setShowExportMenu(false)
  }

  const handleDeepAnalysis = async () => {
    if (!result?.metricUsed || !databaseConfig) {
      setAlertDialog({
        isOpen: true,
        title: '无法进行深度分析',
        message: '深度分析需要使用标准指标并且配置了数据库连接',
        variant: 'warning'
      })
      return
    }

    setAnalyzing(true)
    try {
      const analysisResult = await window.electronAPI.analysis.analyze({
        metricId: result.metricUsed,
        timeRange: 'last_7_days',
        compareWith: 'previous_period',
        breakdownDimensions: ['channel', 'platform'],
        databaseConfig
      })
      setAnalysis(analysisResult.data)
    } catch (error) {
      console.error('深度分析失败:', error)
      setAlertDialog({
        isOpen: true,
        title: '深度分析失败',
        message: error instanceof Error ? error.message : '未知错误',
        variant: 'error'
      })
    } finally {
      setAnalyzing(false)
    }
  }

  /**
   * 新增：Analyze Mode 分析模式
   */
  const handleAnalyze = async () => {
    if (!result || result.data.length === 0) {
      setAlertDialog({
        isOpen: true,
        title: '无法分析',
        message: '请先执行查询并获得数据后再进行分析',
        variant: 'warning'
      })
      return
    }

    setShowAnalyzePanel(true)
    setAnalyzing(true)

    try {
      const analyzeResult = await window.electronAPI.analyze.run({
        queryResult: {
          rows: result.data,
          rowCount: result.data.length,
          sql: result.sql
        },
        metric: result.metricUsed,
        dimensions: ['channel', 'platform'],
        databaseConfig
      })

      setAnalyzeResult(analyzeResult.data)
      setSessionId(analyzeResult.sessionId)  // 保存会话ID
    } catch (error) {
      console.error('分析失败:', error)
      setAlertDialog({
        isOpen: true,
        title: '分析失败',
        message: error instanceof Error ? error.message : '分析过程中发生错误',
        variant: 'error'
      })
    } finally {
      setAnalyzing(false)
    }
  }

  if (!result) {
    return (
      <div className="card p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">查询结果</h2>
              <p className="text-xs text-text-muted">数据可视化与分析</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm bg-white/5 text-text-secondary rounded-lg hover:bg-white/10 hover:text-text-primary transition-all duration-200 border border-white/5 flex items-center gap-2">
              <span>📊</span>
              <span>图表</span>
            </button>
            <button className="px-4 py-2 text-sm bg-white/5 text-text-secondary rounded-lg hover:bg-white/10 hover:text-text-primary transition-all duration-200 border border-white/5 flex items-center gap-2">
              <span>📋</span>
              <span>表格</span>
            </button>
            <button className="px-4 py-2 text-sm bg-white/5 text-text-secondary rounded-lg hover:bg-white/10 hover:text-text-primary transition-all duration-200 border border-white/5 flex items-center gap-2">
              <span>⬇️</span>
              <span>导出</span>
            </button>
          </div>
        </div>

        {/* 空状态 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            {/* 动画图标 */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 rounded-3xl blur-2xl animate-pulse-soft"></div>
              <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 flex items-center justify-center border border-white/10">
                <span className="text-6xl">📊</span>
              </div>
            </div>

            <h3 className="text-text-primary text-xl font-semibold mb-3">开始你的数据探索之旅</h3>
            <p className="text-text-secondary text-sm leading-relaxed mb-6">
              在上方输入框中用自然语言描述你想了解的数据，<br />
              AI 会自动帮你生成查询并展示结果
            </p>

            <div className="flex items-center justify-center gap-4 text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                支持 PostgreSQL
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                支持 MySQL
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                支持 MongoDB
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center">
            <span className="text-xl">📊</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">查询结果</h2>
            <p className="text-xs text-text-muted">
              {result.data.length} 行 · {result.executionTime}ms
              {result.metricUsed && ` · 指标: ${result.metricUsed}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setView(view === 'table' ? 'chart' : 'table')}
            className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 border flex items-center gap-2 ${
              view === 'table'
                ? 'bg-white/5 text-text-secondary border-white/5 hover:bg-white/10'
                : 'bg-brand-primary/20 text-brand-primary border-brand-primary/30'
            }`}
          >
            <span>📊</span>
            <span>图表</span>
          </button>
          <button
            onClick={() => setView(view === 'chart' ? 'table' : 'chart')}
            className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 border flex items-center gap-2 ${
              view === 'chart'
                ? 'bg-white/5 text-text-secondary border-white/5 hover:bg-white/10'
                : 'bg-brand-primary/20 text-brand-primary border-brand-primary/30'
            }`}
          >
            <span>📋</span>
            <span>表格</span>
          </button>

          {/* 深度分析按钮 🔥 */}
          {result.metricUsed && databaseConfig && (
            <button
              onClick={handleDeepAnalysis}
              disabled={analyzing}
              className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 border flex items-center gap-2 ${
                analyzing
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500'
              }`}
            >
              <span>{analyzing ? '⏳' : '🧠'}</span>
              <span>{analyzing ? '分析中...' : '深度分析'}</span>
            </button>
          )}

          {/* 新增：深入分析按钮 🔍 */}
          {result && result.data.length > 0 && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 border flex items-center gap-2 ${
                analyzing
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
              }`}
            >
              <span>{analyzing ? '⏳' : '🔍'}</span>
              <span>{analyzing ? '分析中...' : '深入分析'}</span>
            </button>
          )}

          {/* 导出按钮（带下拉菜单） */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 text-sm bg-white/5 text-text-secondary rounded-lg hover:bg-white/10 hover:text-text-primary transition-all duration-200 border border-white/5 flex items-center gap-2"
            >
              <span>⬇️</span>
              <span>导出</span>
            </button>

            {/* 导出菜单 */}
            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-20 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <span>📄</span>
                    <span>CSV 格式</span>
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <span>📊</span>
                    <span>Excel 格式</span>
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <span>📑</span>
                    <span>PDF 格式</span>
                  </button>
                  <div className="border-t border-slate-700">
                    <button
                      onClick={() => handleExport('report')}
                      className="w-full px-4 py-2.5 text-left text-sm text-blue-400 hover:bg-slate-700 flex items-center gap-2"
                    >
                      <span>📋</span>
                      <span>完整分析报告</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-6">
        {/* 可信度显示 */}
        {result.confidence && (
          <ConfidenceDisplay confidence={result.confidence} compact={false} />
        )}

        {/* 新增：深入分析结果 (Analyze Mode) */}
        {showAnalyzePanel && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                <h3 className="text-lg font-semibold text-blue-300">深入分析结果</h3>
              </div>
              <button
                onClick={() => setShowAnalyzePanel(false)}
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                关闭
              </button>
            </div>
            <AnalyzePanel result={analyzeResult} loading={analyzing} sessionId={sessionId} />
          </div>
        )}

        {/* 深度分析结果 */}
        {analysis && (
          <div className="p-5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🧠</span>
              <h3 className="text-lg font-semibold text-purple-300">深度分析结果</h3>
            </div>

            {/* 核心结论 */}
            <div className="p-4 rounded-lg bg-slate-900/50 border border-purple-500/20">
              <div className="text-sm text-purple-400 mb-2">【核心结论】</div>
              <div className="text-base text-slate-200">{analysis.conclusion}</div>
            </div>

            {/* 关键变化 */}
            <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
              <div className="text-sm text-slate-400 mb-2">【关键变化】</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-slate-500">当前值</div>
                  <div className="text-lg font-semibold text-slate-200">{analysis.keyChanges.current}</div>
                </div>
                <div>
                  <div className="text-slate-500">上期值</div>
                  <div className="text-lg font-semibold text-slate-200">{analysis.keyChanges.previous}</div>
                </div>
                <div>
                  <div className="text-slate-500">变化</div>
                  <div className={`text-lg font-semibold ${
                    analysis.keyChanges.changePercent > 0 ? 'text-green-400' :
                    analysis.keyChanges.changePercent < 0 ? 'text-red-400' :
                    'text-slate-400'
                  }`}>
                    {analysis.keyChanges.changePercent > 0 ? '+' : ''}{analysis.keyChanges.changePercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* 主要驱动因素 🔥 */}
            {analysis.drivers && analysis.drivers.length > 0 && (
              <div className="p-4 rounded-lg bg-slate-900/50 border border-orange-500/20">
                <div className="text-sm text-orange-400 mb-3">【主要驱动因素】🔥</div>
                <div className="space-y-2">
                  {analysis.drivers.map((driver, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <span className={`text-lg ${
                          driver.impact === 'positive' ? 'text-green-400' :
                          driver.impact === 'negative' ? 'text-red-400' :
                          'text-slate-400'
                        }`}>
                          {driver.impact === 'positive' ? '📈' : driver.impact === 'negative' ? '📉' : '➡️'}
                        </span>
                        <div>
                          <div className="text-sm text-slate-300">{driver.dimension}</div>
                          <div className="text-xs text-slate-500">{driver.topContributor}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-200">{driver.contribution.toFixed(1)}%</div>
                        <div className="text-xs text-slate-500">贡献度</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 行动建议 */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="p-4 rounded-lg bg-slate-900/50 border border-blue-500/20">
                <div className="text-sm text-blue-400 mb-3">【行动建议】</div>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        rec.priority === 'P0' ? 'bg-red-500/20 text-red-400' :
                        rec.priority === 'P1' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {rec.priority}
                      </span>
                      <div className="text-sm text-slate-300">{rec.action}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 数据表格/图表 */}
        <div className="rounded-lg bg-slate-900/50 border border-slate-700 overflow-hidden">
          {view === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr className="text-left text-sm text-slate-400">
                    {Object.keys(result.data[0] || {}).map((key, index) => (
                      <th key={index} className="px-4 py-3 font-medium">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {result.data.slice(0, 100).map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-800/30 transition-colors">
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-3 text-sm text-slate-300">
                          {value !== null && value !== undefined ? String(value) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <ChartDisplay
                data={result.data}
                chartType={chartType}
                onChartTypeChange={setChartType}
                title={`${result.data.length} 条数据可视化`}
              />
            </div>
          )}
        </div>

        {/* SQL 预览 */}
        <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">生成的 SQL</span>
            <button
              onClick={() => navigator.clipboard.writeText(result.sql)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              复制
            </button>
          </div>
          <pre className="text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
            {result.sql}
          </pre>
        </div>
      </div>

      {/* 警告对话框 */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        variant={alertDialog.variant}
        confirmText="我知道了"
      />
    </div>
  )
}

export default ResultDisplay
