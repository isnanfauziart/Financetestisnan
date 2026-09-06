import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import BudgetCopyModal from "@/components/BudgetCopyModal"

vi.mock("@/lib/useSharedData", () => ({
  useSettings: vi.fn(() => ({
    settings: { categories: { expense: ["Jajan", "Transportasi"] } },
  })),
}))

const baseBudgets = [
  { rowIndex: 2, kategori: "Jajan", bulan: "Agu", tahun: "2026", limit: 500000, akun: "" },
  { rowIndex: 3, kategori: "Transportasi", bulan: "Agu", tahun: "2026", limit: 300000, akun: "Bank BCA" },
]

const props = {
  budgets: baseBudgets,
  defaultMonth: "Sep",
  defaultYear: "2026",
  expenseCategories: [{ name: "Jajan", active: true }, { name: "Transportasi", active: true }],
  onClose: vi.fn(),
  onSaved: vi.fn(),
  entitlement: { tier: "free", isAdmin: false },
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("BudgetCopyModal", () => {
  it("defaults to the latest source period, starts unchecked, and allows manual selection", () => {
    render(<BudgetCopyModal {...props} />)

    expect(screen.getByRole("button", { name: "Salin dari" })).toHaveTextContent("Agu 2026")
    expect(screen.getByRole("button", { name: "Untuk bulan" })).toHaveTextContent("Sep")
    expect(screen.getByRole("checkbox", { name: /Jajan/ })).not.toBeChecked()
    expect(screen.getByRole("checkbox", { name: /Transportasi/ })).not.toBeChecked()

    fireEvent.click(screen.getByRole("checkbox", { name: /Jajan/ }))
    expect(screen.getByRole("button", { name: /Salin 1 anggaran/i })).toBeEnabled()
    expect(screen.getByLabelText("Limit Jajan")).toHaveValue("500.000")
  })

  it("selects all eligible rows while keeping an existing destination duplicate disabled", () => {
    render(<BudgetCopyModal {...props} budgets={[
      ...baseBudgets,
      { rowIndex: 4, kategori: "Jajan", bulan: "Sep", tahun: "2026", limit: 450000, akun: "" },
    ]} />)

    expect(screen.getByRole("checkbox", { name: /Jajan/ })).toBeDisabled()
    expect(screen.getByText("Sudah ada di bulan tujuan")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Pilih semua" }))

    expect(screen.getByRole("checkbox", { name: /Transportasi/ })).toBeChecked()
    expect(screen.getByRole("button", { name: /Salin 1 anggaran/i })).toBeEnabled()
  })

  it("disables saving when the selected batch exceeds remaining Free slots", () => {
    render(<BudgetCopyModal {...props} budgets={[
      ...baseBudgets,
      { rowIndex: 4, kategori: "Belanja", bulan: "Sep", tahun: "2026", limit: 450000, akun: "" },
      { rowIndex: 5, kategori: "Hiburan", bulan: "Sep", tahun: "2026", limit: 350000, akun: "" },
    ]} expenseCategories={["Jajan", "Transportasi"]} />)

    fireEvent.click(screen.getByRole("button", { name: "Pilih semua" }))

    expect(screen.getByText(/hanya 1 slot tersedia/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Salin 2 anggaran/i })).toBeDisabled()
  })

  it("preserves selection and edited limit when the API fails", async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: "Data anggaran berubah. Muat ulang lalu coba lagi.", code: "BUDGET_COPY_STALE" }),
    }))
    render(<BudgetCopyModal {...props} />)
    fireEvent.click(screen.getByRole("checkbox", { name: /Jajan/ }))
    fireEvent.change(screen.getByLabelText("Limit Jajan"), { target: { value: "600000" } })
    fireEvent.click(screen.getByRole("button", { name: /Salin 1 anggaran/i }))

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Muat ulang/))
    expect(screen.getByRole("checkbox", { name: /Jajan/ })).toBeChecked()
    expect(screen.getByLabelText("Limit Jajan")).toHaveValue("600.000")
  })

  it("submits selected rows and reports the copied count", async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, copied: 1 }),
    }))
    render(<BudgetCopyModal {...props} />)
    fireEvent.click(screen.getByRole("checkbox", { name: /Jajan/ }))
    fireEvent.change(screen.getByLabelText("Limit Jajan"), { target: { value: "600000" } })
    fireEvent.click(screen.getByRole("button", { name: /Salin 1 anggaran/i }))

    await waitFor(() => expect(props.onSaved).toHaveBeenCalledWith(1))
    expect(global.fetch).toHaveBeenCalledWith("/api/budgets/copy", expect.objectContaining({ method: "POST" }))
  })
})
