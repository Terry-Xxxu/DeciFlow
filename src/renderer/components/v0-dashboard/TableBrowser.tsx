/**
 * 表浏览器组件
 * 用于浏览和选择数据库中的表
 */

import { useState, useEffect } from "react"
import { Modal } from "../Modal"
import { Input } from "../v0-ui/Input"
import { Button } from "../v0-ui/Button"
import { Badge } from "../v0-ui/Badge"
import { useTheme } from "../../contexts/ThemeContext"
import { DatabaseType } from "../../types/database"
import {
  Database,
  Table,
  Search,
  ChevronRight,
  Loader2,
  Check,
  Columns,
} from "lucide-react"
import { cn } from "../../lib/utils"

// 数据库配置接口（兼容 DatabaseStore）
interface TableBrowserDatabaseConfig {
  id: string
  name: string
  type: DatabaseType | string
  host: string
  port: number
  database: string
  username: string
  connected?: boolean
}

interface TableColumn {
  name: string
  type: string
  nullable?: boolean
  primary?: boolean
}

interface TableInfo {
  name: string
  columns?: TableColumn[]
  rowCount?: number
}

interface TableBrowserProps {
  isOpen: boolean
  onClose: () => void
  database: TableBrowserDatabaseConfig
  onSelect: (tableName: string, columns?: TableColumn[]) => void
  selectedTable?: string
  multiSelect?: boolean
}

