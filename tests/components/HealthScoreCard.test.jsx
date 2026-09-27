import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import HealthScoreCard from "@/components/HealthScoreCard"

vi.mock("recharts", () => ({}))

vi.mock("@/lib/useSharedData", () => ({
  useBudgets: vi.fn(() => ({ budgets: [] })),
  useBills: vi.fn(() => ({ bills: [] })),
  useSettings: vi.fn(() => ({ settings: {} })),
  useGoals: vi.fn(() => ({ goals: [] })),
}))

function monthEntry(month, year, overrides = {}) {
  return {
    month,
    year,
    pemasukan: 4_000_000,
    pengeluaran: 2_000_000,
    surplus: 2_000_000,
    ...overrides,
  }
}

function createMonthlyData(count = 3) {
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
  return Array.from({ length: count }, (_, index) => monthEntry(months[index], "2026"))
}

function createTransactions() {
  return [
    { type: "savings", category: "Tabungan Cash", amount: 3_000_000, month: "Mar", year: "2026" },
    { type: "expense", category: "Makanan", amount: 900_000, month: "Mar", year: "2026" },
  ]
}

function renderCard(overrides = {}) {
  return render(
    <HealthScoreCard
      transactions={createTransactions()}
      monthlyData={createMonthlyData()}
      routineMonthlyData={createMonthlyData().map((m) => ({ ...m, pengeluaranRutin: m.pengeluaran, surplusRutin: m.surplus }))}
      selectedMonth="Mar"
      selectedYear="2026"
      liquidSavingsCategories={["Tabungan Cash"]}
      {...overrides}
    />,
  )
}

afterEach(() => cleanup())

describe("HealthScoreCard formula sheet (Wave 8)", () => {
  it("discloses months covered and the liquid-savings basis", () => {
    renderCard()

    fireEvent.click(screen.getByRole("button", { name: "Ketuk untuk melihat penjelasan rumus skor kesehatan" }))

    const sheet = screen.getByRole("dialog")
    expect(within(sheet).getByText(/Data terpakai: 3 bulan lengkap/)).toBeInTheDocument()
    expect(within(sheet).getByText(/Dana darurat dihitung dari kategori tabungan: Tabungan Cash/)).toBeInTheDocument()
  })

  it("names excluded components with reasons when budgets are absent", () => {
    renderCard({ monthlyData: createMonthlyData(1), routineMonthlyData: createMonthlyData(1) })

    fireEvent.click(screen.getByRole("button", { name: "Ketuk untuk melihat penjelasan rumus skor kesehatan" }))

    const sheet = screen.getByRole("dialog")
    expect(within(sheet).getByText(/Tidak aktif: Budget Adherence — belum ada budget bulan ini/)).toBeInTheDocument()
    expect(within(sheet).getByText(/Tidak aktif: Expense Trend — butuh minimal 2 bulan data/)).toBeInTheDocument()
  })

  it("marks Budget Adherence active when budgets exist", async () => {
    const { useBudgets } = await import("@/lib/useSharedData")
    useBudgets.mockReturnValue({ budgets: [{ kategori: "Makanan", limit: 1_000_000 }] })

    renderCard()

    fireEvent.click(screen.getByRole("button", { name: "Ketuk untuk melihat penjelasan rumus skor kesehatan" }))

    expect(within(screen.getByRole("dialog")).queryByText(/Budget Adherence — belum ada budget/)).not.toBeInTheDocument()
  })

  it("offers evidence navigation to budgets via onOpenPlanBudgets", () => {
    const onOpenPlanBudgets = vi.fn()
    renderCard({ onOpenPlanBudgets })

    fireEvent.click(screen.getByRole("button", { name: "Ketuk untuk melihat penjelasan rumus skor kesehatan" }))
    fireEvent.click(screen.getByRole("button", { name: "Lihat anggaran" }))

    expect(onOpenPlanBudgets).toHaveBeenCalledWith("budget")
  })

  it("hides the budgets evidence link when no handler is provided", () => {
    renderCard()

    fireEvent.click(screen.getByRole("button", { name: "Ketuk untuk melihat penjelasan rumus skor kesehatan" }))

    expect(screen.queryByRole("button", { name: "Lihat anggaran" })).not.toBeInTheDocument()
  })
})
