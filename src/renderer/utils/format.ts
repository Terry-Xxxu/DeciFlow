/**
 * 数据格式化工具
 */

/**
 * 将数字格式化为最多保留两位小数
 * - 整数显示为整数（如 1000）
 * - 小数显示最多两位（如 1000.5, 1000.55）
 * - 超过1000的数字使用千位分隔符
 */
export function formatNumber(value: number, decimals = 2): string {
  if (typeof value !== 'number' || isNaN(value)) return '-'
  const fixed = Number(value.toFixed(decimals))
  // 判断是否需要千位分隔符
  if (Math.abs(fixed) >= 1000) {
    return fixed.toLocaleString('zh-CN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    })
  }
  return fixed % 1 === 0 ? fixed.toString() : fixed.toFixed(decimals)
}

/**
 * 将百分比格式化为最多两位小数
 */
export function formatPercent(value: number, decimals = 2): string {
  if (typeof value !== 'number' || isNaN(value)) return '-'
  return `${Number(value.toFixed(decimals))}%`
}
