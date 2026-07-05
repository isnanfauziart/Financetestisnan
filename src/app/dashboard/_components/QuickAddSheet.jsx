"use client"
import { useState } from "react"
import { Plus, Target } from "lucide-react"
import { THEME, EXPENSE_CATEGORIES, INCOME_CATEGORIES, BANK_ACCOUNTS } from "./constants"
import { formatInputRupiah } from "./helpers"
import SelectField from "./SelectField"
import Sheet from "./Sheet"
import EventTagPicker from "@/components/EventTagPicker"
import EventSuggestionChip from "@/components/EventSuggestionChip"

export default function QuickAddSheet({ open, onClose, initialType = "expense", onSubmit, onGoalContribute }) {
  const [txType, setTxType] = useState(initialType)
  const [formData, setFormData] = useState({ tanggal: new Date().toISOString().split("T")[0], keterangan: "", kategori: "", jumlah: "", akunBank: "", catatan: "", eventId: "" })
  const [rawAmount, setRawAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function handleTypeChange(t) {
    setTxType(t)
    setFormData(f => ({ ...f, kategori: "" }))
  }

  function handleReset() {
    setFormData({ tanggal: new Date().toISOString().split("T")[0], keterangan: "", kategori: "", jumlah: "", akunBank: "", catatan: "", eventId: "" })
    setRawAmount("")
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    const ok = await onSubmit({ formData, rawAmount, txType })
    setSubmitting(false)
    if (ok) {
      handleReset()
      onClose()
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Transaksi Baru"
      subtitle="Quick Add"
      size="md"
      maxHeight="85vh"
      closeOnBackdrop={!submitting}
      closeOnEsc={!submitting}
    >
      <div className="space-y-4">
        <div className="flex gap-2 p-1.5 rounded-2xl" style={{ background: THEME.surfaceWarm }}>
          <button onClick={() => handleTypeChange("expense")} aria-label="Switch to expense" aria-pressed={txType === "expense"}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${txType === "expense" ? "bg-white text-earth-800 shadow-warm" : "text-earth-500"}`}>
            Expense
          </button>
          <button onClick={() => handleTypeChange("income")} aria-label="Switch to income" aria-pressed={txType === "income"}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${txType === "income" ? "bg-white text-earth-800 shadow-warm" : "text-earth-500"}`}>
            Income
          </button>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-bold text-earth-500 uppercase tracking-wider mb-1.5">Amount</p>
          <h3 className="text-3xl font-display font-bold leading-none" style={{ color: txType === "expense" ? THEME.textPrimary : THEME.income }}>
            {rawAmount ? `Rp ${rawAmount}` : "Rp 0"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="qa-amount" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Amount</label>
            <input id="qa-amount" type="text" inputMode="numeric" placeholder="0" value={rawAmount} onChange={e => setRawAmount(formatInputRupiah(e.target.value))} aria-label="Transaction amount"
              className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200 transition-shadow" />
          </div>
          <div>
            <label htmlFor="qa-date" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Tanggal</label>
            <input id="qa-date" type="date" value={formData.tanggal} onChange={e => setFormData(f => ({ ...f, tanggal: e.target.value }))} aria-label="Transaction date"
              className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none" />
          </div>
          <SelectField label="Category" value={formData.kategori} onChange={v => setFormData(f => ({ ...f, kategori: v }))}
            options={txType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES} placeholder="Select Category" />
          {formData.kategori && !formData.eventId && (
            <EventSuggestionChip kategori={formData.kategori} eventId={formData.eventId} onSelect={v => setFormData(f => ({ ...f, eventId: v }))} />
          )}
          <EventTagPicker value={formData.eventId || ""} onChange={v => setFormData(f => ({ ...f, eventId: v }))} />
          <SelectField label="Bank Account" value={formData.akunBank} onChange={v => setFormData(f => ({ ...f, akunBank: v }))}
            options={BANK_ACCOUNTS} placeholder="Select Bank" />
          <div>
            <label htmlFor="qa-note" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Note</label>
            <input id="qa-note" type="text" placeholder="Description..." value={formData.keterangan} onChange={e => setFormData(f => ({ ...f, keterangan: e.target.value }))} aria-label="Transaction note"
              className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-medium outline-none" />
          </div>
          <button type="submit" disabled={submitting} aria-label="Save transaction"
            className="w-full py-3.5 mt-1 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-pop transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
            style={{ background: submitting ? "#ccc" : "linear-gradient(135deg, #4a3d33, #7c5fcf)" }}>
            {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={16} aria-hidden="true" /> Save</>}
          </button>
          <button type="button" onClick={() => { onClose(); onGoalContribute?.() }} aria-label="Contribute to goal"
            className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
            style={{ background: THEME.savingsBg, color: THEME.savings }}>
            <Target size={14} aria-hidden="true" /> Kontribusi ke Goal
          </button>
        </form>
      </div>
    </Sheet>
  )
}