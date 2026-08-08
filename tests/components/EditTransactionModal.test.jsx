import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import EditTransactionModal from "@/app/dashboard/_components/EditTransactionModal"

vi.mock("@/lib/useSharedData", async (importOriginal) => ({
  ...(await importOriginal()),
  useSettings: vi.fn(),
}))

const { useSettings } = await import("@/lib/useSharedData")

function transaction(overrides = {}) {
  return {
    id: "tx-1",
    type: "expense",
    date: "8 Agu 2026",
    category: "Kondangan",
    amount: 250000,
    account: "BCA",
    desc: "Amplop",
    rowIndex: 2,
    ...overrides,
  }
}

describe("EditTransactionModal special expense classification", () => {
  beforeEach(() => {
    useSettings.mockReturnValue({
      settings: {
        categories: {
          expense: [{ name: "Kondangan", icon: "Gift", active: true }],
          income: [{ name: "Gaji", icon: "Coins", active: true }],
        },
      },
    })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  it("initializes missing expense class as routine and sends selected Spesial in PUT", async () => {
    render(<EditTransactionModal transaction={transaction()} onClose={vi.fn()} onSaved={vi.fn()} />)

    expect(screen.getByLabelText("Pengeluaran Spesial")).not.toBeChecked()
    fireEvent.click(screen.getByLabelText("Pengeluaran Spesial"))
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }))

    await waitFor(() => {
      expect(global.fetch.mock.calls.some(([url, options]) => (
        String(url).includes("/api/transaction/tx-1") && options?.method === "PUT"
      ))).toBe(true)
    })
    const putCall = global.fetch.mock.calls.find(([url, options]) => (
      String(url).includes("/api/transaction/tx-1") && options?.method === "PUT"
    ))
    expect(JSON.parse(putCall[1].body)).toEqual(expect.objectContaining({
      type: "expense",
      sifat: "Spesial",
    }))
  })

  it("does not render the classification control for income edits", () => {
    render(<EditTransactionModal transaction={transaction({ type: "income" })} onClose={vi.fn()} onSaved={vi.fn()} />)

    expect(screen.queryByLabelText("Pengeluaran Spesial")).not.toBeInTheDocument()
  })
})
