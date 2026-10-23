import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import AdminFeatureControls from "@/app/admin/AdminFeatureControls"

describe("AdminFeatureControls", () => {
  it("confirms a global OFF action and exposes existing-data segment filters", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        features: [{ key: "healthScore", enabled: true, protected: false, paidOnly: true, scheduledAt: null }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.spyOn(window, "confirm").mockReturnValue(true)

    render(<AdminFeatureControls />)

    expect(await screen.findByRole("heading", { name: "Health Score" })).toBeInTheDocument()
    expect(screen.getByLabelText("Filter berdasarkan tier")).toBeInTheDocument()
    expect(screen.getByLabelText("Usia akun minimum (hari)")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /nonaktifkan health score/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/admin/features",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ feature: "healthScore", scope: "global", enabled: false }),
      })
    ))
    expect(window.confirm).toHaveBeenCalled()

    fetchMock.mockRestore()
    window.confirm.mockRestore()
  })

  it("requests the maximum user page size and reports the real match total", async () => {
    window.history.pushState({}, "", "/admin?tab=features")
    const segmentUsers = [1, 2, 3].map(index => ({
      id: `user-${index}`,
      email: `user${index}@example.com`,
      name: `User ${index}`,
      tier: "free",
    }))
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const value = String(url)
      if (value.includes("/api/admin/features")) {
        return Promise.resolve(new Response(JSON.stringify({
          features: [{ key: "healthScore", enabled: true, protected: false, paidOnly: true, scheduledAt: null }],
        }), { status: 200 }))
      }
      if (value.includes("/api/admin/users")) {
        return Promise.resolve(new Response(JSON.stringify({
          users: segmentUsers, total: 140, page: 1, pageSize: 100,
        }), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
    })

    render(<AdminFeatureControls />)
    expect(await screen.findByRole("heading", { name: "Health Score" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Cari pengguna" }))

    expect(await screen.findByText(/dipilih dari 140 pengguna/i)).toBeInTheDocument()
    expect(screen.getByText(/menampilkan 3 pertama/i)).toBeInTheDocument()
    const usersCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/admin/users"))
    expect(String(usersCall[0])).toContain("pageSize=100")

    fetchMock.mockRestore()
  })

  it("preselects the user carried by the ?user= deep link", async () => {
    window.history.pushState({}, "", "/admin?tab=features&user=user-9")
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const value = String(url)
      if (value.includes("/api/admin/features")) {
        return Promise.resolve(new Response(JSON.stringify({
          features: [{ key: "healthScore", enabled: true, protected: false, paidOnly: true, scheduledAt: null }],
        }), { status: 200 }))
      }
      if (value.includes("/api/admin/users/user-9")) {
        return Promise.resolve(new Response(JSON.stringify({
          user: { id: "user-9", email: "nine@example.com", name: "Nine", tier: "free" },
        }), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
    })

    render(<AdminFeatureControls />)

    expect(await screen.findByText(/nine@example\.com/)).toBeInTheDocument()
    expect(screen.getByRole("checkbox")).toBeChecked()

    fetchMock.mockRestore()
    window.history.pushState({}, "", "/admin?tab=features")
  })

  it("puts Pro registration capacity above the normal list and confirms active-request impact", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        features: [
          { key: "proRegistration", enabled: true, protected: false, globalOnly: true, awaitingCount: 3, pendingCount: 2, scheduledAt: null },
          { key: "healthScore", enabled: true, protected: false, paidOnly: true, scheduledAt: null },
        ],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, updatedAt: "2026-08-02T01:02:03.000Z", updatedBy: "admin@example.com" }), { status: 200 }))
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(true)

    render(<AdminFeatureControls />)

    expect(await screen.findByRole("heading", { name: "Pendaftaran Pro" })).toBeInTheDocument()
    expect(screen.getByText(/3 menunggu bayar/i)).toBeInTheDocument()
    expect(screen.getByText(/2 menunggu review/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /nonaktifkan pendaftaran pro/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/admin/features",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ feature: "proRegistration", scope: "global", enabled: false }),
      })
    ))
    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining("3 menunggu bayar"))
    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining("2 menunggu review"))
    expect(confirmMock).toHaveBeenCalledWith(expect.stringMatching(/permintaan aktif tetap dapat membayar|existing active requests/i))

    fetchMock.mockRestore()
    confirmMock.mockRestore()
  })
})
