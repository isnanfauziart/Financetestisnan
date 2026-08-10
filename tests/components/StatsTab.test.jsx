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
vi.mock("@/app/dashboard/_components/RecapSection", () => ({ default: () => <div>Laporan Bulanan</div> }))
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
    expect(screen.getByRole("tab", { name: "Laporan" })).toBeInTheDocument()
  })

  it("moves report actions into the Laporan section", () => {
    render(<StatsTab {...createProps()} />)

    expect(screen.queryByText("Monthly report")).not.toBeInTheDocument()
    expect(screen.queryByText("Year in review")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Laporan" }))

    expect(screen.getByText("Monthly report")).toBeInTheDocument()
    expect(screen.getByText("Year in review")).toBeInTheDocument()
  })

  it("shows report content only after the Laporan segment is selected", () => {
    render(<StatsTab {...createProps()} />)

    expect(screen.queryByText("Laporan Bulanan")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Laporan" }))

    expect(screen.getByText("Laporan Bulanan")).toBeInTheDocument()
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
    expect(screen.getByRole("heading", { name: "Pemasukan terbesar" }).closest(".grid")).toHaveClass("grid-cols-1", "sm:grid-cols-2")
  })
})

describe("StatsTab financial summary", () => {
  it("places the takeaway before section tabs and the summary inside Ringkasan", () => {
    render(<StatsTab {...createProps({
      statIncome: 12_000_000,
      statExpense: 8_000_000,
      statSurplus: 4_000_000,
      insights: [{ icon: () => null, type: "positive", color: "#2f855a", text: "Pemasukan stabil" }],
    })} />)

    const filters = screen.getByLabelText("Filter Statistik")
    const takeaway = screen.getByRole("region", { name: "Ringkasannya" })
    const tablist = screen.getByRole("tablist", { name: "Navigasi Statistik" })
    const summary = screen.getByRole("region", { name: "Kondisi keuangan" })
    const insightsHeading = screen.getByRole("heading", { name: "Insights" })
    const anomaly = screen.getByText("Anomaly mock")

    expect(filters.nextElementSibling).toBe(takeaway)
    expect(takeaway.nextElementSibling).toBe(tablist)
    expect(tablist.nextElementSibling).toBe(summary)
    expect(summary.compareDocumentPosition(insightsHeading) & 4).toBe(4)
    expect(summary.compareDocumentPosition(anomaly) & 4).toBe(4)
  })

  it("summarizes the selected period and analysis mode before the sections", () => {
    render(<StatsTab {...createProps({
      statIncome: 12_000_000,
      statExpense: 8_000_000,
      statSurplus: 4_000_000,
    })} />)

    const takeaway = screen.getByRole("region", { name: "Ringkasannya" })

    expect(takeaway).toHaveTextContent("Jul 2026")
    expect(takeaway).toHaveTextContent("Rutin")
    expect(takeaway).toHaveTextContent("Pemasukan")
    expect(takeaway).toHaveTextContent("Pengeluaran")
    expect(takeaway).toHaveTextContent("Surplus")
  })

  it("uses routine totals for the default routine takeaway while keeping actual summary totals", () => {
    render(<StatsTab {...createProps({
      statIncome: 5_000_000,
      statExpense: 11_000_000,
      statSurplus: -6_000_000,
      routineStatIncome: 5_000_000,
      routineStatExpense: 1_000_000,
      routineStatSurplus: 4_000_000,
    })} />)

    expect(screen.getByRole("region", { name: "Ringkasannya" })).toHaveTextContent("Surplus Rp 4.0 jt")
    expect(screen.getByRole("region", { name: "Ringkasannya" })).toHaveTextContent("Pengeluaran Rp 1.0 jt")
    expect(screen.getByRole("region", { name: "Kondisi keuangan" })).toHaveTextContent("Defisit")
  })

  it("provides text alternatives for category and monthly trend charts", () => {
    render(<StatsTab {...createProps({
      isAllMonths: true,
      expenseCategories: [{ name: "Makan", value: 800_000 }],
      routineExpenseCategories: [{ name: "Makan", value: 800_000 }],
      incomeCategories: [{ name: "Gaji", value: 5_000_000 }],
      routineTop5Categories: ["Makan"],
      routineTrendData: [{ month: "Jul", Makan: 800_000 }],
      clientMonthlyData: [{ month: "Jul", pemasukan: 5_000_000, pengeluaran: 800_000, surplus: 4_200_000 }],
    })} />)

    fireEvent.click(screen.getByRole("tab", { name: "Kategori" }))
    expect(screen.getByText(/Pengeluaran terbesar: Makan/i)).toBeInTheDocument()
    expect(screen.getByText(/Pemasukan terbesar: Gaji/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Tren" }))
    expect(screen.getByText(/Tren Bulanan: 1 periode/i)).toBeInTheDocument()
  })

  it("uses the latest populated period for the category trend alternative", () => {
    render(<StatsTab {...createProps({
      isAllMonths: true,
      routineTop5Categories: ["Makan"],
      routineTrendData: [
        { month: "Jul", Makan: 800_000 },
        { month: "Des", Makan: 0 },
      ],
    })} />)

    fireEvent.click(screen.getByRole("tab", { name: "Kategori" }))

    expect(screen.getByText(/Tren kategori pengeluaran: Jul/i)).toBeInTheDocument()
    expect(screen.queryByText(/Tren kategori pengeluaran: Des/i)).not.toBeInTheDocument()
  })

  it("shows the selected period, surplus status, and supporting income and expense metrics", () => {
    render(<StatsTab {...createProps({
      selectedMonth: "Agu",
      selectedYear: "2026",
      statIncome: 12_000_000,
      statExpense: 8_000_000,
      statSurplus: 4_000_000,
    })} />)

    const summary = screen.getByRole("region", { name: "Kondisi keuangan" })

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

    const summary = screen.getByRole("region", { name: "Kondisi keuangan" })
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

    expect(screen.getByRole("region", { name: "Kondisi keuangan" })).toHaveTextContent("Seimbang")
  })

  it("keeps the summary scoped to the Ringkasan section", () => {
    render(<StatsTab {...createProps()} />)

    expect(screen.getByRole("region", { name: "Kondisi keuangan" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Kategori" }))

    expect(screen.queryByRole("region", { name: "Kondisi keuangan" })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Pemasukan terbesar" })).toBeInTheDocument()
  })

  it("uses a compact loading skeleton for the summary", () => {
    const { container } = render(<StatsTab {...createProps({ refreshing: true })} />)

    expect(container.querySelector(".shimmer-bg")).toHaveStyle({ height: "160px" })
  })

  it("separates income and expense cards with semantic icons and color treatments", () => {
    render(<StatsTab {...createProps({ statIncome: 12_000_000, statExpense: 8_000_000, statSurplus: 4_000_000 })} />)

    const income = screen.getByRole("group", { name: /Pemasukan Rp 12\.0 jt/i })
    const expense = screen.getByRole("group", { name: /Pengeluaran Rp 8\.0 jt/i })

    expect(income.querySelector("svg")).toHaveClass("lucide-arrow-down-left")
    expect(expense.querySelector("svg")).toHaveClass("lucide-arrow-up-right")
    expect(income).not.toHaveClass("bg-white/10")
    expect(expense).not.toHaveClass("bg-white/10")
  })
})

describe("StatsTab top filter labels", () => {
  it("shows a visible matching label for every top filter", () => {
    render(<StatsTab {...createProps()} />)

    expect(screen.getByText("Tahun", { selector: "label" })).toBeVisible()
    expect(screen.getByText("Bulan", { selector: "label" })).toBeVisible()
    expect(screen.getByText("Akun", { selector: "label" })).toBeVisible()
    expect(screen.getByText("Tampilan", { selector: "label" })).toBeVisible()
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

    const analysisModeSelect = screen.getByRole("button", { name: "Tampilan" })
    expect(analysisModeSelect).toHaveTextContent("Rutin")
    expect(analysisModeSelect).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(analysisModeSelect)

    expect(analysisModeSelect).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("option", { name: "Rutin" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Semua" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("option", { name: "Rutin" }))
    expect(screen.getByText(/6\.000\.000/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Kategori" }))

    expect(screen.getByText("Makan")).toBeInTheDocument()
    expect(screen.queryByText("Laptop")).not.toBeInTheDocument()

    fireEvent.click(analysisModeSelect)
    fireEvent.click(screen.getByRole("option", { name: "Semua" }))
    expect(analysisModeSelect).toHaveTextContent("Semua")
    expect(screen.getByText("Laptop")).toBeInTheDocument()
  })
})
