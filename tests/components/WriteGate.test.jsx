import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

vi.mock("@/lib/useSharedData", async (importOriginal) => ({
  ...(await importOriginal()),
  useSettings: vi.fn(),
}))
vi.mock("@/components/EventTagPicker", () => ({
  default: () => <div data-testid="event-tag-picker" />,
}))
vi.mock("@/app/dashboard/_components/Sheet", () => ({
  default: ({ open, children, ...rest }) => (open ? <div role="dialog" aria-label={rest.title || rest.subtitle || "sheet"}>{children}</div> : null),
}))

import QuickAddSheet from "@/app/dashboard/_components/QuickAddSheet"
import BillPayModal from "@/components/BillPayModal"
import DebtPaymentModal from "@/components/DebtPaymentModal"
import GoalContributeModal from "@/components/GoalContributeModal"
import {
  markPending,
  markSchemaConflict,
  markStale,
  markUnresolvedOperation,
  resetWriteState,
} from "@/lib/financialWriteState"

const { useSettings } = await import("@/lib/useSharedData")

afterEach(() => {
  cleanup()
  resetWriteState()
})

// The gate is a module-level store, so blocked states are applied BEFORE render
// and asserted through the rendered UI. resetWriteState() between tests keeps
// isolation.
describe("write gate across money surfaces", () => {
  beforeEach(() => {
    useSettings.mockReturnValue({
      settings: {
        categories: {
          expense: [{ name: "Kopi", icon: "Utensils", active: true }],
          income: [{ name: "Gaji Baru", icon: "Coins", active: true }],
        },
      },
    })
  })

  describe("QuickAddSheet", () => {
    it("stays enabled on a healthy state (fresh sheet exception)", () => {
      render(<QuickAddSheet open onClose={vi.fn()} onSubmit={vi.fn(async () => ({ ok: true }))} />)

      expect(screen.getByRole("button", { name: "Simpan transaksi" })).not.toBeDisabled()
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("blocks submit and shows the reason while stale", async () => {
      markStale("refresh failed")
      const onSubmit = vi.fn()
      render(<QuickAddSheet open onClose={vi.fn()} onSubmit={onSubmit} />)

      const saveButton = screen.getByRole("button", { name: "Simpan transaksi" })
      expect(saveButton).toBeDisabled()
      expect(screen.getByRole("alert")).toHaveTextContent("Data belum tersinkron")

      fireEvent.submit(saveButton.closest("form"))
      await Promise.resolve()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it("blocks with the schema-conflict reason", () => {
      markSchemaConflict("Struktur Google Sheets perlu ditinjau agar data baru dapat disimpan.")
      render(<QuickAddSheet open onClose={vi.fn()} onSubmit={vi.fn()} />)

      expect(screen.getByRole("button", { name: "Simpan transaksi" })).toBeDisabled()
      expect(screen.getByRole("alert")).toHaveTextContent("Struktur Google Sheets perlu ditinjau")
    })

    it("blocks submit while the returning-login fetch is still pending", () => {
      markPending("cached")
      render(<QuickAddSheet open onClose={vi.fn()} onSubmit={vi.fn()} />)

      expect(screen.getByRole("button", { name: "Simpan transaksi" })).toBeDisabled()
      expect(screen.getByRole("alert")).toHaveTextContent("Memuat data terbaru")
    })
  })

  describe("BillPayModal", () => {
    function bill() {
      return {
        id: "bill-1",
        nama: "Listrik",
        kategoriBill: "Utilitas",
        jumlah: 250000,
        tipe: "expense",
        frekuensi: "monthly",
        kategoriTransaksi: "Tagihan",
        akunBank: "BCA",
        tanggalJatuhTempo: "25",
        status: "due_soon",
        daysUntilDue: 3,
      }
    }

    it("stays enabled when healthy", () => {
      render(<BillPayModal bill={bill()} onClose={vi.fn()} onPaid={vi.fn()} onEdit={vi.fn()} />)

      expect(screen.getByRole("button", { name: /Bayar Sekarang/ })).not.toBeDisabled()
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("blocks paying while stale", () => {
      markStale("refresh failed")
      const onPaid = vi.fn()
      render(<BillPayModal bill={bill()} onClose={vi.fn()} onPaid={onPaid} onEdit={vi.fn()} />)

      const payButton = screen.getByRole("button", { name: /Bayar Sekarang/ })
      expect(payButton).toBeDisabled()
      expect(screen.getByRole("alert")).toBeInTheDocument()

      fireEvent.click(payButton)
      expect(onPaid).not.toHaveBeenCalled()
    })

    it("blocks with the unresolved-operation reason", () => {
      markUnresolvedOperation("op-99")
      render(<BillPayModal bill={bill()} onClose={vi.fn()} onPaid={vi.fn()} onEdit={vi.fn()} />)

      expect(screen.getByRole("button", { name: /Bayar Sekarang/ })).toBeDisabled()
      expect(screen.getByRole("alert")).toHaveTextContent("Status belum dapat dipastikan")
    })
  })

  describe("DebtPaymentModal", () => {
    function debt() {
      return { id: "debt-1", namaOrang: "Budi", arah: "utang", jumlah: 1000000, sisaSaldo: 400000 }
    }

    it("enables payment with a valid amount when healthy", () => {
      render(<DebtPaymentModal debt={debt()} onClose={vi.fn()} onSaved={vi.fn()} onToast={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/Jumlah Pembayaran/), { target: { value: "100000" } })

      const mainPay = screen.getAllByRole("button").find(b => (b.textContent || "").includes("Bayar") && !(b.textContent || "").includes("Lunas"))
      expect(mainPay).not.toBeDisabled()
    })

    it("keeps payment buttons disabled while stale even with a valid amount", () => {
      markStale("refresh failed")
      const onSaved = vi.fn()
      render(<DebtPaymentModal debt={debt()} onClose={vi.fn()} onSaved={onSaved} onToast={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/Jumlah Pembayaran/), { target: { value: "100000" } })

      const payButtons = screen.getAllByRole("button").filter(b => (b.textContent || "").includes("Bayar"))
      expect(payButtons.length).toBeGreaterThan(0)
      for (const button of payButtons) expect(button).toBeDisabled()
      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(onSaved).not.toHaveBeenCalled()
    })
  })

  describe("GoalContributeModal", () => {
    function goal() {
      return { id: "g1", nama: "Dana Darurat", kategori: "Dana Darurat", target: 5000000, color: "#2f6b57" }
    }

    it("stays enabled when healthy", () => {
      render(<GoalContributeModal goal={goal()} onClose={vi.fn()} onSaved={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/Jumlah/), { target: { value: "250000" } })

      expect(screen.getByRole("button", { name: /Tambah Kontribusi/ })).not.toBeDisabled()
    })

    it("blocks contribution while stale", () => {
      markStale("refresh failed")
      const onSaved = vi.fn()
      render(<GoalContributeModal goal={goal()} onClose={vi.fn()} onSaved={onSaved} />)
      fireEvent.change(screen.getByLabelText(/Jumlah/), { target: { value: "250000" } })

      expect(screen.getByRole("button", { name: /Tambah Kontribusi/ })).toBeDisabled()
      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(onSaved).not.toHaveBeenCalled()
    })
  })
})
