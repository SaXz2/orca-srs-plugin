import type { State } from "ts-fsrs"
import type { DbId } from "../orca.d.ts"

export type Grade = "again" | "hard" | "good" | "easy"

export type SrsState = {
  stability: number       // 记忆稳定度，越大代表遗忘速度越慢
  difficulty: number      // 记忆难度，1-10 越大越难
  interval: number        // 间隔天数（FSRS 计算出的 scheduled_days）
  due: Date               // 下次应复习的具体时间
  lastReviewed: Date | null // 上次复习时间，null 表示新卡未复习
  reps: number            // 已复习次数
  lapses: number          // 遗忘次数（Again 会增加）
  state?: State           // FSRS 内部状态（New/Learning/Review/Relearning）
}

export type ReviewCard = {
  id: DbId
  front: string
  back: string
  srs: SrsState
  isNew: boolean
}
