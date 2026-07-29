import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import ProfileTab from "@/app/dashboard/ProfileTab"

vi.mock("@/lib/useSharedData", () => ({
  useSettings: vi.fn(),
}))

const { useSettings } = await import("@/lib/useSharedData")

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
    useSettings.mockReturnValue({
      settings: {
        startingBalance: 2500000,
        startingBalanceDate: "2026-07-01",
      },
      refetch: vi.fn(),
    })
  })

  it("keeps identity visible near the top with an account-focused summary", () => {
    render(<ProfileTab {...createProps()} />)

    expect(screen.getByRole("heading", { name: "Ayu Lestari" })).toBeInTheDocument()
    expect(screen.getAllByText("ayu@example.com").length).toBeGreaterThan(0)
    expect(screen.getByText("Identitas Akun")).toBeInTheDocument()
    expect(screen.getByText("Total Transaksi")).toBeInTheDocument()
  })

  it("adds paket dan akses near the top before preferences", () => {
    render(<ProfileTab {...createProps()} />)

    const accessHeading = screen.getByText("Paket & Akses")
    const preferencesHeading = screen.getByText("Preferensi")

    expect(screen.getByText("Paket Saat Ini")).toBeInTheDocument()
    expect(screen.getByText("Free")).toBeInTheDocument()
    expect(screen.getByText("Sumber Data")).toBeInTheDocument()
    expect(accessHeading.compareDocumentPosition(preferencesHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("keeps preferences, data controls, and logout while excluding bills and reports", () => {
    render(<ProfileTab {...createProps()} />)

    expect(screen.getByText("Preferensi")).toBeInTheDocument()
    expect(screen.getByLabelText("Sound effects on")).toBeInTheDocument()
    expect(screen.getByLabelText("Haptic feedback off")).toBeInTheDocument()
    expect(screen.getByText("Data & Sesi")).toBeInTheDocument()
    expect(screen.getByText("Saldo Awal")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument()

    expect(screen.queryByText(/Bills section mock/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/laporan/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ringkasan bulanan/i)).not.toBeInTheDocument()
  })

  it("hides the upgrade CTA and shows Pro benefits for a paid account", () => {
    render(<ProfileTab {...createProps({ entitlement: { tier: "paid", usage: {} }, data: { transactions: [] } })} />)

    expect(screen.queryByRole("link", { name: "Upgrade ke Pro" })).not.toBeInTheDocument()
    expect(screen.getByText("Akun Anda telah menggunakan Pro Version.")).toBeInTheDocument()
    expect(screen.getByText(/Transaksi dan riwayat tanpa batas/)).toBeInTheDocument()
  })

  it("shows Free quota usage and warning states from /api/me metadata", () => {
    render(<ProfileTab {...createProps({
      entitlement: {
        tier: "free",
        usage: {
          transactions: { current: 60, limit: 75, warning: "near" },
          goals: { current: 1, limit: 1, warning: "reached" },
        },
      },
    })} />)

    expect(screen.getByText("Transaksi bulan ini")).toBeInTheDocument()
    expect(screen.getByText("60 / 75")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Mendekati batas")
    expect(screen.getByRole("alert")).toHaveTextContent("Batas tercapai")
    expect(screen.getByRole("link", { name: "Upgrade ke Pro" })).toHaveAttribute("href", "/upgrade")
  })
})
