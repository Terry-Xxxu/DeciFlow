
import { useState } from "react"
import { Button } from "../v0-ui/Button"
import { Sparkles, Send, FileText, ChevronRight, Play, Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

const suggestions = [
  "最近7天的日活用户趋势",
  "用户留存率分析",
  "转化漏斗数据",
  "收入增长分析",
]

const templates = [
  {
    name: "用户增长分析",
    query: "分析最近30天的新用户增长趋势，按天统计并显示增长率",
  },
  {
    name: "留存率分析",
    query: "计算用户留存率，包括次日留存、7日留存和30日留存",
  },
  {
    name: "收入统计",
    query: "统计最近6个月的收入情况，按月分组显示趋势",
  },
  {
    name: "渠道转化",
    query: "分析各渠道的转化漏斗，从访问到付费的转化率",
  },
]

interface QueryInputProps {
  onSubmit?: (query: string) => void
  isLoading?: boolean
}

export function QueryInput({ onSubmit, isLoading = false }: QueryInputProps) {
  const [query, setQuery] = useState("")
  const [showTemplates, setShowTemplates] = useState(false)

  const handleSubmit = () => {
    if (query.trim() && onSubmit) {
      onSubmit(query)
      setQuery("") // Clear after submit
    }
  }

  const handleQuickSuggestion = (suggestion: string) => {
    if (onSubmit) {
      onSubmit(suggestion) // Execute directly instead of just filling text
    }
  }

  const handleTemplateSelect = (templateQuery: string) => {
    setQuery(templateQuery)
    setShowTemplates(false)
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-xl border border-border bg-card">

        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="用自然语言描述你想分析的数据..."
              className="min-h-[60px] w-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none focus:outline-none focus-visible:outline-none"
              rows={2}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2 relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2 text-muted-foreground"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              <FileText className="h-4 w-4" />
              <span>模板</span>
            </Button>
            {showTemplates && (
              <div className="absolute left-0 top-full z-10 mt-2 w-64 rounded-lg border border-border bg-card p-2 shadow-lg">
                <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">选择查询模板</p>
                {templates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => handleTemplateSelect(template.query)}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <p className="font-medium">{template.name}</p>
                    <p className="truncate text-xs opacity-70">{template.query}</p>
                  </button>
                ))}
              </div>
            )}
            <span className="text-xs text-muted-foreground">按 Enter 发送</span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!query.trim() || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                分析
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => handleQuickSuggestion(suggestion)}
            className="group flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
            title="点击直接执行查询"
          >
            <Play className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            {suggestion}
            <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  )
}
