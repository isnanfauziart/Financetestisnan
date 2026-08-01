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
})
