/**
 * QueryTemplatesPanel - 查询模板面板
 * 显示和管理常用的查询模板
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface QueryTemplate {
  id: string
  name: string
  description: string
  naturalLanguage: string
  tags: string[]
  usageCount: number
  category?: string
}

interface QueryTemplatesPanelProps {
  onSelectTemplate?: (template: QueryTemplate) => void
  onClose: () => void
}

export const QueryTemplatesPanel: React.FC<QueryTemplatesPanelProps> = ({
  onSelectTemplate,
  onClose
}) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  const [templates, setTemplates] = useState<QueryTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDesc, setNewTemplateDesc] = useState('')
  const [currentQuery, setCurrentQuery] = useState('')

  // 加载模板
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const result = await window.electronAPI.templates.getAll()
      if (result.success) {
        setTemplates(result.data || [])
      }
    } catch (error) {
      console.error('加载模板失败:', error)
    }
  }

  // 保存当前查询为模板
  const saveAsTemplate = (query: string) => {
    setCurrentQuery(query)
    setShowSaveDialog(true)
  }

  // 创建模板
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return

    try {
      const result = await window.electronAPI.templates.create({
        name: newTemplateName,
        description: newTemplateDesc || newTemplateName,
        naturalLanguage: currentQuery,
        tags: [],
        category: 'custom'
      })

      if (result.success) {
        setShowSaveDialog(false)
        setNewTemplateName('')
        setNewTemplateDesc('')
        loadTemplates()
      }
    } catch (error) {
      console.error('创建模板失败:', error)
    }
  }

  // 使用模板
  const handleUseTemplate = async (template: QueryTemplate) => {
    // 记录使用
    await window.electronAPI.templates.use(template.id)

    // 调用选择回调
    if (onSelectTemplate) {
      onSelectTemplate(template)
    }

    onClose()
  }

  // 删除模板
  const handleDeleteTemplate = async (id: string) => {
    try {
      await window.electronAPI.templates.delete(id)
      loadTemplates()
    } catch (error) {
      console.error('删除模板失败:', error)
    }
  }

  // 分类
  const categories = [
    { value: 'all', label: '全部', icon: '📋' },
    { value: 'user_analysis', label: '用户分析', icon: '👥' },
    { value: 'retention', label: '留存', icon: '🔄' },
    { value: 'conversion', label: '转化', icon: '🎯' },
    { value: 'revenue', label: '收入', icon: '💰' },
    { value: 'custom', label: '自定义', icon: '✏️' }
  ]

  // 过滤模板
  const filteredTemplates = templates.filter(template => {
    const matchSearch = !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchCategory = selectedCategory === 'all' || template.category === selectedCategory

    return matchSearch && matchCategory
  })

  return (
    <div className={`w-96 border-l flex flex-col ${
      isDark
        ? 'bg-[#0a101f]/80 border-white/5'
        : 'bg-white border-gray-200'
    }`}>
      {/* 头部 */}
      <div className={`h-14 flex items-center justify-between px-4 ${
        isDark ? 'border-b border-white/5' : 'border-b border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <span className="text-sm font-medium text-text-primary">查询模板</span>
        </div>
        <button
          onClick={onClose}
          className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
            isDark
              ? 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
              : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
          }`}
        >
          ✕
        </button>
      </div>

      {/* 搜索和过滤 */}
      <div className={`p-4 border-b ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
        <input
          type="text"
          placeholder="搜索模板..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full px-3 py-2 rounded-lg text-sm mb-3 ${
            isDark
              ? 'bg-slate-800 border border-slate-700 text-text-primary placeholder-slate-500'
              : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
        />

        {/* 分类标签 */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                selectedCategory === cat.value
                  ? isDark
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-600 text-white'
                  : isDark
                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 模板列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredTemplates.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
            {searchQuery ? '没有找到匹配的模板' : '暂无模板'}
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y:0 }}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                isDark
                  ? 'bg-slate-900 border-slate-700 hover:border-blue-500/50'
                  : 'bg-white border-gray-200 hover:border-blue-500'
              }`}
              onClick={() => handleUseTemplate(template)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-medium mb-1 ${
                    isDark ? 'text-slate-200' : 'text-gray-900'
                  }`}>
                    {template.name}
                  </h4>
                  <p className={`text-xs mb-2 line-clamp-2 ${
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map(tag => (
                      <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isDark
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`text-[10px ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  使用 {template.usageCount} 次
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* 保存模板对话框 */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowSaveDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-80 rounded-xl p-6 shadow-2xl ${
                isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border-gray-200'
              }`}
            >
              <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                保存为模板
              </h3>

              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    模板名称
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="例如：用户留存分析"
                    className={`w-full px-3 py-2 rounded-lg text-sm ${
                      isDark
                        ? 'bg-slate-800 border border-slate-700 text-text-primary placeholder-slate-500'
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    描述（可选）
                  </label>
                  <textarea
                    value={newTemplateDesc}
                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                    placeholder="简要描述这个查询的用途"
                    rows={3}
                    className={`w-full px-3 py-2 rounded-lg text-sm resize-none ${
                      isDark
                        ? 'bg-slate-800 border border-slate-700 text-text-primary placeholder-slate-500'
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                </div>

                <div className={`p-3 rounded-lg text-xs ${
                  isDark
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <div className="font-medium mb-1">查询内容：</div>
                  <div className={`line-clamp-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {currentQuery || '无'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCreateTemplate}
                    disabled={!newTemplateName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setShowSaveDialog(false)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDark
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    取消
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default QueryTemplatesPanel
