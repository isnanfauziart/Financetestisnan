import { describe, expect, it } from "vitest"
import {
  DASHBOARD_TABS,
  diffDashboardUrlState,
  getDashboardUrlDefaults,
  parseDashboardUrl,
  serializeDashboardUrl,
} from "@/app/dashboard/_components/dashboardUrlState"

const NOW = new Date(2026, 8, 22) // fixed "now": Sep 2026

describe("dashboardUrlState defaults", () => {
  it("exposes home/ringkasan/overview defaults with current periods", () => {
    const defaults = getDashboardUrlDefaults(NOW)
    expect(defaults).toMatchObject({
      tab: "home",
      planSection: "overview",
      statsSection: "ringkasan",
      analysisMode: "routine",
      month: "Sep",
      year: "2026",
      account: "Semua Akun",
      category: null,
      dateFrom: "",
      dateTo: "",
      compare: true,
      compareA: "Sep 2026",
      compareB: "Agu 2026",
      calMonth: "Sep",
      calYear: "2026",
    })
    expect(DASHBOARD_TABS).toEqual(["home", "stats", "plan", "profile"])
  })
})

describe("parseDashboardUrl", () => {
  it("returns defaults for an empty query string", () => {
    expect(parseDashboardUrl("", NOW)).toEqual(getDashboardUrlDefaults(NOW))
  })

  it("returns defaults for a malformed query string", () => {
    expect(parseDashboardUrl("%%%", NOW)).toEqual(getDashboardUrlDefaults(NOW))
  })

  it("parses the documented deep-link shapes", () => {
    const state = parseDashboardUrl("?tab=stats&stats=tren&month=Mei&year=2026", NOW)
    expect(state).toMatchObject({ tab: "stats", statsSection: "tren", month: "Mei", year: "2026" })

    const plan = parseDashboardUrl("?tab=plan&section=budget", NOW)
    expect(plan).toMatchObject({ tab: "plan", planSection: "budget" })
  })

  it("fails closed to defaults for unknown values", () => {
    const state = parseDashboardUrl(
      "?tab=admin&section=secret&stats=hack&mode=quantum&month=Desember&year=abcd&from=not-a-date&calMonth=Xyz",
      NOW,
    )
    expect(state).toEqual(getDashboardUrlDefaults(NOW))
  })

  it("accepts the Semua aggregates and both analysis-mode spellings", () => {
    const state = parseDashboardUrl("?month=Semua Bulan&year=Semua Tahun&mode=Rutin&compare=0", NOW)
    expect(state).toMatchObject({
      month: "Semua Bulan",
      year: "Semua Tahun",
      analysisMode: "routine",
      compare: false,
    })

    const actual = parseDashboardUrl("?mode=actual", NOW)
    expect(actual.analysisMode).toBe("actual")
  })

  it("clamps free-text filters instead of echoing arbitrary input", () => {
    const long = "A".repeat(200)
    const state = parseDashboardUrl(`?category=${long}&account=${long}`, NOW)
    expect(state.category.length).toBeLessThanOrEqual(60)
    expect(state.account.length).toBeLessThanOrEqual(120)
  })

  it("validates compare periods as month-year pairs", () => {
    expect(parseDashboardUrl("?cmpA=Sep%202026&cmpB=Agu%202025", NOW)).toMatchObject({
      compareA: "Sep 2026",
      compareB: "Agu 2025",
    })
    expect(parseDashboardUrl("?cmpA=Sep2026&cmpB=Desember%202025", NOW)).toMatchObject({
      compareA: getDashboardUrlDefaults(NOW).compareA,
      compareB: getDashboardUrlDefaults(NOW).compareB,
    })
  })
})

describe("serializeDashboardUrl", () => {
  it("produces an empty query for default state", () => {
    expect(serializeDashboardUrl(getDashboardUrlDefaults(NOW), NOW)).toBe("")
  })

  it("omits keys equal to defaults and round-trips parsed state", () => {
    const parsed = parseDashboardUrl("?tab=stats&stats=tren&month=Mei&year=2025&compare=0", NOW)
    const query = serializeDashboardUrl(parsed, NOW)
    expect(query).toBe("tab=stats&stats=tren&month=Mei&year=2025&compare=0")
    expect(serializeDashboardUrl(parseDashboardUrl(query, NOW), NOW)).toBe(query)
  })

  it("serializes explicit compare periods and calendar month", () => {
    const state = { ...getDashboardUrlDefaults(NOW), compareA: "Des 2024", calMonth: "Mei" }
    const query = serializeDashboardUrl(state, NOW)
    expect(query).toContain("cmpA=Des+2024")
    expect(query).toContain("calMonth=Mei")
  })
})

describe("diffDashboardUrlState", () => {
  it("classifies destination changes as push", () => {
    const base = getDashboardUrlDefaults(NOW)
    expect(diffDashboardUrlState(base, { ...base, tab: "stats" }, NOW)).toBe("push")
    expect(diffDashboardUrlState(base, { ...base, planSection: "budget" }, NOW)).toBe("push")
    expect(diffDashboardUrlState(base, { ...base, statsSection: "tren" }, NOW)).toBe("push")
  })

  it("classifies filter changes as replace", () => {
    const base = getDashboardUrlDefaults(NOW)
    expect(diffDashboardUrlState(base, { ...base, month: "Mei" }, NOW)).toBe("replace")
    expect(diffDashboardUrlState(base, { ...base, category: "Jajan" }, NOW)).toBe("replace")
    expect(diffDashboardUrlState(base, { ...base, year: "2025" }, NOW)).toBe("replace")
  })

  it("returns none when both states serialize identically", () => {
    const base = getDashboardUrlDefaults(NOW)
    expect(diffDashboardUrlState(base, { ...base }, NOW)).toBe("none")
    expect(diffDashboardUrlState(base, { ...base, tab: undefined }, NOW)).toBe("none")
  })
})
