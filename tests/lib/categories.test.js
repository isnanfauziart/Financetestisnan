import { describe, expect, it } from "vitest"

import {
  CATEGORIES_KEY,
  getLegacyCategories,
  getLiquidSavingsCategories,
  getStarterCategories,
  cloneCategories,
  normalizeCategories,
  parseStoredCategories,
  serializeCategories,
} from "@/lib/categories"

describe("per-user categories", () => {
  it("normalizes names and protects automated debt categories", () => {
    const normalized = normalizeCategories({
      expense: [
        { name: "  Kopi ", icon: "Coffee", active: true },
        { name: "Utang", icon: "Scale", active: false },
      ],
      income: [{ name: " Piutang ", icon: "Coins", active: true }],
      savings: [{ name: "Dana Darurat", icon: "ShieldPlus", active: true, savingsKind: "liquid" }],
    })

    expect(normalized.expense[0].name).toBe("Kopi")
    expect(normalized.expense[1]).toMatchObject({ name: "Utang", active: true, protected: true })
    expect(normalized.income[0].name).toBe("Piutang")
    expect(CATEGORIES_KEY).toBe("categories_v1")
  })

  it("rejects case-insensitive duplicates and malformed stored JSON", () => {
    expect(normalizeCategories({
      expense: [
        { name: "Makan", icon: "Utensils", active: true },
        { name: " makan ", icon: "Beef", active: true },
      ],
      income: [],
      savings: [],
    })).toBeNull()
    expect(normalizeCategories({ expense: [], income: [], savings: [], version: 1 })).toBeNull()
    expect(parseStoredCategories("not-json")).toBeNull()
    expect(parseStoredCategories(JSON.stringify({ expense: [] }))).toBeNull()
  })

  it("keeps legacy fallback separate from new starter categories", () => {
    const legacy = getLegacyCategories()
    const starter = getStarterCategories()

    expect(legacy.expense.some(item => item.name === "Utang" && item.protected)).toBe(true)
    expect(legacy.income.some(item => item.name === "Piutang" && item.protected)).toBe(true)
    expect(starter.expense.some(item => item.name === "Makan & Minum")).toBe(true)
    expect(starter.savings.every(item => ["liquid", "investment"].includes(item.savingsKind))).toBe(true)
    expect(starter).not.toBe(legacy)
  })

  it("derives active liquid names and serializes independent copies", () => {
    const categories = getStarterCategories()
    categories.savings[0].active = false
    expect(getLiquidSavingsCategories(categories)).toContain("Dana Darurat")
    expect(getLiquidSavingsCategories(categories)).not.toContain("Tabungan Cash")

    const copy = cloneCategories(categories)
    copy.savings[0].name = "Changed"
    expect(categories.savings[0].name).toBe("Tabungan Cash")
    expect(JSON.parse(serializeCategories(categories)).savings[0].name).toBe("Tabungan Cash")
  })
})
