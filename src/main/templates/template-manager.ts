/**
 * 查询模板管理器
 * 用于保存和管理常用的查询模板
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'

export interface QueryTemplate {
  id: string
  name: string
  description: string
  naturalLanguage: string  // 自然语言描述
  sql?: string  // 生成的SQL（如果有）
  tags: string[]  // 标签，如：用户分析、留存、转化
  createdAt: number
  updatedAt: number
  usageCount: number  // 使用次数
  category?: 'user_analysis' | 'retention' | 'conversion' | 'revenue' | 'custom'
}

export interface TemplateFolder {
  id: string
  name: string
  templates: QueryTemplate[]
}

/**
 * 查询模板管理器
 */
export class QueryTemplateManager {
  private templatesPath: string
  private templates: Map<string, QueryTemplate> = new Map()
  private folders: Map<string, TemplateFolder> = new Map()

  constructor() {
    const userDataPath = app.getPath('userData')
    this.templatesPath = path.join(userDataPath, 'query-templates.json')
    this.load()
  }

  /**
   * 加载模板
   */
  private async load() {
    try {
      if (await fs.access(this.templatesPath).then(() => true).catch(() => false)) {
        const content = await fs.readFile(this.templatesPath, 'utf-8')
        const data = JSON.parse(content)

        // 加载模板
        if (data.templates && Array.isArray(data.templates)) {
          data.templates.forEach((t: QueryTemplate) => {
            this.templates.set(t.id, t)
          })
        }

        // 加载文件夹
        if (data.folders && Array.isArray(data.folders)) {
          data.folders.forEach((f: TemplateFolder) => {
            this.folders.set(f.id, f)
          })
        }

        console.log(`[模板管理] 加载成功: ${this.templates.size} 个模板`)
      } else {
        // 创建默认模板
        await this.createDefaultTemplates()
        await this.save()
      }
    } catch (error) {
      console.error('[模板管理] 加载失败:', error)
      await this.createDefaultTemplates()
      await this.save()
    }
  }

  /**
   * 保存模板
   */
  private async save() {
    try {
      const data = {
        templates: Array.from(this.templates.values()),
        folders: Array.from(this.folders.values()),
        updatedAt: Date.now()
      }
      await fs.writeFile(this.templatesPath, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('[模板管理] 保存失败:', error)
    }
  }

  /**
   * 创建默认模板
   */
  private async createDefaultTemplates() {
    const defaultTemplates: QueryTemplate[] = [
      {
        id: 'template_retention_7day',
        name: '近7天用户留存率',
        description: '查看最近7天注册用户的留存情况',
        naturalLanguage: '近7天注册用户的留存率是多少？',
        tags: ['留存', '用户分析'],
        category: 'retention',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
      },
      {
        id: 'template_dau_trend',
        name: '日活用户趋势',
        description: '查看每日活跃用户数量变化趋势',
        naturalLanguage: '最近30天的日活用户数变化趋势',
        tags: ['日活', '趋势'],
        category: 'user_analysis',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
      },
      {
        id: 'template_conversion_funnel',
        name: '转化漏斗分析',
        description: '分析用户从注册到付费的转化流程',
        naturalLanguage: '用户从注册到付费的转化漏斗是什么样的？',
        tags: ['转化', '漏斗'],
        category: 'conversion',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
      },
      {
        id: 'template_channel_comparison',
        name: '各渠道用户质量对比',
        description: '对比不同渠道获取的用户质量和留存情况',
        naturalLanguage: '对比各个渠道获取用户的留存率和活跃度',
        tags: ['渠道', '对比'],
        category: 'user_analysis',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
      },
      {
        id: 'template_monthly_revenue',
        name: '月度收入趋势',
        description: '查看每月的收入变化趋势',
        naturalLanguage: '最近12个月的月度收入变化趋势',
        tags: ['收入', '趋势'],
        category: 'revenue',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
      }
    ]

    defaultTemplates.forEach(t => this.templates.set(t.id, t))

    // 创建默认文件夹
    this.folders.set('folder_favorites', {
      id: 'folder_favorites',
      name: '常用查询',
      templates: []
    })
    this.folders.set('folder_user', {
      id: 'folder_user',
      name: '用户分析',
      templates: []
    })
    this.folders.set('folder_business', {
      id: 'folder_business',
      name: '业务指标',
      templates: []
    })
  }

  /**
   * 创建模板
   */
  async createTemplate(template: Omit<QueryTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<QueryTemplate> {
    const id = `template_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    const newTemplate: QueryTemplate = {
      ...template,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0
    }

    this.templates.set(id, newTemplate)
    await this.save()

    console.log(`[模板管理] 创建模板: ${newTemplate.name}`)
    return newTemplate
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): QueryTemplate[] {
    return Array.from(this.templates.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  /**
   * 获取单个模板
   */
  getTemplate(id: string): QueryTemplate | null {
    return this.templates.get(id) || null
  }

  /**
   * 更新模板
   */
  async updateTemplate(id: string, updates: Partial<Omit<QueryTemplate, 'id' | 'createdAt'>>): Promise<boolean> {
    const template = this.templates.get(id)
    if (!template) return false

    const updated = {
      ...template,
      ...updates,
      updatedAt: Date.now()
    }

    this.templates.set(id, updated)
    await this.save()

    console.log(`[模板管理] 更新模板: ${updated.name}`)
    return true
  }

  /**
   * 删除模板
   */
  async deleteTemplate(id: string): Promise<boolean> {
    const success = this.templates.delete(id)
    if (success) {
      await this.save()
      console.log(`[模板管理] 删除模板: ${id}`)
    }
    return success
  }

  /**
   * 使用模板（增加使用次数）
   */
  async useTemplate(id: string): Promise<void> {
    const template = this.templates.get(id)
    if (template) {
      template.usageCount++
      template.updatedAt = Date.now()
      await this.save()
    }
  }

  /**
   * 搜索模板
   */
  searchTemplates(keyword: string): QueryTemplate[] {
    const lowerKeyword = keyword.toLowerCase()
    return this.getAllTemplates().filter(t =>
      t.name.toLowerCase().includes(lowerKeyword) ||
      t.description.toLowerCase().includes(lowerKeyword) ||
      t.naturalLanguage.toLowerCase().includes(lowerKeyword) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
    )
  }

  /**
   * 按分类获取模板
   */
  getTemplatesByCategory(category: QueryTemplate['category']): QueryTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category)
  }

  /**
   * 按标签获取模板
   */
  getTemplatesByTag(tag: string): QueryTemplate[] {
    return this.getAllTemplates().filter(t => t.tags.includes(tag))
  }

  /**
   * 获取热门模板（按使用次数）
   */
  getPopularTemplates(limit: number = 5): QueryTemplate[] {
    return this.getAllTemplates()
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
  }
}

// 导出单例
export const queryTemplateManager = new QueryTemplateManager()
