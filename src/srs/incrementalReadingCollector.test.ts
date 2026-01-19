import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./incrementalReadingStorage", () => ({
  ensureIRState: vi.fn(),
  loadIRState: vi.fn()
}))

import type { Block, BlockProperty, BlockRef, DbId } from "../orca.d.ts"
import { collectIRCardsFromBlocks } from "./incrementalReadingCollector"
import { ensureIRState, loadIRState } from "./incrementalReadingStorage"

function createCardRef(blockId: DbId, typeValue: string): BlockRef {
  const data: BlockProperty[] = [{ name: "type", value: typeValue, type: 2 }]
  return {
    id: blockId * 100,
    from: blockId,
    to: 1,
    type: 2,
    alias: "card",
    data
  }
}

function createBlock(id: DbId, typeValue: string): Block {
  return {
    id,
    content: [],
    text: `${typeValue}-${id}`,
    created: new Date(),
    modified: new Date(),
    parent: undefined,
    left: undefined,
    children: [],
    aliases: [],
    properties: [],
    refs: [createCardRef(id, typeValue)],
    backRefs: []
  }
}

describe("incrementalReadingCollector", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should collect only extracts/topic and include new or due cards", async () => {
    const now = new Date("2025-01-01T00:00:00Z")
    vi.useFakeTimers()
    vi.setSystemTime(now)

    const blocks: Block[] = [
      createBlock(1, "extracts"),
      createBlock(2, "topic"),
      createBlock(3, "basic")
    ]

    const stateMap = new Map<DbId, { priority: number; lastRead: Date | null; readCount: number; due: Date }>([
      [1, { priority: 5, lastRead: null, readCount: 0, due: new Date(now.getTime() + 3600 * 1000) }],
      [2, { priority: 8, lastRead: new Date(now.getTime() - 1000), readCount: 1, due: new Date(now.getTime() - 1000) }],
      [3, { priority: 5, lastRead: new Date(now.getTime() - 1000), readCount: 1, due: new Date(now.getTime() - 1000) }]
    ])

    vi.mocked(ensureIRState).mockResolvedValue({
      priority: 5,
      lastRead: null,
      readCount: 0,
      due: now
    })

    vi.mocked(loadIRState).mockImplementation(async (blockId: DbId) => {
      const state = stateMap.get(blockId)
      if (!state) {
        throw new Error("missing state")
      }
      return state
    })

    const results = await collectIRCardsFromBlocks(blocks)

    expect(results.map(card => card.id)).toEqual([1, 2])
    expect(results.find(card => card.id === 1)?.isNew).toBe(true)
    expect(vi.mocked(ensureIRState)).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })
})
