/**
 * 文件数据表注册中心
 * 将上传的 CSV/Excel 文件解析为内存中的查询表
 */

import * as fs from 'fs'

export interface TableColumn {
  name: string
  inferredType: 'number' | 'string' | 'date' | 'boolean' | 'id' | 'unknown'
  sampleValues?: string[]
}

export interface FileTable {
  dbId: string        // 对应 DatabaseConfig.id
  tableName: string   // 表格名（去掉扩展名）
  columns: TableColumn[]
  rows: Record<string, any>[]
  rawContent?: string // 原始内容（可选，用于全文检索）
}

// ─── CSV 解析 ────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function inferColumnType(name: string, values: string[]): TableColumn['inferredType'] {
  const nonEmpty = values.filter(v => v != null && v !== '' && v !== 'null' && v !== 'undefined')
  if (nonEmpty.length === 0) return 'unknown'

  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/,
    /^\d{2}\/\d{2}\/\d{4}/,
    /^\d{4}\/\d{2}\/\d{2}/,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
  ]
  if (nonEmpty.every(v => datePatterns.some(p => p.test(v)))) return 'date'

  const boolValues = new Set(['true', 'false', '1', '0', 'yes', 'no', '是', '否'])
  if (nonEmpty.every(v => boolValues.has(v.toLowerCase()))) return 'boolean'

  const numericCount = nonEmpty.filter(v => !isNaN(Number(v.replace(/,/g, ''))))
  if (numericCount.length / nonEmpty.length > 0.8) return 'number'

  const nameLower = name.toLowerCase()
  if (nameLower.includes('_id') || nameLower.startsWith('id_') || nameLower === 'id') return 'id'

  return 'string'
}

// 加载并解析 CSV 文件
function loadCSV(filePath: string): { columns: TableColumn[]; rows: Record<string, any>[] } {
  const content = fs.readFileSync(filePath, 'utf-8')
  return parseCSVContent(content)
}

// 解析 CSV 内容字符串（导出供外部使用）
export function parseCSVContent(content: string): { columns: TableColumn[]; rows: Record<string, any>[] } {
  const lines = content.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { columns: [], rows: [] }

  const headers = parseCSVLine(lines[0])
  const dataRows = lines.slice(1)

  // 采样前 20 行推断类型
  const sampleRows = dataRows.slice(0, 20)
  const sampleValues: Record<string, string[]> = {}
  headers.forEach(h => { sampleValues[h] = [] })

  for (const line of sampleRows) {
    const cols = parseCSVLine(line)
    headers.forEach((h, i) => {
      if (cols[i] !== undefined) sampleValues[h].push(cols[i])
    })
  }

  const columns: TableColumn[] = headers.map(name => ({
    name,
    inferredType: inferColumnType(name, sampleValues[name] || []),
    sampleValues: (sampleValues[name] || []).slice(0, 3),
  }))

  // 解析全部数据行
  const rows: Record<string, any>[] = dataRows.map(line => {
    const cols = parseCSVLine(line)
    const row: Record<string, any> = {}
    headers.forEach((h, i) => {
      const val = cols[i] ?? null
      const colType = columns[i]?.inferredType || 'string'
      if (val === null || val === '') {
        row[h] = null
      } else if (colType === 'number') {
        row[h] = Number(val.replace(/,/g, '')) || 0
      } else if (colType === 'boolean') {
        row[h] = ['true', '1', 'yes', '是'].includes(val.toLowerCase())
      } else {
        row[h] = val
      }
    })
    return row
  })

  return { columns, rows }
}

// ─── 文件表注册中心 ──────────────────────────────────────────────────────────

class FileTableRegistry {
  private tables = new Map<string, FileTable>() // key: `${dbId}::${tableName}`

  /**
   * 加载文件到注册表（通过路径）
   */
  loadFile(dbId: string, filePath: string, fileName: string): FileTable {
    const lastDot = fileName.lastIndexOf('.')
    const ext = lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase() : ''
    const tableName = lastDot >= 0 ? fileName.replace(/\.[^/.]+$/, '') : fileName
    const key = `${dbId}::${tableName}`

    const isDataFile = ext === 'csv' || ext === 'tsv' || ext === ''  // 无扩展名也当 CSV 处理
    if (isDataFile) {
      const { columns, rows } = loadCSV(filePath)
      const table: FileTable = { dbId, tableName, columns, rows }
      this.tables.set(key, table)
      return table
    }

    // 其他格式暂不支持，提供空表结构
    const table: FileTable = { dbId, tableName, columns: [], rows: [] }
    this.tables.set(key, table)
    return table
  }

