import { FSRS, Rating, State, createEmptyCard, generatorParameters } from "ts-fsrs"
import type { Card, Grade as FsrsGrade, RecordLogItem } from "ts-fsrs"
import type { Grade, SrsState } from "./types"

const fsrs = new FSRS(generatorParameters({})) // 使用官方默认参数构建调度器

const GRADE_TO_RATING: Record<Grade, FsrsGrade> = {
  again: Rating.Again as FsrsGrade,
  hard: Rating.Hard as FsrsGrade,
  good: Rating.Good as FsrsGrade,
  easy: Rating.Easy as FsrsGrade
}

const DEFAULT_NOW = () => new Date()

const toFsrsCard = (prevState: SrsState | null, now: Date): Card => {
  const base = createEmptyCard(now) as Card

  if (!prevState) {
    return base
  }

  return {
    ...base,
    stability: prevState.stability ?? base.stability,
    difficulty: prevState.difficulty ?? base.difficulty,
    due: prevState.due ?? base.due,
    last_review: prevState.lastReviewed ?? base.last_review,
    scheduled_days: prevState.interval ?? base.scheduled_days,
    reps: prevState.reps ?? base.reps,
    lapses: prevState.lapses ?? base.lapses,
    // reps 为 0 视为新卡，否则进入复习态
    state: prevState.reps > 0 ? State.Review : State.New
  }
}

const cardToState = (card: Card, log: RecordLogItem["log"] | null): SrsState => ({
  stability: card.stability,           // 记忆稳定度，越高遗忘越慢
  difficulty: card.difficulty,         // 记忆难度，Again/Hard 提升，Easy 降低
  interval: card.scheduled_days,       // 下次间隔天数（FSRS 计算的 scheduled_days）
  due: card.due,                       // 下次到期时间
  lastReviewed: log?.review ?? card.last_review ?? null, // 最近复习时间
  reps: card.reps,                     // 累计复习次数
  lapses: card.lapses,                 // 遗忘次数（Again 增加）
  state: card.state                    // FSRS 内部状态（New/Learning/Review/Relearning）
})

export const createInitialSrsState = (now: Date = DEFAULT_NOW()): SrsState => {
  const base = createEmptyCard(now) as Card
  return cardToState(base, null)
}

export const nextReviewState = (
  prevState: SrsState | null,
  grade: Grade,
  now: Date = DEFAULT_NOW()
): { state: SrsState, log: RecordLogItem["log"] } => {
  const fsrsCard = toFsrsCard(prevState, now)
  const record = fsrs.next(fsrsCard, now, GRADE_TO_RATING[grade])

  const nextState: SrsState = {
    stability: record.card.stability,           // 记忆稳定度，评分越高增长越快
    difficulty: record.card.difficulty,         // 记忆难度，Again/Hard 会调高，Easy 会降低
    interval: record.card.scheduled_days,       // 下次间隔天数，已包含 FSRS 的遗忘曲线与 fuzz
    due: record.card.due,                       // 具体下次到期时间（now + interval）
    lastReviewed: record.log.review,            // 本次复习时间
    reps: record.card.reps,                     // 总复习次数（每次评分 +1）
    lapses: record.card.lapses,                 // 遗忘次数（Again 会累计）
    state: record.card.state                    // 当前 FSRS 状态（New/Learning/Review/Relearning）
  }

  return { state: nextState, log: record.log }
}

export const runExamples = () => {
  const fixedNow = new Date("2024-01-01T00:00:00Z")

  const exampleStates: Array<{ title: string, prev: SrsState | null, grade: Grade }> = [
    {
      title: "新卡首次评 Good",
      prev: createInitialSrsState(fixedNow),
      grade: "good"
    },
    {
      title: "已在复习队列评 Hard",
      prev: {
        stability: 8,
        difficulty: 4,
        interval: 5,
        due: new Date("2023-12-30T00:00:00Z"),
        lastReviewed: new Date("2023-12-25T00:00:00Z"),
        reps: 6,
        lapses: 0,
        state: State.Review
      },
      grade: "hard"
    },
    {
      title: "遗忘后再次评 Again",
      prev: {
        stability: 4,
        difficulty: 6,
        interval: 3,
        due: new Date("2023-12-28T00:00:00Z"),
        lastReviewed: new Date("2023-12-26T00:00:00Z"),
        reps: 4,
        lapses: 1,
        state: State.Relearning
      },
      grade: "again"
    },
    {
      title: "成熟卡评 Easy",
      prev: {
        stability: 25,
        difficulty: 3,
        interval: 21,
        due: new Date("2023-12-20T00:00:00Z"),
        lastReviewed: new Date("2023-11-29T00:00:00Z"),
        reps: 12,
        lapses: 1,
        state: State.Review
      },
      grade: "easy"
    }
  ]

  for (const item of exampleStates) {
    const { state, log } = nextReviewState(item.prev, item.grade, fixedNow)
    console.log(`[FSRS 示例] ${item.title}`, {
      grade: item.grade,
      prevInterval: item.prev?.interval ?? 0,
      nextInterval: state.interval,
      nextDue: state.due.toISOString(),
      stability: state.stability,
      difficulty: state.difficulty,
      reps: state.reps,
      lapses: state.lapses,
      reviewAt: log.review.toISOString()
    })
  }
}
