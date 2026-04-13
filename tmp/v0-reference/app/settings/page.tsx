"use client"

import { PageLayout } from "@/components/dashboard/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Key,
  CreditCard,
  LogOut,
} from "lucide-react"

export default function SettingsPage() {
  return (
    <PageLayout>
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          设置
        </h1>
        <p className="text-sm text-muted-foreground">
          管理你的账户和偏好设置
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings Navigation */}
        <div className="space-y-2">
          <Button variant="secondary" className="w-full justify-start">
            <User className="mr-2 h-4 w-4" />
            个人资料
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Bell className="mr-2 h-4 w-4" />
            通知设置
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Shield className="mr-2 h-4 w-4" />
            安全设置
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Palette className="mr-2 h-4 w-4" />
            外观
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Globe className="mr-2 h-4 w-4" />
            语言和地区
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Key className="mr-2 h-4 w-4" />
            API 密钥
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <CreditCard className="mr-2 h-4 w-4" />
            订阅计划
          </Button>
        </div>

        {/* Settings Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">个人资料</CardTitle>
              <CardDescription>管理你的个人信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-medium text-primary-foreground">
                  U
                </div>
                <div>
                  <Button variant="outline" size="sm">
                    更换头像
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">姓名</Label>
                  <Input id="name" defaultValue="用户名" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input id="email" type="email" defaultValue="user@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">公司</Label>
                <Input id="company" defaultValue="DeciFlow Inc." />
              </div>
              <Button>保存更改</Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">通知设置</CardTitle>
              <CardDescription>管理你的通知偏好</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">邮件通知</div>
                  <div className="text-sm text-muted-foreground">接收重要更新的邮件</div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">查询完成通知</div>
                  <div className="text-sm text-muted-foreground">当长时间查询完成时通知</div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">AI 洞察提醒</div>
                  <div className="text-sm text-muted-foreground">当 AI 发现重要洞察时通知</div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">数据异常警报</div>
                  <div className="text-sm text-muted-foreground">检测到数据异常时立即通知</div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">危险区域</CardTitle>
              <CardDescription>以下操作不可逆，请谨慎操作</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">退出登录</div>
                  <div className="text-sm text-muted-foreground">退出当前账户</div>
                </div>
                <Button variant="outline">
                  <LogOut className="mr-2 h-4 w-4" />
                  退出
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">删除账户</div>
                  <div className="text-sm text-muted-foreground">永久删除你的账户和所有数据</div>
                </div>
                <Button variant="destructive">删除账户</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}
