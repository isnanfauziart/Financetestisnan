import { describe, expect, it } from "vitest"

import {
  CANONICAL_FEATURES,
  FREE_LIMITS,
  SMART_FEATURES,
  getFeatureWarnings,
  getHistoryWindow,
  getTierLimits,
} from "@/lib/tier"
import {
  getCurrentMonthPeriod,
  getCurrentWeekPeriod,
  getNextMonthlyResetAt,
  getNextWeeklyResetAt,
} from "@/lib/usage"

describe("phase 3 tier rules", () => {
  it("serializes canonical free limits and paid unlimited limits", () => {
    expect(CANONICAL_FEATURES).toEqual([
      "transactions",
      "budgets",
      "goals",
      "debts",
      "momental",
      "bills",
      "insights",
    ])
    expect(FREE_LIMITS).toEqual({
      transactions: 75,
      budgets: 3,
      goals: 1,
      debts: 3,
      momental: 1,
      bills: 3,
      insights: 3,
    })
    expect(getTierLimits("paid").usage.transactions).toBeNull()
    expect(getTierLimits("paid").historyMonths).toBeNull()
  })

  it("uses ceil 80 percent and 100 percent warning thresholds", () => {
    expect(getFeatureWarnings("transactions")).toEqual({ warningAt: 60, limitAt: 75 })
    expect(getFeatureWarnings("goals")).toEqual({ warningAt: 1, limitAt: 1 })
  })

  it("uses WIB month periods, reset dates, and four visible free history months", () => {
    const boundary = new Date("2026-07-31T17:00:00.000Z")

    expect(getCurrentMonthPeriod(boundary)).toBe("2026-08")
    expect(getNextMonthlyResetAt(new Date("2026-07-10T00:00:00.000Z"))).toBe("2026-08-01T00:00:00+07:00")
    expect(getHistoryWindow("free", boundary)).toEqual({
      months: 4,
      from: "2026-05-01",
      to: "2026-08-31",
    })
    expect(getHistoryWindow("paid", boundary).months).toBeNull()
    expect(SMART_FEATURES).toEqual([
      "healthScore",
      "cashFlowForecast",
      "anomalyAlerts",
      "financialIndependence",
      "whatIf",
      "yearInReview",
    ])
  })

  it("uses WIB ISO weeks and next Monday reset for weekly limits", () => {
    expect(getCurrentWeekPeriod(new Date("2026-07-26T16:59:00.000Z"))).toBe("2026-W30")
    expect(getCurrentWeekPeriod(new Date("2026-07-26T17:00:00.000Z"))).toBe("2026-W31")
    expect(getNextWeeklyResetAt(new Date("2026-07-26T16:59:00.000Z"))).toBe("2026-07-27T00:00:00+07:00")
    expect(getNextWeeklyResetAt(new Date("2026-07-26T17:00:00.000Z"))).toBe("2026-08-03T00:00:00+07:00")
  })
})
