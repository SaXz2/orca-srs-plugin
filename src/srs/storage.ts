/**
 * SRS 数据存储模块
 *
 * 负责 SRS 卡片状态的读取和保存
 * 支持三种卡片类型：
 * - 普通卡片：属性前缀为 "srs."
 * - Cloze 卡片：属性前缀为 "srs.cN."（N 为填空编号）
 * - Direction 卡片：属性前缀为 "srs.forward." 或 "srs.backward."
 */

import type { Block, DbId } from "../orca.d.ts"
import { createInitialSrsState, nextReviewState } from "./algorithm"
import type { Grade, SrsState } from "./types"

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 构建属性名称
 * @param base - 基础属性名（如 "stability", "due" 等）
 * @param clozeNumber - 填空编号（可选，普通卡片不传）
 * @returns 完整的属性名
 */
const buildPropertyName = (base: string, clozeNumber?: number): string =>
  clozeNumber !== undefined ? `srs.c${clozeNumber}.${base}` : `srs.${base}`

/**
 * 构建方向卡属性名称
 * @param base - 基础属性名（如 "stability", "due" 等）
 * @param directionType - 方向类型（"forward" 或 "backward"）
 * @returns 完整的属性名
 */
const buildDirectionPropertyName = (
  base: string,
  directionType: "forward" | "backward"
): string => `srs.${directionType}.${base}`

/**
 * 从块属性中读取指定名称的值
 */
const readProp = (block: Block | undefined, name: string): any =>
  block?.properties?.find(prop => prop.name === name)?.value

/**
 * 解析数字值，无效时返回默认值
 */
const parseNumber = (value: any, fallback: number): number => {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const num = Number(value)
    if (Number.isFinite(num)) return num
  }
  return fallback
}

/**
 * 解析日期值，无效时返回默认值
 */
