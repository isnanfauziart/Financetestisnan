"use client"
import { useState } from "react"
import { Plus, Target, X } from "lucide-react"
import { THEME, EXPENSE_CATEGORIES, INCOME_CATEGORIES, BANK_ACCOUNTS, getCategoryOptions } from "./constants"
import { formatInputRupiah } from "./helpers"
import SelectField from "./SelectField"
import Sheet from "./Sheet"
import EventTagPicker from "@/components/EventTagPicker"
import EventSuggestionChip from "@/components/EventSuggestionChip"
import TransactionQuotaStatus from "@/components/TransactionQuotaStatus"
import { useSettings } from "@/lib/useSharedData"

const DEFAULT_FORM_DATA = () => ({
  tanggal: new Date().toISOString().split("T")[0],
  keterangan: "",
  kategori: "",
  jumlah: "",
  akunBank: "",
  catatan: "",
  eventId: "",
  sifat: "Rutin",
})

const SPECIAL_HELPER_COPY = "Tetap masuk total dan saldo, tetapi tidak memengaruhi tren rutinitas."

function parseRawAmount(rawAmount) {
  return Number(String(rawAmount || "").replace(/[^0-9]/g, "")) || 0
}

function shouldShowSpecialSuggestion({ specialSuggestion, rawAmount, txType, sifat, dismissed }) {
  const threshold = Number(specialSuggestion?.threshold || 0)
  return txType === "expense"
    && sifat !== "Spesial"
    && !dismissed
    && threshold > 0
    && parseRawAmount(rawAmount) >= threshold
}

