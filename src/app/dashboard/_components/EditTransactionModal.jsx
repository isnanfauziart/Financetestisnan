"use client"
import { useState } from "react"
import { THEME, EXPENSE_CATEGORIES, INCOME_CATEGORIES, SAVINGS_CATEGORIES, BANK_ACCOUNTS, MONTHS_MAP, getCategoryOptions } from "./constants"
import { formatInputRupiah } from "./helpers"
import SelectField from "./SelectField"
import Sheet from "./Sheet"
import EventTagPicker from "@/components/EventTagPicker"
import { useSettings } from "@/lib/useSharedData"

const SHEET_FOR_TYPE = { income: "Pemasukan", expense: "Pengeluaran", savings: "Tabungan" }
const SPECIAL_HELPER_COPY = "Tetap masuk total dan saldo, tetapi tidak memengaruhi tren rutinitas."

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
            <label htmlFor="edit-amount" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Amount</label>
            <input id="edit-amount" type="text" inputMode="numeric" value={rawAmount} onChange={e => setRawAmount(formatInputRupiah(e.target.value))}
              className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label htmlFor="edit-date" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Date</label>
            <input id="edit-date" type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
              className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none" />
          </div>
        </div>
        <SelectField label="Category" value={kategori} onChange={setKategori} options={catOptions} placeholder="Select Category" />
        <EventTagPicker value={eventId} onChange={setEventId} />
        <SelectField label="Bank Account" value={akunBank} onChange={setAkunBank} options={BANK_ACCOUNTS} placeholder="Select Bank" />
        {type === "expense" && (
          <div className="rounded-2xl border border-earth-100 bg-earth-50/70 px-3.5 py-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sifat === "Spesial"}
                onChange={e => setSifat(e.target.checked ? "Spesial" : "Rutin")}
                aria-label="Pengeluaran Spesial"
                aria-describedby="edit-special-helper"
                className="mt-0.5 h-4 w-4 rounded border-earth-300 text-violet-600 focus:ring-violet-300"
              />
              <span className="min-w-0">
                <span className="block text-xs font-bold text-earth-800">Pengeluaran Spesial</span>
                <span id="edit-special-helper" className="mt-0.5 block text-[11px] leading-relaxed text-earth-500">
                  {SPECIAL_HELPER_COPY}
                </span>
              </span>
            </label>
          </div>
        )}
        <div>
          <label htmlFor="edit-note" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Note</label>
          <input id="edit-note" type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)}
            className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-medium outline-none" />
        </div>
        {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}
        <button type="submit" disabled={submitting}
          className="w-full py-4 mt-2 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-pop transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
          style={{ background: submitting ? "#ccc" : "linear-gradient(135deg, #4a3d33, #7c5fcf)" }}>
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
