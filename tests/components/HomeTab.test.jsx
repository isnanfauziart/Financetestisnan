import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import HomeTab from "@/app/dashboard/HomeTab"

vi.mock("@/components/HealthScoreCard", () => ({
  default: () => <div data-testid="health-score-card">Health score mock</div>,
}))

vi.mock("@/components/BudgetStatusCard", () => ({
  default: () => <div data-testid="budget-status-card">Budget status mock</div>,
}))

vi.mock("@/lib/useSharedData", () => ({
  useBudgets: vi.fn(),
  useBills: vi.fn(),
  useSettings: vi.fn(() => ({ settings: {} })),
}))

const { useBudgets, useBills } = await import("@/lib/useSharedData")

function createProps(overrides = {}) {
  return {
    data: {
      netWorth: 12500000,
      totalIncome: 9000000,
      totalExpense: 4200000,
      totalSavings: 1700000,
      netWorthMonthlyDelta: 350000,
      transactions: [],
    },
    session: { user: { name: "Ayu" } },
    statIncome: 9000000,
    statExpense: 4200000,
    statSavings: 1700000,
    topCategory: { name: "Makanan" },
    topCategoryPct: 36,
    recent5: [
      { type: "expense", category: "Makanan", desc: "Makan siang", date: "7 Jul 2026", amount: 45000 },
    ],
    setActiveNav: vi.fn(),
    openPlanSection: vi.fn(),
    openQuickAdd: vi.fn(),
    setDrillDown: vi.fn(),
    onToast: vi.fn(),
    selectedMonth: "Jul",
    selectedYear: "2026",
    monthlyData: [],
    filteredTransactions: [
      { type: "expense", category: "Makanan", amount: 450000, month: "Jul", year: "2026", account: "BCA" },
    ],
    allTransactions: [
      { type: "expense", category: "Makanan", amount: 950000, month: "Jul", year: "2026", account: "BCA" },
    ],
    onCategoryClick: vi.fn(),
    insights: [],
    ...overrides,
  }
}

