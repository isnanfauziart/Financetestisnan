import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import CategoryManager from "@/components/CategoryManager"

const categories = {
  expense: [
    { name: "Makan", icon: "Utensils", active: true },
    { name: "Utang", icon: "Scale", active: true, protected: true },
  ],
  income: [{ name: "Gaji", icon: "BadgeDollarSign", active: true }],
  savings: [{ name: "Dana Darurat", icon: "ShieldPlus", active: true, savingsKind: "liquid" }],
}

describe("CategoryManager", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("adds a custom category and protects automated categories from archiving", async () => {
    const onSaved = vi.fn()
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal("fetch", fetchSpy)
    vi.stubGlobal("confirm", vi.fn(() => true))

    render(<CategoryManager categories={categories} onSaved={onSaved} onClose={vi.fn()} />)

    expect(screen.getByText("Makan")).toBeInTheDocument()
    expect(screen.getByText("Otomatis")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /tambah kategori/i }))
    fireEvent.change(screen.getByLabelText("Nama kategori"), { target: { value: "Kopi" } })
    fireEvent.click(screen.getByRole("button", { name: /simpan kategori/i }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith("/api/settings", expect.objectContaining({ method: "PUT" })))
    const request = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(request.categories.expense.map(item => item.name)).toContain("Kopi")
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
  })
})
