import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import BudgetCard from "@/components/BudgetCard"

afterEach(() => cleanup())

const baseBudget = {
  kategori: "Makanan",
  limit: 1000000,
  akun: "BCA",
}

describe("BudgetCard", () => {
  it("renders category, account badge, and spent/limit", () => {
    render(<BudgetCard budget={baseBudget} spent={500000} onClick={() => {}} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText("Makanan")).toBeInTheDocument()
    expect(screen.getByText("BCA")).toBeInTheDocument()
    expect(screen.getByText("50% used")).toBeInTheDocument()
  })

  it("shows 'Sehat' status when under 70% spent", () => {
    render(<BudgetCard budget={baseBudget} spent={500000} onClick={() => {}} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText("Sehat")).toBeInTheDocument()
  })

  it("shows 'Hampir' status at 90% spent", () => {
    render(<BudgetCard budget={baseBudget} spent={900000} onClick={() => {}} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText("Hampir")).toBeInTheDocument()
  })

  it("shows 'Over' status when at or above 100% spent", () => {
    render(<BudgetCard budget={baseBudget} spent={1100000} onClick={() => {}} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText("Over")).toBeInTheDocument()
  })

  it("omits account badge when akun is empty", () => {
    render(<BudgetCard budget={{ ...baseBudget, akun: "" }} spent={500000} onClick={() => {}} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.queryByText("BCA")).toBeNull()
  })

  it("edit and delete buttons are always present in DOM (touch device fix)", () => {
    render(<BudgetCard budget={baseBudget} spent={500000} onClick={() => {}} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByLabelText("Edit Makanan budget")).toBeInTheDocument()
    expect(screen.getByLabelText("Delete Makanan budget")).toBeInTheDocument()
  })

  it("calls onEdit when edit button clicked", () => {
    const onEdit = vi.fn()
    render(<BudgetCard budget={baseBudget} spent={500000} onClick={() => {}} onEdit={onEdit} onDelete={() => {}} />)
    fireEvent.click(screen.getByLabelText("Edit Makanan budget"))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it("calls onDelete when delete button clicked", () => {
    const onDelete = vi.fn()
    render(<BudgetCard budget={baseBudget} spent={500000} onClick={() => {}} onEdit={() => {}} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText("Delete Makanan budget"))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it("calls onClick when progress bar area clicked", () => {
    const onClick = vi.fn()
    render(<BudgetCard budget={baseBudget} spent={500000} onClick={onClick} onEdit={() => {}} onDelete={() => {}} />)
    fireEvent.click(screen.getByLabelText("Open Makanan drill-down"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
