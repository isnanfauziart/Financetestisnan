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
