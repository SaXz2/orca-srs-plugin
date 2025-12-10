import type { Block, DbId } from "../orca.d.ts"
import { createInitialSrsState, nextReviewState } from "./algorithm"
import type { Grade, SrsState } from "./types"

const readProp = (block: Block | undefined, name: string) =>
  block?.properties?.find(prop => prop.name === name)?.value

const parseNumber = (value: any, fallback: number) => {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const num = Number(value)
    if (Number.isFinite(num)) return num
  }
  return fallback
}

const parseDate = (value: any, fallback: Date | null): Date | null => {
  if (!value) return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

export const loadCardSrsState = async (blockId: DbId): Promise<SrsState> => {
  const now = new Date()
  const initial = createInitialSrsState(now)
  const block = (await orca.invokeBackend("get-block", blockId)) as Block | undefined

  if (!block) {
    return initial
  }

  return {
    stability: parseNumber(readProp(block, "srs.stability"), initial.stability),
    difficulty: parseNumber(readProp(block, "srs.difficulty"), initial.difficulty),
    interval: parseNumber(readProp(block, "srs.interval"), initial.interval),
    due: parseDate(readProp(block, "srs.due"), initial.due) ?? initial.due,
    lastReviewed: parseDate(readProp(block, "srs.lastReviewed"), initial.lastReviewed),
    reps: parseNumber(readProp(block, "srs.reps"), initial.reps),
    lapses: parseNumber(readProp(block, "srs.lapses"), initial.lapses),
    state: initial.state // 状态由算法决定，读取不到时回退为初始
  }
}

export const saveCardSrsState = async (blockId: DbId, newState: SrsState) => {
  await orca.commands.invokeEditorCommand(
    "core.editor.setProperties",
    null,
    [blockId],
    [
      { name: "srs.isCard", value: true, type: 4 },
      { name: "srs.stability", value: newState.stability, type: 3 },
      { name: "srs.difficulty", value: newState.difficulty, type: 3 },
      { name: "srs.lastReviewed", value: newState.lastReviewed ?? null, type: 5 },
      { name: "srs.interval", value: newState.interval, type: 3 },
      { name: "srs.due", value: newState.due, type: 5 },
      { name: "srs.reps", value: newState.reps, type: 3 },
      { name: "srs.lapses", value: newState.lapses, type: 3 }
    ]
  )
}

export const writeInitialSrsState = async (blockId: DbId, now: Date = new Date()) => {
  const initial = createInitialSrsState(now)
  await saveCardSrsState(blockId, initial)
  return initial
}

export const updateSrsState = async (blockId: DbId, grade: Grade) => {
  const prev = await loadCardSrsState(blockId)
  const result = nextReviewState(prev, grade)
  await saveCardSrsState(blockId, result.state)
  return result
}

/**
 * 加载 Cloze 卡片某个填空的 SRS 状态
 *
 * 属性命名：srs.c1.due, srs.c1.interval, srs.c1.stability 等
 *
 * @param blockId - 块 ID
 * @param clozeNumber - 填空编号（1, 2, 3...）
 * @returns SRS 状态
 */
export const loadClozeSrsState = async (blockId: DbId, clozeNumber: number): Promise<SrsState> => {
  const now = new Date()
  const initial = createInitialSrsState(now)
  const block = (await orca.invokeBackend("get-block", blockId)) as Block | undefined

  if (!block) {
    return initial
  }

  const prefix = `srs.c${clozeNumber}.`

  return {
    stability: parseNumber(readProp(block, `${prefix}stability`), initial.stability),
    difficulty: parseNumber(readProp(block, `${prefix}difficulty`), initial.difficulty),
    interval: parseNumber(readProp(block, `${prefix}interval`), initial.interval),
    due: parseDate(readProp(block, `${prefix}due`), initial.due) ?? initial.due,
    lastReviewed: parseDate(readProp(block, `${prefix}lastReviewed`), initial.lastReviewed),
    reps: parseNumber(readProp(block, `${prefix}reps`), initial.reps),
    lapses: parseNumber(readProp(block, `${prefix}lapses`), initial.lapses),
    state: initial.state
  }
}

/**
 * 保存 Cloze 卡片某个填空的 SRS 状态
 *
 * @param blockId - 块 ID
 * @param clozeNumber - 填空编号
 * @param newState - 新的 SRS 状态
 */
export const saveClozeSrsState = async (blockId: DbId, clozeNumber: number, newState: SrsState) => {
  const prefix = `srs.c${clozeNumber}.`

  await orca.commands.invokeEditorCommand(
    "core.editor.setProperties",
    null,
    [blockId],
    [
      { name: `${prefix}stability`, value: newState.stability, type: 3 },
      { name: `${prefix}difficulty`, value: newState.difficulty, type: 3 },
      { name: `${prefix}lastReviewed`, value: newState.lastReviewed ?? null, type: 5 },
      { name: `${prefix}interval`, value: newState.interval, type: 3 },
      { name: `${prefix}due`, value: newState.due, type: 5 },
      { name: `${prefix}reps`, value: newState.reps, type: 3 },
      { name: `${prefix}lapses`, value: newState.lapses, type: 3 }
    ]
  )
}

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
) => {
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
export const updateClozeSrsState = async (blockId: DbId, clozeNumber: number, grade: Grade) => {
  const prev = await loadClozeSrsState(blockId, clozeNumber)
  const result = nextReviewState(prev, grade)
  await saveClozeSrsState(blockId, clozeNumber, result.state)
  return result
}
