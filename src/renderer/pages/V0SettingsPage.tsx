
import { useState, useEffect } from "react"
import { PageLayout } from "../components/v0-layout/PageLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/v0-ui/Card"
import { Button } from "../components/v0-ui/Button"
import { Input } from "../components/v0-ui/Input"
import { Textarea } from "../components/v0-ui/Textarea"
import { Switch } from "../components/v0-ui/Switch"
import {
  Settings as SettingsIcon,
  Sparkles,
  Database,
  Shield,
  Bell,
  Keyboard,
  Save,
  Eye,
  EyeOff,
  Check,
} from "lucide-react"
import { cn } from "../lib/utils"
import { useTheme } from "../contexts/ThemeContext"

const aiProviders = [
  {
    id: "openai",
    name: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3"],
    baseURL: "https://api.openai.com/v1",
    keyHint: "sk-...",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    models: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
    baseURL: "https://api.anthropic.com",
    keyHint: "sk-ant-api03-...",
  },
  {
    id: "minimax",
    name: "MiniMax",
    models: ["MiniMax-M2.7", "MiniMax-M2.7-highspeed", "MiniMax-M2.5"],
    baseURL: "https://api.minimaxi.com/v1",
    keyHint: "sk-api-... 或 sk-cp-...（Coding Plan）",
  },
  {
    id: "zhipu",
    name: "智谱 GLM",
    models: ["glm-5.1", "glm-4.7", "glm-4.5", "glm-4.5-air"],
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    keyHint: "在 open.bigmodel.cn 控制台获取",
  },
]

interface V0Props {
  onNavigate?: (page: string) => void
}

