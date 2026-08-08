import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

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
})
