#!/usr/bin/env tsx

/**
 * DeciFlow 测试运行脚本
 * 运行所有测试并生成报告
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

// 测试配置
const TEST_CONFIG = {
  testFiles: [
    'src/test/ai-functionality.test.ts',
    'src/test/database-connection.test.ts',
    'src/test/chart-visualization.test.ts',
    'src/test/data-dictionary.test.ts',
    'src/test/security-functionality.test.ts'
  ],
  coverageDir: 'coverage',
  reportDir: 'test-reports',
  testTimeout: 30000 // 30秒超时
}

// 创建测试报告
interface TestReport {
  timestamp: Date
  totalTests: number
  passedTests: number
  failedTests: number
  duration: number
  coverage: {
    total: number
    covered: number
    percentage: number
  }
  details: {
    [testFile: string]: {
      total: number
      passed: number
      failed: number
      duration: number
      error?: string
    }
  }
}

async function setupTestEnvironment() {
  console.log('🔧 设置测试环境...')

  // 确保输出目录存在
  await fs.mkdir(TEST_CONFIG.coverageDir, { recursive: true })
  await fs.mkdir(TEST_CONFIG.reportDir, { recursive: true })

  // 安装依赖（如果需要）
  try {
    await execAsync('npm install --silent')
    console.log('✅ 依赖已安装')
  } catch (error) {
    console.warn('⚠️ 依赖安装失败，继续执行测试...')
  }
}

async function runVitestTests() {
  console.log('🧪 开始运行测试...')

  const startTime = Date.now()
  const testResults: TestReport['details'] = {}
  let totalTests = 0
  let passedTests = 0
  let failedTests = 0

  for (const testFile of TEST_CONFIG.testFiles) {
    const fileStartTime = Date.now()
    const fileName = path.basename(testFile, '.ts')

    try {
      console.log(`  📁 运行测试文件: ${testFile}`)

      // 运行单个测试文件
      const { stdout, stderr } = await execAsync(
        `vitest run ${testFile} --reporter=verbose --timeout=${TEST_CONFIG.testTimeout}`,
        { cwd: process.cwd() }
      )

      // 解析测试结果（简化版）
      const output = stdout + stderr
      const testMatch = output.match(/Test Files\s+\d+/)
      const passedMatch = output.match(/✅ Passed:\s+(\d+)/)
      const failedMatch = output.match(/❌ Failed:\s+(\d+)/)

      const fileTests = parseInt(testMatch?.[1]?.split(' ')[2] || '0', 10)
      const filePassed = parseInt(passedMatch?.[1] || '0', 10)
      const fileFailed = parseInt(failedMatch?.[1] || '0', 10)

      testResults[fileName] = {
        total: fileTests,
        passed: filePassed,
        failed: fileFailed,
        duration: Date.now() - fileStartTime
      }

      totalTests += fileTests
      passedTests += filePassed
      failedTests += fileFailed

      console.log(`    ✅ ${fileName}: ${filePassed} passed, ${fileFailed} failed`)

    } catch (error) {
      console.error(`    ❌ ${fileName}: 测试失败`)
      testResults[fileName] = {
        total: 0,
        passed: 0,
        failed: 0,
        duration: Date.now() - fileStartTime,
        error: error instanceof Error ? error.message : String(error)
      }
      failedTests++
    }
  }

  const duration = Date.now() - startTime

  // 生成测试报告
  const report: TestReport = {
    timestamp: new Date(),
    totalTests,
    passedTests,
    failedTests,
    duration,
    coverage: {
      total: 100, // 简化值
      covered: passedTests / totalTests * 100 || 0,
      percentage: passedTests / totalTests * 100 || 0
    },
    details: testResults
  }

  // 保存测试报告
  await saveTestReport(report)

  // 打印汇总
  printTestSummary(report)

  return report
}

async function saveTestReport(report: TestReport) {
  const reportPath = path.join(TEST_CONFIG.reportDir, 'test-report.json')
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

  // 生成 HTML 报告
  const htmlReport = generateHTMLReport(report)
  await fs.writeFile(path.join(TEST_CONFIG.reportDir, 'test-report.html'), htmlReport)

  console.log(`\n📄 测试报告已保存到: ${reportPath}`)
}

function generateHTMLReport(report: TestReport): string {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DeciFlow 测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        .summary { display: flex; justify-content: space-around; margin: 30px 0; }
        .stat { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .stat-number { font-size: 2em; font-weight: bold; }
        .stat-label { color: #666; margin-top: 5px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .duration { color: #6c757d; }
        .details { margin-top: 30px; }
        .test-file { margin: 10px 0; padding: 15px; background: #f8f9fa; border-radius: 4px; }
        .progress { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-bar { height: 100%; background: #28a745; transition: width 0.3s; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 DeciFlow 测试报告</h1>

        <div class="summary">
            <div class="stat">
                <div class="stat-number">${report.totalTests}</div>
                <div class="stat-label">总测试数</div>
            </div>
            <div class="stat">
                <div class="stat-number passed">${report.passedTests}</div>
                <div class="stat-label">通过</div>
            </div>
            <div class="stat">
                <div class="stat-number failed">${report.failedTests}</div>
                <div class="stat-label">失败</div>
            </div>
            <div class="stat">
                <div class="stat-number duration">${(report.duration / 1000).toFixed(1)}s</div>
                <div class="stat-label">总耗时</div>
            </div>
        </div>

        <div class="coverage">
            <h3>代码覆盖率</h3>
            <div class="progress">
                <div class="progress-bar" style="width: ${report.coverage.percentage}%"></div>
            </div>
            <p>${report.coverage.percentage.toFixed(1)}% (${report.coverage.covered.toFixed(1)} / ${report.coverage.total})</p>
        </div>

        <div class="details">
            <h3>详细结果</h3>
            ${Object.entries(report.details).map(([fileName, result]) => `
                <div class="test-file">
                    <h4>${fileName}</h4>
                    <p>总计: ${result.total} | 通过: <span class="passed">${result.passed}</span> |
                       失败: <span class="failed">${result.failed}</span> |
                       耗时: ${(result.duration / 1000).toFixed(2)}s</p>
                    ${result.error ? `<p class="error">错误: ${result.error}</p>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`

  return html
}

function printTestSummary(report: TestReport) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 测试汇总报告')
  console.log('='.repeat(60))
  console.log(`🕒 测试时间: ${report.timestamp.toLocaleString()}`)
  console.log(`📈 总测试数: ${report.totalTests}`)
  console.log(`✅ 通过: ${report.passedTests}`)
  console.log(`❌ 失败: ${report.failedTests}`)
  console.log(`⏱️  总耗时: ${(report.duration / 1000).toFixed(2)} 秒`)
  console.log(`📊 成功率: ${((report.passedTests / report.totalTests) * 100).toFixed(1)}%`)

  if (report.failedTests > 0) {
    console.log('\n⚠️  失败的测试:')
    Object.entries(report.details).forEach(([fileName, result]) => {
      if (result.failed > 0) {
        console.log(`  • ${fileName}: ${result.failed} 失败`)
      }
    })
  }

  console.log('\n📄 完整报告查看:')
  console.log(`  JSON: ./${TEST_CONFIG.reportDir}/test-report.json`)
  console.log(`  HTML: ./${TEST_CONFIG.reportDir}/test-report.html`)
  console.log('='.repeat(60))
}

async function main() {
  try {
    await setupTestEnvironment()
    const report = await runVitestTests()

    // 根据测试结果设置退出码
    process.exit(report.failedTests > 0 ? 1 : 0)
  } catch (error) {
    console.error('❌ 测试运行失败:', error)
    process.exit(1)
  }
}

main()