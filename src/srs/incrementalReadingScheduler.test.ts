import { describe, expect, it } from "vitest"
import { calculateNextDue, getIntervalDays } from "./incrementalReadingScheduler"

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
})
