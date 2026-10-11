import { describe, expect, it } from "vitest"

import { computeForecast, entryMonthKey } from "@/lib/forecast"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

function monthData(months, incomes = 1000, expenses = 500) {
  return months.map((month, index) => ({
    month,
    year: "2026",
    pemasukan: Array.isArray(incomes) ? incomes[index] : incomes,
    pengeluaran: Array.isArray(expenses) ? expenses[index] : expenses,
    surplus: (Array.isArray(incomes) ? incomes[index] : incomes) - (Array.isArray(expenses) ? expenses[index] : expenses),
  }))
}

describe("computeForecast basis window options", () => {
  it("defaults to a 6-month basis", () => {
    const result = computeForecast(monthData(MONTHS.slice(0, 8)), {
      now: new Date("2026-09-15T00:00:00.000Z"),
    })
    expect(result.monthsUsed).toBe(6)
    expect(result.projectionMonth).toBe("Okt 2026")
  })

  it("uses a 12-month basis when basisMonths is 12", () => {
    const result = computeForecast(monthData(MONTHS), {
      now: new Date("2027-01-15T00:00:00.000Z"),
      basisMonths: 12,
    })
    expect(result.monthsUsed).toBe(12)
    expect(result.projectionMonth).toBe("Feb 2027")
  })

  it("uses the whole observed history when basisMonths is null (Semua)", () => {
    const result = computeForecast(monthData(MONTHS.slice(0, 8)), {
      now: new Date("2026-09-15T00:00:00.000Z"),
      basisMonths: null,
    })
    expect(result.monthsUsed).toBe(8)
  })

  it("keeps the stable income profile on a full 12-month basis", () => {
    const incomes = Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 100 : 110))
    const result = computeForecast(monthData(MONTHS, incomes, 40), {
      now: new Date("2027-01-15T00:00:00.000Z"),
      basisMonths: 12,
    })
    expect(result.incomeProfile).toBe("stable")
    expect(result.incomeMethod).toBe("weighted")
  })

  it("reports a limited profile when the basis window is not full", () => {
    const result = computeForecast(monthData(MONTHS.slice(0, 4)), {
      now: new Date("2026-05-15T00:00:00.000Z"),
      basisMonths: 12,
    })
    expect(result.incomeProfile).toBe("limited")
  })

  it("projects the month after an explicit projectionKey (anchored window)", () => {
    const monthlyData = monthData(MONTHS.slice(0, 10)) // Jan..Okt 2026
    const anchorKey = entryMonthKey("Okt", "2026")
    expect(anchorKey).not.toBeNull()
    const result = computeForecast(monthlyData, {
      now: new Date("2026-12-15T00:00:00.000Z"),
      projectionKey: anchorKey + 1,
    })
    expect(result.projectionMonth).toBe("Nov 2026")
    expect(result.chartData.at(-1).label).toBe("Nov 2026")
    expect(result.chartData.at(-2).label).toBe("Okt 2026")
    expect(result.monthsUsed).toBe(6)
  })

  it("entryMonthKey parses Indonesian month names and rejects Semua Tahun", () => {
    expect(entryMonthKey("Okt", "2026")).toBe(2026 * 12 + 9)
    expect(entryMonthKey("Oktober", "2026")).toBe(2026 * 12 + 9)
    expect(entryMonthKey("Okt", "Semua Tahun")).toBeNull()
  })
})
