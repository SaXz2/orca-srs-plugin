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
