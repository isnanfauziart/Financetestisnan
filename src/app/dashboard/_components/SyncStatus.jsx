"use client"

import { useState } from "react"
import { CloudOff, Info } from "lucide-react"
import { THEME } from "./constants"
import Sheet from "./Sheet"

const SYNC_INFO = "Data keuangan tersimpan di Google Sheets milikmu. Artami hanya membaca dan memperbarui data sesuai tindakanmu."

export default function SyncStatus({
  lastSyncAt,
  refreshing,
  isOnline,
  onRefresh,
  getLastSyncAgo = () => null,
  now,
  haptics,
  hapticsEnabled = true,
}) {
  const [infoOpen, setInfoOpen] = useState(false)
  const hasSynced = Boolean(lastSyncAt)
  const relativeTime = hasSynced ? getLastSyncAgo(lastSyncAt, now) : null
  const statusText = refreshing
    ? "Menyinkronkan..."
    : !hasSynced
      ? "Belum tersinkron"
      : !isOnline
        ? `Offline - terakhir tersinkron ${relativeTime || "tidak diketahui"}`
        : `Tersinkron ke Google Sheets - ${relativeTime || "baru saja"}`

  function handleRefresh() {
    if (refreshing) return
    if (hapticsEnabled) haptics?.tap?.()
    onRefresh?.()
  }

  function handleInfoOpen() {
    if (hapticsEnabled) haptics?.tap?.()
    setInfoOpen(true)
  }

  const statusColor = refreshing
    ? THEME.primary
    : !hasSynced
      ? THEME.textTertiary
      : !isOnline
        ? THEME.warning
        : THEME.primary

  return (
    <>
      <div className="mt-1 flex items-center gap-1 text-[10px] font-bold tracking-wide text-earth-500">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Perbarui data"
          aria-busy={refreshing}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-1 text-left transition-colors hover:bg-earth-50 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
        >
           {hasSynced || refreshing ? (
             <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: statusColor }} aria-hidden="true" />
           ) : (
             <CloudOff size={14} strokeWidth={2} color={statusColor} aria-hidden="true" />
           )}
          <span aria-live="polite" className="truncate">{statusText}</span>
        </button>
        <button
          type="button"
          onClick={handleInfoOpen}
          aria-label="Info sinkronisasi"
          className="flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-xl text-earth-400 transition-colors hover:bg-earth-50 hover:text-earth-700 active:scale-[0.97]"
        >
          <Info size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

       <Sheet
         open={infoOpen}
         onClose={() => setInfoOpen(false)}
         title="Tentang sinkronisasi"
         size="sm"
         closeButtonClassName="min-h-11 min-w-11"
       >
        <p className="text-sm leading-relaxed text-earth-600">{SYNC_INFO}</p>
      </Sheet>
    </>
  )
}
