import { describe, it, expect, vi, afterEach } from "vitest"
import { getStatsPeriodDefaults, getComparePeriodOptions, getCompareSeriesLabels } from "@/app/dashboard/_components/statsPeriod"

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
