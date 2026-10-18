import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import PlanTab from "@/app/dashboard/PlanTab"

const dynamicCapture = vi.hoisted(() => ({ props: null }))
const sharedData = vi.hoisted(() => ({
  useBudgets: vi.fn(() => ({ budgets: [], loading: false, error: null })),
  useGoals: vi.fn(() => ({ goals: [], loading: false, error: null })),
  useDebts: vi.fn(() => ({ debts: [], loading: false, error: null })),
  useEvents: vi.fn(() => ({ events: [], loading: false, error: null })),
}))
vi.mock("@/lib/useSharedData", () => sharedData)

vi.mock("next/dynamic", () => ({
  default: () => function DynamicMock(props) {
    dynamicCapture.props = props
    return <div>FI tracker mock</div>
  },
}))

vi.mock("@/components/GoalsSection", () => ({ default: () => <div>Goals section mock</div> }))
vi.mock("@/components/DebtsSection", () => ({ default: () => <div>Debts section mock</div> }))
vi.mock("@/components/BudgetsSection", () => ({ default: () => <div>Budgets section mock</div> }))
vi.mock("@/components/BillsSection", () => ({
  default: ({ onBillsChanged }) => (
    <button type="button" onClick={onBillsChanged}>Bills section mock</button>
  ),
}))
vi.mock("@/components/EventBudgetsSection", () => ({ default: () => <div>Event budgets section mock</div> }))

function createProps(overrides = {}) {
  return {
    data: { netWorth: 0 },
    moneyHidden: false,
    onToggleMoneyVisibility: vi.fn(),
    transactions: [],
    monthlyData: [],
    netWorthHistory: [],
    now: new Date("2026-06-15T00:00:00.000Z"),
    goalsRefreshTrigger: 0,
    eventsRefreshTrigger: 0,
    billsRefreshTrigger: 0,
    selectedMonth: "Jul",
    selectedYear: "2026",
    selectedAccount: "Semua Akun",
    filteredTransactions: [],
    expenseCategories: [],
    onToast: vi.fn(),
    onBillPay: vi.fn(),
    onWhatIfOpen: vi.fn(),
    entitlement: {
      features: {
        financialIndependence: true,
        whatIf: true,
      },
      upgrade: "/upgrade",
    },
    ...overrides,
  }
}

describe("PlanTab privacy eye", () => {
  it("renders the Ringkasan eye and masks card amounts in privacy mode", () => {
    render(<PlanTab {...createProps({
      moneyHidden: true,
      bills: [{ id: "b1", nama: "Internet", jumlah: 389000, daysUntilDue: 1, aktif: true }],
    })} />)

    const eye = screen.getAllByTestId("privacy-eye-toggle")[0]
    expect(eye).toHaveAttribute("aria-pressed", "true")
    const tagihan = within(screen.getByRole("button", { name: "Buka Tagihan" }))
    expect(tagihan.getByText("Internet")).toBeInTheDocument()
    expect(tagihan.getByText("Rp ••••••••")).toBeInTheDocument()
  })
})

function getHubPillar(label) {
  // Exact match: the attention band also renders "Buka Tagihan: …" buttons.
  return screen.getByRole("button", { name: `Buka ${label}`, exact: true })
}

