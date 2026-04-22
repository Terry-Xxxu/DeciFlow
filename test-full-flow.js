/**
 * 端到端测试：模拟 file:register -> addDatabase -> analysis:run 的完整流程
 */
const fs = require('fs');

// 模拟 DatabaseStore 配置（从磁盘加载）
const DB_STORE_KEY = 'deciflow_databases_test';
const saved = localStorage.getItem(DB_STORE_KEY);
const databases = saved ? JSON.parse(saved) : [];

console.log('=== 当前 localStorage 中的文件数据源 ===');
databases.filter(db => db.type === 'file').forEach(db => {
  console.log(`  ${db.name}: fileContent长度=${db.fileContent?.length || 0}, filePath=${db.filePath || '(无)'}`);
});

// 模拟 file:register 逻辑（修复后的版本）
function fileRegister(dbId, filePath, fileName, content) {
  if (content !== undefined) {
    return { success: true, content };
  }
  // 走路径读取
  const resolved = path.resolve(filePath);
  const fileContent = fs.readFileSync(resolved, 'utf-8');
  return { success: true, content: fileContent };
}

// 加载编译后的模块
const path2 = require('path');
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k]; },
  setItem(k, v) { this._store[k] = v; },
  removeItem(k) { delete this._store[k]; },
};
const { fileTableRegistry } = require('./dist-main/main/database/file-registry.js');
const { generateTemplateSQL, autoSelectAnalysis } = require('./dist-main/main/analysis/template-sql-generator.js');

// 模拟实际的数据源配置
const TEST_CSV = '/Users/terry/Downloads/transactions_v2.csv';
const TEST_DB_ID = 'file-1745234567000';
const TEST_FILE_NAME = 'transactions_v2.csv';  // 带扩展名
const TEST_TABLE_NAME = 'transactions_v2';       // 去掉扩展名

console.log('\n=== 步骤1: 模拟 file:register (修复后的后端) ===');
const registerResult = fileRegister(TEST_DB_ID, TEST_CSV, TEST_FILE_NAME, undefined);
console.log(`file:register 结果: success=${registerResult.success}, content长度=${registerResult.content.length}`);

// 模拟 V0DataSourcesPage 的 addDatabase 行为
const config = {
  id: TEST_DB_ID,
  name: TEST_TABLE_NAME,
  type: 'file',
  host: `file://${TEST_FILE_NAME}`,
  port: 0,
  database: TEST_FILE_NAME,
  username: '',
  connected: true,
  projectId: 'default',
  connectMethod: 'file',
  filePath: TEST_CSV,
  fileContent: registerResult.content,  // ← 这是关键：保存 content
};

// 保存到模拟的 localStorage
const sanitized = { ...config };
delete sanitized.fileContent; // saveDatabases 会排除 password，但排除 fileContent
// 实际 saveDatabases 现在会保存 fileContent（修复后）
console.log('\n=== 步骤2: 模拟 addDatabase -> localStorage ===');
console.log(`config.fileContent 长度: ${config.fileContent.length}`);
console.log(`(localStorage 会存储这个长度=${config.fileContent.length} 的内容)`);

// 模拟 analysis:run 的逻辑（从 localStorage 恢复 + 注册）
console.log('\n=== 步骤3: 模拟 analysis:run（从 localStorage 恢复）===');
const recoveredConfig = config;  // 从 localStorage 读出来就是这个
const dbType = recoveredConfig.type;
const fileContent = recoveredConfig.fileContent;
const filePath = recoveredConfig.filePath;
const dbId = recoveredConfig.id;

console.log(`dbType: ${dbType}`);
console.log(`fileContent 长度: ${fileContent?.length || 0}`);
console.log(`filePath: ${filePath || '(无)'}`);

if (dbType === 'file' && dbId) {
  // 强制注册/重新注册文件（覆盖旧数据）
  if (fileContent) {
    // 使用 database 字段作为表名（包含扩展名）
    const tableName = (recoveredConfig.database || TEST_TABLE_NAME).replace(/\.[^/.]+$/, '');
    console.log(`\n调用 loadFileContent(${dbId}, content[${fileContent.length}], ${tableName})`);
    fileTableRegistry.loadFileContent(dbId, fileContent, recoveredConfig.database);
  } else if (filePath) {
    console.log(`\n调用 loadFile(${dbId}, ${filePath}, ${recoveredConfig.database})`);
    fileTableRegistry.loadFile(dbId, filePath, recoveredConfig.database);
  }

  const tables = fileTableRegistry.getTablesForDb(dbId);
  const table = tables.find(t => t.tableName === TEST_TABLE_NAME);
  console.log(`\n注册后 getTablesForDb: ${tables.length} 个表`);
  if (table) {
    console.log(`找到表: ${table.tableName}, ${table.rows.length} 行, ${table.columns.length} 列`);
  } else {
    console.log('❌ 表没找到！');
    tables.forEach(t => console.log(`  可用表: ${t.tableName}`));
  }
}

console.log('\n=== 步骤4: 自动分析 ===');
const columns = fileTableRegistry.getTablesForDb(dbId)[0]?.columns || [];
const autoSelect = autoSelectAnalysis(columns, 'file');
console.log(`自动选择: ${autoSelect.templateId} (${autoSelect.description})`);

const analysis = generateTemplateSQL(autoSelect.templateId, TEST_TABLE_NAME, columns, 'file');
if (!analysis) {
  console.log('❌ SQL 生成失败');
} else {
  console.log(`SQL: ${analysis.sql}`);

  const result = fileTableRegistry.query(dbId, analysis.sql);
  console.log(`\n执行结果: ${result.rowCount} 行`);
  if (result.rows.length > 0) {
    console.log(`第一行: ${JSON.stringify(result.rows[0])}`);
  }
}

console.log('\n=== revenue_trend 测试 ===');
const revenueAnalysis = generateTemplateSQL('revenue_trend', TEST_TABLE_NAME, columns, 'file');
if (!revenueAnalysis) {
  console.log('❌ revenue_trend 返回 null');
  // 检查原因
  const dateCol = columns.find(c => /date|time|at$|_at|created|updated|timestamp/.test(c.name.toLowerCase()));
  const amountCol = columns.find(c => /amount|price|revenue|income|cost|fee/.test(c.name.toLowerCase()));
  console.log(`  原因: dateCol=${dateCol?.name || '无'}, amountCol=${amountCol?.name || '无'}`);
} else {
  console.log(`SQL: ${revenueAnalysis.sql}`);
  try {
    const r = fileTableRegistry.query(dbId, revenueAnalysis.sql);
    console.log(`结果: ${r.rowCount} 行`);
    if (r.rows.length > 0) console.log(`第一行: ${JSON.stringify(r.rows[0])}`);
  } catch(e) {
    console.log(`执行失败: ${e.message}`);
  }
}
