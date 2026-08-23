"use client"
import { useMemo, useState } from "react"
import { Plus, Target } from "lucide-react"
import { THEME, EXPENSE_CATEGORIES, INCOME_CATEGORIES, BANK_ACCOUNTS, getCategoryOptions } from "./constants"
import { formatInputRupiah, parseTxDate } from "./helpers"
import { getCategoryVisual } from "@/lib/categoryIcons"
import SelectField from "./SelectField"
import Sheet from "./Sheet"
import SpecialExpenseField, { shouldShowSpecialSuggestion } from "./SpecialExpenseField"
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

export default function QuickAddSheet({ open, onClose, initialType = "expense", onSubmit, onGoalContribute, transactionUsage, specialSuggestion, transactions = [] }) {
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

  // D7 recent-category suggestions: top 4 most frequent categories over the last
  // ~50 txns of the active type. categoryOptions already excludes archived ones.
  const { recentCategories, sortedRecent } = useMemo(() => {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return { recentCategories: [], sortedRecent: [] }
    }
    const validOptions = new Set(categoryOptions)
    const sortedRecent = transactions
      .filter(t => t.type === txType)
      .slice()
      .sort((a, b) => parseTxDate(b.date) - parseTxDate(a.date))
      .slice(0, 50)
    const counts = new Map()
    for (const t of sortedRecent) {
      if (!t.category || !validOptions.has(t.category)) continue
      counts.set(t.category, (counts.get(t.category) || 0) + 1)
    }
    const recentCategories = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([kategori]) => kategori)
    return { recentCategories, sortedRecent }
  }, [transactions, txType, categoryOptions])

  // Tap fills kategori AND akunBank from that category's most recent transaction.
  function applyRecentCategory(kategori) {
    const match = sortedRecent.find(t => t.category === kategori && t.account)
    setFormData(f => ({ ...f, kategori, akunBank: match?.account || f.akunBank }))
  }

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
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-[background-color,color,box-shadow] ${txType === "expense" ? "bg-md3-surface-container-lowest text-md3-on-surface shadow-warm" : "text-md3-on-surface-variant"}`}>
            Pengeluaran
          </button>
          <button onClick={() => handleTypeChange("income")} aria-label="Pilih pemasukan" aria-pressed={txType === "income"}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-[background-color,color,box-shadow] ${txType === "income" ? "bg-md3-surface-container-lowest text-md3-on-surface shadow-warm" : "text-md3-on-surface-variant"}`}>
            Pemasukan
          </button>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-bold text-md3-on-surface-variant uppercase tracking-wider mb-1.5">Jumlah</p>
          <h3 className="text-3xl font-display font-bold leading-none" style={{ color: txType === "expense" ? THEME.textPrimary : THEME.income }}>
            {rawAmount ? `Rp ${rawAmount}` : "Rp 0"}
          </h3>
          <p className="mt-2 text-xs text-md3-on-surface-variant">Simpan transaksi harian dengan lebih cepat.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <TransactionQuotaStatus usage={transactionUsage} error={quotaError} />
          <div>
            <label htmlFor="qa-amount" className="text-[10px] font-bold text-md3-on-surface-variant mb-1.5 block uppercase tracking-wider">Jumlah</label>
            <input id="qa-amount" type="text" inputMode="numeric" placeholder="0" value={rawAmount} onChange={e => setRawAmount(formatInputRupiah(e.target.value))} aria-label="Jumlah transaksi"
              className="field-outlined w-full px-4 py-3 text-sm font-semibold" />
          </div>
          <div>
            <label htmlFor="qa-date" className="text-[10px] font-bold text-md3-on-surface-variant mb-1.5 block uppercase tracking-wider">Tanggal</label>
            <input id="qa-date" type="date" value={formData.tanggal} onChange={e => setFormData(f => ({ ...f, tanggal: e.target.value }))} aria-label="Tanggal transaksi"
              className="field-outlined w-full px-4 py-3 text-sm font-semibold" />
          </div>
          {recentCategories.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-md3-on-surface-variant mb-1.5 block uppercase tracking-wider">Sering Dipakai</p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Saran kategori terakhir">
                {recentCategories.map(kategori => {
                  const selected = formData.kategori === kategori
                  const { icon: CategoryIcon } = getCategoryVisual(kategori)
                  return (
                    <button
                      key={kategori}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => applyRecentCategory(kategori)}
                      className={`chip ${selected ? "chip-active" : "chip-default"} min-w-11`}
                    >
                      <CategoryIcon size={12} aria-hidden="true" /> {kategori}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <SelectField label="Kategori" value={formData.kategori} onChange={v => setFormData(f => ({ ...f, kategori: v }))}
            options={categoryOptions} placeholder="Pilih kategori" />
          {formData.kategori && !formData.eventId && (
            <EventSuggestionChip kategori={formData.kategori} eventId={formData.eventId} onSelect={v => setFormData(f => ({ ...f, eventId: v }))} />
          )}
          <EventTagPicker value={formData.eventId || ""} onChange={v => setFormData(f => ({ ...f, eventId: v }))} />
          <SelectField label="Akun" value={formData.akunBank} onChange={v => setFormData(f => ({ ...f, akunBank: v }))}
            options={BANK_ACCOUNTS} placeholder="Pilih akun" />
          {txType === "expense" && (
            <SpecialExpenseField
              checked={formData.sifat === "Spesial"}
              onChange={handleSpecialChange}
              helperId="qa-special-helper"
              suggestion={showSpecialSuggestion ? specialSuggestion : null}
              onAcceptSuggestion={() => handleSpecialChange(true)}
              onDismissSuggestion={() => setSuggestionDismissed(true)}
            />
          )}
          <div>
            <label htmlFor="qa-note" className="text-[10px] font-bold text-md3-on-surface-variant mb-1.5 block uppercase tracking-wider">Keterangan</label>
            <input id="qa-note" type="text" placeholder="Tulis keterangan transaksi" value={formData.keterangan} onChange={e => setFormData(f => ({ ...f, keterangan: e.target.value }))} aria-label="Keterangan transaksi"
              className="w-full px-4 py-3 bg-md3-surface border border-md3-outline-variant rounded-2xl text-sm font-medium outline-none" />
          </div>
          <button type="submit" disabled={submitting} aria-label="Simpan transaksi"
            className="w-full py-3.5 mt-1 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-pop transition-[background-color,opacity,transform] duration-200 active:scale-[0.97] disabled:opacity-50"
            style={{ backgroundColor: submitting ? "#ccc" : THEME.primary }}>
            {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={16} aria-hidden="true" /> Simpan Transaksi</>}
          </button>
          <button type="button" onClick={() => { onClose(); onGoalContribute?.() }} aria-label="Kontribusi ke goal"
            className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.97]"
            style={{ background: THEME.savingsBg, color: THEME.savings }}>
            <Target size={14} aria-hidden="true" /> Kontribusi ke Goal
          </button>
        </form>
      </div>
    </Sheet>
  )
}
