import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
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

const REPEAT_VALUES = {
  id: "tx-1",
  txType: "expense",
  formData: {
    tanggal: "2026-09-22",
    keterangan: "Kopi pagi",
    kategori: "Kopi",
    jumlah: "",
    akunBank: "BCA",
    catatan: "",
    eventId: "",
    sifat: "Rutin",
  },
  rawAmount: "25000",
}

describe("QuickAddSheet repeat prefill (Wave 5)", () => {
  beforeEach(() => {
    useSettings.mockReturnValue({ settings: { categories: {
      expense: [{ name: "Kopi", icon: "Utensils", active: true }],
      income: [{ name: "Gaji Baru", icon: "Coins", active: true }],
    } } })
  })

  it("prefills amount, description, category, account, and date from the repeated row", async () => {
    render(<QuickAddSheet open onClose={noop} onSubmit={noop} initialValues={REPEAT_VALUES} />)

    await waitFor(() => {
      expect(screen.getByLabelText("Jumlah transaksi").value).toBe("25.000")
    })
    expect(screen.getByLabelText("Keterangan transaksi").value).toBe("Kopi pagi")
    expect(screen.getByDisplayValue("2026-09-22")).toBeInTheDocument()
    expect(screen.getByText("Mengulang transaksi — periksa detail di bawah sebelum menyimpan.")).toBeInTheDocument()
  })

  it("does not prefill when no initialValues are provided", () => {
    render(<QuickAddSheet open onClose={noop} onSubmit={noop} />)
    expect(screen.queryByText("Mengulang transaksi — periksa detail di bawah sebelum menyimpan.")).toBeNull()
    expect(screen.getByLabelText("Jumlah transaksi").value).toBe("")
  })

  it("submits the prefilled values through the ordinary onSubmit pipeline", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(<QuickAddSheet open onClose={noop} onSubmit={onSubmit} initialValues={REPEAT_VALUES} />)

    await waitFor(() => {
      expect(screen.getByLabelText("Jumlah transaksi").value).toBe("25.000")
    })
    fireEvent.click(screen.getByRole("button", { name: "Simpan transaksi" }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.txType).toBe("expense")
    expect(payload.formData.keterangan).toBe("Kopi pagi")
    expect(payload.formData.kategori).toBe("Kopi")
    expect(payload.formData.tanggal).toBe("2026-09-22")
    expect(payload.formData.eventId).toBe("")
    expect(payload.rawAmount).toBe("25.000")
  })

  it("keeps user edits after prefill lands (prefill applies once per row)", async () => {
    const { rerender } = render(
      <QuickAddSheet open onClose={noop} onSubmit={noop} initialValues={REPEAT_VALUES} />,
    )
    await waitFor(() => {
      expect(screen.getByLabelText("Keterangan transaksi").value).toBe("Kopi pagi")
    })
    fireEvent.change(screen.getByLabelText("Keterangan transaksi"), { target: { value: "Kopi sore" } })

    rerender(<QuickAddSheet open onClose={noop} onSubmit={noop} initialValues={REPEAT_VALUES} />)
    expect(screen.getByLabelText("Keterangan transaksi").value).toBe("Kopi sore")
  })
})
