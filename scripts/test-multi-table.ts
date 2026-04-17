#!/usr/bin/env tsx

/**
 * 多表关联分析功能测试脚本
 */

import { MultiTableAnalyzer } from '../src/main/analysis/multi-table-analyzer'
import { DatabaseConfig } from '../src/shared/types'

// 测试用的数据库配置
const testConfig: DatabaseConfig = {
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'testdb',
  username: 'testuser',
  password: 'testpass'
}

async function testMultiTableAnalysis() {
  console.log('🔄 开始测试多表关联分析功能...\n')

  const analyzer = new MultiTableAnalyzer()

  try {
    // 1. 初始化表关系
    console.log('📊 初始化表关系...')
    await analyzer.initializeRelationships(testConfig)
    console.log('✅ 表关系初始化完成\n')

    // 2. 测试用户订单分析
    console.log('📝 测试用户订单分析...')
    const userOrderQuery = await analyzer.analyzeQuery('分析每个用户的订单总数和消费金额', testConfig)
    console.log('生成的 SQL:')
    console.log(userOrderQuery.sql)
    console.log('')

    // 3. 测试产品销售分析
    console.log('📦 测试产品销售分析...')
    const productSalesQuery = await analyzer.analyzeQuery('统计每个产品类别的销售收入', testConfig)
    console.log('生成的 SQL:')
    console.log(productSalesQuery.sql)
    console.log('')

    // 4. 测试用户行为分析
    console.log('👤 测试用户行为分析...')
    const userBehaviorQuery = await analyzer.analyzeQuery('分析用户的购买频率和活跃度', testConfig)
    console.log('生成的 SQL:')
    console.log(userBehaviorQuery.sql)
    console.log('')

    // 5. 检查循环引用
    console.log('🔄 检查循环引用...')
    const hasCircular = analyzer.detectCircularRelationships(['users', 'orders', 'order_items'])
    console.log(hasCircular ? '⚠️  检测到循环引用' : '✅ 没有循环引用')
    console.log('')

    // 6. 优化 JOIN 顺序
    console.log('🔄 优化 JOIN 顺序...')
    const tables = ['users', 'orders', 'order_items', 'products']
    const optimizedOrder = analyzer.optimizeJoinOrder(tables)
    console.log('优化后的顺序:', optimizedOrder.join(' -> '))
    console.log('')

    // 7. 获取可用关系
    console.log('🔗 获取可用表关系...')
    const relationships = analyzer.getAvailableRelationships()
    console.log('可用关系数量:', relationships.length)
    relationships.forEach(rel => {
      console.log(`  ${rel.fromTable}.${rel.fromColumn} -> ${rel.toTable}.${rel.toColumn} (${rel.type})`)
    })
    console.log('')

    // 8. 性能测试
    console.log('⚡ 性能测试...')
    const startTime = Date.now()

    // 批量生成查询
    const queries = [
      '用户订单分析',
      '产品销量统计',
      '用户购买行为',
      '收入趋势分析'
    ]

    for (const query of queries) {
      await analyzer.analyzeQuery(query, testConfig)
    }

    const endTime = Date.now()
    const duration = endTime - startTime
    console.log(`✅ 批量生成 ${queries.length} 个查询耗时: ${duration}ms`)
    console.log(`平均每个查询: ${(duration / queries.length).toFixed(2)}ms`)
    console.log('')

    // 9. 缓存测试
    console.log('💾 缓存测试...')
    const queryId = analyzer['generateQueryId']('用户订单分析')
    console.log('查询 ID:', queryId)

    // 清除缓存
    analyzer.clearCache()
    console.log('✅ 缓存已清除')

    console.log('\n🎉 所有测试完成！')
  } catch (error) {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  }
}

// 运行测试
testMultiTableAnalysis()