  /**
   * 直接加载文件内容（用于拖拽场景，file.path 可能无效）
   */
  loadFileContent(dbId: string, content: string, fileName: string): FileTable {
    // 先取扩展名，再算表名（fileName 可能已经有扩展名，也可能没有）
    const lastDot = fileName.lastIndexOf('.')
    const ext = lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase() : ''
    const tableName = lastDot >= 0 ? fileName.replace(/\.[^/.]+$/, '') : fileName
    const key = `${dbId}::${tableName}`

    const isDataFile = ext === 'csv' || ext === 'tsv' || ext === ''  // 无扩展名也当 CSV 处理（数据导入场景）
    if (isDataFile) {
      const { columns, rows } = parseCSVContent(content)
      const table: FileTable = { dbId, tableName, columns, rows }
      this.tables.set(key, table)
      return table
    }

    const table: FileTable = { dbId, tableName, columns: [], rows: [] }
    this.tables.set(key, table)
    return table
  }

  /**
   * 获取某个数据库的全部表
   */
  getTablesForDb(dbId: string): FileTable[] {
    const result: FileTable[] = []
    for (const [key, table] of this.tables) {
      if (key.startsWith(`${dbId}::`)) {
        result.push(table)
      }
    }
    return result
  }

  /**
   * 获取单个表
   */
  getTable(dbId: string, tableName: string): FileTable | undefined {
    return this.tables.get(`${dbId}::${tableName}`)
  }