export function V0SettingsPage({ onNavigate }: V0Props) {
  const { mode, toggleTheme } = useTheme()
  const [activeSection, setActiveSection] = useState<"ai" | "data" | "security" | "notifications">("ai")
  const [showApiKey, setShowApiKey] = useState(false)
  const [aiConfig, setAiConfig] = useState({
    provider: "openai",
    apiKey: "",
    apiEndpoint: "",
    model: "gpt-4",
  })
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const DEFAULT_SENSITIVE_FIELDS = "email, phone, password, secret, token, id_card, bank_card"
  const [sensitiveFields, setSensitiveFields] = useState(DEFAULT_SENSITIVE_FIELDS)
  const [settings, setSettings] = useState({
    queryCache: true,
    dataMasking: true,
    auditLog: true,
    queryCompleteNotification: true,
    anomalyNotification: true,
    systemSound: false,
  })

  // 启动时从 electron-store 加载已保存的 AI 配置
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.store.get('ai_config').then((saved: any) => {
      if (saved) {
        setAiConfig({
          provider: saved.provider || "openai",
          apiKey: saved.apiKey || "",
          apiEndpoint: saved.apiEndpoint || "",
          model: saved.model || "gpt-4",
        })
      }
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaveStatus("saving")
    try {
      // 保存到 electron-store
      await window.electronAPI.store.set('ai_config', aiConfig)
      // 初始化 AI 服务
      await window.electronAPI.ai.init({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
        baseURL: aiConfig.apiEndpoint || undefined,
      })
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (err: any) {
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 3000)
    }
  }

  const handleTestConnection = async () => {
    setSaveStatus("saving")
    try {
      await window.electronAPI.ai.init({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
        baseURL: aiConfig.apiEndpoint || undefined,
      })
      const res = await window.electronAPI.ai.chat("ping")
      if (res) {
        setSaveStatus("saved")
        setTimeout(() => setSaveStatus("idle"), 2000)
      }
    } catch {
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 3000)
    }
  }

  const sections = [
    { id: "ai", icon: Sparkles, label: "AI 配置", description: "配置 AI 服务提供商" },
    { id: "data", icon: Database, label: "数据源", description: "管理数据库连接" },
    { id: "security", icon: Shield, label: "安全设置", description: "数据脱敏和访问控制" },
    { id: "notifications", icon: Bell, label: "通知", description: "配置通知偏好" },
  ]

  return (
    <PageLayout activeItem="settings" onNavigate={onNavigate}>
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <SettingsIcon className="h-5 w-5 text-muted-foreground" />
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
                  onClick={() => setActiveSection(section.id as any)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    activeSection === section.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
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
          {/* AI Configuration */}
          {activeSection === "ai" && (
            <>
              <Card>
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
                    <label className="text-sm font-medium text-foreground">服务提供商</label>
                    <div className="grid grid-cols-2 gap-3">
                      {aiProviders.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => setAiConfig({
                            ...aiConfig,
                            provider: provider.id,
                            model: provider.models[0],
                            apiEndpoint: provider.baseURL,
                          })}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-3 text-left transition-all",
                            aiConfig.provider === provider.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          )}
                        >
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
                    <label className="text-sm font-medium text-foreground">模型</label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                      value={aiConfig.model}
                      onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                    >
                      {aiProviders
                        .find((p) => p.id === aiConfig.provider)
                        ?.models.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">API Key</label>
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
                      格式：{aiProviders.find(p => p.id === aiConfig.provider)?.keyHint}
                    </p>
                    {aiConfig.provider === "minimax" && aiConfig.apiKey.startsWith("sk-cp-") && (
                      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-600 dark:text-blue-400">
                        检测到 MiniMax Coding Plan key（sk-cp-），可正常用于对话。如果你通过 OpenClaw 本地网关使用，请将 API 端点改为 http://127.0.0.1:59062/v1。
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      您的 API Key 仅保存在本地，不会上传到任何服务器
                    </p>
                  </div>

                  {/* API Endpoint (Optional) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      API 端点 <span className="text-muted-foreground">(可选)</span>
                    </label>
                    <Input
                      placeholder="https://api.openai.com/v1"
                      value={aiConfig.apiEndpoint}
                      onChange={(e) => setAiConfig({ ...aiConfig, apiEndpoint: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      留空使用默认端点，或输入自定义代理地址
                    </p>
                  </div>

                  {/* Save / Test Connection */}
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={saveStatus === "saving"} className="gap-2">
                      {saveStatus === "saving" ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          保存中...
                        </>
                      ) : saveStatus === "saved" ? (
                        <>
                          <Check className="h-4 w-4" />
                          已保存
                        </>
                      ) : saveStatus === "error" ? (
                        <>
                          <Save className="h-4 w-4" />
                          保存失败，重试
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          保存配置
                        </>
                      )}
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={handleTestConnection} disabled={!aiConfig.apiKey || saveStatus === "saving"}>
                      <Sparkles className="h-4 w-4" />
                      测试连接
                    </Button>
                  </div>
                  {saveStatus === "error" && (
                    <p className="text-xs text-destructive">连接失败，请检查 API Key 是否正确</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Data Sources */}
          {activeSection === "data" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-chart-1" />
                  数据源设置
                </CardTitle>
                <CardDescription>
                  配置数据库连接参数和查询限制
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">查询超时时间</label>
                  <Input type="number" defaultValue="30" />
                  <p className="text-xs text-muted-foreground">秒</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">默认查询限制</label>
                  <Input type="number" defaultValue="1000" />
                  <p className="text-xs text-muted-foreground">防止过大的结果集</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">启用查询缓存</div>
                    <div className="text-sm text-muted-foreground">缓存重复查询的结果</div>
                  </div>
                  <Switch
                    checked={settings.queryCache}
                    onCheckedChange={(checked) => setSettings({ ...settings, queryCache: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Settings */}
          {activeSection === "security" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-chart-3" />
                  安全与隐私
                </CardTitle>
                <CardDescription>
                  配置数据脱敏和访问控制
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">自动数据脱敏</div>
                    <div className="text-sm text-muted-foreground">敏感字段自动隐藏</div>
                  </div>
                  <Switch
                    checked={settings.dataMasking}
                    onCheckedChange={(checked) => setSettings({ ...settings, dataMasking: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">记录查询审计日志</div>
                    <div className="text-sm text-muted-foreground">保存所有查询历史</div>
                  </div>
                  <Switch
                    checked={settings.auditLog}
                    onCheckedChange={(checked) => setSettings({ ...settings, auditLog: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">敏感字段关键词</label>
                    <button
                      onClick={() => setSensitiveFields(DEFAULT_SENSITIVE_FIELDS)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      恢复默认
                    </button>
                  </div>
                  <Textarea
                    value={sensitiveFields}
                    onChange={(e) => setSensitiveFields(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    字段名中包含以上关键词（逗号分隔）将自动脱敏。删除某个词即取消对该类字段的脱敏。
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
                  <Bell className="h-5 w-5 text-chart-2" />
                  通知设置
                </CardTitle>
                <CardDescription>
                  配置系统通知偏好
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">查询完成通知</div>
                    <div className="text-sm text-muted-foreground">查询完成时显示通知</div>
                  </div>
                  <Switch
                    checked={settings.queryCompleteNotification}
                    onCheckedChange={(checked) => setSettings({ ...settings, queryCompleteNotification: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">异常检测通知</div>
                    <div className="text-sm text-muted-foreground">发现数据异常时通知</div>
                  </div>
                  <Switch
                    checked={settings.anomalyNotification}
                    onCheckedChange={(checked) => setSettings({ ...settings, anomalyNotification: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">系统声音</div>
                    <div className="text-sm text-muted-foreground">通知时播放声音</div>
                  </div>
                  <Switch
                    checked={settings.systemSound}
                    onCheckedChange={(checked) => setSettings({ ...settings, systemSound: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