describe("HomeTab priority actions", () => {
  beforeEach(() => {
    useBudgets.mockReturnValue({
      budgets: [
        { kategori: "Makanan", limit: 1000000, bulan: "Jul", tahun: "2026", akun: "" },
      ],
    })
    useBills.mockReturnValue({
      bills: [
        {
          id: "bill-1",
          nama: "Internet WiFi",
          status: "due_today",
          daysUntilDue: 0,
          tanggalJatuhTempo: "7 Jul 2026",
          jumlah: 350000,
        },
      ],
    })
  })

  it("keeps Fokus Hari Ini in the hero and places the selected-period flow before urgent actions", () => {
    render(<HomeTab {...createProps()} />)

    expect(screen.getByText("Fokus Hari Ini")).toBeInTheDocument()

    const cashFlowHeading = screen.getByText("Uang masuk & Uang keluar Jul 2026")
    const priorityHeading = screen.getByText("Yang perlu kamu cek")
    const billAction = screen.getByRole("button", { name: /bayar tagihan internet wifi/i })
    const budgetAction = screen.getByRole("button", { name: /cek budget makanan/i })
    const incomeSummary = screen.getByLabelText("Lihat 10 transaksi pemasukan terbesar")

    expect(cashFlowHeading).toBeInTheDocument()
    expect(priorityHeading).toBeInTheDocument()
    expect(billAction).toBeInTheDocument()
    expect(budgetAction).toBeInTheDocument()
    expect(incomeSummary).toBeInTheDocument()
    expect(cashFlowHeading.compareDocumentPosition(priorityHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("shows direct selected-period cash-flow values and the surplus or deficit", () => {
    render(<HomeTab {...createProps({
      data: { netWorth: 0, totalIncome: 0, totalExpense: 0, totalSavings: 0, transactions: [] },
      statIncome: 9000000,
      statExpense: 4200000,
      statSavings: 1700000,
    })} />)

    const cashFlow = screen.getByRole("region", { name: "Uang masuk & Uang keluar Jul 2026" })

    expect(cashFlow).toHaveTextContent("Uang masuk")
    expect(cashFlow).toHaveTextContent("Rp 9.0 jt")
    expect(cashFlow).toHaveTextContent("Uang keluar")
    expect(cashFlow).toHaveTextContent("Rp 4.2 jt")
    expect(cashFlow).toHaveTextContent("Tabungan")
    expect(cashFlow).toHaveTextContent("Rp 1.7 jt")
    expect(cashFlow).toHaveTextContent("Arus kas bersih")
    expect(cashFlow).toHaveTextContent("Surplus")
    expect(cashFlow).toHaveTextContent("Rp 4.8 jt")
  })

  it("shows the canonical hero values and the provisional balance basis", () => {
    render(<HomeTab {...createProps({
      data: {
        netWorth: 12500000,
        totalIncome: 0, totalExpense: 0, totalSavings: 0, transactions: [],
        balances: {
          netWorth: 12500000,
          available: { value: 3500000, shortfall: 0 },
          currentCash: { value: 3500000, provisional: true, checkpointId: "" },
          recordedBalance: 3500000,
          rincian: { recordedBalance: 3500000, estimate: false, unpaidBills: { count: 0, total: 0 } },
          outstanding: { utang: 0, piutang: 0 },
        },
      },
    })} />)

    expect(screen.getAllByText("Bisa dipakai sekarang").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Rp 3.500.000").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Berdasarkan data terakhir").length).toBeGreaterThan(0)
  })

  it("lists the rincian saldo breakdown including unpaid bills as informational", () => {
    render(<HomeTab {...createProps({
      data: {
        netWorth: 8000000,
        totalIncome: 0, totalExpense: 0, totalSavings: 0, transactions: [],
        balances: {
          netWorth: 8000000,
          recordedBalance: 9000000,
          available: { value: 4000000, shortfall: 0 },
          currentCash: { value: 4000000, provisional: false, checkpointId: "abc", recordedAt: "2026-08-01T03:00:00.000Z" },
          outstanding: { utang: 1000000, piutang: 0, utangCount: 1, piutangCount: 0 },
          rincian: {
            recordedBalance: 9000000,
            goalReservations: 1500000,
            unassignedSavings: 500000,
            unassignedSavingsCount: 2,
            investmentReserved: 0,
            needsReviewCount: 0,
            needsReviewTotal: 0,
            estimate: false,
            available: 4000000,
            shortfall: 0,
            unpaidBills: { count: 1, total: 300000 },
          },
        },
      },
    })} />)

    const rincian = screen.getByRole("region", { name: /rincian saldo/i })
    expect(rincian).toHaveTextContent("Uang kamu")
    expect(rincian).toHaveTextContent("Utang belum lunas")
    expect(rincian).toHaveTextContent("Disisihkan di tabungan")
    expect(rincian).not.toHaveTextContent("Saldo Tercatat")
    expect(rincian).not.toHaveTextContent("Kekayaan Bersih")
    expect(rincian).not.toHaveTextContent("Dana yang bisa dipakai saat ini")
    expect(rincian).toHaveTextContent("Tagihan belum dibayar")
    expect(rincian).toHaveTextContent("Tidak mengurangi dana yang bisa dipakai sampai benar-benar dibayar.")
    expect(rincian).toHaveTextContent("Bisa dipakai sekarang")
  })

  it("uses a neutral scope label for all-period cash flow filters", () => {
    render(<HomeTab {...createProps({ selectedMonth: "Semua Bulan", selectedYear: "Semua Tahun" })} />)

    const cashFlow = screen.getByRole("region", { name: "Uang masuk & Uang keluar Periode yang dipilih" })

    expect(cashFlow).toHaveTextContent("Periode yang dipilih")
    expect(cashFlow).not.toHaveTextContent("Bulan berjalan")
    expect(cashFlow).not.toHaveTextContent("Uang masuk & Uang keluar Bulan Ini")
  })

  it("does not invent a selected-period label when one period filter is missing", () => {
    render(<HomeTab {...createProps({ selectedMonth: "Jul", selectedYear: undefined })} />)

    const cashFlow = screen.getByRole("region", { name: "Uang masuk & Uang keluar Periode yang dipilih" })

    expect(cashFlow).toHaveTextContent("Periode yang dipilih")
    expect(cashFlow).not.toHaveTextContent("Uang masuk & Uang keluar Jul")
  })

  it("does not add a plus sign to a balanced cash flow", () => {
    render(<HomeTab {...createProps({
      data: { netWorth: 0, totalIncome: 0, totalExpense: 0, totalSavings: 0, transactions: [] },
      statIncome: 4200000,
      statExpense: 4200000,
      statSavings: 0,
    })} />)

    const cashFlow = screen.getByRole("region", { name: "Uang masuk & Uang keluar Jul 2026" })
    const balance = cashFlow.querySelector("p.text-base")

    expect(balance).toHaveTextContent("Rp 0")
    expect(balance).not.toHaveTextContent("+Rp 0")
  })

  it("shows no more than two prioritized insights and routes to Statistik", () => {
    const setActiveNav = vi.fn()
    const insights = [
      { type: "warning", icon: () => <span aria-hidden="true" />, color: "#B33A3A", text: "Insight utama" },
      { type: "info", icon: () => <span aria-hidden="true" />, color: "#2F6B57", text: "Insight kedua" },
      { type: "positive", icon: () => <span aria-hidden="true" />, color: "#2D6A62", text: "Insight ketiga" },
    ]

    render(<HomeTab {...createProps({ insights, setActiveNav })} />)

    expect(screen.getByRole("heading", { name: "Insights utama" })).toBeInTheDocument()
    expect(screen.getByText("Insight utama")).toBeInTheDocument()
    expect(screen.getByText("Insight kedua")).toBeInTheDocument()
    expect(screen.queryByText("Insight ketiga")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Buka Statistik untuk lihat semua insights" }))
    expect(setActiveNav).toHaveBeenCalledWith("stats")
  })

  it("hides home insights when the insights feature is disabled", () => {
    render(<HomeTab {...createProps({
      insights: [{ type: "info", text: "Insight yang terkunci" }],
      entitlement: { features: { insights: false } },
    })} />)

    expect(screen.queryByRole("heading", { name: "Insights utama" })).not.toBeInTheDocument()
    expect(screen.queryByText("Insight yang terkunci")).not.toBeInTheDocument()
  })

  it("does not let disabled insights influence Fokus Hari Ini without urgent items", () => {
    useBudgets.mockReturnValue({ budgets: [] })
    useBills.mockReturnValue({ bills: [] })

    render(<HomeTab {...createProps({
      statIncome: 0,
      statExpense: 0,
      statSavings: 0,
      insights: [{ type: "warning", text: "Insight yang bocor" }],
      entitlement: { features: { insights: false } },
    })} />)

    expect(screen.getByText("Fokus Hari Ini").parentElement).not.toHaveTextContent("Insight yang bocor")
    expect(screen.queryByText("Insight yang bocor")).not.toBeInTheDocument()
  })

  it("passes the filtered transaction scope to cash-flow drilldown", () => {
    const setDrillDown = vi.fn()
    const filteredTransactions = [
      { type: "income", category: "Gaji", amount: 9000000, month: "Jul", year: "2026" },
    ]

    render(<HomeTab {...createProps({ filteredTransactions, setDrillDown })} />)

    fireEvent.click(screen.getByRole("button", { name: "Lihat 10 transaksi pemasukan terbesar" }))

    expect(setDrillDown).toHaveBeenCalledWith({
      type: "income",
      title: "Pemasukan",
      transactions: filteredTransactions,
    })
  })

  it("orders the home narrative from condition through flow, priorities, planning, insights, health, and recent activity", () => {
    render(<HomeTab {...createProps({
      insights: [
        { type: "info", icon: () => <span aria-hidden="true" />, color: "#2F6B57", text: "Insight untuk urutan" },
      ],
      entitlement: { features: { budgets: true, healthScore: true } },
    })} />)

    const sections = [
      screen.getByText("Kekayaan Bersih"),
      screen.getByText("Uang masuk & Uang keluar Jul 2026"),
      screen.getByText("Yang perlu kamu cek"),
      screen.getByTestId("budget-status-card"),
      screen.getByRole("heading", { name: "Insights utama" }),
      screen.getByTestId("health-score-card"),
      screen.getByRole("heading", { name: "Transaksi Terbaru" }),
    ]

    sections.slice(0, -1).forEach((section, index) => {
      expect(section.compareDocumentPosition(sections[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  it("routes urgent budget and bill actions into the correct plan sections", () => {
    const setActiveNav = vi.fn()
    const openPlanSection = vi.fn()
    render(<HomeTab {...createProps({ setActiveNav, openPlanSection })} />)

    fireEvent.click(screen.getByRole("button", { name: /bayar tagihan internet wifi/i }))
    fireEvent.click(screen.getByRole("button", { name: /cek budget makanan/i }))

    expect(setActiveNav).toHaveBeenNthCalledWith(1, "plan")
    expect(openPlanSection).toHaveBeenNthCalledWith(1, "tagihan")
    expect(setActiveNav).toHaveBeenNthCalledWith(2, "plan")
    expect(openPlanSection).toHaveBeenNthCalledWith(2, "budget")
  })

  it("routes the Tabungan summary into the goal section", () => {
    const setActiveNav = vi.fn()
    const openPlanSection = vi.fn()
    render(<HomeTab {...createProps({ setActiveNav, openPlanSection })} />)

    fireEvent.click(screen.getByRole("button", { name: "Lihat ringkasan tabungan dan goal" }))

    expect(setActiveNav).toHaveBeenCalledWith("plan")
    expect(openPlanSection).toHaveBeenCalledWith("goal")
  })

  it("routes the top category summary to Statistik", () => {
    const setActiveNav = vi.fn()
    render(<HomeTab {...createProps({ setActiveNav })} />)

    fireEvent.click(screen.getByRole("button", { name: "Lihat kategori pengeluaran terbesar di Statistik" }))

    expect(setActiveNav).toHaveBeenCalledWith("stats")
  })

  it("warns when the financial summary is limited to the visible history window", () => {
    render(<HomeTab {...createProps({
      data: {
        ...createProps().data,
        history: { months: 4, limited: true, hasOlderData: true },
      },
    })} />)

    expect(screen.getByRole("note")).toHaveTextContent("Yang tampil 4 bulan terakhir")
    expect(screen.getByRole("note")).toHaveTextContent("Artami menampilkan 4 bulan terakhir di sini. Data lama tetap aman di Google Sheets.")
  })

  it("uses friendly copy for the empty recent-transactions state", () => {
    render(<HomeTab {...createProps({ recent5: [] })} />)

    expect(screen.getByText("Catat transaksi pertamamu supaya Artami bisa mulai membaca keuanganmu.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Catat transaksi" })).toBeInTheDocument()
  })
})
