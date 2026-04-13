"use client"

import { useState } from "react"
import { PageLayout } from "@/components/dashboard/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  Search,
  ChevronRight,
  Table2,
  Key,
  Hash,
  Calendar,
  Type,
  ToggleLeft,
} from "lucide-react"

const tables = [
  {
    name: "users",
    description: "用户基础信息表",
    columns: 12,
    records: "156K",
    lastUpdated: "10 分钟前",
  },
  {
    name: "orders",
    description: "订单交易记录表",
    columns: 18,
    records: "1.2M",
    lastUpdated: "5 分钟前",
  },
  {
    name: "products",
    description: "商品信息表",
    columns: 15,
    records: "8.5K",
    lastUpdated: "1 小时前",
  },
  {
    name: "events",
    description: "用户行为事件表",
    columns: 10,
    records: "5.6M",
    lastUpdated: "实时",
  },
]

const selectedTableColumns = [
  { name: "id", type: "UUID", isPrimary: true, nullable: false, description: "用户唯一标识" },
  { name: "email", type: "VARCHAR(255)", isPrimary: false, nullable: false, description: "用户邮箱地址" },
  { name: "name", type: "VARCHAR(100)", isPrimary: false, nullable: true, description: "用户姓名" },
  { name: "created_at", type: "TIMESTAMP", isPrimary: false, nullable: false, description: "创建时间" },
  { name: "updated_at", type: "TIMESTAMP", isPrimary: false, nullable: false, description: "更新时间" },
  { name: "is_active", type: "BOOLEAN", isPrimary: false, nullable: false, description: "是否激活" },
  { name: "subscription_tier", type: "VARCHAR(20)", isPrimary: false, nullable: true, description: "订阅等级" },
  { name: "last_login_at", type: "TIMESTAMP", isPrimary: false, nullable: true, description: "最后登录时间" },
]

function TypeIcon({ type }: { type: string }) {
  if (type.includes("UUID") || type.includes("VARCHAR")) return <Type className="h-4 w-4" />
  if (type.includes("INT") || type.includes("NUMERIC")) return <Hash className="h-4 w-4" />
  if (type.includes("TIMESTAMP") || type.includes("DATE")) return <Calendar className="h-4 w-4" />
  if (type.includes("BOOLEAN")) return <ToggleLeft className="h-4 w-4" />
  return <Type className="h-4 w-4" />
}

export default function DictionaryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTable, setSelectedTable] = useState("users")

  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    table.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          数据字典
        </h1>
        <p className="text-sm text-muted-foreground">
          浏览和了解你的数据结构
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索表名或描述..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tables List */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">数据表</h2>
          <div className="space-y-2">
            {filteredTables.map((table) => (
              <Card
                key={table.name}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  selectedTable === table.name ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => setSelectedTable(table.name)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      <Table2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{table.name}</div>
                      <div className="text-xs text-muted-foreground">{table.description}</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Table Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Table2 className="h-5 w-5 text-primary" />
                    {selectedTable}
                  </CardTitle>
                  <CardDescription>
                    {tables.find((t) => t.name === selectedTable)?.description}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {tables.find((t) => t.name === selectedTable)?.columns} 列
                  </Badge>
                  <Badge variant="secondary">
                    {tables.find((t) => t.name === selectedTable)?.records} 行
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 text-sm font-medium text-muted-foreground">字段名</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">类型</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">属性</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">描述</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTableColumns.map((column) => (
                      <tr key={column.name} className="border-b border-border/50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <TypeIcon type={column.type} />
                            <span className="font-mono text-sm text-foreground">{column.name}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <code className="rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">
                            {column.type}
                          </code>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            {column.isPrimary && (
                              <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-500 border-amber-500/20">
                                <Key className="h-3 w-3" />
                                PK
                              </Badge>
                            )}
                            {!column.nullable && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                                NOT NULL
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="text-sm text-muted-foreground">{column.description}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}
