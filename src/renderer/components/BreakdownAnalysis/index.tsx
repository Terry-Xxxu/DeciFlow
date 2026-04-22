/**
 * 拆解分析展示组件
 * 显示按渠道/平台/用户类型的拆解结果
 */

import React, { useState } from 'react'
import { AlertTriangle, Lightbulb, Target, BarChart3 } from 'lucide-react'
import { formatNumber, formatPercent } from '../../utils/format'

interface BreakdownValue {
  key: string
  label?: string
  value: number
  changePercent: number
  contribution: number  // 对总变化的贡献度
}

interface BreakdownData {
  dimension: string
  dimensionLabel: string
  values: BreakdownValue[]
}

interface BreakdownAnalysisProps {
  metricName: string
  totalChange: number
  totalChangePercent: number
  breakdowns: BreakdownData[]
}

export function BreakdownAnalysis({ metricName, totalChange, totalChangePercent, breakdowns }: BreakdownAnalysisProps) {
  const [selectedDimension, setSelectedDimension] = useState<string>(breakdowns[0]?.dimension || '')

  const selectedBreakdown = breakdowns.find(b => b.dimension === selectedDimension)

  // 判断变化是好是坏
  const isPositive = totalChange >= 0
  const changeColor = isPositive ? 'text-green-400' : 'text-red-400'
  const changeIcon = isPositive ? '↑' : '↓'

  return (
    <div className="space-y-6">
      {/* 主指标概览 */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-slate-200">{metricName}</h3>
            <p className="text-slate-400 text-sm mt-1">主指标变化</p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${changeColor}`}>
              {changeIcon} {formatPercent(Math.abs(totalChangePercent))}
            </div>
            <div className="text-slate-400 text-sm mt-1">
              {isPositive ? '+' : ''}{formatNumber(totalChange, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* 维度选择 */}
      {breakdowns.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {breakdowns.map((breakdown) => (
            <button
              key={breakdown.dimension}
              onClick={() => setSelectedDimension(breakdown.dimension)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedDimension === breakdown.dimension
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              按{breakdown.dimensionLabel}拆解
            </button>
          ))}
        </div>
      )}

      {/* 拆解详情 */}
      {selectedBreakdown && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h4 className="font-medium text-slate-200">按【{selectedBreakdown.dimensionLabel}】拆解</h4>
          </div>

          <div className="divide-y divide-slate-700">
            {selectedBreakdown.values
              .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
              .map((value, index) => {
                const valueIsPositive = value.changePercent >= 0
                const valueChangeColor = valueIsPositive ? 'text-green-400' : 'text-red-400'
                const isMaxChange = index === 0

                // 计算条形图宽度
                const maxContribution = Math.max(...selectedBreakdown.values.map(v => Math.abs(v.contribution)))
                const barWidth = maxContribution > 0 ? (Math.abs(value.contribution) / maxContribution) * 100 : 0

                return (
                  <div key={value.key} className={`px-6 py-4 ${isMaxChange ? 'bg-blue-500/5' : ''}`}>
                    <div className="flex items-center gap-4">
                      {/* 维度值 */}
                      <div className="w-32 flex-shrink-0">
                        <div className="font-medium text-slate-200">{value.label || value.key}</div>
                        {isMaxChange && (
                          <span className="text-xs text-amber-400 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> 变化最大</span>
                        )}
                      </div>

                      {/* 数值 */}
                      <div className="w-24 text-right flex-shrink-0">
                        <div className="text-lg font-semibold text-slate-200">{formatNumber(value.value)}</div>
                        <div className={`text-sm font-medium ${valueChangeColor}`}>
                          {valueIsPositive ? '+' : ''}{formatPercent(value.changePercent)}
                        </div>
                      </div>

                      {/* 贡献度条形图 */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-500">贡献度</span>
                          <span className={`text-sm font-medium ${isMaxChange ? 'text-amber-400' : 'text-slate-300'}`}>
                            {value.contribution > 0 ? '+' : ''}{formatPercent(value.contribution)}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${value.contribution > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* 洞察提示 */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex gap-3">
          <Lightbulb className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="font-medium text-blue-300 mb-1">拆解分析洞察</h5>
            <p className="text-sm text-slate-300">
              {breakdowns[0]?.values[0] && (
                <>
                  <span className="font-medium">{breakdowns[0].values[0].label || breakdowns[0].values[0].key}</span>
                  对总变化的贡献最大（{breakdowns[0].values[0].contribution > 0 ? '+' : ''}
                  {formatPercent(breakdowns[0].values[0].contribution)}%），
                  {breakdowns[0].values[0].changePercent > 0 ? '推动了' : '拖累了'}整体{isPositive ? '增长' : '下降'}。
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 建议操作 */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h5 className="font-medium text-slate-200 mb-3 flex items-center gap-1.5"><Target className="w-4 h-4 text-blue-400" />建议操作</h5>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <span className="text-red-400 font-bold">P0</span>
            <span className="text-slate-300">
              重点关注 <span className="font-medium text-slate-200">{breakdowns[0]?.values[0]?.label}</span> 的变化原因
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-amber-400 font-bold">P1</span>
            <span className="text-slate-300">
              分析其他维度表现，找出可复制的成功经验
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// 拆解 SQL 生成器组件
export function BreakdownSQLGenerator({
  metricName,
  tableName,
  dateField,
  onGenerate
}: {
  metricName: string
  tableName: string
  dateField: string
  onGenerate: (sql: string, description: string) => void
}) {
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async (dimension: string) => {
    setGenerating(true)
    try {
      const result = await window.electronAPI.insights.breakdownSQL(metricName, tableName, dateField)
      if (result.success) {
        const sqlData = result.data.find((d: any) => d.dimension === dimension)
        if (sqlData) {
          onGenerate(sqlData.sql, sqlData.description)
        }
      }
    } catch (error) {
      console.error('生成拆解 SQL 失败:', error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <h5 className="font-medium text-slate-200 mb-3 flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-slate-400" />生成分析 SQL</h5>
      <p className="text-sm text-slate-400 mb-4">选择维度自动生成拆解分析 SQL</p>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handleGenerate('channel')}
          disabled={generating}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          按渠道拆解
        </button>
        <button
          onClick={() => handleGenerate('platform')}
          disabled={generating}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          按平台拆解
        </button>
        <button
          onClick={() => handleGenerate('user_type')}
          disabled={generating}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          按用户类型拆解
        </button>
      </div>

      {generating && (
        <div className="mt-4 text-center text-sm text-slate-400">
          正在生成 SQL...
        </div>
      )}
    </div>
  )
}
