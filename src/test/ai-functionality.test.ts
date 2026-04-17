/**
 * DeciFlow AI 功能测试
 * 测试自然语言转 SQL、AI 查询、上下文记忆等核心功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NaturalLanguageQueryService } from '../main/ai/nl2sql'
import { AIChatManager } from '../main/ai/adapter'
import { AIConfig, AIProvider } from '../shared/types'

// 模拟 AI 适配器用于测试
class MockAIAdapter {
  private shouldSucceed = true
  private responses = {
    simpleQuery: 'SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL 30 days',
    complexQuery: 'SELECT u.name, COUNT(o.id) as order_count, SUM(o.total_amount) as revenue FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id ORDER BY revenue DESC LIMIT 10',
    analysis: '【核心结论】\n1. 新用户转化率下降15%\n2. 付费用户ARPU提升8%\n3. 移动端流失率上升12%\n\n【关键数据】\n- 新用户首日转化率: 25% → 21%\n- 付费用户ARPU: ¥120 → ¥130\n- 移动端7日留存: 60% → 48%\n\n【原因分析】\n- 新用户引导流程存在阻点\n- 付费功能价值感知不足\n- 移动端性能问题导致流失\n\n【影响判断】\n- 严重影响用户增长和收入\n- 非短期波动，需紧急处理\n\n【行动建议】\n- P0: 优化新用户引导流程，减少注册步骤\n- P1: 强化付费功能价值展示，增加案例\n- P2: 优化移动端加载速度，提升体验'
  }

  setShouldSucceed(success: boolean) {
    this.shouldSucceed = success
  }

  async chat(messages: any[]): Promise<any> {
    if (!this.shouldSucceed) {
      throw new Error('AI 服务模拟错误')
    }

    const lastMessage = messages[messages.length - 1]
    const content = lastMessage.content.toLowerCase()

    if (content.includes('count') && content.includes('user')) {
      return {
        content: this.responses.simpleQuery,
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 }
      }
    }

    if (content.includes('revenue') && content.includes('order')) {
      return {
        content: this.responses.complexQuery,
        usage: { promptTokens: 150, completionTokens: 300, totalTokens: 450 }
      }
    }

    // 默认返回分析结果
    return {
      content: this.responses.analysis,
      usage: { promptTokens: 200, completionTokens: 800, totalTokens: 1000 }
    }
  }
}

describe('DeciFlow AI 功能测试', () => {
  let aiService: NaturalLanguageQueryService
  let mockAdapter: MockAIAdapter

  beforeEach(() => {
    mockAdapter = new MockAIAdapter()
    aiService = new NaturalLanguageQueryService(mockAdapter as any)
  })

  afterEach(() => {
    mockAdapter.setShouldSucceed(true)
  })

  describe('自然语言转 SQL', () => {
    it('应该能够处理简单的用户查询', async () => {
      // 设置测试用的 schema
      await aiService.setSchema('postgresql', [{
        name: 'users',
        columns: [
          { name: 'id', type: 'integer' },
          { name: 'name', type: 'varchar' },
          { name: 'created_at', type: 'timestamp' }
        ]
      }])

      const result = await aiService.generateSQL('过去30天新增用户有多少？')

      expect(result).toBeDefined()
      expect(result.sql).toContain('SELECT')
      expect(result.sql).toContain('COUNT')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('应该能够处理复杂的业务查询', async () => {
      await aiService.setSchema('postgresql', [{
        name: 'users',
        columns: [
          { name: 'id', type: 'integer' },
          { name: 'name', type: 'varchar' }
        ]
      }, {
        name: 'orders',
        columns: [
          { name: 'id', type: 'integer' },
          { name: 'user_id', type: 'integer' },
          { name: 'total_amount', type: 'decimal' }
        ]
      }])

      const result = await aiService.generateSQL('找出消费金额最高的前10个用户及其订单数')

      expect(result).toBeDefined()
      expect(result.sql).toContain('GROUP BY')
      expect(result.sql).toContain('ORDER BY')
      expect(result.dimensions).toContain('users')
    })

    it('应该在查询失败时返回错误信息', async () => {
      mockAdapter.setShouldSucceed(false)

      const result = await aiService.generateSQL('测试查询')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('AI 数据分析', () => {
    it('应该能够基于数据提供分析建议', async () => {
      const analysisResult = await aiService.analyzeData({
        query: '分析最近一个月的用户增长情况',
        data: {
          userCount: [1000, 1200, 1350, 1100, 1400],
          dates: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05']
        }
      })

      expect(analysisResult).toBeDefined()
      expect(analysisResult.summary).toBeDefined()
      expect(analysisResult.recommendations).toBeDefined()
      expect(analysisResult.summary).toContain('增长')
    })

    it('应该能够识别异常数据', async () => {
      const analysisResult = await aiService.analyzeData({
        query: '检查数据异常',
        data: {
          conversionRate: [0.05, 0.06, 0.055, 0.02, 0.058],  // 第四个数据明显偏低
          dates: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5']
        }
      })

      expect(analysisResult.anomalies).toBeDefined()
      expect(analysisResult.anomalies.length).toBeGreaterThan(0)
    })
  })

  describe('上下文记忆', () => {
    it('应该能够记住对话历史', async () => {
      // 模拟多轮对话
      await aiService.addContext({
        type: 'query',
        query: '什么是用户增长率？',
        response: '用户增长率 = (新增用户数 / 总用户数) * 100%'
      })

      const context = aiService.getContext()

      expect(context.length).toBeGreaterThan(0)
      expect(context[0].query).toContain('用户增长率')
    })

    it('应该能够根据上下文优化后续查询', async () => {
      // 添加上下文
      await aiService.addContext({
        type: 'metric_definition',
        metric: '用户增长率',
        definition: '月度新增用户数 / 月初总用户数'
      })

      const result = await aiService.generateSQL('计算上月的用户增长率')

      expect(result).toBeDefined()
      expect(result.explanation).toContain('用户增长率')
    })
  })

  describe('性能测试', () => {
    it('应该在合理时间内响应简单查询', async () => {
      const startTime = Date.now()

      const result = await aiService.generateSQL('总共有多少用户？')

      const responseTime = Date.now() - startTime

      expect(responseTime).toBeLessThan(5000)  // 5秒内响应
      expect(result.sql).toBeDefined()
    })

    it('应该处理并发查询', async () => {
      const queries = [
        '有多少用户？',
        '有多少订单？',
        '收入多少？',
        '活跃用户数？'
      ]

      const promises = queries.map(query => aiService.generateSQL(query))
      const results = await Promise.all(promises)

      expect(results.length).toBe(4)
      results.forEach(result => {
        expect(result.sql).toBeDefined()
      })
    })
  })
})