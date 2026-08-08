import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import StatsTab from "@/app/dashboard/StatsTab"

const forecastProps = vi.hoisted(() => ({ current: null }))
const savingsTrendProps = vi.hoisted(() => ({ current: null }))

beforeEach(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

vi.mock("@/components/BudgetsSection", () => ({ default: () => <div>Budgets mock</div> }))
vi.mock("@/components/EventBudgetsSection", () => ({ default: () => <div>Event budgets mock</div> }))
vi.mock("@/components/MonthlyReportButton", () => ({ default: () => <button type="button">Monthly report</button> }))
vi.mock("@/components/YearInReviewButton", () => ({ default: () => <button type="button">Year in review</button> }))
vi.mock("@/app/dashboard/_components/RecapSection", () => ({ default: () => <div>Recap Bulanan</div> }))
vi.mock("@/components/CashFlowForecast", () => ({
  default: (props) => {
    forecastProps.current = props
    return <div>Forecast mock</div>
  },
}))
vi.mock("@/components/SavingsRateTrend", () => ({
  default: (props) => {
    savingsTrendProps.current = props
    return <div>Savings trend mock</div>
  },
}))
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
  bills: [],
  billsLoading: false,
  billsError: null,
    now: 1722470400000,
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

  it("keeps filters, section tabs, and category cards readable on narrow screens", () => {
    render(<StatsTab {...createProps()} />)

    expect(screen.getByRole("button", { name: "Tahun" }).parentElement.parentElement).toHaveClass(
      "grid-cols-1",
      "min-[360px]:grid-cols-2",
      "sm:grid-cols-4",
    )
    expect(screen.getByRole("tab", { name: "Ringkasan" }).parentElement).toHaveClass("grid-cols-2", "sm:grid-cols-4")

    fireEvent.click(screen.getByRole("tab", { name: "Kategori" }))
    expect(screen.getByText("Komposisi Pemasukan").closest(".grid")).toHaveClass("grid-cols-1", "sm:grid-cols-2")
  })
})

