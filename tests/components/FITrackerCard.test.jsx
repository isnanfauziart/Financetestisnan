import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import FITrackerCard from "@/components/FITrackerCard"

vi.mock("@/app/dashboard/_components/helpers", async () => {
  const actual = await vi.importActual("@/app/dashboard/_components/helpers")
  return {
    ...actual,
    useCountUp: (value) => value,
  }
})

function renderCard(props = {}) {
  return render(
    <FITrackerCard
      netWorth={5000000}
      monthlyData={[
        { month: "Jan", year: "2026", pemasukan: 10000000, pengeluaran: 4000000, tabungan: 0 },
        { month: "Feb", year: "2026", pemasukan: 11000000, pengeluaran: 5000000, tabungan: 0 },
        { month: "Mar", year: "2026", pemasukan: 12000000, pengeluaran: 6000000, tabungan: 0 },
      ]}
      {...props}
    />
  )
}

describe("FITrackerCard", () => {
  it("renders the FI card as content with a separate formula button", () => {
    renderCard()

    expect(screen.getByRole("heading", { name: /target kebebasan finansial/i })).toBeInTheDocument()
    expect(screen.getByText(/financial independence/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /pelajari rumus fi/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /ketuk untuk melihat penjelasan/i })).toBeNull()
  })

  it("exposes progressbar semantics with bounded values", () => {
    renderCard()

    const progressbar = screen.getByRole("progressbar", { name: /progres menuju financial independence/i })
    expect(progressbar).toHaveAttribute("aria-valuemin", "0")
    expect(progressbar).toHaveAttribute("aria-valuemax", "100")
    expect(Number(progressbar.getAttribute("aria-valuenow"))).toBeGreaterThanOrEqual(0)
    expect(Number(progressbar.getAttribute("aria-valuenow"))).toBeLessThanOrEqual(100)
  })

  it("shows an achieved state instead of a past FI date when target is reached", () => {
    renderCard({ netWorth: 2000000000 })

    expect(screen.getAllByText(/target fi tercapai/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/100\.0% dari target/i)).toBeInTheDocument()
    expect(screen.queryByText(/tahun lagi/i)).toBeNull()
  })

  it("clamps negative progress to zero and shows debt-first guidance", () => {
    renderCard({ netWorth: -2000000 })

    expect(screen.getByText(/0\.0% dari target/i)).toBeInTheDocument()
    expect(screen.getByText(/net worth masih negatif/i)).toBeInTheDocument()
  })

  it("uses a common trailing window and labels monthly cash-flow surplus clearly", () => {
    renderCard({
      monthlyData: [
        { month: "Jan", year: "2026", pemasukan: 10000000, pengeluaran: 4000000, tabungan: 0 },
        { month: "Feb", year: "2026", pemasukan: 0, pengeluaran: 0, tabungan: 0 },
        { month: "Mar", year: "2026", pemasukan: 0, pengeluaran: 1000000, tabungan: 0 },
      ],
    })

    expect(screen.getByText(/surplus\/bulan/i)).toBeInTheDocument()
    expect(screen.getByText(/berdasarkan rata-rata 3 bulan terakhir/i)).toBeInTheDocument()
    expect(screen.getByText(/rp 1\.7 jt/i)).toBeInTheDocument()
  })

  it("shows a specific missing-data state when expenses are missing", () => {
    renderCard({
      monthlyData: [
        { month: "Jan", year: "2026", pemasukan: 10000000, pengeluaran: 0, tabungan: 0 },
        { month: "Feb", year: "2026", pemasukan: 11000000, pengeluaran: 0, tabungan: 0 },
        { month: "Mar", year: "2026", pemasukan: 12000000, pengeluaran: 0, tabungan: 0 },
      ],
    })

    expect(screen.getByText(/tambahkan pengeluaran agar target fi dapat dihitung/i)).toBeInTheDocument()
  })

  it("opens the formula sheet from the dedicated button and shows the uncertainty disclaimer", () => {
    renderCard()

    fireEvent.click(screen.getByRole("button", { name: /pelajari rumus fi/i }))

    expect(screen.getByRole("dialog", { name: /rumus financial independence/i })).toBeInTheDocument()
    expect(screen.getAllByText(/estimasi edukatif, bukan jaminan atau nasihat investasi/i).length).toBeGreaterThan(0)
  })
})
