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

vi.mock("@/components/BudgetCard", () => ({
  default: ({ budget, spent, onClick, onDelete }) => (
    <div>
      <button type="button" data-testid={`budget-${budget.bulan}-${budget.tahun}`} onClick={onClick}>
        {budget.kategori} {spent}
      </button>
      <button type="button" aria-label={`Hapus budget ${budget.kategori}`} onClick={() => onDelete?.()}>
        hapus
      </button>
    </div>
  ),
}))
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
    expect(screen.getByRole("button", { name: "Salin anggaran historis" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Jaga pengeluaran tetap terkendali" })).toBeInTheDocument()
    expect(screen.getByText("Pilih kategori")).toBeInTheDocument()
    expect(screen.getByText("Tentukan limit")).toBeInTheDocument()
    expect(screen.getByText("Catat seperti biasa")).toBeInTheDocument()
    expect(screen.getByText("Cek sisa anggaran")).toBeInTheDocument()
    expect(screen.getByText("Contoh")).toBeInTheDocument()
    expect(screen.getByText("Jajan / Transportasi")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buat Anggaran" })).toHaveClass("min-h-11", "min-w-11")
  })

  it("keeps spending attached to each budget month when all months are selected", () => {
    hookState.budgets = [
      { kategori: "Jajan", bulan: "Jul", tahun: "2026", limit: 1000000, akun: "" },
      { kategori: "Jajan", bulan: "Agu", tahun: "2026", limit: 1000000, akun: "" },
    ]

    render(
      <BudgetsSection
        selectedMonth="Semua Bulan"
        selectedYear="Semua Tahun"
        selectedAccount="Semua Akun"
        filteredTransactions={[
          { type: "expense", category: "Jajan", account: "Bank BCA", amount: 100000, month: "Jul", year: "2026" },
          { type: "expense", category: "Jajan", account: "Bank BCA", amount: 250000, month: "Agu", year: "2026" },
        ]}
        expenseCategories={[]}
        onToast={vi.fn()}
      />,
    )

    expect(screen.getByTestId("budget-Jul-2026")).toHaveTextContent("Jajan 100000")
    expect(screen.getByTestId("budget-Agu-2026")).toHaveTextContent("Jajan 250000")
  })
})

describe("BudgetsSection delete confirmation", () => {
  it("confirms deletion through ConfirmSheet instead of the native confirm dialog", async () => {
    const { fireEvent, waitFor } = await import("@testing-library/react")
    const confirmSpy = vi.spyOn(window, "confirm")
    const fetchSpy = vi.spyOn(window, "fetch").mockResolvedValue({ ok: true, json: async () => ({}) })
    hookState.budgets = [{ kategori: "Jajan", bulan: "Agu", tahun: "2026", akun: "", limit: 1000000 }]
    hookState.refetch = vi.fn()

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

    fireEvent.click(screen.getByRole("button", { name: "Hapus budget Jajan" }))
    // No native confirm() — the shared ConfirmSheet appears instead.
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(screen.getByText("Hapus anggaran?")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Hapus", exact: true }))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      "/api/budgets",
      expect.objectContaining({ method: "DELETE" }),
    ))

    confirmSpy.mockRestore()
    fetchSpy.mockRestore()
    hookState.budgets = []
  })
})
