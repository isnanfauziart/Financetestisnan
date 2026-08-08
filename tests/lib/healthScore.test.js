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

describe("health score routine analytics", () => {
  it("uses routine monthly data for trend factors while budget adherence sees actual special expenses", () => {
    const result = computeHealthScore({
      transactions: [
        { type: "expense", category: "Laptop", amount: 10_000_000, expenseClass: "special", month: "Agu", year: "2026" },
        { type: "expense", category: "Makan", amount: 1_000_000, expenseClass: "routine", month: "Agu", year: "2026" },
        { type: "savings", category: "Dana Darurat", amount: 6_000_000, month: "Agu", year: "2026" },
      ],
      monthlyData: [
        { month: "Jun", year: "2026", pemasukan: 5_000_000, pengeluaran: 1_000_000, surplus: 4_000_000 },
        { month: "Jul", year: "2026", pemasukan: 5_000_000, pengeluaran: 1_000_000, surplus: 4_000_000 },
        { month: "Agu", year: "2026", pemasukan: 5_000_000, pengeluaran: 11_000_000, surplus: -6_000_000 },
      ],
      routineMonthlyData: [
        { month: "Jun", year: "2026", pemasukan: 5_000_000, pengeluaranRutin: 1_000_000, surplusRutin: 4_000_000 },
        { month: "Jul", year: "2026", pemasukan: 5_000_000, pengeluaranRutin: 1_000_000, surplusRutin: 4_000_000 },
        { month: "Agu", year: "2026", pemasukan: 5_000_000, pengeluaranRutin: 1_000_000, surplusRutin: 4_000_000 },
      ],
      budgets: [{ kategori: "Laptop", limit: 5_000_000 }],
      liquidSavingsCategories: ["Dana Darurat"],
    })

    const component = (key) => result.components.find(item => item.key === key)
    expect(component("savings_rate").detail).toBe("80% dari income")
    expect(component("emergency_fund").detail).toBe("6.0 bulan cadangan")
    expect(component("expense_trend").detail).toBe("Turun 0%/bln")
    expect(component("budget_adherence").detail).toBe("0/1 on-track")
  })
})
