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
    expect(screen.getByText("Tentang akunmu")).toBeInTheDocument()
    expect(screen.getByText("Total Transaksi")).toBeInTheDocument()
  })

  it("shows the name field near account identity and refreshes settings after saving", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal("fetch", fetchSpy)

    render(<ProfileTab {...createProps()} />)

    const identityHeading = screen.getByText("Tentang akunmu")
    const input = screen.getByLabelText("Nama pengguna")
    const ownershipHeading = screen.getByText("Data Milikmu")
    const accessHeading = screen.getByText("Paket kamu")
    expect(identityHeading.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(identityHeading.compareDocumentPosition(ownershipHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText(/Catatan keuanganmu tetap berada di Google Sheets milikmu/i)).toBeInTheDocument()
    expect(screen.getByText(/Artami tidak menghubungkan rekening bank/i)).toBeInTheDocument()
    expect(screen.getByText(/Tidak ada iklan/i)).toBeInTheDocument()
    expect(input.compareDocumentPosition(accessHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.change(input, { target: { value: "  Nama Profil  " } })
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({
      updates: [
        ["userName", "Nama Profil"],
        ["userNamePromptDismissed", true],
      ],
    })
    await waitFor(() => expect(refetchSettings).toHaveBeenCalled())
  })

  it("adds paket dan akses near the top before preferences", () => {
    render(<ProfileTab {...createProps()} />)

    const accessHeading = screen.getByText("Paket kamu")
    const preferencesHeading = screen.getByText("Pengaturan")

    expect(screen.getByText("Paket")).toBeInTheDocument()
    expect(screen.getByText("Free")).toBeInTheDocument()
    expect(screen.getByText("Data disimpan di")).toBeInTheDocument()
    expect(accessHeading.compareDocumentPosition(preferencesHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("keeps preferences, data controls, and logout while excluding bills and reports", () => {
    render(<ProfileTab {...createProps()} />)

    expect(screen.getByText("Pengaturan")).toBeInTheDocument()
    expect(screen.getByText("Suara")).toBeInTheDocument()
    expect(screen.getByText("Getaran")).toBeInTheDocument()
    expect(screen.getByLabelText("Efek suara aktif")).toBeInTheDocument()
    expect(screen.getByLabelText("Umpan balik getar nonaktif")).toBeInTheDocument()
    expect(screen.getByText("Data & akun")).toBeInTheDocument()
    expect(screen.getByText("Saldo Awal")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Keluar" })).toBeInTheDocument()

    expect(screen.queryByText(/Bills section mock/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/laporan/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ringkasan bulanan/i)).not.toBeInTheDocument()
  })

  it("exposes personal category management from profile preferences", () => {
    render(<ProfileTab {...createProps()} />)

    expect(screen.getByText("Kategori")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /atur kategori/i })).toBeInTheDocument()
  })

  it("hides the upgrade CTA and shows Pro benefits for a paid account", () => {
    render(<ProfileTab {...createProps({ entitlement: { tier: "paid", usage: {} }, data: { transactions: [] } })} />)

    expect(screen.queryByRole("link", { name: "Upgrade ke Pro" })).not.toBeInTheDocument()
    expect(screen.getByText("Kamu sudah memakai Artami Pro.")).toBeInTheDocument()
    expect(screen.getByText("Silakan nikmati semua fitur yang tersedia. Semoga Artami membantu mengelola keuangan kamu. Terima kasih!")).toBeInTheDocument()
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
    expect(screen.getByRole("link", { name: "Upgrade ke Pro" })).toHaveAttribute("href", "/upgrade")
    expect(screen.getByRole("link", { name: "Upgrade ke Pro" })).toHaveClass("bg-violet-600")
  })
})
