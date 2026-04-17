import { useState } from "react"
import { PageLayout } from "../components/dashboard/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Search,
  Tag,
  Hash,
  Database,
  Table,
  Columnss,
} from "lucide-react"
import { EmptyState } from "../components/dashboard/empty-states"

interface DictionaryPageProps {
  onNavigate?: (page: string) => void
}

const mockMetrics = [
  {
    id: "1",
    name: "DAU",
    fullName: "Daily Active Users",
    description: "日活跃用户数",
    formula: "COUNT(DISTINCT user_id) WHERE activity_date = CURRENT_DATE",
    category: "用户指标",
    lastUpdated: "2天前",
    usage: 128,
  },
  {
    id: "2",
    name: "Retention Rate",
    fullName: "User Retention Rate",
    description: "用户留存比例",
    formula: "用户在N天后仍活跃的比例",
    category: "用户指标",
    lastUpdated: "1周前",
    usage: 85,
  },
  {
    id: "3",
    name: "GMV",
    fullName: "Gross Merchandise Value",
    description: "商品交易总额",
    formula: "SUM(order_amount) WHERE order_status = 'completed'",
    category: "业务指标",
    lastUpdated: "3天前",
    usage: 203,
  },
  {
    id: "4",
    name: "ARPU",
    fullName: "Average Revenue Per User",
    description: "每用户平均收入",
    formula: "total_revenue / active_users",
    category: "业务指标",
    lastUpdated: "5天前",
    usage: 67,
  },
]

const mockFields = [
  {
    table: "users",
    column: "user_id",
    description: "用户唯一标识",
    type: "INTEGER",
    nullable: false,
  },
  {
    table: "users",
    column: "created_at",
    description: "用户注册时间",
    type: "TIMESTAMP",
    nullable: false,
  },
  {
    table: "users",
    column: "email",
    description: "用户邮箱地址",
    type: "VARCHAR(255)",
    nullable: true,
  },
  {
    table: "orders",
    column: "order_id",
    description: "订单唯一标识",
    type: "INTEGER",
    nullable: false,
  },
  {
    table: "orders",
    column: "order_amount",
    description: "订单金额",
    type: "DECIMAL(10,2)",
    nullable: false,
  },
  {
    table: "orders",
    column: "order_status",
    description: "订单状态",
    type: "VARCHAR(20)",
    nullable: false,
  },
]

const categories = [
  { name: "用户指标", count: 2, color: "bg-blue-500/10 text-blue-500" },
  { name: "业务指标", count: 2, color: "bg-emerald-500/10 text-emerald-500" },
  { name: "产品指标", count: 0, color: "bg-violet-500/10 text-violet-500" },
]

export function V1DictionaryPage({ onNavigate }: DictionaryPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddMetric, setShowAddMetric] = useState(false)

  // Toggle this to test empty state
  const hasMetrics = true
  const hasFields = true

  const filteredMetrics = mockMetrics.filter((metric) =>
    metric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    metric.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    metric.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredFields = mockFields.filter((field) =>
    field.column.toLowerCase().includes(searchQuery.toLowerCase()) ||
    field.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    field.table.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!hasMetrics && !hasFields) {
    return (
      <PageLayout currentPage="dictionary" onNavigate={onNavigate}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <BookOpen className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                数据字典
              </h1>
              <p className="text-sm text-muted-foreground">
                管理业务指标和字段定义
              </p>
            </div>
          </div>
        </div>
        <EmptyState type="no-dictionary" />
      </PageLayout>
    )
  }

  return (
    <PageLayout currentPage="dictionary" onNavigate={onNavigate}>
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <BookOpen className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              数据字典
            </h1>
            <p className="text-sm text-muted-foreground">
              管理业务指标和字段定义
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Hash className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{mockMetrics.length}</div>
                <div className="text-xs text-muted-foreground">业务指标</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Columns className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{mockFields.length}</div>
                <div className="text-xs text-muted-foreground">字段定义</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Database className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {new Set(mockFields.map((f) => f.table)).size}
                </div>
                <div className="text-xs text-muted-foreground">数据表</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索指标、字段或表名..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Badge
            key={cat.name}
            variant="outline"
            className={`${cat.color} border-transparent`}
          >
            {cat.name} ({cat.count})
          </Badge>
        ))}
        <Button variant="outline" size="sm" className="h-7 gap-1">
          <Plus className="h-3 w-3" />
          新建分类
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics" className="gap-2">
            <Hash className="h-4 w-4" />
            业务指标 ({mockMetrics.length})
          </TabsTrigger>
          <TabsTrigger value="fields" className="gap-2">
            <Tag className="h-4 w-4" />
            字段定义 ({mockFields.length})
          </TabsTrigger>
        </TabsList>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">业务指标</h2>
            <Button size="sm" onClick={() => setShowAddMetric(true)}>
              <Plus className="mr-2 h-4 w-4" />
              添加指标
            </Button>
          </div>
          <div className="grid gap-4">
            {filteredMetrics.map((metric) => (
              <Card key={metric.id} className="group overflow-hidden transition-all hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{metric.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {metric.category}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {metric.fullName}
                      </CardDescription>
                      <p className="text-sm text-muted-foreground">{metric.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground mb-1">计算公式</p>
                    <code className="text-sm text-foreground break-all">{metric.formula}</code>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>使用 {metric.usage} 次</span>
                    <span>·</span>
                    <span>更新于 {metric.lastUpdated}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Fields Tab */}
        <TabsContent value="fields" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">字段定义</h2>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              添加字段
            </Button>
          </div>

          {/* Group by table */}
          {Array.from(new Set(filteredFields.map((f) => f.table))).map((tableName) => (
            <Card key={tableName}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{tableName}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {filteredFields.filter((f) => f.table === tableName).length} 个字段
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {filteredFields
                    .filter((f) => f.table === tableName)
                    .map((field, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/20"
                      >
                        <div className="flex items-center gap-3">
                          <Columns className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-foreground">{field.column}</div>
                            <div className="text-xs text-muted-foreground">{field.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {field.type}
                          </code>
                          {!field.nullable && (
                            <Badge variant="secondary" className="text-xs">NOT NULL</Badge>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
