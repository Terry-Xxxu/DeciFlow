import React, { useState, useEffect } from "react"
import { PageLayout } from "../components/v0-layout/PageLayout"
import { Card, CardContent, CardHeader } from "../components/v0-ui/Card"
import { Button } from "../components/v0-ui/Button"
import { Input } from "../components/v0-ui/Input"
import { Badge } from "../components/v0-ui/Badge"
import {
  Plus, Edit, Trash2, Search, TrendingUp, Database, RefreshCw,
  ChevronRight, Check, AlertCircle, X, Zap, BookOpen, Sparkles,
  Info, Table2, Loader2, Settings2,
} from "lucide-react"
import { cn } from "../lib/utils"
import { showToast } from "../lib/download"
import {
  getDatabaseMetadata,
  saveDatabaseMetadata,
  updateTableMetadata,
  updateFieldMetadata,
  scanDatabaseStructure,
  type TableMetadata,
  type FieldMetadata,
} from "../stores/MetadataStore"
import { useDatabase } from "../stores/DatabaseStore"
import { useAnalysisTemplates } from "../stores/AnalysisTemplateStore"

// ─── Built-in metrics library ────────────────────────────────────────────────

interface BuiltInMetric {
  id: string
  name: string
  abbreviation?: string
  description: string
  category: string
  formula: string
  requiredFieldAliases: Record<string, string[]>
}

