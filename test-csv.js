/**
 * 直接测试 CSV 解析 + 完整流程
 */
const fs = require('fs');
const { parseCSVContent, fileTableRegistry } = require('./dist-main/main/database/file-registry.js');

const CSV_PATH = '/Users/terry/Downloads/transactions_v2.csv';
const content = fs.readFileSync(CSV_PATH, 'utf-8');

console.log('=== 测试 parseCSVContent（直接调用）===');
const direct = parseCSVContent(content);
console.log(`直接调用: ${direct.columns.length} 列, ${direct.rows.length} 行`);

console.log('\n=== 测试 loadFileContent（带 .csv 扩展名）===');
const table1 = fileTableRegistry.loadFileContent('test1', content, 'transactions_v2.csv');
console.log(`带.csv扩展名: ${table1.columns.length} 列, ${table1.rows.length} 行`);

console.log('\n=== 测试 loadFileContent（不带 .csv 扩展名）===');
const table2 = fileTableRegistry.loadFileContent('test2', content, 'transactions_v2');
console.log(`不带扩展名: ${table2.columns.length} 列, ${table2.rows.length} 行`);

console.log('\n=== 测试 getTablesForDb ===');
const tables1 = fileTableRegistry.getTablesForDb('test1');
const tables2 = fileTableRegistry.getTablesForDb('test2');
console.log(`test1 的表: ${tables1.length} 个`);
console.log(`test2 的表: ${tables2.length} 个`);

console.log('\n=== 测试 query ===');
try {
  const q1 = fileTableRegistry.query('test1', 'SELECT * FROM "transactions_v2" LIMIT 3');
  console.log(`query test1: ${q1.rowCount} 行`);
} catch(e) {
  console.log(`query test1 失败: ${e.message}`);
}

try {
  const q2 = fileTableRegistry.query('test2', 'SELECT * FROM "transactions_v2" LIMIT 3');
  console.log(`query test2: ${q2.rowCount} 行`);
} catch(e) {
  console.log(`query test2 失败: ${e.message}`);
}
