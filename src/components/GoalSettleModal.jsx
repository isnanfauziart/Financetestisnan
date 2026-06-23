"use client"
import { useState } from "react"
import { Check, PartyPopper } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRpFull } from "@/app/dashboard/_components/helpers"
import Sheet from "@/app/dashboard/_components/Sheet"

export default function GoalSettleModal({ goal, progress, onClose, onSettled }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const color = goal.color || THEME.savings

  async function handleSettle() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: goal.id, status: "settled" }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Gagal menandai goal")
      onSettled()
    } catch (err) {
      setError(err.message)
    }
    setSubmitting(false)
  }

  return (
    <Sheet
      open={true}
      onClose={onClose}
      size="md"
      maxHeight="70vh"
      closeOnBackdrop={!submitting}
      header={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + "22", color }}>
            <Check size={16} />
          </div>
          <h3 className="text-lg font-display font-bold text-earth-800">Tandai Terealisasi</h3>
        </div>
      }
    >
      <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: color + "14" }}>
        <p className="text-sm font-bold text-earth-800 mb-1">{goal.nama}</p>
        <p className="text-lg font-bold" style={{ color }}>
          {formatRpFull(progress)} / {formatRpFull(goal.target)}
        </p>
        <p className="text-[10px] text-earth-500 mt-1">100% tercapai</p>
      </div>

      <div className="rounded-2xl p-3 mb-4 border border-earth-200">
        <p className="text-xs text-earth-600 text-center leading-relaxed">
          Apakah kamu sudah menggunakan uangnya untuk <strong>{goal.nama}</strong>?
          Goal akan dipindahkan ke bagian "Completed" dan ditandai sebagai <strong>Terealisasi</strong>.
        </p>
      </div>

      {error && <p className="text-xs text-rose-500 font-semibold mb-3">{error}</p>}

      <div className="space-y-2">
        <button
          onClick={handleSettle}
          disabled={submitting}
          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-pop transition-all active:scale-[0.97] disabled:opacity-50"
          style={{ background: submitting ? "#ccc" : `linear-gradient(135deg, ${color}, ${THEME.primary})` }}
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <PartyPopper size={16} /> Ya, Tandai Terealisasi
            </>
          )}
        </button>

        <button
          onClick={onClose}
          disabled={submitting}
          className="w-full py-2 text-xs font-semibold text-earth-500 hover:text-earth-700 transition-colors"
        >
          Batal
        </button>
      </div>
    </Sheet>
  )
}
