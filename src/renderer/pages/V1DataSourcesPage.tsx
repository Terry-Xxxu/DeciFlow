import { useState } from "react"
import { PageLayout } from "../components/dashboard/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import {
  Database,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  ChevronRight,
  Cloud,
  FileSpreadsheet,
  FolderOpen,
  Server,
  Leaf,
} from "lucide-react"
import { EmptyState } from "../components/dashboard/empty-states"

interface DataSourcePageProps {
  onNavigate?: (page: string) => void
}

const mockDataSources = [
  {
    id: "1",
    name: "Production PostgreSQL",
    type: "postgresql",
    icon: <Server className="h-6 w-6 text-blue-500" />,
    host: "db.production.internal",
    status: "connected",
    lastConnected: "2分钟前",
    tables: 24,
    size: "2.4 GB",
  },
  {
    id: "2",
    name: "Analytics MySQL",
    type: "mysql",
    icon: <Database className="h-6 w-6 text-orange-500" />,
    host: "analytics.mysql.internal",
    status: "connected",
    lastConnected: "1小时前",
    tables: 56,
    size: "8.1 GB",
  },
  {
    id: "3",
    name: "Dev MongoDB",
    type: "mongodb",
    icon: <Leaf className="h-6 w-6 text-green-500" />,
    host: "dev.mongodb.internal",
    status: "error",
    lastConnected: "1天前",
    tables: 0,
    size: "0 MB",
  },
]

const sourceTypes = [
  { id: "postgresql", name: "PostgreSQL", icon: <Server className="h-5 w-5" />,   color: "bg-blue-500/10 text-blue-500"   },
  { id: "mysql",      name: "MySQL",      icon: <Database className="h-5 w-5" />, color: "bg-orange-500/10 text-orange-500"},
  { id: "mongodb",    name: "MongoDB",    icon: <Leaf className="h-5 w-5" />,     color: "bg-green-500/10 text-green-500"  },
  { id: "sqlite",     name: "SQLite",     icon: <FolderOpen className="h-5 w-5" />, color: "bg-purple-500/10 text-purple-500"},
]

const quickConnectTypes = [
  { id: "csv", name: "CSV 文件", icon: FileSpreadsheet, description: "导入 CSV 数据" },
  { id: "excel", name: "Excel", icon: FileSpreadsheet, description: "导入 Excel 工作表" },
  { id: "json", name: "JSON", icon: FolderOpen, description: "导入 JSON 数据" },
  { id: "api", name: "API", icon: Cloud, description: "连接 REST API" },
]

export function V1DataSourcesPage({ onNavigate }: DataSourcePageProps) {
  const [dataSources, setDataSources] = useState(mockDataSources)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSource, setNewSource] = useState({
    name: "",
    type: "postgresql",
    host: "",
    port: "5432",
    database: "",
    username: "",
  })

  // Toggle this to test empty state
  const hasDataSources = true

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
            <Check className="mr-1 h-3 w-3" />
            已连接
          </Badge>
        )
      case "error":
        return (
          <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
            <X className="mr-1 h-3 w-3" />
            连接失败
          </Badge>
        )
      default:
        return <Badge variant="secondary">未知</Badge>
    }
  }

  const handleAdd = () => {
    console.log("Add data source:", newSource)
    setShowAddForm(false)
  }

  const handleDelete = (id: string) => {
    setDataSources(dataSources.filter((ds) => ds.id !== id))
  }

  const handleTest = (id: string) => {
    console.log("Test connection:", id)
  }

  if (!hasDataSources) {
    return (
      <PageLayout currentPage="datasources" onNavigate={onNavigate}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Database className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                数据源管理
              </h1>
              <p className="text-sm text-muted-foreground">
                连接和管理您的数据源
              </p>
            </div>
          </div>
        </div>
        <EmptyState type="no-datasources" />
      </PageLayout>
    )
  }

  return (
    <PageLayout currentPage="datasources" onNavigate={onNavigate}>
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Database className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              数据源管理
            </h1>
            <p className="text-sm text-muted-foreground">
              连接和管理您的数据源
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{dataSources.length}</div>
                <div className="text-xs text-muted-foreground">数据源总数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Check className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {dataSources.filter((ds) => ds.status === "connected").length}
                </div>
                <div className="text-xs text-muted-foreground">已连接</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <X className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {dataSources.filter((ds) => ds.status === "error").length}
                </div>
                <div className="text-xs text-muted-foreground">连接失败</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <FolderOpen className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {dataSources.reduce((sum, ds) => sum + ds.tables, 0)}
                </div>
                <div className="text-xs text-muted-foreground">数据表总数</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Connect */}
      {!showAddForm && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">快速连接</CardTitle>
            <CardDescription>选择数据源类型开始连接</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickConnectTypes.map((type) => (
                <Card
                  key={type.id}
                  className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                  onClick={() => setShowAddForm(true)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <type.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{type.name}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Data Source Form */}
      {showAddForm && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle>添加新数据源</CardTitle>
            <CardDescription>填写数据库连接信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">名称</label>
                <Input
                  placeholder="My Database"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">类型</label>
                <div className="grid grid-cols-2 gap-2">
                  {sourceTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setNewSource({ ...newSource, type: type.id })}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all ${
                        newSource.type === type.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center justify-center">{type.icon}</div>
                      <span className="text-sm font-medium">{type.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">主机地址</label>
                <Input
                  placeholder="localhost"
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
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">数据库名</label>
              <Input
                placeholder="my_database"
                value={newSource.database}
                onChange={(e) => setNewSource({ ...newSource, database: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd}>
                <Check className="mr-2 h-4 w-4" />
                添加数据源
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Sources List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">已连接的数据源</h2>
        <div className="grid gap-4">
          {dataSources.map((dataSource) => (
            <Card
              key={dataSource.id}
              className="group overflow-hidden transition-all hover:shadow-md"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                      {dataSource.icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{dataSource.name}</h3>
                        {getStatusBadge(dataSource.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {dataSource.host} · {dataSource.tables} 个表 · {dataSource.size}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        上次连接: {dataSource.lastConnected}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleTest(dataSource.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(dataSource.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}
