"use client"
import { useMemo } from "react"
import { GraduationCap, Moon, CalendarDays, Pencil, Trash2, ChevronRight, AlertTriangle } from "lucide-react"
import { THEME, EVENT_COLORS } from "@/app/dashboard/_components/constants"
import { formatRp, formatRpFull } from "@/app/dashboard/_components/helpers"
import GoalProgressRing from "./GoalProgressRing"
import BudgetProgressBar from "./BudgetProgressBar"

const EVENT_ICONS = {
  "anak-sekolah": GraduationCap,
  "lebaran-thr": Moon,
  "custom": CalendarDays,
}

const STATUS_LABELS = {
  planning: "Mendatang",
  active: "Aktif",
  completed: "Selesai",
  archived: "Arsip",
}

const STATUS_COLORS = {
  planning: THEME.textTertiary,
  active: THEME.warning,
  completed: THEME.savings,
  archived: THEME.textTertiary,
}

export default function EventCard({ event, onDetail, onEdit, onDelete }) {
  const Icon = EVENT_ICONS[event.tipe] || CalendarDays
  const eventColor = event.tipe === "anak-sekolah" ? EVENT_COLORS["anak-sekolah"] : event.tipe === "lebaran-thr" ? EVENT_COLORS["lebaran-thr"] : EVENT_COLORS.custom
  const effectiveStatus = event.effectiveStatus || event.status
  const statusColor = STATUS_COLORS[effectiveStatus] || THEME.textTertiary
  const statusLabel = STATUS_LABELS[effectiveStatus] || effectiveStatus
  const pct = event.pct || 0
  const isOverBudget = pct > 100
  const isWarning = pct >= 80 && pct <= 100

  const topSubs = useMemo(() => {
    return (event.subCategories || []).slice(0, 3)
  }, [event.subCategories])

  const daysRemaining = useMemo(() => {
    if (!event.tanggalSelesai) return null
    const end = new Date(event.tanggalSelesai)
    const today = new Date()
    end.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  }, [event.tanggalSelesai])

  return (
    <div
      className="bento-tile bg-white border border-earth-100 shadow-warm p-4 rounded-2xl group cursor-pointer transition-all hover:shadow-pop"
      style={{ borderLeft: `4px solid ${eventColor}` }}
      onClick={onDetail}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: eventColor + "18", color: eventColor }}>
            <Icon size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-earth-800 truncate">{event.nama}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOverBudget && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: THEME.dangerBg, color: THEME.danger }}>
              <AlertTriangle size={9} /> Over
            </span>
          )}
          {isWarning && !isOverBudget && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: THEME.warningBg, color: THEME.warning }}>
              Hampir
            </span>
          )}
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: statusColor + "18", color: statusColor }}>
            {statusLabel}
          </span>
          <div className="flex gap-1 opacity-100 can-hover:opacity-0 can-hover:group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onEdit() }} aria-label={`Edit ${event.nama}`} className="w-7 h-7 rounded-lg bg-earth-50 hover:bg-violet-100 flex items-center justify-center text-earth-600 hover:text-violet-600">
              <Pencil size={11} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete() }} aria-label={`Hapus ${event.nama}`} className="w-7 h-7 rounded-lg bg-earth-50 hover:bg-rose-100 flex items-center justify-center text-earth-600 hover:text-rose-500">
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4 mb-3">
        <GoalProgressRing progress={pct} color={eventColor} size={64} stroke={6} completed={pct >= 100} />
        <div className="flex-1 min-w-0">
          <p className="text-lg font-display font-bold" style={{ color: eventColor }}>{formatRpFull(event.spent || 0)}</p>
          <p className="text-[11px] text-earth-500">dari {formatRpFull(event.totalBudget)}</p>
          {isOverBudget && (
            <p className="text-[10px] font-bold mt-0.5" style={{ color: THEME.danger }}>
              Over budget {formatRpFull((event.spent || 0) - event.totalBudget)}
            </p>
          )}
          {daysRemaining !== null && (
            <p className="text-[10px] text-earth-400 mt-0.5">
              {daysRemaining > 0 ? `${daysRemaining} hari lagi` : daysRemaining === 0 ? "Berakhir hari ini" : "Sudah berakhir"}
            </p>
          )}
        </div>
      </div>

      {/* Sub-categories */}
      {topSubs.length > 0 && (
        <div className="space-y-2">
          {topSubs.map((sub, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="font-semibold text-earth-700 truncate">{sub.subKategori || sub.kategori}</span>
                  <span className="text-earth-500 flex-shrink-0 ml-2">{formatRp(sub.spent || 0)} / {formatRp(sub.limit)}</span>
                </div>
                <BudgetProgressBar spent={sub.spent || 0} limit={sub.limit} height={5} />
              </div>
            </div>
          ))}
          {(event.subCategories || []).length > 3 && (
            <p className="text-[10px] text-earth-400 text-center">+{(event.subCategories || []).length - 3} sub-kategori lainnya</p>
          )}
        </div>
      )}

      {/* Detail link */}
      <div className="flex justify-end mt-2">
        <span className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: eventColor }}>
          Detail <ChevronRight size={12} />
        </span>
      </div>
    </div>
  )
}
