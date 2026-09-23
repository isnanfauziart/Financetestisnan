import { describe, expect, it } from "vitest"
import { detectAnomalies, getPrevMonths } from "@/lib/anomalies"

const NOW = new Date(2026, 6, 15) // fixed "now": Jul 15 2026

const expense = (month, year, category, amount, extra = {}) => ({
  type: "expense",
  month,
  year,
  category,
  amount,
  ...extra,
})

describe("detectAnomalies (Wave 6, extracted from AnomalyAlerts)", () => {
  it("flags routine spending at ratio >= 1.3 against the previous three months", () => {
    const transactions = [
      expense("Apr", "2026", "Transport", 100000),
      expense("Mei", "2026", "Transport", 100000),
      expense("Jun", "2026", "Transport", 100000),
      expense("Jul", "2026", "Transport", 200000),
    ]
    const results = detectAnomalies({ transactions, month: "Jul", year: "2026", now: NOW })

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      category: "Transport",
      current: 200000,
      avg: 100000,
      ratio: 2,
      severity: "critical",
      prevMonthsCount: 3,
    })
    expect(results[0].projectedAtCurrentRate).toBe(Math.round(200000 / (15 / 31)))
  })

  it("excludes special expenses and categories without history", () => {
    const transactions = [
      expense("Jul", "2026", "Liburan", 500000, { expenseClass: "special" }),
      expense("Jul", "2026", "Baru", 900000),
    ]
    const results = detectAnomalies({ transactions, month: "Jul", year: "2026", now: NOW })
    expect(results).toEqual([])
  })

  it("ignores ratios below the threshold and returns worst first", () => {
    const transactions = [
      expense("Jun", "2026", "Kopi", 100000),
      expense("Jul", "2026", "Kopi", 120000), // 1.2x — below threshold
      expense("Jun", "2026", "Transport", 100000),
      expense("Jul", "2026", "Transport", 300000), // 3.0x
      expense("Jun", "2026", "Makan", 100000),
      expense("Jul", "2026", "Makan", 150000), // 1.5x
    ]
    const results = detectAnomalies({ transactions, month: "Jul", year: "2026", now: NOW })
    expect(results.map(r => r.category)).toEqual(["Transport", "Makan"])
    expect(results.map(r => r.severity)).toEqual(["critical", "high"])
  })

  it("returns nothing for aggregate periods or empty inputs", () => {
    expect(detectAnomalies({ transactions: [], month: "Jul", year: "2026", now: NOW })).toEqual([])
    expect(detectAnomalies({ transactions: [expense("Jul", "2026", "X", 1)], month: "Semua Bulan", year: "2026", now: NOW })).toEqual([])
    expect(detectAnomalies({ transactions: [expense("Jul", "2026", "X", 1)], month: "Jul", year: "Semua Tahun", now: NOW })).toEqual([])
  })

  it("walks back across the year boundary", () => {
    expect(getPrevMonths("Jan", "2026", 3)).toEqual([
      { month: "Des", year: "2025" },
      { month: "Nov", year: "2025" },
      { month: "Okt", year: "2025" },
    ])
  })
})
