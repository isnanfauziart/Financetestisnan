import { describe, expect, it } from "vitest"
import { buildRepeatPrefill, isRepeatableTransaction } from "@/lib/transactionRepeat"

const manualExpense = {
  id: "1727000000001",
  type: "expense",
  desc: "Kopi pagi",
  category: "Jajan",
  amount: 25000,
  account: "BCA",
  expenseClass: "routine",
}

describe("isRepeatableTransaction", () => {
  it("allows ordinary manual income and expense rows", () => {
    expect(isRepeatableTransaction(manualExpense)).toBe(true)
    expect(isRepeatableTransaction({ ...manualExpense, type: "income" })).toBe(true)
  })

  it("excludes bill- and debt-generated rows", () => {
    expect(isRepeatableTransaction({ ...manualExpense, id: "billpay:abc:1" })).toBe(false)
    expect(isRepeatableTransaction({ ...manualExpense, id: "debtpay:abc:1" })).toBe(false)
  })

  it("excludes savings rows and invalid input", () => {
    expect(isRepeatableTransaction({ ...manualExpense, type: "savings" })).toBe(false)
    expect(isRepeatableTransaction(null)).toBe(false)
    expect(isRepeatableTransaction(undefined)).toBe(false)
  })

  it("treats missing or case-varied ids safely", () => {
    expect(isRepeatableTransaction({ ...manualExpense, id: "BillPay:abc:1" })).toBe(false)
    expect(isRepeatableTransaction({ ...manualExpense, id: "" })).toBe(true)
  })
})

describe("buildRepeatPrefill", () => {
  it("copies approved fields, defaults date to today, omits the event tag", () => {
    const prefill = buildRepeatPrefill(
      { ...manualExpense, eventId: "evt-123", expenseClass: "special" },
      new Date(2026, 8, 22),
    )
    expect(prefill).toEqual({
      id: "1727000000001",
      txType: "expense",
      formData: {
        tanggal: "2026-09-22",
        keterangan: "Kopi pagi",
        kategori: "Jajan",
        jumlah: "",
        akunBank: "BCA",
        catatan: "",
        eventId: "",
        sifat: "Spesial",
      },
      rawAmount: "25000",
    })
  })

  it("normalizes special classification and missing fields", () => {
    const prefill = buildRepeatPrefill(
      { id: "x", type: "income", category: "Gaji", amount: 1000000.4, expenseClass: "SPESIAL" },
      new Date(2026, 0, 5),
    )
    expect(prefill.formData).toMatchObject({ sifat: "Rutin", tanggal: "2026-01-05", akunBank: "" })
    expect(prefill.rawAmount).toBe("1000000")
  })

  it("returns null for non-repeatable rows", () => {
    expect(buildRepeatPrefill({ ...manualExpense, id: "billpay:abc:1" })).toBeNull()
    expect(buildRepeatPrefill(null)).toBeNull()
  })
})