describe("StatsTab financial summary", () => {
  it("places the summary immediately after the section tabs and before insights and anomaly alerts", () => {
    render(<StatsTab {...createProps({
      statIncome: 12_000_000,
      statExpense: 8_000_000,
      statSurplus: 4_000_000,
      insights: [{ icon: () => null, type: "positive", color: "#2f855a", text: "Pemasukan stabil" }],
    })} />)

    const tablist = screen.getByRole("tablist", { name: "Navigasi Statistik" })
    const summary = screen.getByRole("region", { name: "Ringkasan keuangan" })
    const insightsHeading = screen.getByRole("heading", { name: "Insights" })
    const anomaly = screen.getByText("Anomaly mock")

    expect(tablist.nextElementSibling).toBe(summary)
    expect(summary.compareDocumentPosition(insightsHeading) & 4).toBe(4)
    expect(summary.compareDocumentPosition(anomaly) & 4).toBe(4)
  })

  it("shows the selected period, surplus status, and supporting income and expense metrics", () => {
    render(<StatsTab {...createProps({
      selectedMonth: "Agu",
      selectedYear: "2026",
      statIncome: 12_000_000,
      statExpense: 8_000_000,
      statSurplus: 4_000_000,
    })} />)

    const summary = screen.getByRole("region", { name: "Ringkasan keuangan" })

    expect(summary).toHaveTextContent("Agu 2026")
    expect(summary).toHaveTextContent("Surplus")
    expect(summary.querySelector("h2")).toHaveTextContent("4.000.000")
    expect(summary).toHaveTextContent("Pemasukan")
    expect(summary).toHaveTextContent("Rp 12.0 jt")
    expect(summary).toHaveTextContent("Pengeluaran")
    expect(summary).toHaveTextContent("Rp 8.0 jt")
  })

  it("shows Defisit with an absolute deficit amount", () => {
    render(<StatsTab {...createProps({
      statIncome: 5_000_000,
      statExpense: 11_000_000,
      statSurplus: -6_000_000,
    })} />)

    const summary = screen.getByRole("region", { name: "Ringkasan keuangan" })
    const mainAmount = summary.querySelector("h2")

    expect(summary).toHaveTextContent("Defisit")
    expect(mainAmount).toHaveTextContent("6.000.000")
    expect(mainAmount).not.toHaveTextContent("-")
  })

  it("shows Seimbang when income and expenses are equal", () => {
    render(<StatsTab {...createProps({
      statIncome: 5_000_000,
      statExpense: 5_000_000,
      statSurplus: 0,
    })} />)

    expect(screen.getByRole("region", { name: "Ringkasan keuangan" })).toHaveTextContent("Seimbang")
  })

  it("keeps the summary scoped to the Ringkasan section", () => {
    render(<StatsTab {...createProps()} />)

    expect(screen.getByRole("region", { name: "Ringkasan keuangan" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Kategori" }))

    expect(screen.queryByRole("region", { name: "Ringkasan keuangan" })).not.toBeInTheDocument()
    expect(screen.getByText("Komposisi Pemasukan")).toBeInTheDocument()
  })

  it("uses a compact loading skeleton for the summary", () => {
    const { container } = render(<StatsTab {...createProps({ refreshing: true })} />)

    expect(container.querySelector(".shimmer-bg")).toHaveStyle({ height: "160px" })
  })
})

describe("StatsTab top filter labels", () => {
  it("shows a visible matching label for every top filter", () => {
    render(<StatsTab {...createProps()} />)

    expect(screen.getByText("Tahun", { selector: "label" })).toBeVisible()
    expect(screen.getByText("Bulan", { selector: "label" })).toBeVisible()
    expect(screen.getByText("Akun", { selector: "label" })).toBeVisible()
    expect(screen.getByText("Mode Analisis", { selector: "label" })).toBeVisible()
  })
})

describe("StatsTab forecast inputs", () => {
  it("passes global transactions and bills to the cash-flow forecast", () => {
    const allTransactions = [{ id: "billpay:bill-1:2026-06-01", type: "expense", amount: 100 }]
    const bills = [{ id: "bill-1", nama: "Internet", jumlah: 100, aktif: true }]

    render(<StatsTab {...createProps({ allTransactions, bills })} />)
    fireEvent.click(screen.getByRole("tab", { name: "Tren" }))

    expect(forecastProps.current.transactions).toBe(allTransactions)
    expect(forecastProps.current.bills).toBe(bills)
  })

  it("passes the dashboard clock to the cash-flow forecast", () => {
    const now = 1754006400000

    render(<StatsTab {...createProps({ now })} />)
    fireEvent.click(screen.getByRole("tab", { name: "Tren" }))

    expect(forecastProps.current.now).toBe(now)
  })

  it("passes routine monthly data to routine analytics widgets when provided", () => {
    const actualMonthlyData = [{ month: "Agu", year: "2026", pemasukan: 5_000_000, pengeluaran: 11_000_000 }]
    const routineMonthlyData = [{ month: "Agu", year: "2026", pemasukan: 5_000_000, pengeluaranRutin: 1_000_000 }]

    render(<StatsTab {...createProps({ monthlyData: actualMonthlyData, routineMonthlyData })} />)
    fireEvent.click(screen.getByRole("tab", { name: "Tren" }))

    expect(forecastProps.current.monthlyData).toBe(routineMonthlyData)
    expect(savingsTrendProps.current.monthlyData).toBe(routineMonthlyData)
  })
})

describe("StatsTab routine/actual analysis mode", () => {
  it("defaults chart analysis to routine while preserving the actual headline", () => {
    render(<StatsTab {...createProps({
      statIncome: 5_000_000,
      statExpense: 11_000_000,
      statSurplus: -6_000_000,
      expenseCategories: [
        { name: "Laptop", value: 10_000_000 },
        { name: "Makan", value: 1_000_000 },
      ],
      routineExpenseCategories: [
        { name: "Makan", value: 1_000_000 },
      ],
    })} />)

    const analysisModeSelect = screen.getByRole("button", { name: "Mode Analisis" })
    expect(analysisModeSelect).toHaveTextContent("Rutin")
    expect(analysisModeSelect).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(analysisModeSelect)

    expect(analysisModeSelect).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("option", { name: "Rutin" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Aktual" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("option", { name: "Rutin" }))
    expect(screen.getByText(/6\.000\.000/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Kategori" }))

    expect(screen.getByText("Makan")).toBeInTheDocument()
    expect(screen.queryByText("Laptop")).not.toBeInTheDocument()

    fireEvent.click(analysisModeSelect)
    fireEvent.click(screen.getByRole("option", { name: "Aktual" }))
    expect(analysisModeSelect).toHaveTextContent("Aktual")
    expect(screen.getByText("Laptop")).toBeInTheDocument()
  })
})
