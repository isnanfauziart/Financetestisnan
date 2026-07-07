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
})
