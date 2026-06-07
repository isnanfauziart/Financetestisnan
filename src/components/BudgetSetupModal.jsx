"use client"
import { useState, useEffect } from "react"
import { X, Target } from "lucide-react"
import { THEME, EXPENSE_CATEGORIES, BANK_ACCOUNTS, AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { formatInputRupiah } from "@/app/dashboard/_components/helpers"
import SelectField from "@/app/dashboard/_components/SelectField"

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [String(CURRENT_YEAR - 1), String(CURRENT_YEAR), String(CURRENT_YEAR + 1)]

export default function BudgetSetupModal({ budget, defaultMonth, defaultYear, prefillKategori, onClose, onSaved }) {
  const isEdit = Boolean(budget)
  const [kategori, setKategori] = useState(budget?.kategori || prefillKategori || "")
  const [bulan, setBulan] = useState(budget?.bulan || defaultMonth || AVAILABLE_MONTHS[new Date().getMonth()])
  const [tahun, setTahun] = useState(budget?.tahun || String(defaultYear || CURRENT_YEAR))
  const [rawLimit, setRawLimit] = useState(budget?.limit ? formatInputRupiah(String(budget.limit)) : "")
  const [akun, setAkun] = useState(budget?.akun || "")
  const [catatan, setCatatan] = useState(budget?.catatan || "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!kategori || !rawLimit) {
      setError("Kategori dan limit wajib diisi")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const limitNum = parseFloat(rawLimit.replace(/\./g, ""))
      const body = {
        kategori, bulan, tahun, limit: limitNum, akun, catatan,
        ...(isEdit ? {
          originalKategori: budget.kategori,
          originalBulan: budget.bulan,
          originalTahun: budget.tahun,
          originalAkun: budget.akun || "",
        } : {}),
      }
      const res = await fetch("/api/budgets", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan")
      onSaved()
    } catch (err) {
      setError(err.message)
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(42,32,24,0.5)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="glass-strong rounded-t-[32px] sm:rounded-[32px] p-6 shadow-pop-lg w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">{isEdit ? "Edit Budget" : "New Budget"}</p>
            <h3 className="text-lg font-display font-bold text-earth-800 flex items-center gap-2">
              <Target size={18} color={THEME.primary} aria-hidden="true" />
              {isEdit ? "Ubah Budget" : "Buat Budget"}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Close budget setup" className="w-8 h-8 rounded-full bg-earth-50 hover:bg-earth-100 transition-colors flex items-center justify-center">
            <X size={14} color={THEME.textSecondary} aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <SelectField label="Kategori" value={kategori} onChange={setKategori} options={EXPENSE_CATEGORIES} placeholder="Pilih kategori" />

          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Bulan" value={bulan} onChange={setBulan} options={AVAILABLE_MONTHS} placeholder="Bulan" />
            <SelectField label="Tahun" value={tahun} onChange={setTahun} options={YEAR_OPTIONS} placeholder="Tahun" />
          </div>

          <div>
            <label htmlFor="budget-limit" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Limit (Rp)</label>
            <input
              id="budget-limit"
              type="text"
              inputMode="numeric"
              placeholder="500000"
              value={rawLimit}
              onChange={e => setRawLimit(formatInputRupiah(e.target.value))}
              className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>

          <SelectField label="Akun (opsional)" value={akun} onChange={setAkun} options={BANK_ACCOUNTS} placeholder="Semua akun" />

          <div>
            <label htmlFor="budget-note" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Catatan (opsional)</label>
            <input
              id="budget-note"
              type="text"
              placeholder="e.g. Weekly dining cap"
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>

          {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 mt-2 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-pop transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
            style={{ background: submitting ? "#ccc" : "linear-gradient(135deg, #4a3d33, #7c5fcf)" }}
          >
            {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : isEdit ? "Simpan Perubahan" : "Buat Budget"}
          </button>
        </form>
      </div>
    </div>
  )
}
