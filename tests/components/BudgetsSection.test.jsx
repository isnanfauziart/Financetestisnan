import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import BudgetsSection from "@/components/BudgetsSection"

const hookState = vi.hoisted(() => ({
  budgets: [],
  loading: false,
  error: null,
  refetch: vi.fn(),
}))

vi.mock("@/lib/useSharedData", () => ({
  useBudgets: vi.fn(() => hookState),
  useSettings: vi.fn(() => ({ settings: { categories: { expense: [] } } })),
}))

vi.mock("@/components/BudgetCard", () => ({ default: () => null }))
vi.mock("@/components/BudgetSetupModal", () => ({ default: () => null }))
vi.mock("@/components/BudgetDetailModal", () => ({ default: () => null }))

afterEach(() => cleanup())

describe("BudgetsSection education", () => {
  it("explains the monthly budget flow before showing the create CTA", () => {
    render(
      <BudgetsSection
        selectedMonth="Agu"
        selectedYear="2026"
        selectedAccount="Semua Akun"
        filteredTransactions={[]}
        expenseCategories={[]}
        onToast={vi.fn()}
      />,
    )

    expect(screen.getByRole("heading", { name: "Anggaran" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Tambah anggaran baru" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Jaga pengeluaran tetap terkendali" })).toBeInTheDocument()
    expect(screen.getByText("Pilih kategori")).toBeInTheDocument()
    expect(screen.getByText("Tentukan limit")).toBeInTheDocument()
    expect(screen.getByText("Catat seperti biasa")).toBeInTheDocument()
    expect(screen.getByText("Cek sisa anggaran")).toBeInTheDocument()
    expect(screen.getByText("Contoh")).toBeInTheDocument()
    expect(screen.getByText("Jajan / Transportasi")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buat Anggaran" })).toHaveClass("min-h-11", "min-w-11")
  })
})
