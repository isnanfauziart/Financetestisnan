"use client"
import { useState } from "react"
import { Plus } from "lucide-react"
import { THEME, BANK_ACCOUNTS } from "@/app/dashboard/_components/constants"
import { formatInputRupiah } from "@/app/dashboard/_components/helpers"
import SelectField from "@/app/dashboard/_components/SelectField"
import Sheet from "@/app/dashboard/_components/Sheet"

export default function GoalContributeModal({ goal, onClose, onSaved }) {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0])
  const [rawAmount, setRawAmount] = useState("")
  const [akunBank, setAkunBank] = useState("")
  const [catatan, setCatatan] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rawAmount) {
      setError("Jumlah wajib diisi")
      return
    }
    const amount = parseFloat(rawAmount.replace(/\./g, ""))
    if (!amount || amount <= 0) {
      setError("Jumlah harus lebih besar dari 0")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "savings",
          tanggal,
          keterangan: catatan || `Kontribusi: ${goal.nama}`,
          kategori: goal.kategori,
          jumlah: amount,
          akunBank,
          catatan: catatan || `Goal: ${goal.nama}`,
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

  return (
    <Sheet
      open={true}
      onClose={onClose}
      subtitle="Quick Contribute"
      size="md"
      maxHeight="90vh"
      closeOnBackdrop={!submitting}
      header={
        <h3 className="text-lg font-display font-bold flex items-center gap-2" style={{ color: goal.color || THEME.primary }}>
          <Plus size={18} aria-hidden="true" />
          {goal.nama}
        </h3>
      }
    >
      <p className="text-xs text-earth-600 mb-4">
        Kontribusi akan masuk ke tabungan <strong>{goal.kategori}</strong> dan otomatis terhitung untuk goal ini.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="contrib-amount" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Jumlah (Rp)</label>
          <input id="contrib-amount" type="text" inputMode="numeric" placeholder="500000" value={rawAmount} onChange={e => setRawAmount(formatInputRupiah(e.target.value))} autoFocus
            className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-lg font-bold outline-none focus:ring-2 focus:ring-violet-200" />
        </div>

        <div>
          <label htmlFor="contrib-date" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Tanggal</label>
          <input id="contrib-date" type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
            className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none" />
        </div>

        <SelectField label="Akun Bank (opsional)" value={akunBank} onChange={setAkunBank} options={BANK_ACCOUNTS} placeholder="Pilih akun" />

        <div>
          <label htmlFor="contrib-note" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Catatan (opsional)</label>
          <input id="contrib-note" type="text" placeholder="e.g. Gaji bulan ini" value={catatan} onChange={e => setCatatan(e.target.value)}
            className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-200" />
        </div>

        {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

        <button type="submit" disabled={submitting}
          className="w-full py-4 mt-2 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-pop transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
          style={{ background: submitting ? "#ccc" : `linear-gradient(135deg, ${goal.color || THEME.savings}, #7c5fcf)` }}>
          {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={18} aria-hidden="true" /> Tambah Kontribusi</>}
        </button>
      </form>
    </Sheet>
  )
}
