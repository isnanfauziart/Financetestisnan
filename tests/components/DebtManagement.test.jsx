import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import DebtCard from "@/components/DebtCard"
import DebtSetupModal from "@/components/DebtSetupModal"
import DebtPaymentModal from "@/components/DebtPaymentModal"

vi.mock("@/app/dashboard/_components/Sheet", () => ({
  default: ({ children, header }) => <div>{header}{children}</div>,
}))

const debt = {
  id: "debt-1",
  namaOrang: "Budi",
  jumlah: 500000,
  arah: "utang",
  jatuhTempo: "2026-08-01",
  status: "open",
  sisaSaldo: 500000,
  catatan: "",
}

describe("debt record management", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("exposes edit and delete actions for a debt record", () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<DebtCard debt={debt} onPay={vi.fn()} onSettle={vi.fn()} onEdit={onEdit} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole("button", { name: /edit budi/i }))
    fireEvent.click(screen.getByRole("button", { name: /hapus budi/i }))

    expect(onEdit).toHaveBeenCalledWith(debt)
    expect(onDelete).toHaveBeenCalledWith(debt)
  })

  it("uses receiving language for piutang card actions", () => {
    render(<DebtCard debt={{ ...debt, arah: "piutang" }} onPay={vi.fn()} onSettle={vi.fn()} />)

    expect(screen.getByRole("button", { name: "Terima" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Terima Lunas/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Bayar" })).not.toBeInTheDocument()
  })

  it("uses receiving language when recording a piutang payment", async () => {
    const onToast = vi.fn()
    render(
      <DebtPaymentModal
        debt={{ ...debt, arah: "piutang" }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onToast={onToast}
      />
    )

    expect(screen.getByRole("heading", { name: "Terima pembayaran dari Budi" })).toBeInTheDocument()
    expect(screen.getByLabelText("Jumlah Diterima (Rp)")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Jumlah Diterima (Rp)"), { target: { value: "40.000" } })
    fireEvent.click(screen.getByRole("button", { name: /Terima.*40\.000/ }))

    await waitFor(() => expect(onToast).toHaveBeenCalledWith(expect.stringContaining("Penerimaan"), "success"))
  })

  it("submits existing debt edits through the update route", async () => {
    render(<DebtSetupModal debt={debt} onClose={vi.fn()} onSaved={vi.fn()} />)

    expect(screen.getByDisplayValue("Budi")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/debts", expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining('"id":"debt-1"'),
    })))
  })
})
