import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { BudgetBrief, GoalBrief, BillBrief } from "@/components/PlanBriefSignal"
const state = vi.hoisted(() => ({ budgets: [], goals: [], loading: false, error: null }))
vi.mock("@/lib/useSharedData", () => ({ useBudgets: () => state, useGoals: () => state }))
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
})
