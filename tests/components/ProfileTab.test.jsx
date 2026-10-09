import { afterEach, describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import ProfileTab from "@/app/dashboard/ProfileTab"

vi.mock("@/lib/useSharedData", () => ({
  useSettings: vi.fn(),
}))

const { useSettings } = await import("@/lib/useSharedData")

let refetchSettings

function createProps(overrides = {}) {
  return {
    session: {
      user: {
        name: "Ayu Lestari",
        email: "ayu@example.com",
        image: "https://example.com/ayu.png",
        tier: "free",
      },
    },
    data: {
      transactions: [{ id: "tx-1" }, { id: "tx-2" }, { id: "tx-3" }],
    },
    signOut: vi.fn(),
    soundEnabled: true,
    setSoundEnabled: vi.fn(),
    hapticsEnabled: false,
    setHapticsEnabled: vi.fn(),
    onToast: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  }
}

describe("ProfileTab ownership cleanup", () => {
  beforeEach(() => {
    refetchSettings = vi.fn().mockResolvedValue(undefined)
    useSettings.mockReturnValue({
      settings: {
        startingBalance: 2500000,
        startingBalanceDate: "2026-07-01",
        userName: "",
        userNamePromptDismissed: false,
      },
      refetch: refetchSettings,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("keeps identity visible near the top with an account-focused summary", () => {
    render(<ProfileTab {...createProps()} />)

    expect(screen.getByRole("heading", { name: "Ayu Lestari" })).toBeInTheDocument()
    expect(screen.getAllByText("ayu@example.com").length).toBeGreaterThan(0)
    expect(screen.getByRole("region", { name: "Akun" })).toBeInTheDocument()
    expect(screen.getByText("Nama pengguna")).toBeInTheDocument()
    expect(screen.getByText("Total transaksi")).toBeInTheDocument()
  })

  it("shows the name field behind Ubah and refreshes settings after saving", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal("fetch", fetchSpy)

    render(<ProfileTab {...createProps()} />)

    const accountRegion = screen.getByRole("region", { name: "Akun" })
    // The name editor stays hidden until Ubah is tapped.
    expect(screen.queryByLabelText("Nama pengguna")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Ubah" }))

    const input = screen.getByLabelText("Nama pengguna")
    const ownershipText = screen.getByText(/Catatan keuanganmu tetap berada di Google Sheets milikmu/i)
    const paketRegion = screen.getByRole("region", { name: "Paket dan pemakaian" })
    expect(accountRegion.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(accountRegion.compareDocumentPosition(ownershipText) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText(/Artami tidak menghubungkan rekening bank/i)).toBeInTheDocument()
    expect(screen.getByText(/Tidak ada iklan/i)).toBeInTheDocument()
    expect(input.compareDocumentPosition(paketRegion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.change(input, { target: { value: "  Nama Profil  " } })
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    // Profile also mounts the Wave 2 Sheets hub, which fetches connection
    // metadata; target the settings call specifically.
    const settingsCall = fetchSpy.mock.calls.find(([url]) => String(url).includes("/api/settings"))
    expect(settingsCall).toBeTruthy()
    expect(JSON.parse(settingsCall[1].body)).toEqual({
      updates: [
        ["userName", "Nama Profil"],
        ["userNamePromptDismissed", true],
      ],
    })
    await waitFor(() => expect(refetchSettings).toHaveBeenCalled())
  })

  it("adds paket dan pemakaian near the top before preferences", () => {
    render(<ProfileTab {...createProps()} />)

    const paketRegion = screen.getByRole("region", { name: "Paket dan pemakaian" })
    const preferencesRegion = screen.getByRole("region", { name: "Pengaturan" })

    expect(screen.getByText("Paket")).toBeInTheDocument()
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0)
    expect(paketRegion.compareDocumentPosition(preferencesRegion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("keeps preferences, data controls, and logout while excluding bills and reports", () => {
    render(<ProfileTab {...createProps()} />)

    expect(screen.getByRole("region", { name: "Pengaturan" })).toBeInTheDocument()
    expect(screen.getByText("Suara")).toBeInTheDocument()
    expect(screen.getByText("Getaran")).toBeInTheDocument()
    expect(screen.getByLabelText("Efek suara aktif")).toBeInTheDocument()
    expect(screen.getByLabelText("Umpan balik getar nonaktif")).toBeInTheDocument()
    expect(screen.getByText("Saldo awal")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Keluar" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Hapus akun" })).toBeInTheDocument()

    expect(screen.queryByText(/Bills section mock/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/laporan/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ringkasan bulanan/i)).not.toBeInTheDocument()
  })

  it("exposes personal category management from profile preferences", () => {
    render(<ProfileTab {...createProps()} />)

    expect(screen.getByText("Kategori")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Atur" })).toBeInTheDocument()
  })

  it("hides the upgrade CTA and shows Pro benefits for a paid account", () => {
    render(<ProfileTab {...createProps({ entitlement: { tier: "paid", usage: {} }, data: { transactions: [] } })} />)

    expect(screen.queryByRole("link", { name: /Upgrade ke Pro/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Kamu memakai Artami Pro seumur hidup/)).toBeInTheDocument()
  })

  it("shows Free quota usage and warning states from /api/me metadata", () => {
    render(<ProfileTab {...createProps({
      entitlement: {
        tier: "free",
        usage: {
          transactions: { current: 60, limit: 75, warning: "near" },
          budgets: { current: 1, limit: 3, warning: null },
          goals: { current: 1, limit: 1, warning: "reached" },
        },
      },
    })} />)

    expect(screen.getByText("Transaksi bulan ini")).toBeInTheDocument()
    expect(screen.getByText("Anggaran bulan ini")).toBeInTheDocument()
    expect(screen.getByText("Target")).toBeInTheDocument()
    expect(screen.getByText("60 / 75")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Hampir mencapai batas")
    expect(screen.getByRole("alert")).toHaveTextContent("Batas sudah terpakai")
    const upgradeLink = screen.getByRole("link", { name: /Upgrade ke Pro/ })
    expect(upgradeLink).toHaveAttribute("href", "/upgrade")
    expect(upgradeLink).toHaveClass("bg-violet-600")
  })

  it("labels the Profile upgrade entry as temporarily closed when registration is unavailable", () => {
    render(<ProfileTab {...createProps({
      entitlement: {
        tier: "free",
        featureAvailability: { proRegistration: false },
        usage: {},
      },
    })} />)

    expect(screen.getByRole("link", { name: "Pro sementara ditutup" })).toHaveAttribute("href", "/upgrade")
  })
})
