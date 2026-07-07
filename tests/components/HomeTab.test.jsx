import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import HomeTab from "@/app/dashboard/HomeTab"

vi.mock("@/components/HealthScoreCard", () => ({
  default: () => <div data-testid="health-score-card">Health score mock</div>,
}))

vi.mock("@/components/BudgetStatusCard", () => ({
  default: () => <div data-testid="budget-status-card">Budget status mock</div>,
}))

vi.mock("@/lib/useSharedData", () => ({
  useBudgets: vi.fn(),
  useBills: vi.fn(),
}))

const { useBudgets, useBills } = await import("@/lib/useSharedData")

function createProps(overrides = {}) {
  return {
    data: {
      netWorth: 12500000,
      totalIncome: 9000000,
      totalExpense: 4200000,
      totalSavings: 1700000,
      netWorthMonthlyDelta: 350000,
      transactions: [],
    },
    session: { user: { name: "Ayu" } },
    statIncome: 9000000,
    statExpense: 4200000,
    statSavings: 1700000,
    topCategory: { name: "Makanan" },
    topCategoryPct: 36,
    recent5: [
      { type: "expense", category: "Makanan", desc: "Makan siang", date: "7 Jul 2026", amount: 45000 },
    ],
    setActiveNav: vi.fn(),
    openPlanSection: vi.fn(),
    openQuickAdd: vi.fn(),
    setDrillDown: vi.fn(),
    onToast: vi.fn(),
    selectedMonth: "Jul",
    selectedYear: "2026",
    monthlyData: [],
    filteredTransactions: [
      { type: "expense", category: "Makanan", amount: 450000, month: "Jul", year: "2026", account: "BCA" },
    ],
    allTransactions: [
      { type: "expense", category: "Makanan", amount: 950000, month: "Jul", year: "2026", account: "BCA" },
    ],
    onCategoryClick: vi.fn(),
    insights: [],
    ...overrides,
  }
}

describe("HomeTab priority actions", () => {
  beforeEach(() => {
    useBudgets.mockReturnValue({
      budgets: [
        { kategori: "Makanan", limit: 1000000, bulan: "Jul", tahun: "2026", akun: "" },
      ],
    })
    useBills.mockReturnValue({
      bills: [
        {
          id: "bill-1",
          nama: "Internet WiFi",
          status: "due_today",
          daysUntilDue: 0,
          tanggalJatuhTempo: "7 Jul 2026",
          jumlah: 350000,
        },
      ],
    })
  })

  it("keeps Fokus Hari Ini in the hero and adds compact urgent actions before summary cards", () => {
    render(<HomeTab {...createProps()} />)

    expect(screen.getByText("Fokus Hari Ini")).toBeInTheDocument()

    const priorityHeading = screen.getByText("Aksi Prioritas")
    const billAction = screen.getByRole("button", { name: /bayar tagihan internet wifi/i })
    const budgetAction = screen.getByRole("button", { name: /cek budget makanan/i })
    const incomeSummary = screen.getByLabelText("Lihat 10 transaksi pemasukan terbesar")

    expect(priorityHeading).toBeInTheDocument()
    expect(billAction).toBeInTheDocument()
    expect(budgetAction).toBeInTheDocument()
    expect(priorityHeading.compareDocumentPosition(incomeSummary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("routes urgent budget and bill actions into the correct plan sections", () => {
    const setActiveNav = vi.fn()
    const openPlanSection = vi.fn()
    render(<HomeTab {...createProps({ setActiveNav, openPlanSection })} />)

    fireEvent.click(screen.getByRole("button", { name: /bayar tagihan internet wifi/i }))
    fireEvent.click(screen.getByRole("button", { name: /cek budget makanan/i }))

    expect(setActiveNav).toHaveBeenNthCalledWith(1, "plan")
    expect(openPlanSection).toHaveBeenNthCalledWith(1, "tagihan")
    expect(setActiveNav).toHaveBeenNthCalledWith(2, "plan")
    expect(openPlanSection).toHaveBeenNthCalledWith(2, "budget")
  })
})
