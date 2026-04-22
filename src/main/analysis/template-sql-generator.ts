/**
 * 分析模板 SQL 生成器
 * 根据识别到的表类型和列信息，为每个分析模板生成对应的 SQL
 */

import { TableSchemaAnalysisResult, ColumnInfo } from './table-schema-analyzer'

export interface GeneratedAnalysis {
  sql: string
  title: string
  description: string
  charts: ChartSuggestion[]
  sqls?: string[]  // 多条 SQL（子查询）
}

export interface ChartSuggestion {
  type: 'line' | 'bar' | 'pie' | 'table' | 'number'
  xAxis?: string
  yAxis?: string
  valueField?: string
  labelField?: string
}

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

function findColumn(columns: ColumnInfo[], patterns: string[]): ColumnInfo | undefined {
  return columns.find(c => patterns.some(p => c.name.toLowerCase().includes(p)))
}

function findNumericColumn(columns: ColumnInfo[], preferred?: string[]): ColumnInfo | undefined {
  if (preferred) {
    const found = findColumn(columns, preferred)
    if (found) return found
  }
  return columns.find(c => c.inferredType === 'number')
}

function findDateColumn(columns: ColumnInfo[]): ColumnInfo | undefined {
  return columns.find(c =>
    c.inferredType === 'date' ||
    /(^|_)(date|time|at|created|updated|timestamp|period|dt|day|month|year|week)(_|$)/i.test(c.name) ||
    /(date|time|created|updated|login|logout|registered|sign|join|leave)[_]?[at]?$/i.test(c.name)
  )
}

function findUserIdColumn(columns: ColumnInfo[]): ColumnInfo | undefined {
  return columns.find(c =>
    c.inferredType === 'id' ||
    /(^|_)(user|member|customer|client|account|visitor|player)(_?)(id|num|no)?$/i.test(c.name) ||
    /^(uid|uuid|user_no|cust_no|account_id)$/i.test(c.name)
  )
}

function findCategoryColumn(columns: ColumnInfo[]): ColumnInfo | undefined {
  return columns.find(c =>
    /(^|_)(category|type|channel|status|tag|source|medium|platform|region|city|industry|segment|layer|level|grade|class|group|kind|sort|genre|payment_method|pay_method)(_|$)/i.test(c.name) ||
    /^(country|city|province|state|area|zone|industry|segment)$/i.test(c.name)
  )
}

function findAmountColumn(columns: ColumnInfo[]): ColumnInfo | undefined {
  return findNumericColumn(columns, [
    'amount', 'amt', 'total', 'price', 'cost', 'fee', 'revenue', 'income',
    'sales', 'gmv', 'volume', 'vlm', 'tvl', 'profit', 'expense', 'budget',
    'balance', 'margin', 'tax', 'charge', 'payment', 'pay', 'subtotal', 'discount',
    'order_amount', 'order_total', 'product_price', 'item_price',
  ])
}

function findEventColumn(columns: ColumnInfo[]): ColumnInfo | undefined {
  return columns.find(c =>
    /(^|_)(event|action|behavior|activity|funnel|step|stage|trigger|method|page|click|view|browse)(_|$)/i.test(c.name) ||
    /^(page_name|page_url|event_name|action_type)$/i.test(c.name)
  )
}

function findProductColumn(columns: ColumnInfo[]): ColumnInfo | undefined {
  return columns.find(c =>
    /(^|_)(product|item|sku|goods|article|content|post|page|title|name)(_|$)/i.test(c.name) ||
    /^(product_name|item_name|goods_name|article_title|product_id|sku)$/i.test(c.name)
  )
}

function findStatusColumn(columns: ColumnInfo[]): ColumnInfo | undefined {
  return columns.find(c =>
    /status|state|step|stage|result|flag|condition|is_/.test(c.name.toLowerCase())
  )
}

function findPaymentColumn(columns: ColumnInfo[]): ColumnInfo | undefined {
  return columns.find(c =>
    /payment|method|pay|bank|card|wallet|currency/i.test(c.name.toLowerCase())
  )
}

// ─── JS 聚合：处理 CSV 引擎不支持的时间类分析 ──────────────────────────────

/**
 * 按时间粒度聚合数据（智能选择 day / week / month）
 * @param rows 原始行数据
 * @param dateColName 日期列名
 * @param valueColName 数值列名（可选）
 * @param userColName 用户列名（可选，用于 COUNT DISTINCT）
 * @param options.showPeriodChange 是否显示环比变化
 * @param options.granularity 固定粒度，不传则自动检测
 * @param options.limit 返回条数上限
 */
