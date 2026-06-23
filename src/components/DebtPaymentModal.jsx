"use client"
import { useState } from "react"
import { ArrowUpRight, ArrowDownRight, Check } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRpFull, formatInputRupiah } from "@/app/dashboard/_components/helpers"
import Sheet from "@/app/dashboard/_components/Sheet"

export default function DebtPaymentModal({ debt, onClose, onSaved, onToast }) {
  const [rawAmount, setRawAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const isUtang = debt.arah === "utang"
  const accentColor = isUtang ? THEME.expense : THEME.income

  const amount = parseFloat(String(rawAmount).replace(/\./g, "")) || 0
  const isSettleAll = amount >= debt.sisaSaldo && debt.sisaSaldo > 0

  async function handlePay(settleAll = false) {
    const payAmount = settleAll ? debt.sisaSaldo : amount
    if (!payAmount || payAmount <= 0) {
      setError("Masukkan jumlah pembayaran")
      return
    }
    if (payAmount > debt.sisaSaldo) {
      setError("Jumlah melebihi sisa utang")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pay",
          id: debt.id,
          amount: payAmount,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Gagal membayar")

      onToast(
        result.newStatus === "settled"
          ? `${debt.namaOrang} lunas! 🎉`
          : `Pembayaran ${formatRpFull(payAmount)} tercatat`,
        "success"
      )
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
      subtitle="Bayar"
      size="md"
      maxHeight="80vh"
      closeOnBackdrop={!submitting}
      position="center"
      header={
        <div className="flex items-center gap-2">
          {isUtang ? <ArrowUpRight size={18} color={accentColor} /> : <ArrowDownRight size={18} color={accentColor} />}
          <h3 className="text-lg font-display font-bold text-earth-800">
            Bayar {isUtang ? "Utang" : "Piutang"} ke {debt.namaOrang}
          </h3>
        </div>
      }
    >
      {/* Current debt info */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: accentColor + "14" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">Sisa {isUtang ? "Utang" : "Piutang"}</span>
          <span className="text-lg font-bold" style={{ color: accentColor }}>{formatRpFull(debt.sisaSaldo)}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: THEME.surfaceWarm }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, ((debt.jumlah - debt.sisaSaldo) / debt.jumlah) * 100)}%`,
              background: accentColor,
            }}
          />
        </div>
        <p className="text-[10px] text-earth-500 mt-1">
          {formatRpFull(debt.jumlah - debt.sisaSaldo)} dari {formatRpFull(debt.jumlah)} terbayar
        </p>
      </div>

      {/* Payment input */}
      <div className="space-y-3">
        <div>
          <label htmlFor="pay-amount" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">
            Jumlah Pembayaran (Rp)
          </label>
          <input
            id="pay-amount"
            type="text"
            inputMode="numeric"
            placeholder="500000"
            value={rawAmount}
            onChange={e => setRawAmount(formatInputRupiah(e.target.value))}
            className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200"
          />
          {amount > 0 && amount < debt.sisaSaldo && (
            <p className="text-[10px] text-earth-500 mt-1 px-1">
              Sisa setelah bayar: <strong>{formatRpFull(debt.sisaSaldo - amount)}</strong>
            </p>
          )}
          {isSettleAll && (
            <p className="text-[10px] mt-1 px-1 font-bold" style={{ color: THEME.income }}>
              ✓ Pembayaran penuh — utang akan lunas
            </p>
          )}
        </div>

        {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

        <button
          onClick={() => handlePay(false)}
          disabled={submitting || amount <= 0 || amount > debt.sisaSaldo}
          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-pop transition-all active:scale-[0.97] disabled:opacity-50"
          style={{ background: submitting || amount <= 0 ? "#ccc" : accentColor }}
        >
          {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : `Bayar ${amount > 0 ? formatRpFull(amount) : ""}`}
        </button>

        <button
          onClick={() => handlePay(true)}
          disabled={submitting}
          className="w-full py-3 rounded-2xl font-bold text-sm border-2 transition-all active:scale-[0.97]"
          style={{ borderColor: accentColor, color: accentColor }}
        >
          <Check size={14} className="inline mr-1" /> Settle Lunas ({formatRpFull(debt.sisaSaldo)})
        </button>
      </div>
    </Sheet>
  )
}
