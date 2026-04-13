"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Send, FileText, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const suggestions = [
  "最近7天的日活用户趋势",
  "用户留存率分析",
  "转化漏斗数据",
  "收入增长分析",
]

interface QueryInputProps {
  onSubmit?: (query: string) => void
}

export function QueryInput({ onSubmit }: QueryInputProps) {
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = () => {
    if (query.trim() && onSubmit) {
      onSubmit(query)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border bg-card transition-all duration-300",
          isFocused
            ? "border-primary/50 shadow-lg shadow-primary/5 ring-1 ring-primary/20"
            : "border-border"
        )}
      >
        {/* Gradient border effect */}
        {isFocused && (
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 opacity-50 blur-xl" />
        )}
        
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="用自然语言描述你想分析的数据..."
              className="min-h-[60px] w-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              rows={2}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>模板</span>
            </Button>
            <span className="text-xs text-muted-foreground">按 Enter 发送</span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!query.trim()}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            分析
          </Button>
        </div>
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setQuery(suggestion)}
            className="group flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
          >
            {suggestion}
            <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  )
}
