import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import StatsTab from "@/app/dashboard/StatsTab"

vi.mock("@/components/BudgetsSection", () => ({ default: () => <div>Budgets mock</div> }))
vi.mock("@/components/EventBudgetsSection", () => ({ default: () => <div>Event budgets mock</div> }))
vi.mock("@/components/MonthlyReportButton", () => ({ default: () => <button type="button">Monthly report</button> }))
vi.mock("@/components/YearInReviewButton", () => ({ default: () => <button type="button">Year in review</button> }))
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
    clientMonthlyData: [],
    top5Categories: [],
    trendData: [],
    compareMode: true,
    compareMonthA: "Jul",
    compareYearA: "2026",
    compareMonthB: "Jun",
    compareYearB: "2026",
    compareLabelA: "Jul 2026",
    compareLabelB: "Jun 2026",
    compareDataA: { income: 0, expense: 0, savings: 0, surplus: 0, categories: [] },
    compareDataB: { income: 0, expense: 0, savings: 0, surplus: 0, categories: [] },
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
    allTransactions: [],
    eventsRefreshTrigger: 0,
    onCategoryClick: vi.fn(),
    ...overrides,
  }
}

describe("StatsTab comparison controls", () => {
  it("shows the default comparison helper copy and reset action", () => {
    render(<StatsTab {...createProps()} />)

    fireEvent.click(screen.getByRole("tab", { name: "Tren" }))

    expect(screen.getByText("Default: bulan ini vs bulan lalu")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reset ke bulan ini" })).toBeInTheDocument()
  })

  it("uses clearer comparison labels", () => {
    render(<StatsTab {...createProps()} />)

    fireEvent.click(screen.getByRole("tab", { name: "Tren" }))

    expect(screen.getByText("Periode utama")).toBeInTheDocument()
    expect(screen.getByText("Bandingkan dengan")).toBeInTheDocument()
  })

  it("calls reset handler when reset button is pressed", () => {
    const resetComparePeriods = vi.fn()
    render(<StatsTab {...createProps({ resetComparePeriods })} />)

    fireEvent.click(screen.getByRole("tab", { name: "Tren" }))

    fireEvent.click(screen.getByRole("button", { name: "Reset ke bulan ini" }))

    expect(resetComparePeriods).toHaveBeenCalledTimes(1)
  })
})

describe("StatsTab segmented statistik navigation", () => {
  it("shows the segmented navigation labels for statistik sections", () => {
    render(<StatsTab {...createProps()} />)

    expect(screen.getByRole("tab", { name: "Ringkasan" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Kategori" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Tren" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Recap" })).toBeInTheDocument()
  })

  it("moves report actions into the Recap section", () => {
    render(<StatsTab {...createProps()} />)

    expect(screen.queryByText("Monthly report")).not.toBeInTheDocument()
    expect(screen.queryByText("Year in review")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Recap" }))

    expect(screen.getByText("Monthly report")).toBeInTheDocument()
    expect(screen.getByText("Year in review")).toBeInTheDocument()
  })

  it("shows recap content only after the Recap segment is selected", () => {
    render(<StatsTab {...createProps()} />)

    expect(screen.queryByText("Recap Bulanan")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Recap" }))

    expect(screen.getByText("Recap Bulanan")).toBeInTheDocument()
  })

  it("does not render event budgeting ownership inside Statistik", () => {
    render(<StatsTab {...createProps()} />)

    expect(screen.queryByText("Event budgets mock")).not.toBeInTheDocument()
  })
})
