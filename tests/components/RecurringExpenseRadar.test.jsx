import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import RecurringExpenseRadar from "@/components/RecurringExpenseRadar"

const NOW = new Date("2026-08-20T04:00:00.000Z")
const transactions = ["Mei", "Jun", "Jul"].map((month, index) => ({
  id: `tx-${index}`,
  date: `${index + 5} ${month} 2026`,
  desc: "Netflix",
  category: "Hiburan",
  account: "Bank BCA",
  amount: 100000,
  type: "expense",
}))

describe("RecurringExpenseRadar", () => {
  it("shows a candidate and exposes add and dismiss actions", async () => {
    const onAdd = vi.fn()
    const onDismiss = vi.fn().mockResolvedValue(undefined)
    render(<RecurringExpenseRadar transactions={transactions} now={NOW} onAdd={onAdd} onDismiss={onDismiss} />)

    expect(screen.getByRole("heading", { name: "Pola pengeluaran rutin" })).toBeInTheDocument()
    expect(screen.getByText("Netflix")).toBeInTheDocument()
    expect(screen.getByText("Rp 100.000")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /jadikan tagihan netflix/i }))
    fireEvent.click(screen.getByRole("button", { name: /sembunyikan netflix/i }))

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ description: "Netflix", medianAmount: 100000 }))
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith("recurring:v1:netflix|hiburan|bank bca"))
  })

  it("renders nothing when no recurring pattern qualifies", () => {
    const { container } = render(<RecurringExpenseRadar transactions={transactions.slice(0, 2)} now={NOW} />)
    expect(container).toBeEmptyDOMElement()
  })
})