const BUILTIN_METRICS: BuiltInMetric[] = [
  // 用户活跃
  { id: "dau", name: "日活跃用户数", abbreviation: "DAU", description: "每日访问或使用产品的独立用户数", category: "用户指标", formula: "COUNT(DISTINCT user_id) WHERE date = today", requiredFieldAliases: { "用户ID": ["user_id", "userid", "uid", "member_id", "account_id", "user"], "活动日期": ["date", "activity_date", "login_date", "active_date", "log_date", "event_date"] } },
  { id: "mau", name: "月活跃用户数", abbreviation: "MAU", description: "每月独立访问用户数", category: "用户指标", formula: "COUNT(DISTINCT user_id) per month", requiredFieldAliases: { "用户ID": ["user_id", "userid", "uid", "member_id"], "活动日期": ["date", "activity_date", "login_date", "active_date"] } },
  { id: "wau", name: "周活跃用户数", abbreviation: "WAU", description: "每周独立访问用户数", category: "用户指标", formula: "COUNT(DISTINCT user_id) per week", requiredFieldAliases: { "用户ID": ["user_id", "userid", "uid", "member_id"], "活动日期": ["date", "activity_date", "login_date"] } },
  { id: "new_users", name: "新增用户数", description: "新注册用户数量", category: "用户指标", formula: "COUNT(*) WHERE created_at >= period_start", requiredFieldAliases: { "注册时间": ["created_at", "register_time", "signup_at", "join_date", "created_date", "reg_time"] } },
  { id: "retention_d1", name: "次日留存率", description: "D0 注册用户在 D1 回访的比例", category: "用户指标", formula: "D1 回访用户数 / D0 注册用户数 × 100%", requiredFieldAliases: { "用户ID": ["user_id", "userid", "uid"], "注册时间": ["created_at", "register_time", "signup_at"], "活动日期": ["date", "activity_date", "login_date"] } },
  { id: "retention_d7", name: "7日留存率", description: "注册用户在第 7 天仍然活跃的比例", category: "用户指标", formula: "D7 活跃用户数 / 注册用户数 × 100%", requiredFieldAliases: { "用户ID": ["user_id", "userid", "uid"], "注册时间": ["created_at", "register_time", "signup_at"], "活动日期": ["date", "activity_date", "login_date"] } },
  { id: "churn_rate", name: "用户流失率", description: "停止使用产品的用户占比", category: "用户指标", formula: "流失用户数 / 期初用户数 × 100%", requiredFieldAliases: { "用户ID": ["user_id", "userid", "uid"], "最后活跃": ["last_active_at", "last_login_at", "last_seen_at", "last_activity_date", "last_visit_at"] } },

  // 增长获客
  { id: "cac", name: "客户获取成本", abbreviation: "CAC", description: "获取一个新用户的平均成本", category: "增长指标", formula: "总营销费用 / 新增用户数", requiredFieldAliases: { "营销费用": ["cost", "ad_spend", "marketing_cost", "spend", "campaign_cost"], "用户ID": ["user_id", "customer_id", "uid"] } },
  { id: "cvr", name: "转化率", abbreviation: "CVR", description: "完成目标行为的访客占比", category: "增长指标", formula: "转化用户数 / 访客总数 × 100%", requiredFieldAliases: { "用户ID": ["user_id", "visitor_id", "session_id"], "转化标记": ["converted", "is_converted", "conversion_flag", "paid", "is_paid"] } },
  { id: "activation_rate", name: "激活率", description: "完成首次核心行为的新用户占比", category: "增长指标", formula: "已激活用户数 / 新增用户数 × 100%", requiredFieldAliases: { "激活标记": ["activated", "is_activated", "first_action_at", "onboarded"] } },

  // 营收财务
  { id: "gmv", name: "商品交易总额", abbreviation: "GMV", description: "一段时间内订单总金额（含退款）", category: "营收指标", formula: "SUM(order_amount)", requiredFieldAliases: { "订单金额": ["amount", "order_amount", "total_amount", "price", "gmv", "revenue", "pay_amount"] } },
  { id: "revenue", name: "实际收入", description: "扣除退款后的净收入", category: "营收指标", formula: "SUM(amount) WHERE status = 'completed'", requiredFieldAliases: { "订单金额": ["amount", "order_amount", "total_amount", "revenue", "pay_amount"], "订单状态": ["status", "order_status", "payment_status"] } },
  { id: "arr", name: "年度经常性收入", abbreviation: "ARR", description: "年度化的订阅收入总额", category: "营收指标", formula: "MRR × 12", requiredFieldAliases: { "订阅金额": ["subscription_amount", "plan_price", "monthly_fee", "amount", "subscription_fee"] } },
  { id: "mrr", name: "月度经常性收入", abbreviation: "MRR", description: "当月订阅收入总额", category: "营收指标", formula: "SUM(monthly_subscription_fee)", requiredFieldAliases: { "订阅金额": ["subscription_amount", "plan_price", "monthly_fee", "amount", "subscription_fee"] } },
  { id: "arpu", name: "每用户平均收入", abbreviation: "ARPU", description: "平均每个活跃用户产生的收入", category: "营收指标", formula: "总收入 / 活跃用户数", requiredFieldAliases: { "用户ID": ["user_id", "userid", "uid"], "金额": ["amount", "revenue", "order_amount", "pay_amount"] } },
  { id: "ltv", name: "用户生命周期价值", abbreviation: "LTV", description: "用户整个生命周期内产生的总价值", category: "营收指标", formula: "ARPU × 平均生命周期（月）", requiredFieldAliases: { "用户ID": ["user_id", "userid", "uid"], "金额": ["amount", "revenue", "order_amount"] } },
  { id: "aov", name: "平均订单价值", abbreviation: "AOV", description: "每笔订单的平均金额", category: "营收指标", formula: "GMV / 订单总数", requiredFieldAliases: { "订单金额": ["amount", "order_amount", "total_amount", "pay_amount"] } },

  // 运营指标
  { id: "pv", name: "页面浏览量", abbreviation: "PV", description: "页面被访问的总次数", category: "运营指标", formula: "COUNT(*) FROM page_views", requiredFieldAliases: { "页面": ["page", "url", "path", "page_url", "page_path", "page_name"] } },
  { id: "uv", name: "独立访客数", abbreviation: "UV", description: "独立访问的用户或设备数", category: "运营指标", formula: "COUNT(DISTINCT user_id)", requiredFieldAliases: { "用户ID": ["user_id", "visitor_id", "device_id", "uid", "cookie_id"] } },
  { id: "order_count", name: "订单数", description: "一段时间内的订单总数", category: "运营指标", formula: "COUNT(*) FROM orders", requiredFieldAliases: { "订单ID": ["id", "order_id", "order_no", "order_number"] } },
  { id: "avg_session", name: "平均会话时长", description: "用户平均每次访问的时长", category: "运营指标", formula: "AVG(session_duration)", requiredFieldAliases: { "会话时长": ["session_duration", "duration", "time_on_site", "visit_duration"] } },
]

// ─── Saved metric type ────────────────────────────────────────────────────────

interface SavedMetric {
  id: string
  name: string
  description: string
  formula: string
  category: string
  isBuiltIn: boolean
  builtInId?: string
}

// ─── Batch adapt types ────────────────────────────────────────────────────────

type MatchStatus = "matched" | "uncertain" | "not_found"

interface FieldMatchResult {
  role: string
  possibleFields: string[]
  selectedField: string
  status: "found" | "multiple" | "missing"
}

