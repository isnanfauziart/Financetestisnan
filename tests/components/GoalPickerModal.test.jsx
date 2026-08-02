import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import GoalPickerModal from "@/components/GoalPickerModal"

vi.mock("@/lib/useSharedData", () => ({
  useGoals: vi.fn(),
}))

vi.mock("@/app/dashboard/_components/Sheet", () => ({
  default: ({ open, children }) => open ? <div role="dialog">{children}</div> : null,
}))

vi.mock("@/components/GoalContributeModal", () => ({
  default: () => <div>Goal contribution mock</div>,
}))

const { useGoals } = await import("@/lib/useSharedData")

describe("GoalPickerModal empty state", () => {
  beforeEach(() => {
    useGoals.mockReturnValue({ goals: [], loading: false, refetch: vi.fn() })
  })

  it("offers a working CTA to create a goal in Rencana", () => {
    const onClose = vi.fn()
    const onOpenGoals = vi.fn()

    render(<GoalPickerModal open onClose={onClose} onOpenGoals={onOpenGoals} transactions={[]} />)

    expect(screen.getByText(/Buat goal di Rencana untuk mulai menabung/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Buat Goal" }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onOpenGoals).toHaveBeenCalledTimes(1)
  })

  it("shows a retryable error instead of treating a failed request as empty", () => {
    const refetch = vi.fn()
    useGoals.mockReturnValue({ goals: [], loading: false, error: "Goals API down", refetch })

    render(<GoalPickerModal open onClose={vi.fn()} transactions={[]} />)

    expect(screen.getByRole("alert")).toHaveTextContent("Goals API down")
    expect(screen.queryByText(/Belum ada goal aktif/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /coba lagi/i }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
