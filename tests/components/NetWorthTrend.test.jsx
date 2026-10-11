import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import NetWorthTrend from "@/components/NetWorthTrend"

const captured = vi.hoisted(() => ({ xaxis: null }))
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  ComposedChart: ({ children }) => <svg>{children}</svg>,
  Area: () => <g />,
  Line: () => <g />,
  XAxis: (props) => {
    captured.xaxis = props
    return null
  },
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

beforeEach(() => {
  captured.xaxis = null
})

const fourMonths = [
  { key: "2026-06", month: "Jun", year: "2026", value: 15200000 },
  { key: "2026-07", month: "Jul", year: "2026", value: 16100000 },
  { key: "2026-08", month: "Agu", year: "2026", value: 17400000 },
  { key: "2026-09", month: "Sep", year: "2026", value: 18800000 },
]

describe("NetWorthTrend", () => {
  it("shows an honest empty state under 2 points", () => {
    render(<NetWorthTrend history={fourMonths.slice(0, 1)} />)
    expect(screen.getByText("Belum cukup riwayat")).toBeInTheDocument()
    expect(screen.queryByText(/Rp 18\.8 jt/)).not.toBeInTheDocument()
  })

  it("renders the headline, delta chip, and section for a growth trend", () => {
    render(<NetWorthTrend history={fourMonths} />)
    expect(screen.getByRole("region", { name: "Tren kekayaan bersih" })).toBeInTheDocument()
    expect(screen.getByText("Rp 18.800.000")).toBeInTheDocument()
    expect(screen.getByText("+Rp 3.6 jt · 4 bln")).toBeInTheDocument()
  })

  it("flips the delta chip to terracotta on a decline", () => {
    const declining = [
      { key: "2026-06", month: "Jun", year: "2026", value: 19500000 },
      { key: "2026-07", month: "Jul", year: "2026", value: 18900000 },
      { key: "2026-08", month: "Agu", year: "2026", value: 18200000 },
      { key: "2026-09", month: "Sep", year: "2026", value: 17800000 },
    ]
    render(<NetWorthTrend history={declining} />)
    const chip = screen.getByText("−Rp 1.7 jt · 4 bln")
    expect(chip).toBeInTheDocument()
    expect(chip.className).toContain("bg-clay-100")
  })

  it("masks amounts in privacy mode", () => {
    render(<NetWorthTrend history={fourMonths} moneyHidden />)
    expect(screen.getByText("Rp ••••••••")).toBeInTheDocument()
    expect(screen.queryByText("Rp 18.8 jt")).not.toBeInTheDocument()
  })

  it("thins x-axis labels past 12 points without dropping data", () => {
    const long = Array.from({ length: 18 }, (_, i) => ({
      key: `k-${String(i).padStart(2, "0")}`,
      month: "M",
      year: "2026",
      value: 10000000 + i * 500000,
    }))
    render(<NetWorthTrend history={long} />)
    expect(captured.xaxis.interval).toBe(2)
    expect(screen.getByText("+Rp 8.5 jt · 18 bln")).toBeInTheDocument()
  })

  it("keeps every month label for short histories", () => {
    render(<NetWorthTrend history={fourMonths} />)
    expect(captured.xaxis.interval).toBe(0)
  })
})
