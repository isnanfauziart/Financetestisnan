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
  default: ({ bill, initialValues, onSaved }) => (
    <div role="dialog">
      <output data-testid="bill-setup-prefill">{JSON.stringify(initialValues || null)}</output>
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
    expect(screen.getByText("Tentukan tanggal bayar")).toBeInTheDocument()
    expect(screen.getByText("Cek tagihan yang sudah dekat")).toBeInTheDocument()
    expect(screen.getByText("Bayar, lalu catat")).toBeInTheDocument()
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

  it("shows the recurring radar for Pro users and persists a dismissal", async () => {
    const transactions = ["Mei", "Jun", "Jul"].map((month, index) => ({
      id: `tx-${index}`,
      date: `${index + 5} ${month} 2026`,
      desc: "Netflix",
      category: "Hiburan",
      account: "Bank BCA",
      amount: 100000,
      type: "expense",
    }))
    const onSettingsChanged = vi.fn()
    render(
      <BillsSection
        onToast={vi.fn()}
        transactions={transactions}
        now={new Date("2026-08-20T04:00:00.000Z")}
        entitlement={{ entitlementVerified: true, featureAccess: { recurringExpenseRadar: true }, featureAvailability: { recurringExpenseRadar: true } }}
        settings={{ recurringExpenseDismissals: [] }}
        onSettingsChanged={onSettingsChanged}
      />
    )

    expect(await screen.findByRole("heading", { name: "Pola pengeluaran rutin" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /sembunyikan netflix/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/settings", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ addRecurringExpenseDismissal: "recurring:v1:netflix|hiburan|bank bca" }),
    })))
    expect(onSettingsChanged).toHaveBeenCalledTimes(1)
  })

  it("shows a non-personal Pro preview instead of recurring transaction details for Free users", async () => {
    const transactions = ["Mei", "Jun", "Jul"].map((month, index) => ({
      id: `tx-${index}`,
      date: `${index + 5} ${month} 2026`,
      desc: "Netflix",
      category: "Hiburan",
      account: "Bank BCA",
      amount: 100000,
      type: "expense",
    }))
    render(
      <BillsSection
        onToast={vi.fn()}
        transactions={transactions}
        now={new Date("2026-08-20T04:00:00.000Z")}
        entitlement={{ entitlementVerified: true, featureAccess: { recurringExpenseRadar: false }, featureAvailability: { recurringExpenseRadar: true }, features: { recurringExpenseRadar: false } }}
        settings={{ recurringExpenseDismissals: [] }}
      />
    )

    expect(await screen.findByRole("heading", { name: "Recurring Expense Radar" })).toBeInTheDocument()
    expect(screen.queryByText("Netflix")).not.toBeInTheDocument()
  })

  it("opens a radar suggestion in create mode with monthly bill prefills", async () => {
    const transactions = ["Mei", "Jun", "Jul"].map((month, index) => ({
      id: `tx-${index}`,
      date: `${index + 5} ${month} 2026`,
      desc: "Netflix",
      category: "Hiburan",
      account: "Bank BCA",
      amount: 100000,
      type: "expense",
    }))

    render(
      <BillsSection
        onToast={vi.fn()}
        transactions={transactions}
        now={new Date("2026-08-20T04:00:00.000Z")}
        entitlement={{ entitlementVerified: true, featureAccess: { recurringExpenseRadar: true }, featureAvailability: { recurringExpenseRadar: true } }}
        settings={{ recurringExpenseDismissals: [] }}
      />
    )

    fireEvent.click(await screen.findByRole("button", { name: /jadikan tagihan netflix/i }))

    expect(screen.getByRole("button", { name: "Mock simpan baru" })).toBeInTheDocument()
    expect(JSON.parse(screen.getByTestId("bill-setup-prefill").textContent)).toMatchObject({
      nama: "Netflix",
      jumlah: 100000,
      tipe: "expense",
      kategoriTransaksi: "Hiburan",
      frekuensi: "monthly",
      tanggalJatuhTempo: 6,
      akunBank: "Bank BCA",
    })
  })
})

describe("BillsSection render stability", () => {
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
        aktif: true,
        status: "upcoming",
        daysUntilDue: 10,
        tanggalJatuhTempo: 10,
      }],
    }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  const billsFetchCount = () =>
    fetchMock.mock.calls.filter(([url]) => url === "/api/bills?all=true").length

  it("does not refetch or close the setup modal when onToast changes identity across re-renders", async () => {
    const { rerender } = render(<BillsSection onToast={vi.fn()} sessionKey="user-a" />)

    await waitFor(() => expect(billsFetchCount()).toBe(1))

    // Open the create-bill modal
    fireEvent.click(screen.getByRole("button", { name: "Tambah tagihan baru" }))
    expect(screen.getByRole("button", { name: "Mock simpan baru" })).toBeInTheDocument()

    // Simulate dashboard re-renders (scroll, clicks, timers) that pass a fresh
    // showToast identity each time. These must not restart the fetch/reset
    // effect: no refetch, list intact, modal stays open.
    rerender(<BillsSection onToast={vi.fn()} sessionKey="user-a" />)
    rerender(<BillsSection onToast={vi.fn()} sessionKey="user-a" />)

    expect(screen.getByRole("button", { name: "Mock simpan baru" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /bayar internet/i })).toBeInTheDocument()
    expect(billsFetchCount()).toBe(1)
  })

  it("refetches when the session scope changes", async () => {
    const { rerender } = render(<BillsSection onToast={vi.fn()} sessionKey="user-a" />)
    await waitFor(() => expect(billsFetchCount()).toBe(1))

    rerender(<BillsSection onToast={vi.fn()} sessionKey="user-b" />)

    await waitFor(() => expect(billsFetchCount()).toBe(2))
  })

  it("reports fetch failures through the latest onToast identity", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ error: "Gagal" }), { status: 500 }))
    const firstToast = vi.fn()
    const latestToast = vi.fn()

    const { rerender } = render(<BillsSection onToast={firstToast} sessionKey="user-a" />)
    rerender(<BillsSection onToast={latestToast} sessionKey="user-a" />)

    await waitFor(() => expect(latestToast).toHaveBeenCalledWith("Gagal", "error"))
    expect(firstToast).not.toHaveBeenCalled()
  })
})
