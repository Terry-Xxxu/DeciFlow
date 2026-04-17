
import { useState } from "react"
import { Button } from "../v0-ui/Button"
import { Table, Download, Eye, EyeOff, Code2, Check } from "lucide-react"
import { cn } from "../../lib/utils"
import { downloadAsCSV, downloadAsJSON, copyToClipboard, showToast } from "../../lib/download"

interface QueryResult {
  columns: string[]
  rows: Record<string, any>[]
  rowCount: number
  duration: number
  sql: string
}

interface DataPreviewProps {
  result: QueryResult
}

const PAGE_SIZE = 50

export function DataPreview({ result }: DataPreviewProps) {
  const [showSQL, setShowSQL] = useState(false)
  const [copied, setCopied] = useState(false)
  const [page, setPage] = useState(0)

  const { columns, rows, rowCount, duration, sql } = result
  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleExportCSV = () => {
    downloadAsCSV(rows, "query-results.csv")
    showToast("已导出为 CSV", "success")
  }

  const handleExportJSON = () => {
    downloadAsJSON(rows, "query-results.json")
    showToast("已导出为 JSON", "success")
  }

  const handleCopySQL = async () => {
    const success = await copyToClipboard(sql)
    if (success) {
      setCopied(true)
      showToast("SQL 已复制到剪贴板", "success")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // 格式化单元格值
  const formatCell = (value: any): string => {
    if (value === null || value === undefined) return "—"
    if (value instanceof Date) return value.toLocaleString()
    if (typeof value === "object") return JSON.stringify(value)
    return String(value)
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Table className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">查询结果</h2>
            <p className="text-sm text-muted-foreground">
              {rowCount.toLocaleString()} 行数据 · {duration}ms
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleCopySQL}>
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                已复制
              </>
            ) : (
              <>
                <Code2 className="h-4 w-4" />
                SQL
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => setShowSQL(!showSQL)}
          >
            {showSQL ? (
              <>
                <EyeOff className="h-4 w-4" />
                隐藏
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                预览 SQL
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            导出
          </Button>
        </div>
      </div>

      {/* SQL Preview */}
      {showSQL && (
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <pre className="overflow-x-auto text-xs font-mono text-foreground/80 whitespace-pre-wrap break-words">
            {sql}
          </pre>
        </div>
      )}

      {/* Table */}
      {columns.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageRows.map((row, i) => (
                <tr key={i} className="transition-colors hover:bg-muted/20">
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="whitespace-nowrap px-5 py-3 text-sm text-muted-foreground max-w-[200px] truncate"
                      title={formatCell(row[col])}
                    >
                      {formatCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          查询成功，但未返回数据
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <span className="text-sm text-muted-foreground">
          显示 {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} / 共 {rowCount.toLocaleString()} 条
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  )
}
