"use client"
import { useState, useEffect, useCallback } from "react"
import { Plus, Receipt, AlertTriangle, Clock, CheckCircle, Power, Trash2 } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRpFull } from "@/app/dashboard/_components/helpers"
import EmptyState from "@/app/dashboard/_components/EmptyState"
import BillSetupModal from "./BillSetupModal"
import BillPayModal from "./BillPayModal"

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

export default function BillsSection({ onToast, refreshTrigger }) {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [setupState, setSetupState] = useState(null)
  const [payBill, setPayBill] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  const fetchBills = useCallback(async () => {
    try {
      const url = showInactive ? "/api/bills?all=true" : "/api/bills"
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal memuat tagihan")
      setBills(data.bills || [])
    } catch (err) {
      onToast?.(err.message, "error")
    } finally {
      setLoading(false)
    }
  }, [showInactive, onToast])

  useEffect(() => { fetchBills() }, [fetchBills])

  useEffect(() => {
    if (refreshTrigger > 0) fetchBills()
  }, [refreshTrigger, fetchBills])

  const handlePaySuccess = (result) => {
    setPayBill(null)
    onToast?.(`Tagihan dibayar! Transaksi ${result.transaction?.kategori} · ${formatRpFull(result.transaction?.jumlah)} dibuat ✓`)
    fetchBills()
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
      fetchBills()
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
      fetchBills()
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
          className="text-[11px] font-bold text-violet-600 flex items-center gap-1 hover:gap-2 transition-all"
          aria-label="Tambah tagihan baru"
        >
          <Plus size={12} strokeWidth={3} aria-hidden="true" /> Tambah
        </button>
      </div>

      {bills.length === 0 ? (
        <EmptyState
          icon={<Receipt size={20} />}
          title="Belum ada tagihan"
          hint="Tambah tagihan untuk mendapatkan pengingat otomatis saat jatuh tempo"
          action={
            <button
              onClick={() => setSetupState({ mode: "create" })}
              className="text-xs font-bold px-4 py-2 rounded-full text-white mesh-violet shadow-pop"
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
              return (
                <div
                  key={bill.id}
                  className="bento-tile bg-white border border-earth-100 shadow-warm p-3.5 rounded-2xl flex items-center gap-3 group"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: statusColor + "18", color: statusColor }}
                  >
                    <StatusIcon size={16} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
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
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: THEME.primary }}
                    >
                      <CheckCircle size={12} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(bill)}
                      aria-label={`Nonaktifkan ${bill.nama}`}
                      className="w-7 h-7 rounded-lg bg-earth-50 hover:bg-amber-100 flex items-center justify-center text-earth-600 hover:text-amber-600"
                    >
                      <Power size={10} />
                    </button>
                    <button
                      onClick={() => handleDelete(bill)}
                      aria-label={`Hapus ${bill.nama}`}
                      className="w-7 h-7 rounded-lg bg-earth-50 hover:bg-rose-100 flex items-center justify-center text-earth-600 hover:text-rose-500"
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
                className="flex items-center gap-1.5 text-[11px] font-bold text-earth-500 hover:text-earth-700 transition-colors mb-2"
              >
                {showInactive ? "▲" : "▼"} Nonaktif ({inactiveBills.length})
              </button>
              {showInactive && (
                <div className="space-y-2">
                  {inactiveBills.map(bill => (
                    <div
                      key={bill.id}
                      className="bento-tile bg-white/60 border border-earth-100 shadow-warm p-3.5 rounded-2xl flex items-center gap-3 opacity-60"
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-earth-100 text-earth-400">
                        <Receipt size={16} aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-earth-600 truncate">{bill.nama}</p>
                        <p className="text-[11px] text-earth-400">{FREQ_LABELS[bill.frekuensi]} · {bill.kategoriBill}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleActive(bill)}
                          className="w-7 h-7 rounded-lg bg-earth-50 hover:bg-green-100 flex items-center justify-center text-earth-600 hover:text-green-600"
                          aria-label={`Aktifkan ${bill.nama}`}
                        >
                          <Power size={10} />
                        </button>
                        <button
                          onClick={() => handleDelete(bill)}
                          className="w-7 h-7 rounded-lg bg-earth-50 hover:bg-rose-100 flex items-center justify-center text-earth-600 hover:text-rose-500"
                          aria-label={`Hapus ${bill.nama}`}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
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
              <button onClick={() => setConfirmDelete(null)} className="py-3 rounded-2xl font-bold text-earth-700 bg-earth-50 active:scale-95 transition-transform">
                Batal
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="py-3 rounded-2xl font-bold text-white active:scale-95 transition-transform"
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
          onSaved={() => {
            setSetupState(null)
            onToast?.(setupState.mode === "edit" ? "Tagihan diperbarui ✓" : "Tagihan dibuat ✓", "success")
            fetchBills()
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
        />
      )}
    </div>
  )
}
