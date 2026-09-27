import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import WhatIfModal from "@/components/WhatIfModal"
import YearInReviewButton from "@/components/YearInReviewButton"

vi.mock("@/lib/useSharedData", () => ({
  useGoals: vi.fn(() => ({ goals: [] })),
  useBudgets: vi.fn(() => ({ budgets: [] })),
  useBills: vi.fn(() => ({ bills: [] })),
  useSettings: vi.fn(() => ({ settings: {} })),
}))

const TRANSACTIONS = [
  { id: "1", type: "expense", category: "Jajan", amount: 300_000, month: "Jun", year: "2026" },
  { id: "2", type: "expense", category: "Jajan", amount: 500_000, month: "Jul", year: "2026" },
  { id: "3", type: "expense", category: "Jajan", amount: 500_000, month: "Jul", year: "2026", expenseClass: "special" },
]

afterEach(() => cleanup())

describe("WhatIfModal basis note (Wave 8)", () => {
  it("discloses that the category average includes all recorded expenses incl. Spesial", () => {
    render(<WhatIfModal open onClose={() => {}} transactions={TRANSACTIONS} allocations={{}} />)

    fireEvent.click(screen.getByRole("button", { name: /kurangi pengeluaran/i }))
    fireEvent.click(screen.getByRole("option", { name: "Jajan" }))

    expect(screen.getByText(/Rata-rata kategori memakai semua transaksi tercatat, termasuk pengeluaran Spesial/)).toBeInTheDocument()
    expect(screen.getByText(/2 bulan tercatat/)).toBeInTheDocument()
  })
})

describe("YearInReviewButton basis note (Wave 8)", () => {
  function makeTransactions(count, year = "2026") {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    return Array.from({ length: count }, (_, index) => ({
      id: `tx-${index}`,
      type: "expense",
      category: "Jajan",
      amount: 10_000,
      month: months[index % 12],
      year,
    }))
  }

  it("discloses that both routine and Spesial expenses are included in the annual report", () => {
    render(<YearInReviewButton transactions={makeTransactions(10)} monthlyData={[]} routineMonthlyData={[]} userName="Ayu" />)

    const button = screen.getByRole("button", { name: /unduh year-in-review/i })
    expect(button).toHaveTextContent(/Rutin dan Spesial masuk hitungan/i)
  })

  it("keeps the insufficient-data state as the primary message when under 10 transactions", () => {
    render(<YearInReviewButton transactions={makeTransactions(4)} monthlyData={[]} routineMonthlyData={[]} userName="Ayu" />)

    expect(screen.getByRole("button", { name: /butuh minimal 10 transaksi/i })).toHaveTextContent(/4\/10/)
  })
})
