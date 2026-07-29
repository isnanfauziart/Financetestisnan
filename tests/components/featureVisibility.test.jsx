import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import HomeTab from "@/app/dashboard/HomeTab"
import StatsTab from "@/app/dashboard/StatsTab"
import PlanTab from "@/app/dashboard/PlanTab"

vi.mock("@/components/HealthScoreCard", () => ({
  default: () => <div>Live Health Score</div>,
}))
vi.mock("@/components/BudgetStatusCard", () => ({
  default: () => <div>Budget status</div>,
}))
vi.mock("@/components/CashFlowForecast", () => ({
  default: () => <div>Live Cash Flow Forecast</div>,
}))
vi.mock("@/components/AnomalyAlerts", () => ({
  default: () => <div>Live Anomaly Alerts</div>,
}))
vi.mock("@/components/SavingsRateTrend", () => ({
  default: () => <div>Savings trend</div>,
}))
vi.mock("@/components/MonthlyReportButton", () => ({
  default: () => <div>Monthly report</div>,
}))
vi.mock("@/components/YearInReviewButton", () => ({
  default: () => <div>Live Year-in-Review</div>,
}))
vi.mock("@/components/FITrackerCard", () => ({
  default: () => <div>Live Financial Independence</div>,
}))
vi.mock("@/components/GoalsSection", () => ({ default: () => <div>Goals</div> }))
vi.mock("@/components/BudgetsSection", () => ({ default: () => <div>Budgets</div> }))
vi.mock("@/components/BillsSection", () => ({ default: () => <div>Bills</div> }))
vi.mock("@/components/DebtsSection", () => ({ default: () => <div>Debts</div> }))
vi.mock("@/components/EventBudgetsSection", () => ({ default: () => <div>Events</div> }))
vi.mock("@/lib/useSharedData", () => ({
  useBudgets: () => ({ budgets: [] }),
  useBills: () => ({ bills: [] }),
}))

const freeEntitlement = {
  tier: "free",
  upgrade: "/upgrade",
  monthlyPdfWatermark: true,
  features: {
    healthScore: false,
    cashFlowForecast: false,
    anomalyAlerts: false,
    financialIndependence: false,
    whatIf: false,
    yearInReview: false,
  },
}

const proEntitlement = {
  tier: "paid",
  upgrade: "/upgrade",
  monthlyPdfWatermark: false,
  features: Object.fromEntries(
    ["healthScore", "cashFlowForecast", "anomalyAlerts", "financialIndependence", "whatIf", "yearInReview"]
      .map(feature => [feature, true])
  ),
}

function homeProps(entitlement) {
  return {
    data: { transactions: [] },
    statIncome: 0,
    statExpense: 0,
    statSavings: 0,
    topCategory: { name: "-" },
    topCategoryPct: 0,
    recent5: [],
    setActiveNav: vi.fn(),
    openPlanSection: vi.fn(),
    openQuickAdd: vi.fn(),
    setDrillDown: vi.fn(),
    selectedMonth: "Jul",
    selectedYear: "2026",
    monthlyData: [],
    allTransactions: [],
    insights: [],
    entitlement,
  }
}

function statsProps(entitlement) {
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
    compareDataA: { income: 0, expense: 0, savings: 0, surplus: 0, categories: [] },
    compareDataB: { income: 0, expense: 0, savings: 0, surplus: 0, categories: [] },
    compareChartData: [],
    compareLabelA: "Jul 2026",
    compareLabelB: "Jun 2026",
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
    onCategoryClick: vi.fn(),
    entitlement,
  }
}

function planProps(entitlement) {
  return {
    data: { netWorth: 0 },
    transactions: [],
    monthlyData: [],
    selectedMonth: "Jul",
    selectedYear: "2026",
    selectedAccount: "Semua Akun",
    filteredTransactions: [],
    expenseCategories: [],
    onToast: vi.fn(),
    onWhatIfOpen: vi.fn(),
    entitlement,
  }
}

describe("paid feature visibility", () => {
  it("shows a static Health Score preview instead of the live card for Free", () => {
    render(<HomeTab {...homeProps(freeEntitlement)} />)

    expect(screen.queryByText("Live Health Score")).not.toBeInTheDocument()
    expect(screen.getByText("Health Score")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /buka pro untuk health score/i })).toHaveAttribute("href", "/upgrade")
  })

  it("does not mount live Stats features for Free", () => {
    render(<StatsTab {...statsProps(freeEntitlement)} />)

    expect(screen.queryByText("Live Anomaly Alerts")).not.toBeInTheDocument()
    expect(screen.getByText("Anomaly Alerts")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Tren" }))
    expect(screen.queryByText("Live Cash Flow Forecast")).not.toBeInTheDocument()
    expect(screen.getByText("Cash Flow Forecast")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Recap" }))
    expect(screen.queryByText("Live Year-in-Review")).not.toBeInTheDocument()
    expect(screen.getByText("Year-in-Review")).toBeInTheDocument()
  })

  it("does not mount FI or expose the What-If action for Free", () => {
    render(<PlanTab {...planProps(freeEntitlement)} />)

    fireEvent.click(screen.getByRole("button", { name: "Simulasi" }))
    expect(screen.queryByText("Live Financial Independence")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Open What-If Scenario simulator" })).not.toBeInTheDocument()
    expect(screen.getByText("Financial Independence")).toBeInTheDocument()
    expect(screen.getByText("What-If")).toBeInTheDocument()
  })

  it("preserves live feature components for effective Pro", async () => {
    render(<HomeTab {...homeProps(proEntitlement)} />)
    expect(await screen.findByText("Live Health Score")).toBeInTheDocument()

    const stats = render(<StatsTab {...statsProps(proEntitlement)} />)
    expect(await screen.findByText("Live Anomaly Alerts")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("tab", { name: "Tren" }))
    expect(await screen.findByText("Live Cash Flow Forecast")).toBeInTheDocument()
    stats.unmount()

    render(<PlanTab {...planProps(proEntitlement)} />)
    fireEvent.click(screen.getByRole("button", { name: "Simulasi" }))
    expect(await screen.findByText("Live Financial Independence")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Open What-If Scenario simulator" })).toBeInTheDocument()
  })
})
