/**
 * 测试脚本：模拟一键分析完整流程
 */

const fs = require('fs');
const path = require('path');

// 直接加载编译后的模块
const { fileTableRegistry, parseCSVContent } = require('./dist-main/main/database/file-registry.js');
const { generateTemplateSQL, autoSelectAnalysis } = require('./dist-main/main/analysis/template-sql-generator.js');

const TEST_DB_ID = 'test-db-transactions';
const TEST_TABLE_NAME = 'transactions_v2';
const CSV_PATH = '/Users/terry/Downloads/transactions_v2.csv';

async function runTest() {
  console.log('=== 步骤1: 读取并注册 CSV 文件 ===');
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  console.log(`文件大小: ${content.length} 字符`);
  console.log(`前100字符: "${content.slice(0, 100)}"`);

  console.log('\n=== 步骤2: 注册到 fileTableRegistry ===');
  fileTableRegistry.loadFileContent(TEST_DB_ID, content, TEST_TABLE_NAME);
  const tables = fileTableRegistry.getTablesForDb(TEST_DB_ID);
  console.log(`注册的表数量: ${tables.length}`);
  if (tables.length > 0) {
    const table = tables[0];
    console.log(`表名: ${table.tableName}`);
    console.log(`行数: ${table.rows.length}`);
    console.log(`列数: ${table.columns.length}`);
    console.log(`列信息:`, table.columns.map(c => ({ name: c.name, type: c.inferredType })));
  }

  console.log('\n=== 步骤3: 推断表类型 ===');
  const columns = tables[0]?.columns || [];
  const colNames = columns.map(c => c.name);
  console.log(`列名: ${colNames.join(', ')}`);

  const autoSelect = autoSelectAnalysis(columns, 'file');
  console.log(`自动选择的模板: ${autoSelect.templateId} (${autoSelect.description})`);

  console.log('\n=== 步骤4: 生成模板 SQL ===');
  const analysis = generateTemplateSQL(autoSelect.templateId, TEST_TABLE_NAME, columns, 'file');
  if (!analysis) {
    console.log('❌ SQL 生成失败 (返回 null)');
    console.log('可能原因: hasUnsupportedFileSQL 检测到不支持的语法');
    process.exit(1);
  }
  console.log(`模板标题: ${analysis.title}`);
  console.log(`生成的 SQL:\n${analysis.sql}`);

  console.log('\n=== 步骤5: 执行 SQL ===');
  try {
    const result = fileTableRegistry.query(TEST_DB_ID, analysis.sql);
    console.log(`成功! 返回 ${result.rowCount} 行, ${result.columns.length} 列`);
    console.log(`列名: ${result.columns.join(', ')}`);
    if (result.rows.length > 0) {
      console.log(`第一行:`, result.rows[0]);
    }
    if (result.rows.length > 1) {
      console.log(`第二行:`, result.rows[1]);
    }
  } catch (err) {
    console.log(`❌ 执行失败: ${err.message}`);
    console.log(`失败的 SQL: ${analysis.sql}`);
  }

  console.log('\n=== 额外测试: 测试 revenue_trend 模板 ===');
  const revenueAnalysis = generateTemplateSQL('revenue_trend', TEST_TABLE_NAME, columns, 'file');
  if (!revenueAnalysis) {
    console.log('❌ revenue_trend 也返回 null');
    // 检查生成器逻辑
    const dateCol = columns.find(c => /date|time|at$|_at/.test(c.name.toLowerCase()));
    const amountCol = columns.find(c => /amount|price|revenue|income|cost|fee/.test(c.name.toLowerCase()));
    console.log(`找到日期列: ${dateCol?.name || '无'}`);
    console.log(`找到金额列: ${amountCol?.name || '无'}`);
  } else {
    console.log(`revenue_trend SQL:\n${revenueAnalysis.sql}`);
    try {
      const r = fileTableRegistry.query(TEST_DB_ID, revenueAnalysis.sql);
      console.log(`revenue_trend 结果: ${r.rowCount} 行`);
      if (r.rows.length > 0) console.log(`第一行:`, r.rows[0]);
    } catch (err) {
      console.log(`❌ revenue_trend 执行失败: ${err.message}`);
    }
  }

  console.log('\n=== 测试完成 ===');
}

runTest().catch(err => {
  console.error('测试脚本出错:', err);
  process.exit(1);
});
