"use client"
import { useState, useEffect, useCallback } from "react"
import { Plus, Receipt, AlertTriangle, Clock, CheckCircle, Power, Trash2 } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRpFull } from "@/app/dashboard/_components/helpers"
import { getBillVisual } from "@/lib/categoryIcons"
import BillSetupModal from "./BillSetupModal"
import BillPayModal from "./BillPayModal"
import FeatureEducation from "./FeatureEducation"

const STATUS_ICONS = {
  overdue: AlertTriangle,
  due_today: AlertTriangle,
  due_soon: Clock,
  upcoming: Clock,
}

const STATUS_COLORS = {
  overdue: THEME.danger,
  due_today: THEME.warning,
  due_soon: THEME.warning,
  upcoming: THEME.textTertiary,
}

const FREQ_LABELS = {
  weekly: "Mingguan",
  biweekly: "2 Minggu",
  monthly: "Bulanan",
  quarterly: "3 Bulan",
  yearly: "Tahunan",
}

export default function BillsSection({ onToast, refreshTrigger, onUsageChange, onBillsChanged, transactionUsage }) {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [setupState, setSetupState] = useState(null)
  const [payBill, setPayBill] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  const fetchBills = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/bills?all=true")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal memuat tagihan")
      setBills(data.bills || [])
    } catch (err) {
      const message = err.message || "Gagal memuat tagihan"
      setError(message)
      onToast?.(message, "error")
    } finally {
      setLoading(false)
    }
  }, [onToast])

  useEffect(() => { fetchBills() }, [fetchBills])

  useEffect(() => {
    if (refreshTrigger > 0) fetchBills()
  }, [refreshTrigger, fetchBills])

  const handlePaySuccess = async (result) => {
    setPayBill(null)
    onToast?.(`Tagihan dibayar! Transaksi ${result.transaction?.kategori} · ${formatRpFull(result.transaction?.jumlah)} dibuat ✓`)
    await fetchBills()
    await onBillsChanged?.()
    onUsageChange?.()
  }

  const handleToggleActive = async (bill) => {
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !bill.aktif }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal")
      }
      onToast?.(bill.aktif ? "Tagihan dinonaktifkan" : "Tagihan diaktifkan")
      await fetchBills()
      await onBillsChanged?.()
      onUsageChange?.()
    } catch (err) {
      onToast?.(err.message, "error")
    }
  }

  const handleDelete = async (bill) => {
    if (!confirmDelete || confirmDelete.id !== bill.id) {
      setConfirmDelete(bill)
      return
    }
    try {
      const res = await fetch(`/api/bills/${bill.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal menghapus")
      }
      setConfirmDelete(null)
      onToast?.("Tagihan dihapus", "success")
      await fetchBills()
      await onBillsChanged?.()
      onUsageChange?.()
    } catch (err) {
      onToast?.(err.message, "error")
    }
  }

  const activeBills = bills.filter(b => b.aktif)
  const inactiveBills = bills.filter(b => !b.aktif)
  const totalMonthly = activeBills
    .filter(b => b.tipe === "expense" && b.frekuensi === "monthly")
    .reduce((s, b) => s + b.jumlah, 0)

  if (loading) {
    return (
      <div className="mt-6 animate-bento-in">
        <div className="flex items-center gap-1.5 mb-3 px-1">
          <Receipt size={14} style={{ color: THEME.primary }} aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Tagihan</h3>
        </div>
        <div className="bento-tile bg-white border border-earth-100 p-6 shadow-warm text-center">
          <div className="w-8 h-8 mx-auto border-2 border-earth-200 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-6 animate-bento-in">
        <div className="flex items-center gap-1.5 mb-3 px-1">
          <Receipt size={14} style={{ color: THEME.primary }} aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Tagihan</h3>
        </div>
        <div className="bento-tile bg-rose-50 border border-rose-200 p-4 shadow-warm" role="alert">
          <p className="text-sm font-semibold text-rose-800">Gagal memuat tagihan</p>
          <p className="text-xs text-rose-700 mt-1">{error}</p>
          <button
            type="button"
            onClick={() => fetchBills()}
            className="mt-3 min-h-11 min-w-11 text-xs font-bold px-3 py-1.5 rounded-xl text-white bg-rose-600 hover:bg-rose-700"
          >
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 animate-bento-in">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <Receipt size={14} style={{ color: THEME.primary }} aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Tagihan</h3>
          {activeBills.length > 0 && (
            <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">
              {activeBills.length} aktif
            </span>
          )}
        </div>
        <button
          onClick={() => setSetupState({ mode: "create" })}
          className="min-h-11 min-w-11 rounded-xl px-2 text-[11px] font-bold text-sage-600 flex items-center gap-1 hover:gap-2 transition-[color,gap]"
          aria-label="Tambah tagihan baru"
        >
          <Plus size={12} strokeWidth={3} aria-hidden="true" /> Tambah Tagihan
        </button>
      </div>

      {bills.length === 0 ? (
        <FeatureEducation
          title="Jangan lewatkan tanggal penting"
          description="Simpan jadwal pembayaran supaya kamu tahu apa yang perlu disiapkan."
          steps={[
            { icon: <Receipt size={16} aria-hidden="true" />, title: "Tambah tagihan", description: "Masukkan tagihan rutinmu." },
            { icon: <Clock size={16} aria-hidden="true" />, title: "Tentukan tanggal bayar", description: "Tentukan kapan pembayaran perlu dilakukan." },
            { icon: <AlertTriangle size={16} aria-hidden="true" />, title: "Cek tagihan yang sudah dekat", description: "Lihat tagihan yang akan datang." },
            { icon: <CheckCircle size={16} aria-hidden="true" />, title: "Bayar, lalu catat", description: "Bayar lalu simpan transaksinya." },
          ]}
          example="Listrik / Internet / Cicilan"
          action={
            <button
              type="button"
              onClick={() => setSetupState({ mode: "create" })}
              className="min-h-11 min-w-11 rounded-xl bg-sage-500 px-4 py-2 text-xs font-bold text-white shadow-pop transition-colors hover:bg-sage-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-200 focus-visible:ring-offset-2"
            >
              Tambah Tagihan
            </button>
          }
        />
      ) : (
        <>
          {/* Total monthly */}
          {totalMonthly > 0 && (
            <div className="bento-tile bg-white border border-earth-100 shadow-warm p-3 mb-3 rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">Total Bulanan</span>
                <span className="text-sm font-bold" style={{ color: THEME.expense }}>
                  {formatRpFull(totalMonthly)}
                </span>
              </div>
            </div>
          )}

          {/* Active bills */}
          <div className="space-y-2">
            {activeBills.map(bill => {
              const StatusIcon = STATUS_ICONS[bill.status] || Clock
              const statusColor = STATUS_COLORS[bill.status] || THEME.textTertiary
              const { icon: BillIcon, tint } = getBillVisual(bill.kategoriBill)
              return (
                <div
                  key={bill.id}
                  className="bento-tile bg-white border border-earth-100 shadow-warm p-3.5 rounded-2xl flex items-center gap-3 group"
                >
                  <div
                    className="relative w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                    style={{ background: tint.bg, color: tint.color }}
                  >
                    <BillIcon size={16} strokeWidth={2.1} aria-hidden="true" />
                    <span
                      className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
                      style={{ background: statusColor, color: "white" }}
                    >
                      <StatusIcon size={10} strokeWidth={2.6} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-earth-800 truncate">{bill.nama}</p>
                      {bill.status === "overdue" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: THEME.dangerBg, color: THEME.danger }}>
                          {Math.abs(bill.daysUntilDue)}h lalu
                        </span>
                      )}
                      {bill.status === "due_today" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: THEME.warningBg, color: THEME.warning }}>
                          Hari ini
                        </span>
                      )}
                      {bill.status === "due_soon" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: THEME.warningBg, color: THEME.warning }}>
                          Besok
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-earth-500 mt-0.5">
                      {FREQ_LABELS[bill.frekuensi] || bill.frekuensi} · {bill.kategoriBill}
                      {bill.akunBank ? ` · ${bill.akunBank}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: bill.tipe === "income" ? THEME.income : THEME.expense }}>
                      {formatRpFull(bill.jumlah)}
                    </p>
                    <p className="text-[10px] text-earth-400">tgl {bill.tanggalJatuhTempo}</p>
                  </div>
                  <div className="flex flex-col gap-1 opacity-100 can-hover:opacity-0 can-hover:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setPayBill(bill)}
                      aria-label={`Bayar ${bill.nama}`}
                      className="min-h-11 min-w-11 rounded-xl flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: THEME.primary }}
                    >
                      <CheckCircle size={12} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(bill)}
                      aria-label={`Nonaktifkan ${bill.nama}`}
                      className="min-h-11 min-w-11 rounded-xl bg-earth-50 hover:bg-amber-100 flex items-center justify-center text-earth-600 hover:text-amber-600 transition-colors"
                    >
                      <Power size={10} />
                    </button>
                    <button
                      onClick={() => handleDelete(bill)}
                      aria-label={`Hapus ${bill.nama}`}
                      className="min-h-11 min-w-11 rounded-xl bg-earth-50 hover:bg-rose-100 flex items-center justify-center text-earth-600 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Inactive bills */}
          {inactiveBills.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="min-h-11 min-w-11 flex items-center gap-1.5 text-[11px] font-bold text-earth-500 hover:text-earth-700 transition-colors mb-2"
              >
                {showInactive ? "▲" : "▼"} Nonaktif ({inactiveBills.length})
              </button>
              {showInactive && (
                <div className="space-y-2">
                  {inactiveBills.map(bill => {
                    const { icon: BillIcon, tint } = getBillVisual(bill.kategoriBill)
                    return (
                      <div
                        key={bill.id}
                        className="bento-tile bg-white/60 border border-earth-100 shadow-warm p-3.5 rounded-2xl flex items-center gap-3 opacity-60"
                      >
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/70" style={{ background: tint.bg, color: tint.color }}>
                          <BillIcon size={16} strokeWidth={2.1} aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-earth-600 truncate">{bill.nama}</p>
                          <p className="text-[11px] text-earth-400">{FREQ_LABELS[bill.frekuensi]} · {bill.kategoriBill}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleToggleActive(bill)}
                            className="min-h-11 min-w-11 rounded-xl bg-earth-50 hover:bg-green-100 flex items-center justify-center text-earth-600 hover:text-green-600 transition-colors"
                            aria-label={`Aktifkan ${bill.nama}`}
                          >
                            <Power size={10} />
                          </button>
                          <button
                            onClick={() => handleDelete(bill)}
                            className="min-h-11 min-w-11 rounded-xl bg-earth-50 hover:bg-rose-100 flex items-center justify-center text-earth-600 hover:text-rose-500 transition-colors"
                            aria-label={`Hapus ${bill.nama}`}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(42,32,24,0.5)", backdropFilter: "blur(8px)" }} onClick={() => setConfirmDelete(null)}>
          <div className="glass-strong rounded-t-[32px] sm:rounded-[32px] p-6 shadow-pop-lg w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-display font-bold text-earth-800 mb-1">Hapus tagihan ini?</h3>
            <p className="text-sm text-earth-600 mb-5">
              <strong>{confirmDelete.nama}</strong> akan dihapus permanen.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmDelete(null)} className="min-h-11 min-w-11 py-3 rounded-2xl font-bold text-earth-700 bg-earth-50 active:scale-95 transition-transform">
                Batal
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="min-h-11 min-w-11 py-3 rounded-2xl font-bold text-white active:scale-95 transition-transform"
                style={{ background: THEME.danger }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup modal */}
      {setupState && (
        <BillSetupModal
          bill={setupState.goal}
          onClose={() => setSetupState(null)}
          onSaved={async () => {
            setSetupState(null)
            onToast?.(setupState.mode === "edit" ? "Tagihan diperbarui ✓" : "Tagihan dibuat ✓", "success")
            await fetchBills()
            await onBillsChanged?.()
            onUsageChange?.()
          }}
        />
      )}

      {/* Pay modal */}
      {payBill && (
        <BillPayModal
          bill={payBill}
          onClose={() => setPayBill(null)}
          onPaid={handlePaySuccess}
          onEdit={(bill) => {
            setPayBill(null)
            setSetupState({ mode: "edit", goal: bill })
          }}
          transactionUsage={transactionUsage}
        />
      )}
    </div>
  )
}
