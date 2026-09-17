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
  default: ({ goal, progress }) => <div>{`${goal.nama}:${progress}`}</div>,
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
        data={{
          netWorth: 10000000,
          balances: {
            available: { value: 7000000 },
            allocations: { byGoal: { "goal-1": { remaining: 1500000 } }, liquidAssigned: 1500000, liquidUnassigned: 1500000 },
          },
        }}
        transactions={[{ type: "savings", goalId: "goal-1", amount: 1500000, date: "1 Jan 2026" }]}
      />,
    )

    expect(screen.getByRole("heading", { name: "Target" })).toBeInTheDocument()
    const summary = screen.getByRole("region", { name: "Ringkasan tabungan" })
    expect(summary).toHaveTextContent("Total Tabungan")
    expect(summary).toHaveTextContent("10.000.000")
    expect(summary).toHaveTextContent("Tersedia untuk dibagi")
    // Unreserved cash plus savings that are set aside but not yet assigned.
    expect(summary).toHaveTextContent("8.500.000")
    expect(summary).toHaveTextContent("tiap target hanya menerima tabungan yang kamu alokasikan ke target itu")
  })

  it("floors the available pool at zero when the canonical values are empty", () => {
    render(
      <GoalsSection
        data={{
          netWorth: 0,
          balances: { available: { value: 0 }, allocations: { byGoal: {}, liquidAssigned: 0, liquidUnassigned: 0 } },
        }}
        transactions={[]}
      />,
    )

    expect(screen.getByRole("region", { name: "Ringkasan tabungan" })).toHaveTextContent("Rp 0")
  })

  it("credits a goal only through its explicit allocation, never a matching category", () => {
    hookState.goals = [
      { id: "goal-1", nama: "Dana Darurat", kategori: "Dana Darurat", target: 5000000, createdAt: "2025-01-01T00:00:00.000Z" },
      { id: "goal-2", nama: "Liburan", kategori: "Dana Darurat", target: 5000000, createdAt: "2025-01-01T00:00:00.000Z" },
    ]

    render(
      <GoalsSection
        data={{
          netWorth: 5000000,
          balances: {
            available: { value: 4000000 },
            allocations: { byGoal: { "goal-1": { remaining: 1000000 } }, liquidAssigned: 1000000, liquidUnassigned: 0 },
          },
        }}
        transactions={[{ type: "savings", goalId: "goal-1", amount: 1000000, date: "1 Jan 2026" }]}
      />,
    )

    // Both goals share the same category, but only the allocated one progresses.
    expect(screen.getByText("Dana Darurat:1000000")).toBeInTheDocument()
    expect(screen.getByText("Liburan:0")).toBeInTheDocument()
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
