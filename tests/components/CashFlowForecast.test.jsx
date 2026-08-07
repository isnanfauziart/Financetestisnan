import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import CashFlowForecast from "@/components/CashFlowForecast"
import { formatRp } from "@/app/dashboard/_components/helpers"
import { computeForecast } from "@/lib/forecast"

vi.mock("recharts", () => ({
  AreaChart: ({ children, data }) => <svg data-testid="forecast-chart" data-project-surplus={data.at(-1)?.surplusForecast}>{children}</svg>,
  Area: ({ dataKey }) => <g data-testid={`area-${dataKey}`} />,
  Line: ({ dataKey, strokeDasharray }) => <g data-testid={`line-${dataKey}`} data-stroke-dasharray={strokeDasharray} />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  ReferenceLine: () => null,
}))

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

function getWibMonthParts(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date).map((part) => [part.type, part.value]))
  return { year: Number(parts.year), monthIndex: Number(parts.month) - 1 }
}

function createMonthlyData(count = 6) {
  const current = getWibMonthParts()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(current.year, current.monthIndex - (count - index), 1))
    return {
      month: MONTHS[date.getUTCMonth()],
      year: String(date.getUTCFullYear()),
      pemasukan: 4_000_000,
      pengeluaran: 2_000_000,
      surplus: 2_000_000,
    }
  })
}

function createBillInputs(monthlyData) {
  const lastMonth = monthlyData.at(-1)
  return {
    bills: [{
      id: "rent",
      tipe: "expense",
      jumlah: 1_000_000,
      frekuensi: "monthly",
      tanggalJatuhTempo: 1,
      aktif: true,
      createdAt: "2020-01-01",
    }],
    transactions: [{
      id: `billpay:rent:${lastMonth.year}-${String(MONTHS.indexOf(lastMonth.month) + 1).padStart(2, "0")}-01`,
      type: "expense",
      amount: 1_000_000,
      month: lastMonth.month,
      year: lastMonth.year,
    }],
  }
}

function renderForecast(props = {}) {
  const monthlyData = props.monthlyData || createMonthlyData()
  const result = render(<CashFlowForecast monthlyData={monthlyData} {...props} />)
  act(() => {})
  return { ...result, monthlyData }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  const completedAnimations = new WeakSet()
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    if (completedAnimations.has(callback)) return 1
    completedAnimations.add(callback)
    callback(1)
    callback(1001)
    return 1
  })
})

describe("CashFlowForecast", () => {
  it("uses bills and transactions in the real forecast before rendering the projected KPI", () => {
    const monthlyData = createMonthlyData()
    const { bills, transactions } = createBillInputs(monthlyData)
    const withoutScheduledInputs = computeForecast(monthlyData, { transactions: [], bills: [] })
    const withScheduledInputs = computeForecast(monthlyData, { transactions, bills })

    expect(withScheduledInputs.projectedExpense).not.toBe(withoutScheduledInputs.projectedExpense)

    renderForecast({ monthlyData, transactions, bills })

    expect(screen.getByText(formatRp(withScheduledInputs.projectedExpense))).toBeInTheDocument()
    expect(screen.queryByText(formatRp(withoutScheduledInputs.projectedExpense))).not.toBeInTheDocument()
  })

  it("does not render confidence-band or scenario UI", () => {
    renderForecast()

    expect(screen.queryByTestId("area-surplusHigh")).not.toBeInTheDocument()
    expect(screen.queryByTestId("area-surplusLow")).not.toBeInTheDocument()
    expect(screen.queryByText(/confidence|conservative|base|optimistic|skenario|konservatif|optimis/i)).not.toBeInTheDocument()
    expect(screen.getByTestId("line-surplusForecast")).toBeInTheDocument()
    expect(screen.getByTestId("line-surplusForecast")).toHaveAttribute("data-stroke-dasharray", "6 4")
    expect(screen.queryByTestId("line-surplusProjected")).not.toBeInTheDocument()
  })

  it("recomputes the projection when the dashboard clock changes", () => {
    const monthlyData = MONTHS.slice(0, 7).map((month) => ({
      month,
      year: "2026",
      pemasukan: 4_000_000,
      pengeluaran: 2_000_000,
      surplus: 2_000_000,
    }))
    const firstNow = new Date("2026-07-15T00:00:00.000Z")
    const secondNow = new Date("2026-08-15T00:00:00.000Z")
    const view = renderForecast({ monthlyData, now: firstNow.getTime() })

    expect(screen.getByText(`${computeForecast(monthlyData, { now: firstNow }).projectionMonth} (proyeksi)`)).toBeInTheDocument()

    view.rerender(<CashFlowForecast monthlyData={monthlyData} transactions={[]} bills={[]} now={secondNow.getTime()} />)

    expect(screen.getByText(`${computeForecast(monthlyData, { now: secondNow }).projectionMonth} (proyeksi)`)).toBeInTheDocument()
  })

  it("opens the approved formula sheet from the chart, Info button, and keyboard activation", () => {
    renderForecast()
    const chart = screen.getByRole("button", { name: "Buka rumus proyeksi arus kas" })
    const infoButton = screen.getByRole("button", { name: "Info proyeksi arus kas" })

    fireEvent.click(infoButton)
    expect(screen.getByRole("dialog")).toHaveTextContent("Rumus Proyeksi Arus Kas")
    expect(screen.getByText("Proyeksi ini dihitung berdasarkan hingga enam bulan lengkap terakhir, dengan mempertimbangkan pola pemasukan, pengeluaran, tagihan, dan pembayaran terjadwal.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    fireEvent.click(chart)
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    fireEvent.keyDown(chart, { key: "Enter" })
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    fireEvent.keyDown(chart, { key: " " })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it.each([
    ["loading", { billsLoading: true }, "Memuat tagihan terjadwal…"],
    ["error", { billsError: "failed" }, "Proyeksi arus kas belum tersedia."],
  ])("does not show a projected number while bills are %s", (_state, props, message) => {
    renderForecast(props)

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.queryByText(/Rp/)).not.toBeInTheDocument()
  })

  it("keeps the insufficient-data branch safe when projections are null", () => {
    renderForecast({ monthlyData: createMonthlyData(2) })

    expect(screen.getByText("Butuh minimal 3 bulan lengkap untuk proyeksi.")).toBeInTheDocument()
    expect(screen.queryByText(/Rp/)).not.toBeInTheDocument()
  })

  it("renders a numeric forecast with exactly three complete months", () => {
    const monthlyData = createMonthlyData(3)
    const expectedForecast = computeForecast(monthlyData)

    renderForecast({ monthlyData })

    expect(expectedForecast.insufficientData).toBe(false)
    expect(screen.getByText(formatRp(expectedForecast.projectedIncome))).toBeInTheDocument()
  })
})
