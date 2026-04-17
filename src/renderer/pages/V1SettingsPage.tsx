import { useState } from "react"
import { PageLayout } from "../components/dashboard/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Switch } from "../components/ui/switch"
import { Label } from "../components/ui/label"
import {
  Settings as SettingsIcon,
  Sparkles,
  Database,
  Shield,
  Bell,
  Save,
  Eye,
  EyeOff,
  Check,
  Palette,
  Globe,
  Keyboard,
  Bot,
  BrainCircuit,
  Zap,
  Star,
  Lightbulb,
} from "lucide-react"
import { useTheme } from "../contexts/ThemeContext"

interface SettingsPageProps {
  onNavigate?: (page: string) => void
}

type SettingsSection = "general" | "ai" | "data" | "security" | "notifications"

const aiProviders = [
  { id: "openai",    name: "OpenAI",     models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],               icon: <Bot className="h-6 w-6" />          },
  { id: "anthropic", name: "Anthropic",  models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],    icon: <BrainCircuit className="h-6 w-6" /> },
  { id: "minimax",   name: "MiniMax",    models: ["abab6.5s-chat", "abab5.5-chat"],                         icon: <Zap className="h-6 w-6" />           },
  { id: "zhipu",     name: "智谱 GLM",  models: ["glm-4", "glm-3-turbo"],                                  icon: <Star className="h-6 w-6" />          },
]

