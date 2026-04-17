/**
 * 应用引导步骤配置
 * 定义新手引导的各个步骤和目标
 */

import type { TourStep } from '../components/InteractiveTour'

/**
 * 首次使用引导 - 完整功能介绍
 * 仅包含初始页面的元素，避免引用尚未显示的内容
 */
export const firstTimeTourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: '欢迎使用 DataInsight Pro',
    description: '这是一个专为产品经理打造的 AI 数据分析工具。让我们用几分钟时间了解主要功能。点击"下一步"继续，或"跳过引导"开始使用。',
    target: 'body',
    position: 'center',
    image: '👋',
    skipable: true
  },
  {
    id: 'search-box',
    title: '自然语言查询',
    description: '在这里用自然语言描述你想分析的数据，不需要写 SQL。试试问："上个月新用户留存率是多少？"',
    target: '[data-tour="search-box"]',
    position: 'bottom',
    image: '🔍',
    spotlightPadding: 12
  },
  {
    id: 'keyboard-shortcuts',
    title: '快捷键支持',
    description: '使用快捷键提升效率：按 Ctrl+K (Mac: ⌘K) 快速聚焦搜索框，按 Ctrl+? 查看所有快捷键。',
    target: '[data-tour="search-box"]',
    position: 'bottom',
    image: '⌨️'
  },
  {
    id: 'sidebar',
    title: '功能导航',
    description: '左侧边栏快速访问不同功能：查询、分析、管理等。点击底部的"引导"按钮可随时重新查看此教程。',
    target: '[data-tour="sidebar"]',
    position: 'right',
    image: '🧭'
  },
  {
    id: 'completion',
    title: '准备就绪！',
    description: '您已经了解了基本功能。现在可以开始分析数据了！按 Esc 键可随时关闭此引导。点击"完成"开始使用。',
    target: 'body',
    position: 'center',
    image: '🎉',
    skipable: false
  }
]

/**
 * 快速引导 - 仅介绍核心功能
 */
export const quickTourSteps: TourStep[] = [
  {
    id: 'quick-welcome',
    title: '快速开始',
    description: '用最短的时间了解核心功能。',
    target: 'body',
    position: 'center',
    image: '⚡',
    skipable: true
  },
  {
    id: 'quick-search',
    title: '输入问题',
    description: '直接用自然语言提问，例如："对比本周和上周的转化率"',
    target: '[data-tour="search-box"]',
    position: 'bottom',
    image: '💬'
  }
]
