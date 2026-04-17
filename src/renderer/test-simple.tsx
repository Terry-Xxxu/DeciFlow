/**
 * 简单测试组件 - 用于调试
 */

import React from 'react'

export const TestComponent: React.FC = () => {
  return (
    <div style={{ padding: '20px', background: '#f0f0f0' }}>
      <h1>测试组件</h1>
      <p>如果你能看到这个，说明基本渲染正常</p>
      <p>当前时间: {new Date().toLocaleString()}</p>
    </div>
  )
}