export function TableBrowser({
  isOpen,
  onClose,
  database,
  onSelect,
  selectedTable,
  multiSelect = false,
}: TableBrowserProps) {
  const { mode } = useTheme()
  const isDark = mode === "dark"

  const [searchQuery, setSearchQuery] = useState("")
  const [tables, setTables] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedTable, setExpandedTable] = useState<string | null>(null)
  const [tableColumns, setTableColumns] = useState<Record<string, TableColumn[]>>({})
  const [loadingColumns, setLoadingColumns] = useState<Set<string>>(new Set())

  // 获取表列表
  useEffect(() => {
    if (isOpen && database && database.connected) {
      fetchTables()
    }
  }, [isOpen, database])

  const fetchTables = async () => {
    if (!database?.connected) {
      console.error("数据库未连接")
      return
    }

    setLoading(true)
    try {
      // 构造 electronAPI 需要的配置格式
      const dbConfig = {
        type: database.type,
        host: database.host,
        port: database.port,
        database: database.database,
        username: database.username,
        password: "", // 密码不在前端存储，由主进程管理
      }
      const result = await (window as any).electronAPI.database.tables(dbConfig)
      setTables(result || [])
    } catch (error) {
      console.error("获取表列表失败:", error)
      setTables([])
    } finally {
      setLoading(false)
    }
  }

  // 获取表结构
  const fetchTableColumns = async (tableName: string) => {
    if (tableColumns[tableName]) {
      // 已缓存，直接展开
      setExpandedTable(tableName)
      return
    }

    if (!database?.connected) {
      console.error("数据库未连接")
      return
    }

    setLoadingColumns((prev) => new Set(prev).add(tableName))
    try {
      // 构造 electronAPI 需要的配置格式
      const dbConfig = {
        type: database.type,
        host: database.host,
        port: database.port,
        database: database.database,
        username: database.username,
        password: "",
      }
      const result = await (window as any).electronAPI.schema.getTable(
        dbConfig,
        tableName
      )
      setTableColumns((prev) => ({
        ...prev,
        [tableName]: result?.data?.columns || result?.columns || [],
      }))
      setExpandedTable(tableName)
    } catch (error) {
      console.error("获取表结构失败:", error)
    } finally {
      setLoadingColumns((prev) => {
        const next = new Set(prev)
        next.delete(tableName)
        return next
      })
    }
  }

  const filteredTables = tables.filter((table) =>
    table.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectTable = (tableName: string) => {
    const columns = tableColumns[tableName]
    onSelect(tableName, columns)
    onClose()
  }

  // 数据类型颜色映射
  const getTypeColor = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes("int") || t.includes("number") || t.includes("decimal"))
      return "text-blue-400"
    if (t.includes("char") || t.includes("text") || t.includes("string"))
      return "text-green-400"
    if (t.includes("date") || t.includes("time")) return "text-yellow-400"
    if (t.includes("bool")) return "text-purple-400"
    return "text-gray-400"
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <span>选择数据表</span>
          <Badge variant="outline" className="ml-2">
            {database.name}
          </Badge>
        </div>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索表名..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 表列表 */}
        <div className={cn(
          "border rounded-lg overflow-hidden",
          isDark ? "border-white/10" : "border-gray-200"
        )}>
          {/* 表头 */}
          <div className={cn(
            "flex items-center gap-3 px-4 py-2 border-b text-xs font-medium",
            isDark
              ? "border-white/10 bg-white/5 text-muted-foreground"
              : "border-gray-200 bg-gray-50 text-gray-600"
          )}>
            <div className="w-8"></div>
            <div className="flex-1">表名</div>
            <div className="w-20 text-right">操作</div>
          </div>

          {/* 表内容 */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {!database?.connected ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Database className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-2">数据库未连接</p>
                <p className="text-xs text-muted-foreground">
                  请先在数据源页面连接此数据库
                </p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  加载表列表...
                </span>
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Table className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "没有找到匹配的表" : "该数据库暂无表"}
                </p>
              </div>
            ) : (
              filteredTables.map((tableName) => {
                const isExpanded = expandedTable === tableName
                const isSelected = selectedTable === tableName
                const columns = tableColumns[tableName]
                const isLoadingColumns = loadingColumns.has(tableName)

                return (
                  <div key={tableName}>
                    {/* 表行 */}
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer",
                        isDark
                          ? "hover:bg-white/5"
                          : "hover:bg-gray-50",
                        isSelected && isDark && "bg-primary/10",
                        isSelected && !isDark && "bg-primary/5"
                      )}
                    >
                      {/* 展开/收起按钮 */}
                      <button
                        onClick={() => fetchTableColumns(tableName)}
                        className={cn(
                          "w-8 h-8 rounded flex items-center justify-center transition-colors",
                          isDark
                            ? "hover:bg-white/10 text-muted-foreground"
                            : "hover:bg-gray-200 text-gray-500"
                        )}
                      >
                        {isLoadingColumns ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-90"
                            )}
                          />
                        )}
                      </button>

                      {/* 表名 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-medium truncate",
                            isDark ? "text-foreground" : "text-gray-900"
                          )}>
                            {tableName}
                          </span>
                          {columns && (
                            <Badge
                              variant="outline"
                              className="gap-1 text-xs"
                            >
                              <Columns className="h-3 w-3" />
                              {columns.length} 字段
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* 选择按钮 */}
                      <Button
                        size="sm"
                        variant={isSelected ? "primary" : "outline"}
                        onClick={() => handleSelectTable(tableName)}
                        className="gap-1"
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-3 w-3" />
                            已选择
                          </>
                        ) : (
                          "选择"
                        )}
                      </Button>
                    </div>

                    {/* 列信息（展开时显示） */}
                    {isExpanded && columns && (
                      <div className={cn(
                        "border-t px-4 py-3 ml-11",
                        isDark
                          ? "border-white/10 bg-black/20"
                          : "border-gray-100 bg-gray-50/50"
                      )}>
                        <div className="space-y-2">
                          {columns.map((column) => (
                            <div
                              key={column.name}
                              className={cn(
                                "flex items-center gap-3 py-1.5 px-3 rounded",
                                isDark
                                  ? "bg-white/5"
                                  : "bg-white"
                              )}
                            >
                              {/* 主键标识 */}
                              {column.primary && (
                                <Badge
                                  variant="primary"
                                  className="gap-1 text-xs px-1.5"
                                >
                                  PK
                                </Badge>
                              )}

                              {/* 列名 */}
                              <span className={cn(
                                "flex-1 font-mono text-sm",
                                isDark ? "text-foreground" : "text-gray-900"
                              )}>
                                {column.name}
                              </span>

                              {/* 数据类型 */}
                              <span className={cn(
                                "text-xs font-mono",
                                getTypeColor(column.type)
                              )}>
                                {column.type}
                              </span>

                              {/* 可空标识 */}
                              {column.nullable !== false && (
                                <span className={cn(
                                  "text-xs",
                                  isDark ? "text-muted-foreground" : "text-gray-500"
                                )}>
                                  nullable
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 底部提示 */}
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg text-xs",
          isDark
            ? "bg-white/5 text-muted-foreground"
            : "bg-gray-100 text-gray-600"
        )}>
          <Columns className="h-4 w-4" />
          <span>点击箭头查看表结构，点击"选择"按钮确认</span>
        </div>
      </div>
    </Modal>
  )
}
