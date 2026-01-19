import { describe, expect, it } from "vitest"
import type { IRCard } from "./incrementalReadingCollector"
import { buildIRQueue } from "./incrementalReadingCollector"

describe("incrementalReadingQueue", () => {
  it("should mix due and new cards with 2:1 strategy and priority order", () => {
    const cards: IRCard[] = [
      { id: 1, cardType: "extracts", priority: 5, due: new Date(), lastRead: new Date(), readCount: 1, isNew: false },
      { id: 2, cardType: "extracts", priority: 9, due: new Date(), lastRead: new Date(), readCount: 2, isNew: false },
      { id: 3, cardType: "渐进阅读", priority: 9, due: new Date(), lastRead: new Date(), readCount: 3, isNew: false },
      { id: 4, cardType: "extracts", priority: 7, due: new Date(), lastRead: null, readCount: 0, isNew: true },
      { id: 5, cardType: "extracts", priority: 10, due: new Date(), lastRead: null, readCount: 0, isNew: true }
    ]

    const queue = buildIRQueue(cards)
    expect(queue.map(card => card.id)).toEqual([3, 2, 5, 1, 4])
  })
})
