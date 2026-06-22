"use client"
import { useState, useEffect } from "react"
import { Wallet, ArrowRight } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRpFull, formatInputRupiah } from "@/app/dashboard/_components/helpers"
import Sheet from "@/app/dashboard/_components/Sheet"

const DISMISSED_KEY = "saldoAwalDismissed"

export default function SetupSaldoAwal({ settings, onSaved }) {
  const [open, setOpen] = useState(false)
  const [rawAmount, setRawAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!settings) return
    const dismissed = localStorage.getItem(DISMISSED_KEY) === "true"
    if (settings.startingBalance === 0 && !dismissed) {
      setOpen(true)
    }
  }, [settings])

  const handleSave = async () => {
    const amount = parseFloat(String(rawAmount).replace(/\./g, ""))
    if (!amount || amount <= 0) {
      setError("Masukkan jumlah saldo awal")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "startingBalance", value: amount }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan")
      setOpen(false)
      onSaved()
    } catch (err) {
      setError(err.message)
    }
    setSubmitting(false)
  }

  const handleSkip = () => {
    localStorage.setItem(DISMISSED_KEY, "true")
    setOpen(false)
  }

  return (
    <Sheet
      open={open}
      onClose={handleSkip}
      size="md"
      maxHeight="80vh"
      closeOnBackdrop={false}
      closeOnEsc={false}
      header={
        <div className="flex items-center gap-2">
          <Wallet size={18} color={THEME.primary} aria-hidden="true" />
          <h3 className="text-lg font-display font-bold text-earth-800">Selamat Datang!</h3>
        </div>
      }
    >
      <div className="rounded-2xl p-4 mb-4" style={{ background: THEME.primaryBg }}>
        <p className="text-xs text-earth-700 leading-relaxed">
          Untuk menghitung net worth yang akurat, masukkan total kekayaan kamu saat ini (saldo semua rekening bank, e-wallet, investasi, dll).
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="setup-saldo" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">
            Total Kekayaan Saat Ini (Rp)
          </label>
          <input
            id="setup-saldo"
            type="text"
            inputMode="numeric"
            placeholder="25000000"
            value={rawAmount}
            onChange={e => setRawAmount(formatInputRupiah(e.target.value))}
            className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200"
            autoFocus
          />
          {rawAmount && (
            <p className="text-[10px] text-earth-500 mt-1 px-1">
              {formatRpFull(parseFloat(String(rawAmount).replace(/\./g, "")) || 0)}
            </p>
          )}
        </div>

        {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

        <button
          onClick={handleSave}
          disabled={submitting}
          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-pop transition-all active:scale-[0.97] disabled:opacity-50"
          style={{ background: submitting ? "#ccc" : `linear-gradient(135deg, #4a3d33, ${THEME.primary})` }}
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Simpan <ArrowRight size={14} />
            </>
          )}
        </button>

        <button
          onClick={handleSkip}
          className="w-full py-2 text-xs font-semibold text-earth-500 hover:text-earth-700 transition-colors"
        >
          Lewati — mulai dari 0
        </button>
      </div>
    </Sheet>
  )
}
