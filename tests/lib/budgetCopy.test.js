import { describe, expect, it } from "vitest"
import { budgetCompositeKey, validateBudgetCopyBody } from "@/lib/budgetCopy"

describe("budget copy helpers", () => {
  it("accepts a valid historical copy request and trims values", () => {
    expect(validateBudgetCopyBody({
      source: { bulan: " Agu ", tahun: "2026" },
      destination: { bulan: "Sep", tahun: 2026 },
      items: [{ rowIndex: 3, kategori: " Jajan ", akun: " ", limit: "500000" }],
    })).toEqual({
      errors: [],
      source: { bulan: "Agu", tahun: "2026" },
      destination: { bulan: "Sep", tahun: "2026" },
      items: [{ rowIndex: 3, kategori: "Jajan", akun: "", limit: 500000 }],
    })
  })

  it.each([
    ["same period", {
      source: { bulan: "Agu", tahun: "2026" },
      destination: { bulan: "Agu", tahun: "2026" },
      items: [{ rowIndex: 3, kategori: "Jajan", akun: "", limit: 500000 }],
    }],
    ["missing items", {
      source: { bulan: "Agu", tahun: "2026" },
      destination: { bulan: "Sep", tahun: "2026" },
      items: [],
    }],
    ["non-positive limit", {
      source: { bulan: "Agu", tahun: "2026" },
      destination: { bulan: "Sep", tahun: "2026" },
      items: [{ rowIndex: 3, kategori: "Jajan", akun: "", limit: 0 }],
    }],
    ["duplicate row indexes", {
      source: { bulan: "Agu", tahun: "2026" },
      destination: { bulan: "Sep", tahun: "2026" },
      items: [
        { rowIndex: 3, kategori: "Jajan", akun: "", limit: 500000 },
        { rowIndex: 3, kategori: "Transportasi", akun: "", limit: 300000 },
      ],
    }],
  ])("rejects %s", (_label, body) => {
    expect(validateBudgetCopyBody(body).errors.length).toBeGreaterThan(0)
  })

  it("keeps account-scoped keys distinct", () => {
    expect(budgetCompositeKey("Jajan", "Sep", "2026", "")).not.toBe(
      budgetCompositeKey("Jajan", "Sep", "2026", "Bank BCA"),
    )
  })
})