  /**
   * 执行 SQL 查询（仅支持简单 SELECT）
   * 支持：SELECT * FROM tableName [WHERE col = val] [LIMIT n] [OFFSET n]
   *       COUNT, MIN, MAX, AVG 聚合
   */
  query(dbId: string, sql: string): { columns: string[]; rows: Record<string, any>[]; rowCount: number } {
    const tables = this.getTablesForDb(dbId)

    // 简单 SQL 解析
    const sqlUpper = sql.trim().toUpperCase()
    const fromMatch = sqlUpper.match(/FROM\s+[`"']?([^\s,`"]+)[`"']?/i)
    if (!fromMatch) throw new Error(`无效的 SQL 语句（缺少 FROM 子句）：${sql.trim().substring(0, 100)}`)

    const tableName = fromMatch[1].replace(/[`"']/g, '')
    const table = tables.find(t => t.tableName.toUpperCase() === tableName.toUpperCase())
    if (!table) throw new Error(`表 "${tableName}" 不存在`)

    let filtered = [...table.rows]

    // WHERE 支持（简单相等）
    const whereMatch = sql.match(/WHERE\s+[`"']?(\w+)[`"']?\s*=\s*['"]?([^'";]+)['"]?/i)
    if (whereMatch) {
      const col = whereMatch[1]
      const val = whereMatch[2]
      filtered = filtered.filter(r => String(r[col]) === val)
    }

    // LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i)
    const limit = limitMatch ? parseInt(limitMatch[1]) : filtered.length

    // OFFSET
    const offsetMatch = sql.match(/OFFSET\s+(\d+)/i)
    const offset = offsetMatch ? parseInt(offsetMatch[1]) : 0

    // GROUP BY 支持
    const groupByMatch = sql.match(/GROUP\s+BY\s+[`"']?(\w+)[`"']?/i)
    if (groupByMatch) {
      const groupCol = groupByMatch[1]

      // 解析 SELECT 中的聚合
      const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/i)
      if (!selectMatch) throw new Error('无效的 SQL 语句')

      const selectParts = selectMatch[1].split(',').map((p: string) => p.trim())
      // 找分组列（X轴）和聚合列（Y轴）
      let groupAlias = groupCol        // AS name
      let aggExpr = ''                // e.g. COUNT(DISTINCT user_id)
      let aggCol = ''                 // e.g. user_id

      for (const part of selectParts) {
        const asMatch = part.match(/^(.+?)\s+AS\s+\w+$/i)
        if (asMatch) {
          const expr = asMatch[1].trim()
          if (expr.toUpperCase() !== groupCol.toUpperCase()) {
            aggExpr = expr
          }
        }
      }

      // 提取聚合函数和列名
      let aggFn = ''
      const countDistMatch = aggExpr.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*DISTINCT\s+[`"']?(\w+)[`"']?\s*\)/i)
      if (countDistMatch) {
        aggFn = countDistMatch[1].toUpperCase() + '_DISTINCT'
        aggCol = countDistMatch[2]
      } else {
        const aggFnMatch = aggExpr.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*[`"']?(\w+)[`"']?\s*\)/i)
        if (aggFnMatch) {
          aggFn = aggFnMatch[1].toUpperCase()
          aggCol = aggFnMatch[2]
        }
      }

      // 按分组列聚合
      const groups: Record<string, Record<string, any>[]> = {}
      for (const row of filtered) {
        const key = String(row[groupCol] ?? '')
        if (!groups[key]) groups[key] = []
        groups[key].push(row)
      }

      const resultRows: Record<string, any>[] = Object.entries(groups)
        .slice(offset, offset + limit)
        .map(([key, rows]) => {
          const row: Record<string, any> = {}
          row['name'] = key
          if (aggFn && aggCol) {
            const vals = rows.map(r => Number(r[aggCol])).filter(v => !isNaN(v))
            if (aggFn === 'COUNT') {
              row['value'] = rows.length
            } else if (aggFn === 'COUNT_DISTINCT') {
              row['value'] = new Set(rows.map(r => r[aggCol])).size
            } else if (aggFn === 'SUM') {
              row['value'] = vals.reduce((a, b) => a + b, 0)
            } else if (aggFn === 'AVG') {
              row['value'] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
            } else if (aggFn === 'MIN') {
              row['value'] = Math.min(...vals)
            } else if (aggFn === 'MAX') {
              row['value'] = Math.max(...vals)
            }
          }
          return row
        })

      return {
        columns: ['name', 'value'],
        rows: resultRows,
        rowCount: resultRows.length,
      }
    }

    const resultRows = filtered.slice(offset, offset + limit)

    // 聚合支持
    const countMatch = sql.match(/COUNT\s*\(\s*\*\s*\)/i)
    const aggMatch = sql.match(/(MIN|MAX|AVG)\s*\(\s*[`"']?(\w+)[`"']?\s*\)/i)
    const selectAllMatch = sqlUpper.includes('SELECT *')

    if (countMatch) {
      return {
        columns: ['count'],
        rows: [{ count: filtered.length }],
        rowCount: 1,
      }
    }

    if (aggMatch) {
      const fn = aggMatch[1].toUpperCase()
      const col = aggMatch[2]
      const vals = filtered.map(r => Number(r[col])).filter(v => !isNaN(v))
      const resultRow: Record<string, any> = {}
      if (fn === 'MIN') resultRow[`min_${col}`] = Math.min(...vals)
      if (fn === 'MAX') resultRow[`max_${col}`] = Math.max(...vals)
      if (fn === 'AVG') resultRow[`avg_${col}`] = vals.reduce((a, b) => a + b, 0) / vals.length
      return { columns: Object.keys(resultRow), rows: [resultRow], rowCount: 1 }
    }

    if (!selectAllMatch) {
      // SELECT col1, col2 ...
      const colList = sql.match(/SELECT\s+(.*?)\s+FROM/i)
      if (colList) {
        const cols = colList[1].split(',').map(c => c.trim().replace(/[`"']/g, ''))
        const isCountAll = cols.some(c => c === '*')
        if (!isCountAll) {
          return {
            columns: cols,
            rows: resultRows.map(r => {
              const row: Record<string, any> = {}
              cols.forEach(c => { row[c] = r[c] })
              return row
            }),
            rowCount: resultRows.length,
          }
        }
      }
    }

    // SELECT * 或 SELECT COUNT(*)
    return {
      columns: table.columns.map(c => c.name),
      rows: resultRows,
      rowCount: resultRows.length,
    }
  }

  /**
   * 移除数据库的所有表
   */
  removeDb(dbId: string) {
    for (const key of this.tables.keys()) {
      if (key.startsWith(`${dbId}::`)) {
        this.tables.delete(key)
      }
    }
  }
}

export const fileTableRegistry = new FileTableRegistry()