export function V1SettingsPage({ onNavigate }: SettingsPageProps) {
  const { mode, toggleTheme } = useTheme()
  const [activeSection, setActiveSection] = useState<SettingsSection>("general")
  const [showApiKey, setShowApiKey] = useState(false)
  const [aiConfig, setAiConfig] = useState({
    provider: "openai",
    apiKey: "",
    apiEndpoint: "",
    model: "gpt-4o",
  })
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")

  // Toggle states
  const [queryCache, setQueryCache] = useState(true)
  const [dataMasking, setDataMasking] = useState(true)
  const [auditLog, setAuditLog] = useState(true)
  const [queryNotification, setQueryNotification] = useState(true)
  const [anomalyNotification, setAnomalyNotification] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)

  const handleSave = () => {
    setSaveStatus("saving")
    setTimeout(() => {
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    }, 1000)
  }

  const sections = [
    { id: "general" as const, icon: Palette, label: "通用设置", description: "界面和语言" },
    { id: "ai" as const, icon: Sparkles, label: "AI 配置", description: "配置 AI 服务" },
    { id: "data" as const, icon: Database, label: "数据源", description: "数据库配置" },
    { id: "security" as const, icon: Shield, label: "安全设置", description: "隐私和访问控制" },
    { id: "notifications" as const, icon: Bell, label: "通知", description: "通知偏好" },
  ]

  return (
    <PageLayout currentPage="settings" onNavigate={onNavigate}>
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <SettingsIcon className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              设置
            </h1>
            <p className="text-sm text-muted-foreground">
              管理您的应用偏好和配置
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    activeSection === section.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  <section.icon className="h-4 w-4" />
                  <div className="text-left">
                    <div>{section.label}</div>
                    <div className="text-xs opacity-70">{section.description}</div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* General Settings */}
          {activeSection === "general" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    外观设置
                  </CardTitle>
                  <CardDescription>
                    自定义应用外观和显示
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>深色模式</Label>
                      <p className="text-xs text-muted-foreground">
                        切换深色和浅色主题
                      </p>
                    </div>
                    <Switch
                      checked={mode === "dark"}
                      onCheckedChange={toggleTheme}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>语言</Label>
                    <select className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm">
                      <option>简体中文</option>
                      <option>English</option>
                      <option>日本語</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Keyboard className="h-5 w-5 text-blue-500" />
                    快捷键
                  </CardTitle>
                  <CardDescription>
                    查看和自定义键盘快捷键
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm text-foreground">新建查询</span>
                      <kbd className="rounded bg-muted px-2 py-1 text-xs">⌘ K</kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm text-foreground">保存</span>
                      <kbd className="rounded bg-muted px-2 py-1 text-xs">⌘ S</kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm text-foreground">搜索</span>
                      <kbd className="rounded bg-muted px-2 py-1 text-xs">⌘ /</kbd>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* AI Configuration */}
          {activeSection === "ai" && (
            <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  AI 服务配置
                </CardTitle>
                <CardDescription>
                  配置您的 AI 服务提供商，所有密钥仅保存在本地
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Provider Selection */}
                <div className="space-y-2">
                  <Label>服务提供商</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {aiProviders.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => setAiConfig({ ...aiConfig, provider: provider.id })}
                        className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                          aiConfig.provider === provider.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center justify-center text-muted-foreground">{provider.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{provider.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {provider.models.length} 个模型可用
                          </div>
                        </div>
                        {aiConfig.provider === provider.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                  <Label>模型</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {aiProviders
                      .find((p) => p.id === aiConfig.provider)
                      ?.models.map((model) => (
                        <button
                          key={model}
                          onClick={() => setAiConfig({ ...aiConfig, model })}
                          className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                            aiConfig.model === model
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <span className="text-sm font-medium">{model}</span>
                          {aiConfig.model === model && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                  </div>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      placeholder="输入您的 API Key"
                      value={aiConfig.apiKey}
                      onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Lightbulb className="h-3 w-3 inline-block mr-1" />您的 API Key 仅保存在本地，不会上传到任何服务器
                  </p>
                </div>

                {/* API Endpoint (Optional) */}
                <div className="space-y-2">
                  <Label>
                    API 端点 <span className="text-muted-foreground">(可选)</span>
                  </Label>
                  <Input
                    placeholder="https://api.openai.com/v1"
                    value={aiConfig.apiEndpoint}
                    onChange={(e) => setAiConfig({ ...aiConfig, apiEndpoint: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    留空使用默认端点，或输入自定义代理地址
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="gap-2">
                    {saveStatus === "saving" ? (
                      <>保存中...</>
                    ) : saveStatus === "saved" ? (
                      <>
                        <Check className="h-4 w-4" />
                        已保存
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        保存配置
                      </>
                    )}
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    测试连接
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Sources */}
          {activeSection === "data" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-emerald-500" />
                  数据源设置
                </CardTitle>
                <CardDescription>
                  配置数据库连接参数和查询限制
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>查询超时时间</Label>
                  <Input type="number" defaultValue={30} />
                  <p className="text-xs text-muted-foreground">秒</p>
                </div>

                <div className="space-y-2">
                  <Label>默认查询限制</Label>
                  <Input type="number" defaultValue={1000} />
                  <p className="text-xs text-muted-foreground">防止过大的结果集</p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>启用查询缓存</Label>
                    <p className="text-xs text-muted-foreground">缓存重复查询的结果</p>
                  </div>
                  <Switch checked={queryCache} onCheckedChange={setQueryCache} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Settings */}
          {activeSection === "security" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-violet-500" />
                  安全与隐私
                </CardTitle>
                <CardDescription>
                  配置数据脱敏和访问控制
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>自动数据脱敏</Label>
                    <p className="text-xs text-muted-foreground">敏感字段自动隐藏</p>
                  </div>
                  <Switch checked={dataMasking} onCheckedChange={setDataMasking} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>记录查询审计日志</Label>
                    <p className="text-xs text-muted-foreground">保存所有查询历史</p>
                  </div>
                  <Switch checked={auditLog} onCheckedChange={setAuditLog} />
                </div>

                <div className="space-y-2">
                  <Label>敏感字段模式</Label>
                  <Textarea
                    placeholder="email, phone, password, secret, token"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    包含这些关键词的字段将自动脱敏
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          {activeSection === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-amber-500" />
                  通知设置
                </CardTitle>
                <CardDescription>
                  配置系统通知偏好
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>查询完成通知</Label>
                    <p className="text-xs text-muted-foreground">查询完成时显示通知</p>
                  </div>
                  <Switch checked={queryNotification} onCheckedChange={setQueryNotification} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>异常检测通知</Label>
                    <p className="text-xs text-muted-foreground">发现数据异常时通知</p>
                  </div>
                  <Switch checked={anomalyNotification} onCheckedChange={setAnomalyNotification} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>系统声音</Label>
                    <p className="text-xs text-muted-foreground">通知时播放声音</p>
                  </div>
                  <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
