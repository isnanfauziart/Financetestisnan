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
vi.mock("@/components/BillsSection", () => ({
  default: ({ onBillsChanged }) => (
    <button type="button" onClick={onBillsChanged}>Bills section mock</button>
  ),
}))
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
    entitlement: {
      features: {
        financialIndependence: true,
        whatIf: true,
      },
      upgrade: "/upgrade",
    },
    ...overrides,
  }
}

describe("PlanTab planning ownership", () => {
  it("shows segmented planning navigation labels", () => {
    render(<PlanTab {...createProps()} />)

    expect(screen.getByRole("button", { name: "Tabungan" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /budget/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /tagihan/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /utang/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /event/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /simulasi/i })).toBeInTheDocument()
  })

  it("keeps goals as the default owner section", () => {
    render(<PlanTab {...createProps()} />)

    expect(screen.getByText("Goals section mock")).toBeInTheDocument()
    expect(screen.queryByText("Budgets section mock")).not.toBeInTheDocument()
    expect(screen.queryByText("Bills section mock")).not.toBeInTheDocument()
  })

  it("moves budget ownership into the Budget section", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(screen.getByRole("button", { name: /budget/i }))

    expect(screen.getByText("Budgets section mock")).toBeInTheDocument()
    expect(screen.queryByText("Goals section mock")).not.toBeInTheDocument()
  })

  it("moves bill management into the Tagihan section", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(screen.getByRole("button", { name: /tagihan/i }))

    expect(screen.getByText("Bills section mock")).toBeInTheDocument()
    expect(screen.queryByText("Goals section mock")).not.toBeInTheDocument()
  })

  it("forwards the bill-change callback to the Tagihan section", () => {
    const onBillsChanged = vi.fn()
    render(<PlanTab {...createProps({ activeSection: "tagihan", onBillsChanged })} />)

    fireEvent.click(screen.getByRole("button", { name: "Bills section mock" }))

    expect(onBillsChanged).toHaveBeenCalledTimes(1)
  })

  it("supports deep-linking directly into a plan section from shared routing state", () => {
    render(<PlanTab {...createProps({ activeSection: "tagihan", onSectionChange: vi.fn() })} />)

    expect(screen.getByText("Bills section mock")).toBeInTheDocument()
    expect(screen.queryByText("Goals section mock")).not.toBeInTheDocument()
  })

  it("gives debts and events dedicated owner sections", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(screen.getByRole("button", { name: /utang/i }))
    expect(screen.getByText("Debts section mock")).toBeInTheDocument()
    expect(screen.queryByText("Event budgets section mock")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /event/i }))
    expect(screen.getByText("Event budgets section mock")).toBeInTheDocument()
    expect(screen.queryByText("Debts section mock")).not.toBeInTheDocument()
  })

  it("keeps only future-oriented tools under Simulasi", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(screen.getByRole("button", { name: /simulasi/i }))

    expect(screen.getByRole("button", { name: "Open What-If Scenario simulator" })).toBeInTheDocument()
    expect(screen.getByText("FI tracker mock")).toBeInTheDocument()
    expect(screen.queryByText("Debts section mock")).not.toBeInTheDocument()
    expect(screen.queryByText("Event budgets section mock")).not.toBeInTheDocument()
  })

  it("marks the current section with aria-current", () => {
    render(<PlanTab {...createProps({ activeSection: "simulasi", onSectionChange: vi.fn() })} />)

    expect(screen.getByRole("button", { name: /simulasi/i })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("button", { name: "Tabungan" })).not.toHaveAttribute("aria-current")
  })
})
