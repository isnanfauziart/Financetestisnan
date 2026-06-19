"use client"
import { Pencil, Trash2, Plus, Calendar } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"
import GoalProgressRing from "./GoalProgressRing"

function deadlineLabel(deadline) {
  if (!deadline) return null
  const m = String(deadline).match(/^(\d{4})(?:-(\d{1,2}))?/)
  if (!m) return deadline
  const year = m[1]
  if (!m[2]) return year
  const idx = Math.max(0, Math.min(11, parseInt(m[2], 10) - 1))
  return `${AVAILABLE_MONTHS[idx]} ${year}`
}

function etaLabel(progress, target, createdAt) {
  if (!target || target <= 0) return null
  if (progress >= target) return null
  if (!createdAt) return null
  const days = (Date.now() - new Date(createdAt).getTime()) / 86400000
  if (days <= 0) return null
  const rate = progress / days
  if (rate <= 0) return "Belum ada kontribusi"
  const remaining = target - progress
  const etaDays = Math.ceil(remaining / rate)
  if (etaDays > 365 * 5) return null
  if (etaDays < 30) return `${etaDays} hari lagi`
  return `${Math.ceil(etaDays / 30)} bulan lagi`
}

export default function GoalCard({ goal, progress, onContribute, onEdit, onDelete }) {
  const pct = goal.target > 0 ? (progress / goal.target) * 100 : 0
  const completed = pct >= 100
  const color = goal.color || THEME.savings
  const eta = etaLabel(progress, goal.target, goal.createdAt)
  const deadline = deadlineLabel(goal.deadline)

  return (
    <div className="bento-tile bg-white border border-earth-100 p-4 shadow-warm transition-all hover:shadow-pop group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <h4 className="text-sm font-bold text-earth-800 truncate">{goal.nama}</h4>
            {completed && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "#d4a85322", color: "#d4a853" }}>
                ✓ Selesai
              </span>
            )}
          </div>
          <p className="text-[10px] text-earth-500">{goal.kategori}</p>
        </div>
        <div className="flex gap-0.5 opacity-100 can-hover:opacity-0 can-hover:group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onEdit} aria-label={`Edit ${goal.nama} goal`} className="w-6 h-6 rounded-lg bg-earth-50 hover:bg-violet-100 flex items-center justify-center text-earth-500 hover:text-violet-600">
            <Pencil size={11} aria-hidden="true" />
          </button>
          <button onClick={onDelete} aria-label={`Delete ${goal.nama} goal`} className="w-6 h-6 rounded-lg bg-earth-50 hover:bg-rose-100 flex items-center justify-center text-earth-500 hover:text-rose-500">
            <Trash2 size={11} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <GoalProgressRing progress={pct} color={color} completed={completed} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-earth-500">
            <span className="font-bold" style={{ color }}>{formatRp(progress)}</span>
            <span className="text-earth-400"> / {formatRp(goal.target)}</span>
          </p>
          {deadline && (
            <p className="text-[10px] text-earth-500 flex items-center gap-1 mt-1">
              <Calendar size={9} aria-hidden="true" /> by {deadline}
            </p>
          )}
          {eta && !completed && (
            <p className="text-[10px] font-semibold mt-0.5" style={{ color }}>
              {eta}
            </p>
          )}
        </div>
      </div>

      {!completed && (
        <button onClick={onContribute}
          className="w-full mt-3 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          style={{ background: color + "18", color }}
          aria-label={`Contribute to ${goal.nama}`}>
          <Plus size={12} strokeWidth={3} aria-hidden="true" /> Kontribusi
        </button>
      )}
    </div>
  )
}
