"use client"
import { useMemo } from "react"
import { Tag } from "lucide-react"
import { THEME, EVENT_COLORS } from "@/app/dashboard/_components/constants"
import { useEvents } from "@/lib/useSharedData"
import { getCategorySuggestion } from "@/lib/eventTemplates"

export default function EventSuggestionChip({ kategori, eventId, onSelect }) {
  const { events } = useEvents()

  const suggestion = useMemo(() => {
    if (!kategori || eventId) return null
    const activeEvents = (events || []).filter(e => e.effectiveStatus === "active" || e.status === "active")
    if (activeEvents.length === 0) return null
    return getCategorySuggestion(kategori, activeEvents)
  }, [kategori, eventId, events])

  if (!suggestion) return null

  const { event, subKategori } = suggestion
  const eventColor = event.tipe === "anak-sekolah" ? EVENT_COLORS["anak-sekolah"] : event.tipe === "lebaran-thr" ? EVENT_COLORS["lebaran-thr"] : EVENT_COLORS.custom

  return (
    <button
      type="button"
      onClick={() => onSelect(event.id)}
      className="w-full text-left px-3 py-2 rounded-xl border transition-all active:scale-[0.98] flex items-center gap-2"
      style={{ background: eventColor + "08", borderColor: eventColor + "33" }}
    >
      <Tag size={12} style={{ color: eventColor }} />
      <span className="text-[11px] font-semibold text-earth-700">
        Tag ke <span style={{ color: eventColor }}>{event.nama}</span> → {subKategori}
      </span>
    </button>
  )
}
