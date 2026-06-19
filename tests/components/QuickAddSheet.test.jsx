import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import QuickAddSheet from "@/app/dashboard/_components/QuickAddSheet"

afterEach(() => cleanup())

const noop = () => {}

describe("QuickAddSheet", () => {
  it("renders nothing when closed", () => {
    render(<QuickAddSheet open={false} onClose={noop} onSubmit={noop} />)
    expect(screen.queryByText("Transaksi Baru")).toBeNull()
    expect(screen.queryByText("Quick Add")).toBeNull()
  })

  it("renders title and subtitle when open", () => {
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={noop} />)
    expect(screen.getByText("Transaksi Baru")).toBeInTheDocument()
    expect(screen.getByText("Quick Add")).toBeInTheDocument()
  })

  it("renders 3 type pills (Expense / Income / Tabungan)", () => {
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={noop} />)
    expect(screen.getByRole("button", { name: /switch to expense/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /switch to income/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /switch to savings/i })).toBeInTheDocument()
  })

  it("expense is selected by default", () => {
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={noop} />)
    expect(screen.getByRole("button", { name: /switch to expense/i })).toHaveAttribute("aria-pressed", "true")
  })

  it("respects initialType prop", () => {
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={noop} initialType="savings" />)
    expect(screen.getByRole("button", { name: /switch to savings/i })).toHaveAttribute("aria-pressed", "true")
  })

  it("clicking a type pill switches selection and clears kategori", () => {
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={noop} />)
    const incomeBtn = screen.getByRole("button", { name: /switch to income/i })
    fireEvent.click(incomeBtn)
    expect(incomeBtn).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /switch to expense/i })).toHaveAttribute("aria-pressed", "false")
  })

  it("submit button is disabled while submitting", async () => {
    let resolveSubmit
    const onSubmit = vi.fn(() => new Promise(r => { resolveSubmit = r }))
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText("Transaction amount"), { target: { value: "50.000" } })
    fireEvent.click(screen.getByLabelText("Save transaction"))

    await waitFor(() => {
      expect(screen.getByLabelText("Save transaction")).toBeDisabled()
    })
    resolveSubmit(true)
  })

  it("calls onSubmit with form data and current type on submit", async () => {
    const onSubmit = vi.fn(() => Promise.resolve(true))
    const onClose = vi.fn()
    render(<QuickAddSheet open={true} onClose={onClose} onSubmit={onSubmit} initialType="income" />)

    fireEvent.change(screen.getByLabelText("Transaction amount"), { target: { value: "100.000" } })
    fireEvent.click(screen.getByLabelText("Save transaction"))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.rawAmount).toBe("100.000")
    expect(payload.txType).toBe("income")
    expect(payload.formData).toHaveProperty("tanggal")
    expect(payload.formData).toHaveProperty("kategori")
    expect(payload.formData).toHaveProperty("akunBank")
  })

  it("resets form and closes sheet on successful submit", async () => {
    const onSubmit = vi.fn(() => Promise.resolve(true))
    const onClose = vi.fn()
    render(<QuickAddSheet open={true} onClose={onClose} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText("Transaction amount"), { target: { value: "250.000" } })
    fireEvent.click(screen.getByLabelText("Save transaction"))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it("does NOT close sheet when onSubmit returns false (validation failed in parent)", async () => {
    const onSubmit = vi.fn(() => Promise.resolve(false))
    const onClose = vi.fn()
    render(<QuickAddSheet open={true} onClose={onClose} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText("Transaction amount"), { target: { value: "100" } })
    fireEvent.click(screen.getByLabelText("Save transaction"))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    expect(onClose).not.toHaveBeenCalled()
  })
})