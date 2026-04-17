/**
 * NotificationCenter - 通知系统组件（支持双模式）
 * 支持系统通知和异常警报
 */

import React, { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { Bell, CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationCenterProps {
  onNotificationCount?: (count: number) => void
  onNotificationsChange?: (notifications: Notification[]) => void
}

/**
 * 通知中心组件
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onNotificationCount
}) => {
  const { mode } = useTheme()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const isDark = mode === 'dark'

  useEffect(() => {
    // 请求通知权限
    if ('Notification' in window) {
      setPermission(Notification.permission)
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setPermission)
      }
    }

    // 加载历史通知
    loadNotifications()
  }, [])

  const loadNotifications = () => {
    const saved = localStorage.getItem('notifications')
    if (saved) {
      const parsed = JSON.parse(saved)
      setNotifications(parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) })))
    }
  }

  /**
   * 添加通知
   */
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date(),
      read: false
    }

    const updated = [newNotification, ...notifications]
    setNotifications(updated)
    saveNotifications(updated)

    // 发送系统通知
    if (permission === 'granted') {
      sendSystemNotification(newNotification)
    }

    onNotificationCount?.(updated.filter(n => !n.read).length)
  }

  /**
   * 发送系统通知
   */
  const sendSystemNotification = (notification: Notification) => {
    if ('Notification' in window) {
      const notif = new Notification(notification.title, {
        body: notification.message,
        icon: '/icon.png',
        tag: notification.id
      })

      notif.onclick = () => {
        window.focus()
        if (notification.action) {
          notification.action.onClick()
        }
        notif.close()
      }
    }
  }

  /**
   * 保存通知到本地存储
   */
  const saveNotifications = (notifList: Notification[]) => {
    // 只保留最近 100 条
    const trimmed = notifList.slice(0, 100)
    localStorage.setItem('notifications', JSON.stringify(trimmed))
  }

  /**
   * 标记为已读
   */
  const markAsRead = (id: string) => {
    const updated = notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    )
    setNotifications(updated)
    saveNotifications(updated)
    onNotificationCount?.(updated.filter(n => !n.read).length)
  }

  /**
   * 删除通知
   */
  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id)
    setNotifications(updated)
    saveNotifications(updated)
    onNotificationCount?.(updated.filter(n => !n.read).length)
  }

  /**
   * 全部标记为已读
   */
  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }))
    setNotifications(updated)
    saveNotifications(updated)
    onNotificationCount?.(0)
  }

  /**
   * 清空通知
   */
  const clearAll = () => {
    setNotifications([])
    localStorage.removeItem('notifications')
    onNotificationCount?.(0)
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const getNotificationBg = (type: string, read: boolean) => {
    if (isDark) {
      if (!read) return 'bg-blue-500/5'
      return 'hover:bg-slate-700/50'
    }
    if (!read) return 'bg-blue-50'
    return 'hover:bg-gray-50'
  }

  const getTypeBg = (type: string) => {
    if (isDark) {
      switch (type) {
        case 'success': return 'bg-green-500/20'
        case 'warning': return 'bg-yellow-500/20'
        case 'error': return 'bg-red-500/20'
        default: return 'bg-blue-500/20'
      }
    }
    switch (type) {
      case 'success': return 'bg-green-100'
      case 'warning': return 'bg-yellow-100'
      case 'error': return 'bg-red-100'
      default: return 'bg-blue-100'
    }
  }

  return (
    <>
      {/* 通知按钮 */}
      <div className="relative">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative group ${
            isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
          }`}
        >
          <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* 通知面板 */}
        {showPanel && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowPanel(false)}
            />
            <div className={`absolute right-0 top-full mt-2 z-20 w-96 rounded-xl shadow-2xl overflow-hidden ${
              isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
            }`}>
              {/* 标题栏 */}
              <div className={`p-4 flex items-center justify-between ${
                isDark ? 'border-b border-slate-700' : 'border-b border-gray-200'
              }`}>
                <h3 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>通知</h3>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className={`text-xs ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                    >
                      全部已读
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className={`text-xs ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      清空
                    </button>
                  )}
                </div>
              </div>

              {/* 通知列表 */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className={`p-8 text-center ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                    <Bell className="w-10 h-10 mb-2 mx-auto opacity-30" />
                    <p>暂无通知</p>
                  </div>
                ) : (
                  <div className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-100'}`}>
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 transition-colors ${getNotificationBg(notif.type, notif.read)}`}
                      >
                        <div className="flex items-start gap-3">
                          {/* 图标 */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeBg(notif.type)}`}>
                            {notif.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                            {notif.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
                            {notif.type === 'error'   && <XCircle className="w-4 h-4" />}
                            {notif.type === 'info'    && <Info className="w-4 h-4" />}
                          </div>

                          {/* 内容 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>{notif.title}</h4>
                              {!notif.read && (
                                <span className={`w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1`}></span>
                              )}
                            </div>
                            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{notif.message}</p>
                            <div className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                              {formatTime(notif.timestamp)}
                            </div>
                            {notif.action && (
                              <button
                                onClick={notif.action.onClick}
                                className={`mt-2 text-xs ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                              >
                                {notif.action.label}
                              </button>
                            )}
                          </div>

                          {/* 删除按钮 */}
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            className={isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

/**
 * 格式化时间
 */
function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

/**
 * 全局通知管理器
 */
export const notificationManager = {
  success(title: string, message: string) {
    const event = new CustomEvent('notification', {
      detail: { type: 'success', title, message }
    })
    window.dispatchEvent(event)
  },

  warning(title: string, message: string) {
    const event = new CustomEvent('notification', {
      detail: { type: 'warning', title, message }
    })
    window.dispatchEvent(event)
  },

  error(title: string, message: string) {
    const event = new CustomEvent('notification', {
      detail: { type: 'error', title, message }
    })
    window.dispatchEvent(event)
  },

  info(title: string, message: string) {
    const event = new CustomEvent('notification', {
      detail: { type: 'info', title, message }
    })
    window.dispatchEvent(event)
  }
}

export default NotificationCenter
