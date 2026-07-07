import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import PlanTab from "@/app/dashboard/PlanTab"

vi.mock("next/dynamic", () => ({
  default: () => function DynamicMock() {
    return <div>FI tracker mock</div>
  },
}))

vi.mock("@/components/GoalsSection", () => ({ default: () => <div>Goals section mock</div> }))
vi.mock("@/components/DebtsSection", () => ({ default: () => <div>Debts section mock</div> }))
vi.mock("@/components/BudgetsSection", () => ({ default: () => <div>Budgets section mock</div> }))
vi.mock("@/components/BillsSection", () => ({ default: () => <div>Bills section mock</div> }))
vi.mock("@/components/EventBudgetsSection", () => ({ default: () => <div>Event budgets section mock</div> }))

function createProps(overrides = {}) {
  return {
    data: { netWorth: 0 },
    transactions: [],
    monthlyData: [],
    goalsRefreshTrigger: 0,
    eventsRefreshTrigger: 0,
    billsRefreshTrigger: 0,
    selectedMonth: "Jul",
    selectedYear: "2026",
    selectedAccount: "Semua Akun",
    filteredTransactions: [],
    expenseCategories: [],
    onToast: vi.fn(),
    onBillPay: vi.fn(),
    onWhatIfOpen: vi.fn(),
    ...overrides,
  }
}

describe("PlanTab planning ownership", () => {
  it("shows segmented planning navigation labels", () => {
    render(<PlanTab {...createProps()} />)

    expect(screen.getByRole("tab", { name: "Goal" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Budget" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Tagihan" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Simulasi" })).toBeInTheDocument()
  })

  it("keeps goals as the default owner section", () => {
    render(<PlanTab {...createProps()} />)

    expect(screen.getByText("Goals section mock")).toBeInTheDocument()
    expect(screen.queryByText("Budgets section mock")).not.toBeInTheDocument()
    expect(screen.queryByText("Bills section mock")).not.toBeInTheDocument()
  })

  it("moves budget ownership into the Budget section", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(screen.getByRole("tab", { name: "Budget" }))

    expect(screen.getByText("Budgets section mock")).toBeInTheDocument()
    expect(screen.queryByText("Goals section mock")).not.toBeInTheDocument()
  })

  it("moves bill management into the Tagihan section", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(screen.getByRole("tab", { name: "Tagihan" }))

    expect(screen.getByText("Bills section mock")).toBeInTheDocument()
    expect(screen.queryByText("Goals section mock")).not.toBeInTheDocument()
  })

  it("supports deep-linking directly into a plan section from shared routing state", () => {
    render(<PlanTab {...createProps({ activeSection: "tagihan", onSectionChange: vi.fn() })} />)

    expect(screen.getByText("Bills section mock")).toBeInTheDocument()
    expect(screen.queryByText("Goals section mock")).not.toBeInTheDocument()
  })

  it("keeps future-oriented tools under Simulasi", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(screen.getByRole("tab", { name: "Simulasi" }))

    expect(screen.getByRole("button", { name: "Open What-If Scenario simulator" })).toBeInTheDocument()
    expect(screen.getByText("FI tracker mock")).toBeInTheDocument()
    expect(screen.getByText("Debts section mock")).toBeInTheDocument()
    expect(screen.getByText("Event budgets section mock")).toBeInTheDocument()
  })
})
