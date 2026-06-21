"use client"
import { ArrowUpRight, ArrowDownRight, Clock, AlertTriangle, Check } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { formatRp, formatRpFull } from "@/app/dashboard/_components/helpers"

function daysUntil(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split("-")
  if (parts.length !== 3) return null
  const due = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr) {
  if (!dateStr) return "—"
  const parts = dateStr.split("-")
  if (parts.length !== 3) return dateStr
  const monthIdx = parseInt(parts[1], 10) - 1
  const monthName = AVAILABLE_MONTHS[monthIdx] || parts[1]
  return `${parseInt(parts[2], 10)} ${monthName} ${parts[0]}`
}

export default function DebtCard({ debt, onPay, onSettle }) {
  const isUtang = debt.arah === "utang"
  const accentColor = isUtang ? THEME.expense : THEME.income
  const isSettled = debt.status === "settled"
  const progress = debt.jumlah > 0 ? ((debt.jumlah - debt.sisaSaldo) / debt.jumlah) * 100 : 0
  const days = daysUntil(debt.jatuhTempo)
  const isOverdue = days !== null && days < 0 && !isSettled
  const isUrgent = days !== null && days >= 0 && days <= 7 && !isSettled

  return (
    <div
      className={`rounded-2xl p-3.5 border transition-all ${isSettled ? "opacity-60" : ""}`}
      style={{
        background: isSettled ? THEME.surfaceWarm : THEME.surface,
        borderColor: isOverdue ? THEME.danger + "40" : isUrgent ? THEME.warning + "40" : THEME.surfaceWarm,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: accentColor + "18", color: accentColor }}
          >
            {isUtang ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-earth-800 truncate">{debt.namaOrang}</p>
            <p className="text-[9px] text-earth-500 uppercase tracking-wider">
              {isUtang ? "Utang" : "Piutang"} · {formatDate(debt.jatuhTempo)}
            </p>
          </div>
        </div>
        {isSettled ? (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: THEME.incomeBg, color: THEME.income }}>
            <Check size={8} /> Lunas
          </span>
        ) : isOverdue ? (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: THEME.dangerBg, color: THEME.danger }}>
            <AlertTriangle size={8} /> {Math.abs(days)} hari lalu
          </span>
        ) : isUrgent ? (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: THEME.warningBg, color: THEME.warning }}>
            <Clock size={8} /> {days} hari lagi
          </span>
        ) : days !== null && !isSettled ? (
          <span className="text-[9px] font-bold text-earth-400">
            {days} hari lagi
          </span>
        ) : null}
      </div>

      {/* Amount */}
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <span className="text-lg font-bold" style={{ color: accentColor }}>{formatRp(debt.sisaSaldo)}</span>
          <span className="text-[10px] text-earth-400 ml-1">sisa</span>
        </div>
        <span className="text-[10px] text-earth-500">dari {formatRpFull(debt.jumlah)}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: THEME.surfaceWarm }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, progress)}%`,
            background: isSettled ? THEME.income : accentColor,
          }}
        />
      </div>

      {/* Actions */}
      {!isSettled && (
        <div className="flex gap-2">
          <button
            onClick={() => onPay(debt)}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.97]"
            style={{ background: accentColor }}
          >
            Bayar
          </button>
          <button
            onClick={() => onSettle(debt)}
            className="py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all active:scale-[0.97]"
            style={{ borderColor: accentColor + "40", color: accentColor }}
          >
            Settle Lunas
          </button>
        </div>
      )}

      {debt.catatan && (
        <p className="text-[10px] text-earth-400 mt-2 truncate">{debt.catatan}</p>
      )}
    </div>
  )
}
