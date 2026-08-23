"use client"
import { useState } from "react"
import { THEME, EXPENSE_CATEGORIES, INCOME_CATEGORIES, SAVINGS_CATEGORIES, BANK_ACCOUNTS, MONTHS_MAP, getCategoryOptions } from "./constants"
import { formatInputRupiah } from "./helpers"
import SelectField from "./SelectField"
import Sheet from "./Sheet"
import SpecialExpenseField from "./SpecialExpenseField"
import EventTagPicker from "@/components/EventTagPicker"
import { useSettings } from "@/lib/useSharedData"

const SHEET_FOR_TYPE = { income: "Pemasukan", expense: "Pengeluaran", savings: "Tabungan" }

function initialExpenseClass(expenseClass) {
  return String(expenseClass || "").toLowerCase() === "special" ? "Spesial" : "Rutin"
}

export default function EditTransactionModal({ transaction, onClose, onSaved }) {
  const { settings } = useSettings()
  const [type] = useState(transaction.type)
  const [tanggal, setTanggal] = useState(toDateInput(transaction.date))
  const [kategori, setKategori] = useState(transaction.category || "")
  const [rawAmount, setRawAmount] = useState(transaction.amount ? formatInputRupiah(String(Math.round(transaction.amount))) : "")
  const [akunBank, setAkunBank] = useState(transaction.account || "")
  const [keterangan, setKeterangan] = useState(transaction.desc || "")
  const [eventId, setEventId] = useState(transaction.eventId || "")
  const [sifat, setSifat] = useState(initialExpenseClass(transaction.expenseClass))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!kategori || !rawAmount) {
      setError("Kategori dan jumlah wajib diisi")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        tab: SHEET_FOR_TYPE[type],
        type,
        tanggal,
        keterangan,
        kategori,
        jumlah: rawAmount.replace(/\./g, ""),
        akunBank,
        rowIndex: transaction.rowIndex,
        eventId: eventId || "",
      }
      if (type === "expense") payload.sifat = sifat === "Spesial" ? "Spesial" : "Rutin"

      const res = await fetch(`/api/transaction/${transaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan")
      onSaved()
    } catch (err) {
      setError(err.message)
    }
    setSubmitting(false)
  }

  const catOptions = getCategoryOptions(settings?.categories, type, type === "expense" ? EXPENSE_CATEGORIES : type === "savings" ? SAVINGS_CATEGORIES : INCOME_CATEGORIES, kategori)

  return (
    <Sheet
      open={true}
      onClose={onClose}
      subtitle="Edit Transaksi"
      title={type === "income" ? "Pemasukan" : type === "savings" ? "Tabungan" : "Pengeluaran"}
      size="md"
      maxHeight="85vh"
      closeOnBackdrop={!submitting}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-amount" className="text-[10px] font-bold text-md3-on-surface-variant mb-1.5 block uppercase tracking-wider">Amount</label>
            <input id="edit-amount" type="text" inputMode="numeric" value={rawAmount} onChange={e => setRawAmount(formatInputRupiah(e.target.value))}
              className="field-outlined w-full px-4 py-3 text-sm font-semibold" />
          </div>
          <div>
            <label htmlFor="edit-date" className="text-[10px] font-bold text-md3-on-surface-variant mb-1.5 block uppercase tracking-wider">Date</label>
            <input id="edit-date" type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
              className="field-outlined w-full px-4 py-3 text-sm font-semibold" />
          </div>
        </div>
        <SelectField label="Category" value={kategori} onChange={setKategori} options={catOptions} placeholder="Select Category" />
        <EventTagPicker value={eventId} onChange={setEventId} />
        <SelectField label="Bank Account" value={akunBank} onChange={setAkunBank} options={BANK_ACCOUNTS} placeholder="Select Bank" />
        {type === "expense" && (
          <SpecialExpenseField
            checked={sifat === "Spesial"}
            onChange={checked => setSifat(checked ? "Spesial" : "Rutin")}
            helperId="edit-special-helper"
          />
        )}
        <div>
          <label htmlFor="edit-note" className="text-[10px] font-bold text-md3-on-surface-variant mb-1.5 block uppercase tracking-wider">Note</label>
          <input id="edit-note" type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)}
            className="field-outlined w-full px-4 py-3 text-sm font-medium" />
        </div>
        {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-filled w-full mt-2">
          {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Save Changes"}
        </button>
      </form>
    </Sheet>
  )
}

function toDateInput(dateStr) {
  if (!dateStr) {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }
  const m = String(dateStr).match(/^(\d+)\s+(\w+)\s+(\d+)/)
  if (!m) return dateStr
  const monthIdx = MONTHS_MAP[m[2]] ?? 0
  return `${m[3]}-${String(monthIdx + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`
}
