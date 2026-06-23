"use client"
import { useState } from "react"
import { CreditCard, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatInputRupiah } from "@/app/dashboard/_components/helpers"
import SelectField from "@/app/dashboard/_components/SelectField"
import Sheet from "@/app/dashboard/_components/Sheet"

export default function DebtSetupModal({ onClose, onSaved }) {
  const [namaOrang, setNamaOrang] = useState("")
  const [rawJumlah, setRawJumlah] = useState("")
  const [arah, setArah] = useState("utang")
  const [jatuhTempo, setJatuhTempo] = useState("")
  const [catatan, setCatatan] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!namaOrang || !rawJumlah || !jatuhTempo) {
      setError("Nama, jumlah, dan jatuh tempo wajib diisi")
      return
    }
    const jumlah = parseFloat(rawJumlah.replace(/\./g, ""))
    if (!jumlah || jumlah <= 0) {
      setError("Jumlah harus lebih besar dari 0")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaOrang,
          jumlah,
          arah,
          jatuhTempo,
          catatan,
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

  const isUtang = arah === "utang"
  const accentColor = isUtang ? THEME.expense : THEME.income

  return (
    <Sheet
      open={true}
      onClose={onClose}
      subtitle="Tambah Utang/Piutang"
      size="md"
      maxHeight="90vh"
      closeOnBackdrop={!submitting}
      position="center"
      header={
        <div className="flex items-center gap-2">
          <CreditCard size={18} color={accentColor} aria-hidden="true" />
          <h3 className="text-lg font-display font-bold text-earth-800">
            {isUtang ? "Tambah Utang" : "Tambah Piutang"}
          </h3>
        </div>
      }
    >
      {/* Preview */}
      <div className="rounded-2xl p-3 mb-4 flex items-center gap-3" style={{ background: accentColor + "14" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: accentColor + "22", color: accentColor }}>
          {isUtang ? <ArrowUpRight size={20} aria-hidden="true" /> : <ArrowDownRight size={20} aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-earth-800 truncate">{namaOrang || "Nama orang"}</p>
          <p className="text-[11px] text-earth-500">
            {rawJumlah ? `Rp ${rawJumlah}` : "Rp 0"} · {isUtang ? "Kamu berutang" : "Dia berutang"} · {jatuhTempo || "Jatuh tempo"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Tipe</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setArah("utang")}
              className="py-3 rounded-2xl text-sm font-bold border-2 transition-all"
              style={{
                background: arah === "utang" ? THEME.expenseBg : THEME.surfaceMuted,
                borderColor: arah === "utang" ? THEME.expense : "transparent",
                color: arah === "utang" ? THEME.expense : THEME.textSecondary,
              }}
            >
              <ArrowUpRight size={14} className="inline mr-1" /> Utang (saya berutang)
            </button>
            <button
              type="button"
              onClick={() => setArah("piutang")}
              className="py-3 rounded-2xl text-sm font-bold border-2 transition-all"
              style={{
                background: arah === "piutang" ? THEME.incomeBg : THEME.surfaceMuted,
                borderColor: arah === "piutang" ? THEME.income : "transparent",
                color: arah === "piutang" ? THEME.income : THEME.textSecondary,
              }}
            >
              <ArrowDownRight size={14} className="inline mr-1" /> Piutang (dia berutang)
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="debt-name" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Nama Orang</label>
          <input
            id="debt-name"
            type="text"
            placeholder="e.g. Budi"
            value={namaOrang}
            onChange={e => setNamaOrang(e.target.value)}
            className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>

        <div>
          <label htmlFor="debt-amount" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Jumlah (Rp)</label>
          <input
            id="debt-amount"
            type="text"
            inputMode="numeric"
            placeholder="5000000"
            value={rawJumlah}
            onChange={e => setRawJumlah(formatInputRupiah(e.target.value))}
            className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>

        <div>
          <label htmlFor="debt-due" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Jatuh Tempo</label>
          <input
            id="debt-due"
            type="date"
            value={jatuhTempo}
            onChange={e => setJatuhTempo(e.target.value)}
            className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>

        <div>
          <label htmlFor="debt-notes" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Catatan (opsional)</label>
          <input
            id="debt-notes"
            type="text"
            placeholder="e.g. Pinjam buat renovasi"
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>

        {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 mt-2 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-pop transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
          style={{ background: submitting ? "#ccc" : `linear-gradient(135deg, #4a3d33, ${accentColor})` }}
        >
          {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Simpan"}
        </button>
      </form>
    </Sheet>
  )
}
