import { describe, expect, it } from "vitest"

import { expenseClassToSheet, isSpecialExpense, normalizeExpenseClass } from "@/lib/expenseClass"

describe("expense class", () => {
  it("defaults blank and unknown values to routine", () => {
    expect(normalizeExpenseClass()).toBe("routine")
    expect(normalizeExpenseClass("")).toBe("routine")
    expect(normalizeExpenseClass("unexpected")).toBe("routine")
  })

  it("normalizes persisted and internal special values", () => {
    expect(normalizeExpenseClass(" Spesial ")).toBe("special")
    expect(normalizeExpenseClass("special")).toBe("special")
    expect(expenseClassToSheet("special")).toBe("Spesial")
    expect(expenseClassToSheet("Spesial")).toBe("Spesial")
    expect(expenseClassToSheet("routine")).toBe("Rutin")
  })

  it("does not classify income or savings as special", () => {
    expect(isSpecialExpense({ type: "income", expenseClass: "special" })).toBe(false)
    expect(isSpecialExpense({ type: "savings", expenseClass: "special" })).toBe(false)
    expect(isSpecialExpense({ type: "expense", expenseClass: "special" })).toBe(true)
  })
})
