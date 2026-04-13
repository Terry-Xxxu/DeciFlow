import React, { useState } from "react"
import { PageLayout } from "../components/dashboard/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Textarea } from "../components/ui/textarea"
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
} from "lucide-react"
import { EmptyState } from "../components/dashboard/empty-states"

interface AnalysisPageProps {
  onNavigate?: (page: string) => void
}

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

// Set to false to see empty state
const hasDataConnected = true

const insightResults = [
  {
    type: "trend",
    icon: TrendingUp,
    title: "增长趋势",
    content: "过去30天用户活跃度持续上升，平均日增长率达到2.3%",
    confidence: 92,
    color: "text-emerald-500",
  },
  {
    type: "anomaly",
    icon: AlertTriangle,
    title: "异常预警",
    content: "检测到3月15日转化率异常下降，可能与服务器响应时间增加有关",
    confidence: 87,
    color: "text-amber-500",
  },
  {
    type: "insight",
    icon: Lightbulb,
    title: "优化建议",
    content: "建议在周三和周四加大营销投入，这两天用户转化率最高",
    confidence: 89,
    color: "text-blue-500",
  },
]

export function V1AnalysisPage({ onNavigate }: AnalysisPageProps) {
  const [query, setQuery] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showResults, setShowResults] = useState(true)

  const handleAnalyze = () => {
    setIsAnalyzing(true)
    setTimeout(() => {
      setIsAnalyzing(false)
      setShowResults(true)
    }, 2000)
  }

  if (!hasDataConnected) {
    return (
      <PageLayout currentPage="analysis" onNavigate={onNavigate}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                AI 智能分析
              </h1>
              <p className="text-sm text-muted-foreground">
                让 AI 自动发现数据中的洞察和机会
              </p>
            </div>
          </div>
        </div>
        <EmptyState type="no-insights" />
      </PageLayout>
    )
  }

  return (
    <PageLayout currentPage="analysis" onNavigate={onNavigate}>
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              AI 智能分析
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

      {/* Analysis Results */}
      {showResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">分析结果</h2>
            <span className="text-sm text-muted-foreground">基于最近30天数据</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {insightResults.map((result, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-secondary p-2">
                      <result.icon className={`h-5 w-5 ${result.color}`} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-foreground">{result.title}</h3>
                        <span className="text-xs text-muted-foreground">
                          置信度 {result.confidence}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AI Confidence Meter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">分析置信度</CardTitle>
          <CardDescription>AI 对当前分析结果的整体置信度评估</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">整体置信度</span>
              <span className="text-2xl font-bold text-primary">89%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: "89%" }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-foreground">1.2M</div>
                <div className="text-xs text-muted-foreground">数据点</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">30 天</div>
                <div className="text-xs text-muted-foreground">时间跨度</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">12</div>
                <div className="text-xs text-muted-foreground">维度分析</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