interface MetricMatchResult {
  metric: BuiltInMetric
  status: MatchStatus
  fieldMatches: Record<string, FieldMatchResult>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METRICS_STORAGE_KEY = "deciflow_metrics_v2"

interface V0Props {
  onNavigate?: (page: string) => void
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function V0DictionaryPage({ onNavigate }: V0Props) {
  const { databases, updateDatabase } = useDatabase()
  const { unconfirmedSourceIds, markSourceConfirmed } = useAnalysisTemplates()
  const [activeTab, setActiveTab] = useState<"fields" | "metrics">("fields")

  // ── Fields tab ──
  const [selectedDatabaseId, setSelectedDatabaseId] = useState("")
  const [tables, setTables] = useState<TableMetadata[]>([])
  const [scanning, setScanning] = useState(false)
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
  const [fieldSearch, setFieldSearch] = useState("")

  // ── Metrics tab ──
  const [metrics, setMetrics] = useState<SavedMetric[]>([])
  const [metricSearch, setMetricSearch] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showBatchAdaptDialog, setShowBatchAdaptDialog] = useState(false)
  const [aiConfigured, setAiConfigured] = useState(false)

  // Load saved metrics
  useEffect(() => {
    try {
      const saved = localStorage.getItem(METRICS_STORAGE_KEY)
      if (saved) setMetrics(JSON.parse(saved))
    } catch {}
  }, [])

