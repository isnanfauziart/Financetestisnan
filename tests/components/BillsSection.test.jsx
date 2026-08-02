import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import BillsSection from "@/components/BillsSection"

vi.mock("@/lib/categoryIcons", () => ({
  getBillVisual: () => ({ icon: () => null, tint: { bg: "#eee", color: "#333" } }),
}))

describe("BillsSection record reachability", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
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
    }), { status: 200 })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("loads inactive bills so a user can discover and reactivate them", async () => {
    render(<BillsSection onToast={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /nonaktif \(1\)/i })).toBeInTheDocument()
    })
    expect(fetch).toHaveBeenCalledWith("/api/bills?all=true")
  })
})
