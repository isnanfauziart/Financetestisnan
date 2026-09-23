import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import StatsTab from "@/app/dashboard/StatsTab"
import StatsDataTable from "@/app/dashboard/_components/StatsDataTable"

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
    selectedMonth: "Semua Bulan",
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
    compareMode: false,
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
    isAllMonths: true,
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

const CASH_FLOW_ROWS = [
  { month: "Jan", year: "2026", pemasukan: 5_000_000, pengeluaran: 2_000_000, rataRataPemasukan: 5_000_000, rataRataPengeluaran: 2_000_000 },
  { month: "Feb", year: "2026", pemasukan: 3_000_000, pengeluaran: 4_000_000, rataRataPemasukan: 4_000_000, rataRataPengeluaran: 3_000_000 },
]

describe("StatsDataTable disclosure table", () => {
  it("renders nothing when there is no data", () => {
    render(<StatsDataTable id="t" caption="Kosong" columns={["A"]} rows={[]} />)

    expect(screen.queryByRole("button", { name: "Lihat data sebagai tabel" })).not.toBeInTheDocument()
  })

  it("reveals a labelled, keyboard-operable table through the disclosure", () => {
    render(<StatsDataTable
      id="kategori-table"
      caption="Data pengeluaran per kategori"
      columns={["Kategori", "Jumlah"]}
      rows={[{ label: "Makan", values: ["Rp 800 rb"] }]}
    />)

    const toggle = screen.getByRole("button", { name: "Lihat data sebagai tabel" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(toggle).toHaveAttribute("aria-controls", "kategori-table")

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "true")
    const table = screen.getByRole("region", { name: "Data pengeluaran per kategori" })
    expect(table).toContainElement(screen.getByRole("table"))
    expect(screen.getByRole("columnheader", { name: "Kategori" })).toBeInTheDocument()
    expect(screen.getByRole("rowheader", { name: "Makan" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "Rp 800 rb" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Sembunyikan tabel data" }))

    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })
})

describe("StatsTab chart data tables", () => {
  it("exposes the cash-flow chart as a data table without pointer interaction", () => {
    render(<StatsTab {...createProps({ cashFlowMonthlyData: CASH_FLOW_ROWS })} />)

    fireEvent.click(screen.getByRole("button", { name: "Lihat data sebagai tabel" }))

    const table = screen.getByRole("region", { name: "Data arus kas bulanan" })
    expect(table).toHaveTextContent("Jan")
    expect(table).toHaveTextContent("Feb")
    expect(table).toHaveTextContent("Rp 5.0 jt")
  })

  it("shows the scroll hint only when the cash-flow content overflows", () => {
    render(<StatsTab {...createProps({ cashFlowMonthlyData: CASH_FLOW_ROWS })} />)

    expect(screen.getByTestId("stats-cash-flow-scroll")).toBeInTheDocument()
    expect(screen.queryByTestId("stats-cash-flow-hint")).not.toBeInTheDocument()
  })

  it("exposes the expense category chart as a data table", () => {
    render(<StatsTab {...createProps({
      expenseCategories: [
        { name: "Makan", value: 800_000 },
        { name: "Transportasi", value: 300_000 },
      ],
    })} />)

    fireEvent.click(screen.getByRole("tab", { name: "Kategori" }))
    fireEvent.click(screen.getByRole("button", { name: "Lihat data sebagai tabel" }))

    const table = screen.getByRole("region", { name: "Data pengeluaran per kategori" })
    expect(table).toHaveTextContent("Makan")
    expect(table).toHaveTextContent("Transportasi")
  })

  it("exposes the monthly trend and category trend charts as data tables", () => {
    render(<StatsTab {...createProps({
      clientMonthlyData: [{ month: "Jan", pemasukan: 5_000_000, pengeluaran: 2_000_000, surplus: 3_000_000 }],
      routineTop5Categories: ["Makan"],
      routineTrendData: [{ month: "Jan", Makan: 800_000 }],
    })} />)

    fireEvent.click(screen.getByRole("tab", { name: "Tren" }))

    // Monthly trend table (first disclosure inside the Tren panel)
    fireEvent.click(screen.getAllByRole("button", { name: "Lihat data sebagai tabel" })[0])
    expect(screen.getByRole("region", { name: "Data tren bulanan" })).toHaveTextContent("Jan")

    // Category trend table (inside the Kategori panel)
    fireEvent.click(screen.getByRole("tab", { name: "Kategori" }))
    fireEvent.click(screen.getByRole("button", { name: "Lihat data sebagai tabel" }))
    expect(screen.getByRole("region", { name: "Data tren kategori pengeluaran" })).toHaveTextContent("Makan")
  })

  it("exposes the month comparison chart as a data table with both period columns", () => {
    render(<StatsTab {...createProps({
      compareMode: true,
      compareChartData: [
        { category: "Makan", "Jul 2026": 800_000, "Jun 2026": 600_000 },
      ],
    })} />)

    fireEvent.click(screen.getByRole("tab", { name: "Tren" }))
    fireEvent.click(screen.getByRole("button", { name: "Lihat data sebagai tabel" }))

    const table = screen.getByRole("region", { name: "Data perbandingan bulan" })
    expect(table).toHaveTextContent("Jul 2026")
    expect(table).toHaveTextContent("Jun 2026")
    expect(table).toHaveTextContent("Makan")
    expect(screen.queryByTestId("stats-comparison-hint")).not.toBeInTheDocument()
  })
})

describe("StatsTab WAI-ARIA tabs wiring", () => {
  it("connects tabs to their panels with roving tabindex", () => {
    render(<StatsTab {...createProps()} />)

    const ringkasanTab = screen.getByRole("tab", { name: "Ringkasan" })
    expect(ringkasanTab).toHaveAttribute("aria-controls", "stats-panel-ringkasan")
    expect(ringkasanTab).toHaveAttribute("tabindex", "0")
    expect(screen.getByRole("tab", { name: "Kategori" })).toHaveAttribute("tabindex", "-1")

    fireEvent.click(screen.getByRole("tab", { name: "Kategori" }))

    const panel = document.getElementById("stats-panel-kategori")
    expect(panel).toHaveAttribute("role", "tabpanel")
    expect(panel).toHaveAttribute("aria-labelledby", "stats-tab-kategori")
  })

  it("supports arrow-key navigation between sections", () => {
    const onSectionChange = vi.fn()
    render(<StatsTab {...createProps({ controlledSection: "ringkasan", onSectionChange })} />)

    fireEvent.keyDown(screen.getByRole("tab", { name: "Ringkasan" }), { key: "ArrowRight" })
    expect(onSectionChange).toHaveBeenCalledWith("kategori")

    fireEvent.keyDown(screen.getByRole("tab", { name: "Laporan" }), { key: "ArrowRight" })
    expect(onSectionChange).toHaveBeenCalledWith("ringkasan")

    fireEvent.keyDown(screen.getByRole("tab", { name: "Laporan" }), { key: "ArrowLeft" })
    expect(onSectionChange).toHaveBeenCalledWith("tren")

    fireEvent.keyDown(screen.getByRole("tab", { name: "Ringkasan" }), { key: "End" })
    expect(onSectionChange).toHaveBeenCalledWith("recap")
  })

  it("extends the calendar navigation hit areas to 44px without enlarging the icons", () => {
    render(<StatsTab {...createProps()} />)

    fireEvent.click(screen.getByRole("tab", { name: "Tren" }))

    const previous = screen.getByRole("button", { name: "Bulan sebelumnya" })
    const next = screen.getByRole("button", { name: "Bulan berikutnya" })

    expect(previous).toHaveClass("before:absolute", "before:inset-[-6px]")
    expect(next).toHaveClass("before:absolute", "before:inset-[-6px]")
    expect(previous.querySelector("svg")).toHaveAttribute("width", "14")
  })
})
