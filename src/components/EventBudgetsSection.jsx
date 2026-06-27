"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { CalendarDays, Plus, Sparkles } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import EmptyState from "@/app/dashboard/_components/EmptyState"
import EventCard from "./EventCard"
import EventSetupModal from "./EventSetupModal"
import EventDetailModal from "./EventDetailModal"

export default function EventBudgetsSection({ filteredTransactions, onToast, refreshTrigger }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [setupState, setSetupState] = useState(null)
  const [detailEvent, setDetailEvent] = useState(null)
  const [detailTransactions, setDetailTransactions] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/momental?progress=true")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal memuat event")
      setEvents(data.events || [])
    } catch (err) {
      onToast?.(err.message, "error")
    } finally {
      setLoading(false)
    }
  }, [onToast])

  useEffect(() => { fetchEvents() }, [fetchEvents])
  useEffect(() => { if (refreshTrigger > 0) fetchEvents() }, [refreshTrigger, fetchEvents])

  const activeEvents = useMemo(() => events.filter(e => e.effectiveStatus === "active" || e.effectiveStatus === "planning"), [events])
  const completedEvents = useMemo(() => events.filter(e => e.effectiveStatus === "completed"), [events])

  const handleDetail = async (event) => {
    try {
      const res = await fetch(`/api/momental/${event.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal memuat detail")
      setDetailEvent(data.event)
      setDetailTransactions(data.transactions || [])
    } catch (err) {
      onToast?.(err.message, "error")
    }
  }

  const handleDelete = async (event) => {
    if (!confirmDelete || confirmDelete.id !== event.id) {
      setConfirmDelete(event)
      return
    }
    try {
      const res = await fetch(`/api/momental/${event.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal menghapus")
      }
      setConfirmDelete(null)
      onToast?.("Event dihapus", "success")
      fetchEvents()
    } catch (err) {
      onToast?.(err.message, "error")
    }
  }

  if (loading) {
    return (
      <div className="mt-6 animate-bento-in">
        <div className="flex items-center gap-1.5 mb-3 px-1">
          <CalendarDays size={14} style={{ color: THEME.warning }} aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Event Budget</h3>
        </div>
        <div className="bento-tile bg-white border border-earth-100 p-6 shadow-warm text-center">
          <div className="w-8 h-8 mx-auto border-2 border-earth-200 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 animate-bento-in">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={14} style={{ color: THEME.warning }} aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Event Budget</h3>
          {activeEvents.length > 0 && (
            <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">{activeEvents.length} aktif</span>
          )}
        </div>
        <button onClick={() => setSetupState({ mode: "create" })} className="text-[11px] font-bold text-violet-600 flex items-center gap-1 hover:gap-2 transition-all" aria-label="Buat event budget">
          <Plus size={12} strokeWidth={3} aria-hidden="true" /> Buat
        </button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={20} />}
          title="Belum ada event budget"
          hint="Buat event budget untuk melacak pengeluaran besar seperti Anak Masuk Sekolah atau Lebaran"
          action={
            <button onClick={() => setSetupState({ mode: "create" })} className="text-xs font-bold px-4 py-2 rounded-full text-white mesh-violet shadow-pop">
              Buat Event
            </button>
          }
        />
      ) : (
        <>
          {activeEvents.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeEvents.map(evt => (
                <EventCard
                  key={evt.id}
                  event={evt}
                  onDetail={() => handleDetail(evt)}
                  onEdit={() => setSetupState({ mode: "edit", event: evt })}
                  onDelete={() => handleDelete(evt)}
                />
              ))}
            </div>
          )}

          {completedEvents.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold text-earth-500 mb-2">Selesai ({completedEvents.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-70">
                {completedEvents.map(evt => (
                  <EventCard
                    key={evt.id}
                    event={evt}
                    onDetail={() => handleDetail(evt)}
                    onEdit={() => setSetupState({ mode: "edit", event: evt })}
                    onDelete={() => handleDelete(evt)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(42,32,24,0.5)", backdropFilter: "blur(8px)" }} onClick={() => setConfirmDelete(null)}>
          <div className="glass-strong rounded-t-[32px] sm:rounded-[32px] p-6 shadow-pop-lg w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-display font-bold text-earth-800 mb-1">Hapus event ini?</h3>
            <p className="text-sm text-earth-600 mb-5"><strong>{confirmDelete.nama}</strong> akan dihapus. Transaksi terkait tidak akan terhapus.</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmDelete(null)} className="py-3 rounded-2xl font-bold text-earth-700 bg-earth-50 active:scale-95 transition-transform">Batal</button>
              <button onClick={() => handleDelete(confirmDelete)} className="py-3 rounded-2xl font-bold text-white active:scale-95 transition-transform" style={{ background: THEME.danger }}>Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Setup modal */}
      {setupState && (
        <EventSetupModal
          event={setupState.event}
          onClose={() => setSetupState(null)}
          onSaved={() => {
            setSetupState(null)
            onToast?.(setupState.mode === "edit" ? "Event diperbarui ✓" : "Event budget dibuat ✓", "success")
            fetchEvents()
          }}
        />
      )}

      {/* Detail modal */}
      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          transactions={detailTransactions}
          onClose={() => { setDetailEvent(null); setDetailTransactions([]) }}
        />
      )}
    </div>
  )
}
