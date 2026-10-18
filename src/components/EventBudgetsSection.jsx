"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { CalendarDays, Plus, Wallet, ClipboardList, Receipt } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import EventCard from "./EventCard"
import EventSetupModal from "./EventSetupModal"
import EventDetailModal from "./EventDetailModal"
import FeatureEducation from "./FeatureEducation"

export default function EventBudgetsSection({ filteredTransactions, onToast, refreshTrigger, onUsageChange, proRegistrationOpen = true }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [setupState, setSetupState] = useState(null)
  const [detailEvent, setDetailEvent] = useState(null)
  const [detailTransactions, setDetailTransactions] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/momental?progress=true")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal memuat event")
      setEvents(data.events || [])
    } catch (err) {
      const message = err.message || "Gagal memuat event"
      setError(message)
      onToast?.(message, "error")
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
      onUsageChange?.()
    } catch (err) {
      onToast?.(err.message, "error")
    }
  }

  if (loading) {
    return (
      <div className="plan-section-shell animate-bento-in">
        <SectionHeader />
        <div className="plan-loading-state text-center" role="status" aria-label="Memuat event budget" aria-busy="true">
          <span className="sr-only">Memuat event budget…</span>
          <div className="w-8 h-8 mx-auto border-2 border-md3-outline-variant border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="plan-section-shell animate-bento-in">
        <SectionHeader />
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4" role="alert">
          <p className="text-sm font-semibold text-rose-800">Gagal memuat event budget</p>
          <p className="text-xs text-rose-700 mt-1">{error}</p>
          <button
            type="button"
            onClick={() => fetchEvents()}
            className="mt-3 min-h-11 min-w-11 text-xs font-bold px-3 py-1.5 rounded-xl text-white bg-rose-600 hover:bg-rose-700"
          >
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  // Item 7 — one shared section header: h2 1.45rem + one solid green 44px CTA.
  function SectionHeader() {
    return (
      <div className="plan-section-heading">
        <div className="plan-section-heading__title">
          <CalendarDays size={14} style={{ color: THEME.warning }} aria-hidden="true" />
          <h2>Event</h2>
          {activeEvents.length > 0 && (
            <span className="plan-section-heading__meta">{activeEvents.length} aktif</span>
          )}
        </div>
        <button
          onClick={() => setSetupState({ mode: "create" })}
          className="min-h-11 min-w-11 rounded-xl bg-sage-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-pop flex items-center gap-1 transition-colors hover:bg-sage-600 active:scale-95"
          aria-label="Buat event budget"
        >
          <Plus size={12} strokeWidth={3} aria-hidden="true" /> Buat Event
        </button>
      </div>
    )
  }

  return (
    <div className="plan-section-shell animate-bento-in">
      <SectionHeader />

      {events.length === 0 ? (
        <FeatureEducation
          className="plan-empty-state"
          title="Rencanakan event tanpa bocor"
          description="Pisahkan budget acara dari pengeluaran harian, supaya satu hajatan tidak menggerus tabungan."
          steps={[
            { icon: <Wallet size={16} aria-hidden="true" />, title: "Tentukan budget event", description: "Total dana yang boleh dipakai untuk acara ini." },
            { icon: <ClipboardList size={16} aria-hidden="true" />, title: "Daftar kebutuhan", description: "Rinci pos belanja: venue, konsumsi, transport." },
            { icon: <Receipt size={16} aria-hidden="true" />, title: "Catat saat belanja", description: "Setiap pengeluaran event tercatat terpisah." },
            { icon: <CalendarDays size={16} aria-hidden="true" />, title: "Pantau sisa", description: "Lihat sisa budget event secara real-time." },
          ]}
          example="Liburan akhir tahun — budget Rp 5.000.000, terpakai Rp 1.200.000, sisa Rp 3.800.000."
          action={
            <button
              onClick={() => setSetupState({ mode: "create" })}
              className="min-h-11 min-w-11 rounded-xl bg-sage-500 px-4 py-2 text-xs font-bold text-white shadow-pop transition-colors hover:bg-sage-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-200 focus-visible:ring-offset-2"
            >
              Buat event pertama
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
              <p className="text-[11px] font-bold text-md3-on-surface-variant mb-2">Selesai ({completedEvents.length})</p>
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
            <h3 className="text-base font-display font-bold text-md3-on-surface mb-1">Hapus event ini?</h3>
            <p className="text-sm text-md3-on-surface-variant mb-5"><strong>{confirmDelete.nama}</strong> akan dihapus. Transaksi terkait tidak akan terhapus.</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmDelete(null)} className="py-3 rounded-2xl font-bold text-md3-on-surface-variant bg-md3-surface active:scale-95 transition-transform">Batal</button>
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
            onUsageChange?.()
          }}
          proRegistrationOpen={proRegistrationOpen}
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
