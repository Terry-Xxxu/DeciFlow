/**
 * Design Tokens - DeciFlow 设计令牌
 * AI 决策系统 | 结论 > 数据 > 图表
 * 支持浅色/暗色双模式
 */

// 主题类型
export type ThemeMode = 'light' | 'dark'

// 浅色模式 tokens
export const lightTokens = {
  colors: {
    // 背景色 - Light Mode
    background: {
      primary: '#F8FAFC',    // 整体背景（微灰）
      secondary: '#FFFFFF',  // 卡片背景（纯白）
      tertiary: '#F1F5F9',   // 次级背景
      elevated: '#FFFFFF',   // 悬浮卡片
      hover: '#F1F5F9',      // 悬停状态
    },

    // 主色 - 克制的 AI 感
    primary: '#6366F1',      // Indigo
    primaryHover: '#4F46E5', // Indigo Darker
    secondary: '#8B5CF6',    // Purple
    accent: '#06B6D4',       // Cyan

    // 状态色
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',

    // 文字色 - 深灰层级
    text: {
      primary: '#0F172A',    // 主标题（深灰）
      secondary: '#334155',  // 正文
      tertiary: '#64748B',   // 说明
      muted: '#94A3B8',      // 禁用
    },

    // 边框色 - 浅色关键
    border: {
      default: '#E2E8F0',
      hover: '#CBD5E1',
      focus: '#6366F1',
    },

    // 渐变 - subtle
    gradient: {
      primary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      success: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      danger: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      subtle: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
    },
  },

  // 阴影 - 浅色模式高级感关键
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
    md: '0 4px 12px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 24px rgba(0, 0, 0, 0.08)',
    card: '0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.06)',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    section: '24px',
    block: '16px',
    compact: '8px',
  },

  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    full: '9999px',
  },
} as const

// 暗色模式 tokens（保持原有）
export const darkTokens = {
  colors: {
    background: {
      primary: '#0B1220',
      secondary: '#111827',
      tertiary: '#1F2937',
      elevated: '#1F2937',
      hover: '#374151',
    },

    primary: '#6366F1',
    primaryHover: '#818CF8',
    secondary: '#8B5CF6',
    accent: '#A78BFA',

    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',

    text: {
      primary: '#F9FAFB',
      secondary: '#9CA3AF',
      tertiary: '#6B7280',
      muted: '#4B5563',
    },

    border: {
      default: 'rgba(255, 255, 255, 0.08)',
      hover: 'rgba(255, 255, 255, 0.12)',
      focus: 'rgba(99, 102, 241, 0.5)',
    },

    gradient: {
      primary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      success: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      danger: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      glow: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
    },
  },

  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
    md: '0 4px 6px rgba(0, 0, 0, 0.5)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.6)',
    glow: '0 0 30px rgba(99, 102, 241, 0.3)',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    section: '24px',
    block: '16px',
    compact: '8px',
  },

  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    full: '9999px',
  },
} as const

// 获取当前主题 tokens
export const getTokens = (mode: ThemeMode) => mode === 'light' ? lightTokens : darkTokens

// 导出类型
export type Tokens = typeof lightTokens
