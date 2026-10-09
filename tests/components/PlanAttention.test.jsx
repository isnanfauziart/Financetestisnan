import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, renderHook } from "@testing-library/react"
import { useAttentionItems, AttentionBand } from "@/components/PlanAttention"

const state = vi.hoisted(() => ({ budgets: [], debts: [], featuresOn: true }))
vi.mock("@/lib/useSharedData", () => ({
  useBudgets: () => ({ budgets: state.budgets, loading: false, error: null }),
  useDebts: () => ({ debts: state.debts, loading: false, error: null }),
}))
vi.mock("@/lib/featureAccess", () => ({ hasFeature: () => state.featuresOn }))

const iso = (offsetDays) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split("T")[0]
}

const baseProps = {
  entitlement: {},
  bills: [],
  transactions: [],
  selectedMonth: "Okt",
  selectedYear: "2026",
  selectedAccount: "Semua Akun",
  moneyHidden: false,
}

beforeEach(() => {
  state.budgets = []
  state.debts = []
  state.featuresOn = true
})

function runHook(overrides = {}) {
  const { result } = renderHook(() => useAttentionItems({ ...baseProps, ...overrides }))
  return result.current
}

describe("attention rules", () => {
  it("flags bills due within 3 days, including overdue", () => {
    const items = runHook({
      bills: [
        { id: "b1", nama: "Internet", jumlah: 389000, daysUntilDue: 1, aktif: true },
        { id: "b2", nama: "Listrik", jumlah: 250000, daysUntilDue: -2, aktif: true },
        { id: "b3", nama: "Netflix", jumlah: 65000, daysUntilDue: 10, aktif: true },
      ],
    })
    expect(items.map(i => i.id)).toEqual(["bill-b2", "bill-b1"])
    expect(items[0].detail).toContain("2 hari terlambat")
    expect(items[1].detail).toContain("jatuh tempo besok")
  })

  it("flags budgets at 80%+ used and ignores the rest", () => {
    state.budgets = [
      { kategori: "Makan", bulan: "Okt", tahun: "2026", limit: 100000 },
      { kategori: "Jajan", bulan: "Okt", tahun: "2026", limit: 100000 },
    ]
    const items = runHook({
      transactions: [
        { type: "expense", category: "Makan", account: "BCA", amount: 92000, date: "2026-10-05" },
        { type: "expense", category: "Jajan", account: "BCA", amount: 30000, date: "2026-10-05" },
      ],
    })
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe("Anggaran Makan")
    expect(items[0].detail).toContain("92% terpakai")
  })

  it("flags open debts due within 7 days", () => {
    state.debts = [
      { id: "d1", nama: "Budi", arah: "piutang", sisaSaldo: 500000, status: "open", jatuhTempo: iso(5) },
      { id: "d2", nama: "Sari", arah: "utang", sisaSaldo: 200000, status: "open", jatuhTempo: iso(30) },
      { id: "d3", nama: "Lama", arah: "utang", sisaSaldo: 100000, status: "settled", jatuhTempo: iso(2) },
    ]
    const items = runHook()
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe("Piutang Budi")
    expect(items[0].section).toBe("utang")
  })

  it("caps at 3 items, most urgent first, and stays empty when calm", () => {
    const items = runHook({
      bills: [
        { id: "b1", nama: "A", jumlah: 1000, daysUntilDue: 0, aktif: true },
        { id: "b2", nama: "B", jumlah: 1000, daysUntilDue: 1, aktif: true },
        { id: "b3", nama: "C", jumlah: 1000, daysUntilDue: 2, aktif: true },
        { id: "b4", nama: "D", jumlah: 1000, daysUntilDue: 3, aktif: true },
      ],
    })
    expect(items).toHaveLength(3)
    expect(items[0].title).toBe("A")
    expect(runHook()).toHaveLength(0)
  })

  it("respects feature gates and privacy masking", () => {
    state.featuresOn = false
    expect(runHook({ bills: [{ id: "b1", nama: "A", jumlah: 389000, daysUntilDue: 1, aktif: true }] })).toHaveLength(0)
    state.featuresOn = true
    const items = runHook({
      moneyHidden: true,
      bills: [{ id: "b1", nama: "A", jumlah: 389000, daysUntilDue: 1, aktif: true }],
    })
    expect(items[0].detail).toContain("Rp ••••••••")
  })
})

describe("AttentionBand", () => {
  it("renders nothing when there is nothing urgent", () => {
    const { container } = render(<AttentionBand items={[]} onOpen={() => {}} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText("Perlu perhatian")).not.toBeInTheDocument()
  })

  it("opens the right section when an item is tapped", () => {
    const onOpen = vi.fn()
    render(<AttentionBand items={[{ id: "bill-b1", section: "tagihan", title: "Internet", detail: "Rp 389 rb jatuh tempo besok" }]} onOpen={onOpen} />)
    fireEvent.click(screen.getByRole("button", { name: /Buka Tagihan: Internet/ }))
    expect(onOpen).toHaveBeenCalledWith("tagihan")
  })
})
