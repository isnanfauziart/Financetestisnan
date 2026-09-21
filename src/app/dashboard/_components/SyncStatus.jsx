"use client"

import { AlertTriangle, CloudOff } from "lucide-react"
import { THEME } from "./constants"
import { WRITE_BLOCK, WRITE_BLOCK_MESSAGES, useFinancialWriteState } from "@/lib/financialWriteState"

const FAILED_PREFIX = "Pembaruan data gagal"
const FAILED_HINT = "Menampilkan data terakhir yang berhasil disinkronkan"
const OFFLINE_LABEL = "Anda sedang offline"

export function getSyncStatusCopy({ writeState, lastSyncAt, isOnline, relativeTime }) {
  const hasSynced = Boolean(lastSyncAt)
  const ago = relativeTime || "tidak diketahui"

  if (writeState.reason === WRITE_BLOCK.schemaConflict) {
    return { text: writeState.message || WRITE_BLOCK_MESSAGES[writeState.reason], state: "schema" }
  }
  if (!isOnline) {
    return {
      text: hasSynced
        ? `${OFFLINE_LABEL} — Menampilkan data terakhir yang tersimpan di perangkat ini (${ago})`
        : OFFLINE_LABEL,
      state: "offline",
    }
  }
  if (writeState.reason === WRITE_BLOCK.pending) {
    return { text: "Memuat data terbaru…", state: "pending" }
  }
  if (writeState.reason === WRITE_BLOCK.stale || writeState.reason === WRITE_BLOCK.unresolved) {
    return {
      text: hasSynced
        ? `${FAILED_PREFIX} — ${FAILED_HINT} ${ago}`
        : `${FAILED_PREFIX} — Menampilkan data terakhir yang tersimpan di perangkat ini`,
      state: "failed",
    }
  }
  if (hasSynced) {
    return { text: `Tersinkron ke Google Sheets - ${relativeTime || "baru saja"}`, state: "synced" }
  }
  return { text: "Belum tersinkron", state: "unsynced" }
}

function stateColor(state, refreshing) {
  if (refreshing) return THEME.primary
  switch (state) {
    case "failed":
    case "offline":
      return THEME.warning
    case "schema":
      return THEME.danger
    case "synced":
    case "pending":
      return THEME.primary
    default:
      return THEME.textTertiary
  }
}

export default function SyncStatus({
  lastSyncAt,
  refreshing,
  isOnline,
  checkingRefresh = false,
  onRefresh,
  getLastSyncAgo = () => null,
  now,
  haptics,
  hapticsEnabled = true,
  writeState: writeStateProp,
}) {
  const writeStateFromStore = useFinancialWriteState()
  const writeState = writeStateProp || writeStateFromStore

  const relativeTime = lastSyncAt ? getLastSyncAgo(lastSyncAt, now) : null
  const copy = getSyncStatusCopy({ writeState, lastSyncAt, isOnline, relativeTime })
  const statusText = refreshing
    ? checkingRefresh
      ? "Memeriksa pembaruan…"
      : "Menyinkronkan..."
    : copy.text
  const color = stateColor(copy.state, refreshing)
  const isFailed = copy.state === "failed"

  function handleRefresh() {
    if (refreshing) return
    if (hapticsEnabled) haptics?.tap?.()
    onRefresh?.()
  }

  return (
    <div className="mt-1 flex items-center gap-1 text-[10px] font-bold tracking-wide text-md3-on-surface-variant">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        aria-label={isFailed ? "Coba lagi" : "Perbarui data"}
        aria-busy={refreshing}
        aria-live="polite"
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-1 text-left transition-colors hover:bg-md3-surface active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
      >
        {copy.state === "schema" ? (
          <AlertTriangle size={14} strokeWidth={2} color={color} aria-hidden="true" className="flex-shrink-0" />
        ) : lastSyncAt || refreshing ? (
          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        ) : (
          <CloudOff size={14} strokeWidth={2} color={color} aria-hidden="true" />
        )}
        <span className="truncate">{statusText}</span>
      </button>
    </div>
  )
}
