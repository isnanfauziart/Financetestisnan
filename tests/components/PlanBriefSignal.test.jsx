import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { BudgetBrief, GoalBrief, BillBrief, UtangBrief, EventBrief } from "@/components/PlanBriefSignal"
const state = vi.hoisted(() => ({ budgets: [], goals: [], debts: [], events: [], loading: false, error: null }))
vi.mock("@/lib/useSharedData", () => ({
  useBudgets: () => state,
  useGoals: () => state,
  useDebts: () => ({ debts: state.debts, loading: state.loading, error: state.error }),
  useEvents: () => ({ events: state.events, loading: state.loading, error: state.error }),
}))
describe("monthly brief", () => {
  it("uses matching budget transactions and period", () => {
    state.budgets = [{ kategori: "Makan", bulan: "Sep", tahun: "2026", limit: 100000, akun: "BCA" }]
    render(<BudgetBrief selectedMonth="Sep" selectedYear="2026" selectedAccount="Semua Akun" transactions={[
      { type: "expense", category: "Makan", account: "BCA", amount: 50000, date: "2026-09-02" },
      { type: "expense", category: "Makan", account: "BCA", amount: 50000, date: "2026-08-02" },
    ]} />)
    expect(screen.getByText("50% digunakan")).toBeInTheDocument()
  })
  it("shows the leading active target from its own allocation", () => {
    state.goals = [{ id: "1", nama: "Liburan", kategori: "Liburan", target: 100000 }]
    render(<GoalBrief allocations={{ byGoal: { 1: { remaining: 42000 } } }} />)
    expect(screen.getByText("42% tercapai")).toBeInTheDocument()
    expect(screen.getByText("Liburan")).toBeInTheDocument()
  })

  it("reports no progress when a goal owns no allocation", () => {
    state.goals = [{ id: "1", nama: "Liburan", kategori: "Liburan", target: 100000 }]
    render(<GoalBrief allocations={{ byGoal: {} }} />)
    expect(screen.getByText("0% tercapai")).toBeInTheDocument()
  })
  it("shows the nearest active bill and does not invent data on error", () => {
    const { rerender } = render(<BillBrief bills={[{ nama: "Internet", jumlah: 389000, daysUntilDue: 1, aktif: true }]} />)
    expect(screen.getByText("Besok")).toBeInTheDocument()
    rerender(<BillBrief billsError="Unavailable" />)
    expect(screen.getByText("Belum tersedia")).toBeInTheDocument()
  })

  it("masks budget and bill amounts in privacy mode while percentage headlines stay readable", () => {
    state.budgets = [{ kategori: "Makan", bulan: "Sep", tahun: "2026", limit: 100000, akun: "BCA" }]
    const { rerender } = render(<BudgetBrief selectedMonth="Sep" selectedYear="2026" selectedAccount="Semua Akun" moneyHidden transactions={[
      { type: "expense", category: "Makan", account: "BCA", amount: 50000, date: "2026-09-02" },
    ]} />)
    expect(screen.getByText("50% digunakan")).toBeInTheDocument()
    expect(screen.getByText("Sisa anggaran Rp ••••••••")).toBeInTheDocument()

    rerender(<BillBrief moneyHidden bills={[{ nama: "Internet", jumlah: 389000, daysUntilDue: 1, aktif: true }]} />)
    expect(screen.getByText("Internet · Rp ••••••••")).toBeInTheDocument()
    expect(screen.queryByText(/Rp 389 rb/)).not.toBeInTheDocument()
  })
})

describe("utang and event briefs", () => {
  it("totals open debts and counts the notes", () => {
    state.debts = [
      { id: "1", nama: "Budi", arah: "piutang", sisaSaldo: 500000, status: "open" },
      { id: "2", nama: "Sari", arah: "utang", sisaSaldo: 200000, status: "open" },
      { id: "3", nama: "Lunas", arah: "utang", sisaSaldo: 0, status: "settled" },
    ]
    render(<UtangBrief />)
    expect(screen.getByText("Rp 700 rb")).toBeInTheDocument()
    expect(screen.getByText("2 catatan terbuka")).toBeInTheDocument()
  })

  it("reports a calm state when nothing is open", () => {
    state.debts = []
    const { unmount } = render(<UtangBrief />)
    expect(screen.getByText("Lunas semua")).toBeInTheDocument()
    unmount()
  })

  it("masks the outstanding amount in privacy mode", () => {
    state.debts = [{ id: "1", nama: "Budi", arah: "piutang", sisaSaldo: 500000, status: "open" }]
    render(<UtangBrief moneyHidden />)
    expect(screen.getByText("Rp ••••••••")).toBeInTheDocument()
    expect(screen.queryByText(/Rp 500 rb/)).not.toBeInTheDocument()
  })

  it("picks the nearest upcoming event with its countdown", () => {
    const soon = new Date(); soon.setDate(soon.getDate() + 12)
    const later = new Date(); later.setDate(later.getDate() + 40)
    const iso = (d) => d.toISOString().split("T")[0]
    state.events = [
      { id: "2", nama: "Nikahan", totalBudget: 10000000, pct: 10, tanggalSelesai: iso(later), status: "active" },
      { id: "1", nama: "Lebaran", totalBudget: 5000000, pct: 70, tanggalSelesai: iso(soon), status: "active" },
    ]
    render(<EventBrief />)
    expect(screen.getByText("12 hari")).toBeInTheDocument()
    expect(screen.getByText(/Lebaran/)).toBeInTheDocument()
  })

  it("reports no event when none is upcoming", () => {
    state.events = []
    render(<EventBrief />)
    expect(screen.getByText("Belum ada event")).toBeInTheDocument()
  })
})
