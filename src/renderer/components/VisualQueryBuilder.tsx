/**
 * 可视化查询构建器
 * 无 AI 时也能像 Metabase 一样点点点就能分析数据
 */

import { useState, useEffect, useCallback } from 'react'
import { DatabaseConfig } from '../../shared/types'
import { QueryResult } from '../../shared/types/query'
import { cn } from '../lib/utils'
import { showToast } from '../lib/download'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import {
  Play,
  Columns3,
  Filter,
  BarChart3,
  ArrowUpDown,
  X,
  Plus,
  ChevronDown,
  ChevronRight,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  Sigma,
  ListOrdered,
} from 'lucide-react'

// ─── 类型 ────────────────────────────────────────────────────────────────────

export type AggFn = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT_DISTINCT'
export type FilterOp = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'IS_NULL' | 'IS_NOT_NULL'
export type ColType = 'number' | 'string' | 'date' | 'boolean' | 'id' | 'unknown'

export interface QueryColumn {
  name: string
  type: ColType
  displayName: string
  aggFn: AggFn | null   // null = 不聚合，直接显示
  alias: string
}

export interface FilterCondition {
  id: string
  field: string
  operator: FilterOp
  value: string
}

export interface SortItem {
  field: string
  direction: 'ASC' | 'DESC'
}

interface Props {
  db: DatabaseConfig
  tableName: string
  columns: string[]
  onResult: (result: QueryResult) => void
  onError: (msg: string) => void
  onLoading: (loading: boolean, stage?: string) => void
}

// ─── 工具函数 ────────────────────────────────────────────────────────────────

function guessColType(name: string): ColType {
  const n = name.toLowerCase()
  if (/^(id|_id)$/.test(n) || n.endsWith('_id')) return 'id'
  if (/^(amount|price|count|total|sum|avg|max|min|num|qty|stock)$/i.test(n)) return 'number'
  if (/^(date|at|time|created|updated|deleted)$/i.test(n)) return 'date'
  if (/^(is_|has_|is|active|enabled)$/i.test(n)) return 'boolean'
  return 'string'
}

function aggLabel(fn: AggFn): string {
  return { COUNT: '计数', SUM: '求和', AVG: '均值', MIN: '最小', MAX: '最大', COUNT_DISTINCT: '去重计数' }[fn]
}

function aggIcon(fn: AggFn) {
  if (fn === 'COUNT' || fn === 'COUNT_DISTINCT') return <Hash className="h-3 w-3" />
  if (fn === 'SUM') return <Plus className="h-3 w-3" />
  if (fn === 'AVG') return <Sigma className="h-3 w-3" />
  if (fn === 'MIN' || fn === 'MAX') return <ArrowUpDown className="h-3 w-3" />
  return null
}

// 根据字段类型返回可用的聚合函数
function availableAggs(type: ColType): AggFn[] {
  if (type === 'number') return ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']
  if (type === 'id') return ['COUNT', 'COUNT_DISTINCT']
  return ['COUNT', 'COUNT_DISTINCT']
}

const ALL_AGGS: AggFn[] = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COUNT_DISTINCT']

