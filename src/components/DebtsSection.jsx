"use client"
import { useMemo, useState } from "react"
import { CreditCard, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"
import { useDebts } from "@/lib/useSharedData"
import DebtCard from "./DebtCard"
import DebtSetupModal from "./DebtSetupModal"
import DebtPaymentModal from "./DebtPaymentModal"
import ConfirmSheet from "@/app/dashboard/_components/ConfirmSheet"
import TransactionQuotaStatus from "./TransactionQuotaStatus"

export default function DebtsSection({ onToast, onUsageChange, transactionUsage }) {
  const { debts, loading, refetch } = useDebts()
  const [setupOpen, setSetupOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState(null)
  const [payDebt, setPayDebt] = useState(null)
  const [settleDebt, setSettleDebt] = useState(null)
  const [settling, setSettling] = useState(false)
  const [settlePaymentId, setSettlePaymentId] = useState(null)
  const [settleError, setSettleError] = useState(null)
  const [deleteDebt, setDeleteDebt] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const openDebts = useMemo(() => debts.filter(d => d.status === "open"), [debts])

  const summary = useMemo(() => {
    const utang = openDebts.filter(d => d.arah === "utang").reduce((s, d) => s + d.sisaSaldo, 0)
    const piutang = openDebts.filter(d => d.arah === "piutang").reduce((s, d) => s + d.sisaSaldo, 0)
    return { utang, piutang }
  }, [openDebts])

  const handleSaved = () => {
    setSetupOpen(false)
    setEditingDebt(null)
    setPayDebt(null)
    refetch()
    onUsageChange?.()
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("debts-changed"))
    }
  }

  const handleSettle = async () => {
    if (!settleDebt) return
    const paymentId = settlePaymentId || crypto.randomUUID()
    if (!settlePaymentId) setSettlePaymentId(paymentId)
    setSettling(true)
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pay",
          id: settleDebt.id,
          amount: settleDebt.sisaSaldo,
          paymentId,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setSettleError(result)
        setSettling(false)
        return
      }
      onToast(`${settleDebt.namaOrang} lunas! 🎉`, "success")
      setSettleDebt(null)
      setSettlePaymentId(null)
      handleSaved()
    } catch (err) {
      onToast(err.message, "error")
    }
    setSettling(false)
  }

  const handleDelete = async () => {
    if (!deleteDebt) return
    setDeleting(true)
    try {
      const res = await fetch("/api/debts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDebt.id }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Gagal menghapus utang")
      onToast("Utang/piutang dihapus", "success")
      setDeleteDebt(null)
      handleSaved()
    } catch (err) {
      onToast(err.message, "error")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in">
        <div className="shimmer-bg rounded-2xl h-24" aria-hidden="true" />
      </div>
    )
  }

  // Don't show section if no debts at all
  if (debts.length === 0 && !setupOpen) {
    return (
      <div className="mt-6 animate-bento-in">
        <button
          onClick={() => setSetupOpen(true)}
          className="w-full bento-tile bg-white border border-earth-100 p-4 shadow-warm active:scale-[0.99] transition-transform text-left"
          aria-label="Tambah utang atau piutang"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: THEME.expenseBg, color: THEME.expense }}>
                <CreditCard size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-earth-800">Utang Piutang</p>
                <p className="text-[10px] text-earth-500 mt-0.5">Lacak utang dan piutang kamu</p>
              </div>
            </div>
            <Plus size={14} className="text-earth-400" aria-hidden="true" />
          </div>
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-0.5">
          <div className="flex items-center gap-1.5">
            <CreditCard size={14} color={THEME.primary} aria-hidden="true" />
            <h3 className="text-sm font-bold font-display text-earth-800">Utang Piutang</h3>
          </div>
          <button
            onClick={() => setSetupOpen(true)}
            className="w-7 h-7 rounded-lg bg-violet-50 hover:bg-violet-100 flex items-center justify-center text-violet-600 transition-colors"
            aria-label="Tambah utang/piutang"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="rounded-2xl p-3 border" style={{ background: THEME.expenseBg, borderColor: THEME.expense + "20" }}>
            <div className="flex items-center gap-1 mb-0.5">
              <ArrowUpRight size={10} color={THEME.expense} aria-hidden="true" />
              <p className="text-[8px] font-bold uppercase tracking-wider text-earth-500">Utang (saya berutang)</p>
            </div>
            <p className="text-sm font-bold" style={{ color: THEME.expense }}>{formatRp(summary.utang)}</p>
          </div>
          <div className="rounded-2xl p-3 border" style={{ background: THEME.incomeBg, borderColor: THEME.income + "20" }}>
            <div className="flex items-center gap-1 mb-0.5">
              <ArrowDownRight size={10} color={THEME.income} aria-hidden="true" />
              <p className="text-[8px] font-bold uppercase tracking-wider text-earth-500">Piutang (mereka berutang)</p>
            </div>
            <p className="text-sm font-bold" style={{ color: THEME.income }}>{formatRp(summary.piutang)}</p>
          </div>
        </div>

        {/* Debt list */}
        {debts.length === 0 ? (
          <p className="text-[11px] text-earth-500 text-center py-2">Semua utang/piutang sudah lunas 🎉</p>
        ) : (
          <div className="space-y-2.5">
            {debts.map(d => (
              <DebtCard
                key={d.id}
                debt={d}
                onPay={setPayDebt}
                onSettle={debt => { setSettleDebt(debt); setSettlePaymentId(crypto.randomUUID()); setSettleError(null) }}
                onEdit={debt => { setEditingDebt(debt); setSetupOpen(true) }}
                onDelete={setDeleteDebt}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {setupOpen && (
        <DebtSetupModal
          debt={editingDebt}
          onClose={() => { setSetupOpen(false); setEditingDebt(null) }}
          onSaved={handleSaved}
        />
      )}

      {payDebt && (
        <DebtPaymentModal
          debt={payDebt}
          onClose={() => setPayDebt(null)}
          onSaved={handleSaved}
          onToast={onToast}
          transactionUsage={transactionUsage}
        />
      )}

      {settleDebt && (
        <ConfirmSheet
          title="Settle Lunas?"
          message={`${settleDebt.namaOrang} — ${formatRp(settleDebt.sisaSaldo)} akan ditandai lunas. Transaksi otomatis akan dibuat.`}
          confirmLabel="Settle Lunas"
          confirmColor={settleDebt.arah === "utang" ? THEME.expense : THEME.income}
          onConfirm={handleSettle}
          onClose={() => { if (!settling) { setSettleDebt(null); setSettleError(null) } }}
          confirming={settling}
        >
          <TransactionQuotaStatus usage={transactionUsage} error={settleError} />
        </ConfirmSheet>
      )}

      {deleteDebt && (
        <ConfirmSheet
          title="Hapus utang/piutang?"
          message={`${deleteDebt.namaOrang} akan dihapus permanen.`}
          confirmLabel="Hapus"
          confirmColor={THEME.danger}
          onConfirm={handleDelete}
          onClose={() => { if (!deleting) setDeleteDebt(null) }}
          confirming={deleting}
        />
      )}
    </>
  )
}
