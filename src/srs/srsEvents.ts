import type { DbId } from "../orca.d.ts"
import type { Grade } from "./types"

/**
 * SRS 跨组件事件定义（基于 Orca broadcasts）
 *
 * 设计目标：
 * - 复习面板（评分/埋藏/暂停）发生状态变更后，通知 FlashcardHome 静默刷新数据
 * - 降低组件耦合，避免在业务逻辑里直接引用 UI 组件
 */
export const SRS_EVENTS = {
  CARD_GRADED: "srs.cardGraded", // 卡片被评分
  CARD_BURIED: "srs.cardBuried", // 卡片被埋藏
  CARD_SUSPENDED: "srs.cardSuspended" // 卡片被暂停
} as const

export function emitCardGraded(blockId: DbId, grade: Grade): void {
  orca.broadcasts.broadcast(SRS_EVENTS.CARD_GRADED, { blockId, grade })
}

export function emitCardBuried(blockId: DbId): void {
  orca.broadcasts.broadcast(SRS_EVENTS.CARD_BURIED, { blockId })
}

export function emitCardSuspended(blockId: DbId): void {
  orca.broadcasts.broadcast(SRS_EVENTS.CARD_SUSPENDED, { blockId })
}

