import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import OnboardingOverlay from "@/app/dashboard/_components/OnboardingOverlay"

function response(body, ok = true) {
  return { ok, json: async () => body }
}

const baseProps = {
  specialSuggestion: null,
  transactionUsage: undefined,
  proRegistrationOpen: true,
  transactions: [],
  onBalanceSaved: vi.fn(),
  onFirstTransactionSaved: vi.fn(),
  onOpenPlan: vi.fn(),
  onFinish: vi.fn(),
  showToast: vi.fn(),
  submitTransaction: vi.fn(),
}

function renderOverlay(overrides = {}) {
  return render(<OnboardingOverlay {...baseProps} {...overrides} />)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("OnboardingOverlay — balance step", () => {
  it("has no dismiss control: no close button, backdrop click, or skip action", () => {
    const { container } = renderOverlay({ step: "balance" })

    expect(screen.getByRole("dialog", { name: "Panduan pertama kali" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /tutup|close|lewati|skip/i })).toBeNull()
    expect(screen.queryByText(/lewati/i)).toBeNull()
    expect(container.querySelectorAll("[data-sheet-close]")).toHaveLength(0)
  })

  it("accepts Rp0 as a valid opening balance and submits amount 0 with today's default date", async () => {
    const onBalanceSaved = vi.fn().mockResolvedValue({ ok: true })
    renderOverlay({ step: "balance", onBalanceSaved })

    const amount = screen.getByLabelText("Total saldo awal (Rp)")
    fireEvent.change(amount, { target: { value: "0" } })
    fireEvent.submit(screen.getByRole("button", { name: /simpan saldo awal/i }))

    await waitFor(() => expect(onBalanceSaved).toHaveBeenCalledTimes(1))
    expect(onBalanceSaved).toHaveBeenCalledWith({ amount: 0, date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
  })

  it("formats thousand separators and shows the parsed preview", async () => {
    const onBalanceSaved = vi.fn().mockResolvedValue({ ok: true })
    renderOverlay({ step: "balance", onBalanceSaved })

    fireEvent.change(screen.getByLabelText("Total saldo awal (Rp)"), { target: { value: "2500000" } })
    expect(screen.getByText("Rp 2.500.000")).toBeInTheDocument()
    fireEvent.submit(screen.getByRole("button", { name: /simpan saldo awal/i }))

    await waitFor(() => expect(onBalanceSaved).toHaveBeenCalledWith({ amount: 2500000, date: expect.any(String) }))
  })

  it("requires an amount and shows an accessible error without calling the save handler", () => {
    const onBalanceSaved = vi.fn()
    renderOverlay({ step: "balance", onBalanceSaved })

    fireEvent.submit(screen.getByRole("button", { name: /simpan saldo awal/i }))

    expect(screen.getByRole("alert")).toHaveTextContent("Masukkan jumlah saldo awal")
    expect(onBalanceSaved).not.toHaveBeenCalled()
  })

  it("preserves entered values when the save fails and keeps them for the retry", async () => {
    const onBalanceSaved = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "Gagal menyimpan. Coba lagi." })
      .mockResolvedValueOnce({ ok: true })
    renderOverlay({ step: "balance", onBalanceSaved })

    fireEvent.change(screen.getByLabelText("Total saldo awal (Rp)"), { target: { value: "1750000" } })
    fireEvent.submit(screen.getByRole("button", { name: /simpan saldo awal/i }))

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
    expect(screen.getByLabelText("Total saldo awal (Rp)")).toHaveValue("1.750.000")
    expect(screen.getByLabelText("Tanggal")).not.toHaveValue("")

    fireEvent.submit(screen.getByRole("button", { name: /simpan saldo awal/i }))
    await waitFor(() => expect(onBalanceSaved).toHaveBeenCalledTimes(2))
    expect(onBalanceSaved).toHaveBeenLastCalledWith({ amount: 1750000, date: expect.any(String) })
  })

  it("keeps values and surfaces the error when the save handler throws", async () => {
    const onBalanceSaved = vi.fn().mockRejectedValue(new Error("network down"))
    renderOverlay({ step: "balance", onBalanceSaved })

    fireEvent.change(screen.getByLabelText("Total saldo awal (Rp)"), { target: { value: "9000" } })
    fireEvent.submit(screen.getByRole("button", { name: /simpan saldo awal/i }))

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
    expect(screen.getByLabelText("Total saldo awal (Rp)")).toHaveValue("9.000")
  })
})

describe("OnboardingOverlay — transaction step", () => {
  it("opens Quick Add embedded in the dimmed shell and routes saves through the shared pipeline", async () => {
    const submitTransaction = vi.fn().mockResolvedValue({ ok: true })
    const onFirstTransactionSaved = vi.fn()
    renderOverlay({ step: "transaction", submitTransaction, onFirstTransactionSaved })

    expect(screen.getByText("Transaksi Baru")).toBeInTheDocument()
    expect(screen.getByText("Tambah Cepat")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Jumlah transaksi"), { target: { value: "15000" } })
    fireEvent.click(screen.getByRole("button", { name: "Simpan transaksi" }))

    await waitFor(() => expect(submitTransaction).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onFirstTransactionSaved).toHaveBeenCalledTimes(1))
  })

  it("does not commit onboarding when the first transaction fails to save", async () => {
    const submitTransaction = vi.fn().mockResolvedValue({ ok: false })
    const onFirstTransactionSaved = vi.fn()
    renderOverlay({ step: "transaction", submitTransaction, onFirstTransactionSaved })

    fireEvent.change(screen.getByLabelText("Jumlah transaksi"), { target: { value: "15000" } })
    fireEvent.click(screen.getByRole("button", { name: "Simpan transaksi" }))

    await waitFor(() => expect(submitTransaction).toHaveBeenCalledTimes(1))
    expect(onFirstTransactionSaved).not.toHaveBeenCalled()
  })

  it("re-opens Quick Add from the interstitial after the sheet is closed, so the step stays required", () => {
    renderOverlay({ step: "transaction", submitTransaction: vi.fn().mockResolvedValue({ ok: true }) })

    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    expect(screen.getByText("Saldo awal tersimpan ✓")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Catat transaksi pertama" }))
    expect(screen.getByText("Transaksi Baru")).toBeInTheDocument()
  })
})

describe("OnboardingOverlay — optional next step", () => {
  it("offers budget and goal setup plus a way to finish", () => {
    const onOpenPlan = vi.fn()
    const onFinish = vi.fn()
    renderOverlay({ step: "optional", onOpenPlan, onFinish })

    fireEvent.click(screen.getByRole("button", { name: "Atur budget" }))
    expect(onOpenPlan).toHaveBeenCalledWith("budget")
    fireEvent.click(screen.getByRole("button", { name: "Buat target" }))
    expect(onOpenPlan).toHaveBeenCalledWith("goal")
    fireEvent.click(screen.getByRole("button", { name: "Mulai pakai Artami" }))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })
})
