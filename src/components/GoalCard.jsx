"use client"
import { Plus, Calendar, Check } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"
import RowActionsMenu from "@/app/dashboard/_components/RowActionsMenu"
import GoalProgressRing from "./GoalProgressRing"
import { computeGoalPace } from "@/app/dashboard/_components/goalUtils"

function deadlineLabel(deadline) {
  if (!deadline) return null
  const m = String(deadline).match(/^(\d{4})(?:-(\d{1,2}))?/)
  if (!m) return deadline
  const year = m[1]
  if (!m[2]) return year
  const idx = Math.max(0, Math.min(11, parseInt(m[2], 10) - 1))
  return `${AVAILABLE_MONTHS[idx]} ${year}`
}

function paceLabel(pace, deadline) {
  if (!pace) return null
  if (pace.status === "expired") return `Tenggat lewat · kurang ${formatRp(pace.remaining)}`
  if (pace.status === "no_contributions") return `Mulai dari ${formatRp(pace.requiredMonthly)}/bulan${deadline ? ` sampai ${deadline}` : ""}`
  if (pace.status === "on_track") return `Sesuai rencana · ${formatRp(pace.requiredMonthly)}/bulan${deadline ? ` sampai ${deadline}` : ""}`
  return `Perlu tambah ${formatRp(pace.additionalMonthly)}/bulan${deadline ? ` sampai ${deadline}` : ""}`
}

export default function GoalCard({ goal, progress, onContribute, onEdit, onDelete, onSettle, isCompleted, now, sharedCategory = false }) {
  const pct = goal.target > 0 ? (progress / goal.target) * 100 : 0
  const achieved = pct >= 100
  const settled = goal.status === "settled"
  const color = settled ? "#9c8978" : (goal.color || THEME.savings)
  const deadline = deadlineLabel(goal.deadline)
  const pace = !settled && !achieved ? computeGoalPace(goal, progress, now) : null

  return (
    <div className={`bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-4 shadow-warm transition-[box-shadow,opacity] hover:shadow-pop group ${settled ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <h4 className="text-sm font-bold text-md3-on-surface truncate">{goal.nama}</h4>
            {settled && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: THEME.incomeBg, color: THEME.income }}>
                 ✓ Selesai
              </span>
            )}
            {!settled && achieved && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "#d4a85322", color: "#d4a853" }}>
                ✓ Selesai
              </span>
            )}
          </div>
          <p className="text-[10px] text-md3-on-surface-variant">{goal.kategori}</p>
        </div>
        <RowActionsMenu
          onEdit={onEdit}
          onDelete={onDelete}
          menuLabel={`Aksi target ${goal.nama}`}
          editLabel={`Edit ${goal.nama} goal`}
          deleteLabel={`Delete ${goal.nama} goal`}
        />
      </div>

      <div className="flex items-center gap-3">
        <GoalProgressRing progress={settled ? 100 : pct} color={color} completed={achieved || settled} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-md3-on-surface-variant tabular-nums">
            <span className="font-bold" style={{ color }}>{formatRp(progress)}</span>
            <span className="text-md3-on-surface-variant"> / {formatRp(goal.target)}</span>
          </p>
          {deadline && (
            <p className="text-[10px] text-md3-on-surface-variant flex items-center gap-1 mt-1">
              <Calendar size={9} aria-hidden="true" /> sampai {deadline}
            </p>
          )}
          {pace && (
            <p className="text-[10px] font-semibold mt-0.5" style={{ color }}>
              {paceLabel(pace, deadline)}
            </p>
          )}
          {pace && sharedCategory && (
            <p className="text-[10px] text-md3-on-surface-variant mt-1">
              Kategori ini dipakai beberapa target; cek pembagiannya.
            </p>
          )}
          {!settled && achieved && (
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: "#d4a853" }}>
              Target tercapai
            </p>
          )}
          {settled && (
            <p className="text-[10px] text-earth-400 mt-0.5">Target tercapai dan selesai</p>
          )}
        </div>
      </div>

      {/* Active goal at 100% — show Settle button */}
      {!settled && achieved && onSettle && (
        <button onClick={onSettle}
          className="w-full min-h-11 mt-3 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
          style={{ background: THEME.incomeBg, color: THEME.income }}
          aria-label={`Settle ${goal.nama}`}>
          <Check size={12} strokeWidth={3} aria-hidden="true" /> Tandai Terealisasi
        </button>
      )}

      {/* Active goal not yet 100% — show Contribute button */}
      {!settled && !achieved && (
        <button onClick={onContribute}
          className="w-full min-h-11 mt-3 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
          style={{ background: color + "18", color }}
          aria-label={`Contribute to ${goal.nama}`}>
          <Plus size={12} strokeWidth={3} aria-hidden="true" /> Kontribusi
        </button>
      )}
    </div>
  )
}
