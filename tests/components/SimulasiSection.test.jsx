import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import SimulasiSection from "@/components/SimulasiSection"

const monthlyData = [
  { month: "Mei", year: "2026", pemasukan: 9000000, pengeluaran: 5000000 },
  { month: "Jun", year: "2026", pemasukan: 9000000, pengeluaran: 5200000 },
  { month: "Jul", year: "2026", pemasukan: 9000000, pengeluaran: 4800000 },
  { month: "Agu", year: "2026", pemasukan: 9000000, pengeluaran: 5100000 },
]

const now = new Date("2026-10-18T07:00:00+07:00")

const transactions = [
  { type: "expense", category: "Jajan", amount: 500000, month: "Okt", year: "2026" },
]

const bills = [
  { id: "b1", nama: "Internet", jumlah: 250000, aktif: true },
  { id: "b2", nama: "Listrik", jumlah: 400000, aktif: true },
]

describe("SimulasiSection", () => {
  it("shows the projected end-of-month balance from the forecast baseline", () => {
    render(
      <SimulasiSection
        monthlyData={monthlyData}
        transactions={transactions}
        bills={bills}
        availableBalance={1400000}
        now={now}
        onApplyScenario={vi.fn()}
      />,
    )

    expect(screen.getByText("Proyeksi saldo akhir bulan")).toBeInTheDocument()
    // Surplus ≈ 9jt − ~5.03jt ≈ 3.97jt; baseline = 1.4jt + surplus.
    expect(screen.getByTestId("simulasi-section")).toHaveTextContent("Rp")
  })

  it("renders the three what-if scenarios with deltas vs baseline", () => {
    render(
      <SimulasiSection
        monthlyData={monthlyData}
        transactions={transactions}
        bills={bills}
        availableBalance={1400000}
        now={now}
        onApplyScenario={vi.fn()}
      />,
    )

    expect(screen.getByText("Nabung Rp 500 rb")).toBeInTheDocument()
    expect(screen.getByText("Jajan −20%")).toBeInTheDocument()
    // Largest bill (Listrik 400rb) becomes the third scenario.
    expect(screen.getByText("Tanpa Listrik")).toBeInTheDocument()
    // Delta chips vs baseline.
    expect(screen.getByText("+Rp 500.000")).toBeInTheDocument()
    expect(screen.getByText("+Rp 100.000")).toBeInTheDocument()
    expect(screen.getByText("+Rp 400.000")).toBeInTheDocument()
  })

  it("applies a scenario through the callback", () => {
    const onApplyScenario = vi.fn()
    render(
      <SimulasiSection
        monthlyData={monthlyData}
        transactions={transactions}
        bills={bills}
        availableBalance={1400000}
        now={now}
        onApplyScenario={onApplyScenario}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Terapkan skenario Nabung Rp 500 rb" }))
    expect(onApplyScenario).toHaveBeenCalledWith("save")

    fireEvent.click(screen.getByRole("button", { name: "Terapkan skenario Tanpa Listrik" }))
    expect(onApplyScenario).toHaveBeenCalledWith("bill")
  })

  it("shows an honest empty state when forecast data is insufficient", () => {
    render(
      <SimulasiSection
        monthlyData={[{ month: "Agu", year: "2026", pemasukan: 9000000, pengeluaran: 5000000 }]}
        transactions={[]}
        bills={[]}
        availableBalance={1400000}
        now={now}
        onApplyScenario={vi.fn()}
      />,
    )

    expect(screen.getByText("Belum cukup data untuk simulasi")).toBeInTheDocument()
    expect(screen.queryByText("Nabung Rp 500 rb")).not.toBeInTheDocument()
  })
})
