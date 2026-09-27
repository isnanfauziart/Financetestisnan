import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import ChartTile from "@/components/charts/ChartTile"
import StatTile from "@/components/charts/StatTile"
import ChartTooltip from "@/components/charts/ChartTooltip"
import { Sparkline, DumbbellChart } from "@/components/charts/Sparkline"
import { chartTheme, resolveChartTheme } from "@/lib/chartTheme"
import { themes as md3Themes } from "@/lib/designTokens"

describe("ChartTile", () => {
  it("renders title, basis note, badge, legend, body, and table", () => {
    render(
      <ChartTile
        title="Pemasukan vs Pengeluaran"
        basis="Dasar: Semua transaksi"
        badge="3 bulan"
        legend={[
          { label: "Pemasukan", kind: "swatch", color: "#2F6B57" },
          { label: "Proyeksi", kind: "dash", color: "#8A5A00" },
        ]}
        table={{ id: "t1", caption: "Data arus kas", columns: ["Bulan"], rows: [{ label: "Jan", values: ["Rp 5 jt"] }] }}
      >
        <div>chart-body</div>
      </ChartTile>,
    )

    expect(screen.getByRole("heading", { name: "Pemasukan vs Pengeluaran" })).toBeInTheDocument()
    expect(screen.getByText("Dasar: Semua transaksi")).toBeInTheDocument()
    expect(screen.getByText("3 bulan")).toBeInTheDocument()
    expect(screen.getByText("Pemasukan")).toBeInTheDocument()
    expect(screen.getByText("Proyeksi")).toBeInTheDocument()
    expect(screen.getByText("chart-body")).toBeInTheDocument()

    const toggle = screen.getByRole("button", { name: "Lihat data sebagai tabel" })
    expect(toggle).toHaveAttribute("aria-controls", "t1")
  })

  it("renders the skeleton in loading state and empty state when marked", () => {
    const { container, rerender } = render(<ChartTile title="T" loading skeletonHeight={240}><div>body</div></ChartTile>)
    expect(container.querySelector(".shimmer-bg")).toHaveStyle({ height: "240px" })
    expect(screen.queryByText("body")).not.toBeInTheDocument()

    rerender(
      <ChartTile title="T" isEmpty emptyIcon={<span>icon</span>} emptyTitle="Belum ada data arus kas" emptyHint="Coba rentang lain"><div>body</div></ChartTile>,
    )
    expect(screen.getByText("Belum ada data arus kas")).toBeInTheDocument()
    expect(screen.getByText("Coba rentang lain")).toBeInTheDocument()
    expect(screen.queryByText("body")).not.toBeInTheDocument()
  })
})

describe("StatTile", () => {
  it("renders label and value with the semantic tone", () => {
    render(<StatTile label="Pemasukan" value="Rp 5,0 jt" tone="income" />)
    const tile = screen.getByText("Pemasukan").closest("div")
    expect(tile).toHaveTextContent("Rp 5,0 jt")
  })
})

describe("Sparkline", () => {
  it("draws a line path over the given points", () => {
    const { container } = render(
      <svg><Sparkline points={[1, 2, 3, 2]} width={100} height={32} color="#6E59B5" /></svg>,
    )
    const path = container.querySelector("path[fill=none]")
    expect(path).toBeTruthy()
    expect(path.getAttribute("d")).toMatch(/^M/)
  })

  it("renders an end dot when requested", () => {
    const { container } = render(
      <svg><Sparkline points={[1, 2, 3]} endDot /></svg>,
    )
    expect(container.querySelectorAll("circle")).toHaveLength(1)
  })
})

describe("DumbbellChart", () => {
  it("renders a stem and two dots per row", () => {
    const { container } = render(
      <svg>
        <DumbbellChart
          rows={[{ a: 10, b: 4 }, { a: 2, b: 8 }]}
          domain={[0, 10]}
          width={200}
          rowHeight={30}
        />
      </svg>,
    )
    expect(container.querySelectorAll("circle")).toHaveLength(4)
    expect(container.querySelectorAll("line")).toHaveLength(2)
  })

  it("renders value labels when a formatter is provided", () => {
    const { container } = render(
      <svg>
        <DumbbellChart rows={[{ a: 10, b: 4 }]} domain={[0, 10]} formatValue={value => `${value}jt`} />
      </svg>,
    )
    const texts = [...container.querySelectorAll("text")]
    expect(texts.map(node => node.textContent)).toEqual(["10jt", "4jt"])
  })
})

