import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import BillsSection from "@/components/BillsSection"

vi.mock("@/lib/categoryIcons", () => ({
  getBillVisual: () => ({ icon: () => null, tint: { bg: "#eee", color: "#333" } }),
}))

vi.mock("@/components/BillPayModal", () => ({
  default: ({ bill, onPaid, onEdit }) => (
    <div role="dialog">
      <button type="button" onClick={() => onPaid({ transaction: { kategori: bill.kategoriBill, jumlah: bill.jumlah } })}>
        Mock bayar
      </button>
      <button type="button" onClick={() => onEdit(bill)}>
        Mock edit
      </button>
    </div>
  ),
}))

vi.mock("@/components/BillSetupModal", () => ({
  default: ({ bill, onSaved }) => (
    <div role="dialog">
      <button type="button" onClick={onSaved}>
        {bill ? "Mock simpan edit" : "Mock simpan baru"}
      </button>
    </div>
  ),
}))

describe("BillsSection record reachability", () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response(JSON.stringify({
      bills: [{
        id: "bill-1",
        nama: "Internet",
        jumlah: 250000,
        tipe: "expense",
        kategoriBill: "Internet/WiFi",
        frekuensi: "monthly",
        aktif: false,
        status: "upcoming",
        daysUntilDue: 10,
        tanggalJatuhTempo: 10,
      }],
    }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it("explains the bill setup flow before showing the create CTA", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ bills: [] }), { status: 200 }))

    render(<BillsSection onToast={vi.fn()} />)

    expect(await screen.findByRole("heading", { name: "Jangan lewatkan tanggal penting" })).toBeInTheDocument()
    expect(screen.getByText("Tambah tagihan")).toBeInTheDocument()
    expect(screen.getByText("Pilih tanggal jatuh tempo")).toBeInTheDocument()
    expect(screen.getByText("Dapatkan pengingat")).toBeInTheDocument()
    expect(screen.getByText("Tandai dibayar dan catat")).toBeInTheDocument()
    expect(screen.getByText("Contoh")).toBeInTheDocument()
    expect(screen.getByText("Listrik / Internet / Cicilan")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Tambah Tagihan" })).toHaveClass("min-h-11", "min-w-11")
  })

  it("loads inactive bills so a user can discover and reactivate them", async () => {
    const onBillsChanged = vi.fn()
    render(<BillsSection onToast={vi.fn()} onBillsChanged={onBillsChanged} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /nonaktif \(1\)/i })).toBeInTheDocument()
    })
    expect(fetch).toHaveBeenCalledWith("/api/bills?all=true")

    fireEvent.click(screen.getByRole("button", { name: /nonaktif \(1\)/i }))
    expect(screen.getByRole("button", { name: /aktifkan internet/i })).toHaveClass("min-h-11", "min-w-11")
    fireEvent.click(screen.getByRole("button", { name: /aktifkan internet/i }))

    await waitFor(() => expect(onBillsChanged).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith("/api/bills/bill-1", expect.objectContaining({ method: "PUT" }))
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/bills?all=true")).toHaveLength(2)
  })

  it("notifies the parent after a successful bill payment", async () => {
    const onBillsChanged = vi.fn()
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({
      bills: [{
        id: "bill-1",
        nama: "Internet",
        jumlah: 250000,
        tipe: "expense",
        kategoriBill: "Internet/WiFi",
        frekuensi: "monthly",
        aktif: true,
        status: "upcoming",
        daysUntilDue: 10,
        tanggalJatuhTempo: 10,
      }],
    }), { status: 200 }))

    render(<BillsSection onToast={vi.fn()} onBillsChanged={onBillsChanged} />)

    await waitFor(() => expect(screen.getByRole("button", { name: /bayar internet/i })).toBeInTheDocument())
    expect(screen.getByRole("button", { name: /bayar internet/i })).toHaveClass("min-h-11", "min-w-11")
    expect(screen.getByRole("button", { name: /nonaktifkan internet/i })).toHaveClass("min-h-11", "min-w-11")
    expect(screen.getByRole("button", { name: /hapus internet/i })).toHaveClass("min-h-11", "min-w-11")
    fireEvent.click(screen.getByRole("button", { name: /bayar internet/i }))
    fireEvent.click(screen.getByRole("button", { name: "Mock bayar" }))

    await waitFor(() => expect(onBillsChanged).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/bills?all=true")).toHaveLength(2)
  })

  it("notifies the parent after a successful bill deletion", async () => {
    const onBillsChanged = vi.fn()
    fetchMock.mockImplementation(async (_url, options = {}) => new Response(JSON.stringify(
      options.method === "DELETE" ? {} : { bills: [{
        id: "bill-1",
        nama: "Internet",
        jumlah: 250000,
        tipe: "expense",
        kategoriBill: "Internet/WiFi",
        frekuensi: "monthly",
        aktif: true,
        status: "upcoming",
        daysUntilDue: 10,
        tanggalJatuhTempo: 10,
      }] },
    ), { status: 200 }))

    render(<BillsSection onToast={vi.fn()} onBillsChanged={onBillsChanged} />)

    await waitFor(() => expect(screen.getByRole("button", { name: /hapus internet/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /hapus internet/i }))
    fireEvent.click(screen.getByRole("button", { name: "Hapus" }))

    await waitFor(() => expect(onBillsChanged).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith("/api/bills/bill-1", expect.objectContaining({ method: "DELETE" }))
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/bills?all=true")).toHaveLength(2)
  })

  it("notifies the parent after creating a bill", async () => {
    const onBillsChanged = vi.fn()
    render(<BillsSection onToast={vi.fn()} onBillsChanged={onBillsChanged} />)

    await waitFor(() => expect(screen.getByRole("button", { name: "Tambah tagihan baru" })).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Tambah tagihan baru" })).toHaveClass("min-h-11", "min-w-11")
    fireEvent.click(screen.getByRole("button", { name: "Tambah tagihan baru" }))
    fireEvent.click(screen.getByRole("button", { name: "Mock simpan baru" }))

    await waitFor(() => expect(onBillsChanged).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/bills?all=true")).toHaveLength(2)
  })

  it("notifies the parent after editing a bill", async () => {
    const onBillsChanged = vi.fn()
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({
      bills: [{
        id: "bill-1",
        nama: "Internet",
        jumlah: 250000,
        tipe: "expense",
        kategoriBill: "Internet/WiFi",
        frekuensi: "monthly",
        aktif: true,
        status: "upcoming",
        daysUntilDue: 10,
        tanggalJatuhTempo: 10,
      }],
    }), { status: 200 }))

    render(<BillsSection onToast={vi.fn()} onBillsChanged={onBillsChanged} />)

    await waitFor(() => expect(screen.getByRole("button", { name: /bayar internet/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /bayar internet/i }))
    fireEvent.click(screen.getByRole("button", { name: "Mock edit" }))
    fireEvent.click(screen.getByRole("button", { name: "Mock simpan edit" }))

    await waitFor(() => expect(onBillsChanged).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/bills?all=true")).toHaveLength(2)
  })
})
