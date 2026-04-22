import { useState } from "react"
import { Table as TableIcon, X, Loader2, Database } from "lucide-react"

interface Column {
  name: string
  sampleValues?: string[]
  inferredType?: string
}

interface TableSchemaOverviewProps {
  tableInfo?: {
    tableType?: string
    columns?: Column[]
  } | null
  tableName?: string
  db?: any            // 用于获取预览数据
}

export function TableSchemaOverview({ tableInfo, tableName, db }: TableSchemaOverviewProps) {
  const [showModal, setShowModal] = useState(false)
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: any[]; total: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const columns = tableInfo?.columns || []
  if (columns.length === 0) return null

  const openModal = () => {
    setShowModal(true)
    setLoadError(null)
    if (previewData) return
    if (!db || !tableName) {
      setLoadError('缺少数据源信息，请重新执行一键分析')
      return
    }
    setLoading(true)
    const api = (window as any).electronAPI?.analysis?.getTableData
    if (!api) {
      setLoadError('API 未找到，请刷新页面重试')
      setLoading(false)
      return
    }
    api(db, tableName, 50)
      .then((result: any) => {
        if (result?.success) {
          setPreviewData(result.data)
        } else {
          setLoadError(result?.error || '加载数据失败')
        }
      })
      .catch((err: any) => {
        setLoadError(err?.message || '加载数据失败')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <>
      {/* 触发按钮 */}
      <div data-table-overview>
        <button
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors text-left"
          onClick={openModal}
        >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TableIcon className="h-4 w-4" />
          <span>表概览</span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{columns.length} 个字段</span>
          {tableInfo?.tableType && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {tableInfo.tableType}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">点击查看 →</span>
        </button>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            className="w-full max-w-5xl max-h-[88vh] flex flex-col bg-card rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <TableIcon className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">{tableName}</span>
                <span className="text-muted-foreground text-sm">— 表概览</span>
                {previewData && (
                  <span className="text-xs text-muted-foreground">
                    {previewData.rows.length < previewData.total
                      ? `显示前 ${previewData.rows.length} / ${previewData.total} 行`
                      : `共 ${previewData.total} 行`}
                  </span>
                )}
              </div>
              <button
                className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                onClick={() => setShowModal(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 表头信息区 */}
            <div className="px-5 py-3 border-b border-border bg-muted/20 shrink-0">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {columns.map((col) => (
                  <div key={col.name} className="text-xs">
                    <span className="font-mono text-foreground font-medium">{col.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 数据表格区 */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                  <span className="text-muted-foreground text-sm">加载数据中…</span>
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="text-destructive text-sm mb-1">数据加载失败</div>
                  <div className="text-muted-foreground text-xs">{loadError}</div>
                  <div className="text-muted-foreground text-xs mt-2">提示：刷新页面或重新导入 CSV 文件</div>
                </div>
              ) : previewData && previewData.columns.length > 0 ? (
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-border bg-muted/40">
                      {previewData.columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        {previewData.columns.map((col) => (
                          <td key={col} className="px-3 py-2 text-foreground whitespace-nowrap max-w-[200px] truncate">
                            {row[col] === null || row[col] === undefined ? (
                              <span className="text-muted-foreground italic">null</span>
                            ) : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Database className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground text-sm">暂无数据</p>
                  <p className="text-muted-foreground/70 text-xs mt-1">该表中没有数据</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
