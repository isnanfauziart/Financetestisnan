import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import AdminUsersClient from "@/app/admin/AdminUsersClient"

const usersPayload = {
  users: [{
    id: "user-1",
    email: "alice@example.com",
    name: "Alice",
    tier: "free",
    created_at: "2026-08-01T00:00:00.000Z",
    last_seen_at: "2026-08-02T00:00:00.000Z",
    sheetConnected: true,
    isAdmin: false,
  }],
  total: 1,
  page: 1,
  pageSize: 25,
  summary: { total: 1, free: 1, paid: 0, active7d: 1, sheetConnected: 1 },
}

describe("AdminUsersClient", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/admin?tab=users")
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const value = String(url)
      if (value.includes("section=account")) {
        return Promise.resolve(new Response(JSON.stringify({ user: usersPayload.users[0] }), { status: 200 }))
      }
      if (value.includes("section=usage")) {
        return Promise.resolve(new Response(JSON.stringify({ usage: { transactions: { period: "2026-08", current: 28, limit: 75, resetAt: "2026-09-01T00:00:00+07:00", verified: true } } }), { status: 200 }))
      }
      if (value.includes("section=payments")) {
        return Promise.resolve(new Response(JSON.stringify({ payments: [{ id: "payment-1", reference: "PAY-PAYMENT1", status: "approved", amount: 40000, created_at: "2026-08-01T00:00:00.000Z", hasProof: true }] }), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify(usersPayload), { status: 200 }))
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it("loads the directory, shows summary cards, and opens a read-only detail panel", async () => {
    render(<AdminUsersClient />)

    expect(await screen.findByText("alice@example.com")).toBeInTheDocument()
    expect(screen.getByText("1 pengguna")).toBeInTheDocument()
    expect(screen.getAllByText("Terhubung").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: /lihat detail alice/i }))

    expect(await screen.findByRole("dialog", { name: /detail pengguna/i })).toBeInTheDocument()
    expect(await screen.findByText("28 / 75 transaksi bulan ini")).toBeInTheDocument()
    expect(screen.getByText("PAY-PAYMENT1")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /lihat bukti/i })).toBeInTheDocument()
  })

  it("refreshes the directory only when the admin asks", async () => {
    render(<AdminUsersClient />)
    await screen.findByText("alice@example.com")

    const callsBefore = fetch.mock.calls.length
    fireEvent.click(screen.getByRole("button", { name: "Segarkan pengguna" }))
    await waitFor(() => expect(fetch.mock.calls.length).toBeGreaterThan(callsBefore))
    expect(fetch.mock.calls.filter(([url]) => String(url).includes("/api/admin/users?")).length).toBe(2)
  })
})
