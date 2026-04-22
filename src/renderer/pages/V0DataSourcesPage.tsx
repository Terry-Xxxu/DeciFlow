
import { useState, useRef, useEffect } from "react"
import { PageLayout } from "../components/v0-layout/PageLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/v0-ui/Card"
import { Button } from "../components/v0-ui/Button"
import { Input } from "../components/v0-ui/Input"
import { Badge } from "../components/v0-ui/Badge"
import { Select } from "../components/v0-ui/Select"
import {
  Database,
  Plus,
  Trash2,
  Edit,
  Link,
  Unlink,
  Upload,
  File,
  X,
  Loader2,
  Shield,
  Cloud,
  Laptop,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  FolderOpen,
  RefreshCw,
  Eye,
  BarChart3,
  Table,
  Settings,
  GripVertical,
  CheckSquare,
  Square,
} from "lucide-react"
import { cn } from "../lib/utils"
import { useDatabase } from "../stores/DatabaseStore"
import { useProjects } from "../stores/ProjectStore"
import { DatabaseType } from "../types/database"
import { showToast } from "../lib/download"

// 支持的数据库类型
const dbTypes = [
  { id: "postgresql", name: "PostgreSQL", defaultPort: 5432 },
  { id: "mysql", name: "MySQL", defaultPort: 3306 },
  { id: "mongodb", name: "MongoDB", defaultPort: 27017 },
  { id: "sqlserver", name: "SQL Server", defaultPort: 1433 },
  { id: "oracle", name: "Oracle", defaultPort: 1521 },
  { id: "redis", name: "Redis", defaultPort: 6379 },
  { id: "snowflake", name: "Snowflake", defaultPort: 443 },
  { id: "bigquery", name: "BigQuery", defaultPort: 443 },
  { id: "clickhouse", name: "ClickHouse", defaultPort: 8123 },
  { id: "sqlite", name: "SQLite", defaultPort: 0 },
]

// 文件大小限制：100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024

// 连接场景类型
type ConnectionScenario = "standard" | "ssh" | "cloud" | "local" | "file"

// 连接方式排序顺序（用于分类展示）
const CONNECT_METHOD_ORDER = ['standard', 'ssh', 'cloud', 'local', 'file', 'demo']

