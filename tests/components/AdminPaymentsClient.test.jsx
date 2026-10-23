import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import AdminPaymentsClient from "@/app/admin/AdminPaymentsClient"

const pendingPayment = {
  id: "12345678-aaaa-bbbb-cccc-dddddddddddd",
  reference: "PAY-12345678",
  status: "pending",
  amount: 40000,
  created_at: "2026-10-20T01:00:00.000Z",
  payment_at: "2026-10-20T02:00:00.000Z",
  email: "buyer@example.com",
  hasProof: true,
  proof_uploaded_late: false,
}

const approvedPayment = {
  ...pendingPayment,
  id: "87654321-aaaa-bbbb-cccc-dddddddddddd",
  reference: "PAY-87654321",
  status: "approved",
  email: "alice@example.com",
}

function jsonResponse(body, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

describe("AdminPaymentsClient", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/admin")
  })

  afterEach(() => vi.restoreAllMocks())

  it("opens in history mode with the search applied when the URL carries ?search=", async () => {
    window.history.pushState({}, "", "/admin?tab=payments&search=alice%40example.com")
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const value = String(url)
      if (value.includes("status=history")) {
        return jsonResponse({ payments: [approvedPayment], total: 1, page: 1, pageSize: 50 })
      }
      return jsonResponse({ payments: [], total: 0, page: 1, pageSize: 50 })
    })

    render(<AdminPaymentsClient />)

    expect(await screen.findByText("alice@example.com")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Riwayat" })).toHaveAttribute("aria-pressed", "true")
    const listCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/admin/payments?"))
    expect(String(listCall[0])).toContain("status=history")
    expect(String(listCall[0])).toContain("search=alice")
  })

  it("closes the proof dialog with Escape and returns focus to the trigger", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const value = String(url)
      if (value.includes("/proof")) {
        return Promise.resolve(new Response(new Blob(["proof"], { type: "image/png" }), { status: 200 }))
      }
      return jsonResponse({ payments: [pendingPayment], total: 1, page: 1, pageSize: 50 })
    })

    render(<AdminPaymentsClient />)
    const proofButton = await screen.findByRole("button", { name: "Lihat Bukti" })
    proofButton.focus()
    fireEvent.click(proofButton)

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    fireEvent.keyDown(document, { key: "Escape" })

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(document.activeElement).toBe(proofButton)
  })

  it("stays in the pending queue after approving a payment", async () => {
    let getCount = 0
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options) => {
      const value = String(url)
      if (options?.method === "PATCH") {
        return jsonResponse({ payment: { ...pendingPayment, status: "approved" } })
      }
      if (value.includes("/api/admin/payments?")) {
        getCount += 1
        return getCount === 1
          ? jsonResponse({ payments: [pendingPayment], total: 1, page: 1, pageSize: 50 })
          : jsonResponse({ payments: [], total: 0, page: 1, pageSize: 50 })
      }
      return jsonResponse({})
    })

    render(<AdminPaymentsClient />)

    fireEvent.click(await screen.findByRole("button", { name: /setujui pay-12345678/i }))
    fireEvent.click(await screen.findByRole("button", { name: "Konfirmasi Setujui" }))

    expect(await screen.findByText("Pembayaran berhasil diperbarui")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Tutup" }))

    await waitFor(() => expect(screen.getByText("Antrian review sedang kosong.")).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Pending" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Riwayat" })).toHaveAttribute("aria-pressed", "false")
    expect(getCount).toBeGreaterThanOrEqual(2)
  })
})