export default function QuickAddSheet({ open, onClose, initialType = "expense", onSubmit, onGoalContribute, transactionUsage, specialSuggestion }) {
  const { settings } = useSettings()
  const [txType, setTxType] = useState(initialType)
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA)
  const [rawAmount, setRawAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [quotaError, setQuotaError] = useState(null)
  const [suggestionDismissed, setSuggestionDismissed] = useState(false)
  const categoryOptions = getCategoryOptions(settings?.categories, txType, txType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES, formData.kategori)
  const showSpecialSuggestion = shouldShowSpecialSuggestion({
    specialSuggestion,
    rawAmount,
    txType,
    sifat: formData.sifat,
    dismissed: suggestionDismissed,
  })

  function handleTypeChange(t) {
    setTxType(t)
    setFormData(f => ({ ...f, kategori: "", sifat: "Rutin" }))
    setSuggestionDismissed(false)
  }

  function handleReset() {
    setFormData(DEFAULT_FORM_DATA())
    setRawAmount("")
    setSuggestionDismissed(false)
  }

  function handleSpecialChange(checked) {
    setFormData(f => ({ ...f, sifat: checked ? "Spesial" : "Rutin" }))
  }

  function getSubmitPayload() {
    const { sifat, ...rest } = formData
    if (txType !== "expense") {
      return { formData: rest, rawAmount, txType }
    }
    const expenseFormData = { ...rest, sifat: sifat === "Spesial" ? "Spesial" : "Rutin" }
    return { formData: expenseFormData, rawAmount, txType, sifat: expenseFormData.sifat }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setQuotaError(null)
    const result = await onSubmit(getSubmitPayload())
    const ok = result === true || result?.ok
    setSubmitting(false)
    if (ok) {
      handleReset()
      onClose()
    } else if (result?.error?.code === "FEATURE_LIMIT_REACHED") {
      setQuotaError(result.error)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Transaksi Baru"
      subtitle="Tambah Cepat"
      size="md"
      maxHeight="85vh"
      closeOnBackdrop={!submitting}
      closeOnEsc={!submitting}
    >
      <div className="space-y-4">
        <div className="flex gap-2 p-1.5 rounded-2xl" style={{ background: THEME.surfaceWarm }}>
          <button onClick={() => handleTypeChange("expense")} aria-label="Pilih pengeluaran" aria-pressed={txType === "expense"}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${txType === "expense" ? "bg-white text-earth-800 shadow-warm" : "text-earth-500"}`}>
            Pengeluaran
          </button>
          <button onClick={() => handleTypeChange("income")} aria-label="Pilih pemasukan" aria-pressed={txType === "income"}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${txType === "income" ? "bg-white text-earth-800 shadow-warm" : "text-earth-500"}`}>
            Pemasukan
          </button>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-bold text-earth-500 uppercase tracking-wider mb-1.5">Jumlah</p>
          <h3 className="text-3xl font-display font-bold leading-none" style={{ color: txType === "expense" ? THEME.textPrimary : THEME.income }}>
            {rawAmount ? `Rp ${rawAmount}` : "Rp 0"}
          </h3>
          <p className="mt-2 text-xs text-earth-500">Simpan transaksi harian dengan lebih cepat.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <TransactionQuotaStatus usage={transactionUsage} error={quotaError} />
          <div>
            <label htmlFor="qa-amount" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Jumlah</label>
            <input id="qa-amount" type="text" inputMode="numeric" placeholder="0" value={rawAmount} onChange={e => setRawAmount(formatInputRupiah(e.target.value))} aria-label="Jumlah transaksi"
              className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200 transition-shadow" />
          </div>
          <div>
            <label htmlFor="qa-date" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Tanggal</label>
            <input id="qa-date" type="date" value={formData.tanggal} onChange={e => setFormData(f => ({ ...f, tanggal: e.target.value }))} aria-label="Tanggal transaksi"
              className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none" />
          </div>
          <SelectField label="Kategori" value={formData.kategori} onChange={v => setFormData(f => ({ ...f, kategori: v }))}
            options={categoryOptions} placeholder="Pilih kategori" />
          {formData.kategori && !formData.eventId && (
            <EventSuggestionChip kategori={formData.kategori} eventId={formData.eventId} onSelect={v => setFormData(f => ({ ...f, eventId: v }))} />
          )}
          <EventTagPicker value={formData.eventId || ""} onChange={v => setFormData(f => ({ ...f, eventId: v }))} />
          <SelectField label="Akun" value={formData.akunBank} onChange={v => setFormData(f => ({ ...f, akunBank: v }))}
            options={BANK_ACCOUNTS} placeholder="Pilih akun" />
          {txType === "expense" && (
            <div className="rounded-2xl border border-earth-100 bg-earth-50/70 px-3.5 py-3 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sifat === "Spesial"}
                  onChange={e => handleSpecialChange(e.target.checked)}
                  aria-label="Pengeluaran Spesial"
                  aria-describedby="qa-special-helper"
                  className="mt-0.5 h-4 w-4 rounded border-earth-300 text-violet-600 focus:ring-violet-300"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-earth-800">Pengeluaran Spesial</span>
                  <span id="qa-special-helper" className="mt-0.5 block text-[11px] leading-relaxed text-earth-500">
                    {SPECIAL_HELPER_COPY}
                  </span>
                </span>
              </label>
              {showSpecialSuggestion && (
                <div className="flex flex-col gap-2 rounded-xl bg-white/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-semibold leading-relaxed text-earth-600">
                    Jumlah ini melewati baseline rutin {specialSuggestion.baselineMonths || 3} bulan terakhir.
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSpecialChange(true)}
                      className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-700 hover:bg-violet-100"
                    >
                      Tandai Spesial
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuggestionDismissed(true)}
                      aria-label="Tutup saran Pengeluaran Spesial"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-earth-400 hover:bg-earth-100 hover:text-earth-700"
                    >
                      <X size={12} strokeWidth={3} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div>
            <label htmlFor="qa-note" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Keterangan</label>
            <input id="qa-note" type="text" placeholder="Tulis keterangan transaksi" value={formData.keterangan} onChange={e => setFormData(f => ({ ...f, keterangan: e.target.value }))} aria-label="Keterangan transaksi"
              className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-medium outline-none" />
          </div>
          <button type="submit" disabled={submitting} aria-label="Simpan transaksi"
            className="w-full py-3.5 mt-1 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-pop transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
            style={{ background: submitting ? "#ccc" : "linear-gradient(135deg, #4a3d33, #7c5fcf)" }}>
            {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={16} aria-hidden="true" /> Simpan Transaksi</>}
          </button>
          <button type="button" onClick={() => { onClose(); onGoalContribute?.() }} aria-label="Kontribusi ke goal"
            className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
            style={{ background: THEME.savingsBg, color: THEME.savings }}>
            <Target size={14} aria-hidden="true" /> Kontribusi ke Goal
          </button>
        </form>
      </div>
    </Sheet>
  )
}
