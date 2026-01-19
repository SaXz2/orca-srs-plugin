import { describe, expect, it, vi } from "vitest"
import { calculateNextDue, getIntervalDays, getPriorityFromTag, getRandomIntervalDays } from "./incrementalReadingScheduler"

describe("incrementalReadingScheduler", () => {
  it("should map priority to interval days", () => {
    expect(getIntervalDays(10)).toBe(1)
    expect(getIntervalDays(9)).toBe(2)
    expect(getIntervalDays(8)).toBe(2)
    expect(getIntervalDays(7)).toBe(3)
    expect(getIntervalDays(6)).toBe(3)
    expect(getIntervalDays(5)).toBe(5)
    expect(getIntervalDays(4)).toBe(5)
    expect(getIntervalDays(3)).toBe(7)
    expect(getIntervalDays(1)).toBe(7)
  })

  it("should calculate next due based on base date", () => {
    const baseDate = new Date("2025-01-01T00:00:00Z")
    const due = calculateNextDue(8, baseDate)
    expect(due.toISOString().startsWith("2025-01-03")).toBe(true)
  })

  it("should randomize interval within priority range", () => {
    const spy = vi.spyOn(Math, "random")

    spy.mockReturnValue(0)
    expect(getRandomIntervalDays("高优先级")).toBe(1)
    expect(getRandomIntervalDays("中优先级")).toBe(3)
    expect(getRandomIntervalDays("低优先级")).toBe(7)

    spy.mockReturnValue(0.999)
    expect(getRandomIntervalDays("高优先级")).toBe(2)
    expect(getRandomIntervalDays("中优先级")).toBe(5)
    expect(getRandomIntervalDays("低优先级")).toBe(10)

    spy.mockRestore()
  })

  it("should extract priority from #card tag data", () => {
    const block = {
      refs: [
        {
          type: 2,
          alias: "card",
          data: [{ name: "priority", value: ["高优先级"] }]
        }
      ]
    } as any

    expect(getPriorityFromTag(block)).toBe("高优先级")
  })
})
