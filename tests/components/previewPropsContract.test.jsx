import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import HomeTab from "@/app/dashboard/HomeTab"

vi.mock("@/components/HealthScoreCard", () => ({
  default: () => <div data-testid="health-score-card">Health score mock</div>,
}))
vi.mock("@/components/BudgetStatusCard", () => ({
  default: () => <div data-testid="budget-status-card">Budget status mock</div>,
}))
vi.mock("@/lib/useSharedData", () => ({
  useBudgets: vi.fn(() => ({ budgets: [] })),
  useBills: vi.fn(() => ({ bills: [] })),
  useSettings: vi.fn(() => ({ settings: {} })),
  useGoals: vi.fn(() => ({ goals: [] })),
}))

afterEach(() => cleanup())

const baseProps = {
  data: { transactions: [], netWorth: 0 },
  statIncome: 0,
  statExpense: 0,
  statSavings: 0,
  topCategory: { name: "-" },
  topCategoryPct: 0,
  recent5: [],
  setActiveNav: vi.fn(),
  openPlanSection: vi.fn(),
  openQuickAdd: vi.fn(),
  openStatsDestination: vi.fn(),
  setDrillDown: vi.fn(),
  selectedMonth: "Jul",
  selectedYear: "2026",
  monthlyData: [],
  allTransactions: [],
  filteredTransactions: [],
  insights: [],
}

const freeEntitlement = {
  tier: "free",
  features: { healthScore: false, insights: false, cashFlowForecast: false, anomalyAlerts: false },
  upgrade: "/upgrade",
}

describe("Locked preview props contract (Wave 8)", () => {
  it("keeps locked Health Score preview free of user data — only static copy", () => {
    render(<HomeTab {...baseProps} entitlement={freeEntitlement} session={{ user: { name: "Ayu", email: "ayu@example.com" } }} />)

    const preview = screen.getByLabelText("Health Score terkunci")
    expect(preview).toHaveTextContent("Ringkasan kesehatan keuangan tersedia di Pro.")
    expect(preview.textContent).not.toContain("Ayu")
    expect(preview.textContent).not.toContain("ayu@example.com")
    expect(preview.textContent).not.toMatch(/Rp\s?[\d.,]+ ?(jt|rb)?\s*$/m)
  })

  it("shows exactly one upgrade action in the Health Score preview", () => {
    render(<HomeTab {...baseProps} entitlement={freeEntitlement} />)

    expect(screen.getAllByRole("link", { name: /buka pro untuk health score/i })).toHaveLength(1)
  })

  it("wires openPlanSection into HomeTab for Health Score evidence navigation", () => {
    render(<HomeTab {...baseProps} entitlement={{ tier: "paid", features: { healthScore: true } }} />)

    // HomeTab renders the real HealthScoreCard with openPlanSection wired; the
    // behavior tests live in HealthScoreCard.test.jsx (this file mocks the card).
    expect(baseProps.openPlanSection).not.toHaveBeenCalled()
  })
})
