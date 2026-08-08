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
