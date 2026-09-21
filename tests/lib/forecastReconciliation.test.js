import { describe, expect, it } from "vitest"
import { computeForecast } from "@/lib/forecast"

const SOURCE = "recurring:v1:netflix|hiburan|bank bca"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"]
const NOW = new Date("2026-07-15T00:00:00.000Z")

function buildData() {
  const monthlyData = MONTHS.map(month => ({
    month,
    year: "2026",
    pemasukan: 2_000_000,
    pengeluaran: 700_000,
    pengeluaranRutin: 700_000,
    surplusRutin: 1_300_000,
  }))
  const transactions = MONTHS.map((month, index) => ({
    id: `tx-${index}`,
    type: "expense",
    desc: "Netflix",
    category: "Hiburan",
    account: "Bank BCA",
    amount: 200_000,
    month,
    year: "2026",
  }))
  return { monthlyData, transactions }
}

const bill = (overrides = {}) => ({
  id: "netflix",
  tipe: "expense",
  jumlah: 200_000,
  frekuensi: "monthly",
  tanggalJatuhTempo: 5,
  aktif: true,
  sourceFingerprint: SOURCE,
  createdAt: "2026-01-01",
  ...overrides,
})

describe("forecast reconciliation with converted recurring expenses", () => {
  it("counts a converted routine expense once: out of the baseline, in as a scheduled bill", () => {
    const { monthlyData, transactions } = buildData()
    const result = computeForecast(monthlyData, { now: NOW, transactions, bills: [bill()] })

    expect(result.variableExpenseBaseline).toBe(500_000)
    expect(result.scheduledExpense).toBe(200_000)
    expect(result.projectedExpense).toBe(700_000)
  })

  it("restores history into the baseline when the bill is disabled or deleted", () => {
    const { monthlyData, transactions } = buildData()

    const disabled = computeForecast(monthlyData, { now: NOW, transactions, bills: [bill({ aktif: false })] })
    expect(disabled.variableExpenseBaseline).toBe(700_000)
    expect(disabled.scheduledExpense).toBe(0)
    expect(disabled.projectedExpense).toBe(700_000)

    const deleted = computeForecast(monthlyData, { now: NOW, transactions, bills: [] })
    expect(deleted.variableExpenseBaseline).toBe(700_000)
    expect(deleted.scheduledExpense).toBe(0)
    expect(deleted.projectedExpense).toBe(700_000)
  })

  it("keeps unrelated routine spending in the baseline", () => {
    const { monthlyData, transactions } = buildData()
    transactions.forEach(transaction => { transaction.desc = "Netflix Max" })
    const result = computeForecast(monthlyData, { now: NOW, transactions, bills: [bill()] })

    expect(result.variableExpenseBaseline).toBe(700_000)
    expect(result.scheduledExpense).toBe(200_000)
  })

  it("does not double-subtract the bill's own auto-payments", () => {
    const { monthlyData, transactions } = buildData()
    transactions.forEach((transaction, index) => {
      // Auto-created payments carry a distinct description, so their
      // fingerprint does not match the bill's stored stream fingerprint.
      transaction.id = `billpay:netflix:2026-${index + 1}`
      transaction.desc = "Bayar tagihan: Netflix"
    })
    const result = computeForecast(monthlyData, { now: NOW, transactions, bills: [bill()] })

    expect(result.variableExpenseBaseline).toBe(500_000)
    expect(result.scheduledExpense).toBe(200_000)
    expect(result.projectedExpense).toBe(700_000)
  })
})
