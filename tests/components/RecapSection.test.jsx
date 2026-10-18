import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import RecapSection from "@/app/dashboard/_components/RecapSection"

vi.mock("@/lib/useSharedData", async (importOriginal) => ({
  ...(await importOriginal()),
  useSettings: vi.fn(),
}))

const { useSettings } = await import("@/lib/useSharedData")

describe("RecapSection special expense totals", () => {
  beforeEach(() => {
    useSettings.mockReturnValue({ settings: { categories: {} } })
  })

  it("shows actual, routine, and special expense totals for each month", () => {
    render(
      <RecapSection
        transactions={[
          { id: "routine", type: "expense", category: "Makan", amount: 100000, month: "Agu", year: "2026", date: "8 Agu 2026", expenseClass: "routine" },
          { id: "special", type: "expense", category: "Laptop", amount: 1000000, month: "Agu", year: "2026", date: "7 Agu 2026", expenseClass: "special" },
          { id: "income", type: "income", category: "Gaji", amount: 3000000, month: "Agu", year: "2026", date: "1 Agu 2026" },
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText("Aktual")).toBeInTheDocument()
    expect(screen.getAllByText("Rutin").some(node => node.tagName.toLowerCase() === "p")).toBe(true)
    expect(screen.getAllByText("Spesial").some(node => node.tagName.toLowerCase() === "p")).toBe(true)
    expect(screen.getByText("Rp 1.1 jt")).toBeInTheDocument()
    expect(screen.getByText("Rp 100 rb")).toBeInTheDocument()
    expect(screen.getByText("Rp 1.0 jt")).toBeInTheDocument()
  })
})

describe("RecapSection global filter seeding", () => {
  beforeEach(() => {
    useSettings.mockReturnValue({ settings: { categories: {} } })
  })

  const txs = [
    { id: "a", type: "expense", category: "Makan", amount: 100000, month: "Agu", year: "2026", date: "8 Agu 2026", expenseClass: "routine", account: "BCA" },
    { id: "b", type: "expense", category: "Makan", amount: 200000, month: "Sep", year: "2026", date: "8 Sep 2026", expenseClass: "routine", account: "BCA" },
  ]

  it("seeds the report filters from the global Statistik filters and shows the chip", async () => {
    const { fireEvent } = await import("@testing-library/react")
    render(
      <RecapSection
        transactions={txs}
        globalFilter={{ month: "Agu", year: "2026", account: "BCA" }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    // Seeded: only the Agu group renders, and the following-global chip shows.
    expect(screen.getByText("Mengikuti filter global")).toBeInTheDocument()
    expect(screen.queryByText("Filter khusus laporan")).not.toBeInTheDocument()
    expect(screen.getByText(/1 bulan/)).toBeInTheDocument()

    // Override the month -> badge switches to "filter khusus laporan".
    fireEvent.click(screen.getByRole("button", { name: "Bulan" }))
    fireEvent.click(screen.getByRole("option", { name: "Sep" }))
    expect(screen.getByText("Filter khusus laporan")).toBeInTheDocument()

    // "Atur Ulang" returns to the global seed.
    fireEvent.click(screen.getByRole("button", { name: /atur ulang filter laporan/i }))
    expect(screen.getByText("Mengikuti filter global")).toBeInTheDocument()
  })
})
