"use client"
import { useEffect, useMemo, useState } from "react"
import { CheckSquare, RefreshCw, Square, X } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRpFull, formatRp } from "@/app/dashboard/_components/helpers"
import { savingsKindLabel } from "@/app/dashboard/_components/balanceCopy"
import { submitFinancialWrite, verifyFinancialOperation, WRITE_MESSAGES } from "@/lib/financialWriteClient"
import { reportWriteOutcome, useFinancialWriteGuard } from "@/lib/financialWriteState"

/**
 * Review screen for savings that predate the allocation model. Each Tabungan
 * row is either assigned to one explicit goal or released back into free money;
 * the endpoint applies the whole selection all-or-nothing, so any stale row
 * reloads the list instead of half-writing it.
 */
export default function SavingsReviewModal({ open, onClose, onSaved, onToast }) {
  const guard = useFinancialWriteGuard()
  const [allocations, setAllocations] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [selected, setSelected] = useState({})
  const [goalId, setGoalId] = useState("")
  const [goals, setGoals] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  // Wave 4: a grouped assign/release always shows a confirmation with the
  // selection count and total before anything is written.
  const [confirming, setConfirming] = useState(null)

  const loadAllocations = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch("/api/savings/allocations", { headers: { Accept: "application/json" } })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.error || "Gagal memuat daftar tabungan")
      setAllocations(data)
      setSelected({})
      setConfirming(null)
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    loadAllocations()
    let cancelled = false
    fetch("/api/goals", { headers: { Accept: "application/json" } })
      .then(res => res.json().catch(() => null))
      .then(data => {
        if (!cancelled && data?.success !== false && Array.isArray(data?.goals)) setGoals(data.goals)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open])

  const rows = useMemo(() => {
    return (allocations?.allocations || []).filter(allocation => !allocation.goalId && allocation.remaining > 0)
  }, [allocations])

  const selectedRows = useMemo(() => rows.filter(row => selected[row.rowIndex]), [rows, selected])
  const selectedTotal = useMemo(() => selectedRows.reduce((sum, row) => sum + (Number(row.remaining) || 0), 0), [selectedRows])
  const summary = allocations?.summary || {}

  const toggleRow = rowIndex => {
    setSelected(previous => ({ ...previous, [rowIndex]: !previous[rowIndex] }))
    setConfirming(null)
  }

  const handleSelectAll = () => {
    const allSelected = rows.length > 0 && selectedRows.length === rows.length
    const next = {}
    if (!allSelected) for (const row of rows) next[row.rowIndex] = true
    setSelected(next)
    setConfirming(null)
  }

  const handleRecheck = async () => {
    const verification = await verifyFinancialOperation(guard.unresolvedOperationId)
    if (verification.committed) {
      await loadAllocations()
      onToast?.("Perubahan ini sudah tersimpan ✓")
      return
    }
    if (verification.resolved) {
      onToast?.("Perubahan belum tersimpan. Kamu bisa coba lagi.", "error")
      return
    }
    onToast?.(WRITE_MESSAGES.unresolved, "error", null, { duration: null })
  }

  // First click on Alokasikan/Bebaskan: validate, then ask for confirmation.
  // The actual write happens only after the user confirms the grouped action.
  const requestConfirmation = action => {
    if (selectedRows.length === 0) return
    if (action === "assign" && !goalId) {
      setError("Target tabungan wajib dipilih")
      return
    }
    setError(null)
    setConfirming(action)
  }

  const handleSubmit = async () => {
    const action = confirming
    if (!action || selectedRows.length === 0) return
    if (action === "assign" && !goalId) {
      setConfirming(null)
      setError("Target tabungan wajib dipilih")
      return
    }
    setConfirming(null)
    setSubmitting(true)
    setError(null)
    const result = await submitFinancialWrite({
      url: "/api/savings/allocations",
      body: {
        action,
        goalId: action === "assign" ? goalId : undefined,
        selections: selectedRows.map(row => ({ rowIndex: row.rowIndex, fingerprint: row.fingerprint })),
      },
    })
    reportWriteOutcome(result)
    setSubmitting(false)
    if (!result.ok) {
      setError({ error: result.error, unresolved: result.outcome === "unresolved", operationId: result.operationId })
      // A stale selection means the sheet moved underneath us; reload so the
      // fingerprints the user sees are the ones the server will verify.
      if (result.code === "ALLOCATION_STALE") await loadAllocations({ silent: true })
      return
    }
    setSelected({})
    onToast?.(result.data?.message || "Tabungan diperbarui ✓")
    await loadAllocations({ silent: true })
    onSaved?.()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(42,32,24,0.5)", backdropFilter: "blur(8px)" }} onClick={submitting ? undefined : onClose}>
      <div className="glass-strong rounded-t-[32px] sm:rounded-[32px] w-full max-w-md shadow-pop-lg animate-slide-up flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <h3 className="text-base font-display font-bold text-md3-on-surface">Atur tabungan</h3>
            <p className="mt-0.5 text-[11px] text-md3-on-surface-variant">Tandai uang yang sudah disisihkan ke target, atau bebaskan kembali.</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Tutup" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-md3-surface-container-high text-md3-on-surface-variant">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {guard.blocked && (
          <p role="alert" className="mx-5 mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">{guard.message}</p>
        )}
        {guard.unresolvedOperationId && (
          <button type="button" onClick={handleRecheck} disabled={submitting} className="mx-5 mt-2 inline-flex min-h-9 items-center gap-2 self-start rounded-full bg-md3-surface-container-high px-3 text-[11px] font-bold text-md3-on-surface">
            <RefreshCw size={12} aria-hidden="true" /> Periksa lagi
          </button>
        )}

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-12" role="status" aria-label="Memuat tabungan" aria-busy="true">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-md3-outline-variant border-t-transparent" aria-hidden="true" />
          </div>
        ) : loadError ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm font-semibold text-rose-800">{loadError}</p>
            <button type="button" onClick={() => loadAllocations()} className="mt-3 min-h-11 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white">
              Coba lagi
            </button>
          </div>
        ) : (
          <>
            <div className="mx-5 mt-4 rounded-2xl bg-md3-surface-container-low px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-md3-on-surface-variant">
                <span>Tabungan tanpa target</span>
                <strong className="text-md3-on-surface">{formatRpFull(summary.unassignedTotal || 0)}</strong>
              </div>
              {summary.needsReviewCount > 0 && (
                <div className="mt-1 flex items-center justify-between gap-3 text-xs font-semibold text-md3-on-surface-variant">
                  <span>Perlu ditinjau</span>
                  <strong className="text-md3-on-surface">{formatRpFull(summary.needsReviewTotal || 0)}</strong>
                </div>
              )}
            </div>

            {rows.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-md3-on-surface-variant">
                Semua tabunganmu sudah punya tempat. Tidak ada yang perlu ditinjau. 🎉
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="mx-5 mt-3 inline-flex min-h-9 items-center gap-2 self-start rounded-full bg-md3-surface-container-high px-3 text-[11px] font-bold text-md3-on-surface"
                >
                  {selectedRows.length === rows.length ? <CheckSquare size={13} aria-hidden="true" /> : <Square size={13} aria-hidden="true" />}
                  {selectedRows.length === rows.length ? "Hapus pilihan" : "Pilih semua"}
                </button>

                <div className="mt-2 flex-1 space-y-1 overflow-y-auto px-5 pb-2">
                  {rows.map(row => (
                    <button
                      key={row.rowIndex}
                      type="button"
                      onClick={() => toggleRow(row.rowIndex)}
                      aria-pressed={Boolean(selected[row.rowIndex])}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${selected[row.rowIndex] ? "border-violet-300 bg-violet-50" : "border-md3-outline-variant bg-md3-surface-container-lowest"}`}
                    >
                      {selected[row.rowIndex]
                        ? <CheckSquare size={16} aria-hidden="true" className="flex-shrink-0 text-violet-600" />
                        : <Square size={16} aria-hidden="true" className="flex-shrink-0 text-md3-on-surface-variant" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-md3-on-surface">{row.desc || row.category}</span>
                        <span className="mt-0.5 block text-[10px] text-md3-on-surface-variant">
                          {row.category} · {savingsKindLabel(row.savingsKind)}
                        </span>
                      </span>
                      <span className="flex-shrink-0 text-sm font-bold tabular-nums text-md3-on-surface">{formatRpFull(row.remaining)}</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-md3-outline-variant px-5 py-4">
                  {selectedRows.length > 0 && (
                    <p className="mb-2 text-[11px] font-semibold text-md3-on-surface-variant">
                      {selectedRows.length} baris dipilih · {formatRp(selectedTotal)}
                    </p>
                  )}
                  {error && (
                    <p role="alert" className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{typeof error === "string" ? error : error.error}</p>
                  )}
                  <div className="mb-2">
                    <label htmlFor="savings-review-goal" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">Alokasikan ke target</label>
                    <select
                      id="savings-review-goal"
                      value={goalId}
                      onChange={event => setGoalId(event.target.value)}
                      className="w-full rounded-xl border border-md3-outline-variant bg-md3-surface px-3 py-2 text-sm font-semibold text-md3-on-surface"
                    >
                      <option value="">Pilih target…</option>
                      {goals.filter(goal => goal.status !== "settled").map(goal => (
                        <option key={goal.id} value={goal.id}>{goal.nama}</option>
                      ))}
                    </select>
                  </div>
                  {confirming && (
                    <div
                      role="alertdialog"
                      aria-label={confirming === "assign" ? "Konfirmasi alokasi tabungan" : "Konfirmasi pembebasan tabungan"}
                      className="mb-2 rounded-2xl border border-violet-200 bg-violet-50 p-3"
                    >
                      <p className="text-[11px] font-semibold leading-relaxed text-md3-on-surface">
                        {confirming === "assign"
                          ? `Alokasikan ${selectedRows.length} baris (total ${formatRpFull(selectedTotal)}) ke satu target?`
                          : `Bebaskan ${selectedRows.length} baris (total ${formatRpFull(selectedTotal)})? Uangnya langsung dihitung sebagai “Bisa dipakai sekarang”.`}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          disabled={submitting}
                          className="min-h-9 rounded-xl bg-md3-surface px-3 text-[11px] font-bold text-md3-on-surface active:scale-95 transition-transform disabled:opacity-50"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="min-h-9 rounded-xl px-3 text-[11px] font-bold text-white active:scale-95 transition-transform disabled:opacity-50"
                          style={{ background: THEME.primary }}
                        >
                          {submitting ? "Menyimpan…" : confirming === "assign" ? "Ya, alokasikan" : "Ya, bebaskan"}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => requestConfirmation("release")}
                      disabled={submitting || selectedRows.length === 0 || guard.blocked}
                      className="min-h-11 rounded-2xl bg-md3-surface px-4 py-2.5 text-sm font-bold text-md3-on-surface active:scale-95 transition-transform disabled:opacity-50"
                    >
                      Bebaskan
                    </button>
                    <button
                      type="button"
                      onClick={() => requestConfirmation("assign")}
                      disabled={submitting || selectedRows.length === 0 || guard.blocked}
                      className="min-h-11 rounded-2xl text-sm font-bold text-white active:scale-95 transition-transform disabled:opacity-50"
                      style={{ background: submitting || guard.blocked ? "#ccc" : THEME.primary }}
                    >
                      {submitting ? "Menyimpan…" : "Alokasikan"}
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-md3-on-surface-variant">
                    Uang yang dibebaskan langsung menambah “Bisa dipakai sekarang” di Beranda.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