export function aggregateByTime(
  rows: Record<string, any>[],
  dateColName: string,
  valueColName?: string,
  userColName?: string,
  options: {
    showPeriodChange?: boolean
    granularity?: 'day' | 'week' | 'month'
    limit?: number
  } = {}
): { columns: string[]; rows: Record<string, any>[]; rowCount: number } {
  const { showPeriodChange = false, granularity, limit = 30 } = options

  // 解析所有日期，找时间跨度
  const validRows = rows.filter(r => r[dateColName] != null && r[dateColName] !== '')
  const dates: Date[] = []
  for (const row of validRows) {
    const d = new Date(String(row[dateColName]))
    if (!isNaN(d.getTime())) dates.push(d)
  }
  if (dates.length === 0) {
    return { columns: ['period', 'value'], rows: [], rowCount: 0 }
  }
  dates.sort((a, b) => a.getTime() - b.getTime())
  const daySpan = Math.max(1, Math.round((dates[dates.length - 1].getTime() - dates[0].getTime()) / 86400000))

  // 自动粒度：<7天按天，<60天按周，否则按月
  const autoGran = daySpan < 7 ? 'day' : (daySpan < 60 ? 'week' : 'month')
  const gran = granularity || autoGran

  // 按粒度分组
  const groupMap = new Map<string, { sum: number; users: Set<string> }>()
  for (const row of validRows) {
    const d = new Date(String(row[dateColName]))
    if (isNaN(d.getTime())) continue
    let key: string
    if (gran === 'day') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    } else if (gran === 'week') {
      const dow = d.getDay()
      const diff = d.getDate() - dow + (dow === 0 ? -6 : 1)
      const ws = new Date(d); ws.setDate(diff)
      key = `${ws.getFullYear()}-W${String(Math.ceil(ws.getDate() / 7)).padStart(2, '0')}`
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    if (!groupMap.has(key)) groupMap.set(key, { sum: 0, users: new Set() })
    const bucket = groupMap.get(key)!
    if (valueColName) bucket.sum += Number(row[valueColName]) || 0
    if (userColName) bucket.users.add(String(row[userColName]))
    if (!valueColName && !userColName) bucket.sum += 1
  }

  let sorted = [...groupMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(0, limit)
  const colName = gran === 'day' ? 'date' : (gran === 'week' ? 'week' : 'month')

  let resultRows: Record<string, any>[]
  if (showPeriodChange) {
    resultRows = sorted.map(([period, data], i) => {
      const value = userColName ? data.users.size : data.sum
      const prevVal = i > 0 ? (userColName ? sorted[i - 1][1].users.size : sorted[i - 1][1].sum) : 0
      const change = prevVal > 0 ? Math.round((value - prevVal) / prevVal * 1000) / 10 : null
      return {
        period,
        value,
        change: change !== null ? `${change > 0 ? '+' : ''}${change}%` : null,
      }
    })
    return { columns: ['period', 'value', 'change'], rows: resultRows, rowCount: resultRows.length }
  }

  resultRows = sorted.map(([period, data]) => ({
    period,
    value: userColName ? data.users.size : data.sum,
  }))
  return { columns: ['period', 'value'], rows: resultRows, rowCount: resultRows.length }
}

/**
 * CSV 模式下，时间类模板需要 JS 聚合。给定模板ID、列信息和原始行，返回预聚合结果。
 * @returns 聚合后的 { columns, rows, rowCount }，或者 null（由调用方走 SQL）
 */
export function tryAggregateForTemplate(
  templateId: string,
  columns: ColumnInfo[],
  rows: Record<string, any>[],
  dbType: string
): { columns: string[]; rows: Record<string, any>[]; rowCount: number } | null {
  if (!isFileDb(dbType) || rows.length === 0) return null

  const dateCol = findDateColumn(columns)
  const amountCol = findAmountColumn(columns)
  const userCol = findUserIdColumn(columns)
  const numCol = findNumericColumn(columns)

  switch (templateId) {
    case 'revenue_trend':
      if (dateCol && amountCol) {
        return aggregateByTime(rows, dateCol.name, amountCol.name, undefined, { limit: 20 })
      }
      if (dateCol) {
        return aggregateByTime(rows, dateCol.name, undefined, undefined, { limit: 20 })
      }
      break

    case 'time_series':
      if (dateCol) {
        const valCol = numCol ? numCol.name : undefined
        return aggregateByTime(rows, dateCol.name, valCol, undefined, { limit: 20 })
      }
      break

    case 'profit_trend':
      if (dateCol) {
        return aggregateByTime(rows, dateCol.name, amountCol?.name, undefined, { limit: 20 })
      }
      break

    case 'dau_wau_mau':
      if (dateCol && userCol) {
        return aggregateByTime(rows, dateCol.name, undefined, userCol.name, { limit: 20 })
      }
      if (dateCol) {
        return aggregateByTime(rows, dateCol.name, undefined, undefined, { limit: 20 })
      }
      break

    case 'growth_rate':
      if (dateCol) {
        const valCol = numCol ? numCol.name : undefined
        return aggregateByTime(rows, dateCol.name, valCol, undefined, { showPeriodChange: true, limit: 20 })
      }
      break

    default:
      return null
  }
  return null
}

function guessAlias(col: ColumnInfo): string {
  const n = col.name.toLowerCase()
  if (/user.*id|uid|member.*id/.test(n)) return '用户'
  if (/amount|price|revenue|income|cost|fee/.test(n)) return '金额'
  if (/channel|source|medium|platform/.test(n)) return '渠道'
  if (/city|region|province|area/.test(n)) return '城市'
  if (/status|state/.test(n)) return '状态'
  if (/date|time|created|updated/.test(n)) return '日期'
  if (/count|num|quantity/.test(n)) return '数量'
  return col.name
}

// ─── 单模板 SQL 生成器接口 ──────────────────────────────────────────────────

type Generator = (
  tableName: string,
  columns: ColumnInfo[],
  dbType?: string
) => GeneratedAnalysis | null

// 是否为文件数据库（使用简化 SQL）
function isFileDb(dbType?: string): boolean {
  return dbType === 'file'
}

// 文件数据库兼容：简化 SQL（去除 PostgreSQL 特有语法）
function fileSQL(sql: string): string {
  return sql
    .replace(/DATE\(`([^`]+)`\)/g, '$1')          // DATE(col) → col
    .replace(/DATE_TRUNC\('[^']+', `([^`]+)`\)/g, '$1') // DATE_TRUNC('month', col) → col
    .replace(/NOW\(\) - INTERVAL '[^']+'/g, '')    // NOW() - INTERVAL '30 days' → 移除
    .replace(/NOW\(\) - INTERVAL '[^']+'::INTERVAL/g, '') // 同上（pg 语法）
    .replace(/NOW\(\)/g, '')                       // NOW() → 移除
    .replace(/INTERVAL '[^']+'/g, '')              // INTERVAL '30 days' → 移除
    .replace(/`/g, '"')                            // 反引号 → 双引号（兼容文件解析器）
    .replace(/FILTER \(WHERE ([^)]+)\)/g, '')      // FILTER (WHERE ...) → 移除
    .replace(/OVER \(\)/g, '')                     // OVER () → 移除
    .replace(/OVER \(ORDER BY[^)]+\)/g, '')        // OVER (ORDER BY ...) → 移除
    .replace(/, \`\w+\`\) FILTER \(WHERE[^)]+\)/g, ', 0)') // 移除 FILTER 子句
}

// 检查 SQL 是否含有文件解析器不支持的语法
function hasUnsupportedFileSQL(sql: string): boolean {
  const unsupported = [
    /\bWITH\b/i,           // CTE (WITH AS)
    /\bOVER\s*\(/i,        // 窗口函数
    /\bLAG\s*\(/i,          // LAG 窗口函数
    /\bUNION\b/i,           // UNION / UNION ALL
    /\bSTDDEV\b/i,          // STDDEV 函数
    /\bEXTRACT\s*\(/i,      // EXTRACT 函数
    /\bNULLIF\s*\(/i,       // NULLIF 函数
    /::INTERVAL/,           // PostgreSQL :: 类型转换
  ]
  return unsupported.some(p => p.test(sql))
}

// ─── 生成器字典 ──────────────────────────────────────────────────────────────

const generators: Record<string, Generator> = {

  // ── 增长 ──────────────────────────────────────────────────────────────────

  user_growth_trend: (table, cols, dbType) => {
    const dateCol = findDateColumn(cols)
    if (!dateCol) return null
    const userCol = findUserIdColumn(cols)
    if (isFileDb(dbType)) {
      return {
        sql: userCol
          ? `SELECT "${dateCol.name}" AS name, COUNT("${userCol.name}") AS value
FROM "${table}"
WHERE "${dateCol.name}" IS NOT NULL
GROUP BY "${dateCol.name}"
ORDER BY "${dateCol.name}" ASC`
          : `SELECT "${dateCol.name}" AS name, COUNT(*) AS value
FROM "${table}"
WHERE "${dateCol.name}" IS NOT NULL
GROUP BY "${dateCol.name}"
ORDER BY "${dateCol.name}" ASC`,
        title: '用户增长趋势',
        description: '每日记录数随时间的变化走势',
        charts: [{ type: 'line', xAxis: 'name', yAxis: 'value' }],
      }
    }
    return {
      sql: userCol
        ? `SELECT DATE(\`${dateCol.name}\`) AS \`日期\`, COUNT(DISTINCT \`${userCol.name}\`) AS \`新增用户数\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` IS NOT NULL
GROUP BY DATE(\`${dateCol.name}\`)
ORDER BY \`日期\` ASC
LIMIT 365`
        : `SELECT DATE(\`${dateCol.name}\`) AS \`日期\`, COUNT(*) AS \`记录数\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` IS NOT NULL
GROUP BY DATE(\`${dateCol.name}\`)
ORDER BY \`日期\` ASC
LIMIT 365`,
      title: '用户增长趋势',
      description: '每日新增用户数随时间的变化走势',
      charts: [{ type: 'line', xAxis: '日期', yAxis: '新增用户数' }],
    }
  },

  dau_wau_mau: (table, cols, dbType) => {
    const dateCol = findDateColumn(cols)
    const userCol = findUserIdColumn(cols)
    if (!dateCol) return null
    // CSV 模式：用 JS 做 DAU（按天）/ WAU（按周）/ MAU（按月）
    if (isFileDb(dbType)) {
      if (userCol) {
        // DAU：每天有多少独立用户
        return {
          sql: `SELECT "${dateCol.name}", "${userCol.name}" FROM "${table}"`,
          title: '活跃用户趋势（DAU）',
          description: '每日/周/月活跃用户数变化（文件模式）',
          charts: [{ type: 'line', xAxis: 'period', yAxis: 'value' }],
        }
      }
      // 无用户列，按记录数统计
      return {
        sql: `SELECT "${dateCol.name}" FROM "${table}"`,
        title: '活跃记录趋势',
        description: '每日/周/月记录数变化（文件模式）',
        charts: [{ type: 'line', xAxis: 'period', yAxis: 'value' }],
      }
    }
    if (!userCol) return null
    return {
      sql: `SELECT
  DATE(\`${dateCol.name}\`) AS \`日期\`,
  COUNT(DISTINCT \`${userCol.name}\`) AS \`DAU\`,
  COUNT(DISTINCT \`${userCol.name}\`) FILTER (WHERE DATE(\`${dateCol.name}\`) >= DATE(\`${dateCol.name}\`) - INTERVAL '6 days') AS \`WAU\`,
  COUNT(DISTINCT \`${userCol.name}\`) FILTER (WHERE DATE(\`${dateCol.name}\`) >= DATE(\`${dateCol.name}\`) - INTERVAL '29 days') AS \`MAU\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '30 days'
GROUP BY DATE(\`${dateCol.name}\`)
ORDER BY \`日期\` ASC`,
      title: 'DAU/WAU/MAU',
      description: '日/周/月活跃用户数统计',
      charts: [
        { type: 'line', xAxis: '日期', yAxis: 'DAU' },
        { type: 'number', valueField: 'DAU', labelField: '日期' },
      ],
    }
  },

  new_user_acquisition: (table, cols) => {
    const dateCol = findDateColumn(cols)
    const channelCol = findCategoryColumn(cols)
    const userCol = findUserIdColumn(cols)
    if (!dateCol || !channelCol) return null
    return {
      sql: userCol
        ? `SELECT \`${channelCol.name}\` AS \`${guessAlias(channelCol)}\`, COUNT(DISTINCT \`${userCol.name}\`) AS \`新用户数\`
FROM \`${table}\`
WHERE \`${channelCol.name}\` IS NOT NULL
GROUP BY \`${channelCol.name}\`
ORDER BY \`新用户数\` DESC`
        : `SELECT \`${channelCol.name}\` AS \`${guessAlias(channelCol)}\`, COUNT(*) AS \`记录数\`
FROM \`${table}\`
WHERE \`${channelCol.name}\` IS NOT NULL
GROUP BY \`${channelCol.name}\`
ORDER BY \`记录数\` DESC`,
      title: '用户获取分析',
      description: '各来源渠道带来的用户数量',
      charts: [{ type: 'bar', xAxis: guessAlias(channelCol), yAxis: '新用户数' }],
    }
  },

  growth_rate: (table, cols, dbType) => {
    const dateCol = findDateColumn(cols)
    const numCol = findNumericColumn(cols)
    if (!dateCol) return null
    if (isFileDb(dbType)) {
      // CSV 不支持窗口函数，用 JS 聚合 + 环比变化
      const valueExpr = numCol ? `"${numCol.name}"` : ''
      return {
        sql: valueExpr
          ? `SELECT "${dateCol.name}", "${valueExpr.replace(/"/g, '')}" FROM "${table}"`
          : `SELECT "${dateCol.name}" FROM "${table}"`,
        title: '增长率对比',
        description: '周期环比变化趋势（文件模式）',
        charts: [{ type: 'line', xAxis: 'period', yAxis: 'value' }],
      }
    }
    const metric = numCol ? `SUM(\`${numCol.name}\`)` : 'COUNT(*)'
    const metricLabel = numCol ? guessAlias(numCol) : '记录数'
    return {
      sql: `SELECT
  DATE_TRUNC('week', \`${dateCol.name}\`) AS \`周\`,
  ${metric} AS \`${metricLabel}\`,
  LAG(${metric}) OVER (ORDER BY DATE_TRUNC('week', \`${dateCol.name}\`)) AS \`上周\`,
  ROUND((${metric} - LAG(${metric}) OVER (ORDER BY DATE_TRUNC('week', \`${dateCol.name}\`))) /
    NULLIF(LAG(${metric}) OVER (ORDER BY DATE_TRUNC('week', \`${dateCol.name}\`)), 0) * 100, 1) AS \`环比增长率(%)\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', \`${dateCol.name}\`)
ORDER BY \`周\` ASC`,
      title: '增长率对比',
      description: '周环比增长率分析',
      charts: [{ type: 'line', xAxis: '周', yAxis: '环比增长率(%)' }],
    }
  },

  // ── 留存 ──────────────────────────────────────────────────────────────────

  user_retention: (table, cols, dbType) => {
    const dateCol = findDateColumn(cols)
    const userCol = findUserIdColumn(cols)
    if (!dateCol || !userCol) return null
    // 文件数据库不支持 CTE / WITH，直接返回 null
    if (isFileDb(dbType)) return null
    return {
      sql: `WITH cohort AS (
  SELECT
    \`${userCol.name}\` AS user_id,
    DATE(\`${dateCol.name}\`) AS first_date
  FROM \`${table}\`
  WHERE \`${dateCol.name}\` IS NOT NULL
  GROUP BY \`${userCol.name}\`, DATE(\`${dateCol.name}\`)
),
retention AS (
  SELECT
    c.first_date AS \`注册日期\`,
    COUNT(DISTINCT c.user_id) AS \`新增用户\`,
    COUNT(DISTINCT CASE WHEN DATE(e.\`${dateCol.name}\`) = c.first_date + INTERVAL '1 day' THEN e.\`${userCol.name}\` END) AS \`D1留存\`,
    COUNT(DISTINCT CASE WHEN DATE(e.\`${dateCol.name}\`) = c.first_date + INTERVAL '7 days' THEN e.\`${userCol.name}\` END) AS \`D7留存\`,
    COUNT(DISTINCT CASE WHEN DATE(e.\`${dateCol.name}\`) = c.first_date + INTERVAL '30 days' THEN e.\`${userCol.name}\` END) AS \`D30留存\`
  FROM cohort c
  LEFT JOIN \`${table}\` e ON c.user_id = e.\`${userCol.name}\`
  GROUP BY c.first_date
)
SELECT
  \`注册日期\`,
  \`新增用户\`,
  ROUND(\`D1留存\` / \`新增用户\` * 100, 1) AS \`D1留存率(%)\`,
  ROUND(\`D7留存\` / \`新增用户\` * 100, 1) AS \`D7留存率(%)\`,
  ROUND(\`D30留存\` / \`新增用户\` * 100, 1) AS \`D30留存率(%)\`
FROM retention
ORDER BY \`注册日期\` DESC
LIMIT 30`,
      title: '用户留存率',
      description: 'D1/D7/D30 留存率分析',
      charts: [
        { type: 'line', xAxis: '注册日期', yAxis: 'D1留存率(%)' },
        { type: 'line', xAxis: '注册日期', yAxis: 'D7留存率(%)' },
        { type: 'line', xAxis: '注册日期', yAxis: 'D30留存率(%)' },
      ],
    }
  },

  churn_analysis: (table, cols) => {
    const dateCol = findDateColumn(cols)
    const userCol = findUserIdColumn(cols)
    if (!dateCol || !userCol) return null
    return {
      sql: `WITH last_active AS (
  SELECT \`${userCol.name}\` AS user_id, MAX(DATE(\`${dateCol.name}\`)) AS last_date
  FROM \`${table}\` GROUP BY \`${userCol.name}\`
),
churned AS (
  SELECT
    CASE
      WHEN last_date < CURRENT_DATE - INTERVAL '90 days' THEN '严重流失（>90天未活跃）'
      WHEN last_date < CURRENT_DATE - INTERVAL '30 days' THEN '中度流失（30-90天未活跃）'
      WHEN last_date < CURRENT_DATE - INTERVAL '7 days' THEN '轻度流失（7-30天未活跃）'
      ELSE '活跃用户'
    END AS \`用户状态\`,
    COUNT(*) AS \`用户数\`
  FROM last_active GROUP BY 1
)
SELECT * FROM churned ORDER BY \`用户数\` DESC`,
      title: '流失分析',
      description: '用户流失率和流失原因分析',
      charts: [{ type: 'pie', valueField: '用户数', labelField: '用户状态' }],
    }
  },

  // ── 收入 ──────────────────────────────────────────────────────────────────

  revenue_trend: (table, cols, dbType) => {
    const dateCol = findDateColumn(cols)
    const amountCol = findAmountColumn(cols)
    if (isFileDb(dbType)) {
      if (dateCol && amountCol) {
        // CSV 无法 DATE_TRUNC，用月份聚合标记，JS 层做按月汇总
        return {
          sql: `SELECT "${dateCol.name}", "${amountCol.name}" FROM "${table}"`,
          title: '收入趋势',
          description: '按月聚合的收入趋势（文件模式）',
          charts: [{ type: 'line', xAxis: 'period', yAxis: 'value' }],
        }
      }
      // 无日期列或无金额列，按 category 分组
      const groupCol = findCategoryColumn(cols)
      const metric = amountCol ? `SUM("${amountCol.name}")` : 'COUNT(*)'
      const groupName = groupCol ? `"${groupCol.name}"` : '1'
      const orderBy = groupCol ? `ORDER BY value DESC` : ''
      return {
        sql: `SELECT ${groupName} AS name, ${metric} AS value
FROM "${table}"
${groupCol ? `WHERE "${groupCol.name}" IS NOT NULL` : ''}
GROUP BY ${groupName}
${orderBy}
LIMIT 20`,
        title: '收入趋势',
        description: '按分类统计收入分布（文件模式）',
        charts: [{ type: 'bar', xAxis: 'name', yAxis: 'value' }],
      }
    }
    if (!dateCol) return null
    const metric = amountCol ? `SUM(\`${amountCol.name}\`)` : 'COUNT(*)'
    const label = amountCol ? '销售额' : '订单数'
    return {
      sql: `SELECT
  DATE_TRUNC('month', \`${dateCol.name}\`) AS \`月份\`,
  ${metric} AS \`${label}\`,
  LAG(${metric}) OVER (ORDER BY DATE_TRUNC('month', \`${dateCol.name}\`)) AS \`上月\`,
  ROUND((${metric} - LAG(${metric}) OVER (ORDER BY DATE_TRUNC('month', \`${dateCol.name}\`))) /
    NULLIF(LAG(${metric}) OVER (ORDER BY DATE_TRUNC('month', \`${dateCol.name}\`)), 0) * 100, 1) AS \`环比增长(%)\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', \`${dateCol.name}\`)
ORDER BY \`月份\` ASC`,
      title: '收入趋势',
      description: '月度收入变化趋势和环比增长率',
      charts: [{ type: 'line', xAxis: '月份', yAxis: label }],
    }
  },

  arpu_arppu: (table, cols, dbType) => {
    const userCol = findUserIdColumn(cols)
    const amountCol = findAmountColumn(cols)
    if (!amountCol) return null
    if (isFileDb(dbType)) {
      // CSV 不支持 ROUND、CASE，用简单聚合代替
      if (userCol) {
        return {
          sql: `SELECT "user_id" AS name, SUM("${amountCol.name}") AS value
FROM "${table}"
GROUP BY "user_id"
ORDER BY value DESC
LIMIT 20`,
          title: 'ARPU/ARPPU',
          description: '按用户统计金额（文件模式）',
          charts: [{ type: 'bar', xAxis: 'name', yAxis: 'value' }],
        }
      }
      return {
        sql: `SELECT "${amountCol.name}" AS name, SUM("${amountCol.name}") AS value
FROM "${table}"
GROUP BY "${amountCol.name}"
ORDER BY value DESC
LIMIT 20`,
        title: 'ARPU/ARPPU',
        description: '按金额统计分布（文件模式）',
        charts: [{ type: 'bar', xAxis: 'name', yAxis: 'value' }],
      }
    }
    return {
      sql: userCol
        ? `SELECT
  ROUND(SUM(\`${amountCol.name}\`) / COUNT(DISTINCT \`${userCol.name}\`), 2) AS \`ARPU\`,
  ROUND(SUM(\`${amountCol.name}\`) / COUNT(DISTINCT CASE WHEN \`${amountCol.name}\` > 0 THEN \`${userCol.name}\` END), 2) AS \`ARPPU\`,
  COUNT(DISTINCT \`${userCol.name}\`) AS \`付费用户数\`,
  SUM(\`${amountCol.name}\`) AS \`总收入\`
FROM \`${table}\``
        : `SELECT
  ROUND(AVG(\`${amountCol.name}\`), 2) AS \`平均金额\`,
  MIN(\`${amountCol.name}\`) AS \`最小值\`,
  MAX(\`${amountCol.name}\`) AS \`最大值\`,
  COUNT(*) AS \`总记录数\`
FROM \`${table}\``,
      title: 'ARPU/ARPPU',
      description: '人均收入和付费用户人均收入',
      charts: [{ type: 'number', valueField: 'ARPU' }],
    }
  },

  ltv_analysis: (table, cols, dbType) => {
    const userCol = findUserIdColumn(cols)
    const amountCol = findAmountColumn(cols)
    const channelCol = findCategoryColumn(cols)
    if (!amountCol || !channelCol) return null
    if (isFileDb(dbType)) {
      const metric = userCol
        ? `SUM("${amountCol.name}") AS value`
        : `AVG("${amountCol.name}") AS value`
      return {
        sql: `SELECT "${channelCol.name}" AS name, ${metric}
FROM "${table}"
WHERE "${channelCol.name}" IS NOT NULL
GROUP BY "${channelCol.name}"
ORDER BY value DESC
LIMIT 20`,
        title: '用户 LTV 分析',
        description: '按渠道统计消费（文件模式）',
        charts: [{ type: 'bar', xAxis: 'name', yAxis: 'value' }],
      }
    }
    const byUser = userCol
      ? `SELECT \`${channelCol.name}\` AS \`${guessAlias(channelCol)}\`,
  ROUND(SUM(\`${amountCol.name}\`) / COUNT(DISTINCT \`${userCol.name}\`), 2) AS \`用户LTV\`,
  SUM(\`${amountCol.name}\`) AS \`总收入\`,
  COUNT(DISTINCT \`${userCol.name}\`) AS \`用户数\`
FROM \`${table}\`
WHERE \`${channelCol.name}\` IS NOT NULL
GROUP BY \`${channelCol.name}\`
ORDER BY \`用户LTV\` DESC`
      : `SELECT \`${channelCol.name}\` AS \`${guessAlias(channelCol)}\`,
  ROUND(AVG(\`${amountCol.name}\`), 2) AS \`平均金额\`,
  SUM(\`${amountCol.name}\`) AS \`总收入\`,
  COUNT(*) AS \`订单数\`
FROM \`${table}\`
WHERE \`${channelCol.name}\` IS NOT NULL
GROUP BY \`${channelCol.name}\`
ORDER BY \`总收入\` DESC`
    return {
      sql: byUser,
      title: '用户 LTV 分析',
      description: '按渠道统计用户的累计消费金额',
      charts: [{ type: 'bar', xAxis: guessAlias(channelCol), yAxis: '用户LTV' }],
    }
  },

  payment_distribution: (table, cols, dbType) => {
    const amountCol = findAmountColumn(cols)
    if (!amountCol) return null
    if (isFileDb(dbType)) {
      // CSV 不支持 CASE WHEN 和窗口函数，返回按金额降序的简单统计
      return {
        sql: `SELECT "${amountCol.name}" AS name, COUNT(*) AS value
FROM "${table}"
GROUP BY "${amountCol.name}"
ORDER BY value DESC
LIMIT 20`,
        title: '付款金额分布',
        description: '按金额统计分布（文件模式）',
        charts: [{ type: 'bar', xAxis: 'name', yAxis: 'value' }],
      }
    }
    return {
      sql: `SELECT
  CASE
    WHEN \`${amountCol.name}\` < 100 THEN '0-100'
    WHEN \`${amountCol.name}\` < 500 THEN '100-500'
    WHEN \`${amountCol.name}\` < 2000 THEN '500-2000'
    WHEN \`${amountCol.name}\` < 5000 THEN '2000-5000'
    ELSE '5000+'
  END AS \`金额区间\`,
  COUNT(*) AS \`订单数\`,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS \`占比(%)\`
FROM \`${table}\`
GROUP BY 1
ORDER BY MIN(\`${amountCol.name}\`)`,
      title: '付款金额分布',
      description: '用户付款金额的区间分布',
      charts: [{ type: 'bar', xAxis: '金额区间', yAxis: '订单数' }],
    }
  },

  // ── 转化 ──────────────────────────────────────────────────────────────────

  conversion_funnel: (table, cols) => {
    const eventCol = findEventColumn(cols)
    const dateCol = findDateColumn(cols)
    if (!eventCol) return null
    const events = eventCol.inferredType === 'string'
      ? `SELECT \`${eventCol.name}\` AS \`步骤\`, COUNT(DISTINCT \`${findUserIdColumn(cols)?.name || 'id'}\`) AS \`用户数\`
FROM \`${table}\`
WHERE \`${eventCol.name}\` IS NOT NULL
GROUP BY \`${eventCol.name}\`
ORDER BY MIN(\`${dateCol?.name || 'id'}\`)` : ''
    return {
      sql: events || `SELECT \`${eventCol.name}\` AS \`步骤\`, COUNT(*) AS \`次数\`
FROM \`${table}\`
GROUP BY \`${eventCol.name}\`
ORDER BY \`次数\` DESC`,
      title: '转化漏斗',
      description: '各步骤的用户转化率和流失情况',
      charts: [{ type: 'bar', xAxis: '步骤', yAxis: '用户数' }],
    }
  },

  signup_conversion: (table, cols, dbType) => {
    const dateCol = findDateColumn(cols)
    if (!dateCol) return null
    // CSV 无法做 DATE_TRUNC，按 category 分组更有意义
    if (isFileDb(dbType)) {
      const groupCol = findCategoryColumn(cols) || cols.find(c => /status|payment_method/.test(c.name.toLowerCase()))
      if (groupCol) {
        return {
          sql: `SELECT "${groupCol.name}" AS name, COUNT(*) AS value
FROM "${table}"
WHERE "${groupCol.name}" IS NOT NULL
GROUP BY "${groupCol.name}"
ORDER BY value DESC`,
          title: '注册转化分析',
          description: '按分类统计分布（文件模式）',
          charts: [{ type: 'bar', xAxis: 'name', yAxis: 'value' }],
        }
      }
      return null
    }
    return {
      sql: `SELECT
  DATE(\`${dateCol.name}\`) AS \`日期\`,
  COUNT(*) AS \`注册人数\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '30 days'
GROUP BY DATE(\`${dateCol.name}\`)
ORDER BY \`日期\` ASC`,
      title: '注册转化分析',
      description: '每日注册用户数统计',
      charts: [{ type: 'line', xAxis: '日期', yAxis: '注册人数' }],
    }
  },

  purchase_conversion: (table, cols) => {
    const dateCol = findDateColumn(cols)
    const channelCol = findCategoryColumn(cols)
    const userCol = findUserIdColumn(cols)
    const amountCol = findAmountColumn(cols)
    if (!channelCol) return null
    return {
      sql: `SELECT
  \`${channelCol.name}\` AS \`${guessAlias(channelCol)}\`,
  COUNT(DISTINCT ${userCol ? `\`${userCol.name}\`` : 'NULL'}) AS \`活跃用户\`,
  COUNT(DISTINCT CASE WHEN ${amountCol ? `\`${amountCol.name}\` > 0` : '1=1'} THEN ${userCol ? `\`${userCol.name}\`` : 'NULL'} END) AS \`付费用户\`,
  ROUND(COUNT(DISTINCT CASE WHEN ${amountCol ? `\`${amountCol.name}\` > 0` : '1=1'} THEN ${userCol ? `\`${userCol.name}\`` : 'NULL'} END) * 100.0 /
    NULLIF(COUNT(DISTINCT ${userCol ? `\`${userCol.name}\`` : 'NULL'}), 0), 1) AS \`转化率(%)\`
FROM \`${table}\`
GROUP BY \`${channelCol.name}\`
HAVING \`活跃用户\` > 0
ORDER BY \`转化率(%)\` DESC`,
      title: '购买转化率',
      description: '各渠道用户付费转化率',
      charts: [{ type: 'bar', xAxis: guessAlias(channelCol), yAxis: '转化率(%)' }],
    }
  },

  // ── 运营 ──────────────────────────────────────────────────────────────────

  feature_usage: (table, cols) => {
    const eventCol = findEventColumn(cols)
    const userCol = findUserIdColumn(cols)
    if (!eventCol) return null
    return {
      sql: userCol
        ? `SELECT \`${eventCol.name}\` AS \`功能/事件\`, COUNT(*) AS \`使用次数\`, COUNT(DISTINCT \`${userCol.name}\`) AS \`使用用户数\`
FROM \`${table}\`
GROUP BY \`${eventCol.name}\`
ORDER BY \`使用次数\` DESC
LIMIT 20`
        : `SELECT \`${eventCol.name}\` AS \`功能/事件\`, COUNT(*) AS \`使用次数\`
FROM \`${table}\`
GROUP BY \`${eventCol.name}\`
ORDER BY \`使用次数\` DESC
LIMIT 20`,
      title: '功能使用率',
      description: '各功能模块的使用频率和用户数',
      charts: [{ type: 'bar', xAxis: '功能/事件', yAxis: '使用次数' }],
    }
  },

  session_analysis: (table, cols, dbType) => {
    const dateCol = findDateColumn(cols)
    if (isFileDb(dbType)) {
      const userCol = findUserIdColumn(cols)
      if (dateCol) {
        return {
          sql: `SELECT "${dateCol.name}" AS name, COUNT(*) AS value
FROM "${table}"
WHERE "${dateCol.name}" IS NOT NULL
GROUP BY "${dateCol.name}"
ORDER BY "${dateCol.name}" ASC
LIMIT 100`,
          title: '会话分析',
          description: '每日会话次数统计（文件模式）',
          charts: [{ type: 'line', xAxis: 'name', yAxis: 'value' }],
        }
      }
      return {
        sql: `SELECT COUNT(*) AS value FROM "${table}"`,
        title: '会话分析',
        description: '总会话数统计（文件模式）',
        charts: [{ type: 'number', valueField: 'value' }],
      }
    }
    return {
      sql: dateCol
        ? `SELECT
  DATE(\`${dateCol.name}\`) AS \`日期\`,
  COUNT(*) AS \`会话数\`,
  COUNT(DISTINCT \`${findUserIdColumn(cols)?.name || 'id'}\`) AS \`用户数\`
FROM \`${table}\`
GROUP BY DATE(\`${dateCol.name}\`)
ORDER BY \`日期\` ASC`
        : `SELECT COUNT(*) AS \`总会话数\` FROM \`${table}\``,
      title: '会话分析',
      description: '每日会话次数和用户数分布',
      charts: [{ type: 'line', xAxis: '日期', yAxis: '会话数' }],
    }
  },

  peak_hour_analysis: (table, cols, dbType) => {
    const dateCol = findDateColumn(cols)
    if (!dateCol) return null
    // 文件数据库不支持 EXTRACT，直接返回 null
    if (isFileDb(dbType)) return null
    return {
      sql: `SELECT
  EXTRACT(HOUR FROM \`${dateCol.name}\`) AS \`小时\`,
  COUNT(*) AS \`活跃次数\`,
  COUNT(DISTINCT \`${findUserIdColumn(cols)?.name || 'id'}\`) AS \`活跃用户\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '30 days'
GROUP BY EXTRACT(HOUR FROM \`${dateCol.name}\`)
ORDER BY \`小时\``,
      title: '高峰时段分析',
      description: '24小时用户活跃分布',
      charts: [{ type: 'bar', xAxis: '小时', yAxis: '活跃次数' }],
    }
  },

  error_analysis: (table, cols) => {
    const eventCol = findEventColumn(cols)
    if (!eventCol) return null
    return {
      sql: `SELECT \`${eventCol.name}\` AS \`错误类型\`, COUNT(*) AS \`错误次数\`
FROM \`${table}\`
GROUP BY \`${eventCol.name}\`
ORDER BY \`错误次数\` DESC
LIMIT 20`,
      title: '错误/异常分析',
      description: '系统错误频率 TOP 排行',
      charts: [{ type: 'bar', xAxis: '错误类型', yAxis: '错误次数' }],
    }
  },

  // ── 电商 ──────────────────────────────────────────────────────────────────

  order_analysis: (table, cols, dbType) => {
    const dateCol = findDateColumn(cols)
    const amountCol = findAmountColumn(cols)
    if (!dateCol) return null
    if (isFileDb(dbType)) {
      // CSV 无法做 DATE_TRUNC，按 category 分组更有意义
      const groupCol = findCategoryColumn(cols)
      if (groupCol) {
        // CSV 解析器 GROUP BY 只返回 name+value 两列，不支持额外别名
        const metric = amountCol ? `SUM("${amountCol.name}")` : 'COUNT(*)'
        return {
          sql: `SELECT "${groupCol.name}" AS name, ${metric} AS value
FROM "${table}"
WHERE "${groupCol.name}" IS NOT NULL
GROUP BY "${groupCol.name}"
ORDER BY value DESC
LIMIT 20`,
          title: '订单分析',
          description: '按分类统计订单分布（文件模式）',
          charts: [{ type: 'bar', xAxis: 'name', yAxis: 'value' }],
        }
      }
      // 无分类列，按 status 分组
      const statusCol = cols.find(c => /status|payment_method|channel/.test(c.name.toLowerCase()))
      if (statusCol) {
        return {
          sql: `SELECT "${statusCol.name}" AS name, COUNT(*) AS value
FROM "${table}"
WHERE "${statusCol.name}" IS NOT NULL
GROUP BY "${statusCol.name}"
ORDER BY value DESC`,
          title: '订单分析',
          description: '按状态统计分布（文件模式）',
          charts: [{ type: 'bar', xAxis: 'name', yAxis: 'value' }],
        }
      }
      return null
    }
    const metric = amountCol ? `SUM(\`${amountCol.name}\`) AS \`GMV\`, ROUND(AVG(\`${amountCol.name}\`), 2) AS \`客单价\`,` : ''
    return {
      sql: `SELECT
  DATE(\`${dateCol.name}\`) AS \`日期\`,
  ${metric}
  COUNT(*) AS \`订单数\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '30 days'
GROUP BY DATE(\`${dateCol.name}\`)
ORDER BY \`日期\` ASC`,
      title: '订单分析',
      description: '每日订单量、GMV、客单价统计',
      charts: [
        { type: 'line', xAxis: '日期', yAxis: '订单数' },
        amountCol ? { type: 'line', xAxis: '日期', yAxis: 'GMV' } : null,
      ].filter(Boolean) as ChartSuggestion[],
    }
  },

  repurchase_rate: (table, cols) => {
    const userCol = findUserIdColumn(cols)
    const dateCol = findDateColumn(cols)
    if (!userCol || !dateCol) return null
    return {
      sql: `WITH user_orders AS (
  SELECT \`${userCol.name}\` AS user_id,
    COUNT(*) AS order_count,
    COUNT(DISTINCT DATE(\`${dateCol.name}\`)) AS order_days
  FROM \`${table}\`
  WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '90 days'
  GROUP BY \`${userCol.name}\`
)
SELECT
  CASE
    WHEN order_count = 1 THEN '一次性用户'
    WHEN order_count = 2 THEN '复购1次'
    WHEN order_count BETWEEN 3 AND 5 THEN '复购2-4次'
    ELSE '复购5次以上'
  END AS \`复购等级\`,
  COUNT(*) AS \`用户数\`,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS \`占比(%)\`
FROM user_orders
GROUP BY 1
ORDER BY MIN(order_count)`,
      title: '复购率分析',
      description: '用户重复购买行为分析',
      charts: [{ type: 'pie', valueField: '用户数', labelField: '复购等级' }],
    }
  },

  product_performance: (table, cols) => {
    const productCol = findProductColumn(cols)
    const amountCol = findAmountColumn(cols)
    const numCol = findNumericColumn(cols)
    if (!productCol) return null
    const metric = amountCol ? `SUM(\`${amountCol.name}\`)` : (numCol ? `SUM(\`${numCol.name}\`)` : 'COUNT(*)')
    const metricLabel = amountCol ? '销售额' : (numCol ? guessAlias(numCol) : '销量')
    return {
      sql: `SELECT
  \`${productCol.name}\` AS \`商品\`,
  ${metric} AS \`${metricLabel}\`,
  COUNT(*) AS \`订单数\`
FROM \`${table}\`
GROUP BY \`${productCol.name}\`
ORDER BY \`${metricLabel}\` DESC
LIMIT 20`,
      title: '商品表现',
      description: '各商品销量和收入排名 TOP 20',
      charts: [{ type: 'bar', xAxis: '商品', yAxis: metricLabel }],
    }
  },

  category_performance: (table, cols, dbType) => {
    const categoryCol = findCategoryColumn(cols)
    const amountCol = findAmountColumn(cols)
    const numCol = findNumericColumn(cols)
    if (!categoryCol) return null
    if (isFileDb(dbType)) {
      const metricCol = amountCol || numCol
      const metric = metricCol ? `SUM("${metricCol.name}")` : 'COUNT(*)'
      return {
        sql: `SELECT "${categoryCol.name}" AS name, ${metric} AS value
FROM "${table}"
WHERE "${categoryCol.name}" IS NOT NULL
GROUP BY "${categoryCol.name}"
ORDER BY value DESC
LIMIT 20`,
        title: '品类销售分析',
        description: '按分类统计收入和销量（文件模式）',
        charts: [{ type: 'bar', xAxis: 'name', yAxis: 'value' }],
      }
    }
    const metric = amountCol ? `SUM(\`${amountCol.name}\`)` : (numCol ? `SUM(\`${numCol.name}\`)` : 'COUNT(*)')
    const metricLabel = amountCol ? '销售额' : (numCol ? guessAlias(numCol) : '订单数')
    return {
      sql: `SELECT
  \`${categoryCol.name}\` AS \`${guessAlias(categoryCol)}\`,
  ${metric} AS \`${metricLabel}\`,
  ROUND(${metric} * 100.0 / SUM(${metric}) OVER (), 1) AS \`占比(%)\`
FROM \`${table}\`
GROUP BY \`${categoryCol.name}\`
ORDER BY \`${metricLabel}\` DESC`,
      title: '品类销售分析',
      description: '各品类的销量和收入占比',
      charts: [
        { type: 'bar', xAxis: guessAlias(categoryCol), yAxis: metricLabel },
        { type: 'pie', valueField: metricLabel, labelField: guessAlias(categoryCol) },
      ],
    }
  },

  regional_sales: (table, cols) => {
    const cityCol = findCategoryColumn(cols)
    const amountCol = findAmountColumn(cols)
    const numCol = findNumericColumn(cols)
    if (!cityCol) return null
    const metric = amountCol ? `SUM(\`${amountCol.name}\`)` : (numCol ? `SUM(\`${numCol.name}\`)` : 'COUNT(*)')
    const metricLabel = amountCol ? '销售额' : (numCol ? guessAlias(numCol) : '订单数')
    return {
      sql: `SELECT
  \`${cityCol.name}\` AS \`${guessAlias(cityCol)}\`,
  ${metric} AS \`${metricLabel}\`,
  ROUND(AVG(${amountCol ? `\`${amountCol.name}\`` : '1'}), 2) AS \`客单价\`
FROM \`${table}\`
GROUP BY \`${cityCol.name}\`
HAVING \`${cityCol.name}\` IS NOT NULL
ORDER BY \`${metricLabel}\` DESC
LIMIT 20`,
      title: '区域销售分析',
      description: '各地区订单量和销售额分布 TOP 20',
      charts: [{ type: 'bar', xAxis: guessAlias(cityCol), yAxis: metricLabel }],
    }
  },

  cart_abandonment: (table, cols) => {
    const eventCol = findEventColumn(cols)
    const userCol = findUserIdColumn(cols)
    if (!eventCol || !userCol) return null
    return {
      sql: `SELECT
  \`${eventCol.name}\` AS \`行为\`,
  COUNT(DISTINCT \`${userCol.name}\`) AS \`用户数\`,
  COUNT(*) AS \`次数\`
FROM \`${table}\`
GROUP BY \`${eventCol.name}\`
ORDER BY \`次数\` DESC`,
      title: '购物车放弃率',
      description: '加购后未付款的用户比例',
      charts: [{ type: 'bar', xAxis: '行为', yAxis: '用户数' }],
    }
  },

  // ── 财务 ──────────────────────────────────────────────────────────────────

  expense_analysis: (table, cols, dbType) => {
    const categoryCol = findCategoryColumn(cols)
    const amountCol = findAmountColumn(cols)
    const dateCol = findDateColumn(cols)
    if (!amountCol) return null
    if (isFileDb(dbType)) {
      if (categoryCol) {
        return {
          sql: `SELECT "${categoryCol.name}" AS name, SUM("${amountCol.name}") AS value
FROM "${table}"
${dateCol ? `WHERE "${dateCol.name}" IS NOT NULL` : ''}
GROUP BY "${categoryCol.name}"
ORDER BY value DESC
LIMIT 20`,
          title: '支出分析',
          description: '各类支出分布（文件模式）',
          charts: [{ type: 'bar', xAxis: 'name', yAxis: 'value' }],
        }
      }
      return {
        sql: `SELECT COUNT(*) AS value FROM "${table}"`,
        title: '支出分析',
        description: '支出统计（文件模式）',
        charts: [{ type: 'number', valueField: 'value' }],
      }
    }
    return {
      sql: categoryCol
        ? `SELECT
  \`${categoryCol.name}\` AS \`${guessAlias(categoryCol)}\`,
  SUM(\`${amountCol.name}\`) AS \`支出金额\`,
  ROUND(SUM(\`${amountCol.name}\`) * 100.0 / SUM(SUM(\`${amountCol.name}\`)) OVER (), 1) AS \`占比(%)\`
FROM \`${table}\`
${dateCol ? `WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '3 months'` : ''}
GROUP BY \`${categoryCol.name}\`
ORDER BY \`支出金额\` DESC`
        : `SELECT
  SUM(\`${amountCol.name}\`) AS \`总支出\`,
  ROUND(AVG(\`${amountCol.name}\`), 2) AS \`平均支出\`,
  MIN(\`${amountCol.name}\`) AS \`最小支出\`,
  MAX(\`${amountCol.name}\`) AS \`最大支出\`
FROM \`${table}\``,
      title: '支出分析',
      description: '各类支出的分布和趋势',
      charts: [{ type: 'pie', valueField: '支出金额', labelField: guessAlias(categoryCol || cols[0]) }],
    }
  },

  profit_trend: (table, cols, dbType) => {
    const dateCol = findDateColumn(cols)
    const amountCol = findAmountColumn(cols)
    if (!dateCol) return null
    if (isFileDb(dbType)) {
      // CSV 无法 DATE_TRUNC，用月份聚合标记，运行时 JS 处理
      const valueCol = amountCol ? `"${amountCol.name}"` : '1'
      return {
        sql: amountCol ? `SELECT "${dateCol.name}", "${amountCol.name}" FROM "${table}"` : `SELECT "${dateCol.name}" FROM "${table}"`,
        title: '利润趋势',
        description: '月度金额走势（文件模式）',
        charts: [{ type: 'line', xAxis: 'period', yAxis: 'value' }],
      }
    }
    return {
      sql: `SELECT
  DATE_TRUNC('month', \`${dateCol.name}\`) AS \`月份\`,
  SUM(\`${amountCol?.name || cols.find(c => c.inferredType === 'number')?.name || 'id'}\`) AS \`金额\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', \`${dateCol.name}\`)
ORDER BY \`月份\` ASC`,
      title: '利润趋势',
      description: '月度金额走势',
      charts: [{ type: 'line', xAxis: '月份', yAxis: '金额' }],
    }
  },

  refund_analysis: (table, cols, dbType) => {
    if (isFileDb(dbType)) {
      const categoryCol = findCategoryColumn(cols)
      const amountCol = findAmountColumn(cols)
      if (!categoryCol) return null
      const refundCol = cols.find(c => /refund|status/.test(c.name.toLowerCase()))
      const metric = amountCol ? `SUM("${amountCol.name}")` : 'COUNT(*)'
      if (refundCol) {
        return {
          sql: `SELECT "${refundCol.name}" AS name, ${metric} AS value
FROM "${table}"
WHERE "${refundCol.name}" IS NOT NULL
GROUP BY "${refundCol.name}"
ORDER BY value DESC
LIMIT 20`,
          title: '退款分析',
          description: '退款状态分布',
          charts: [{ type: 'bar', xAxis: 'name', yAxis: 'value' }],
        }
      }
      if (categoryCol) {
        return {
          sql: `SELECT "${categoryCol.name}" AS name, ${metric} AS value
FROM "${table}"
WHERE "${categoryCol.name}" IS NOT NULL
GROUP BY "${categoryCol.name}"
ORDER BY value DESC
LIMIT 20`,
          title: '退款分析',
          description: '分类统计',
          charts: [{ type: 'bar', xAxis: 'name', yAxis: 'value' }],
        }
      }
      return null
    }
    const categoryCol = findCategoryColumn(cols)
    const amountCol = findAmountColumn(cols)
    if (!categoryCol) return null
    return {
      sql: `SELECT
  \`${categoryCol.name}\` AS \`${guessAlias(categoryCol)}\`,
  COUNT(*) AS \`退款次数\`,
  ${amountCol ? `SUM(\`${amountCol.name}\`) AS \`退款金额\`,` : ''}
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS \`占比(%)\`
FROM \`${table}\`
GROUP BY \`${categoryCol.name}\`
ORDER BY \`退款次数\` DESC
LIMIT 20`,
      title: '退款分析',
      description: '退款率和退款原因分布',
      charts: [{ type: 'bar', xAxis: guessAlias(categoryCol), yAxis: '退款次数' }],
    }
  },

  // ── 内容流量 ──────────────────────────────────────────────────────────────

  content_performance: (table, cols) => {
    const contentCol = findProductColumn(cols)
    const numCol = findNumericColumn(cols)
    if (!contentCol) return null
    const metric = numCol ? `SUM(\`${numCol.name}\`)` : 'COUNT(*)'
    const metricLabel = numCol ? guessAlias(numCol) : '互动数'
    return {
      sql: `SELECT \`${contentCol.name}\` AS \`内容\`, ${metric} AS \`${metricLabel}\`
FROM \`${table}\`
GROUP BY \`${contentCol.name}\`
ORDER BY \`${metricLabel}\` DESC
LIMIT 20`,
      title: '内容表现',
      description: '浏览量前20的内容排行',
      charts: [{ type: 'bar', xAxis: '内容', yAxis: metricLabel }],
    }
  },

  traffic_analysis: (table, cols) => {
    const dateCol = findDateColumn(cols)
    const channelCol = findCategoryColumn(cols)
    if (!dateCol) return null
    return {
      sql: channelCol
        ? `SELECT
  \`${channelCol.name}\` AS \`${guessAlias(channelCol)}\`,
  COUNT(*) AS \`访问次数\`,
  COUNT(DISTINCT \`${findUserIdColumn(cols)?.name || 'id'}\`) AS \`访客数\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '7 days'
GROUP BY \`${channelCol.name}\`
ORDER BY \`访问次数\` DESC`
        : `SELECT
  DATE(\`${dateCol.name}\`) AS \`日期\`,
  COUNT(*) AS \`访问次数\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '7 days'
GROUP BY DATE(\`${dateCol.name}\`)
ORDER BY \`日期\``,
      title: '流量分析',
      description: '最近7天访问量和来源分布',
      charts: [{ type: 'bar', xAxis: guessAlias(channelCol || cols[0]), yAxis: '访问次数' }],
    }
  },

  bounce_rate: (table, cols) => {
    const dateCol = findDateColumn(cols)
    const pageCol = findProductColumn(cols)
    if (!pageCol) return null
    return {
      sql: `SELECT
  \`${pageCol.name}\` AS \`页面\`,
  COUNT(*) AS \`访问次数\`
FROM \`${table}\`
WHERE \`${dateCol?.name || 'id'}\` IS NOT NULL
GROUP BY \`${pageCol.name}\`
ORDER BY \`访问次数\` DESC
LIMIT 20`,
      title: '跳出率分析',
      description: '页面跳出率 TOP 排行',
      charts: [{ type: 'bar', xAxis: '页面', yAxis: '访问次数' }],
    }
  },

  // ── SaaS ──────────────────────────────────────────────────────────────────

  mrr_arr: (table, cols) => {
    const dateCol = findDateColumn(cols)
    const amountCol = findAmountColumn(cols)
    if (!dateCol || !amountCol) return null
    return {
      sql: `SELECT
  DATE_TRUNC('month', \`${dateCol.name}\`) AS \`月份\`,
  SUM(\`${amountCol.name}\`) AS \`MRR\`,
  SUM(\`${amountCol.name}\`) * 12 AS \`ARR\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', \`${dateCol.name}\`)
ORDER BY \`月份\` ASC`,
      title: 'MRR/ARR 分析',
      description: '月度经常性收入趋势',
      charts: [{ type: 'line', xAxis: '月份', yAxis: 'MRR' }],
    }
  },

  trial_conversion: (table, cols) => {
    const dateCol = findDateColumn(cols)
    const userCol = findUserIdColumn(cols)
    const statusCol = findCategoryColumn(cols)
    if (!dateCol || !statusCol) return null
    return {
      sql: `SELECT
  \`${statusCol.name}\` AS \`状态\`,
  COUNT(DISTINCT ${userCol ? `\`${userCol.name}\`` : 'NULL'}) AS \`用户数\`,
  ROUND(COUNT(DISTINCT ${userCol ? `\`${userCol.name}\`` : 'NULL'}) * 100.0 /
    NULLIF(COUNT(DISTINCT ${userCol ? `\`${userCol.name}\`` : 'NULL'}), 0), 1) AS \`占比(%)\`
FROM \`${table}\`
GROUP BY \`${statusCol.name}\`
ORDER BY \`用户数\` DESC`,
      title: '试用转付费率',
      description: '各状态用户数和占比',
      charts: [{ type: 'pie', valueField: '用户数', labelField: '状态' }],
    }
  },

  plan_distribution: (table, cols) => {
    const planCol = findCategoryColumn(cols)
    const amountCol = findAmountColumn(cols)
    if (!planCol) return null
    return {
      sql: `SELECT
  \`${planCol.name}\` AS \`套餐\`,
  COUNT(*) AS \`订阅用户数\`,
  ${amountCol ? `SUM(\`${amountCol.name}\`) AS \`收入\`,` : ''}
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS \`占比(%)\`
FROM \`${table}\`
GROUP BY \`${planCol.name}\`
ORDER BY \`订阅用户数\` DESC`,
      title: '套餐分布分析',
      description: '各套餐的用户数和收入占比',
      charts: [{ type: 'pie', valueField: '订阅用户数', labelField: '套餐' }],
    }
  },

  // ── 产品 ──────────────────────────────────────────────────────────────────

  ab_test: (table, cols) => {
    const groupCol = findCategoryColumn(cols)
    const numCol = findNumericColumn(cols)
    if (!groupCol || !numCol) return null
    return {
      sql: `SELECT
  \`${groupCol.name}\` AS \`实验组\`,
  ROUND(AVG(\`${numCol.name}\`), 4) AS \`均值\`,
  COUNT(*) AS \`样本数\`,
  ROUND(STDDEV(\`${numCol.name}\`), 4) AS \`标准差\`
FROM \`${table}\`
GROUP BY \`${groupCol.name}\``,
      title: 'A/B 实验分析',
      description: '实验组与对照组的效果对比',
      charts: [{ type: 'bar', xAxis: '实验组', yAxis: '均值' }],
    }
  },

  funnel_drop_analysis: (table, cols) => {
    const eventCol = findEventColumn(cols)
    if (!eventCol) return null
    return {
      sql: `SELECT
  \`${eventCol.name}\` AS \`步骤\`,
  COUNT(*) AS \`用户数\`
FROM \`${table}\`
GROUP BY \`${eventCol.name}\`
ORDER BY \`用户数\` DESC`,
      title: '流程断点分析',
      description: '用户在各步骤的流失率',
      charts: [{ type: 'bar', xAxis: '步骤', yAxis: '用户数' }],
    }
  },

  user_segmentation: (table, cols) => {
    const categoryCol = findCategoryColumn(cols)
    if (!categoryCol) return null
    return {
      sql: `SELECT
  \`${categoryCol.name}\` AS \`${guessAlias(categoryCol)}\`,
  COUNT(*) AS \`用户数\`,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS \`占比(%)\`
FROM \`${table}\`
GROUP BY \`${categoryCol.name}\`
ORDER BY \`用户数\` DESC`,
      title: '用户分群分析',
      description: '按特征划分的用户群体分布',
      charts: [{ type: 'pie', valueField: '用户数', labelField: guessAlias(categoryCol) }],
    }
  },

  // ── HR ─────────────────────────────────────────────────────────────────────

  recruitment_pipeline: (table, cols) => {
    const statusCol = findCategoryColumn(cols)
    if (!statusCol) return null
    return {
      sql: `SELECT
  \`${statusCol.name}\` AS \`阶段\`,
  COUNT(*) AS \`人数\`,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS \`通过率(%)\`
FROM \`${table}\`
GROUP BY \`${statusCol.name}\`
ORDER BY \`人数\` DESC`,
      title: '招聘漏斗分析',
      description: '招聘各阶段转化率和录用周期',
      charts: [{ type: 'bar', xAxis: '阶段', yAxis: '人数' }],
    }
  },

  churn_mrr: (table, cols) => {
    const dateCol = findDateColumn(cols)
    const amountCol = findAmountColumn(cols)
    if (!dateCol) return null
    const metric = amountCol ? `SUM(\`${amountCol.name}\`)` : 'COUNT(*)'
    const label = amountCol ? 'MRR流失' : '流失用户数'
    return {
      sql: `SELECT
  DATE_TRUNC('month', \`${dateCol.name}\`) AS \`月份\`,
  ${metric} AS \`${label}\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', \`${dateCol.name}\`)
ORDER BY \`月份\` ASC`,
      title: 'MRR 流失分析',
      description: '月度 MRR 流失趋势',
      charts: [{ type: 'line', xAxis: '月份', yAxis: label }],
    }
  },

  search_keyword: (table, cols) => {
    const keywordCol = cols.find(c => /keyword|search|term|query/i.test(c.name))
    if (!keywordCol) return null
    return {
      sql: `SELECT
  \`${keywordCol.name}\` AS \`搜索词\`,
  COUNT(*) AS \`搜索次数\`,
  COUNT(DISTINCT \`${findUserIdColumn(cols)?.name || 'id'}\`) AS \`搜索用户数\`
FROM \`${table}\`
GROUP BY \`${keywordCol.name}\`
HAVING \`${keywordCol.name}\` IS NOT NULL AND \`${keywordCol.name}\` != ''
ORDER BY \`搜索次数\` DESC
LIMIT 20`,
      title: '搜索词分析',
      description: '热门搜索词 TOP 20 及搜索用户数',
      charts: [{ type: 'bar', xAxis: '搜索词', yAxis: '搜索次数' }],
    }
  },

  nps_analysis: (table, cols) => {
    const scoreCol = cols.find(c => /nps|score|rating|rating_value|point/i.test(c.name))
    const dateCol = findDateColumn(cols)
    if (!scoreCol) return null
    return {
      sql: `SELECT
  CASE
    WHEN \`${scoreCol.name}\` >= 9 THEN '推荐者'
    WHEN \`${scoreCol.name}\` >= 7 THEN '中立者'
    ELSE '批评者'
  END AS \`用户类型\`,
  COUNT(*) AS \`人数\`,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS \`占比(%)\`
FROM \`${table}\`
GROUP BY 1
ORDER BY \`人数\` DESC`,
      title: 'NPS 满意度分析',
      description: '推荐者/中立者/批评者分布及 NPS 分数',
      charts: [
        { type: 'pie', valueField: '人数', labelField: '用户类型' },
        { type: 'number' as const, valueField: 'NPS分数', labelField: '分数' },
      ],
    }
  },

  cohort_retention: (table, cols, dbType) => {
    const userCol = findUserIdColumn(cols)
    const dateCol = findDateColumn(cols)
    if (!dateCol || !userCol) return null
    // 文件数据库不支持 CTE，直接返回 null
    if (isFileDb(dbType)) return null
    return {
      sql: `WITH cohort AS (
  SELECT
    \`${userCol.name}\` AS user_id,
    DATE(\`${dateCol.name}\`) AS cohort_date
  FROM \`${table}\`
  WHERE \`${dateCol.name}\` IS NOT NULL
  GROUP BY \`${userCol.name}\`, DATE(\`${dateCol.name}\`)
),
retention AS (
  SELECT
    c.cohort_date AS \`注册月份\`,
    COUNT(DISTINCT c.user_id) AS \`当月用户\`,
    COUNT(DISTINCT CASE WHEN DATE(e.\`${dateCol.name}\`) >= c.cohort_date + INTERVAL '1 month' THEN e.\`${userCol.name}\` END) AS \`次月留存\`
  FROM cohort c
  LEFT JOIN \`${table}\` e ON c.user_id = e.\`${userCol.name}\`
  GROUP BY c.cohort_date
)
SELECT
  \`注册月份\`,
  \`当月用户\`,
  \`次月留存\`,
  ROUND(\`次月留存\` / \`当月用户\` * 100, 1) AS \`次月留存率(%)\`
FROM retention
ORDER BY \`注册月份\` DESC
LIMIT 12`,
      title: '同期群留存',
      description: '按注册月份分组的留存热力图',
      charts: [{ type: 'line', xAxis: '注册月份', yAxis: '次月留存率(%)' }],
    }
  },

  reactivation: (table, cols, dbType) => {
    const dateCol = findDateColumn(cols)
    const userCol = findUserIdColumn(cols)
    if (!dateCol || !userCol) return null
    if (isFileDb(dbType)) return null
    return {
      sql: `WITH last_active AS (
  SELECT \`${userCol.name}\` AS user_id, MAX(DATE(\`${dateCol.name}\`)) AS last_date
  FROM \`${table}\` GROUP BY \`${userCol.name}\`
),
reactivated AS (
  SELECT
    CASE
      WHEN last_date >= CURRENT_DATE - INTERVAL '30 days' THEN '召回成功（30天内活跃）'
      WHEN last_date >= CURRENT_DATE - INTERVAL '90 days' THEN '召回有效（90天内活跃）'
      ELSE '沉默用户'
    END AS \`用户状态\`,
    COUNT(*) AS \`用户数\`
  FROM last_active GROUP BY 1
)
SELECT * FROM reactivated ORDER BY \`用户数\` DESC`,
      title: '用户召回分析',
      description: '流失用户重新激活效果分析',
      charts: [{ type: 'pie', valueField: '用户数', labelField: '用户状态' }],
    }
  },

  headcount_trend: (table, cols) => {
    const dateCol = findDateColumn(cols)
    if (!dateCol) return null
    return {
      sql: `SELECT
  DATE_TRUNC('month', \`${dateCol.name}\`) AS \`月份\`,
  COUNT(*) AS \`员工数\`
FROM \`${table}\`
GROUP BY DATE_TRUNC('month', \`${dateCol.name}\`)
ORDER BY \`月份\` ASC`,
      title: '人员规模趋势',
      description: '每月员工人数变化',
      charts: [{ type: 'line', xAxis: '月份', yAxis: '员工数' }],
    }
  },

  attrition_rate: (table, cols) => {
    const dateCol = findDateColumn(cols)
    const statusCol = findCategoryColumn(cols)
    if (!dateCol) return null
    return {
      sql: statusCol
        ? `SELECT
  \`${statusCol.name}\` AS \`${guessAlias(statusCol)}\`,
  COUNT(*) AS \`人数\`
FROM \`${table}\`
GROUP BY \`${statusCol.name}\`
ORDER BY \`人数\` DESC`
        : `SELECT
  DATE(\`${dateCol.name}\`) AS \`月份\`,
  COUNT(*) AS \`离职人数\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '12 months'
GROUP BY DATE(\`${dateCol.name}\`)
ORDER BY \`月份\` ASC`,
      title: '人员流失率',
      description: '离职人数和原因分布',
      charts: [{ type: 'bar', xAxis: guessAlias(statusCol || cols[0]), yAxis: '人数' }],
    }
  },

  // ── 通用 ──────────────────────────────────────────────────────────────────

  data_overview: (table, cols, dbType) => {
    if (isFileDb(dbType)) {
      return {
        sql: `SELECT COUNT(*) AS value FROM "${table}"`,
        title: '数据概览',
        description: '表格基础统计（文件模式）',
        charts: [{ type: 'number' as const, valueField: 'value' }],
      }
    }
    const numericCols = cols.filter(c => c.inferredType === 'number')
    const textCols = cols.filter(c => c.inferredType === 'string' || c.inferredType === 'id')

    const stats: string[] = [`SELECT COUNT(*) AS \`总记录数\` FROM \`${table}\``]

    textCols.slice(0, 5).forEach(col => {
      stats.push(`SELECT '${col.name}' AS \`字段\`, '文本' AS \`类型\`, COUNT(DISTINCT \`${col.name}\`) AS \`不同值数\`, '—' AS \`均值\`, '—' AS \`范围\` FROM \`${table}\``)
    })

    numericCols.slice(0, 5).forEach(col => {
      stats.push(`SELECT '${col.name}' AS \`字段\`, '数值' AS \`类型\`, COUNT(DISTINCT \`${col.name}\`) AS \`不同值数\`, ROUND(AVG(\`${col.name}\`), 2) AS \`均值\`, CONCAT(MIN(\`${col.name}\`), ' - ', MAX(\`${col.name}\`)) AS \`范围\` FROM \`${table}\``)
    })

    const sql = stats.slice(1).length > 0
      ? `-- 基础统计\nSELECT COUNT(*) AS \`总记录数\` FROM \`${table}\`\n\n` + stats.slice(1).join('\nUNION ALL\n')
      : `SELECT COUNT(*) AS \`总记录数\` FROM \`${table}\``

    return {
      sql,
      title: '数据概览',
      description: '表格基础统计：记录数、字段分布、数值摘要',
      charts: [{ type: 'number' as const, valueField: '总记录数' }],
    }
  },

  time_series: (table, cols, dbType) => {
    const dateCol = findDateColumn(cols)
    const numCol = findNumericColumn(cols)
    if (!dateCol) return null
    const metric = numCol ? `SUM(\`${numCol.name}\`)` : 'COUNT(*)'
    const label = numCol ? guessAlias(numCol) : '记录数'
    if (isFileDb(dbType)) {
      // CSV 无法 DATE_TRUNC，按 dateCol 原始值分组会产生大量无意义行
      // 改用月份聚合标记，由 JS 层做按月汇总
      const valueExpr = numCol ? `"${numCol.name}"` : '1'
      return {
        sql: `SELECT "${dateCol.name}"${valueExpr ? `, "${valueExpr.replace(/"/g, '')}"` : ''} FROM "${table}"`,
        title: '时序趋势',
        description: '按月聚合的指标趋势（文件模式）',
        charts: [{ type: 'line', xAxis: 'period', yAxis: 'value' }],
      }
    }
    return {
      sql: `SELECT
  DATE_TRUNC('day', \`${dateCol.name}\`) AS \`日期\`,
  ${metric} AS \`${label}\`
FROM \`${table}\`
WHERE \`${dateCol.name}\` >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', \`${dateCol.name}\`)
ORDER BY \`日期\` ASC`,
      title: '时序趋势',
      description: '指标随时间的变化趋势',
      charts: [{ type: 'line', xAxis: '日期', yAxis: label }],
    }
  },

  top_n_ranking: (table, cols, dbType) => {
    const categoryCol = findCategoryColumn(cols)
    const amountCol = findAmountColumn(cols)
    const numCol = amountCol || findNumericColumn(cols)
    if (!categoryCol || !numCol) return null
    if (isFileDb(dbType)) {
      return {
        sql: `SELECT "${categoryCol.name}" AS name, SUM("${numCol.name}") AS value
FROM "${table}"
WHERE "${categoryCol.name}" IS NOT NULL
GROUP BY "${categoryCol.name}"
ORDER BY value DESC
LIMIT 20`,
        title: 'TOP N 排行',
        description: '按维度统计的 TOP 20 排名（文件模式）',
        charts: [{ type: 'bar', xAxis: 'name', yAxis: 'value' }],
      }
    }
    return {
      sql: `SELECT
  \`${categoryCol.name}\` AS \`${guessAlias(categoryCol)}\`,
  SUM(\`${numCol.name}\`) AS \`${guessAlias(numCol)}\`
FROM \`${table}\`
GROUP BY \`${categoryCol.name}\`
ORDER BY \`${guessAlias(numCol)}\` DESC
LIMIT 20`,
      title: 'TOP N 排行',
      description: '按维度统计的 TOP 20 排名',
      charts: [{ type: 'bar', xAxis: guessAlias(categoryCol), yAxis: guessAlias(numCol) }],
    }
  },

  anomaly_detection: (table, cols, dbType) => {
    const numCol = findNumericColumn(cols)
    if (!numCol) return null
    if (isFileDb(dbType)) {
      // CSV 不支持窗口函数和 STDDEV，按数值字段简单分组统计
      return {
        sql: `SELECT "${numCol.name}" AS name, COUNT(*) AS value
FROM "${table}"
WHERE "${numCol.name}" IS NOT NULL
GROUP BY "${numCol.name}"
ORDER BY value DESC
LIMIT 20`,
        title: '异常数据检测',
        description: '数值分布统计（文件模式）',
        charts: [{ type: 'bar', xAxis: 'name', yAxis: 'value' }],
      }
    }
    return {
      sql: `SELECT * FROM (
  SELECT
    *,
    ROUND(AVG(\`${numCol.name}\`) OVER (), 2) AS \`均值\`,
    ROUND(STDDEV(\`${numCol.name}\`) OVER (), 2) AS \`标准差\`,
    ABS(\`${numCol.name}\` - AVG(\`${numCol.name}\`) OVER ()) / NULLIF(STDDEV(\`${numCol.name}\`) OVER (), 0) AS \`Z分数\`
  FROM \`${table}\`
) t
WHERE \`Z分数\` > 2 OR \`Z分数\` < -2
ORDER BY \`Z分数\` DESC
LIMIT 100`,
      title: '异常数据检测',
      description: '使用 Z-score 识别偏离正常范围的异常记录',
      charts: [{ type: 'table' as const }],
    }
  },
}

