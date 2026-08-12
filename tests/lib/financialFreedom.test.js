import { describe, expect, it } from "vitest"
import {
  addWibMonthsClamped,
  calculateFinancialFreedom,
  getCompletedExpenseMonths,
} from "@/lib/financialFreedom"

const NOW = new Date("2026-06-15T00:00:00.000Z")

function monthlyData() {
  return [
    { month: "Jan", year: "2026", pemasukan: 10_000_000, pengeluaran: 4_000_000 },
    { month: "Feb", year: "2026", pemasukan: 11_000_000, pengeluaran: 0 },
    { month: "Mar", year: "2026", pemasukan: 12_000_000, pengeluaran: 6_000_000 },
    { month: "Apr", year: "2026", pemasukan: 14_000_000, pengeluaran: 8_000_000 },
    { month: "Mei", year: "2026", pemasukan: 15_000_000, pengeluaran: 10_000_000 },
    { month: "Jun", year: "2026", pemasukan: 100_000_000, pengeluaran: 99_000_000 },
  ]
}

describe("financial freedom calculation", () => {
  it("selects up to 12 completed WIB expense months without turning missing months into zero", () => {
    const selected = getCompletedExpenseMonths(monthlyData(), NOW)

    expect(selected.map((month) => `${month.month}-${month.year}`)).toEqual([
      "Jan-2026",
      "Mar-2026",
      "Apr-2026",
      "Mei-2026",
    ])
    expect(selected).toHaveLength(4)
  })

  it("calculates the target from actual expenses and ETA from the same months", () => {
    const result = calculateFinancialFreedom({
      monthlyData: monthlyData(),
      netWorth: 500_000_000,
      netWorthHistory: [
        { month: "Jan", year: "2026", value: 300_000_000 },
        { month: "Mar", year: "2026", value: 400_000_000 },
        { month: "Mei", year: "2026", value: 500_000_000 },
      ],
      now: NOW,
    })

    expect(result.status).toBe("ready")
    expect(result.monthCount).toBe(4)
    expect(result.actualMonthlyExpense).toBe(7_000_000)
    expect(result.averageMonthlyIncome).toBe(12_750_000)
    expect(result.averageMonthlySurplus).toBe(5_750_000)
    expect(result.target).toBe(2_100_000_000)
    expect(result.remaining).toBe(1_600_000_000)
    expect(result.monthsToFreedom).toBeCloseTo(1600 / 5.75, 5)
    const projectedPoints = result.projectionData.filter((point) => point.projected !== null)
    expect(projectedPoints).toHaveLength(2)
    expect(projectedPoints[0]).toMatchObject({ label: "Sekarang", actual: 500_000_000, projected: 500_000_000 })
    expect(projectedPoints.at(-1)).toMatchObject({ projected: 2_100_000_000, actual: null })
    expect(projectedPoints[0].key).toBe(2026 * 12 + 5)
    expect(result.projectionData.some((point) => point.actual === 500_000_000)).toBe(true)
  })

  it("upserts the current month when net worth history already contains it", () => {
    const result = calculateFinancialFreedom({
      monthlyData: monthlyData(),
      netWorth: 500_000_000,
      netWorthHistory: [
        { month: "Mei", year: "2026", value: 450_000_000 },
        { month: "Jun", year: "2026", value: 490_000_000 },
      ],
      now: NOW,
    })

    const currentPoints = result.projectionData.filter((point) => point.key === 2026 * 12 + 5)
    expect(currentPoints).toHaveLength(1)
    expect(currentPoints[0]).toMatchObject({ label: "Sekarang", actual: 500_000_000 })
  })

  it("uses a custom expense only for the target, never for actual surplus", () => {
    const result = calculateFinancialFreedom({
      monthlyData: monthlyData(),
      netWorth: 500_000_000,
      monthlyExpenseOverride: 12_000_000,
      now: NOW,
    })

    expect(result.status).toBe("ready")
    expect(result.expenseBasis).toBe("custom")
    expect(result.target).toBe(3_600_000_000)
    expect(result.actualMonthlyExpense).toBe(7_000_000)
    expect(result.averageMonthlySurplus).toBe(5_750_000)
  })

  it("rejects null-like and non-finite net worth values instead of coercing them to zero", () => {
    for (const netWorth of [null, undefined, "", "   ", true, false, NaN, Infinity, -Infinity]) {
      const result = calculateFinancialFreedom({
        monthlyData: monthlyData(),
        netWorth,
        now: NOW,
      })

      expect(result.status, `netWorth=${String(netWorth)}`).toBe("invalid-net-worth")
      expect(result.currentNetWorth).toBeNull()
    }
  })

  it("returns explicit insufficient-data and non-positive-surplus statuses", () => {
    expect(calculateFinancialFreedom({
      monthlyData: [{ month: "Mei", year: "2026", pemasukan: 10_000_000, pengeluaran: 4_000_000 }],
      netWorth: 0,
      now: NOW,
    }).status).toBe("insufficient-data")

    const noSurplus = calculateFinancialFreedom({
      monthlyData: [
        { month: "Apr", year: "2026", pemasukan: 3_000_000, pengeluaran: 4_000_000 },
        { month: "Mei", year: "2026", pemasukan: 3_000_000, pengeluaran: 4_000_000 },
      ],
      netWorth: 0,
      now: NOW,
    })

    expect(noSurplus.status).toBe("non-positive-surplus")
    expect(noSurplus.monthsToFreedom).toBeNull()
  })

  it("keeps month-end ETA dates from overflowing into the following month", () => {
    const date = addWibMonthsClamped(new Date("2026-01-31T00:00:00.000Z"), 1)
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date)
    const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]))

    expect(values).toMatchObject({ year: "2026", month: "02", day: "28" })
  })
})
