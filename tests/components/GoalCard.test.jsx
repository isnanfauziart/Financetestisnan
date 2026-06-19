import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import GoalCard from "@/components/GoalCard"

afterEach(() => cleanup())

const baseGoal = {
  id: "1",
  nama: "Beli Laptop",
  kategori: "Tech",
  target: 1000000,
  createdAt: "2025-01-01T00:00:00.000Z",
  color: "#5b8c7a",
}

describe("GoalCard", () => {
  it("renders goal name and category", () => {
    render(<GoalCard goal={baseGoal} progress={500000} onContribute={() => {}} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText("Beli Laptop")).toBeInTheDocument()
    expect(screen.getByText("Tech")).toBeInTheDocument()
  })

  it("shows 'Selesai' badge when progress >= target", () => {
    render(<GoalCard goal={baseGoal} progress={1000000} onContribute={() => {}} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText("✓ Selesai")).toBeInTheDocument()
  })

  it("hides 'Kontribusi' button when goal is completed", () => {
    render(<GoalCard goal={baseGoal} progress={1000000} onContribute={() => {}} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.queryByLabelText("Contribute to Beli Laptop")).toBeNull()
  })

  it("renders Kontribusi button when goal is in progress", () => {
    render(<GoalCard goal={baseGoal} progress={500000} onContribute={() => {}} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByLabelText("Contribute to Beli Laptop")).toBeInTheDocument()
  })

  it("edit and delete buttons are always present in DOM (touch device fix)", () => {
    render(<GoalCard goal={baseGoal} progress={500000} onContribute={() => {}} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByLabelText("Edit Beli Laptop goal")).toBeInTheDocument()
    expect(screen.getByLabelText("Delete Beli Laptop goal")).toBeInTheDocument()
  })

  it("calls onEdit when edit button clicked", () => {
    const onEdit = vi.fn()
    render(<GoalCard goal={baseGoal} progress={500000} onContribute={() => {}} onEdit={onEdit} onDelete={() => {}} />)
    fireEvent.click(screen.getByLabelText("Edit Beli Laptop goal"))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it("calls onDelete when delete button clicked", () => {
    const onDelete = vi.fn()
    render(<GoalCard goal={baseGoal} progress={500000} onContribute={() => {}} onEdit={() => {}} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText("Delete Beli Laptop goal"))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it("calls onContribute when contribute button clicked", () => {
    const onContribute = vi.fn()
    render(<GoalCard goal={baseGoal} progress={500000} onContribute={onContribute} onEdit={() => {}} onDelete={() => {}} />)
    fireEvent.click(screen.getByLabelText("Contribute to Beli Laptop"))
    expect(onContribute).toHaveBeenCalledTimes(1)
  })
})
