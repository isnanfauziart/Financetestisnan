import { describe, it, expect, vi, afterEach } from "vitest"
import { buildMonthlyCashFlowData, getStatsPeriodDefaults, getComparePeriodOptions, getCompareSeriesLabels } from "@/app/dashboard/_components/statsPeriod"

describe("buildMonthlyCashFlowData", () => {
  it("groups income and expenses by chronological year-month and ignores savings-only periods", () => {
    expect(buildMonthlyCashFlowData([
      { type: "income", amount: 2_000_000, month: "Jan", year: "2026" },
      { type: "expense", amount: 500_000, month: "Jan", year: "2026" },
      { type: "income", amount: 1_000_000, month: "Jan", year: "2025" },
      { type: "savings", amount: 900_000, month: "Feb", year: "2025" },
      { type: "expense", amount: 300_000, month: "Des", year: "2025" },
    ])).toEqual([
      { month: "Jan", year: "2025", pemasukan: 1_000_000, pengeluaran: 0 },
      { month: "Des", year: "2025", pemasukan: 0, pengeluaran: 300_000 },
      { month: "Jan", year: "2026", pemasukan: 2_000_000, pengeluaran: 500_000 },
    ])
  })
})

describe("getStatsPeriodDefaults", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("defaults stats filters to current month and year", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-06T10:00:00Z"))

    expect(getStatsPeriodDefaults()).toEqual({
      selectedMonth: "Jul",
      selectedYear: "2026",
      compareMonthA: "Jul",
      compareYearA: "2026",
      compareMonthB: "Jun",
      compareYearB: "2026",
    })
  })

  it("rolls comparison back to previous year in january", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-10T10:00:00Z"))

    expect(getStatsPeriodDefaults()).toEqual({
      selectedMonth: "Jan",
      selectedYear: "2026",
      compareMonthA: "Jan",
      compareYearA: "2026",
      compareMonthB: "Des",
      compareYearB: "2025",
    })
  })
})

describe("getComparePeriodOptions", () => {
  it("includes current and previous comparison years even if transaction years do not", () => {
    expect(getComparePeriodOptions(["2026"], { currentYear: "2026", previousYear: "2025" })).toEqual(["2026", "2025"])
  })

  it("deduplicates and sorts years descending", () => {
    expect(getComparePeriodOptions(["2024", "2026", "2025", "2026"], { currentYear: "2026", previousYear: "2025" })).toEqual(["2026", "2025", "2024"])
  })
})

describe("getCompareSeriesLabels", () => {
  it("uses month and year to avoid duplicate chart keys", () => {
    expect(getCompareSeriesLabels("Jan", "2026", "Jan", "2025")).toEqual({
      compareLabelA: "Jan 2026",
      compareLabelB: "Jan 2025",
    })
  })
})
