import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { getActivePayment, getPaymentDeadline, getPaymentState } from "@/components/PaymentQrisFlow"

describe("PaymentQrisFlow helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses the newest active payment and ignores finished history", () => {
    const active = getActivePayment([
      { id: "old", status: "approved", created_at: "2026-07-24T00:00:00.000Z" },
      { id: "pending", status: "pending", created_at: "2026-07-25T01:00:00.000Z" },
      { id: "awaiting", status: "awaiting_payment", created_at: "2026-07-25T00:00:00.000Z" },
    ])

    expect(active.id).toBe("pending")
  })

  it("formats the payment deadline in WIB", () => {
    const deadline = getPaymentDeadline({
      created_at: "2026-07-25T02:00:00.000Z",
      expires_at: "2026-07-27T02:00:00.000Z",
    })

    expect(deadline).toContain("27 Jul 2026")
    expect(deadline).toContain("09.00 WIB")
  })

  it("shows replacement state only during grace after the payment deadline", () => {
    const payment = {
      status: "awaiting_payment",
      created_at: "2026-07-25T00:00:00.000Z",
      expires_at: "2026-07-27T00:00:00.000Z",
    }

    expect(getPaymentState(payment, new Date("2026-07-27T00:30:00.000Z"))).toMatchObject({
      inGrace: true,
      canReplace: true,
      canUpload: true,
    })
    expect(getPaymentState(payment, new Date("2026-07-27T01:01:00.000Z"))).toMatchObject({
      inGrace: false,
      canReplace: false,
      canUpload: false,
    })
  })

  it("shows the closed registration state without exposing payment details", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      payments: [],
      total: 0,
      tier: "free",
      proRegistrationOpen: false,
    }), { status: 200 }))
    const { default: PaymentQrisFlow } = await import("@/components/PaymentQrisFlow")

    render(<PaymentQrisFlow />)

    expect(await screen.findByText("Upgrade Pro sedang penuh")).toBeInTheDocument()
    expect(screen.getByText("Untuk menjaga Artami tetap stabil, pendaftaran Pro sedang ditutup sementara. Silakan coba lagi nanti.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /kembali ke dashboard/i })).toHaveAttribute("href", "/dashboard")
    expect(screen.queryByText("Mulai pembayaran")).not.toBeInTheDocument()
    expect(screen.queryByText(/FAWAID DIGITAL STORE/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Rp40.000/i)).not.toBeInTheDocument()
  })

  it("keeps the existing Pro status and history path closed to new registration", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      payments: [{
        id: "rejected-1",
        status: "rejected",
        amount: 40000,
        created_at: "2026-07-24T00:00:00.000Z",
      }],
      total: 1,
      tier: "paid",
      proRegistrationOpen: false,
    }), { status: 200 }))
    const { default: PaymentQrisFlow } = await import("@/components/PaymentQrisFlow")

    render(<PaymentQrisFlow />)

    expect(await screen.findByText("Akun Anda sudah Pro. Riwayat pembayaran tetap tersedia di bawah.")).toBeInTheDocument()
    expect(screen.getByText("Riwayat pembayaran")).toBeInTheDocument()
    expect(screen.queryByText("Upgrade Pro sedang penuh")).not.toBeInTheDocument()
  })

  it("switches a stale open page to closed state after the atomic API rejection", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ payments: [], total: 0, tier: "free", proRegistrationOpen: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: "PRO_REGISTRATION_CLOSED",
        message: "Pendaftaran Pro sedang ditutup sementara. Silakan coba lagi nanti.",
      }), { status: 403 }))
    const { default: PaymentQrisFlow } = await import("@/components/PaymentQrisFlow")

    render(<PaymentQrisFlow />)
    fireEvent.click(await screen.findByRole("button", { name: "Mulai pembayaran" }))

    await waitFor(() => expect(screen.getByText("Upgrade Pro sedang penuh")).toBeInTheDocument())
    expect(screen.queryByText("Mulai pembayaran")).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe("PaymentQrisFlow pending refresh (Wave 9)", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  function mockPendingThen(payload, status = 200) {
    return vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        payments: [{ id: "p1", status: "pending", created_at: "2026-07-25T01:00:00.000Z" }],
        total: 1,
        tier: "free",
        proRegistrationOpen: true,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status }))
  }

  it("offers a bounded Periksa status control while proof is pending and announces refresh outcome", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockPendingThen({
      payments: [{ id: "p1", status: "pending", created_at: "2026-07-25T01:00:00.000Z" }],
      total: 1,
      tier: "free",
      proRegistrationOpen: true,
    })
    const { default: PaymentQrisFlow } = await import("@/components/PaymentQrisFlow")

    render(<PaymentQrisFlow />)
    const refresh = await screen.findByRole("button", { name: "Periksa status" })

    fireEvent.click(refresh)

    await vi.waitFor(() => expect(screen.getByRole("status", { name: /status pembayaran/i })).toHaveTextContent("Status belum berubah"))
  })

  it("updates the view after a refresh that finds approval", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockPendingThen({
      payments: [{ id: "p1", status: "approved", created_at: "2026-07-25T01:00:00.000Z" }],
      total: 1,
      tier: "free",
      proRegistrationOpen: true,
    })
    const { default: PaymentQrisFlow } = await import("@/components/PaymentQrisFlow")

    render(<PaymentQrisFlow />)
    fireEvent.click(await screen.findByRole("button", { name: "Periksa status" }))

    expect(await screen.findByText("Akun Anda sudah Pro. Riwayat pembayaran tetap tersedia di bawah.")).toBeInTheDocument()
    expect(screen.getByRole("status", { name: /status pembayaran/i })).toHaveTextContent("Pembayaran disetujui")
  })

  it("keeps the refresh usable after a server failure and shows a retryable message", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockPendingThen({ error: "server_error", message: "Gagal memuat status." }, 500)
    const { default: PaymentQrisFlow } = await import("@/components/PaymentQrisFlow")

    render(<PaymentQrisFlow />)
    const refresh = await screen.findByRole("button", { name: "Periksa status" })
    fireEvent.click(refresh)

    await vi.waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Gagal memuat status|tidak dapat diperbarui/i))
    expect(screen.getByRole("button", { name: "Periksa status" })).toBeEnabled()
  })

  it("refetches once when the tab returns to foreground while a payment is pending", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        payments: [{ id: "p1", status: "pending", created_at: "2026-07-25T01:00:00.000Z" }],
        total: 1,
        tier: "free",
        proRegistrationOpen: true,
      }), { status: 200 }))
      .mockResolvedValue(new Response(JSON.stringify({
        payments: [{ id: "p1", status: "pending", created_at: "2026-07-25T01:00:00.000Z" }],
        total: 1,
        tier: "free",
        proRegistrationOpen: true,
      }), { status: 200 }))
    const { default: PaymentQrisFlow } = await import("@/components/PaymentQrisFlow")

    render(<PaymentQrisFlow />)
    await screen.findByRole("button", { name: "Periksa status" })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
    document.dispatchEvent(new Event("visibilitychange"))

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    // A rapid second visibility return within the cooldown must not refetch again.
    document.dispatchEvent(new Event("visibilitychange"))
    expect(fetchMock).toHaveBeenCalledTimes(2)

    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
  })

  it("never exposes proof URLs or storage paths in markup while pending", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      payments: [{
        id: "p1",
        status: "pending",
        created_at: new Date(Date.now() - 3_600_000).toISOString(),
        proof_url: "payment-proofs/user-1/p1.jpeg",
        payer_name: "Ayu",
      }],
      total: 1,
      tier: "free",
      proRegistrationOpen: true,
    }), { status: 200 }))
    const { default: PaymentQrisFlow } = await import("@/components/PaymentQrisFlow")

    render(<PaymentQrisFlow />)

    await screen.findByRole("button", { name: "Periksa status" })
    expect(document.body.innerHTML).not.toContain("payment-proofs")
    expect(document.body.innerHTML).not.toContain("p1.jpeg")
    expect(document.body.innerHTML).not.toContain("supabase")
  })

  it("does not offer Periksa status outside the pending state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      payments: [{ id: "a1", status: "awaiting_payment", created_at: new Date(Date.now() - 3_600_000).toISOString() }],
      total: 1,
      tier: "free",
      proRegistrationOpen: true,
    }), { status: 200 }))
    const { default: PaymentQrisFlow } = await import("@/components/PaymentQrisFlow")

    render(<PaymentQrisFlow />)

    await screen.findByText("Unggah bukti")
    expect(screen.queryByRole("button", { name: "Periksa status" })).not.toBeInTheDocument()
  })
})
