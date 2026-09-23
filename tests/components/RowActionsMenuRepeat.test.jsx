import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import RowActionsMenu from "@/app/dashboard/_components/RowActionsMenu"

afterEach(() => cleanup())

describe("RowActionsMenu repeat action (Wave 5)", () => {
  it("offers Ulangi only when an onRepeat handler is provided", () => {
    render(<RowActionsMenu onEdit={vi.fn()} onDelete={vi.fn()} onRepeat={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Menu aksi" }))
    expect(screen.getByRole("menuitem", { name: "Ulangi" })).toBeInTheDocument()
    cleanup()

    render(<RowActionsMenu onEdit={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Menu aksi" }))
    expect(screen.queryByRole("menuitem", { name: "Ulangi" })).toBeNull()
  })

  it("invokes onRepeat once and closes the menu", () => {
    const onRepeat = vi.fn()
    render(<RowActionsMenu onEdit={vi.fn()} onDelete={vi.fn()} onRepeat={onRepeat} />)
    fireEvent.click(screen.getByRole("button", { name: "Menu aksi" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Ulangi" }))
    expect(onRepeat).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("menuitem", { name: "Ulangi" })).toBeNull()
  })
})
