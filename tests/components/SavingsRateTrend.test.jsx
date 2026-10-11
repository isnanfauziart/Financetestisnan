import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"

import SavingsRateTrend from "@/components/SavingsRateTrend"

vi.mock("recharts", () => ({
  AreaChart: ({ children }) => <svg data-testid="savings-rate-chart">{children}</svg>,
  Area: () => <g />,
  Line: () => <g />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  ReferenceLine: () => null,
}))

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

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("SavingsRateTrend", () => {
  it("prefers routine expense fields for the displayed savings-rate series", () => {
    render(
      <SavingsRateTrend
        monthlyData={[
          { month: "Jul", year: "2026", pemasukan: 5_000_000, pengeluaran: 1_000_000, pengeluaranRutin: 1_000_000 },
          { month: "Agu", year: "2026", pemasukan: 5_000_000, pengeluaran: 11_000_000, pengeluaranRutin: 1_000_000 },
        ]}
      />
    )

    expect(screen.getAllByText("80.0%").length).toBeGreaterThan(0)
    expect(screen.queryAllByText("-120.0%")).toHaveLength(0)
  })

  it("renders an independent range chip defaulting to 12 bln", () => {
    const monthlyData = Array.from({ length: 14 }, (_, i) => ({
      month: `M${i}`, year: "2026", pemasukan: 5_000_000, pengeluaran: 1_000_000,
    }))
    render(<SavingsRateTrend monthlyData={monthlyData} />)

    const chips = screen.getByRole("radiogroup", { name: "Rentang tren savings rate" })
    expect(within(chips).getByRole("radio", { name: "12 bln", checked: true })).toBeInTheDocument()
    // 14 months in, 12 shown: window label covers the last 12 entries.
    expect(screen.getByText(/M2 2026 – M13 2026/)).toBeInTheDocument()
  })

  it("limits the chart window from the chip and reports best/worst months", () => {
    const monthlyData = Array.from({ length: 8 }, (_, i) => ({
      month: `M${i}`,
      year: "2026",
      pemasukan: 5_000_000,
      // Best rate at M6 (lowest expense), worst at M7.
      pengeluaran: i === 6 ? 500_000 : i === 7 ? 4_000_000 : 1_000_000,
    }))
    const onSpanChange = vi.fn()
    render(<SavingsRateTrend monthlyData={monthlyData} span="6 bln" onSpanChange={onSpanChange} />)

    expect(screen.getByText(/M2 2026 – M7 2026/)).toBeInTheDocument()
    expect(screen.getByText("90.0% (M6)")).toBeInTheDocument()
    expect(screen.getByText("20.0% (M7)")).toBeInTheDocument()

    const chips = screen.getByRole("radiogroup", { name: "Rentang tren savings rate" })
    fireEvent.click(within(chips).getByRole("radio", { name: "Semua" }))
    expect(onSpanChange).toHaveBeenCalledWith("Semua")
  })

  it("ends the window at the anchor month when one is selected", () => {
    const monthlyData = Array.from({ length: 8 }, (_, i) => ({
      month: `M${i}`, year: "2026", pemasukan: 5_000_000, pengeluaran: 1_000_000,
    }))
    render(
      <SavingsRateTrend
        monthlyData={monthlyData}
        span="6 bln"
        anchor={{ month: "M5", year: "2026" }}
      />
    )

    expect(screen.getByText(/M0 2026 – M5 2026/)).toBeInTheDocument()
    expect(screen.getByText(/berakhir di bulan pilihan/)).toBeInTheDocument()
  })
})
