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
