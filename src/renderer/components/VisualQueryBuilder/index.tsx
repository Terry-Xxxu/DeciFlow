/**
 * VisualQueryBuilder - 可视化查询构建器
 * 拖拽式构建SQL查询，无需写代码
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface TableField {
  name: string
  type: string
  description?: string
}

interface DatabaseTable {
  name: string
  fields: TableField[]
}

interface QueryCondition {
  id: string
  field: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN'
  value: string
}

interface VisualQueryProps {
  onSubmit: (sql: string) => void
}

export const VisualQueryBuilder: React.FC<VisualQueryProps> = ({ onSubmit }) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  // 模拟的数据库结构（实际应该从schema获取）
  const [tables] = useState<DatabaseTable[]>([
    {
      name: 'users',
      fields: [
        { name: 'id', type: 'INTEGER', description: '用户ID' },
        { name: 'name', type: 'VARCHAR', description: '用户名' },
        { name: 'email', type: 'VARCHAR', description: '邮箱' },
        { name: 'created_at', type: 'TIMESTAMP', description: '创建时间' },
        { name: 'channel', type: 'VARCHAR', description: '获客渠道' }
      ]
    },
    {
      name: 'orders',
      fields: [
        { name: 'id', type: 'INTEGER', description: '订单ID' },
        { name: 'user_id', type: 'INTEGER', description: '用户ID' },
        { name: 'amount', type: 'DECIMAL', description: '订单金额' },
        { name: 'status', type: 'VARCHAR', description: '订单状态' },
        { name: 'created_at', type: 'TIMESTAMP', description: '创建时间' }
      ]
    }
  ])

  const [selectedTable, setSelectedTable] = useState<string>('')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [conditions, setConditions] = useState<QueryCondition[]>([])
  const [limit, setLimit] = useState(100)

  // 添加条件
  const addCondition = () => {
    const newCondition: QueryCondition = {
      id: Date.now().toString(),
      field: '',
      operator: '=',
      value: ''
    }
    setConditions([...conditions, newCondition])
  }

  // 删除条件
  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id))
  }

  // 更新条件
  const updateCondition = (id: string, updates: Partial<QueryCondition>) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  // 切换字段选择
  const toggleField = (fieldName: string) => {
    if (selectedFields.includes(fieldName)) {
      setSelectedFields(selectedFields.filter(f => f !== fieldName))
    } else {
      setSelectedFields([...selectedFields, fieldName])
    }
  }

  // 生成SQL
  const generateSQL = (): string => {
    if (!selectedTable || selectedFields.length === 0) {
      return ''
    }

    let sql = `SELECT ${selectedFields.join(', ')} FROM ${selectedTable}`

    if (conditions.length > 0) {
      const whereClause = conditions.map(c => `${c.field} ${c.operator} ${c.operator === 'LIKE' ? `'%${c.value}%'` : c.value}`).join(' AND ')
      sql += ` WHERE ${whereClause}`
    }

    sql += ` LIMIT ${limit}`
    return sql
  }

  // 获取当前选中的表的字段
  const getCurrentTableFields = (): TableField[] => {
    const table = tables.find(t => t.name === selectedTable)
    return table?.fields || []
  }

  const handleExecute = () => {
    const sql = generateSQL()
    if (sql) {
      onSubmit(sql)
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* 表选择 */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📊</span>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
            选择数据表
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tables.map((table) => (
            <motion.button
              key={table.name}
              onClick={() => {
                setSelectedTable(table.name)
                setSelectedFields([])
                setConditions([])
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedTable === table.name
                  ? isDark
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-blue-500 bg-blue-50'
                  : isDark
                    ? 'border-slate-700 hover:border-blue-500/50'
                    : 'border-gray-200 hover:border-blue-500'
              }`}
            >
              <div className={`font-mono text-sm font-semibold ${
                selectedTable === table.name
                  ? isDark
                    ? 'text-blue-400'
                    : 'text-blue-700'
                  : isDark
                    ? 'text-slate-400'
                    : 'text-gray-700'
              }`}>
                {table.name}
              </div>
              <div className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                {table.fields.length} 个字段
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 字段选择 */}
      {selectedTable && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                选择字段
              </h3>
            </div>
            <button
              onClick={() => {
                const allFields = getCurrentTableFields().map(f => f.name)
                setSelectedFields(selectedFields.length === allFields.length ? [] : allFields)
              }}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                isDark
                  ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {selectedFields.length === getCurrentTableFields().length ? '取消全选' : '全选'}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {getCurrentTableFields().map((field) => (
              <motion.button
                key={field.name}
                onClick={() => toggleField(field.name)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedFields.includes(field.name)
                    ? isDark
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-green-500 bg-green-50'
                    : isDark
                      ? 'border-slate-700 hover:border-green-500/50'
                      : 'border-gray-200 hover:border-green-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-mono text-sm ${
                      selectedFields.includes(field.name)
                        ? isDark
                          ? 'text-green-400'
                          : 'text-green-700'
                        : isDark
                          ? 'text-slate-400'
                          : 'text-gray-700'
                    }`}>
                      {field.name}
                    </div>
                    <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                      {field.type}
                    </div>
                  </div>
                  {selectedFields.includes(field.name) && (
                    <span className="text-green-500">✓</span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* 筛选条件 */}
      {selectedTable && selectedFields.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔍</span>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                筛选条件
              </h3>
            </div>
            <button
              onClick={addCondition}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                isDark
                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              + 添加条件
            </button>
          </div>

          {conditions.length === 0 ? (
            <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
              点击"添加条件"来筛选数据
            </div>
          ) : (
            <div className="space-y-2">
              {conditions.map((condition, index) => (
                <div key={condition.id} className={`flex items-center gap-2 p-3 rounded-lg border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                    {index + 1}
                  </span>
                  <select
                    value={condition.field}
                    onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                      isDark
                        ? 'bg-slate-900 border-slate-600 text-slate-300'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">选择字段</option>
                    {selectedFields.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(condition.id, { operator: e.target.value as any })}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      isDark
                        ? 'bg-slate-900 border-slate-600 text-slate-300'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="=">&gt;=</option>
                    <option value="!=">&ne;</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&ge;</option>
                    <option value="<=">&le;</option>
                    <option value="LIKE">包含</option>
                  </select>
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                    placeholder="值"
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                      isDark
                        ? 'bg-slate-900 border-slate-600 text-slate-300 placeholder:text-slate-600'
                        : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                    }`}
                  />
                  <button
                    onClick={() => removeCondition(condition.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark
                        ? 'hover:bg-red-500/20 text-red-400'
                        : 'hover:bg-red-100 text-red-600'
                    }`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 限制数量 */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
            <label className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              返回结果数量:
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              min={1}
              max={10000}
              className={`w-32 px-3 py-2 rounded-lg text-sm ${
                isDark
                  ? 'bg-slate-900 border-slate-600 text-slate-300'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
        </motion.div>
      )}

      {/* 生成的SQL预览 */}
      {selectedTable && selectedFields.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">💾</span>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                生成的SQL
              </h3>
            </div>
            <button
              onClick={handleExecute}
              disabled={!generateSQL()}
              className="px-5 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:opacity-90 shadow-lg flex items-center gap-2"
            >
              <span>▶</span>
              <span>执行查询</span>
            </button>
          </div>
          <div className={`p-4 rounded-xl font-mono text-sm overflow-x-auto ${
            isDark
              ? 'bg-slate-950 text-slate-300'
              : 'bg-gray-900 text-gray-100'
          }`}>
            {generateSQL() || <span className={isDark ? 'text-slate-600' : 'text-gray-500'}>
              选择表和字段后将自动生成SQL...
            </span>}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default VisualQueryBuilder
