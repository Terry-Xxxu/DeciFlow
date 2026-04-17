/**
 * AI 配置测试工具
 */

/**
 * 测试 AI 配置是否有效
 */
export async function testAIConfig(config: {
  provider: string
  apiKey: string
  apiUrl?: string
  model: string
}): Promise<{
  success: boolean
  message: string
  responseTime?: number
}> {
  const startTime = Date.now()

  try {
    // 根据不同的提供商测试
    switch (config.provider) {
      case 'openai':
      case 'anthropic':
      case 'custom':
        // 通过后端测试
        const result = await window.electronAPI.ai.test({
          provider: config.provider,
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          model: config.model
        })

        return {
          success: result.success,
          message: result.success ? '连接成功！AI 服务响应正常' : result.message || '连接失败',
          responseTime: Date.now() - startTime
        }

      case 'minimax':
        // MiniMax 测试
        const miniMaxResponse = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: 'abab5.5-snapshot-mini',
            messages: [{ role: 'user', content: 'Hello' }]
          })
        })

        if (miniMaxResponse.ok) {
          const data = await miniMaxResponse.json()
          return {
            success: true,
            message: '连接成功！MiniMax 服务响应正常',
            responseTime: Date.now() - startTime
          }
        } else {
          throw new Error('MiniMax API 认证失败')
        }

      case 'zhipu':
        // 智谱 GLM 测试
        const glmResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: 'glm-4',
            messages: [{ role: 'user', content: 'Hello' }]
          })
        })

        if (glmResponse.ok) {
          return {
            success: true,
            message: '连接成功！智谱 GLM 服务响应正常',
            responseTime: Date.now() - startTime
          }
        } else {
          throw new Error('智谱 GLM API 认证失败')
        }

      default:
        return {
          success: false,
          message: '暂不支持该服务商的测试'
        }
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '连接测试失败'
    }
  }
}
