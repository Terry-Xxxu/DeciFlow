/**
 * 数据字典管理组件
 * 支持查看、编辑、新增指标、字段、维度
 */

import React, { useState, useEffect } from 'react'

interface Metric {
  id: string
  name: string
  description: string
  category: string
  table: string
  sql: string
  timeField: string
  dimensions: string[]
  unit?: string
  createdBy: string
}

interface Field {
  table: string
  column: string
  description: string
  dataType: string
  businessMeaning: string
  sampleValues?: string[]
  tags?: string[]
}

interface Dimension {
  id: string
  name: string
  field: string
  table: string
  description: string
  values?: Array<{ key: string; label: string; description?: string }>
}

type TabType = 'metrics' | 'fields' | 'dimensions'

export function DataDictionary() {
  const [activeTab, setActiveTab] = useState<TabType>('metrics')
  const [searchKeyword, setSearchKeyword] = useState('')

  // 指标相关
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null)
  const [showMetricModal, setShowMetricModal] = useState(false)

  // 字段相关
  const [fields, setFields] = useState<Field[]>([])
  const [selectedField, setSelectedField] = useState<Field | null>(null)
  const [showFieldModal, setShowFieldModal] = useState(false)

  // 维度相关
  const [dimensions, setDimensions] = useState<Dimension[]>([])
  const [selectedDimension, setSelectedDimension] = useState<Dimension | null>(null)

  // 加载数据
  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      if (activeTab === 'metrics') {
        const result = await window.electronAPI.dictionary.metrics.getAll()
        if (result.success) {
          setMetrics(result.data)
        }
      } else if (activeTab === 'fields') {
        const result = await window.electronAPI.dictionary.fields.getAll()
        if (result.success) {
          setFields(result.data)
        }
      } else if (activeTab === 'dimensions') {
        const result = await window.electronAPI.dictionary.dimensions.getAll()
        if (result.success) {
          setDimensions(result.data)
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  // 搜索
  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      loadData()
      return
    }

    try {
      if (activeTab === 'metrics') {
        const result = await window.electronAPI.dictionary.metrics.search(searchKeyword)
        if (result.success) {
          setMetrics(result.data)
        }
      } else if (activeTab === 'fields') {
        const result = await window.electronAPI.dictionary.fields.search(searchKeyword)
        if (result.success) {
          setFields(result.data)
        }
      }
    } catch (error) {
      console.error('搜索失败:', error)
    }
  }

  // 删除指标
  const handleDeleteMetric = async (id: string) => {
    if (!confirm('确定要删除这个指标吗？')) return

    try {
      const result = await window.electronAPI.dictionary.metrics.delete(id)
      if (result.success) {
        loadData()
      }
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  // 更新字段
  const handleUpdateField = async (table: string, column: string, updates: Partial<Field>) => {
    try {
      const result = await window.electronAPI.dictionary.fields.update(table, column, updates)
      if (result.success) {
        loadData()
        setShowFieldModal(false)
      }
    } catch (error) {
      console.error('更新失败:', error)
    }
  }

  // 类别颜色
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      growth: 'bg-blue-500/20 text-blue-300',
      retention: 'bg-green-500/20 text-green-300',
      conversion: 'bg-purple-500/20 text-purple-300',
      revenue: 'bg-yellow-500/20 text-yellow-300',
      custom: 'bg-gray-500/20 text-gray-300',
    }
    return colors[category] || colors.custom
  }

  return (
    <div className="h-full flex">
      {/* 左侧列表 */}
      <div className="w-96 bg-slate-800/50 border-r border-slate-700 flex flex-col">
        {/* Tab 切换 */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'metrics'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            📊 指标
          </button>
          <button
            onClick={() => setActiveTab('fields')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'fields'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            📋 字段
          </button>
          <button
            onClick={() => setActiveTab('dimensions')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'dimensions'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            📐 维度
          </button>
        </div>

        {/* 搜索框 */}
        <div className="p-3 border-b border-slate-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索..."
              className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              🔍
            </button>
          </div>
        </div>

        {/* 列表内容 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {activeTab === 'metrics' && (
            <>
              {metrics.map((metric) => (
                <div
                  key={metric.id}
                  onClick={() => setSelectedMetric(metric)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedMetric?.id === metric.id
                      ? 'bg-blue-600/30 border border-blue-500'
                      : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200 truncate">{metric.name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getCategoryColor(metric.category)}`}>
                          {metric.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{metric.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {activeTab === 'fields' && (
            <>
              {fields.map((field, index) => (
                <div
                  key={`${field.table}.${field.column}`}
                  onClick={() => setSelectedField(field)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedField?.table === field.table && selectedField?.column === field.column
                      ? 'bg-blue-600/30 border border-blue-500'
                      : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
                  }`}
                >
                  <div className="font-medium text-slate-200">{field.column}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {field.table} · {field.dataType}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 line-clamp-2">{field.description}</div>
                </div>
              ))}
            </>
          )}

          {activeTab === 'dimensions' && (
            <>
              {dimensions.map((dimension) => (
                <div
                  key={dimension.id}
                  onClick={() => setSelectedDimension(dimension)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedDimension?.id === dimension.id
                      ? 'bg-blue-600/30 border border-blue-500'
                      : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
                  }`}
                >
                  <div className="font-medium text-slate-200">{dimension.name}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {dimension.table}.{dimension.field}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{dimension.description}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'metrics' && selectedMetric && (
          <MetricDetail metric={selectedMetric} onEdit={() => setShowMetricModal(true)} onDelete={() => handleDeleteMetric(selectedMetric.id)} />
        )}

        {activeTab === 'fields' && selectedField && (
          <FieldDetail field={selectedField} onEdit={() => setShowFieldModal(true)} />
        )}

        {activeTab === 'dimensions' && selectedDimension && (
          <DimensionDetail dimension={selectedDimension} />
        )}

        {(!selectedMetric && !selectedField && !selectedDimension) && (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <div className="text-4xl mb-2">📖</div>
              <div>选择左侧项目查看详情</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 指标详情组件
function MetricDetail({ metric, onEdit, onDelete }: { metric: Metric; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">{metric.name}</h2>
          <p className="text-slate-400 mt-1">{metric.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            编辑
          </button>
          {metric.createdBy === 'user' && (
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              删除
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* 基本信息 */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3">基本信息</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">类别：</span>
              <span className={`px-2 py-1 rounded-full text-xs ${metric.createdBy === 'system' ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'}`}>
                {metric.category}
              </span>
            </div>
            <div>
              <span className="text-slate-500">单位：</span>
              <span className="text-slate-300">{metric.unit || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500">数据表：</span>
              <code className="px-2 py-1 bg-slate-700 rounded text-blue-300">{metric.table}</code>
            </div>
            <div>
              <span className="text-slate-500">时间字段：</span>
              <code className="px-2 py-1 bg-slate-700 rounded text-blue-300">{metric.timeField}</code>
            </div>
          </div>
        </div>

        {/* SQL 定义 */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3">SQL 计算</h3>
          <pre className="bg-slate-900 rounded p-3 text-sm text-green-400 overflow-x-auto">
            {metric.sql}
          </pre>
        </div>

        {/* 可用维度 */}
        {metric.dimensions && metric.dimensions.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-medium text-slate-300 mb-3">可用维度</h3>
            <div className="flex flex-wrap gap-2">
              {metric.dimensions.map((dim) => (
                <span key={dim} className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">
                  {dim}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 字段详情组件
function FieldDetail({ field, onEdit }: { field: Field; onEdit: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">{field.column}</h2>
          <p className="text-slate-400 mt-1">{field.table}</p>
        </div>
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          编辑描述
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3">字段信息</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-500">数据类型：</span>
              <code className="px-2 py-1 bg-slate-700 rounded text-blue-300">{field.dataType}</code>
            </div>
            <div>
              <span className="text-slate-500">字段描述：</span>
              <span className="text-slate-300">{field.description}</span>
            </div>
            <div>
              <span className="text-slate-500">业务含义：</span>
              <span className="text-slate-300">{field.businessMeaning}</span>
            </div>
          </div>
        </div>

        {field.sampleValues && field.sampleValues.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-medium text-slate-300 mb-3">示例值</h3>
            <div className="flex flex-wrap gap-2">
              {field.sampleValues.map((value, index) => (
                <code key={index} className="px-3 py-1 bg-slate-700 rounded text-sm text-slate-300">
                  {value}
                </code>
              ))}
            </div>
          </div>
        )}

        {field.tags && field.tags.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-medium text-slate-300 mb-3">标签</h3>
            <div className="flex flex-wrap gap-2">
              {field.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 维度详情组件
function DimensionDetail({ dimension }: { dimension: Dimension }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-100">{dimension.name}</h2>
        <p className="text-slate-400 mt-1">{dimension.description}</p>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3">维度信息</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-500">字段：</span>
              <code className="px-2 py-1 bg-slate-700 rounded text-blue-300">
                {dimension.table}.{dimension.field}
              </code>
            </div>
          </div>
        </div>

        {dimension.values && dimension.values.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-medium text-slate-300 mb-3">可选值</h3>
            <div className="space-y-2">
              {dimension.values.map((value) => (
                <div key={value.key} className="flex items-center gap-3 p-2 bg-slate-700/50 rounded">
                  <code className="px-2 py-1 bg-slate-700 rounded text-blue-300">{value.key}</code>
                  <span className="text-slate-300">{value.label}</span>
                  {value.description && (
                    <span className="text-slate-500 text-sm">· {value.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
