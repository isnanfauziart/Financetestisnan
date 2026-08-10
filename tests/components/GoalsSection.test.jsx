import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import GoalsSection from "@/components/GoalsSection"

const hookState = vi.hoisted(() => ({
  goals: [],
  loading: false,
  error: null,
  refetch: vi.fn(),
}))

vi.mock("@/lib/useSharedData", () => ({
  useGoals: vi.fn(() => hookState),
}))

vi.mock("@/components/GoalCard", () => ({
  default: ({ goal }) => <div>{goal.nama}</div>,
}))

vi.mock("@/components/GoalSetupModal", () => ({ default: () => null }))
vi.mock("@/components/GoalContributeModal", () => ({ default: () => null }))
vi.mock("@/components/GoalSettleModal", () => ({ default: () => null }))

afterEach(() => cleanup())

describe("GoalsSection savings summary", () => {
  beforeEach(() => {
    hookState.goals = [{
      id: "goal-1",
      nama: "Dana Darurat",
      kategori: "Dana Darurat",
      target: 5000000,
      createdAt: "2025-01-01T00:00:00.000Z",
    }]
    hookState.loading = false
    hookState.error = null
  })

  it("shows the net worth total, available pool, and source note", () => {
    render(
      <GoalsSection
        data={{ netWorth: 10000000 }}
        transactions={[{ type: "savings", category: "Dana Darurat", amount: 1500000, date: "1 Jan 2026" }]}
      />,
    )

    expect(screen.getByRole("heading", { name: "Target" })).toBeInTheDocument()
    const summary = screen.getByRole("region", { name: "Ringkasan tabungan" })
    expect(summary).toHaveTextContent("Total Tabungan")
    expect(summary).toHaveTextContent("10.000.000")
    expect(summary).toHaveTextContent("Tersedia untuk dibagi")
    expect(summary).toHaveTextContent("8.500.000")
    expect(summary).toHaveTextContent("Total tabunganmu dihitung dari pemasukan dikurangi pengeluaran tiap bulan.")
  })

  it("floors available pool at zero when allocations exceed net worth", () => {
    render(
      <GoalsSection
        data={{ netWorth: 1000000 }}
        transactions={[{ type: "savings", category: "Dana Darurat", amount: 1500000, date: "1 Jan 2026" }]}
      />,
    )

    expect(screen.getByRole("region", { name: "Ringkasan tabungan" })).toHaveTextContent("Rp 0")
  })

  it("explains how to start a target before showing the create CTA", () => {
    hookState.goals = []

    render(
      <GoalsSection
        data={{ netWorth: 0 }}
        transactions={[]}
      />,
    )

    expect(screen.getByRole("heading", { name: "Mulai dari satu target kecil" })).toBeInTheDocument()
    expect(screen.getByText("Pilih target")).toBeInTheDocument()
    expect(screen.getByText("Tentukan nominal dan waktunya")).toBeInTheDocument()
    expect(screen.getByText("Tambah tabungan")).toBeInTheDocument()
    expect(screen.getByText("Lihat perkembangannya")).toBeInTheDocument()
    expect(screen.getByText("Contoh")).toBeInTheDocument()
    expect(screen.getByText("Dana Darurat / Liburan")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buat Target" })).toHaveClass("min-h-11", "min-w-11")
  })
})
