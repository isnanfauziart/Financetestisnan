import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
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

function getPlanNav() {
  return within(screen.getByRole("navigation", { name: "Navigasi Rencana" }))
}

describe("Rencana scrollable labelled rail (Wave 7 decision)", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("renders every section in one scrollable labelled rail", () => {
    render(<PlanTab {...createProps()} />)

    const rail = document.querySelector(".plan-chapter-nav__rail--scroll")
    expect(rail).toBeTruthy()
    expect(document.querySelector('[data-plan-nav-prototype="scroll"]')).toBeTruthy()
    expect(getPlanNav().getByRole("button", { name: "Ringkasan" })).toBeInTheDocument()
    expect(getPlanNav().getByRole("button", { name: "Tagihan" })).toBeInTheDocument()
    expect(getPlanNav().getByRole("button", { name: "Utang" })).toBeInTheDocument()
    expect(getPlanNav().getByRole("button", { name: "Event" })).toBeInTheDocument()
    expect(getPlanNav().getByRole("button", { name: "Simulasi" })).toBeInTheDocument()
  })

  it("keeps panels connected to their navigation controls", () => {
    render(<PlanTab {...createProps()} />)

    const anggaran = getPlanNav().getByRole("button", { name: "Anggaran" })
    expect(anggaran).toHaveAttribute("aria-controls", "plan-section-panel")
    expect(document.getElementById("plan-section-panel")).toBeTruthy()

    fireEvent.click(anggaran)

    expect(screen.getByText("Budgets section mock")).toBeInTheDocument()
  })

  it("keeps entitlement gating in the rail", () => {
    // featureAvailability=false is the administratively-unavailable path that
    // removes Simulasi from the rail (legacy features=false only locks its content).
    render(<PlanTab {...createProps({
      entitlement: { featureAvailability: { financialIndependence: false, whatIf: false }, upgrade: "/upgrade" },
    })} />)

    expect(getPlanNav().getByRole("button", { name: "Tagihan" })).toBeInTheDocument()
    expect(getPlanNav().getByRole("button", { name: "Utang" })).toBeInTheDocument()
    expect(getPlanNav().getByRole("button", { name: "Event" })).toBeInTheDocument()
    expect(getPlanNav().queryByRole("button", { name: "Simulasi" })).not.toBeInTheDocument()
  })

  it("reports the active section through the unchanged section callback", () => {
    const onSectionChange = vi.fn()
    render(<PlanTab {...createProps({ onSectionChange })} />)

    fireEvent.click(getPlanNav().getByRole("button", { name: "Utang" }))

    expect(onSectionChange).toHaveBeenCalledWith("utang")
  })

  it("marks the active section with aria-current and supports deep links", () => {
    render(<PlanTab {...createProps({ activeSection: "tagihan", onSectionChange: vi.fn() })} />)

    expect(getPlanNav().getByRole("button", { name: "Tagihan" })).toHaveAttribute("aria-current", "page")
    expect(getPlanNav().getByRole("button", { name: "Target" })).not.toHaveAttribute("aria-current")
    expect(screen.getByText("Bills section mock")).toBeInTheDocument()
  })

  it("ships no prototype toggle or per-device choice", () => {
    render(<PlanTab {...createProps()} />)

    expect(screen.queryByText(/Prototipe navigasi Rencana/)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Coba / })).not.toBeInTheDocument()
  })

  it("does not read or write the prototype choice from storage", () => {
    window.localStorage.setItem("artami:planNavPrototype", "lainnya")

    render(<PlanTab {...createProps()} />)

    // The decision is final: the scroll rail renders regardless of stale storage.
    expect(document.querySelector('[data-plan-nav-prototype="scroll"]')).toBeTruthy()
    expect(screen.queryByText(/Lainnya/)).not.toBeInTheDocument()
  })
})
