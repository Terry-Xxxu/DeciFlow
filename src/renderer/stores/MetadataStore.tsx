/**
 * 元数据存储
 * 管理表和字段的中文名称映射
 */

export interface FieldMetadata {
  name: string           // 原始字段名
  displayName: string    // 中文名称
  type: string          // 字段类型
  nullable: boolean     // 是否可空
  isPrimaryKey: boolean // 是否主键
  description?: string  // 描述
}

export interface TableMetadata {
  name: string           // 原始表名
  displayName: string    // 中文名称
  fields: FieldMetadata[] // 字段列表
  configured: boolean    // 是否已配置
}

export interface DatabaseMetadata {
  databaseId: string
  tables: TableMetadata[]
  lastScanned: number
}

const METADATA_STORE_KEY = 'deciflow_metadata'

/**
 * 获取数据库的元数据
 */
export function getDatabaseMetadata(databaseId: string): DatabaseMetadata | null {
  try {
    const allMetadata = getAllMetadata()
    return allMetadata[databaseId] || null
  } catch (error) {
    console.error('获取元数据失败:', error)
    return null
  }
}

/**
 * 获取所有元数据
 */
function getAllMetadata(): Record<string, DatabaseMetadata> {
  try {
    const saved = localStorage.getItem(METADATA_STORE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('加载元数据失败:', error)
  }
  return {}
}

/**
 * 保存所有元数据
 */
function saveAllMetadata(metadata: Record<string, DatabaseMetadata>) {
  try {
    localStorage.setItem(METADATA_STORE_KEY, JSON.stringify(metadata))
  } catch (error) {
    console.error('保存元数据失败:', error)
  }
}

/**
 * 保存数据库元数据
 */
export function saveDatabaseMetadata(databaseId: string, metadata: DatabaseMetadata): void {
  const allMetadata = getAllMetadata()
  allMetadata[databaseId] = metadata
  saveAllMetadata(allMetadata)
}

/**
 * 更新表的元数据
 */
export function updateTableMetadata(
  databaseId: string,
  tableName: string,
  updates: Partial<TableMetadata>
): void {
  const metadata = getDatabaseMetadata(databaseId)
  if (!metadata) return

  const tableIndex = metadata.tables.findIndex(t => t.name === tableName)
  if (tableIndex === -1) return

  metadata.tables[tableIndex] = { ...metadata.tables[tableIndex], ...updates }
  saveDatabaseMetadata(databaseId, metadata)
}

/**
 * 更新字段的元数据
 */
export function updateFieldMetadata(
  databaseId: string,
  tableName: string,
  fieldName: string,
  updates: Partial<FieldMetadata>
): void {
  const metadata = getDatabaseMetadata(databaseId)
  if (!metadata) return

  const table = metadata.tables.find(t => t.name === tableName)
  if (!table) return

  const fieldIndex = table.fields.findIndex(f => f.name === fieldName)
  if (fieldIndex === -1) return

  table.fields[fieldIndex] = { ...table.fields[fieldIndex], ...updates }

  // 检查是否所有字段都已配置
  table.configured = table.fields.every(f => f.displayName !== '')
  saveDatabaseMetadata(databaseId, metadata)
}

/**
 * 删除数据库的元数据
 */
export function deleteDatabaseMetadata(databaseId: string): void {
  const allMetadata = getAllMetadata()
  delete allMetadata[databaseId]
  saveAllMetadata(allMetadata)
}

/**
 * 扫描数据库真实表结构
 * 通过 electronAPI 连接数据库并查询 information_schema
 */
export async function scanDatabaseStructure(
  databaseId: string,
  databaseConfig?: any
): Promise<TableMetadata[]> {
  const api = (window as any).electronAPI
  if (!api || !databaseConfig) return []

  try {
    // 获取所有表名
    const tableNames: string[] = await api.database.tables(databaseConfig)
    if (!tableNames || tableNames.length === 0) return []

    const dbType = (databaseConfig.type || '').toLowerCase()
    const tables: TableMetadata[] = []

    for (const tableName of tableNames) {
      try {
        let sql = ''
        if (dbType.includes('mysql') || dbType.includes('mariadb')) {
          sql = `SELECT COLUMN_NAME as column_name, DATA_TYPE as data_type, IS_NULLABLE as is_nullable, COLUMN_KEY as column_key FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}' ORDER BY ORDINAL_POSITION`
        } else if (dbType.includes('postgres')) {
          sql = `SELECT c.column_name, c.data_type, c.is_nullable, CASE WHEN pk.column_name IS NOT NULL THEN 'PRI' ELSE '' END as column_key FROM information_schema.columns c LEFT JOIN (SELECT kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_name = kcu.table_name WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = '${tableName}') pk ON c.column_name = pk.column_name WHERE c.table_name = '${tableName}' AND c.table_schema = 'public' ORDER BY c.ordinal_position`
        } else {
          // SQLite: use PRAGMA
          sql = `PRAGMA table_info("${tableName}")`
        }

        const result = await api.database.query(databaseConfig, sql)
        let fields: FieldMetadata[] = []

        if (dbType.includes('sqlite')) {
          // SQLite PRAGMA returns: cid, name, type, notnull, dflt_value, pk
          fields = (result.rows || []).map((row: any) => ({
            name: row.name || '',
            displayName: '',
            type: row.type || 'TEXT',
            nullable: !row.notnull,
            isPrimaryKey: row.pk === 1 || row.pk === '1',
            description: ''
          }))
        } else {
          fields = (result.rows || []).map((row: any) => ({
            name: row.column_name || row.COLUMN_NAME || '',
            displayName: '',
            type: row.data_type || row.DATA_TYPE || 'unknown',
            nullable: (row.is_nullable || row.IS_NULLABLE || 'YES').toUpperCase() === 'YES',
            isPrimaryKey: (row.column_key || row.COLUMN_KEY || '') === 'PRI',
            description: ''
          }))
        }

        tables.push({ name: tableName, displayName: '', fields, configured: false })
      } catch {
        // If column query fails, add the table with empty fields
        tables.push({ name: tableName, displayName: '', fields: [], configured: false })
      }
    }

    return tables
  } catch (error) {
    console.error('扫描数据库结构失败:', error)
    return []
  }
}
