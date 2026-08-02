import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import SelectField from "@/app/dashboard/_components/SelectField"

describe("SelectField accessibility", () => {
  it("associates its label and exposes listbox state", () => {
    render(<SelectField label="Kategori" value="Makanan" onChange={vi.fn()} options={["Makanan", "Transportasi"]} />)

    const button = screen.getByRole("button", { name: "Kategori" })
    const label = screen.getByText("Kategori")

    expect(button).toHaveAttribute("aria-haspopup", "listbox")
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(button).toHaveAttribute("aria-controls")
    expect(label).toHaveAttribute("for", button.id)

    fireEvent.click(button)

    const listbox = screen.getByRole("listbox")
    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(listbox).toHaveAttribute("id", button.getAttribute("aria-controls"))
    expect(screen.getByRole("option", { name: "Makanan" })).toHaveAttribute("aria-selected", "true")
  })

  it("supports arrow-key selection and Escape without losing focus", () => {
    const onChange = vi.fn()
    render(<SelectField label="Kategori" value="Makanan" onChange={onChange} options={["Makanan", "Transportasi", "Tagihan"]} />)

    const button = screen.getByRole("button", { name: "Kategori" })
    fireEvent.click(button)

    const listbox = screen.getByRole("listbox")
    fireEvent.keyDown(listbox, { key: "ArrowDown" })
    expect(document.activeElement).toBe(screen.getByRole("option", { name: "Transportasi" }))

    fireEvent.keyDown(document.activeElement, { key: "Enter" })
    expect(onChange).toHaveBeenCalledWith("Transportasi")
    expect(document.activeElement).toBe(button)

    fireEvent.keyDown(button, { key: "ArrowDown" })
    expect(screen.getByRole("listbox")).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" })
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(document.activeElement).toBe(button)
  })
})
