"use client"

import { useEffect, useState } from "react"
import { ExternalLink, FileSpreadsheet, RefreshCw } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { getLastSyncAgo } from "@/app/dashboard/_components/useDashboardCache"
import { getSyncStatusCopy } from "@/app/dashboard/_components/SyncStatus"
import { useFinancialWriteState, WRITE_BLOCK } from "@/lib/financialWriteState"

const GOOGLE_AUTH_DETAIL_MARKER = "Sesi Google berakhir"

const OWNERSHIP_COPY = [
  "Catatan keuanganmu tersimpan di Google Sheets milikmu sendiri di Google Drive. Artami hanya mengelola koneksi dan metadata produk — buku besimu tetap milikmu.",
  "Google Drive menyimpan salinan otomatis dari spreadsheet ini. Kamu juga bisa mengunduhnya kapan saja dari Google Sheets lewat menu File → Unduh.",
  "Menghapus data di perangkat ini, keluar dari akun, atau menghapus akun Artami tidak akan menghapus spreadsheet-mu. File tetap utuh di Google Drive milikmu.",
]

function statusColor(state) {
  switch (state) {
    case "failed":
    case "offline":
      return THEME.warning
    case "schema":
      return THEME.danger
    default:
      return THEME.primary
  }
}

export default function SheetsHubCard({ lastSyncAt, isOnline = true, onRefresh, refreshing = false }) {
  const writeState = useFinancialWriteState()
  const [connection, setConnection] = useState(null)

  useEffect(() => {
    let live = true
    fetch("/api/sheets/connection", { headers: { Accept: "application/json" } })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (live && data) setConnection(data)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const copy = getSyncStatusCopy({
    writeState,
    lastSyncAt,
    isOnline,
    relativeTime: lastSyncAt ? getLastSyncAgo(lastSyncAt) : null,
  })
  const color = statusColor(copy.state)
  const needsRecovery = Boolean(
    writeState.reason
    || copy.state === "offline"
    || connection?.needsLegacyReconnect
    || !connection?.connected
  )
  const isAuthExpired = writeState.reason === WRITE_BLOCK.stale
    && String(writeState.detail || "").includes(GOOGLE_AUTH_DETAIL_MARKER)

  return (
    <section className="w-full bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-5 shadow-warm space-y-4" aria-label="Google Sheets Anda">
      <div className="flex items-center justify-between border-b border-md3-outline-variant pb-3">
        <h3 className="text-sm font-bold tracking-wide text-md3-on-surface uppercase">Google Sheets Anda</h3>
        {connection?.connected && connection?.url && (
          <a
            href={connection.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold active:opacity-70"
            style={{ color: THEME.primary }}
          >
            <ExternalLink size={13} aria-hidden="true" /> Buka di Google Sheets
          </a>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: THEME.surfaceWarm, color: THEME.primary }}>
          <FileSpreadsheet size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-md3-on-surface truncate">
            {connection?.name || (connection?.connected ? "Spreadsheet terhubung" : "Belum ada spreadsheet terhubung")}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-md3-on-surface-variant">
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
            {copy.text}
          </p>
          {lastSyncAt && (
            <p className="mt-0.5 text-[11px] text-md3-on-surface-variant">
              Terakhir tersinkron {getLastSyncAgo(lastSyncAt) || "tidak diketahui"}
            </p>
          )}
        </div>
      </div>

      {needsRecovery && onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-md3-surface px-4 py-2.5 text-sm font-bold text-md3-on-surface transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <RefreshCw size={14} aria-hidden="true" className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Memeriksa pembaruan…" : "Coba lagi"}
        </button>
      )}

      {writeState.reason === WRITE_BLOCK.schemaConflict && (
        <div className="rounded-2xl bg-rose-50 p-3 text-[11px] leading-relaxed font-medium text-rose-800" role="note">
          <p className="font-bold">Struktur spreadsheet perlu ditinjau.</p>
          <p className="mt-1">{writeState.message || writeState.detail}</p>
          <p className="mt-1">Jangan hapus atau tukar kolom apa pun. Periksa judul kolom sesuai panduan, lalu tekan Coba lagi. Tidak ada data yang berubah dengan sendirinya.</p>
        </div>
      )}

      {isAuthExpired && (
        <div className="rounded-2xl bg-amber-50 p-3 text-[11px] leading-relaxed font-medium text-amber-800" role="note">
          <p className="font-bold">Sesi Google berakhir.</p>
          <p className="mt-1">Keluar dari Artami, lalu masuk kembali dengan akun Google yang sama untuk memperbarui izin. Data di spreadsheet-mu tidak terpengaruh.</p>
        </div>
      )}

      {connection?.needsLegacyReconnect && (
        <div className="rounded-2xl bg-md3-surface p-3 text-[11px] leading-relaxed font-medium text-md3-on-surface-variant" role="note">
          Hubungkan spreadsheet lama milikmu untuk melanjutkan. Pilih sekali saja, dan file itulah yang dipakai akun ini ke depannya.
        </div>
      )}

      <div className="space-y-2 border-t border-md3-outline-variant pt-3">
        {OWNERSHIP_COPY.map(line => (
          <p key={line.slice(0, 24)} className="text-[11px] leading-relaxed text-md3-on-surface-variant">{line}</p>
        ))}
      </div>
    </section>
  )
}