const parseDate = (value: any, fallback: Date | null): Date | null => {
  if (!value) return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

// ============================================================================
// 核心内部函数（统一的加载/保存逻辑）
// ============================================================================

/**
 * 内部函数：加载 SRS 状态
 * 统一处理普通卡片和 Cloze 卡片的状态加载
 *
 * @param blockId - 块 ID
 * @param clozeNumber - 填空编号（可选，普通卡片不传）
 * @returns SRS 状态
 */
const loadSrsStateInternal = async (
  blockId: DbId,
  clozeNumber?: number
): Promise<SrsState> => {
  const now = new Date()
  const initial = createInitialSrsState(now)
  const block = (await orca.invokeBackend("get-block", blockId)) as Block | undefined

  if (!block) {
    return initial
  }

  // 使用统一的属性名构建函数
  const getPropValue = (base: string) =>
    readProp(block, buildPropertyName(base, clozeNumber))

  return {
    stability: parseNumber(getPropValue("stability"), initial.stability),
    difficulty: parseNumber(getPropValue("difficulty"), initial.difficulty),
    interval: parseNumber(getPropValue("interval"), initial.interval),
    due: parseDate(getPropValue("due"), initial.due) ?? initial.due,
    lastReviewed: parseDate(getPropValue("lastReviewed"), initial.lastReviewed),
    reps: parseNumber(getPropValue("reps"), initial.reps),
    lapses: parseNumber(getPropValue("lapses"), initial.lapses),
    state: initial.state // 状态由算法决定，读取不到时回退为初始
  }
}

/**
 * 内部函数：保存 SRS 状态
 * 统一处理普通卡片和 Cloze 卡片的状态保存
 *
 * @param blockId - 块 ID
 * @param newState - 新的 SRS 状态
 * @param clozeNumber - 填空编号（可选，普通卡片不传）
 */
const saveSrsStateInternal = async (
  blockId: DbId,
  newState: SrsState,
  clozeNumber?: number
): Promise<void> => {
  // 构建属性列表
  const properties = [
    { name: buildPropertyName("stability", clozeNumber), value: newState.stability, type: 3 },
    { name: buildPropertyName("difficulty", clozeNumber), value: newState.difficulty, type: 3 },
    { name: buildPropertyName("lastReviewed", clozeNumber), value: newState.lastReviewed ?? null, type: 5 },
    { name: buildPropertyName("interval", clozeNumber), value: newState.interval, type: 3 },
    { name: buildPropertyName("due", clozeNumber), value: newState.due, type: 5 },
    { name: buildPropertyName("reps", clozeNumber), value: newState.reps, type: 3 },
    { name: buildPropertyName("lapses", clozeNumber), value: newState.lapses, type: 3 }
  ]

  // 普通卡片需要额外添加 isCard 标记
  if (clozeNumber === undefined) {
    properties.unshift({ name: "srs.isCard", value: true as any, type: 4 })
  }

  await orca.commands.invokeEditorCommand(
    "core.editor.setProperties",
    null,
    [blockId],
    properties
  )
}

// ============================================================================
// 普通卡片 API
// ============================================================================

/**
 * 加载普通卡片的 SRS 状态
 */
export const loadCardSrsState = (blockId: DbId): Promise<SrsState> =>
  loadSrsStateInternal(blockId)

/**
 * 保存普通卡片的 SRS 状态
 */
export const saveCardSrsState = (blockId: DbId, newState: SrsState): Promise<void> =>
  saveSrsStateInternal(blockId, newState)

/**
 * 为普通卡片写入初始 SRS 状态
 */
export const writeInitialSrsState = async (
  blockId: DbId,
  now: Date = new Date()
): Promise<SrsState> => {
  const initial = createInitialSrsState(now)
  await saveCardSrsState(blockId, initial)
  return initial
}

/**
 * 更新普通卡片的 SRS 状态（评分后）
 */
export const updateSrsState = async (blockId: DbId, grade: Grade) => {
  const prev = await loadCardSrsState(blockId)
  const result = nextReviewState(prev, grade)
  await saveCardSrsState(blockId, result.state)
  return result
}

// ============================================================================
// Cloze 卡片 API
// ============================================================================

/**
 * 加载 Cloze 卡片某个填空的 SRS 状态
 *
 * 属性命名：srs.c1.due, srs.c1.interval, srs.c1.stability 等
 *
 * @param blockId - 块 ID
 * @param clozeNumber - 填空编号（1, 2, 3...）
 * @returns SRS 状态
 */
export const loadClozeSrsState = (
  blockId: DbId,
  clozeNumber: number
): Promise<SrsState> => loadSrsStateInternal(blockId, clozeNumber)

/**
 * 保存 Cloze 卡片某个填空的 SRS 状态
 *
 * @param blockId - 块 ID
 * @param clozeNumber - 填空编号
 * @param newState - 新的 SRS 状态
 */
export const saveClozeSrsState = (
  blockId: DbId,
  clozeNumber: number,
  newState: SrsState
): Promise<void> => saveSrsStateInternal(blockId, newState, clozeNumber)

/**
 * 为 Cloze 卡片的某个填空写入初始 SRS 状态
 *
 * @param blockId - 块 ID
 * @param clozeNumber - 填空编号
 * @param daysOffset - 距离今天的天数偏移（c1=0, c2=1, c3=2...）
 */
export const writeInitialClozeSrsState = async (
  blockId: DbId,
  clozeNumber: number,
  daysOffset: number = 0
): Promise<SrsState> => {
  const now = new Date()
  // 设置到期时间为今天 + daysOffset 天
  const dueDate = new Date(now)
  dueDate.setDate(dueDate.getDate() + daysOffset)
  dueDate.setHours(0, 0, 0, 0) // 设置为当天零点

  const initial = createInitialSrsState(dueDate)
  await saveClozeSrsState(blockId, clozeNumber, initial)
  return initial
}

/**
 * 更新 Cloze 卡片某个填空的 SRS 状态
 *
 * @param blockId - 块 ID
 * @param clozeNumber - 填空编号
 * @param grade - 评分
 */
export const updateClozeSrsState = async (
  blockId: DbId,
  clozeNumber: number,
  grade: Grade
) => {
  const prev = await loadClozeSrsState(blockId, clozeNumber)
  const result = nextReviewState(prev, grade)
  await saveClozeSrsState(blockId, clozeNumber, result.state)
  return result
}

// ============================================================================
// Direction 卡片 API
// ============================================================================

/**
 * 加载方向卡某个方向的 SRS 状态
 *
 * 属性命名：srs.forward.due, srs.backward.stability 等
 *
 * @param blockId - 块 ID
 * @param directionType - 方向类型（"forward" 或 "backward"）
 * @returns SRS 状态
 */
export const loadDirectionSrsState = async (
  blockId: DbId,
  directionType: "forward" | "backward"
): Promise<SrsState> => {
  const now = new Date()
  const initial = createInitialSrsState(now)
  const block = (await orca.invokeBackend("get-block", blockId)) as Block | undefined

  if (!block) {
    return initial
  }

  const getPropValue = (base: string) =>
    readProp(block, buildDirectionPropertyName(base, directionType))

  return {
    stability: parseNumber(getPropValue("stability"), initial.stability),
    difficulty: parseNumber(getPropValue("difficulty"), initial.difficulty),
    interval: parseNumber(getPropValue("interval"), initial.interval),
    due: parseDate(getPropValue("due"), initial.due) ?? initial.due,
    lastReviewed: parseDate(getPropValue("lastReviewed"), initial.lastReviewed),
    reps: parseNumber(getPropValue("reps"), initial.reps),
    lapses: parseNumber(getPropValue("lapses"), initial.lapses),
    state: initial.state
  }
}

/**
 * 保存方向卡某个方向的 SRS 状态
 *
 * @param blockId - 块 ID
 * @param directionType - 方向类型
 * @param newState - 新的 SRS 状态
 */
export const saveDirectionSrsState = async (
  blockId: DbId,
  directionType: "forward" | "backward",
  newState: SrsState
): Promise<void> => {
  const properties = [
    { name: buildDirectionPropertyName("stability", directionType), value: newState.stability, type: 3 },
    { name: buildDirectionPropertyName("difficulty", directionType), value: newState.difficulty, type: 3 },
    { name: buildDirectionPropertyName("interval", directionType), value: newState.interval, type: 3 },
    { name: buildDirectionPropertyName("due", directionType), value: newState.due, type: 5 },
    { name: buildDirectionPropertyName("lastReviewed", directionType), value: newState.lastReviewed ?? null, type: 5 },
    { name: buildDirectionPropertyName("reps", directionType), value: newState.reps, type: 3 },
    { name: buildDirectionPropertyName("lapses", directionType), value: newState.lapses, type: 3 }
  ]

  await orca.commands.invokeEditorCommand(
    "core.editor.setProperties",
    null,
    [blockId],
    properties
  )
}

/**
 * 为方向卡写入初始 SRS 状态
 *
 * @param blockId - 块 ID
 * @param directionType - 方向类型
 * @param daysOffset - 距离今天的天数偏移（forward=0, backward=1）
 * @returns 初始 SRS 状态
 */
export const writeInitialDirectionSrsState = async (
  blockId: DbId,
  directionType: "forward" | "backward",
  daysOffset: number = 0
): Promise<SrsState> => {
  const now = new Date()
  const dueDate = new Date(now)
  dueDate.setDate(dueDate.getDate() + daysOffset)
  dueDate.setHours(0, 0, 0, 0)

  const initial = createInitialSrsState(dueDate)
  await saveDirectionSrsState(blockId, directionType, initial)
  return initial
}

/**
 * 更新方向卡某个方向的 SRS 状态
 *
 * @param blockId - 块 ID
 * @param directionType - 方向类型
 * @param grade - 评分
 * @returns { state, log }
 */
export const updateDirectionSrsState = async (
  blockId: DbId,
  directionType: "forward" | "backward",
  grade: Grade
) => {
  const prev = await loadDirectionSrsState(blockId, directionType)
  const result = nextReviewState(prev, grade)
  await saveDirectionSrsState(blockId, directionType, result.state)
  return result
}
