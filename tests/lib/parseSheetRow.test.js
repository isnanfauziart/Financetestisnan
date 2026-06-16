import { describe, it, expect } from "vitest"
import { pickAmount } from "@/lib/parseSheetRow"

describe("pickAmount", () => {
  it("uses column I (Net) when it is a valid number", () => {
    const row = ["1 Jan 2025", "1", "desc", "Makan", 50000, "", "", "Cash", 48000, "", "Jan", "2025", "2025"]
    expect(pickAmount(row)).toBe(48000)
  })

  it("falls through to column E (Jumlah) when column I contains #REF!", () => {
    const row = ["1 Jan 2025", "1", "desc", "Makan", 50000, "", "", "Cash", "#REF!", "", "Jan", "2025", "2025"]
    expect(pickAmount(row)).toBe(50000)
  })

  it("falls through when column I is #DIV/0! or other Google Sheets error", () => {
    const rowDiv = ["x", "1", "d", "Makan", 25000, "", "", "Cash", "#DIV/0!", "", "Jan", "2025", "2025"]
    expect(pickAmount(rowDiv)).toBe(25000)
    const rowVal = ["x", "1", "d", "Makan", 33000, "", "", "Cash", "#VALUE!", "", "Jan", "2025", "2025"]
    expect(pickAmount(rowVal)).toBe(33000)
    const rowNa = ["x", "1", "d", "Makan", 99000, "", "", "Cash", "#N/A", "", "Jan", "2025", "2025"]
    expect(pickAmount(rowNa)).toBe(99000)
  })

  it("rejects date strings in column I (regex strict numeric)", () => {
    const row = ["x", "1", "d", "Makan", 42000, "", "", "Cash", "7 Jun 2026", "", "Jan", "2025", "2025"]
    expect(pickAmount(row)).toBe(42000)
  })

  it("rejects empty string in column I", () => {
    const row = ["x", "1", "d", "Makan", 10000, "", "", "Cash", "", "", "Jan", "2025", "2025"]
    expect(pickAmount(row)).toBe(10000)
  })

  it("rejects text in column I", () => {
    const row = ["x", "1", "d", "Makan", 77000, "", "", "Cash", "abc", "", "Jan", "2025", "2025"]
    expect(pickAmount(row)).toBe(77000)
  })

  it("falls through to column E when column I is 0", () => {
    const row = ["x", "1", "d", "Makan", 15000, "", "", "Cash", 0, "", "Jan", "2025", "2025"]
    expect(pickAmount(row)).toBe(15000)
  })

  it("returns 0 when both columns are empty", () => {
    const row = ["x", "1", "d", "Makan", "", "", "", "Cash", "", "", "Jan", "2025", "2025"]
    expect(pickAmount(row)).toBe(0)
  })

  it("uses custom netIdx/grossIdx", () => {
    const row = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m"]
    expect(pickAmount(row, 12, 0)).toBe(0)
  })
})
