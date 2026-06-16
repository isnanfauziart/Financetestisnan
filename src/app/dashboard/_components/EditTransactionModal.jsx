"use client"
import { useState } from "react"
import { THEME, EXPENSE_CATEGORIES, INCOME_CATEGORIES, SAVINGS_CATEGORIES, BANK_ACCOUNTS, MONTHS_MAP } from "./constants"
import { formatInputRupiah } from "./helpers"
import SelectField from "./SelectField"
import Sheet from "./Sheet"

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
    </Sheet>
  )
}

function toDateInput(dateStr) {
  if (!dateStr) return new Date().toISOString().split("T")[0]
  const m = String(dateStr).match(/^(\d+)\s+(\w+)\s+(\d+)/)
  if (!m) return dateStr
  const d = new Date(+m[3], MONTHS_MAP[m[2]] ?? 0, +m[1])
  return d.toISOString().split("T")[0]
}
