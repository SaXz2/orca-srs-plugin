/**
 * 渐进阅读调度算法
 *
 * 根据静态优先级映射到固定间隔天数，计算下一次到期时间。
 */

const DEFAULT_PRIORITY = 5

/**
 * 规范化优先级到 1-10
 */
export function normalizePriority(priority: number): number {
  if (!Number.isFinite(priority)) return DEFAULT_PRIORITY
  const rounded = Math.round(priority)
  if (rounded < 1) return 1
  if (rounded > 10) return 10
  return rounded
}

/**
 * 获取优先级对应的间隔天数
 *
 * 映射规则：
 * - 10 → 1 天
 * - 8-9 → 2 天
 * - 6-7 → 3 天
 * - 4-5 → 5 天
 * - 1-3 → 7 天
 */
export function getIntervalDays(priority: number): number {
  const normalized = normalizePriority(priority)

  if (normalized === 10) return 1
  if (normalized >= 8) return 2
  if (normalized >= 6) return 3
  if (normalized >= 4) return 5
  return 7
}

/**
 * 计算下一次到期时间
 * @param priority - 优先级
 * @param baseDate - 基准时间（通常为当前时间或上次阅读时间）
 */
export function calculateNextDue(priority: number, baseDate: Date = new Date()): Date {
  const intervalDays = getIntervalDays(priority)
  const next = new Date(baseDate.getTime())
  next.setDate(next.getDate() + intervalDays)
  return next
}