describe("PlanTab planning ownership", () => {
  it("shows hub pillar labels for every planning section", () => {
    render(<PlanTab {...createProps()} />)

    expect(getHubPillar("Target")).toBeInTheDocument()
    expect(getHubPillar("Anggaran")).toBeInTheDocument()
    expect(getHubPillar("Tagihan")).toBeInTheDocument()
    expect(getHubPillar("Utang & Piutang")).toBeInTheDocument()
    expect(getHubPillar("Event")).toBeInTheDocument()
    expect(getHubPillar("Simulasi")).toBeInTheDocument()
  })

  it("renders the hub as a card gallery inside the Ringkasan region", () => {
    render(<PlanTab {...createProps()} />)

    expect(screen.getByRole("region", { name: "Ringkasan Rencana" })).toBeInTheDocument()
    ;["Target", "Anggaran", "Tagihan", "Utang & Piutang", "Event", "Simulasi"].forEach((label) => {
      expect(getHubPillar(label)).toBeInTheDocument()
    })
  })

  it("opens on the Rencana Bulan Ini hub", () => {
    render(<PlanTab {...createProps()} />)

    expect(screen.getByRole("heading", { name: "Rencana bulan ini" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Target" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Anggaran" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Tagihan" })).toBeInTheDocument()
    expect(screen.queryByText("Goals section mock")).not.toBeInTheDocument()
    expect(screen.queryByText("Budgets section mock")).not.toBeInTheDocument()
    expect(screen.queryByText("Bills section mock")).not.toBeInTheDocument()
  })

  it("opens the existing Simulasi section from the hub pillar", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(getHubPillar("Simulasi"))

    expect(screen.getByRole("button", { name: "Buka simulator What-If" })).toBeInTheDocument()
    expect(screen.getByText("FI tracker mock")).toBeInTheDocument()
  })

  it("passes the unfiltered net worth history to the financial freedom card", () => {
    const history = [{ month: "Mei", year: "2026", value: 123 }]
    render(<PlanTab {...createProps({ activeSection: "simulasi", netWorthHistory: history })} />)

    expect(dynamicCapture.props.netWorthHistory).toBe(history)
  })

  it("passes the live clock to the financial freedom card", () => {
    const now = new Date("2026-06-30T00:00:00.000Z")
    render(<PlanTab {...createProps({ activeSection: "simulasi", now })} />)

    expect(dynamicCapture.props.now).toBe(now)
  })

  it("shows a familiar icon beside every hub pillar label", () => {
    render(<PlanTab {...createProps()} />)

    ;["Target", "Anggaran", "Tagihan", "Utang & Piutang", "Event", "Simulasi"].forEach((label) => {
      expect(getHubPillar(label).querySelector("svg")).toBeInTheDocument()
    })
  })

  it("uses semantic icon tiles and soft solid fills for every hub pillar", () => {
    render(<PlanTab {...createProps()} />)

    const semanticTones = [
      ["Target", "bg-sage-100", "bg-white/70", "text-sage-700"],
      ["Anggaran", "bg-amber-100", "bg-white/70", "text-amber-700"],
      ["Tagihan", "bg-clay-100", "bg-white/70", "text-clay-600"],
      ["Utang & Piutang", "bg-rose-100", "bg-white/70", "text-rose-700"],
      ["Event", "bg-indigo-100", "bg-white/70", "text-indigo-700"],
      ["Simulasi", "bg-[#1F2D28]", "bg-violet-100", "text-violet-700"],
    ]

    semanticTones.forEach(([label, cardFill, tileBg, tileColor]) => {
      const pillar = getHubPillar(label)

      expect(pillar).toHaveClass(cardFill)
      expect(pillar.querySelector("[data-plan-icon-tile]")).toHaveClass(tileBg, tileColor)
    })
  })

  it("keeps hub cards keyboard-focusable with a visible focus ring", () => {
    render(<PlanTab {...createProps()} />)

    const pillarTones = [
      ["Target", "bg-white/70", "text-sage-700"],
      ["Anggaran", "bg-white/70", "text-amber-700"],
      ["Tagihan", "bg-white/70", "text-clay-600"],
    ]

    pillarTones.forEach(([label, background, color]) => {
      const pillar = getHubPillar(label)
      expect(pillar).toHaveClass("focus-visible:ring-2")
      expect(pillar.querySelector("[data-plan-icon-tile]")).toHaveClass(background, color)
      expect(within(pillar).getByText(label)).toBeInTheDocument()
    })
  })

  it("keeps goals available as a deep-linked owner section", () => {
    render(<PlanTab {...createProps({ activeSection: "goal" })} />)

    expect(screen.getByText("Goals section mock")).toBeInTheDocument()
  })

  it("moves budget ownership into the Budget section", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(getHubPillar("Anggaran"))

    expect(screen.getByText("Budgets section mock")).toBeInTheDocument()
    expect(screen.queryByText("Goals section mock")).not.toBeInTheDocument()
  })

  it("moves bill management into the Tagihan section", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(getHubPillar("Tagihan"))

    expect(screen.getByText("Bills section mock")).toBeInTheDocument()
    expect(screen.queryByText("Goals section mock")).not.toBeInTheDocument()
  })

  it("forwards the bill-change callback to the Tagihan section", () => {
    const onBillsChanged = vi.fn()
    render(<PlanTab {...createProps({ activeSection: "tagihan", onBillsChanged })} />)

    fireEvent.click(screen.getByRole("button", { name: "Bills section mock" }))

    expect(onBillsChanged).toHaveBeenCalledTimes(1)
  })

  it("supports deep-linking directly into a plan section from shared routing state", () => {
    render(<PlanTab {...createProps({ activeSection: "tagihan", onSectionChange: vi.fn() })} />)

    expect(screen.getByText("Bills section mock")).toBeInTheDocument()
    expect(screen.queryByText("Goals section mock")).not.toBeInTheDocument()
  })

  it("gives debts and events dedicated owner sections", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(getHubPillar("Utang & Piutang"))
    expect(screen.getByText("Debts section mock")).toBeInTheDocument()
    expect(screen.queryByText("Event budgets section mock")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Kembali ke Ringkasan Rencana" }))
    fireEvent.click(getHubPillar("Event"))
    expect(screen.getByText("Event budgets section mock")).toBeInTheDocument()
    expect(screen.queryByText("Debts section mock")).not.toBeInTheDocument()
  })

  it("keeps only future-oriented tools under Simulasi", () => {
    render(<PlanTab {...createProps()} />)

    fireEvent.click(getHubPillar("Simulasi"))

    expect(screen.getByRole("button", { name: "Buka simulator What-If" })).toBeInTheDocument()
    expect(screen.getByText("FI tracker mock")).toBeInTheDocument()
    expect(screen.queryByText("Debts section mock")).not.toBeInTheDocument()
    expect(screen.queryByText("Event budgets section mock")).not.toBeInTheDocument()
  })

  it("shows the back button instead of the hub inside a section", () => {
    render(<PlanTab {...createProps({ activeSection: "simulasi", onSectionChange: vi.fn() })} />)

    expect(screen.getByRole("button", { name: "Kembali ke Ringkasan Rencana" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Buka Target" })).not.toBeInTheDocument()
  })
})

describe("PlanTab hub cards — attention band + card gallery", () => {
  const urgentBill = { id: "b1", nama: "Internet", jumlah: 389000, daysUntilDue: 1, aktif: true }

  it("shows per-card hero content on the hub cards", () => {
    render(<PlanTab {...createProps({ bills: [urgentBill] })} />)

    const tagihan = within(getHubPillar("Tagihan"))
    expect(tagihan.getByText("Internet")).toBeInTheDocument()
    expect(tagihan.getByText("Rp 389 rb")).toBeInTheDocument()
    expect(tagihan.getByText("Besok")).toBeInTheDocument()
  })

  it("shows the Perlu perhatian band for urgent items and opens the section on tap", () => {
    render(<PlanTab {...createProps({ bills: [urgentBill] })} />)

    expect(screen.getByRole("region", { name: "Perlu perhatian" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Buka Tagihan: Internet/ }))
    expect(screen.queryByText("Bills section mock")).toBeInTheDocument()
  })

  it("hides the Perlu perhatian band when nothing is urgent", () => {
    render(<PlanTab {...createProps({ bills: [] })} />)

    expect(screen.queryByRole("region", { name: "Perlu perhatian" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Target" })).toBeInTheDocument()
  })
})

describe("PlanHubCards visuals", () => {
  const resetSharedData = () => {
    sharedData.useBudgets.mockReturnValue({ budgets: [], loading: false, error: null })
    sharedData.useGoals.mockReturnValue({ goals: [], loading: false, error: null })
    sharedData.useDebts.mockReturnValue({ debts: [], loading: false, error: null })
    sharedData.useEvents.mockReturnValue({ events: [], loading: false, error: null })
  }

  beforeEach(() => { resetSharedData() })

  it("renders the target card with goal progress and ETA", () => {
    sharedData.useGoals.mockReturnValue({
      goals: [{ id: "g1", nama: "Dana Darurat", target: 10000000, status: "active", deadline: "2027-12" }],
      loading: false,
      error: null,
    })
    render(<PlanTab {...createProps({
      data: { netWorth: 0, balances: { allocations: { byGoal: { g1: { remaining: 4200000 } } } } },
    })} />)

    const card = within(screen.getByRole("button", { name: "Buka Target" }))
    expect(card.getByText("Dana Darurat")).toBeInTheDocument()
    expect(card.getByText("Rp 4.2 jt")).toBeInTheDocument()
    expect(card.getByText("/ Rp 10.0 jt")).toBeInTheDocument()
    expect(card.getByRole("progressbar", { name: /Progres target Dana Darurat/ })).toHaveAttribute("aria-valuenow", "42")
    expect(card.getByText(/± \d+ bln lagi/)).toBeInTheDocument()
  })

  it("renders the budget card with per-category bars and a hot flag at 90%+", () => {
    sharedData.useBudgets.mockReturnValue({
      budgets: [
        { kategori: "Makan", limit: 1000000, akun: "", bulan: "Jul", tahun: "2026" },
        { kategori: "Jajan", limit: 500000, akun: "", bulan: "Jul", tahun: "2026" },
      ],
      loading: false,
      error: null,
    })
    render(<PlanTab {...createProps({
      transactions: [
        { type: "expense", category: "Makan", amount: 780000, month: "Jul", year: "2026", account: "BCA" },
        { type: "expense", category: "Jajan", amount: 460000, month: "Jul", year: "2026", account: "BCA" },
      ],
    })} />)

    const card = within(screen.getByRole("button", { name: "Buka Anggaran" }))
    expect(card.getByText("Rp 1.2 jt")).toBeInTheDocument()
    expect(card.getByText("Makan")).toBeInTheDocument()
    expect(card.getByText("78%")).toBeInTheDocument()
    expect(card.getByText("Jajan")).toBeInTheDocument()
    expect(card.getByText("92%")).toHaveClass("text-clay-600")
  })

  it("renders the utang card with the owed split", () => {
    sharedData.useDebts.mockReturnValue({
      debts: [
        { status: "open", arah: "utang", sisaSaldo: 500000 },
        { status: "open", arah: "piutang", sisaSaldo: 1200000 },
      ],
      loading: false,
      error: null,
    })
    render(<PlanTab {...createProps()} />)

    const card = within(screen.getByRole("button", { name: "Buka Utang & Piutang" }))
    expect(card.getByText("Rp 500 rb")).toBeInTheDocument()
    expect(card.getByText("Rp 1.2 jt")).toBeInTheDocument()
  })

  it("renders the event card with the deadline", () => {
    sharedData.useEvents.mockReturnValue({
      events: [{ nama: "Nikahan Dena", tanggalSelesai: "2026-12-20", totalBudget: 5000000, pct: 40, status: "active" }],
      loading: false,
      error: null,
    })
    render(<PlanTab {...createProps()} />)

    const card = within(screen.getByRole("button", { name: "Buka Event" }))
    expect(card.getByText("Nikahan Dena")).toBeInTheDocument()
    expect(card.getByText("Rp 2.0 jt")).toBeInTheDocument()
    expect(card.getByText(/Des 2026/)).toBeInTheDocument()
  })

  it("shows the Pro badge on the Simulasi card when the feature is tier-locked", () => {
    render(<PlanTab {...createProps({
      entitlement: { features: { financialIndependence: false, whatIf: false } },
    })} />)

    const card = within(screen.getByRole("button", { name: "Buka Simulasi" }))
    expect(card.getByText("Pro")).toBeInTheDocument()
  })
})