describe("ChartTooltip", () => {
  const activePayload = { active: true, payload: [{ name: "Pemasukan", value: 5_000_000, color: "#2F6B57" }], label: "Jan" }

  it("renders nothing when inactive", () => {
    const { container } = render(<ChartTooltip active={false} payload={[]} label="Jan" />)
    expect(container.firstChild).toBeNull()
  })

  it("renders payload entries with full rupiah formatting", () => {
    render(<ChartTooltip {...activePayload} />)
    expect(screen.getByText("Pemasukan:")).toBeInTheDocument()
    expect(screen.getByText("Rp 5.000.000")).toBeInTheDocument()
    expect(screen.getByText("Jan")).toBeInTheDocument()
  })

  it("supports percent unit and custom formatter in payload mode", () => {
    render(<ChartTooltip active payload={[{ name: "Rate", value: 22.5 }]} label="Jan" unit="%" />)
    expect(screen.getByText("22.5%")).toBeInTheDocument()

    render(<ChartTooltip active payload={[{ name: "Rate", value: 22.5 }]} label="Jan" formatValue={value => `${value.toFixed(0)} persen`} />)
    expect(screen.getByText("23 persen")).toBeInTheDocument()
  })

  it("renders row-object entries with per-entry formatters and color functions", () => {
    render(
      <ChartTooltip
        active
        payload={[{ payload: { label: "Agu", surplus: -150_000, pemasukan: 4_000_000, pengeluaran: 4_150_000 } }]}
        label="Agu (proyeksi)"
        entries={[
          { key: "pemasukan", label: "Pemasukan", color: "#2F6B57", format: value => `Rp ${(value / 1e6).toFixed(1)} jt` },
          { key: "pengeluaran", label: "Pengeluaran", color: "#A45343", format: value => `Rp ${(value / 1e6).toFixed(1)} jt` },
          { key: "surplus", label: "Surplus", color: row => (row.surplus >= 0 ? "#2D6A62" : "#B33A3A"), format: value => `Rp ${(value / 1e6).toFixed(1)} jt` },
          { key: "hilang", label: "Tidak dirender" },
        ]}
      />,
    )
    expect(screen.getByText("Pemasukan:")).toBeInTheDocument()
    expect(screen.getByText("Rp 4.0 jt")).toBeInTheDocument()
    expect(screen.getByText("Surplus:")).toBeInTheDocument()
    expect(screen.queryByText("Tidak dirender:")).not.toBeInTheDocument()
  })

  it("omits null row values so forecast lines do not render ghost rows", () => {
    render(
      <ChartTooltip
        active
        payload={[{ payload: { label: "Sep", surplusActual: 1_000_000, surplusForecast: null } }]}
        entries={[
          { key: "surplusActual", label: "Aktual", format: value => `Rp ${value}` },
          { key: "surplusForecast", label: "Proyeksi", format: value => `Rp ${value}` },
        ]}
      />,
    )
    expect(screen.getByText("Aktual:")).toBeInTheDocument()
    expect(screen.queryByText("Proyeksi:")).not.toBeInTheDocument()
  })
})

describe("resolveChartTheme", () => {
  it("keeps the light theme identical to the legacy snapshot", () => {
    expect(resolveChartTheme(false)).toBe(chartTheme)
  })

  it("resolves dark values from the dark token set", () => {
    const dark = resolveChartTheme(true)
    expect(dark.axisTick.fill).toBe(md3Themes.dark.onSurfaceVariant)
    expect(dark.gridStroke).toBe(md3Themes.dark.outlineVariant)
    expect(dark.seriesPalette).toHaveLength(chartTheme.seriesPalette.length)
    expect(dark.heatmap.ramp).toHaveLength(chartTheme.heatmap.ramp.length)
  })
})
