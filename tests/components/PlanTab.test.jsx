import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
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

function getPlanNav() {
  return within(screen.getByRole("navigation", { name: "Navigasi Rencana" }))
}

describe("PlanTab planning ownership", () => {
  it("shows segmented planning navigation labels", () => {
    render(<PlanTab {...createProps()} />)

    expect(getPlanNav().getByRole("button", { name: "Target" })).toBeInTheDocument()
    expect(getPlanNav().getByRole("button", { name: "Anggaran" })).toBeInTheDocument()
    expect(getPlanNav().getByRole("button", { name: /tagihan/i })).toBeInTheDocument()
    expect(getPlanNav().getByRole("button", { name: /utang/i })).toBeInTheDocument()
    expect(getPlanNav().getByRole("button", { name: /event/i })).toBeInTheDocument()
    expect(getPlanNav().getByRole("button", { name: /simulasi/i })).toBeInTheDocument()
  })

  it("keeps planning navigation controls at a 44px minimum height", () => {
    render(<PlanTab {...createProps()} />)

    getPlanNav().getAllByRole("button").forEach((button) => {
      expect(button).toHaveClass("min-h-11")
    })
  })

  it("opens on the Rencana Bulan Ini overview", () => {
    render(<PlanTab {...createProps()} />)

    expect(screen.getByRole("heading", { name: "Rencana bulan ini" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Target" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Anggaran" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Tagihan" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Kalau kebiasaanmu berubah, hasilnya bagaimana?" })).toBeInTheDocument()
    expect(screen.getByText(/lihat efeknya pada target/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Coba What-If" })).toBeInTheDocument()
    expect(screen.queryByText("Goals section mock")).not.toBeInTheDocument()
    expect(screen.queryByText("Budgets section mock")).not.toBeInTheDocument()
    expect(screen.queryByText("Bills section mock")).not.toBeInTheDocument()
  })

  it("opens the existing Simulasi section from the overview CTA", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(screen.getByRole("button", { name: "Coba What-If" }))

    expect(screen.getByRole("button", { name: "Open What-If Scenario simulator" })).toBeInTheDocument()
    expect(screen.getByText("FI tracker mock")).toBeInTheDocument()
  })

  it("shows a familiar icon beside every planning section label", () => {
    render(<PlanTab {...createProps()} />)

    getPlanNav().getAllByRole("button").forEach((button) => {
      expect(button.querySelector("svg")).toBeInTheDocument()
    })
  })

  it("keeps goals available as a deep-linked owner section", () => {
    render(<PlanTab {...createProps({ activeSection: "goal" })} />)

    expect(screen.getByText("Goals section mock")).toBeInTheDocument()
  })

  it("moves budget ownership into the Budget section", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(getPlanNav().getByRole("button", { name: "Anggaran" }))

    expect(screen.getByText("Budgets section mock")).toBeInTheDocument()
    expect(screen.queryByText("Goals section mock")).not.toBeInTheDocument()
  })

  it("moves bill management into the Tagihan section", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(getPlanNav().getByRole("button", { name: /tagihan/i }))

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

    fireEvent.click(getPlanNav().getByRole("button", { name: /utang/i }))
    expect(screen.getByText("Debts section mock")).toBeInTheDocument()
    expect(screen.queryByText("Event budgets section mock")).not.toBeInTheDocument()

    fireEvent.click(getPlanNav().getByRole("button", { name: /event/i }))
    expect(screen.getByText("Event budgets section mock")).toBeInTheDocument()
    expect(screen.queryByText("Debts section mock")).not.toBeInTheDocument()
  })

  it("keeps only future-oriented tools under Simulasi", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(getPlanNav().getByRole("button", { name: /simulasi/i }))

    expect(screen.getByRole("button", { name: "Open What-If Scenario simulator" })).toBeInTheDocument()
    expect(screen.getByText("FI tracker mock")).toBeInTheDocument()
    expect(screen.queryByText("Debts section mock")).not.toBeInTheDocument()
    expect(screen.queryByText("Event budgets section mock")).not.toBeInTheDocument()
  })

  it("marks the current section with aria-current", () => {
    render(<PlanTab {...createProps({ activeSection: "simulasi", onSectionChange: vi.fn() })} />)

    expect(getPlanNav().getByRole("button", { name: /simulasi/i })).toHaveAttribute("aria-current", "page")
    expect(getPlanNav().getByRole("button", { name: "Target" })).not.toHaveAttribute("aria-current")
  })
})
