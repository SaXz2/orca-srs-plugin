// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Block, DbId } from "../orca.d.ts"

let failingId: DbId | null = null
const blockMap = new Map<DbId, Block>()

const mockOrca = {
  invokeBackend: vi.fn(async (command: string, blockId: DbId) => {
    if (command === "get-block") {
      return blockMap.get(blockId)
    }
    return undefined
  }),
  commands: {
    invokeEditorCommand: vi.fn(async (_command: string, _panelId: any, blockIds: DbId[]) => {
      if (failingId !== null && blockIds.includes(failingId)) {
        throw new Error("块不存在")
      }
      return true
    })
  },
  notify: vi.fn(),
  state: { blocks: {} }
}

// @ts-ignore
globalThis.orca = mockOrca

import { bulkUpdatePriority, invalidateIrBlockCache } from "./incrementalReadingStorage"

function createBlock(id: DbId): Block {
  return {
    id,
    content: [],
    text: `extract-${id}`,
    created: new Date(),
    modified: new Date(),
    parent: undefined,
    left: undefined,
    children: [],
    aliases: [],
    properties: [
      { name: "ir.priority", value: 5, type: 3 },
      { name: "ir.lastRead", value: new Date().toISOString(), type: 5 },
      { name: "ir.readCount", value: 1, type: 3 },
      { name: "ir.due", value: new Date().toISOString(), type: 5 }
    ],
    refs: [],
    backRefs: []
  }
}

describe("bulkUpdatePriority", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    failingId = null
    blockMap.clear()
    blockMap.set(1, createBlock(1))
    blockMap.set(2, createBlock(2))
    invalidateIrBlockCache(1)
    invalidateIrBlockCache(2)
  })

  it("should return success list when all updates succeed", async () => {
    const result = await bulkUpdatePriority([1, 2], 8)

    expect(result.success).toEqual([1, 2])
    expect(result.failed).toEqual([])
    expect(mockOrca.commands.invokeEditorCommand).toHaveBeenCalledTimes(2)
  })

  it("should return failed list when some updates fail", async () => {
    failingId = 2
    const result = await bulkUpdatePriority([1, 2], 8)

    expect(result.success).toEqual([1])
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].id).toBe(2)
    expect(result.failed[0].error).toContain("块不存在")
  })
})
