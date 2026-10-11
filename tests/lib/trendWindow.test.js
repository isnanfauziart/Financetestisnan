import { describe, expect, it } from "vitest"
import { sliceWindowEnd, formatWindowLabel, TREND_SPAN_MONTHS, spanMonthsFor } from "@/lib/trendWindow"

const MONTHS = ["Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov"]
const series = MONTHS.map((month, i) => ({ month, year: "2026", value: i }))

describe("sliceWindowEnd", () => {
  it("returns the last N months without an anchor", () => {
    const out = sliceWindowEnd(series, { span: 6, anchor: null })
    expect(out.map(r => r.month)).toEqual(["Jun", "Jul", "Agu", "Sep", "Okt", "Nov"])
  })

  it("returns everything up to the last entry when span is null (Semua)", () => {
    expect(sliceWindowEnd(series, { span: null, anchor: null })).toHaveLength(7)
  })

  it("ends the window at the anchor month when one is selected", () => {
    const out = sliceWindowEnd(series, { span: 6, anchor: { month: "Okt", year: "2026" } })
    expect(out.map(r => r.month)).toEqual(["Mei", "Jun", "Jul", "Agu", "Sep", "Okt"])
  })

  it("keeps the full history up to the anchor when span is null", () => {
    const out = sliceWindowEnd(series, { span: null, anchor: { month: "Jul", year: "2026" } })
    expect(out.map(r => r.month)).toEqual(["Mei", "Jun", "Jul"])
  })

  it("falls back to the last entry when the anchor month is missing", () => {
    const out = sliceWindowEnd(series, { span: 6, anchor: { month: "Des", year: "2026" } })
    expect(out.map(r => r.month)).toEqual(["Jun", "Jul", "Agu", "Sep", "Okt", "Nov"])
  })

  it("matches the latest entry of that month when the anchor year is Semua Tahun", () => {
    const multi = [
      { month: "Okt", year: "2025" },
      { month: "Nov", year: "2025" },
      { month: "Okt", year: "2026" },
    ]
    const out = sliceWindowEnd(multi, { span: 2, anchor: { month: "Okt", year: "Semua Tahun" } })
    expect(out).toEqual([
      { month: "Nov", year: "2025" },
      { month: "Okt", year: "2026" },
    ])
  })

  it("returns fewer than N months when the series is shorter", () => {
    const out = sliceWindowEnd(series.slice(0, 3), { span: 6, anchor: null })
    expect(out).toHaveLength(3)
  })

  it("returns [] for empty or non-array input", () => {
    expect(sliceWindowEnd([], { span: 6 })).toEqual([])
    expect(sliceWindowEnd(null, { span: 6 })).toEqual([])
  })
})

describe("formatWindowLabel", () => {
  it("formats a range with years", () => {
    const windowed = sliceWindowEnd(series, { span: 6, anchor: { month: "Okt", year: "2026" } })
    expect(formatWindowLabel(windowed)).toBe("Mei 2026 – Okt 2026")
  })

  it("uses the fallback year when entries carry no year", () => {
    const noYear = MONTHS.map(month => ({ month }))
    expect(formatWindowLabel(noYear.slice(0, 3), "2026")).toBe("Mei 2026 – Jul 2026")
  })

  it("returns a single label for a one-month window", () => {
    expect(formatWindowLabel([series[0]])).toBe("Mei 2026")
  })

  it("returns an empty string for an empty window", () => {
    expect(formatWindowLabel([])).toBe("")
  })
})

describe("TREND_SPAN_MONTHS", () => {
  it("maps chip labels to month counts", () => {
    expect(TREND_SPAN_MONTHS["6 bln"]).toBe(6)
    expect(TREND_SPAN_MONTHS["12 bln"]).toBe(12)
    expect(TREND_SPAN_MONTHS["Semua"]).toBeNull()
  })
})

describe("spanMonthsFor", () => {
  it("keeps Semua as null instead of falling back to 6", () => {
    expect(spanMonthsFor("Semua")).toBeNull()
    expect(spanMonthsFor("6 bln")).toBe(6)
    expect(spanMonthsFor("12 bln")).toBe(12)
    expect(spanMonthsFor("unknown")).toBe(6)
  })
})
