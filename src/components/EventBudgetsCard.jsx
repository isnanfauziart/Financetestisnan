"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { CalendarDays, ChevronRight, GraduationCap, Moon } from "lucide-react"
import { THEME, EVENT_COLORS } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"

const EVENT_ICONS = {
  "anak-sekolah": GraduationCap,
  "lebaran-thr": Moon,
}

export default function EventBudgetsCard({ setActiveNav }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/momental/summary")
      const data = await res.json()
      if (!res.ok) return
      setEvents(data.events || [])
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  if (loading || events.length === 0) return null

  return (
    <div className="mt-6 animate-bento-in">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={14} style={{ color: THEME.warning }} aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Event Budget</h3>
          <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">{events.length} aktif</span>
        </div>
        <button onClick={() => setActiveNav("stats")} className="text-[11px] font-bold text-violet-600 flex items-center gap-1 hover:gap-2 transition-all" aria-label="Lihat semua event">
          Detail <ChevronRight size={12} aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-2">
        {events.map((evt) => {
          const color = evt.tipe === "anak-sekolah" ? EVENT_COLORS["anak-sekolah"] : evt.tipe === "lebaran-thr" ? EVENT_COLORS["lebaran-thr"] : EVENT_COLORS.custom
          const Icon = EVENT_ICONS[evt.tipe] || CalendarDays
          return (
            <button
              key={evt.id}
              onClick={() => setActiveNav("stats")}
              className="w-full text-left bento-tile bg-white border border-earth-100 shadow-warm p-3 rounded-2xl flex items-center gap-3 hover:bg-earth-50/60 transition-colors"
              style={{ borderLeft: `4px solid ${color}` }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + "18", color }}>
                <Icon size={16} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-earth-800 truncate">{evt.nama}</p>
                <p className="text-[11px] text-earth-500">
                  {evt.daysRemaining > 0 ? `${evt.daysRemaining} hari lagi` : "Berakhir"}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold" style={{ color }}>{formatRp(evt.totalBudget)}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
