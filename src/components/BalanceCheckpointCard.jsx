"use client"
import { useState } from "react"
import { Wallet, RefreshCw, AlertTriangle } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRpFull, formatInputRupiah } from "@/app/dashboard/_components/helpers"
import { submitFinancialWrite, verifyFinancialOperation, WRITE_MESSAGES } from "@/lib/financialWriteClient"
import { reportWriteOutcome, useFinancialWriteGuard } from "@/lib/financialWriteState"

function formatRecordedAt(value) {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return parsed.toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/**
 * `Total saldo saat ini` is the one balance the user states themselves: the
 * combined bank, e-wallet, and cash amount at the moment it is saved. Saving it
 * mints a new checkpoint id, so later rows are counted exactly once.
 */
export default function BalanceCheckpointCard({ data, onRefresh, onToast, header = true }) {
  const guard = useFinancialWriteGuard()
  const currentCash = data?.balances?.currentCash
  const [editing, setEditing] = useState(false)
  const [rawAmount, setRawAmount] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const saved = currentCash && !currentCash.provisional
  const basisLabel = saved ? "Berdasarkan Total saldo saat ini" : "Berdasarkan data terakhir"
  const displayed = saved ? currentCash.value : (currentCash?.value ?? data?.balances?.recordedBalance ?? 0)
  const recordedLabel = formatRecordedAt(currentCash?.recordedAt)

  const startEdit = () => {
    setRawAmount(formatInputRupiah(String(Math.round(Number(displayed) || 0))))
    setError(null)
    setEditing(true)
  }

  const handleSave = async () => {
    const amount = Number(String(rawAmount).replace(/\./g, ""))
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Masukkan jumlah yang valid")
      return
    }
    setSaving(true)
    setError(null)
    const result = await submitFinancialWrite({ url: "/api/balance-checkpoint", body: { amount } })
    reportWriteOutcome(result)
    setSaving(false)
    if (!result.ok) {
      setError({ error: result.error, code: result.code, unresolved: result.outcome === "unresolved", operationId: result.operationId })
      onToast?.(result.error || "Gagal menyimpan", "error", null, result.outcome === "unresolved" ? { duration: null } : undefined)
      return
    }
    setEditing(false)
    onToast?.("Total saldo saat ini tersimpan ✓")
    onRefresh?.()
  }

  const handleRecheck = async () => {
    const operationId = guard.unresolvedOperationId
    setSaving(true)
    const verification = await verifyFinancialOperation(operationId)
    setSaving(false)
    if (verification.committed) {
      await onRefresh?.()
      onToast?.("Perubahan ini sudah tersimpan ✓")
      return
    }
    if (verification.resolved) {
      onToast?.("Perubahan belum tersimpan. Kamu bisa coba lagi.", "error")
      return
    }
    setError({ error: WRITE_MESSAGES.unresolved, unresolved: true, operationId })
    onToast?.(WRITE_MESSAGES.unresolved, "error", null, { duration: null })
  }

  const blockedMessage = guard.message
  const unresolved = guard.unresolvedOperationId

  return (
    <div className="space-y-3">
      {header && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-wide text-md3-on-surface uppercase">Total saldo saat ini</h3>
          <Wallet size={14} aria-hidden="true" className="text-md3-on-surface-variant" />
        </div>
      )}

      <p className="text-xs leading-relaxed text-md3-on-surface-variant">
        Gabungan saldo bank, e-wallet, dan uang tunai saat kamu menyimpan. Setelah disimpan, transaksi berikutnya dihitung dari angka ini.
      </p>

      {editing ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-md3-on-surface-variant">Jumlah</span>
            <button onClick={() => setEditing(false)} className="text-xs font-semibold text-md3-on-surface-variant">Batal</button>
          </div>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Total saldo saat ini"
            placeholder="0"
            value={rawAmount}
            onChange={event => setRawAmount(formatInputRupiah(event.target.value))}
            className="field-outlined w-full px-3 py-2 text-sm font-semibold"
            autoFocus
          />
          <p className="text-[11px] text-md3-on-surface-variant">
            Masukkan Rp0 bila memang tidak ada saldo tersisa — angka 0 tetap tersimpan sebagai saldo yang sudah dikonfirmasi.
          </p>
          <button
            onClick={handleSave}
            disabled={saving || guard.blocked}
            className="w-full min-h-11 py-2.5 rounded-xl text-sm font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
            style={{ background: saving || guard.blocked ? "#ccc" : THEME.primary }}
          >
            {saving ? "Menyimpan..." : "Simpan total saldo"}
          </button>
        </div>
      ) : (
        <button
          onClick={startEdit}
          disabled={guard.blocked}
          className="w-full min-h-11 text-left disabled:opacity-60"
          aria-label="Ubah total saldo saat ini"
        >
          <span className="block text-2xl font-display font-bold tabular-nums text-md3-on-surface">{formatRpFull(displayed)}</span>
          <span className="mt-1 block text-[11px] font-semibold text-md3-on-surface-variant">{basisLabel}</span>
          {saved && recordedLabel && <span className="mt-0.5 block text-[10px] text-md3-on-surface-variant">Disimpan {recordedLabel}</span>}
        </button>
      )}

      {blockedMessage && (
        <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          {blockedMessage}
        </p>
      )}

      {unresolved && (
        <button
          onClick={handleRecheck}
          disabled={saving}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-md3-surface-container-high px-4 text-xs font-bold text-md3-on-surface disabled:opacity-50"
        >
          <RefreshCw size={13} aria-hidden="true" /> Periksa lagi
        </button>
      )}

      {error?.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
          <AlertTriangle size={13} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
          <span>{error.error}</span>
        </p>
      )}

      {data?.balances?.rincian?.estimate && (
        <p className="text-[11px] text-md3-on-surface-variant">
          Angka ini perkiraan karena ada tabungan lama yang klasifikasinya belum jelas.
        </p>
      )}
    </div>
  )
}
