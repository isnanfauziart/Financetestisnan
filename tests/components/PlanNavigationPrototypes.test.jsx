import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import PlanTab from "@/app/dashboard/PlanTab"

vi.mock("@/lib/useSharedData", () => ({
  useBudgets: () => ({ budgets: [], loading: false, error: null }),
  useGoals: () => ({ goals: [], loading: false, error: null }),
}))

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
    netWorthHistory: [],
    now: new Date("2026-06-15T00:00:00.000Z"),
    goalsRefreshTrigger: 0,
    eventsRefreshTrigger: 0,
    billsRefreshTrigger: 0,
    selectedMonth: "Jul",
    selectedYear: "2026",
    selectedAccount: "Semua Akun",
    filteredTransactions: [],
    expenseCategories: [],
    onToast: vi.fn(),
    onWhatIfOpen: vi.fn(),
    onDataChanged: vi.fn(),
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

// The Wave 7 scrollable rail was replaced by the Ringkasan hub: one flat
// pillar list, no horizontal scrolling, back button inside sections.
describe("Rencana hub (Ringkasan as dashboard)", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("renders every planning pillar in one flat hub with no scroll rail", () => {
    render(<PlanTab {...createProps()} />)

    expect(document.querySelector(".plan-chapter-nav")).not.toBeInTheDocument()
    expect(document.querySelector(".plan-chapter-nav__rail")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Target" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Anggaran" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Tagihan" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Utang & Piutang" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Event" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Simulasi" })).toBeInTheDocument()
    expect(screen.queryByText(/Geser untuk melihat semua bagian/)).not.toBeInTheDocument()
  })

  it("opens the section when its pillar is tapped and offers a back button", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(screen.getByRole("button", { name: "Buka Anggaran" }))

    expect(screen.getByText("Budgets section mock")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Buka Target" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Kembali ke Ringkasan Rencana" })).toBeInTheDocument()
  })

  it("returns to the hub through the back button", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(screen.getByRole("button", { name: "Buka Tagihan" }))
    expect(screen.getByText("Bills section mock")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Kembali ke Ringkasan Rencana" }))

    expect(screen.getByRole("button", { name: "Buka Tagihan" })).toBeInTheDocument()
    expect(screen.queryByText("Bills section mock")).not.toBeInTheDocument()
  })

  it("keeps entitlement gating in the hub", () => {
    // featureAvailability=false is the administratively-unavailable path that
    // removes Simulasi from the hub (legacy features=false only locks its content).
    render(<PlanTab {...createProps({
      entitlement: { featureAvailability: { financialIndependence: false, whatIf: false }, upgrade: "/upgrade" },
    })} />)

    expect(screen.getByRole("button", { name: "Buka Target" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Tagihan" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Utang & Piutang" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Event" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Buka Simulasi" })).not.toBeInTheDocument()
  })

  it("reports the tapped pillar through the unchanged section callback", () => {
    const onSectionChange = vi.fn()
    render(<PlanTab {...createProps({ onSectionChange })} />)

    fireEvent.click(screen.getByRole("button", { name: "Buka Utang & Piutang" }))

    expect(onSectionChange).toHaveBeenCalledWith("utang")
  })

  it("supports deep links into a section with a back button", () => {
    render(<PlanTab {...createProps({ activeSection: "tagihan", onSectionChange: vi.fn() })} />)

    expect(screen.getByText("Bills section mock")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Kembali ke Ringkasan Rencana" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Buka Target" })).not.toBeInTheDocument()
  })

  it("opens the month filter from the month chip", () => {
    const onOpenMonthFilter = vi.fn()
    render(<PlanTab {...createProps({ onOpenMonthFilter })} />)

    fireEvent.click(screen.getByRole("button", { name: "Ubah bulan di Statistik" }))

    expect(onOpenMonthFilter).toHaveBeenCalledTimes(1)
  })
})