// 连接方式标签配置
const CONNECT_METHOD_CONFIG: Record<string, { label: string; tagColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  demo:     { label: '示例数据',  tagColor: 'border-violet-500/30 text-violet-600 dark:text-violet-400', icon: BarChart3 },
  standard: { label: '直连',     tagColor: 'border-blue-500/30 text-blue-600 dark:text-blue-400',       icon: Link },
  ssh:      { label: 'SSH',       tagColor: 'border-violet-500/30 text-violet-600 dark:text-violet-400', icon: Shield },
  cloud:    { label: '云数据库',  tagColor: 'border-sky-500/30 text-sky-600 dark:text-sky-400',         icon: Cloud },
  local:    { label: '本地',     tagColor: 'border-amber-500/30 text-amber-600 dark:text-amber-400',   icon: Laptop },
  file:     { label: '文件上传', tagColor: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400', icon: Upload },
}

// 场景配置
const scenarios = [
  {
    id: "standard" as ConnectionScenario,
    name: "直连数据库",
    icon: Link,
    description: "最常用的连接方式",
    badge: "",
  },
  {
    id: "ssh" as ConnectionScenario,
    name: "SSH 隧道",
    icon: Shield,
    description: "通过跳板机连接（企业常用）",
    badge: "企业",
  },
  {
    id: "cloud" as ConnectionScenario,
    name: "云数据库",
    icon: Cloud,
    description: "AWS、阿里云等",
    badge: "",
  },
  {
    id: "local" as ConnectionScenario,
    name: "本地测试",
    icon: Laptop,
    description: "自己电脑上的数据库",
    badge: "无需密码",
  },
]

interface V0Props {
  onNavigate?: (page: string) => void
}

interface DatabaseConfig {
  id: string
  name: string
  type: DatabaseType | string
  host: string
  port: number
  database: string
  username: string
  connected: boolean
}

interface NewDatabaseForm {
  // 基本信息
  name: string
  type: string
  host: string
  port: string
  database: string

  // 标准认证
  username: string
  password: string

  // SSH 隧道
  sshHost: string
  sshPort: string
  sshUsername: string
  sshPassword: string
  sshKeyPath: string

  // 云数据库
  connectionString: string

  // 所属项目
  projectId: string
}

// 支持多文件上传
interface MultiFileUploadState {
  name: string
  files: File[]
}

export function V0DataSourcesPage({ onNavigate }: V0Props) {
  const { databases, addDatabase, removeDatabase, removeDatabases, updateDatabase } = useDatabase()
  const { projects, addProject, removeProject, updateProject } = useProjects()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<ConnectionScenario>("standard")
  const [newSource, setNewSource] = useState<NewDatabaseForm>({
    name: "",
    type: "postgresql",
    host: "",
    port: "5432",
    database: "",
    username: "",
    password: "",
    sshHost: "",
    sshPort: "22",
    sshUsername: "",
    sshPassword: "",
    sshKeyPath: "",
    connectionString: "",
    projectId: "default",
  })
  const [fileUpload, setFileUpload] = useState<MultiFileUploadState>({
    name: "",
    files: [],
  })
  const [testingId, setTestingId] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [editingSource, setEditingSource] = useState<DatabaseConfig | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DatabaseConfig | null>(null)

  // 项目折叠状态
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())
  // 项目管理 popover
  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null)
  // 项目重命名内联编辑
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  // Demo 数据库展开的表格列表
  const [expandedTables, setExpandedTables] = useState<Record<string, string[]>>({})
  // 表格预览状态
  const [previewTable, setPreviewTable] = useState<{ db: DatabaseConfig; table: string } | null>(null)
  const [previewTableData, setPreviewTableData] = useState<{ columns: string[]; rows: any[]; total: number } | null>(null)
  const [previewTableLoading, setPreviewTableLoading] = useState(false)

  // 根据数据库 host/type 推断连接方式
  const getConnectionMethod = (db: DatabaseConfig): string => {
    const method = (db as any).connectMethod
    if (method) return method
    if (db.type === 'demo') return 'demo'
    if (db.type === 'file') return 'file'
    return 'standard'
  }

  // 展开数据库的表格
  const handleExpandTables = async (db: DatabaseConfig) => {
    if (expandedTables[db.id]) {
      // 已经展开过，折叠
      setExpandedTables(prev => {
        const next = { ...prev }
        delete next[db.id]
        return next
      })
      return
    }
    // demo 数据库直接用已知表名
    if (db.type === 'demo') {
      setExpandedTables(prev => ({ ...prev, [db.id]: ['users', 'orders', 'products', 'events'] }))
      return
    }
    // file 类型：单个文件对应单个表，表名即文件名（去掉扩展名）
    if (db.type === 'file') {
      const tableName = (db.database || 'data').replace(/\.[^/.]+$/, '')
      setExpandedTables(prev => ({ ...prev, [db.id]: [tableName] }))
      return
    }
    // 其他数据库调用主进程获取表列表
    try {
      const tables: string[] = await (window as any).electronAPI.database.tables(db)
      setExpandedTables(prev => ({ ...prev, [db.id]: tables || [] }))
    } catch {
      setExpandedTables(prev => ({ ...prev, [db.id]: [] }))
    }
  }

  // 预览表格数据（包含基础统计）
  const handlePreviewTable = async (db: DatabaseConfig, tableName: string) => {
    setPreviewTable({ db, table: tableName })
    setPreviewTableData(null)
    setPreviewTableLoading(true)
    try {
      const result = await (window as any).electronAPI.database.query(db, `SELECT * FROM "${tableName}" LIMIT 50`)
      if (!result.success) {
        throw new Error(result.message || result.error || '查询失败')
      }
      const rows = result.data?.rows || []
      const cols = result.data?.columns || []
      const rowCount = result.data?.rowCount ?? rows.length
      setPreviewTableData({ columns: cols, rows: rows.slice(0, 100), total: rowCount })
    } catch (err: any) {
      showToast(`预览失败：${err?.message || '请检查连接'}`, "error")
      setPreviewTable(null)
    } finally {
      setPreviewTableLoading(false)
    }
  }

  // 添加数据源
  const handleAdd = async () => {
    if (selectedScenario === "file") {
      if (fileUpload.files.length === 0 || !fileUpload.name) {
        showToast("请选择文件并输入名称", "error")
        return
      }
      // 读取文件内容（优先用路径，拖拽失败则用 FileReader）
      const readFile = async (file: any, dbId: string): Promise<{ success: boolean; error?: string; content?: string }> => {
        const filePath = file.path || ''
        // 路径有效：走路径读取
        if (filePath && filePath !== file.name) {
          const result = await (window as any).electronAPI.file.register(dbId, filePath, file.name)
          return result
        }
        // 路径无效（拖拽场景）：用 FileReader 读取内容
        return new Promise(resolve => {
          const reader = new FileReader()
          reader.onload = async () => {
            try {
              const content = reader.result as string
              const result = await (window as any).electronAPI.file.register(dbId, '', file.name, content)
              resolve(result)
            } catch (err) {
              resolve({ success: false, error: '文件读取失败' })
            }
          }
          reader.onerror = () => resolve({ success: false, error: '文件读取失败' })
          reader.readAsText(file)
        })
      }

      // 如果只有一个文件
      if (fileUpload.files.length === 1) {
        const file = fileUpload.files[0] as any
        const baseName = file.name.replace(/\.[^/.]+$/, '')
        const dbId = `file-${Date.now()}`
        const result = await readFile(file, dbId)
        if (!result.success) {
          showToast(`文件读取失败：${result.error}`, "error")
          return
        }
        const config = {
          id: dbId,
          name: baseName,
          type: "file" as DatabaseType,
          host: `file://${file.name}`,
          port: 0,
          database: file.name,
          username: "",
          connected: true,
          projectId: newSource.projectId || "default",
          connectMethod: "file" as any,
          filePath: file.path || '',
          fileContent: result.content || '',
        }
        addDatabase(config)
        showToast("文件数据源已添加", "success")
      } else {
        // 多个文件：批量添加，每个文件独立命名
        const timestamp = Date.now()
        const configs: any[] = []
        let failedCount = 0
        for (let i = 0; i < fileUpload.files.length; i++) {
          const file = fileUpload.files[i] as any
          const baseName = (file.name || 'file').replace(/\.[^/.]+$/, '')
          const dbId = `file-${timestamp}-${i}`
          const result = await readFile(file, dbId)
          if (!result.success) {
            showToast(`文件 "${file.name}" 读取失败：${result.error}`, "error")
            failedCount++
            continue
          }
          configs.push({
            id: dbId,
            name: baseName,
            type: "file" as DatabaseType,
            host: `file://${file.name}`,
            port: 0,
            database: file.name,
            username: "",
            connected: true,
            projectId: newSource.projectId || "default",
            connectMethod: "file" as any,
            filePath: file.path || '',
            fileContent: result.content || '',
          })
        }
        if (configs.length > 0) {
          addDatabase(configs)
        }
        if (failedCount > 0) {
          showToast(`${failedCount} 个文件导入失败`, "error")
        } else if (configs.length > 0) {
          showToast(`已添加 ${configs.length} 个文件数据源`, "success")
        }
      }
      setShowAddModal(false)
      resetForm()
      return
    }

    // 验证必填字段
    if (selectedScenario === "cloud") {
      if (!newSource.name || !newSource.connectionString) {
        showToast("请填写名称和连接字符串", "error")
        return
      }
      // 从连接字符串解析（简化处理）
      const config = {
        id: `ds-${Date.now()}`,
        name: newSource.name,
        type: "postgresql" as DatabaseType,
        host: newSource.connectionString,
        port: 0,
        database: "",
        username: "",
        connected: false,
        projectId: newSource.projectId || "default",
        connectMethod: "cloud" as any,
      }
      addDatabase(config)
      showToast("云数据库已添加", "success")
    } else if (selectedScenario === "ssh") {
      if (!newSource.name || !newSource.host || !newSource.database || !newSource.sshHost) {
        showToast("请填写必填字段", "error")
        return
      }
      const config = {
        id: `ds-${Date.now()}`,
        name: newSource.name,
        type: newSource.type as DatabaseType,
        host: newSource.host,
        port: parseInt(newSource.port) || 5432,
        database: newSource.database,
        username: newSource.username || "",
        password: newSource.password || "",
        connected: false,
        projectId: newSource.projectId || "default",
        connectMethod: "ssh" as any,
      }
      addDatabase(config)
      showToast("SSH 隧道数据源已添加", "info")
    } else if (selectedScenario === "local") {
      if (!newSource.name || !newSource.host || !newSource.database) {
        showToast("请填写名称、主机地址和数据库名", "error")
        return
      }
      const config = {
        id: `ds-${Date.now()}`,
        name: newSource.name,
        type: newSource.type as DatabaseType,
        host: newSource.host,
        port: parseInt(newSource.port) || 5432,
        database: newSource.database,
        username: newSource.username || "",
        password: "",
        connected: false,
        projectId: newSource.projectId || "default",
        connectMethod: "local" as any,
      }
      addDatabase(config)
      showToast("本地数据库已添加", "success")
    } else {
      // 标准连接
      if (!newSource.name || !newSource.host || !newSource.database || !newSource.username) {
        showToast("请填写必填字段（名称、主机、数据库名、用户名）", "error")
        return
      }
      const config = {
        id: `ds-${Date.now()}`,
        name: newSource.name,
        type: newSource.type as DatabaseType,
        host: newSource.host,
        port: parseInt(newSource.port) || 5432,
        database: newSource.database,
        username: newSource.username,
        password: newSource.password || "",
        connected: false,
        projectId: newSource.projectId || "default",
        connectMethod: "standard" as any,
      }
      addDatabase(config)
      showToast('数据库已添加，请点击"连接"按钮建立连接', "info")
    }

    setShowAddModal(false)
    resetForm()
  }

  // 重置表单
  const resetForm = () => {
    setFileUpload({ name: "", files: [] })
    setNewSource({
      name: "",
      type: "postgresql",
      host: "",
      port: "5432",
      database: "",
      username: "",
      password: "",
      sshHost: "",
      sshPort: "22",
      sshUsername: "",
      sshPassword: "",
      sshKeyPath: "",
      connectionString: "",
      projectId: "default",
    })
    setSelectedScenario("standard")
  }

  // 文件选择处理（支持多文件）
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      const validFiles: File[] = []
      let invalidCount = 0
      let oversizedCount = 0

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const extension = file.name.split(".").pop()?.toLowerCase()

        if (!["csv", "xlsx", "xls", "json", "parquet"].includes(extension || "")) {
          invalidCount++
          continue
        }
        if (file.size > MAX_FILE_SIZE) {
          oversizedCount++
          continue
        }
        validFiles.push(file)
      }

      if (validFiles.length === 0) {
        showToast("没有找到支持的文件", "error")
        return
      }

      if (invalidCount > 0 || oversizedCount > 0) {
        showToast(`${invalidCount} 个文件格式不支持，${oversizedCount} 个文件超过大小限制`, "warning")
      }

      // 使用第一个文件名作为默认名称
      const firstValidFile = validFiles[0]
      setFileUpload({
        name: fileUpload.name || firstValidFile.name.replace(/\.[^/.]+$/, ""),
        files: validFiles,
      })
    }
  }

  // 连接/断开数据库
  const handleToggleConnection = async (db: DatabaseConfig) => {
    if (db.type === 'file') {
      // 文件类型：点击即断开（清理注册表）
      if (db.connected) {
        try {
          await window.electronAPI.database.disconnect(db)
        } catch { /* ignore */ }
        updateDatabase(db.id, { connected: false })
        showToast("已断开连接", "info")
      } else {
        updateDatabase(db.id, { connected: true })
      }
      return
    }

    if (db.connected) {
      try {
        await window.electronAPI.database.disconnect(db)
      } catch {
        // ignore disconnect errors
      }
      updateDatabase(db.id, { connected: false })
      showToast("已断开连接", "info")
    } else {
      setTestingId(db.id)
      try {
        const result = await window.electronAPI.database.testEnhanced(db)
        if (result.success) {
          updateDatabase(db.id, { connected: true })
          showToast(`成功连接到 ${db.name}`, "success")
          // 连接成功后缓存 Schema，方便后续 NL2SQL
          window.electronAPI.schema.cache(db).catch(() => {})
        } else {
          const errMsg = result.data?.error || result.message || '请检查主机地址、端口、用户名和密码是否正确'
          showToast(`连接失败：${errMsg}`, "error")
        }
      } catch (err: any) {
        const msg = err?.message || ''
        if (msg.includes('ECONNREFUSED')) {
          showToast(`无法连接到 ${db.host}:${db.port}，请确认数据库服务已启动`, "error")
        } else if (msg.includes('password') || msg.includes('authentication')) {
          showToast(`用户名或密码不正确，请检查连接配置`, "error")
        } else if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
          showToast(`连接超时，请检查网络或防火墙设置`, "error")
        } else {
          showToast(`连接失败：${msg || '网络或配置错误'}`, "error")
        }
      } finally {
        setTestingId(null)
      }
    }
  }

  // 刷新 Schema 缓存
  const handleRefreshSchema = async (db: DatabaseConfig) => {
    setRefreshingId(db.id)
    try {
      await window.electronAPI.schema.cache(db)
      showToast(`${db.name} 的 Schema 已更新`, "success")
    } catch {
      showToast("Schema 刷新失败，请检查连接", "error")
    } finally {
      setRefreshingId(null)
    }
  }

  // 编辑数据源
  const handleSaveEdit = (updatedConfig: DatabaseConfig) => {
    updateDatabase(updatedConfig.id, updatedConfig)
    setEditingSource(null)
    showToast("数据源已更新", "success")
  }

  // 删除数据源
  const handleDelete = (db: DatabaseConfig) => {
    setDeleteConfirm(db)
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      const idToRemove = deleteConfirm.id
      setDeleteConfirm(null)
      removeDatabase(idToRemove)
    }
  }

  // 获取数据库类型的默认端口
  const getDefaultPort = (type: string) => {
    const dbType = dbTypes.find((t) => t.id === type)
    return dbType?.defaultPort?.toString() || "5432"
  }

  // 当数据库类型改变时更新默认端口
  const handleTypeChange = (type: string) => {
    setNewSource({
      ...newSource,
      type,
      port: getDefaultPort(type),
    })
  }

  // 项目管理操作
  const handleRenameProject = (id: string, currentName: string) => {
    setRenamingProjectId(id)
    setRenameValue(currentName)
    setProjectMenuOpen(null)
  }

  const handleRenameConfirm = (id: string) => {
    if (renameValue.trim()) {
      updateProject(id, { name: renameValue.trim() })
    }
    setRenamingProjectId(null)
    setRenameValue("")
  }

  const handleDeleteProject = (id: string) => {
    // 将该项目下的数据源移到默认项目
    databases.forEach((db) => {
      if ((db.projectId || "default") === id) {
        updateDatabase(db.id, { projectId: "default" })
      }
    })
    removeProject(id)
    setProjectMenuOpen(null)
    showToast("项目已删除，数据源已移至默认项目", "success")
  }

  const toggleCollapse = (projectId: string) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  return (
    <PageLayout activeItem="datasources" onNavigate={onNavigate}>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            数据源管理
          </h1>
          <p className="text-sm text-muted-foreground">
            管理和连接您的数据源
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowBatchModal(true)} variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            批量管理
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            添加数据源
          </Button>
        </div>
      </div>

      {/* 按项目分组展示数据源 */}
      {databases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">暂无数据源</p>
            <p className="text-sm text-muted-foreground/70 mt-1">点击上方"添加数据源"按钮开始</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {projects.map((project) => {
            const projectDbs = databases.filter(
              (db) => (db.projectId || "default") === project.id
            )
            // 没有数据源且不是默认项目时也显示（便于管理空项目）
            const isCollapsed = collapsedProjects.has(project.id)
            const isMenuOpen = projectMenuOpen === project.id
            const isRenaming = renamingProjectId === project.id

            return (
              <div key={project.id} className="space-y-3">
                {/* 项目标题行 */}
                <div className="flex items-center gap-2 group">
                  <button
                    onClick={() => toggleCollapse(project.id)}
                    className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors flex-1 min-w-0"
                  >
                    {isCollapsed
                      ? <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    }
                    <FolderOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameConfirm(project.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameConfirm(project.id)
                          if (e.key === 'Escape') { setRenamingProjectId(null); setRenameValue("") }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-b border-primary outline-none text-sm font-semibold text-foreground min-w-0 flex-1"
                      />
                    ) : (
                      <span className="truncate">{project.name}</span>
                    )}
                    {!isRenaming && (
                      <Badge variant="outline" className="text-xs flex-shrink-0 ml-1">
                        {projectDbs.length}
                      </Badge>
                    )}
                  </button>

                  {/* 管理按钮 */}
                  <div className="relative">
                    <button
                      onClick={() => setProjectMenuOpen(isMenuOpen ? null : project.id)}
                      className={cn(
                        "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                        "opacity-0 group-hover:opacity-100 focus:opacity-100",
                        isMenuOpen && "!opacity-100 bg-muted text-foreground"
                      )}
                      title="管理项目"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {/* Popover 菜单 */}
                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setProjectMenuOpen(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-xl border border-border bg-card shadow-lg py-1 animate-in fade-in slide-in-from-top-2 duration-100">
                          <button
                            onClick={() => handleRenameProject(project.id, project.name)}
                            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            重命名
                          </button>
                          {project.id !== 'default' && (
                            <button
                              onClick={() => handleDeleteProject(project.id)}
                              className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              删除项目
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 项目下的数据源列表（按连接方式分组） */}
                {!isCollapsed && (
                  <div className="pl-6 space-y-4">
                    {projectDbs.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">暂无数据源</p>
                    ) : (() => {
                      // 按连接方式分组并排序
                      const grouped: Record<string, typeof projectDbs> = {}
                      projectDbs.forEach(db => {
                        const method = (db as any).connectMethod || getConnectionMethod(db)
                        if (!grouped[method]) grouped[method] = []
                        grouped[method].push(db)
                      })
                      const sortedGroups = CONNECT_METHOD_ORDER.filter(m => grouped[m]?.length > 0)

                      return (
                        <>
                          {sortedGroups.map(method => {
                            const dbs = grouped[method]
                            const cfg = CONNECT_METHOD_CONFIG[method] || CONNECT_METHOD_CONFIG.file
                            return (
                              <div key={method} className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  {cfg.label}
                                </p>
                                <div className="grid gap-2">
                                  {dbs.map((dataSource) => (
                                    <DataSourceCard
                                      key={dataSource.id}
                                      db={dataSource}
                                      isConnected={!!dataSource.connected}
                                      testing={testingId === dataSource.id}
                                      refreshing={refreshingId === dataSource.id}
                                      onToggleConnection={() => handleToggleConnection(dataSource)}
                                      onRefreshSchema={() => handleRefreshSchema(dataSource)}
                                      onEdit={() => setEditingSource(dataSource)}
                                      onDelete={() => handleDelete(dataSource)}
                                      onExpandTables={dataSource.type === 'demo' || dataSource.type === 'file' || (dataSource as any).connectMethod === 'demo' || (dataSource as any).connectMethod === 'file'
                                        ? () => handleExpandTables(dataSource)
                                        : undefined}
                                      expandedTables={expandedTables[dataSource.id]}
                                      onPreviewTable={handlePreviewTable}
                                    />
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>
            )
          })}

          {/* 新建项目按钮 */}
          <button
            onClick={() => {
              const name = `项目 ${projects.length + 1}`
              addProject(name)
              showToast(`已创建"${name}"`, "success")
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-lg hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
            新建项目
          </button>
        </div>
      )}

      {/* Add Data Source Modal */}
      {showAddModal && (
        <AddDataSourceModal
          scenario={selectedScenario}
          setScenario={setSelectedScenario}
          newSource={newSource}
          setNewSource={setNewSource}
          fileUpload={fileUpload}
          setFileUpload={setFileUpload}
          onAdd={handleAdd}
          onClose={() => {
            resetForm()
            setShowAddModal(false)
          }}
          onTypeChange={handleTypeChange}
          onFileSelect={handleFileSelect}
          projects={projects}
          onAddProject={(name) => addProject(name)}
        />
      )}

      {/* Batch Management Modal */}
      {showBatchModal && (
        <BatchManagementModal
          projects={projects}
          databases={databases}
          onClose={() => setShowBatchModal(false)}
          onUpdateProject={updateProject}
          onRemoveProject={removeProject}
          onAddProject={addProject}
          onUpdateDatabase={(id, updates) => updateDatabase(id, updates)}
          onRemoveDatabases={removeDatabases}
        />
      )}

      {/* Edit Dialog */}
      {editingSource && (
        <EditDialog
          db={editingSource}
          projects={projects}
          onSave={handleSaveEdit}
          onCancel={() => setEditingSource(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <DeleteConfirmDialog
          db={deleteConfirm}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Table Preview Modal */}
      {previewTable && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setPreviewTable(null); setPreviewTableData(null) } }}
        >
          <Card className="w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Table className="h-4 w-4 text-primary" />
                  {previewTable.table}
                  <span className="text-muted-foreground font-normal text-sm">— {previewTable.db.name}</span>
                </CardTitle>
                {previewTableData && (
                  <CardDescription>
                    显示前 {previewTableData.rows.length} 行
                    {previewTableData.total > 50 && `，共 ${previewTableData.total} 行`}
                  </CardDescription>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setPreviewTable(null); setPreviewTableData(null) }}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto custom-scrollbar">
              {previewTableLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                  <span className="text-muted-foreground">加载数据中...</span>
                </div>
              ) : previewTableData && previewTableData.columns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        {previewTableData.columns.map((col) => (
                          <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap bg-muted/30">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewTableData.rows.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          {previewTableData.columns.map((col) => (
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
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Database className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">暂无数据</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">该表中没有数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageLayout>
  )
}

// 数据源卡片组件
interface DataSourceCardProps {
  db: DatabaseConfig
  isConnected: boolean
  testing: boolean
  refreshing: boolean
  onToggleConnection: () => void
  onRefreshSchema: () => void
  onEdit: () => void
  onDelete: () => void
  onExpandTables?: () => void
  expandedTables?: string[]
  onPreviewTable?: (db: DatabaseConfig, table: string) => void
}

function DataSourceCard({
  db,
  isConnected,
  testing,
  refreshing,
  onToggleConnection,
  onRefreshSchema,
  onEdit,
  onDelete,
  onExpandTables,
  expandedTables,
  onPreviewTable,
}: DataSourceCardProps) {
  const isFile = db.type === 'file'
  const isDemo = db.type === 'demo' || (db as any).connectMethod === 'demo'
  const connectMethod = (db as any).connectMethod || 'standard'
  const methodCfg = CONNECT_METHOD_CONFIG[connectMethod] || CONNECT_METHOD_CONFIG.standard
  const MethodIcon = methodCfg.icon

  const getDbTypeLabel = (type: string) => {
    if (type === 'file') return '文件上传'
    if (type === 'demo') return '示例数据'
    const found = dbTypes.find((t) => t.id === type)
    return found?.name || type
  }

  const isExpanded = !!expandedTables
  // file 类型：表名即文件名（去掉扩展名）
  const fileTableName = isFile ? (db.database || 'data').replace(/\.[^/.]+$/, '') : ''

  return (
    <Card className={cn("overflow-hidden", isConnected && "border-primary/30")}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* 展开/折叠按钮（file 类型不需要，其他类型都需要） */}
            {!isFile && onExpandTables ? (
              <button
                onClick={onExpandTables}
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded flex items-center justify-center transition-colors",
                  "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
                title={isExpanded ? "收起表格" : "展开查看表格"}
              >
                {isExpanded
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />
                }
              </button>
            ) : (
              <div className="flex-shrink-0 w-8" />
            )}

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
              {isDemo ? <BarChart3 className="h-5 w-5 text-primary" />
                : isFile ? <File className="h-5 w-5 text-primary" />
                : <Database className="h-5 w-5 text-primary" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">{db.name}</h3>
                {/* 连接方式标签 */}
                <Badge variant="outline" className={cn("text-xs gap-1", methodCfg.tagColor)}>
                  <MethodIcon className="h-3 w-3" />
                  {methodCfg.label}
                </Badge>
                {/* 数据库类型标签（仅非 demo 和非 file 时显示） */}
                {!isDemo && !isFile && (
                  <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                    {getDbTypeLabel(db.type as string)}
                  </Badge>
                )}
                {/* 连接状态 */}
                {isConnected ? (
                  <Badge variant="outline" className="text-xs text-green-600 dark:text-green-500 border-green-500/30">
                    已连接
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground border-border">
                    未连接
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {isFile ? db.database : isDemo ? '示例数据 · 包含 4 张表' : `${db.host}:${db.port} / ${db.database}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
            {/* 概览按钮（file 类型随时可用，无需连接） */}
            {isFile && onPreviewTable && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-primary hover:text-primary"
                onClick={() => onPreviewTable(db, fileTableName)}
              >
                <Eye className="h-4 w-4" />
                概览
              </Button>
            )}
            {/* 刷新 Schema */}
            {isConnected && !isFile && !isDemo && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={onRefreshSchema}
                disabled={refreshing}
                title="刷新表结构"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
            )}
            {/* 连接/断开按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                isConnected ? "text-muted-foreground hover:text-destructive" : "text-primary hover:text-primary"
              )}
              onClick={onToggleConnection}
              disabled={testing}
              title={isConnected ? "断开连接" : "连接"}
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isConnected ? (
                <Unlink className="h-4 w-4" />
              ) : (
                <Link className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              title="编辑"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 展开的表格列表（仅 demo 数据库，file 类型不需要折叠结构） */}
        {isExpanded && expandedTables && !isFile && (
          <div className="mt-4 pl-10 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">数据表</p>
            {expandedTables.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">暂无法获取表列表</p>
            ) : (
              expandedTables.map(tableName => (
                <div
                  key={tableName}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/60 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <Table className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{tableName}</span>
                  </div>
                  {isConnected && onPreviewTable && (
                    <button
                      onClick={() => onPreviewTable(db, tableName)}
                      className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
                    >
                      <Eye className="h-3 w-3" />
                      概览
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 添加数据源弹窗组件
interface AddDataSourceModalProps {
  scenario: ConnectionScenario
  setScenario: (scenario: ConnectionScenario) => void
  newSource: NewDatabaseForm
  setNewSource: (form: NewDatabaseForm) => void
  fileUpload: MultiFileUploadState
  setFileUpload: (state: MultiFileUploadState) => void
  onAdd: () => void
  onClose: () => void
  onTypeChange: (type: string) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  projects: Array<{ id: string; name: string }>
  onAddProject: (name: string) => { id: string; name: string }
}

function AddDataSourceModal({
  scenario,
  setScenario,
  newSource,
  setNewSource,
  fileUpload,
  setFileUpload,
  onAdd,
  onClose,
  onTypeChange,
  onFileSelect,
  projects,
  onAddProject,
}: AddDataSourceModalProps) {
  const [showNewProjectInput, setShowNewProjectInput] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")

  const handleProjectChange = (value: string) => {
    if (value === '__new__') {
      setShowNewProjectInput(true)
    } else {
      setNewSource({ ...newSource, projectId: value })
    }
  }

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return
    const created = onAddProject(newProjectName.trim())
    setNewSource({ ...newSource, projectId: created.id })
    setNewProjectName("")
    setShowNewProjectInput(false)
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>添加数据源</CardTitle>
          <CardDescription>选择您的连接场景并填写相关信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* 所属项目选择 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">所属项目</p>
            {showNewProjectInput ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  placeholder="输入项目名称"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProject()
                    if (e.key === 'Escape') { setShowNewProjectInput(false); setNewProjectName("") }
                  }}
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleCreateProject}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  创建
                </button>
                <button
                  onClick={() => { setShowNewProjectInput(false); setNewProjectName("") }}
                  className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  取消
                </button>
              </div>
            ) : (
              <Select
                options={[
                  ...projects.map(p => ({ value: p.id, label: p.name })),
                  { value: '__new__', label: '+ 新建项目' },
                ]}
                value={newSource.projectId || 'default'}
                onChange={handleProjectChange}
                placeholder="选择所属项目"
              />
            )}
          </div>

          {/* 选择场景 */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">选择连接场景</p>
            <div className="grid grid-cols-2 gap-3">
              {scenarios.map((s) => {
                const Icon = s.icon
                return (
                  <button
                    key={s.id}
                    onClick={() => setScenario(s.id)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                      scenario === s.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{s.name}</span>
                      {s.badge && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {s.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </button>
                )
              })}
            </div>
            {/* 上传文件单独放在下方 */}
            <button
              onClick={() => setScenario("file")}
              className={cn(
                "w-full flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                scenario === "file"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">上传文件</span>
              </div>
              <p className="text-xs text-muted-foreground">CSV、Excel、JSON</p>
            </button>
          </div>

          {/* 填写信息 */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">填写连接信息</p>

            {/* 标准连接 */}
            {scenario === "standard" && (
              <StandardConnectionForm
                newSource={newSource}
                setNewSource={setNewSource}
                onTypeChange={onTypeChange}
                requireAuth
              />
            )}

            {/* SSH 隧道 */}
            {scenario === "ssh" && (
              <SSHConnectionForm
                newSource={newSource}
                setNewSource={setNewSource}
                onTypeChange={onTypeChange}
              />
            )}

            {/* 云数据库 */}
            {scenario === "cloud" && (
              <CloudConnectionForm
                newSource={newSource}
                setNewSource={setNewSource}
              />
            )}

            {/* 本地测试 */}
            {scenario === "local" && (
              <StandardConnectionForm
                newSource={newSource}
                setNewSource={setNewSource}
                onTypeChange={onTypeChange}
                requireAuth={false}
              />
            )}

            {/* 文件上传 */}
            {scenario === "file" && (
              <FileUploadForm
                fileUpload={fileUpload}
                setFileUpload={setFileUpload}
                onFileSelect={onFileSelect}
              />
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose} className="gap-2">
              <X className="h-4 w-4" />
              取消
            </Button>
            <Button onClick={onAdd} className="gap-2">
              添加
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 标准连接表单
function StandardConnectionForm({
  newSource,
  setNewSource,
  onTypeChange,
  requireAuth,
}: {
  newSource: NewDatabaseForm
  setNewSource: (form: NewDatabaseForm) => void
  onTypeChange: (type: string) => void
  requireAuth: boolean
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/60 p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            名称 <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="生产数据库"
            value={newSource.name}
            onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">数据库类型</label>
          <Select
            options={dbTypes.map((t) => ({ value: t.id, label: t.name }))}
            value={newSource.type}
            onChange={onTypeChange}
            placeholder="选择数据库类型"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            主机地址 <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="localhost 或 192.168.1.100"
            value={newSource.host}
            onChange={(e) => setNewSource({ ...newSource, host: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">数据库服务器的 IP 地址或域名</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">端口</label>
          <Input
            placeholder="5432"
            value={newSource.port}
            onChange={(e) => setNewSource({ ...newSource, port: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          数据库名 <span className="text-destructive">*</span>
        </label>
        <Input
          placeholder="my_database"
          value={newSource.database}
          onChange={(e) => setNewSource({ ...newSource, database: e.target.value })}
        />
      </div>

      {requireAuth ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                用户名 <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="postgres"
                value={newSource.username}
                onChange={(e) => setNewSource({ ...newSource, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">密码</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newSource.password}
                onChange={(e) => setNewSource({ ...newSource, password: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            <Lightbulb className="w-3 h-3 inline-block mr-1" />如果数据库在公司内网，请先连接公司 VPN
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          <Lightbulb className="w-3 h-3 inline-block mr-1" />本地测试数据库无需填写用户名和密码
        </p>
      )}
    </div>
  )
}

// SSH 隧道表单
function SSHConnectionForm({
  newSource,
  setNewSource,
  onTypeChange,
}: {
  newSource: NewDatabaseForm
  setNewSource: (form: NewDatabaseForm) => void
  onTypeChange: (type: string) => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/60 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
        <Shield className="h-4 w-4" />
        <span>SSH 隧道通过跳板机安全连接企业内网数据库</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            名称 <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="生产数据库"
            value={newSource.name}
            onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">数据库类型</label>
          <Select
            options={dbTypes.map((t) => ({ value: t.id, label: t.name }))}
            value={newSource.type}
            onChange={onTypeChange}
            placeholder="选择数据库类型"
          />
        </div>
      </div>

      {/* 目标数据库 */}
      <div className="space-y-3 pt-2 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground uppercase">目标数据库</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              主机地址 <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="192.168.1.100"
              value={newSource.host}
              onChange={(e) => setNewSource({ ...newSource, host: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">端口</label>
            <Input
              placeholder="5432"
              value={newSource.port}
              onChange={(e) => setNewSource({ ...newSource, port: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              数据库名 <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="my_database"
              value={newSource.database}
              onChange={(e) => setNewSource({ ...newSource, database: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">数据库用户名（可选）</label>
          <Input
            placeholder="postgres"
            value={newSource.username}
            onChange={(e) => setNewSource({ ...newSource, username: e.target.value })}
          />
        </div>
      </div>

      {/* SSH 跳板机 */}
      <div className="space-y-3 pt-2 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground uppercase">SSH 跳板机</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              SSH 主机 <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="jump.yourcompany.com"
              value={newSource.sshHost}
              onChange={(e) => setNewSource({ ...newSource, sshHost: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">跳板机地址</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">SSH 端口</label>
            <Input
              placeholder="22"
              value={newSource.sshPort}
              onChange={(e) => setNewSource({ ...newSource, sshPort: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              SSH 用户名 <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="ssh_user"
              value={newSource.sshUsername}
              onChange={(e) => setNewSource({ ...newSource, sshUsername: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">SSH 密码或密钥路径</label>
            <Input
              placeholder="•••••••• 或 ~/.ssh/id_rsa"
              value={newSource.sshPassword}
              onChange={(e) => setNewSource({ ...newSource, sshPassword: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// 云数据库表单
function CloudConnectionForm({
  newSource,
  setNewSource,
}: {
  newSource: NewDatabaseForm
  setNewSource: (form: NewDatabaseForm) => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/60 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20">
        <Cloud className="h-4 w-4" />
        <span>云数据库使用连接字符串一键配置</span>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          名称 <span className="text-destructive">*</span>
        </label>
        <Input
          placeholder="AWS 生产库"
          value={newSource.name}
          onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          连接字符串 <span className="text-destructive">*</span>
        </label>
        <textarea
          placeholder="postgresql://user:password@host:port/database?sslmode=require"
          className="w-full min-h-[80px] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          value={newSource.connectionString}
          onChange={(e) => setNewSource({ ...newSource, connectionString: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          从云服务商控制台复制连接字符串粘贴在此
        </p>
      </div>

      <div className="space-y-2 rounded-lg bg-muted/50 p-3">
        <p className="text-xs font-medium text-foreground">常见云服务商连接示例：</p>
        <ul className="text-xs text-muted-foreground space-y-1 mt-2">
          <li>• AWS RDS: 在控制台查看"终端节点"</li>
          <li>• 阿里云 RDS: 在数据库连接页面获取</li>
          <li>• Google Cloud SQL: 在连接标签页复制</li>
          <li>• Snowflake: 直接使用账号 URL</li>
        </ul>
      </div>
    </div>
  )
}

// 文件上传表单
function FileUploadForm({
  fileUpload,
  setFileUpload,
  onFileSelect,
}: {
  fileUpload: MultiFileUploadState
  setFileUpload: (state: MultiFileUploadState) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理多文件选择（Electron dialog）
  const handlePickFile = async () => {
    const api = (window as any).electronAPI
    if (api?.dialog) {
      // Electron dialog 可能返回单个路径或路径数组
      const result = await api.dialog.openFile({
        filters: [
          { name: '数据文件', extensions: ['csv', 'xlsx', 'xls', 'json', 'parquet'] },
        ],
        properties: ['openFile', 'multiSelections'] as any,
      })

      if (result) {
        // 处理可能是字符串或字符串数组的情况
        const filePaths = Array.isArray(result) ? result : [result]
        const validFiles: File[] = []

        for (const filePath of filePaths) {
          if (!filePath) continue
          const name = filePath.split(/[\\/]/).pop() || filePath
          const ext = name.split('.').pop()?.toLowerCase()

          if (!['csv', 'xlsx', 'xls', 'json', 'parquet'].includes(ext || '')) {
            continue
          }

          validFiles.push({ name, size: 0, path: filePath } as unknown as File)
        }

        if (validFiles.length > 0) {
          const firstFile = validFiles[0]
          setFileUpload({
            name: fileUpload.name || firstFile.name.replace(/\.[^/.]+$/, ""),
            files: [...fileUpload.files, ...validFiles],
          })
        }
      }
    } else {
      fileInputRef.current?.click()
    }
  }

  // 处理多文件拖入
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) return

    const validFiles: File[] = []
    let invalidCount = 0
    let oversizedCount = 0

    for (const file of droppedFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!['csv', 'xlsx', 'xls', 'json', 'parquet'].includes(ext || '')) {
        invalidCount++
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        oversizedCount++
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) {
      showToast(invalidCount > 0 ? "没有找到支持的文件" : "所有文件都超过大小限制", "error")
      return
    }

    // 显示警告信息
    let warningMsg = ""
    if (invalidCount > 0) warningMsg += `${invalidCount} 个文件格式不支持；`
    if (oversizedCount > 0) warningMsg += `${oversizedCount} 个文件超过大小限制；`
    if (warningMsg) {
      showToast(warningMsg, "info")
    }

    // 添加到现有文件列表
    const firstFile = validFiles[0]
    setFileUpload({
      name: fileUpload.name || firstFile.name.replace(/\.[^/.]+$/, ''),
      files: [...fileUpload.files, ...validFiles],
    })
  }

  // 移除单个文件
  const handleRemoveFile = (index: number) => {
    const newFiles = [...fileUpload.files]
    newFiles.splice(index, 1)
    setFileUpload({
      ...fileUpload,
      files: newFiles,
    })
  }

  const hasFiles = fileUpload.files.length > 0

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/60 p-5 shadow-sm">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          数据源名称 <span className="text-destructive">*</span>
        </label>
        <Input
          placeholder="我的销售数据"
          value={fileUpload.name}
          onChange={(e) => setFileUpload({ ...fileUpload, name: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">给这个数据源起一个便于识别的名称</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">选择文件</label>
          {hasFiles && (
            <span className="text-xs text-muted-foreground">
              已选择 {fileUpload.files.length} 个文件
            </span>
          )}
        </div>

        {/* 拖拽区域 */}
        <div
          onClick={handlePickFile}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-all select-none",
            isDragging ? "border-primary bg-primary/5" :
            hasFiles ? "border-green-500/50 bg-green-500/5" :
            "border-border hover:border-primary/50 hover:bg-primary/5"
          )}
        >
          <File className={cn("h-8 w-8 mb-2", hasFiles ? "text-green-500" : "text-muted-foreground")} />
          <p className="text-sm font-medium text-foreground">
            {isDragging ? "松开鼠标放入文件" : hasFiles ? "拖入更多文件或点击重新选择" : "点击选择文件或拖入文件"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {hasFiles ? `当前: ${fileUpload.files.map(f => f.name).join(", ")}` : "支持 CSV, Excel, JSON, Parquet · 最大 100MB/文件"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv,.xlsx,.xls,.json,.parquet"
            multiple
            onChange={onFileSelect}
          />
        </div>

        {/* 文件列表 */}
        {hasFiles && (
          <div className="space-y-2">
            {fileUpload.files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="text-sm text-foreground truncate">{file.name}</span>
                  {file.size > 0 && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  title="移除文件"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 编辑对话框组件
interface EditDialogProps {
  db: DatabaseConfig
  projects: Array<{ id: string; name: string }>
  onSave: (config: DatabaseConfig) => void
  onCancel: () => void
}

function EditDialog({ db, projects, onSave, onCancel }: EditDialogProps) {
  const [formData, setFormData] = useState({ ...db, projectId: (db as any).projectId || 'default' })
  const isFile = db.type === 'file'
  const isCloud = (db.host || '').startsWith('postgresql://') || (db.host || '').startsWith('mysql://') || (db.host || '').startsWith('mongodb://')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel()
        }
      }}
    >
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>编辑数据源</CardTitle>
          <CardDescription>
            {isFile ? '文件数据源' : isCloud ? '云数据库' : '数据库连接'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 名称 — 所有类型都有 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">名称</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* 所属项目 */}
          {projects.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">所属项目</label>
              <Select
                options={projects.map(p => ({ value: p.id, label: p.name }))}
                value={(formData as any).projectId || 'default'}
                onChange={(val) => setFormData({ ...formData, projectId: val } as any)}
                placeholder="选择项目"
              />
            </div>
          )}

          {/* 文件数据源：只显示名称 + 文件提示 */}
          {isFile && (
            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">文件信息</p>
              <p>文件名：{formData.database}</p>
              <p className="mt-1 text-xs">文件数据源只能修改名称，无需密码</p>
            </div>
          )}

          {/* 云数据库：显示连接字符串 */}
          {isCloud && !isFile && (
            <div className="space-y-2">
              <label className="text-sm font-medium">连接字符串</label>
              <textarea
                className="w-full min-h-[80px] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
              />
            </div>
          )}

          {/* 普通数据库：显示所有连接信息 */}
          {!isFile && !isCloud && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">主机地址</label>
                <Input
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">端口</label>
                  <Input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">数据库名</label>
                  <Input
                    value={formData.database}
                    onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">用户名</label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onCancel} className="gap-2">
              <X className="h-4 w-4" />
              取消
            </Button>
            <Button onClick={() => onSave(formData)} className="gap-2">
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 删除确认对话框组件
interface DeleteConfirmDialogProps {
  db: DatabaseConfig
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirmDialog({ db, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel()
        }
      }}
    >
      <Card className="w-full max-w-md shadow-2xl border-destructive/20" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">确认删除数据源</CardTitle>
              <CardDescription className="text-base font-medium text-foreground mt-1">
                "{db.name}"
              </CardDescription>
            </div>
          </div>
          <div className="pt-2">
            <p className="text-sm text-muted-foreground">
              确定要删除 <span className="font-semibold text-foreground">{db.name}</span> 数据源吗？
            </p>
            <p className="text-xs text-destructive mt-2">
              此操作无法撤销，删除后将无法恢复此数据源的连接配置
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="px-6"
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="px-6 shadow-sm"
          >
            确认删除
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── 批量管理弹窗 ───────────────────────────────────────────────────────────────

interface BatchManagementModalProps {
  projects: Array<{ id: string; name: string; order: number }>
  databases: DatabaseConfig[]
  onClose: () => void
  onUpdateProject: (id: string, updates: { name?: string; order?: number }) => void
  onRemoveProject: (id: string) => void
  onAddProject: (name: string) => { id: string; name: string; order: number }
  onUpdateDatabase: (id: string, updates: Partial<DatabaseConfig>) => void
  onRemoveDatabases: (ids: string[]) => void
}

function BatchManagementModal({
  projects,
  databases,
  onClose,
  onUpdateProject,
  onRemoveProject,
  onAddProject,
  onUpdateDatabase,
  onRemoveDatabases,
}: BatchManagementModalProps) {
  // 项目折叠状态
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['default']))
  // 项目重命名
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null)
  const [renameProjectValue, setRenameProjectValue] = useState('')
  // 数据源重命名
  const [renamingDbId, setRenamingDbId] = useState<string | null>(null)
  const [renameDbValue, setRenameDbValue] = useState('')
  // 批量选择
  const [selectedDbIds, setSelectedDbIds] = useState<Set<string>>(new Set())
  // 新建项目输入
  const [newProjectName, setNewProjectName] = useState('')
  // 项目拖拽排序
  const [projectOrder, setProjectOrder] = useState<string[]>([])
  // 确认弹窗
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState<string | null>(null)
  const [deleteDbConfirm, setDeleteDbConfirm] = useState(false)
  // 删除中的项目 id（用于二次确认）
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)

  useEffect(() => {
    setProjectOrder(projects.map(p => p.id))
  }, [])

  // 切换项目展开/折叠
  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  // 拖拽排序
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/plain')
    if (!draggedId || draggedId === targetId) return
    const newOrder = [...projectOrder]
    const draggedIdx = newOrder.indexOf(draggedId)
    const targetIdx = newOrder.indexOf(targetId)
    if (draggedIdx === -1 || targetIdx === -1) return
    newOrder.splice(draggedIdx, 1)
    newOrder.splice(targetIdx, 0, draggedId)
    setProjectOrder(newOrder)
    newOrder.forEach((id, index) => onUpdateProject(id, { order: index }))
  }

  // 项目重命名
  const confirmRenameProject = () => {
    if (renamingProjectId && renameProjectValue.trim()) {
      onUpdateProject(renamingProjectId, { name: renameProjectValue.trim() })
    }
    setRenamingProjectId(null)
    setRenameProjectValue('')
  }

  // 数据源重命名
  const confirmRenameDb = () => {
    if (renamingDbId && renameDbValue.trim()) {
      onUpdateDatabase(renamingDbId, { name: renameDbValue.trim() })
    }
    setRenamingDbId(null)
    setRenameDbValue('')
  }

  // 新建项目
  const handleAddProject = () => {
    if (!newProjectName.trim()) return
    const created = onAddProject(newProjectName.trim())
    setProjectOrder(prev => [...prev, created.id])
    setNewProjectName('')
  }

  // 删除项目（带确认）
  const handleDeleteProjectClick = (id: string) => {
    const count = databases.filter(d => (d as any).projectId === id || (!(d as any).projectId && id === 'default')).length
    setDeletingProjectId(id)
    setDeleteProjectConfirm(count > 0 ? `删除后该项目下的 ${count} 个数据源将移至「默认项目」，数据不会被删除。` : null)
  }

  const confirmDeleteProject = () => {
    if (!deletingProjectId) return
    onRemoveProject(deletingProjectId)
    setProjectOrder(prev => prev.filter(pid => pid !== deletingProjectId))
    setDeletingProjectId(null)
    setDeleteProjectConfirm(null)
  }

  // 表格选择
  const toggleDbSelection = (id: string) => {
    setSelectedDbIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllInProject = (projectId: string) => {
    const projectDbs = databases.filter(d => (d as any).projectId === projectId || (!(d as any).projectId && projectId === 'default'))
    const allSelected = projectDbs.every(d => selectedDbIds.has(d.id))
    setSelectedDbIds(prev => {
      const next = new Set(prev)
      projectDbs.forEach(d => {
        if (allSelected) next.delete(d.id)
        else next.add(d.id)
      })
      return next
    })
  }

  // 批量删除（一次性过滤，修复 React 闭包导致的只删一个 bug）
  const confirmBatchDelete = () => {
    const toDelete = [...selectedDbIds]
    setSelectedDbIds(new Set())
    setDeleteDbConfirm(false)
    onRemoveDatabases(toDelete)
  }

  // 按项目分组（按排序顺序）
  const sortedProjects = projects.slice().sort((a, b) => {
    const ai = projectOrder.indexOf(a.id)
    const bi = projectOrder.indexOf(b.id)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  const getProjectDbs = (projectId: string) =>
    databases.filter(d => (d as any).projectId === projectId || (!(d as any).projectId && projectId === 'default'))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <Card className="w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>批量管理</CardTitle>
            <CardDescription>点击项目名称展开，批量管理数据源</CardDescription>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto custom-scrollbar pt-0 space-y-1">
          {/* 全局批量删除栏 */}
          {selectedDbIds.size > 0 && (
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 mb-2 shadow-sm">
              <span className="text-sm text-destructive font-medium">
                已选择 {selectedDbIds.size} 个数据源
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteDbConfirm(true)}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                批量删除
              </Button>
            </div>
          )}

          {/* 项目树形列表 */}
          {sortedProjects.map(project => {
            const isDefault = project.id === 'default'
            const isExpanded = expandedProjects.has(project.id)
            const projectDbs = getProjectDbs(project.id)
            const isRenamingProject = renamingProjectId === project.id
            const projectAllSelected = projectDbs.length > 0 && projectDbs.every(d => selectedDbIds.has(d.id))

            return (
              <div key={project.id} className="rounded-xl border border-border overflow-hidden">
                {/* 项目行 */}
                <div
                  className="flex items-center gap-2 py-3 px-3 hover:bg-muted/40 transition-colors group"
                  draggable={!isDefault}
                  onDragStart={(e) => !isDefault && handleDragStart(e, project.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => !isDefault && handleDrop(e, project.id)}
                >
                  {/* 拖拽手柄 */}
                  {!isDefault ? (
                    <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab flex-shrink-0" />
                  ) : (
                    <div className="w-4 flex-shrink-0" />
                  )}

                  {/* 展开/折叠箭头 */}
                  <button
                    onClick={() => projectDbs.length > 0 && toggleProject(project.id)}
                    className={cn(
                      "flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors",
                      projectDbs.length > 0 ? "hover:bg-muted text-muted-foreground" : "text-transparent cursor-default"
                    )}
                  >
                    <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
                  </button>

                  <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                  {/* 项目名称 */}
                  {isRenamingProject ? (
                    <input
                      autoFocus
                      value={renameProjectValue}
                      onChange={e => setRenameProjectValue(e.target.value)}
                      onBlur={confirmRenameProject}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmRenameProject()
                        if (e.key === 'Escape') { setRenamingProjectId(null); setRenameProjectValue('') }
                      }}
                      className="flex-1 bg-transparent border-b border-primary outline-none text-sm font-semibold text-foreground"
                    />
                  ) : (
                    <button
                      className="flex-1 text-left text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      onClick={() => projectDbs.length > 0 && toggleProject(project.id)}
                    >
                      {project.name}
                      {isDefault && (
                        <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0.5">默认</Badge>
                      )}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">({projectDbs.length})</span>
                    </button>
                  )}

                  {/* 项目操作按钮 */}
                  {!isDefault && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setRenamingProjectId(project.id); setRenameProjectValue(project.name) }}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="重命名"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProjectClick(project.id)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 展开的数据源列表 */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20">
                    {/* 项目内全选 */}
                    {projectDbs.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 pl-14 border-b border-border/50">
                        <button
                          onClick={() => selectAllInProject(project.id)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {projectAllSelected
                            ? <><CheckSquare className="h-3.5 w-3.5 text-primary" /> 取消全选</>
                            : <><Square className="h-3.5 w-3.5" /> 全选</>
                          }
                        </button>
                      </div>
                    )}

                    {/* 数据源行 */}
                    {projectDbs.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 pl-14">暂无数据源</p>
                    ) : projectDbs.map(db => {
                      const isRenamingDb = renamingDbId === db.id
                      const isSelected = selectedDbIds.has(db.id)
                      return (
                        <div
                          key={db.id}
                          className={cn(
                            "group flex items-center gap-2 py-2.5 px-3 pl-14 transition-colors border-b border-border/30 last:border-0",
                            isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                          )}
                        >
                          {/* 选择框 */}
                          <button
                            onClick={() => db.id && toggleDbSelection(db.id)}
                            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isSelected
                              ? <CheckSquare className="h-4 w-4 text-primary" />
                              : <Square className="h-4 w-4" />
                            }
                          </button>

                          {/* 数据源图标 */}
                          {db.type === 'file'
                            ? <File className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            : <Database className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          }

                          {/* 名称 */}
                          {isRenamingDb ? (
                            <input
                              autoFocus
                              value={renameDbValue}
                              onChange={e => setRenameDbValue(e.target.value)}
                              onBlur={confirmRenameDb}
                              onKeyDown={e => {
                                if (e.key === 'Enter') confirmRenameDb()
                                if (e.key === 'Escape') { setRenamingDbId(null); setRenameDbValue('') }
                              }}
                              className="flex-1 bg-transparent border-b border-primary outline-none text-sm text-foreground min-w-0"
                            />
                          ) : (
                            <button
                              className="flex-1 text-left text-sm text-foreground truncate hover:text-primary transition-colors"
                              onClick={() => { setRenamingDbId(db.id); setRenameDbValue(db.name || '') }}
                              title="点击重命名"
                            >
                              {db.name}
                            </button>
                          )}

                          {/* 文件名/描述 */}
                          <span className="text-xs text-muted-foreground truncate max-w-[100px] flex-shrink-0" title={db.database}>
                            {db.database || db.host}
                          </span>

                          {/* 操作 */}
                          <button
                            onClick={() => { setRenamingDbId(db.id); setRenameDbValue(db.name || '') }}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                            title="重命名"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { db.id && toggleDbSelection(db.id) }}
                            className={cn(
                              "p-1 rounded transition-colors flex-shrink-0",
                              isSelected
                                ? "text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100"
                                : "text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                            )}
                            title={isSelected ? "取消选择" : "选择"}
                          >
                            {isSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* 新建项目 */}
          <div className="flex items-center gap-2 pt-2 border-t border-border mt-2">
            <Input
              placeholder="新建项目名称"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddProject() }}
              className="flex-1 h-9 text-sm"
            />
            <Button size="sm" onClick={handleAddProject} disabled={!newProjectName.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              新建项目
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 删除项目确认 */}
      {deletingProjectId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setDeletingProjectId(null); setDeleteProjectConfirm(null) } }}>
          <Card className="w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base">确认删除项目</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {deleteProjectConfirm || '确定要删除此项目吗？'}
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => { setDeletingProjectId(null); setDeleteProjectConfirm(null) }}>取消</Button>
                <Button variant="destructive" size="sm" onClick={confirmDeleteProject}>确认删除</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 批量删除确认 */}
      {deleteDbConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteDbConfirm(false) }}>
          <Card className="w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base">确认批量删除</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                确定要删除选中的 {selectedDbIds.size} 个数据源吗？此操作无法撤销。
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => setDeleteDbConfirm(false)}>取消</Button>
                <Button variant="destructive" size="sm" onClick={confirmBatchDelete}>确认删除</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
