import { describe, expect, it } from "vitest"
import { countRecordRows, currentWibBudgetPeriod, recordQuotaResponse } from "@/lib/recordQuota"

describe("record quota helpers", () => {
  it("counts nonblank rows and filters budgets by month and year", () => {
    const rows = [
      ["Kategori", "Bulan", "Tahun"],
      ["Makan", "Jul", "2026"],
      ["Transport", "Jul", 2026],
      ["", "Jul", "2026"],
      ["Belanja", "Jun", "2026"],
    ]
    expect(countRecordRows("budgets", rows, { month: "Jul", year: "2026" })).toBe(2)
    expect(countRecordRows("goals", [["ID"], ["1"], [""], ["2"]])).toBe(2)
  })

  it("uses WIB for the current budget period", () => {
    expect(currentWibBudgetPeriod(new Date("2026-06-30T17:30:00.000Z"))).toEqual({
      month: "Jul",
      year: "2026",
    })
  })

  it("returns stable limit and unverifiable contracts", async () => {
    const limited = recordQuotaResponse("goals", 1, 1)
    expect(limited.status).toBe(403)
    await expect(limited.json()).resolves.toMatchObject({
      code: "FEATURE_LIMIT_REACHED",
      feature: "goals",
      current: 1,
      limit: 1,
      upgrade: true,
      resetAt: null,
    })

    const unavailable = recordQuotaResponse("bills", null, 3)
    expect(unavailable.status).toBe(503)
    expect(unavailable.headers.get("Retry-After")).toBe("30")
  })
})