const OP_LABELS: Record<FilterOp, string> = {
  '=': '等于', '!=': '不等于', '>': '大于', '<': '小于',
  '>=': '大于等于', '<=': '小于等于', 'LIKE': '包含', 'IN': '在...中',
  'IS_NULL': '为空', 'IS_NOT_NULL': '不为空',
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────

export function VisualQueryBuilder({ db, tableName, columns, onResult, onError, onLoading }: Props) {
  const [selectedCols, setSelectedCols] = useState<QueryColumn[]>([])
  const [groupBy, setGroupBy] = useState<string[]>([])
  const [filters, setFilters] = useState<FilterCondition[]>([])
  const [sorts, setSorts] = useState<SortItem[]>([])
  const [limit, setLimit] = useState(100)
  const [expandedCol, setExpandedCol] = useState<string | null>(null)

  // 初始化：默认选所有列，不聚合
  useEffect(() => {
    setSelectedCols(
      columns.map(c => ({
        name: c,
        type: guessColType(c),
        displayName: c,
        aggFn: null,
        alias: c,
      }))
    )
    setGroupBy([])
    setFilters([])
    setSorts([])
    setLimit(100)
  }, [tableName, columns])

  // ── 生成 SQL ───────────────────────────────────────────────────────────────

  const buildSQL = useCallback((): string => {
    const hasAgg = selectedCols.some(c => c.aggFn !== null)
    const isSimple = !hasAgg && groupBy.length === 0

    // SELECT 子句
    const selectParts: string[] = []
    selectedCols.forEach(col => {
      if (col.aggFn === 'COUNT' && col.name === '*') {
        selectParts.push(`COUNT(*) AS \`${col.alias}\``)
      } else if (col.aggFn === 'COUNT_DISTINCT') {
        selectParts.push(`COUNT(DISTINCT \`${col.name}\`) AS \`${col.alias}\``)
      } else if (col.aggFn === 'COUNT') {
        selectParts.push(`COUNT(\`${col.name}\`) AS \`${col.alias}\``)
      } else if (col.aggFn) {
        selectParts.push(`${col.aggFn}(\`${col.name}\`) AS \`${col.alias}\``)
      } else {
        selectParts.push(`\`${col.name}\``)
      }
    })

    let sql = `SELECT ${selectParts.join(', ')}\nFROM \`${tableName}\``

    // WHERE
    const whereClauses: string[] = []
    filters.forEach(f => {
      if (f.operator === 'IS_NULL') whereClauses.push(`\`${f.field}\` IS NULL`)
      else if (f.operator === 'IS_NOT_NULL') whereClauses.push(`\`${f.field}\` IS NOT NULL`)
      else if (f.operator === 'LIKE') whereClauses.push(`\`${f.field}\` LIKE '%${f.value}%'`)
      else if (f.operator === 'IN') whereClauses.push(`\`${f.field}\` IN (${f.value})`)
      else whereClauses.push(`\`${f.field}\` ${f.operator} '${f.value}'`)
    })
    if (whereClauses.length > 0) sql += `\nWHERE ${whereClauses.join(' AND ')}`

    // GROUP BY
    if (groupBy.length > 0) {
      sql += `\nGROUP BY ${groupBy.map(f => `\`${f}\``).join(', ')}`
    }

    // ORDER BY
    if (sorts.length > 0) {
      sql += `\nORDER BY ${sorts.map(s => `\`${s.field}\` ${s.direction}`).join(', ')}`
    }

    // LIMIT
    sql += `\nLIMIT ${limit}`

    return sql
  }, [selectedCols, groupBy, filters, sorts, tableName, limit])

  // ── 执行查询 ────────────────────────────────────────────────────────────────

  const runQuery = async () => {
    if (selectedCols.length === 0) {
      onError('请至少选择一个字段')
      return
    }
    const sql = buildSQL()
    onLoading(true, '正在查询…')
    try {
      const result = await (window as any).electronAPI.database.query(db, sql)
      if (!result.success) {
        throw new Error(result.message || result.error || '查询失败')
      }
      const data = result.data || result
      onResult({
        columns: data.columns || [],
        rows: data.rows || [],
        rowCount: data.rowCount ?? (data.rows?.length || 0),
        duration: 0,
        sql,
      })
    } catch (err: any) {
      onError(err?.message || '查询失败')
    } finally {
      onLoading(false)
    }
  }

  // ── 快捷操作 ───────────────────────────────────────────────────────────────

  const addQuickFilter = (field: string, op: FilterOp, value: string) => {
    if (!filters.find(f => f.field === field && f.operator === op && f.value === value)) {
      setFilters(prev => [...prev, { id: crypto.randomUUID(), field, operator: op, value }])
    }
  }

  const addQuickAgg = (field: string, aggFn: AggFn) => {
    setSelectedCols(prev => prev.map(c =>
      c.name === field ? { ...c, aggFn, alias: `${aggFn === 'COUNT' ? 'count' : aggFn.toLowerCase()}_${c.name}` } : c
    ))
  }

  const addGroupBy = (field: string) => {
    if (!groupBy.includes(field)) setGroupBy(prev => [...prev, field])
  }

  // ── 列类型图标 ──────────────────────────────────────────────────────────────

  const typeIcon = (type: ColType) => {
    if (type === 'number') return <Hash className="h-3 w-3 text-blue-500" />
    if (type === 'date') return <Calendar className="h-3 w-3 text-purple-500" />
    if (type === 'boolean') return <ToggleLeft className="h-3 w-3 text-green-500" />
    return <Type className="h-3 w-3 text-muted-foreground" />
  }

  const typeBadge = (type: ColType) => {
    const map: Record<ColType, { label: string; cls: string }> = {
      number: { label: '数值', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      date: { label: '日期', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
      boolean: { label: '布尔', cls: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
      id: { label: 'ID', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
      string: { label: '文本', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
      unknown: { label: '未知', cls: 'bg-gray-100 text-gray-500' },
    }
    const t = map[type]
    return <span className={cn('text-[10px] px-1 py-0.5 rounded font-medium', t.cls)}>{t.label}</span>
  }

  // ─── 渲染 ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* 顶部：表名 + 执行按钮 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">📊 可视化查询</span>
          <Badge variant="outline" className="text-xs font-mono">{tableName}</Badge>
          <span className="text-xs text-muted-foreground">{columns.length} 个字段</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Limit:</span>
            <input
              type="number"
              value={limit}
              onChange={e => setLimit(Math.max(1, parseInt(e.target.value) || 100))}
              className="w-16 px-2 py-1 rounded border bg-background text-xs text-center"
              min={1}
              max={10000}
            />
          </div>
          <Button size="sm" onClick={runQuery} className="gap-1.5">
            <Play className="h-3.5 w-3.5" />
            执行查询
          </Button>
        </div>
      </div>

      {/* 字段选择区 */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b">
          <Columns3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">选择字段 & 聚合</span>
          {selectedCols.some(c => c.aggFn !== null) && (
            <span className="text-xs text-muted-foreground ml-1">（已选择聚合，启用分组统计）</span>
          )}
        </div>
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
          {selectedCols.map(col => (
            <div key={col.name}>
              {/* 主行：字段名 + 快捷操作 */}
              <div
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors',
                  selectedCols.includes(col) && 'border-primary bg-primary/5',
                )}
              >
                {typeIcon(col.type)}
                <span className="text-xs font-mono flex-1 truncate">{col.name}</span>
                {typeBadge(col.type)}

                {/* 快捷聚合按钮（只对数值/id 显示） */}
                {availableAggs(col.type).length > 2 && (
                  <div className="flex items-center gap-0.5">
                    {['COUNT', 'SUM'].map(fn => (
                      <button
                        key={fn}
                        onClick={() => addQuickAgg(col.name, fn as AggFn)}
                        title={aggLabel(fn as AggFn)}
                        className={cn(
                          'px-1 py-0.5 rounded text-[10px] font-medium transition-colors',
                          col.aggFn === fn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        )}
                      >
                        {fn}
                      </button>
                    ))}
                  </div>
                )}

                {/* 展开详情 */}
                <button
                  onClick={() => setExpandedCol(expandedCol === col.name ? null : col.name)}
                  className="p-0.5 rounded hover:bg-muted"
                >
                  {expandedCol === col.name
                    ? <ChevronDown className="h-3 w-3" />
                    : <ChevronRight className="h-3 w-3" />
                  }
                </button>
              </div>

              {/* 展开：完整聚合选项 + 快捷过滤/分组 */}
              {expandedCol === col.name && (
                <div className="mt-1 p-2 rounded-lg border bg-background space-y-2">
                  {/* 聚合函数 */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium">聚合方式</p>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => setSelectedCols(prev => prev.map(c => c.name === col.name ? { ...c, aggFn: null, alias: c.name } : c))}
                        className={cn('px-1.5 py-0.5 rounded text-[10px]', col.aggFn === null ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}
                      >
                        不聚合
                      </button>
                      {ALL_AGGS.map(fn => (
                        availableAggs(col.type).includes(fn) && (
                          <button
                            key={fn}
                            onClick={() => setSelectedCols(prev => prev.map(c =>
                              c.name === col.name ? { ...c, aggFn: fn, alias: `${fn === 'COUNT' ? 'count' : fn.toLowerCase()}_${c.name}` } : c
                            ))}
                            className={cn('px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5',
                              col.aggFn === fn ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                            )}
                          >
                            {aggIcon(fn)}{aggLabel(fn)}
                          </button>
                        )
                      ))}
                    </div>
                  </div>

                  {/* 快捷过滤 */}
                  {col.type === 'string' && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1 font-medium">快捷筛选</p>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { op: '!=' as FilterOp, val: '' },
                          { op: 'LIKE' as FilterOp, val: '' },
                        ].map(({ op, val }, i) => (
                          <button
                            key={i}
                            onClick={() => addQuickFilter(col.name, op, val)}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-muted hover:bg-muted/80"
                          >
                            {OP_LABELS[op]} {col.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {col.type === 'number' && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1 font-medium">快捷筛选</p>
                      <div className="flex flex-wrap gap-1">
                        {(['>', '<', '>=', '<='] as FilterOp[]).map(op => (
                          <button
                            key={op}
                            onClick={() => {
                              const val = prompt(`输入 ${col.name} ${OP_LABELS[op]} 的值：`)
                              if (val) addQuickFilter(col.name, op, val)
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-muted hover:bg-muted/80"
                          >
                            {OP_LABELS[op]} ?
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 加入分组 */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium">分析维度</p>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => addGroupBy(col.name)}
                        className={cn('px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5',
                          groupBy.includes(col.name) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                        )}
                      >
                        <ListOrdered className="h-2.5 w-2.5" />
                        加入分组
                      </button>
                      {!groupBy.includes(col.name) && (
                        <button
                          onClick={() => setSorts(prev => [...prev, { field: col.name, direction: 'DESC' }])}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-muted hover:bg-muted/80 flex items-center gap-0.5"
                        >
                          <ArrowUpDown className="h-2.5 w-2.5" /> 降序
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 分组栏 */}
      {groupBy.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">分组维度</span>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {groupBy.map(field => (
              <div key={field} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                <ListOrdered className="h-3 w-3 text-primary" />
                <span className="text-xs font-mono">{field}</span>
                <button
                  onClick={() => setGroupBy(prev => prev.filter(f => f !== field))}
                  className="p-0.5 rounded hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setGroupBy([])}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              清除全部
            </button>
          </div>
        </div>
      )}

      {/* 筛选栏 */}
      {filters.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">筛选条件</span>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {filters.map(f => (
              <div key={f.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted border">
                <span className="text-xs font-mono">{f.field}</span>
                <span className="text-xs text-muted-foreground">{OP_LABELS[f.operator]}</span>
                {f.operator !== 'IS_NULL' && f.operator !== 'IS_NOT_NULL' && (
                  <span className="text-xs font-medium">"{f.value}"</span>
                )}
                <button
                  onClick={() => setFilters(prev => prev.filter(ff => ff.id !== f.id))}
                  className="p-0.5 rounded hover:bg-background"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setFilters([])}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              清除全部
            </button>
          </div>
        </div>
      )}

      {/* 排序栏 */}
      {sorts.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">排序</span>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {sorts.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted border">
                <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-mono">{s.field}</span>
                <span className="text-xs text-muted-foreground">{s.direction}</span>
                <button
                  onClick={() => setSorts(prev => prev.filter((_, ii) => ii !== i))}
                  className="p-0.5 rounded hover:bg-background"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setSorts([])}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              清除全部
            </button>
          </div>
        </div>
      )}

      {/* SQL 预览 */}
      <details className="rounded-xl border bg-card">
        <summary className="px-4 py-2.5 cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none">
          SQL 预览
        </summary>
        <pre className="px-4 pb-3 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
          {buildSQL()}
        </pre>
      </details>
    </div>
  )
}
