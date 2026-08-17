import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import BudgetsSection from "@/components/BudgetsSection"
import GoalsSection from "@/components/GoalsSection"
import BillsSection from "@/components/BillsSection"
import DebtsSection from "@/components/DebtsSection"
import EventBudgetsSection from "@/components/EventBudgetsSection"

const hookState = vi.hoisted(() => ({
  budgets: { budgets: [], loading: false, error: null, refetch: vi.fn() },
  goals: { goals: [], loading: false, error: null, refetch: vi.fn() },
  debts: { debts: [], loading: false, error: null, refetch: vi.fn() },
}))

vi.mock("@/lib/useSharedData", () => ({
  useBudgets: vi.fn(() => hookState.budgets),
  useGoals: vi.fn(() => hookState.goals),
  useDebts: vi.fn(() => hookState.debts),
  useSettings: vi.fn(() => ({ settings: { categories: { expense: [] } } })),
}))

vi.mock("@/components/BudgetCard", () => ({ default: () => null }))
vi.mock("@/components/GoalCard", () => ({ default: () => null }))
vi.mock("@/components/DebtCard", () => ({ default: () => null }))
vi.mock("@/components/BudgetSetupModal", () => ({ default: () => null }))
vi.mock("@/components/BudgetDetailModal", () => ({ default: () => null }))
vi.mock("@/components/GoalSetupModal", () => ({ default: () => null }))
vi.mock("@/components/GoalContributeModal", () => ({ default: () => null }))
vi.mock("@/components/GoalSettleModal", () => ({ default: () => null }))
vi.mock("@/components/DebtSetupModal", () => ({
  default: () => <div role="dialog" aria-label="Debt setup modal mock">Debt setup modal mock</div>,
}))
vi.mock("@/components/DebtPaymentModal", () => ({ default: () => null }))
vi.mock("@/components/BillSetupModal", () => ({ default: () => null }))
vi.mock("@/components/BillPayModal", () => ({ default: () => null }))
vi.mock("@/components/EventCard", () => ({ default: () => null }))
vi.mock("@/components/EventSetupModal", () => ({ default: () => null }))
vi.mock("@/components/EventDetailModal", () => ({ default: () => null }))
vi.mock("@/lib/categoryIcons", () => ({
  getBillVisual: () => ({ icon: () => null, tint: { bg: "#eee", color: "#333" } }),
}))

const budgetProps = {
  selectedMonth: "Jul",
  selectedYear: "2026",
  selectedAccount: "Semua Akun",
  filteredTransactions: [],
  expenseCategories: [],
}

describe("shared data section failures", () => {
  beforeEach(() => {
    hookState.budgets = { budgets: [], loading: false, error: "Budget API down", refetch: vi.fn() }
    hookState.goals = { goals: [], loading: false, error: "Goals API down", refetch: vi.fn() }
    hookState.debts = { debts: [], loading: false, error: "Debts API down", refetch: vi.fn() }
  })

  afterEach(() => vi.unstubAllGlobals())

  it("shows a budget error instead of the empty state and retries", () => {
    render(<BudgetsSection {...budgetProps} />)

    expect(screen.getByRole("alert")).toHaveTextContent("Budget API down")
    expect(screen.queryByText(/Belum ada budget/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /coba lagi/i }))
    expect(hookState.budgets.refetch).toHaveBeenCalledTimes(1)
  })

  it("shows a goals error instead of the empty state and retries", () => {
    render(<GoalsSection transactions={[]} />)

    expect(screen.getByRole("alert")).toHaveTextContent("Goals API down")
    expect(screen.queryByText(/Belum ada goals/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /coba lagi/i }))
    expect(hookState.goals.refetch).toHaveBeenCalledTimes(1)
  })

  it("shows a debts error instead of the empty state and retries", () => {
    render(<DebtsSection />)

    expect(screen.getByRole("alert")).toHaveTextContent("Debts API down")
    expect(screen.queryByText(/Lacak utang/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /coba lagi/i }))
    expect(hookState.debts.refetch).toHaveBeenCalledTimes(1)
  })

  it("educates first-time debt users and opens the existing setup modal", () => {
    hookState.debts = { debts: [], loading: false, error: null, refetch: vi.fn() }

    render(<DebtsSection />)

    expect(screen.getByRole("heading", { name: "Pantau utang dan piutang dengan jelas" })).toBeInTheDocument()
    expect(screen.getByText("Catat siapa yang terlibat, jumlahnya, dan kapan perlu diselesaikan.")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(4)
    expect(screen.getByText("Pilih jenisnya")).toBeInTheDocument()
    expect(screen.getByText("Isi detailnya")).toBeInTheDocument()
    expect(screen.getByText("Atur jatuh tempo")).toBeInTheDocument()
    expect(screen.getByText("Catat pembayaran atau penerimaan")).toBeInTheDocument()
    expect(screen.getByText("Cicilan keluarga / Pinjaman ke teman")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Tambah Utang/Piutang" }))

    expect(screen.getByRole("dialog", { name: "Debt setup modal mock" })).toBeInTheDocument()
  })

  it("shows a bills fetch error instead of the empty state and retries", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Bills API down"))
    vi.stubGlobal("fetch", fetchMock)

    render(<BillsSection />)

    expect(await screen.findByRole("alert")).toHaveTextContent("Bills API down")
    expect(screen.queryByText(/Belum ada tagihan/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /coba lagi/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it("shows an event fetch error instead of the empty state and retries", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Events API down"))
    vi.stubGlobal("fetch", fetchMock)

    render(<EventBudgetsSection filteredTransactions={[]} />)

    expect(await screen.findByRole("alert")).toHaveTextContent("Events API down")
    expect(screen.queryByText(/Belum ada event budget/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /coba lagi/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })
})