  // Check AI config
  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api) return
    api.store.get("ai_config").then((config: any) => {
      setAiConfigured(!!(config?.apiKey))
    }).catch(() => {})
  }, [])

  // Load DB metadata when selected
  useEffect(() => {
    if (selectedDatabaseId) {
      const meta = getDatabaseMetadata(selectedDatabaseId)
      setTables(meta ? meta.tables : [])
    } else {
      setTables([])
    }
  }, [selectedDatabaseId])

  const saveMetrics = (m: SavedMetric[]) => {
    setMetrics(m)
    localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(m))
  }

  // ── Scan handler ──
  const handleScan = async () => {
    if (!selectedDatabaseId) return
    const db = databases.find(d => d.id === selectedDatabaseId)
    if (!db) return

    setScanning(true)
    try {
      const scanned = await scanDatabaseStructure(selectedDatabaseId, db)
      if (scanned.length === 0) {
        showToast("未扫描到表（请在 Electron 应用中运行，或检查数据库连接）", "error")
      } else {
        // Merge with existing display names so we don't overwrite user config
        const existing = getDatabaseMetadata(selectedDatabaseId)
        if (existing) {
          scanned.forEach(t => {
            const prev = existing.tables.find(x => x.name === t.name)
            if (prev) {
              t.displayName = prev.displayName
              t.configured = prev.configured
              t.fields.forEach(f => {
                const pf = prev.fields.find(x => x.name === f.name)
                if (pf) { f.displayName = pf.displayName; f.description = pf.description }
              })
            }
          })
        }
        saveDatabaseMetadata(selectedDatabaseId, { databaseId: selectedDatabaseId, tables: scanned, lastScanned: Date.now() })
        setTables(scanned)
        showToast(`扫描完成，发现 ${scanned.length} 张表`, "success")
      }
    } catch {
      showToast("扫描失败，请检查数据库连接", "error")
    } finally {
      setScanning(false)
    }
  }

  const toggleTable = (name: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const handleUpdateTableDisplayName = (tableName: string, displayName: string) => {
    if (!selectedDatabaseId) return
    updateTableMetadata(selectedDatabaseId, tableName, { displayName })
    const meta = getDatabaseMetadata(selectedDatabaseId)
    if (meta) setTables([...meta.tables])
  }

  const handleUpdateFieldMeta = (tableName: string, fieldName: string, updates: Partial<FieldMetadata>) => {
    if (!selectedDatabaseId) return
    updateFieldMetadata(selectedDatabaseId, tableName, fieldName, updates)
    const meta = getDatabaseMetadata(selectedDatabaseId)
    if (meta) setTables([...meta.tables])
  }

  const handleAddMetrics = (newMetrics: SavedMetric[]) => {
    const updated = [...metrics]
    newMetrics.forEach(m => { if (!updated.find(x => x.id === m.id)) updated.push(m) })
    saveMetrics(updated)
    showToast(`已添加 ${newMetrics.length} 个指标`, "success")
  }

  const handleDeleteMetric = (id: string) => {
    saveMetrics(metrics.filter(m => m.id !== id))
    showToast("指标已删除", "success")
  }

  // All fields across tables for batch adapt
  const allFields = tables.flatMap(t => t.fields.map(f => ({ ...f, tableName: t.name })))

  // Filtered for search
  const filteredTables = fieldSearch
    ? tables.map(t => ({
        ...t,
        fields: t.fields.filter(f =>
          f.name.toLowerCase().includes(fieldSearch.toLowerCase()) ||
          (f.displayName || '').toLowerCase().includes(fieldSearch.toLowerCase())
        )
      })).filter(t => t.fields.length > 0)
    : tables

  const filteredMetrics = metrics.filter(m => {
    const q = metricSearch.toLowerCase()
    return !q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
  })

  const metricsByCategory = filteredMetrics.reduce<Record<string, SavedMetric[]>>((acc, m) => {
    if (!acc[m.category]) acc[m.category] = []
    acc[m.category].push(m)
    return acc
  }, {})

  return (
    <PageLayout activeItem="dictionary" onNavigate={onNavigate}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">数据字典</h1>
          <p className="text-sm text-muted-foreground mt-1">
            字段配置让 AI 读懂你的数据库；业务指标让 AI 精准回答业务问题
          </p>
        </div>
        {activeTab === "metrics" && (
          <div className="flex gap-2 shrink-0">
            {tables.length > 0 && (
              <Button variant="outline" className="gap-2" onClick={() => setShowBatchAdaptDialog(true)}>
                <Zap className="h-4 w-4" />
                一键适配
              </Button>
            )}
            <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4" />
              添加指标
            </Button>
          </div>
        )}
      </div>

      {/* 待确认数据表横幅 */}
      {unconfirmedSourceIds.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                以下数据表由 AI 自动识别，建议确认字段含义后再做分析
              </p>
              <div className="mt-3 space-y-2">
                {unconfirmedSourceIds.map(sourceId => {
                  const db = databases.find(d => d.id === sourceId)
                  if (!db) return null
                  return (
                    <div
                      key={sourceId}
                      className="flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground">{db.name}</span>
                        {db.schemaInfo && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            AI 识别为：{db.schemaInfo.tableType}
                            （{Math.round(db.schemaInfo.confidence * 100)}% 置信度）
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          updateDatabase(sourceId, { schemaConfirmed: true })
                          markSourceConfirmed(sourceId)
                        }}
                        className="ml-3 shrink-0 flex items-center gap-1 rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/30 dark:text-amber-400"
                      >
                        <Check className="h-3 w-3" />
                        确认无误
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: "fields", icon: Table2, label: "字段配置" },
          { id: "metrics", icon: TrendingUp, label: "业务指标" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "fields" | "metrics")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: 字段配置 ── */}
      {activeTab === "fields" && (
        <div className="space-y-4">
          {/* DB selector + scan */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Database className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <select
                    value={selectedDatabaseId}
                    onChange={e => setSelectedDatabaseId(e.target.value)}
                    className="flex-1 max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
                  >
                    <option value="">选择要配置的数据库…</option>
                    {databases.map(db => (
                      <option key={db.id} value={db.id}>{db.name}</option>
                    ))}
                  </select>
                  {selectedDatabaseId && tables.length > 0 && (
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      {tables.filter(t => t.configured).length}/{tables.length} 张表已配置
                    </span>
                  )}
                </div>
                <Button onClick={handleScan} disabled={!selectedDatabaseId || scanning} className="gap-2 shrink-0">
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {scanning ? "扫描中…" : "扫描表结构"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Field search */}
          {tables.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索字段名或中文名…"
                className="pl-10"
                value={fieldSearch}
                onChange={e => setFieldSearch(e.target.value)}
              />
            </div>
          )}

          {/* Empty states */}
          {databases.length === 0 ? (
            <EmptyState
              icon={Database}
              title="尚未连接数据库"
              desc="请先在「数据源」页面添加数据库连接"
              action={<Button variant="outline" className="gap-2" onClick={() => onNavigate?.("datasources")}><Database className="h-4 w-4" />前往数据源</Button>}
            />
          ) : !selectedDatabaseId ? (
            <EmptyState icon={Settings2} title="选择数据库开始配置" desc="配置字段中文名后，AI 查询将更加精准" />
          ) : tables.length === 0 ? (
            <EmptyState icon={RefreshCw} title="点击「扫描表结构」获取数据库信息" desc="自动读取所有表和字段，然后为它们配置中文名" />
          ) : (
            <div className="space-y-3">
              {filteredTables.map(table => {
                const isExpanded = expandedTables.has(table.name)
                const configuredCount = table.fields.filter(f => f.displayName).length
                return (
                  <Card key={table.name} className={cn("transition-all duration-200", table.configured && "border-green-500/30 dark:border-green-400/20")}>
                    {/* Table header */}
                    <div className="flex cursor-pointer items-center gap-4 p-4 select-none" onClick={() => toggleTable(table.name)}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Table2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-semibold font-mono text-foreground">{table.name}</span>
                          {table.displayName && <span className="text-sm text-muted-foreground">· {table.displayName}</span>}
                          {table.configured ? (
                            <Badge className="gap-1 text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/10">
                              <Check className="h-3 w-3" />已配置
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30">
                              <AlertCircle className="h-3 w-3" />待配置
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {table.fields.length} 个字段 · 已配置中文名 {configuredCount} 个
                        </p>
                      </div>
                      <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-90")} />
                    </div>

                    {/* Expanded: field list */}
                    {isExpanded && (
                      <div className="border-t border-border px-4 pb-4 pt-4 space-y-4">
                        {/* Table display name row */}
                        <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-4 py-3">
                          <span className="w-24 shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider">表中文名</span>
                          <Input
                            value={table.displayName}
                            onChange={e => handleUpdateTableDisplayName(table.name, e.target.value)}
                            placeholder="输入此表的中文名，例如：用户表"
                            className="flex-1 h-8 bg-background"
                          />
                        </div>

                        {table.fields.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">无字段信息（可能是权限不足或不支持的数据库类型）</p>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">字段列表</p>
                            {table.fields.map(field => (
                              <FieldRow
                                key={field.name}
                                field={field}
                                onUpdate={updates => handleUpdateFieldMeta(table.name, field.name, updates)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: 业务指标 ── */}
      {activeTab === "metrics" && (
        <div className="space-y-4">
          {/* AI mode notice */}
          {aiConfigured ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">AI 增强模式：一键适配将使用语义理解进行字段匹配</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
              <Info className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">
                基础模式：一键适配使用字段名规则匹配。
                配置 AI 可获得更精准的语义匹配。
              </span>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="搜索业务指标…" className="pl-10" value={metricSearch} onChange={e => setMetricSearch(e.target.value)} />
          </div>

          {/* Metrics list */}
          {metrics.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="还没有业务指标"
              desc="添加 DAU、GMV 等 KPI，AI 将在回答问题时自动引用正确的计算逻辑"
              action={
                <div className="flex gap-3">
                  {tables.length > 0 && (
                    <Button variant="outline" className="gap-2" onClick={() => setShowBatchAdaptDialog(true)}>
                      <Zap className="h-4 w-4" />一键适配
                    </Button>
                  )}
                  <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4" />从指标库添加
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="space-y-6">
              {Object.entries(metricsByCategory).map(([category, items]) => (
                <div key={category}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {items.map(metric => (
                      <Card key={metric.id} className="group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">{metric.name}</span>
                                {metric.isBuiltIn && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <BookOpen className="h-3 w-3" />内置
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{metric.description}</p>
                              {metric.formula && (
                                <div className="mt-2 rounded bg-muted/50 px-2.5 py-1.5">
                                  <code className="text-xs text-muted-foreground">{metric.formula}</code>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteMetric(metric.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      {showAddDialog && (
        <AddMetricDialog
          existingMetrics={metrics}
          onAdd={newMetrics => { handleAddMetrics(newMetrics); setShowAddDialog(false) }}
          onClose={() => setShowAddDialog(false)}
        />
      )}
      {showBatchAdaptDialog && (
        <BatchAdaptDialog
          tables={tables}
          allFields={allFields}
          aiConfigured={aiConfigured}
          existingMetrics={metrics}
          onAdd={newMetrics => { handleAddMetrics(newMetrics); setShowBatchAdaptDialog(false) }}
          onClose={() => setShowBatchAdaptDialog(false)}
        />
      )}
    </PageLayout>
  )
}

// ─── Empty state helper ───────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, desc, action }: {
  icon: React.FC<any>
  title: string
  desc?: string
  action?: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-16 text-center">
        <Icon className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="font-medium text-foreground">{title}</p>
        {desc && <p className="text-sm text-muted-foreground mt-1 max-w-xs">{desc}</p>}
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  )
}

// ─── Field row (inline editable) ─────────────────────────────────────────────

function FieldRow({ field, onUpdate }: { field: FieldMetadata; onUpdate: (u: Partial<FieldMetadata>) => void }) {
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(field.displayName)
  const [description, setDescription] = useState(field.description || "")

  useEffect(() => {
    setDisplayName(field.displayName)
    setDescription(field.description || "")
  }, [field.displayName, field.description])

  const handleSave = () => {
    onUpdate({ displayName, description })
    setEditing(false)
  }

  return (
    <div className={cn(
      "group rounded-lg border px-3 py-2.5 transition-colors",
      editing ? "border-border bg-background" : "border-transparent bg-muted/30 hover:bg-muted/50"
    )}>
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <code className="w-28 shrink-0 truncate text-center text-xs rounded bg-muted px-2 py-1 text-muted-foreground">
          {field.type}
        </code>
        {field.isPrimaryKey && (
          <Badge variant="outline" className="shrink-0 text-xs text-amber-600 border-amber-500/30 px-1.5">PK</Badge>
        )}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-mono text-foreground">{field.name}</span>
          {!editing && field.displayName && <span className="ml-2 text-xs text-muted-foreground">→ {field.displayName}</span>}
          {!editing && field.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{field.description}</p>}
        </div>
        {editing ? (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="中文名" className="w-28 h-7 text-xs" onKeyDown={e => e.key === "Enter" && handleSave()} />
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="描述（可选）" className="w-40 h-7 text-xs" onKeyDown={e => e.key === "Enter" && handleSave()} />
            <Button size="icon" className="h-7 w-7 shrink-0" onClick={handleSave}><Check className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            {field.displayName
              ? <Check className="h-4 w-4 text-green-500" />
              : <AlertCircle className="h-4 w-4 text-muted-foreground/30" />}
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => setEditing(true)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Add metric dialog ────────────────────────────────────────────────────────

function AddMetricDialog({ existingMetrics, onAdd, onClose }: {
  existingMetrics: SavedMetric[]
  onAdd: (metrics: SavedMetric[]) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<"library" | "custom">("library")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Custom form
  const [customName, setCustomName] = useState("")
  const [customDesc, setCustomDesc] = useState("")
  const [customFormula, setCustomFormula] = useState("")
  const [customCategory, setCustomCategory] = useState("业务指标")

  const existingBuiltInIds = new Set(existingMetrics.map(m => m.builtInId).filter(Boolean))
  const categories = ["all", ...Array.from(new Set(BUILTIN_METRICS.map(m => m.category)))]
  const filteredLibrary = categoryFilter === "all" ? BUILTIN_METRICS : BUILTIN_METRICS.filter(m => m.category === categoryFilter)

  const handleToggle = (id: string) => {
    if (existingBuiltInIds.has(id)) return
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleAddFromLibrary = () => {
    const toAdd: SavedMetric[] = Array.from(selected).map(id => {
      const bm = BUILTIN_METRICS.find(m => m.id === id)!
      return {
        id: `builtin_${id}_${Date.now()}`,
        name: bm.abbreviation ? `${bm.abbreviation} · ${bm.name}` : bm.name,
        description: bm.description,
        formula: bm.formula,
        category: bm.category,
        isBuiltIn: true,
        builtInId: bm.id,
      }
    })
    onAdd(toAdd)
  }

  const handleAddCustom = () => {
    if (!customName || !customDesc) return
    onAdd([{
      id: Date.now().toString(),
      name: customName,
      description: customDesc,
      formula: customFormula,
      category: customCategory,
      isBuiltIn: false,
    }])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardHeader className="pb-0 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">添加业务指标</h2>
              <p className="text-sm text-muted-foreground mt-0.5">从内置指标库选择，或自定义新指标</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <div className="flex border-b border-border mt-4">
            {[{ id: "library", label: "指标库", icon: BookOpen }, { id: "custom", label: "自定义", icon: Plus }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className={cn("flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors", tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <t.icon className="h-3.5 w-3.5" />{t.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto pt-4">
          {tab === "library" && (
            <div className="space-y-4">
              {/* Category chips */}
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setCategoryFilter(cat)} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", categoryFilter === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                    {cat === "all" ? "全部" : cat}
                  </button>
                ))}
              </div>

              {/* Metrics grid */}
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredLibrary.map(metric => {
                  const isSelected = selected.has(metric.id)
                  const isAdded = existingBuiltInIds.has(metric.id)
                  return (
                    <button
                      key={metric.id}
                      onClick={() => handleToggle(metric.id)}
                      disabled={isAdded}
                      className={cn(
                        "text-left rounded-lg border p-3 transition-all",
                        isAdded ? "opacity-40 cursor-not-allowed border-border bg-muted/30"
                          : isSelected ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {metric.abbreviation && <span className="font-bold text-foreground">{metric.abbreviation}</span>}
                            <span className={cn("text-sm", metric.abbreviation ? "text-muted-foreground" : "font-medium text-foreground")}>{metric.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{metric.description}</p>
                        </div>
                        <div className={cn("h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors", isAdded ? "border-muted-foreground/30" : isSelected ? "border-primary bg-primary" : "border-muted-foreground/30")}>
                          {(isSelected || isAdded) && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {tab === "custom" && (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <label className="text-sm font-medium">指标名称 *</label>
                <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="例如：付费用户比例" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">指标分类</label>
                <select value={customCategory} onChange={e => setCustomCategory(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {["用户指标", "营收指标", "增长指标", "运营指标", "业务指标"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">指标描述 *</label>
                <Input value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="这个指标代表什么含义？" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">计算方式 <span className="text-muted-foreground text-xs font-normal">（支持自然语言或 SQL 片段）</span></label>
                <textarea
                  value={customFormula}
                  onChange={e => setCustomFormula(e.target.value)}
                  placeholder="例如：活跃用户中已付费用户的比例，即 COUNT(DISTINCT paid_user_id) / COUNT(DISTINCT user_id)"
                  className="w-full min-h-[100px] rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
          )}
        </CardContent>

        <div className="flex justify-end gap-3 border-t border-border p-4 shrink-0">
          <Button variant="outline" onClick={onClose}>取消</Button>
          {tab === "library" ? (
            <Button onClick={handleAddFromLibrary} disabled={selected.size === 0} className="gap-2">
              <Plus className="h-4 w-4" />添加 {selected.size > 0 ? `${selected.size} 个` : ""}指标
            </Button>
          ) : (
            <Button onClick={handleAddCustom} disabled={!customName || !customDesc} className="gap-2">
              <Plus className="h-4 w-4" />创建指标
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

// ─── Batch adapt dialog ───────────────────────────────────────────────────────

function BatchAdaptDialog({ tables, allFields, aiConfigured, existingMetrics, onAdd, onClose }: {
  tables: TableMetadata[]
  allFields: Array<FieldMetadata & { tableName: string }>
  aiConfigured: boolean
  existingMetrics: SavedMetric[]
  onAdd: (metrics: SavedMetric[]) => void
  onClose: () => void
}) {
  const existingBuiltInIds = new Set(existingMetrics.map(m => m.builtInId).filter(Boolean))
  const [matchResults, setMatchResults] = useState<MetricMatchResult[]>([])
  const [adapting, setAdapting] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [fieldOverrides, setFieldOverrides] = useState<Record<string, Record<string, string>>>({})

  useEffect(() => {
    // Rule-based matching (works without AI)
    setTimeout(() => {
      const results: MetricMatchResult[] = BUILTIN_METRICS
        .filter(m => !existingBuiltInIds.has(m.id))
        .map(metric => {
          const fieldMatches: Record<string, FieldMatchResult> = {}

          for (const [role, aliases] of Object.entries(metric.requiredFieldAliases)) {
            const matched = allFields.filter(f => aliases.some(a => f.name.toLowerCase() === a.toLowerCase()))
            fieldMatches[role] = {
              role,
              possibleFields: matched.map(f => `${f.tableName}.${f.name}`),
              selectedField: matched.length > 0 ? `${matched[0].tableName}.${matched[0].name}` : "",
              status: matched.length === 0 ? "missing" : matched.length === 1 ? "found" : "multiple",
            }
          }

          const statuses = Object.values(fieldMatches).map(f => f.status)
          const overallStatus: MatchStatus =
            statuses.every(s => s === "missing") ? "not_found"
            : statuses.some(s => s === "missing" || s === "multiple") ? "uncertain"
            : "matched"

          return { metric, status: overallStatus, fieldMatches }
        })

      setMatchResults(results)
      setSelected(new Set(results.filter(r => r.status === "matched").map(r => r.metric.id)))
      setAdapting(false)
    }, 600)
  }, [])

  const matched = matchResults.filter(r => r.status === "matched")
  const uncertain = matchResults.filter(r => r.status === "uncertain")
  const notFound = matchResults.filter(r => r.status === "not_found")

  const toggleMetric = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleConfirm = () => {
    const toAdd: SavedMetric[] = Array.from(selected).map(id => {
      const r = matchResults.find(x => x.metric.id === id)!
      const bm = r.metric
      return {
        id: `builtin_${bm.id}_${Date.now()}`,
        name: bm.abbreviation ? `${bm.abbreviation} · ${bm.name}` : bm.name,
        description: bm.description,
        formula: bm.formula,
        category: bm.category,
        isBuiltIn: true,
        builtInId: bm.id,
      }
    })
    onAdd(toAdd)
  }

  const SelectableRow = ({ result, accent }: { result: MetricMatchResult; accent?: string }) => {
    const isSelected = selected.has(result.metric.id)
    return (
      <div
        onClick={() => toggleMetric(result.metric.id)}
        className={cn(
          "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all",
          isSelected
            ? accent === "amber" ? "border-amber-500/50 bg-amber-500/5" : "border-green-500/50 bg-green-500/5"
            : "border-border bg-muted/20"
        )}
      >
        <div className={cn("mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
          isSelected
            ? accent === "amber" ? "border-amber-500 bg-amber-500" : "border-green-500 bg-green-500"
            : "border-muted-foreground/30"
        )}>
          {isSelected && <Check className="h-3 w-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground">
            {result.metric.abbreviation ? `${result.metric.abbreviation} · ` : ""}{result.metric.name}
          </span>
          <p className="text-xs text-muted-foreground truncate">{result.metric.description}</p>

          {/* Field match details */}
          <div className="mt-2 space-y-1">
            {Object.entries(result.fieldMatches).map(([role, match]) => (
              <div key={role} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground w-16 shrink-0">{role}:</span>
                {match.status === "missing" ? (
                  <span className="flex items-center gap-1 text-destructive"><X className="h-3 w-3" />未找到</span>
                ) : match.possibleFields.length > 1 ? (
                  <select
                    value={fieldOverrides[result.metric.id]?.[role] ?? match.selectedField}
                    onChange={e => {
                      e.stopPropagation()
                      setFieldOverrides(prev => ({ ...prev, [result.metric.id]: { ...(prev[result.metric.id] || {}), [role]: e.target.value } }))
                    }}
                    onClick={e => e.stopPropagation()}
                    className="rounded border border-border bg-background px-2 py-0.5 text-xs max-w-[160px]"
                  >
                    {match.possibleFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                ) : (
                  <span className="font-mono text-foreground">{match.selectedField.split(".")[1]}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardHeader className="pb-0 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />一键适配业务指标</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {aiConfigured ? "AI 语义匹配" : "规则字段匹配"}：根据数据库字段自动匹配业务指标
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto pt-4">
          {adapting ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">正在扫描字段并匹配指标…</p>
            </div>
          ) : matchResults.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">所有内置指标都已添加</p>
              <p className="text-sm mt-1">你可以在「添加指标」中自定义新指标</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "完全匹配", count: matched.length, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
                  { label: "需要确认", count: uncertain.length, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
                  { label: "字段缺失", count: notFound.length, color: "text-muted-foreground", bg: "bg-muted/50" },
                ].map(s => (
                  <div key={s.label} className={cn("rounded-lg px-3 py-2.5 text-center", s.bg)}>
                    <div className={cn("text-2xl font-bold", s.color)}>{s.count}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Matched */}
              {matched.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 mb-2 text-sm font-semibold text-green-600 dark:text-green-400">
                    <Check className="h-4 w-4" />完全匹配 ({matched.length})
                  </h3>
                  <div className="space-y-2">
                    {matched.map(r => <SelectableRow key={r.metric.id} result={r} />)}
                  </div>
                </div>
              )}

              {/* Uncertain */}
              {uncertain.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 mb-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />需要手动确认 ({uncertain.length})
                  </h3>
                  <div className="space-y-2">
                    {uncertain.map(r => <SelectableRow key={r.metric.id} result={r} accent="amber" />)}
                  </div>
                </div>
              )}

              {/* Not found */}
              {notFound.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 mb-2 text-sm font-semibold text-muted-foreground">
                    <X className="h-4 w-4" />字段缺失，无法匹配 ({notFound.length})
                  </h3>
                  <div className="space-y-1">
                    {notFound.map(r => (
                      <div key={r.metric.id} className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                        <span className="line-through">{r.metric.abbreviation ? `${r.metric.abbreviation} · ` : ""}{r.metric.name}</span>
                        <span className="text-xs">(缺: {Object.entries(r.fieldMatches).filter(([, m]) => m.status === "missing").map(([role]) => role).join(", ")})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <div className="flex justify-end gap-3 border-t border-border p-4 shrink-0">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0 || adapting} className="gap-2">
            <Check className="h-4 w-4" />启用 {selected.size > 0 ? `${selected.size} 个` : ""}指标
          </Button>
        </div>
      </Card>
    </div>
  )
}
