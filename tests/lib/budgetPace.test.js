import { describe, expect, it } from "vitest"
import { computeBudgetPace, summarizeUnpaidBudgetBills } from "@/lib/budgetPace"

const now = new Date("2026-08-15T00:00:00.000Z")

describe("budget pace", () => {
  it("calculates remaining amount and daily room for the current WIB month", () => {
    expect(computeBudgetPace({ limit: 1000000, spent: 400000, month: "Agu", year: "2026", now })).toMatchObject({
      status: "active",
      remaining: 600000,
      remainingDays: 17,
      dailyRoom: 35295,
      paceStatus: "slower",
    })
  })

  it("accepts the budget field names returned by the Budgets API", () => {
    expect(computeBudgetPace({ limit: 1000000, spent: 400000, bulan: "Agu", tahun: "2026", now })).toMatchObject({
      status: "active",
      remaining: 600000,
      dailyRoom: 35295,
    })
  })

  it("uses a neutral band around the even-month spending pace", () => {
    expect(computeBudgetPace({ limit: 1000000, spent: 500000, month: "Agu", year: "2026", now }).paceStatus).toBe("steady")
    expect(computeBudgetPace({ limit: 1000000, spent: 600000, month: "Agu", year: "2026", now }).paceStatus).toBe("faster")
  })

  it("does not present negative daily room after a budget is exceeded", () => {
    expect(computeBudgetPace({ limit: 1000000, spent: 1100000, month: "Agu", year: "2026", now })).toMatchObject({
      status: "over",
      remaining: 0,
      exceeded: 100000,
      dailyRoom: 0,
    })
  })

  it("does not calculate current pacing for past or future budgets", () => {
    expect(computeBudgetPace({ limit: 1000000, spent: 0, month: "Jul", year: "2026", now }).status).toBe("past")
    expect(computeBudgetPace({ limit: 1000000, spent: 0, month: "Sep", year: "2026", now }).status).toBe("future")
  })

  it("uses the Jakarta calendar date at a month boundary", () => {
    expect(computeBudgetPace({ limit: 900000, spent: 0, month: "Agu", year: "2026", now: new Date("2026-07-31T17:00:00.000Z") })).toMatchObject({
      status: "active",
      remainingDays: 31,
      dailyRoom: 29033,
    })
  })

  it("matches only unpaid expense bills in the budget category and account scope", () => {
    const bills = [
      { id: "bca", tipe: "expense", aktif: true, kategoriTransaksi: "Hiburan", akunBank: "Bank BCA", currentCycleDueDate: "2026-08-20", isPaidForCurrentCycle: false },
      { id: "other-account", tipe: "expense", aktif: true, kategoriTransaksi: "Hiburan", akunBank: "OVO", currentCycleDueDate: "2026-08-20", isPaidForCurrentCycle: false },
      { id: "paid", tipe: "expense", aktif: true, kategoriTransaksi: "Hiburan", akunBank: "Bank BCA", currentCycleDueDate: "2026-08-21", isPaidForCurrentCycle: true },
      { id: "income", tipe: "income", aktif: true, kategoriTransaksi: "Hiburan", akunBank: "Bank BCA", currentCycleDueDate: "2026-08-22", isPaidForCurrentCycle: false },
      { id: "next-month", tipe: "expense", aktif: true, kategoriTransaksi: "Hiburan", akunBank: "Bank BCA", currentCycleDueDate: "2026-09-20", isPaidForCurrentCycle: false },
    ]

    expect(summarizeUnpaidBudgetBills({
      bills,
      budget: { kategori: "Hiburan", akun: "Bank BCA", bulan: "Agu", tahun: "2026" },
      now,
    }).map(bill => bill.id)).toEqual(["bca"])
    expect(summarizeUnpaidBudgetBills({
      bills,
      budget: { kategori: "Hiburan", akun: "", bulan: "Agu", tahun: "2026" },
      now,
    }).map(bill => bill.id)).toEqual(["bca", "other-account"])
  })
})
