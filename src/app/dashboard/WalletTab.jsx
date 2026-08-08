"use client"
import { useState } from "react"
import { Plus, Target, X } from "lucide-react"
import { THEME, EXPENSE_CATEGORIES, INCOME_CATEGORIES, BANK_ACCOUNTS, getCategoryOptions } from "./_components/constants"
import { formatInputRupiah } from "./_components/helpers"
import SelectField from "./_components/SelectField"
import EventTagPicker from "@/components/EventTagPicker"
import EventSuggestionChip from "@/components/EventSuggestionChip"
import TransactionQuotaStatus from "@/components/TransactionQuotaStatus"
import { useSettings } from "@/lib/useSharedData"

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

export default function WalletTab({ txType, formData, rawAmount, submitting, setTxType, setFormData, setRawAmount, handleSubmit, onGoalContribute, transactionUsage, quotaError, specialSuggestion }) {
  const { settings } = useSettings()
  const [suggestionDismissed, setSuggestionDismissed] = useState(false)
  const categoryOptions = getCategoryOptions(settings?.categories, txType, txType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES, formData.kategori)
  const showSpecialSuggestion = shouldShowSpecialSuggestion({
    specialSuggestion,
    rawAmount,
    txType,
    sifat: formData.sifat,
    dismissed: suggestionDismissed,
  })

  function handleTypeChange(type) {
    setTxType(type)
    setFormData(f => ({ ...f, kategori: "", sifat: "Rutin" }))
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
    return {
      formData: { ...rest, sifat: sifat === "Spesial" ? "Spesial" : "Rutin" },
      rawAmount,
      txType,
    }
  }

  return (
    <div className="px-5 pt-4 animate-bento-in" key="wallet-tab">
      <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm">
        <div className="flex gap-2 mb-5 p-1.5 rounded-2xl" style={{ background: THEME.surfaceWarm }}>
          <button onClick={() => handleTypeChange("expense")} aria-label="Pilih form pengeluaran" aria-pressed={txType === "expense"}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${txType === "expense" ? "bg-white text-earth-800 shadow-warm" : "text-earth-500"}`}>
            Pengeluaran
          </button>
          <button onClick={() => handleTypeChange("income")} aria-label="Pilih form pemasukan" aria-pressed={txType === "income"}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${txType === "income" ? "bg-white text-earth-800 shadow-warm" : "text-earth-500"}`}>
            Pemasukan
          </button>
        </div>

        <div className="text-center mb-6 mt-2">
          <p className="text-[10px] font-bold text-earth-500 uppercase tracking-wider mb-2">Jumlah</p>
          <h2 className="text-4xl font-display font-bold" style={{ color: txType === "expense" ? THEME.textPrimary : THEME.income }}>
            {rawAmount ? `Rp ${rawAmount}` : "Rp 0"}
          </h2>
          <p className="mt-2 text-xs text-earth-500">Fokus isi jumlah, kategori, dan akun terlebih dulu.</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(getSubmitPayload()) }} className="space-y-3">
          <TransactionQuotaStatus usage={transactionUsage} error={quotaError} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="amount-input" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Jumlah</label>
              <input id="amount-input" type="text" inputMode="numeric" placeholder="0" value={rawAmount} onChange={e => setRawAmount(formatInputRupiah(e.target.value))} aria-label="Jumlah transaksi"
                className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200 transition-shadow" />
            </div>
            <div>
              <label htmlFor="date-input" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Tanggal</label>
              <input id="date-input" type="date" value={formData.tanggal} onChange={e => setFormData(f => ({ ...f, tanggal: e.target.value }))} aria-label="Tanggal transaksi"
                className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none" />
            </div>
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
                  aria-describedby="wallet-special-helper"
                  className="mt-0.5 h-4 w-4 rounded border-earth-300 text-violet-600 focus:ring-violet-300"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-earth-800">Pengeluaran Spesial</span>
                  <span id="wallet-special-helper" className="mt-0.5 block text-[11px] leading-relaxed text-earth-500">
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
            <label htmlFor="note-input" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Keterangan</label>
            <input id="note-input" type="text" placeholder="Tulis keterangan transaksi" value={formData.keterangan} onChange={e => setFormData(f => ({ ...f, keterangan: e.target.value }))} aria-label="Keterangan transaksi"
              className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-medium outline-none" />
          </div>
          <button type="submit" disabled={submitting} aria-label="Simpan transaksi"
            className="w-full py-4 mt-2 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-pop transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
            style={{ background: submitting ? "#ccc" : "linear-gradient(135deg, #4a3d33, #7c5fcf)" }}>
            {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={18} aria-hidden="true" /> Simpan Transaksi</>}
          </button>
          <button type="button" onClick={onGoalContribute} aria-label="Kontribusi ke goal"
            className="w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97]"
            style={{ background: THEME.savingsBg, color: THEME.savings }}>
            <Target size={16} aria-hidden="true" /> Kontribusi ke Goal
          </button>
        </form>
      </div>
    </div>
  )
}