// ─── 主入口：为指定模板生成 SQL ─────────────────────────────────────────────

export function generateTemplateSQL(
  templateId: string,
  tableName: string,
  columns: ColumnInfo[],
  dbType?: string
): GeneratedAnalysis | null {
  const generator = generators[templateId]
  if (!generator) return null
  const result = generator(tableName, columns, dbType)
  if (!result) return null

  // 文件数据库：后处理 SQL，去除不支持的语法
  if (isFileDb(dbType)) {
    const sql = fileSQL(result.sql)
    if (hasUnsupportedFileSQL(sql)) return null  // 仍有不支持语法则返回 null
    return { ...result, sql }
  }
  return result
}

// 自动选择一个合适的默认分析（当没有特定模板时）
export function autoSelectAnalysis(columns: ColumnInfo[], dbType?: string): { templateId: string; description: string } {
  // 文件数据库：优先选择简单 GROUP BY 模板，避免高级 SQL 语法
  if (isFileDb(dbType)) {
    const categoryCol = findCategoryColumn(columns)
    const amountCol = findAmountColumn(columns)
    const dateCol = findDateColumn(columns)
    const numericCol = findNumericColumn(columns)
    // 优先级：有日期 + 金额 → 时间趋势（最重要）
    if (dateCol && amountCol) return { templateId: 'revenue_trend', description: '收入趋势（按月）' }
    // 有金额 + 分类 → 分类统计
    if (amountCol && categoryCol) return { templateId: 'revenue_trend', description: '分类收入统计' }
    // 有日期无金额 → 时序统计
    if (dateCol) return { templateId: 'time_series', description: '时序趋势（按月）' }
    // 有分类 → 分类统计
    if (categoryCol) return { templateId: 'top_n_ranking', description: '分类统计' }
    // 有金额 → TOP N
    if (amountCol || numericCol) return { templateId: 'top_n_ranking', description: 'TOP N 排行' }
    return { templateId: 'data_overview', description: '数据概览' }
  }

  const dateCol = findDateColumn(columns)
  const userCol = findUserIdColumn(columns)
  const amountCol = findAmountColumn(columns)
  const eventCol = findEventColumn(columns)
  const orderCol = findCategoryColumn(columns)

  if (amountCol && dateCol) return { templateId: 'revenue_trend', description: '收入趋势分析' }
  if (eventCol && userCol) return { templateId: 'feature_usage', description: '功能使用分析' }
  if (userCol && dateCol) return { templateId: 'user_growth_trend', description: '用户增长分析' }
  if (amountCol) return { templateId: 'top_n_ranking', description: 'TOP N 排行' }
  if (dateCol) return { templateId: 'time_series', description: '时序趋势' }
  return { templateId: 'data_overview', description: '数据概览' }
}

// 获取所有支持的模板 ID
export function getSupportedTemplateIds(): string[] {
  return Object.keys(generators)
}
