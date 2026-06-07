"use client"
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { THEME, EXPENSE_CATEGORIES, INCOME_CATEGORIES, SAVINGS_CATEGORIES, BANK_ACCOUNTS } from "./constants"
import { formatInputRupiah } from "./helpers"
import SelectField from "./SelectField"

const SHEET_FOR_TYPE = { income: "Pemasukan", expense: "Pengeluaran", savings: "Tabungan" }

export default function EditTransactionModal({ transaction, onClose, onSaved }) {
  const [type] = useState(transaction.type)
  const [tanggal, setTanggal] = useState(toDateInput(transaction.date))
  const [kategori, setKategori] = useState(transaction.category || "")
  const [rawAmount, setRawAmount] = useState(transaction.amount ? formatInputRupiah(String(Math.round(transaction.amount))) : "")
  const [akunBank, setAkunBank] = useState(transaction.account || "")
  const [keterangan, setKeterangan] = useState(transaction.desc || "")
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
      const res = await fetch(`/api/transaction/${transaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tab: SHEET_FOR_TYPE[type],
          type,
          tanggal,
          keterangan,
          kategori,
          jumlah: rawAmount.replace(/\./g, ""),
          akunBank,
          rowIndex: transaction.rowIndex,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan")
      onSaved()
    } catch (err) {
      setError(err.message)
    }
    setSubmitting(false)
  }

  const catOptions = type === "expense" ? EXPENSE_CATEGORIES : type === "savings" ? SAVINGS_CATEGORIES : INCOME_CATEGORIES

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(42,32,24,0.5)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="glass-strong rounded-t-[32px] sm:rounded-[32px] p-6 shadow-pop-lg w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Edit Transaksi</p>
            <h3 className="text-lg font-display font-bold text-earth-800">{type === "income" ? "Pemasukan" : type === "savings" ? "Tabungan" : "Pengeluaran"}</h3>
          </div>
          <button onClick={onClose} aria-label="Close edit modal" className="w-8 h-8 rounded-full bg-earth-50 hover:bg-earth-100 transition-colors flex items-center justify-center">
            <X size={14} color={THEME.textSecondary} aria-hidden="true" />
          </button>
        </div>
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
          <SelectField label="Bank Account" value={akunBank} onChange={setAkunBank} options={BANK_ACCOUNTS} placeholder="Select Bank" />
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
      </div>
    </div>
  )
}

function toDateInput(dateStr) {
  if (!dateStr) return new Date().toISOString().split("T")[0]
  const m = String(dateStr).match(/^(\d+)\s+(\w+)\s+(\d+)/)
  if (!m) return dateStr
  const months = { Jan:0, Feb:1, Mar:2, Apr:3, Mei:4, Jun:5, Jul:6, Agu:7, Ags:7, Sep:8, Okt:9, Nov:10, Des:11 }
  const d = new Date(+m[3], months[m[2]] ?? 0, +m[1])
  return d.toISOString().split("T")[0]
}
