/**
 * 漏斗分析 IPC 处理器
 */

import { ipcMain } from 'electron'
import { FunnelDiscoveryService } from './ai/funnel'
import Store from 'electron-store'

interface FunnelData {
  id: string
  name: string
  description: string
  steps: any[]
  filters: any
  createdAt: string
  updatedAt: string
}

interface FunnelStoreSchema {
  funnels: FunnelData[]
}

const funnelStore = new Store<FunnelStoreSchema>({
  name: 'funnels',
  encryptionKey: 'data-insight-funnel-encryption'
})

let funnelService: FunnelDiscoveryService | null = null

// 初始化漏斗服务
export function initFunnelService(aiManager: any) {
  funnelService = new FunnelDiscoveryService(aiManager)
}

// 自动发现漏斗
ipcMain.handle('funnel:discover', async (_, config: any) => {
  try {
    if (!funnelService) {
      throw new Error('AI 服务未初始化')
    }

    // 模拟用户路径数据（实际应该从数据库查询）
    const mockUserPaths = [
      {
        steps: ['首页', '搜索', '商品详情', '加购', '下单', '支付'],
        count: 1000,
        conversionRate: 15
      },
      {
        steps: ['首页', '分类浏览', '商品详情', '加购', '下单', '支付'],
        count: 800,
        conversionRate: 12
      },
      {
        steps: ['首页', '活动页', '商品详情', '加购', '下单'],
        count: 500,
        conversionRate: 8
      }
    ]

    const result = await funnelService.discoverFunnel(mockUserPaths)
    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '漏斗发现失败',
      data: null
    }
  }
})

// 保存漏斗配置
ipcMain.handle('funnel:save', async (_, funnel: any) => {
  try {
    const { id, name, description, steps, filters } = funnel

    // 生成 ID（如果没有）
    const funnelId = id || `funnel_${Date.now()}`

    // 读取现有漏斗
    const funnels = (funnelStore.get('funnels') || []) as FunnelData[]

    // 检查是否已存在
    const existingIndex = funnels.findIndex(f => f.id === funnelId)

    const funnelData = {
      id: funnelId,
      name: name || '未命名漏斗',
      description: description || '',
      steps: steps || [],
      filters: filters || {},
      createdAt: existingIndex >= 0 ? funnels[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (existingIndex >= 0) {
      // 更新现有漏斗
      funnels[existingIndex] = funnelData
    } else {
      // 添加新漏斗
      funnels.unshift(funnelData)
    }

    // 保存到 store
    funnelStore.set('funnels', funnels)

    return { success: true, message: '漏斗保存成功', data: funnelData }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '保存失败'
    }
  }
})

// 获取已保存的漏斗列表
ipcMain.handle('funnel:list', async () => {
  try {
    const funnels = (funnelStore.get('funnels') || []) as FunnelData[]
    return { success: true, data: funnels }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取失败'
    }
  }
})

// 删除漏斗配置
ipcMain.handle('funnel:delete', async (_, id: string) => {
  try {
    const funnels = (funnelStore.get('funnels') || []) as FunnelData[]
    const filtered = funnels.filter(f => f.id !== id)
    funnelStore.set('funnels', filtered)
    return { success: true, message: '漏斗删除成功' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '删除失败'
    }
  }
})

// 获取单个漏斗详情
ipcMain.handle('funnel:get', async (_, id: string) => {
  try {
    const funnels = (funnelStore.get('funnels') || []) as FunnelData[]
    const funnel = funnels.find(f => f.id === id)
    if (!funnel) {
      return { success: false, message: '漏斗不存在' }
    }
    return { success: true, data: funnel }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取失败'
    }
  }
})
