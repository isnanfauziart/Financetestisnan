import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import FITrackerCard from "@/components/FITrackerCard"

vi.mock("@/lib/useSharedData", () => ({
  useSettings: () => ({ settings: {}, refetch: vi.fn() }),
}))

const NOW = new Date("2026-06-15T00:00:00.000Z")

function renderCard(props = {}) {
  return render(
    <FITrackerCard
      netWorth={500000000}
      monthlyData={[
        { month: "Jan", year: "2026", pemasukan: 10000000, pengeluaran: 4000000, tabungan: 0 },
        { month: "Feb", year: "2026", pemasukan: 11000000, pengeluaran: 0, tabungan: 0 },
        { month: "Mar", year: "2026", pemasukan: 12000000, pengeluaran: 6000000, tabungan: 0 },
        { month: "Apr", year: "2026", pemasukan: 14000000, pengeluaran: 8000000, tabungan: 0 },
        { month: "Mei", year: "2026", pemasukan: 15000000, pengeluaran: 10000000, tabungan: 0 },
        { month: "Jun", year: "2026", pemasukan: 100000000, pengeluaran: 99000000, tabungan: 0 },
      ]}
      netWorthHistory={[
        { month: "Jan", year: "2026", value: 300000000 },
        { month: "Mar", year: "2026", value: 400000000 },
        { month: "Mei", year: "2026", value: 500000000 },
      ]}
      now={NOW}
      {...props}
    />
  )
}

describe("FITrackerCard", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
  })

  it("shows the automatically calculated target before ETA and progress", () => {
    renderCard()

    expect(screen.getByRole("heading", { name: /target bebas finansial/i })).toBeInTheDocument()
    expect(screen.getAllByText((content) => content.replace(/\s/g, "").includes("Rp2.100.000.000")).length).toBeGreaterThan(0)
    expect(screen.getByText(/dengan pola keuanganmu sekarang/i)).toBeInTheDocument()
    expect(screen.getByText(/4 bulan selesai/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /cara menghitung/i })).toBeInTheDocument()
    expect(screen.queryByText(/fi number|fi index|financial freedom progress|sensitivitas|target aset|net worth/i)).toBeNull()
  })

  it("exposes automatic progress and an accessible compact line-chart summary", () => {
    renderCard()

    const progressbar = screen.getByRole("progressbar", { name: /progres kekayaan bersih tercatat/i })
    expect(progressbar).toHaveAttribute("aria-valuemin", "0")
    expect(progressbar).toHaveAttribute("aria-valuemax", "100")
    expect(Number(progressbar.getAttribute("aria-valuenow"))).toBeGreaterThanOrEqual(0)
    expect(Number(progressbar.getAttribute("aria-valuenow"))).toBeLessThanOrEqual(100)
    expect(screen.getByRole("img", { name: /proyeksi/i })).toBeInTheDocument()
    expect(screen.getByText(/proyeksi kekayaan bersih tercatat/i)).toBeInTheDocument()
    expect(document.querySelector(".recharts-reference-line")).toBeInTheDocument()
  })

  it("does not claim retirement certainty when recorded wealth reaches the target", () => {
    renderCard({ netWorth: 2100000000 })

    expect(screen.getByText(/kekayaan bersih tercatat sudah menyamai angka patokan/i)).toBeInTheDocument()
    expect(screen.getByText(/bukan kepastian bebas finansial/i)).toBeInTheDocument()
    expect(screen.getByText(/100% dari target/i)).toBeInTheDocument()
  })

  it("clamps negative progress to zero and keeps the recorded-wealth wording", () => {
    renderCard({ netWorth: -2000000 })

    expect(screen.getByText(/0% dari target/i)).toBeInTheDocument()
    expect(screen.getByText(/kekayaan bersih tercatat masih negatif/i)).toBeInTheDocument()
  })

  it("keeps actual surplus separate from a custom target basis", async () => {
    renderCard({ monthlyExpenseOverride: 12000000 })

    expect(screen.getAllByText((content) => content.replace(/\s/g, "").includes("Rp3.600.000.000")).length).toBeGreaterThan(0)
    expect(screen.getByText(/Rp 5\.8 jt/i)).toBeInTheDocument()
    expect(screen.getByRole("note")).toHaveTextContent(/disarankan menggunakan nominal pengeluaran aktualmu/i)

    fireEvent.click(screen.getByRole("button", { name: /^ubah$/i }))
    fireEvent.click(screen.getByRole("button", { name: /gunakan pengeluaran aktual/i }))

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/settings", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ updates: [["financialFreedomMonthlyExpenseOverride", null]] }),
    })))
  })

  it("lets the user edit the target basis without asking on first use", () => {
    renderCard({
      monthlyData: [
        { month: "Mei", year: "2026", pemasukan: 12000000, pengeluaran: 6000000 },
      ],
    })

    expect(screen.getByText(/butuh minimal 2 bulan selesai/i)).toBeInTheDocument()
    expect(screen.queryByRole("spinbutton")).toBeNull()
    expect(screen.getByRole("button", { name: /^ubah$/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /^ubah$/i }))
    expect(screen.getByRole("spinbutton", { name: /pengeluaran bulanan/i })).toBeInTheDocument()
  })

  it("shows a non-positive surplus state instead of inventing an ETA", () => {
    renderCard({
      monthlyData: [
        { month: "Apr", year: "2026", pemasukan: 3000000, pengeluaran: 4000000 },
        { month: "Mei", year: "2026", pemasukan: 3000000, pengeluaran: 4000000 },
      ],
    })

    expect(screen.getByText(/belum bisa diperkirakan/i)).toBeInTheDocument()
    expect(screen.getByText(/surplus aktual bulanan belum positif/i)).toBeInTheDocument()
  })

  it("shows a specific missing-data state when completed expenses are missing", () => {
    renderCard({
      monthlyData: [
        { month: "Jan", year: "2026", pemasukan: 10000000, pengeluaran: 0, tabungan: 0 },
        { month: "Feb", year: "2026", pemasukan: 11000000, pengeluaran: 0, tabungan: 0 },
        { month: "Mar", year: "2026", pemasukan: 12000000, pengeluaran: 0, tabungan: 0 },
      ],
    })

    expect(screen.getByText(/butuh minimal 2 bulan selesai/i)).toBeInTheDocument()
  })

  it("opens the calculation sheet from the dedicated button", () => {
    renderCard()

    fireEvent.click(screen.getByRole("button", { name: /cara menghitung/i }))

    expect(screen.getByRole("dialog", { name: /cara menghitung/i })).toBeInTheDocument()
    expect(screen.getByText(/rata-rata pengeluaran aktual bulanan/i)).toBeInTheDocument()
    expect(screen.getAllByText(/bukan jaminan/i).length).toBeGreaterThan(0)
  })

  it("describes the target, recorded wealth, ETA, and surplus-based dashed estimate", () => {
    renderCard()

    expect(screen.getByText(/target rp 2\.100\.000\.000.*kekayaan bersih tercatat saat ini rp 500\.000\.000.*perkiraan pencapaian/i)).toBeInTheDocument()
    expect(screen.getByText(/garis putus-putus adalah estimasi sederhana berbasis surplus bulanan/i)).toBeInTheDocument()
  })
})
