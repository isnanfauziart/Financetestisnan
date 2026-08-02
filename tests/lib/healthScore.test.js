import { describe, expect, it } from "vitest"

import { computeHealthScore } from "@/lib/healthScore"

const monthlyData = [{ month: "Jul", year: "2026", pemasukan: 1_000, pengeluaran: 500 }]

describe("health score liquid savings categories", () => {
  it("keeps the legacy Tabungan Cash and Emas default", () => {
    const result = computeHealthScore({
      transactions: [
        { type: "savings", category: "Tabungan Cash", amount: 3_000 },
        { type: "savings", category: "Emas", amount: 3_000 },
        { type: "savings", category: "Dana Darurat", amount: 30_000 },
      ],
      monthlyData,
      budgets: [],
    })

    expect(result.components.find(component => component.key === "emergency_fund").detail).toBe("12.0 bulan cadangan")
  })

  it("uses configured liquid savings names when supplied", () => {
    const result = computeHealthScore({
      transactions: [
        { type: "savings", category: "Dana Darurat", amount: 3_000 },
      ],
      monthlyData,
      budgets: [],
      liquidSavingsCategories: ["Dana Darurat"],
    })

    expect(result.components.find(component => component.key === "emergency_fund").detail).toBe("6.0 bulan cadangan")
  })
})
