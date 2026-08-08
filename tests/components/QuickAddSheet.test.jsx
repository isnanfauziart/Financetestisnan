import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react"
import QuickAddSheet from "@/app/dashboard/_components/QuickAddSheet"

vi.mock("@/components/EventTagPicker", () => ({
  default: () => <div data-testid="event-tag-picker" />,
}))

vi.mock("@/lib/useSharedData", async (importOriginal) => ({
  ...(await importOriginal()),
  useSettings: vi.fn(),
}))
const { useSettings } = await import("@/lib/useSharedData")

afterEach(() => cleanup())

const noop = () => {}

describe("QuickAddSheet", () => {
  beforeEach(() => {
    useSettings.mockReturnValue({ settings: { categories: {
      expense: [{ name: "Kopi", icon: "Utensils", active: true }],
      income: [{ name: "Gaji Baru", icon: "Coins", active: true }],
    } } })
  })

  it("renders nothing when closed", () => {
    render(<QuickAddSheet open={false} onClose={noop} onSubmit={noop} />)
    expect(screen.queryByText("Transaksi Baru")).toBeNull()
    expect(screen.queryByText("Tambah Cepat")).toBeNull()
  })

  it("renders title and subtitle when open", () => {
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={noop} />)
    expect(screen.getByText("Transaksi Baru")).toBeInTheDocument()
    expect(screen.getByText("Tambah Cepat")).toBeInTheDocument()
  })

  it("renders 2 type pills (Pengeluaran / Pemasukan)", () => {
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={noop} />)
    expect(screen.getByRole("button", { name: "Pilih pengeluaran" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pilih pemasukan" })).toBeInTheDocument()
  })

  it("expense is selected by default", () => {
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={noop} />)
    expect(screen.getByRole("button", { name: "Pilih pengeluaran" })).toHaveAttribute("aria-pressed", "true")
  })

  it("uses the user category list in the picker", () => {
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={noop} />)
    fireEvent.click(screen.getByRole("button", { name: "Kategori" }))
    expect(screen.getByRole("option", { name: "Kopi" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Transportasi" })).not.toBeInTheDocument()
  })

  it("respects initialType prop", () => {
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={noop} initialType="income" />)
    expect(screen.getByRole("button", { name: "Pilih pemasukan" })).toHaveAttribute("aria-pressed", "true")
  })

  it("clicking a type pill switches selection and clears kategori", () => {
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={noop} />)
    const incomeBtn = screen.getByRole("button", { name: "Pilih pemasukan" })
    fireEvent.click(incomeBtn)
    expect(incomeBtn).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Pilih pengeluaran" })).toHaveAttribute("aria-pressed", "false")
  })

  it("submit button is disabled while submitting", async () => {
    let resolveSubmit
    const onSubmit = vi.fn(() => new Promise(r => { resolveSubmit = r }))
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText("Jumlah transaksi"), { target: { value: "50.000" } })
    fireEvent.click(screen.getByLabelText("Simpan transaksi"))

    await waitFor(() => {
      expect(screen.getByLabelText("Simpan transaksi")).toBeDisabled()
    })
    await act(async () => {
      resolveSubmit(true)
    })
  })

  it("calls onSubmit with form data and current type on submit", async () => {
    const onSubmit = vi.fn(() => Promise.resolve(true))
    const onClose = vi.fn()
    render(<QuickAddSheet open={true} onClose={onClose} onSubmit={onSubmit} initialType="income" />)

    fireEvent.change(screen.getByLabelText("Jumlah transaksi"), { target: { value: "100.000" } })
    fireEvent.click(screen.getByLabelText("Simpan transaksi"))

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

  it("submits Pengeluaran Spesial only when the expense checkbox is selected", async () => {
    const onSubmit = vi.fn(() => Promise.resolve(true))
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={onSubmit} />)

    expect(screen.getByLabelText("Pengeluaran Spesial")).not.toBeChecked()
    fireEvent.click(screen.getByLabelText("Pengeluaran Spesial"))
    fireEvent.change(screen.getByLabelText("Jumlah transaksi"), { target: { value: "100.000" } })
    fireEvent.click(screen.getByLabelText("Simpan transaksi"))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      sifat: "Spesial",
      formData: expect.objectContaining({ sifat: "Spesial" }),
      txType: "expense",
    }))
  })

  it("keeps income entry free of the expense classification control and payload", async () => {
    const onSubmit = vi.fn(() => Promise.resolve(true))
    render(<QuickAddSheet open={true} onClose={noop} onSubmit={onSubmit} initialType="income" />)

    expect(screen.queryByLabelText("Pengeluaran Spesial")).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Jumlah transaksi"), { target: { value: "100.000" } })
    fireEvent.click(screen.getByLabelText("Simpan transaksi"))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    const payload = onSubmit.mock.calls[0][0]
    expect(payload).not.toHaveProperty("sifat")
    expect(payload.formData).not.toHaveProperty("sifat")
  })

  it("renders an opt-in Tandai Spesial suggestion without auto-classifying", () => {
    render(
      <QuickAddSheet
        open={true}
        onClose={noop}
        onSubmit={noop}
        specialSuggestion={{ threshold: 50_000, baselineMonths: 3 }}
      />,
    )

    fireEvent.change(screen.getByLabelText("Jumlah transaksi"), { target: { value: "100.000" } })

    expect(screen.getByLabelText("Pengeluaran Spesial")).not.toBeChecked()
    fireEvent.click(screen.getByRole("button", { name: "Tandai Spesial" }))
    expect(screen.getByLabelText("Pengeluaran Spesial")).toBeChecked()
  })

  it("dismisses the special suggestion without changing the expense class", () => {
    render(
      <QuickAddSheet
        open={true}
        onClose={noop}
        onSubmit={noop}
        specialSuggestion={{ threshold: 50_000, baselineMonths: 3 }}
      />,
    )

    fireEvent.change(screen.getByLabelText("Jumlah transaksi"), { target: { value: "100.000" } })
    fireEvent.click(screen.getByRole("button", { name: "Tutup saran Pengeluaran Spesial" }))

    expect(screen.queryByRole("button", { name: "Tandai Spesial" })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Pengeluaran Spesial")).not.toBeChecked()
  })

  it("resets form and closes sheet on successful submit", async () => {
    const onSubmit = vi.fn(() => Promise.resolve(true))
    const onClose = vi.fn()
    render(<QuickAddSheet open={true} onClose={onClose} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText("Jumlah transaksi"), { target: { value: "250.000" } })
    fireEvent.click(screen.getByLabelText("Simpan transaksi"))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it("does NOT close sheet when onSubmit returns false (validation failed in parent)", async () => {
    const onSubmit = vi.fn(() => Promise.resolve(false))
    const onClose = vi.fn()
    render(<QuickAddSheet open={true} onClose={onClose} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText("Jumlah transaksi"), { target: { value: "100" } })
    fireEvent.click(screen.getByLabelText("Simpan transaksi"))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    expect(onClose).not.toHaveBeenCalled()
  })
})
