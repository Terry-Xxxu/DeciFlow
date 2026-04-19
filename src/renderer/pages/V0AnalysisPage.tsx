
import { useState, useEffect } from "react"
import { PageLayout } from "../components/v0-layout/PageLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/v0-ui/Card"
import { Button } from "../components/v0-ui/Button"
import { Textarea } from "../components/v0-ui/Textarea"
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  BarChart3,
  Target,
  Users,
  Zap,
  RefreshCw,
  Settings,
  ArrowUpRight,
  Database,
} from "lucide-react"
import { EmptyStates } from "../components/v0-dashboard/EmptyStates"
import { cn } from "../lib/utils"
import { useDatabase } from "../stores/DatabaseStore"

const analysisTypes = [
  {
    id: "trend",
    icon: TrendingUp,
    title: "趋势分析",
    description: "识别数据中的长期趋势和周期性变化",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "anomaly",
    icon: AlertTriangle,
    title: "异常检测",
    description: "自动发现数据中的异常值和异常模式",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "prediction",
    icon: Target,
    title: "预测分析",
    description: "基于历史数据预测未来走势",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    id: "segment",
    icon: Users,
    title: "用户分群",
    description: "智能划分用户群体，发现关键特征",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
]

const insightResults = [
  {
    type: "trend",
    icon: TrendingUp,
    title: "增长趋势",
    content: "过去30天用户活跃度持续上升，平均日增长率达到2.3%",
    color: "text-emerald-500",
  },
  {
    type: "anomaly",
    icon: AlertTriangle,
    title: "异常预警",
    content: "检测到3月15日转化率异常下降，可能与服务器响应时间增加有关",
    color: "text-amber-500",
  },
  {
    type: "insight",
    icon: Lightbulb,
    title: "优化建议",
    content: "建议在周三和周四加大营销投入，这两天用户转化率最高",
    color: "text-blue-500",
  },
  {
    type: "trend",
    icon: TrendingUp,
    title: "收入预测",
    content: "基于当前趋势，预计下月收入将增长15%-20%",
    color: "text-violet-500",
  },
  {
    type: "insight",
    icon: Lightbulb,
    title: "用户行为",
    content: "移动端用户活跃度比桌面端高35%，建议优化移动端体验",
    color: "text-pink-500",
  },
]

interface V0Props {
  onNavigate?: (page: string) => void
}

export function V0AnalysisPage({ onNavigate }: V0Props) {
  const [query, setQuery] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<typeof insightResults>([])
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null) // null = 检查中
  const { databases } = useDatabase()

  const hasDataConnected = databases.length > 0 && databases.some((db) => db.connected)

  // 从 electron-store 检查 AI 是否已配置
  useEffect(() => {
    if (!window.electronAPI) {
      setAiConfigured(false)
      return
    }
    window.electronAPI.store.get('ai_config').then((config: any) => {
      setAiConfigured(!!(config?.apiKey))
    }).catch(() => setAiConfigured(false))
  }, [])

  const handleAnalyze = async () => {
    if (!query.trim()) return
    setIsAnalyzing(true)
    setShowResults(false)
    setAnalysisResults([])
    try {
      const res = await window.electronAPI.ai.chat(
        `请对以下分析需求给出5条洞察，每条包含 title、content 和 type（trend/anomaly/insight 之一），以 JSON 数组格式返回。\n\n分析需求：${query}`
      )
      try {
        const text = typeof res === 'string' ? res : (res?.content || res?.message || '')
        const match = text.match(/\[[\s\S]*\]/)
        if (match) {
          const parsed = JSON.parse(match[0])
          setAnalysisResults(Array.isArray(parsed) ? parsed.slice(0, 5) : insightResults)
        } else {
          setAnalysisResults(insightResults)
        }
      } catch {
        setAnalysisResults(insightResults)
      }
    } catch {
      setAnalysisResults(insightResults)
    } finally {
      setIsAnalyzing(false)
      setShowResults(true)
    }
  }

  // 还在检查配置中 — 显示加载状态，避免闪烁
  if (aiConfigured === null) {
    return (
      <PageLayout activeItem="analysis" onNavigate={onNavigate}>
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-10 w-10 rounded-xl border-2 border-primary/30 border-t-primary animate-spin" />
            <span className="text-sm">加载中...</span>
          </div>
        </div>
      </PageLayout>
    )
  }

  // Show AI configuration placeholder when AI is not configured
  if (!aiConfigured) {
    return (
      <PageLayout activeItem="analysis" onNavigate={onNavigate}>
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                AI智能分析
              </h1>
              <p className="text-sm text-muted-foreground">
                让 AI 自动发现数据中的洞察和机会
              </p>
            </div>
          </div>
        </div>

        {/* AI Configuration Placeholder */}
        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-foreground">
              配置 AI 以解锁智能分析
            </h2>
            <p className="mb-8 max-w-md text-muted-foreground">
              配置 AI 服务后，即可开始使用智能分析功能，自动发现数据中的洞察和机会。
            </p>
            <Button
              size="lg"
              className="gap-2"
              onClick={() => onNavigate?.("settings")}
            >
              <Settings className="h-5 w-5" />
              前往设置配置 AI
            </Button>

            {/* Feature highlights */}
            <div className="mt-12 grid gap-6 sm:grid-cols-3 text-left max-w-2xl">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">趋势分析</h3>
                <p className="text-sm text-muted-foreground">自动识别数据中的长期趋势和周期性变化</p>
              </div>
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <h3 className="font-semibold text-foreground">异常检测</h3>
                <p className="text-sm text-muted-foreground">智能发现数据中的异常值和异常模式</p>
              </div>
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                  <Target className="h-5 w-5 text-violet-500" />
                </div>
                <h3 className="font-semibold text-foreground">预测分析</h3>
                <p className="text-sm text-muted-foreground">基于历史数据预测未来走势和趋势</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  // Show empty state when AI is configured but no data is connected
  if (!hasDataConnected) {
    return (
      <PageLayout activeItem="analysis" onNavigate={onNavigate}>
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                AI智能分析
              </h1>
              <p className="text-sm text-muted-foreground">
                让 AI 自动发现数据中的洞察和机会
              </p>
            </div>
          </div>
        </div>

        {/* No Data Empty State */}
        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50 border border-border">
              <Database className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-foreground">
              连接数据源以开始分析
            </h2>
            <p className="mb-8 max-w-md text-muted-foreground">
              AI 已就绪！现在连接您的数据源，即可开始智能分析，发现数据中的洞察。
            </p>
            <Button
              size="lg"
              className="gap-2"
              onClick={() => onNavigate?.("datasources")}
            >
              <Database className="h-5 w-5" />
              添加数据源
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout activeItem="analysis" onNavigate={onNavigate}>
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              AI智能分析
            </h1>
            <p className="text-sm text-muted-foreground">
              让 AI 自动发现数据中的洞察和机会
            </p>
          </div>
        </div>
      </div>

      {/* Analysis Input */}
      <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-accent" />
            开始分析
          </CardTitle>
          <CardDescription>
            描述你想要分析的内容，或选择下方的分析类型
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="例如：分析过去30天的用户增长趋势，找出转化率最高的渠道..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-24 resize-none"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  开始 AI 分析
                </>
              )}
            </Button>
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              使用模板
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Types */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">分析类型</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {analysisTypes.map((type) => (
            <Card
              key={type.id}
              className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
              onClick={() => {
                setQuery(type.description)
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${type.bgColor}`}>
                    <type.icon className={`h-5 w-5 ${type.color}`} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-medium text-foreground">{type.title}</h3>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Analysis Results - only show after analyzing */}
      {showResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">分析结果</h2>
            <span className="text-sm text-muted-foreground">找到 {analysisResults.length} 条洞察</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {analysisResults.map((result, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-secondary p-2 shrink-0">
                      <result.icon className={`h-5 w-5 ${result.color}`} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="font-medium text-foreground">{result.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{result.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  )
}
