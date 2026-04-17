
import { useState, useRef } from "react"
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
} from "lucide-react"
import { cn } from "../lib/utils"
import { useDatabase } from "../stores/DatabaseStore"
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

// 场景配置
const scenarios = [
  {
    id: "standard" as ConnectionScenario,
    name: "标准连接",
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
}

interface FileUploadState {
  name: string
  file: File | null
}

export function V0DataSourcesPage({ onNavigate }: V0Props) {
  const { databases, addDatabase, removeDatabase, updateDatabase } = useDatabase()
  const [showAddModal, setShowAddModal] = useState(false)
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
  })
  const [fileUpload, setFileUpload] = useState<FileUploadState>({
    name: "",
    file: null,
  })
  const [testingId, setTestingId] = useState<string | null>(null)
  const [editingSource, setEditingSource] = useState<DatabaseConfig | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DatabaseConfig | null>(null)

  // 分离已连接和未连接的数据源
  const connectedSources = databases.filter((db) => db.connected)
  const otherSources = databases.filter((db) => !db.connected)

  // 添加数据源
  const handleAdd = () => {
    if (selectedScenario === "file") {
      if (!fileUpload.file || !fileUpload.name) {
        showToast("请选择文件并输入名称", "error")
        return
      }
      if (fileUpload.file.size > MAX_FILE_SIZE) {
        showToast(`文件大小超过限制（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）`, "error")
        return
      }
      const config = {
        id: `file-${Date.now()}`,
        name: fileUpload.name,
        type: "file" as DatabaseType,
        host: `file://${fileUpload.file.name}`,
        port: 0,
        database: fileUpload.file.name,
        username: "",
        connected: true,
      }
      addDatabase(config)
      showToast("文件数据源已添加", "success")
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
      }
      addDatabase(config)
      showToast('数据库已添加，请点击"连接"按钮建立连接', "info")
    }

    setShowAddModal(false)
    resetForm()
  }

  // 重置表单
  const resetForm = () => {
    setFileUpload({ name: "", file: null })
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
    })
    setSelectedScenario("standard")
  }

  // 文件选择处理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const extension = selectedFile.name.split(".").pop()?.toLowerCase()
      if (!["csv", "xlsx", "xls", "json", "parquet"].includes(extension || "")) {
        showToast("支持的文件格式：CSV, Excel, JSON, Parquet", "error")
        return
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
        showToast(`文件大小超过限制（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）`, "error")
        return
      }
      setFileUpload({
        name: selectedFile.name.replace(/\.[^/.]+$/, ""),
        file: selectedFile,
      })
    }
  }

  // 连接/断开数据库
  const handleToggleConnection = async (db: DatabaseConfig) => {
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
          showToast(`连接失败：${result.error || '请检查连接参数'}`, "error")
        }
      } catch (err: any) {
        showToast(`连接失败：${err?.message || '网络或配置错误'}`, "error")
      } finally {
        setTestingId(null)
      }
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
      removeDatabase(deleteConfirm.id)
      setDeleteConfirm(null)
      showToast("数据源已删除", "success")
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
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          添加数据源
        </Button>
      </div>

      {/* Connected Data Sources */}
      {connectedSources.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">已连接的数据源</h2>
          <div className="grid gap-4">
            {connectedSources.map((dataSource) => (
              <DataSourceCard
                key={dataSource.id}
                db={dataSource}
                isConnected={true}
                testing={testingId === dataSource.id}
                onToggleConnection={() => handleToggleConnection(dataSource)}
                onEdit={() => setEditingSource(dataSource)}
                onDelete={() => handleDelete(dataSource)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Historical Data Sources */}
      {otherSources.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">历史数据源</h2>
          <div className="grid gap-4">
            {otherSources.map((dataSource) => (
              <DataSourceCard
                key={dataSource.id}
                db={dataSource}
                isConnected={false}
                testing={testingId === dataSource.id}
                onToggleConnection={() => handleToggleConnection(dataSource)}
                onEdit={() => setEditingSource(dataSource)}
                onDelete={() => handleDelete(dataSource)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {databases.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">暂无数据源</p>
            <p className="text-sm text-muted-foreground/70 mt-1">点击上方"添加数据源"按钮开始</p>
          </CardContent>
        </Card>
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
        />
      )}

      {/* Edit Dialog */}
      {editingSource && (
        <EditDialog
          db={editingSource}
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
    </PageLayout>
  )
}

// 数据源卡片组件
interface DataSourceCardProps {
  db: DatabaseConfig
  isConnected: boolean
  testing: boolean
  onToggleConnection: () => void
  onEdit: () => void
  onDelete: () => void
}

function DataSourceCard({
  db,
  isConnected,
  testing,
  onToggleConnection,
  onEdit,
  onDelete,
}: DataSourceCardProps) {
  const getDbTypeInfo = (type: string) => {
    return dbTypes.find((t) => t.id === type) || { name: type }
  }

  const typeInfo = getDbTypeInfo(db.type)

  return (
    <Card className={cn("overflow-hidden", isConnected && "border-primary/30")}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{db.name}</h3>
                {isConnected ? (
                  <Badge variant="outline" className="gap-1 text-xs text-green-600 dark:text-green-500">
                    已连接
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    未连接
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {typeInfo.name} · {db.host}:{db.port}
              </p>
              <p className="text-xs text-muted-foreground">
                数据库: {db.database}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
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
  fileUpload: FileUploadState
  setFileUpload: (state: FileUploadState) => void
  onAdd: () => void
  onClose: () => void
  onTypeChange: (type: string) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
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
}: AddDataSourceModalProps) {
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
  fileUpload: FileUploadState
  setFileUpload: (state: FileUploadState) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePickFile = async () => {
    const api = (window as any).electronAPI
    if (api?.dialog) {
      const filePath: string | null = await api.dialog.openFile({
        filters: [
          { name: '数据文件', extensions: ['csv', 'xlsx', 'xls', 'json', 'parquet'] },
        ],
      })
      if (filePath) {
        const name = filePath.split(/[\\/]/).pop() || filePath
        const baseName = name.replace(/\.[^/.]+$/, '')
        setFileUpload({ name: fileUpload.name || baseName, file: { name, size: 0, path: filePath } as any })
      }
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls', 'json', 'parquet'].includes(ext || '')) {
      return
    }
    if (file.size > MAX_FILE_SIZE) return
    setFileUpload({ name: fileUpload.name || file.name.replace(/\.[^/.]+$/, ''), file })
  }

  const hasFile = !!fileUpload.file

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
        <label className="text-sm font-medium text-foreground">选择文件</label>
        <div
          onClick={handlePickFile}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-all select-none",
            isDragging ? "border-primary bg-primary/5" :
            hasFile ? "border-green-500/50 bg-green-500/5" :
            "border-border hover:border-primary/50 hover:bg-primary/5"
          )}
        >
          <File className={cn("h-10 w-10 mb-2", hasFile ? "text-green-500" : "text-muted-foreground")} />
          <p className="text-sm font-medium text-foreground">
            {isDragging ? "松开鼠标放入文件" : hasFile ? fileUpload.file!.name : "点击选择文件"}
          </p>
          {hasFile && fileUpload.file!.size > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {(fileUpload.file!.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {hasFile ? "点击重新选择" : "或拖拽文件到这里 · CSV, Excel, JSON, Parquet · 最大 100MB"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv,.xlsx,.xls,.json,.parquet"
            onChange={onFileSelect}
          />
        </div>
      </div>
    </div>
  )
}

// 编辑对话框组件
interface EditDialogProps {
  db: DatabaseConfig
  onSave: (config: DatabaseConfig) => void
  onCancel: () => void
}

function EditDialog({ db, onSave, onCancel }: EditDialogProps) {
  const [formData, setFormData] = useState(db)

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
          <CardDescription>修改数据源连接信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">名称</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

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
