import { describe, expect, it } from "vitest"

import { selectStableInsights } from "@/lib/insights"
import { getCurrentWeekPeriod } from "@/lib/usage"

const transactions = [
  { id: "1", type: "income", amount: 8_000_000, category: "Gaji", account: "BCA", month: "Jul", year: "2026" },
  { id: "2", type: "expense", amount: 2_000_000, category: "Makan", account: "BCA", month: "Jul", year: "2026" },
  { id: "3", type: "expense", amount: 1_000_000, category: "Transportasi", account: "Cash", month: "Jul", year: "2026" },
  { id: "4", type: "savings", amount: 1_500_000, category: "Tabungan Cash", account: "BCA", month: "Jul", year: "2026" },
]

describe("stable weekly insights", () => {
  it("returns at most three deterministic cards for the same WIB week and visible data", () => {
    const weekPeriod = getCurrentWeekPeriod(new Date("2026-07-29T02:00:00.000Z"))

    const first = selectStableInsights({ transactions, weekPeriod, limit: 3 })
    const second = selectStableInsights({ transactions: [...transactions].reverse(), weekPeriod, limit: 3 })

    expect(first).toEqual(second)
    expect(first).toHaveLength(3)
    expect(first.every(card => card.text && card.iconKey && card.color)).toBe(true)
    expect(selectStableInsights({ transactions, weekPeriod, limit: 99 })).toHaveLength(3)
  })

  it("returns no cards without visible transactions", () => {
    expect(selectStableInsights({
      transactions: [],
      weekPeriod: "2026-W31",
      limit: 3,
    })).toEqual([])
  })
})
