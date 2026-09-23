import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import StatsTab from "@/app/dashboard/StatsTab"

beforeEach(() => {
  global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback
    }
    observe() {
      this.callback([{ contentRect: { width: 640, height: 280 } }])
    }
    unobserve() {}
    disconnect() {}
  }
})

vi.mock("@/components/BudgetsSection", () => ({ default: () => <div>Budgets mock</div> }))
vi.mock("@/components/EventBudgetsSection", () => ({ default: () => <div>Event budgets mock</div> }))
vi.mock("@/components/MonthlyReportButton", () => ({ default: () => <button type="button">Monthly report</button> }))
vi.mock("@/components/YearInReviewButton", () => ({ default: () => <button type="button">Year in review</button> }))
vi.mock("@/app/dashboard/_components/RecapSection", () => ({ default: () => <div>Laporan Bulanan</div> }))
vi.mock("@/components/CashFlowForecast", () => ({ default: () => <div>Forecast mock</div> }))
vi.mock("@/components/SavingsRateTrend", () => ({ default: () => <div>Savings trend mock</div> }))
vi.mock("@/components/AnomalyAlerts", () => ({ default: () => <div>Anomaly mock</div> }))

function createProps(overrides = {}) {
  return {
    data: { transactions: [] },
    filteredTransactions: [],
    statIncome: 0,
    statExpense: 0,
    statSavings: 0,
    statSurplus: 0,
    expenseCategories: [],
    incomeCategories: [],
    availableYears: ["2026"],
    compareYearOptions: ["2026", "2025"],
    availableAccounts: [],
    selectedMonth: "Jul",
    selectedYear: "2026",
    selectedAccount: "Semua Akun",
    categoryFilter: null,
    dateFrom: "",
    dateTo: "",
    setSelectedMonth: vi.fn(),
    setSelectedYear: vi.fn(),
    setSelectedAccount: vi.fn(),
    setCategoryFilter: vi.fn(),
    setDateFrom: vi.fn(),
    setDateTo: vi.fn(),
    compareMode: false,
    compareMonthA: "Jul",
    compareYearA: "2026",
    compareMonthB: "Jun",
    compareYearB: "2026",
    compareLabelA: "Jul 2026",
    compareLabelB: "Jun 2026",
    compareDataA: [],
    compareDataB: [],
    compareChartData: [],
    setCompareMode: vi.fn(),
    setCompareMonthA: vi.fn(),
    setCompareYearA: vi.fn(),
    setCompareMonthB: vi.fn(),
    setCompareYearB: vi.fn(),
    resetComparePeriods: vi.fn(),
    calMonth: "Jul",
    calYear: 2026,
    calMonthIdx: 6,
    calWeeks: [],
    calendarDayTotals: {},
    navigateCalendar: vi.fn(),
    handleDayClick: vi.fn(),
    insights: [],
    isAllMonths: false,
    refreshing: false,
    onToast: vi.fn(),
    onEditTx: vi.fn(),
    onDeleteTx: vi.fn(),
    haptics: { tap: vi.fn() },
    hapticsEnabled: false,
    monthlyData: [],
    routineMonthlyData: [],
    allTransactions: [],
    now: 0,
    bills: [],
    billsLoading: false,
    billsError: null,
    refetchBills: vi.fn(),
    onCategoryClick: vi.fn(),
    clientMonthlyData: [],
    routineClientMonthlyData: [],
    cashFlowMonthlyData: [],
    routineCashFlowMonthlyData: [],
    top5Categories: [],
    trendData: [],
    routineExpenseCategories: [],
    routineTop5Categories: [],
    routineTrendData: [],
    routineCompareDataA: [],
    routineCompareDataB: [],
    routineCompareChartData: [],
    userName: "Tester",
    entitlement: { tier: "pro", features: {} },
    ...overrides,
  }
}

describe("StatsTab controlled section (Wave 5)", () => {
  afterEach(() => cleanup())

  it("renders the controlled section and reports user section changes upward", () => {
    const onSectionChange = vi.fn()
    render(<StatsTab {...createProps({ controlledSection: "tren", onSectionChange })} />)

    const tabs = screen.getAllByTestId("stats-section-tab")
    const trenTab = tabs.find((tab) => tab.textContent.includes("Tren"))
    const kategoriTab = tabs.find((tab) => tab.textContent.includes("Kategori"))
    expect(trenTab).toHaveAttribute("aria-selected", "true")
    expect(kategoriTab).toHaveAttribute("aria-selected", "false")

    fireEvent.click(kategoriTab)
    expect(onSectionChange).toHaveBeenCalledWith("kategori")
  })

  it("falls back to internal state when the controlled props are absent", () => {
    render(<StatsTab {...createProps()} />)
    const tabs = screen.getAllByTestId("stats-section-tab")
    const kategoriTab = tabs.find((tab) => tab.textContent.includes("Kategori"))
    fireEvent.click(kategoriTab)
    expect(kategoriTab).toHaveAttribute("aria-selected", "true")
  })

  it("reflects the controlled analysis mode and reports mode changes", () => {
    const onAnalysisModeChange = vi.fn()
    render(<StatsTab {...createProps({ controlledAnalysisMode: "actual", onAnalysisModeChange })} />)

    // SelectField is a custom listbox: open it, then pick an option.
    fireEvent.click(screen.getByRole("button", { name: "Tampilan" }))
    fireEvent.click(screen.getByRole("option", { name: "Rutin" }))
    expect(onAnalysisModeChange).toHaveBeenCalledWith("routine")
  })
})
