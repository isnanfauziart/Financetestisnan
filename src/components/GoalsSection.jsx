"use client"
import { useState, useEffect, useMemo } from "react"
import { Plus, Target, Sparkles, ChevronDown, ChevronRight } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import EmptyState from "@/app/dashboard/_components/EmptyState"
import { computeAllGoalProgress } from "@/app/dashboard/_components/goalUtils"
import { formatRpFull } from "@/app/dashboard/_components/helpers"
import { useGoals } from "@/lib/useSharedData"
import GoalCard from "./GoalCard"
import GoalSetupModal from "./GoalSetupModal"
import GoalContributeModal from "./GoalContributeModal"
import GoalSettleModal from "./GoalSettleModal"

export default function GoalsSection({ data, transactions, onToast, refreshTrigger, onUsageChange, transactionUsage }) {
  const { goals, loading, error, refetch } = useGoals()
  const [setupState, setSetupState] = useState(null)
  const [contributeGoal, setContributeGoal] = useState(null)
  const [settleGoal, setSettleGoal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [completedExpanded, setCompletedExpanded] = useState(false)

  // Re-fetch when parent signals a savings transaction was added
  useEffect(() => {
    if (refreshTrigger > 0) refetch()
  }, [refreshTrigger, refetch])

  // Toast errors from the shared hook
  useEffect(() => {
    if (error) onToast?.(error, "error")
  }, [error, onToast])

  const progressByGoal = useMemo(() => {
    return computeAllGoalProgress(goals, transactions)
  }, [goals, transactions])

  const netWorth = Number.isFinite(Number(data?.netWorth)) ? Number(data.netWorth) : 0
  const allocatedSavings = useMemo(() => {
    return Object.values(progressByGoal).reduce((total, progress) => total + (Number(progress) || 0), 0)
  }, [progressByGoal])
  const availableSavings = Math.max(0, netWorth - allocatedSavings)

  const activeGoals = useMemo(() => {
    return goals.filter(g => g.status !== "settled")
  }, [goals])

  const completedGoals = useMemo(() => {
    return goals.filter(g => g.status === "settled")
  }, [goals])

  const handleDelete = async (goal) => {
    if (!confirmDelete || confirmDelete.id !== goal.id) {
      setConfirmDelete(goal)
      return
    }
    try {
      const res = await fetch("/api/goals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: goal.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menghapus")
      setConfirmDelete(null)
      onToast && onToast("Goal dihapus", "success")
      refetch()
      onUsageChange?.()
    } catch (err) {
      onToast && onToast(err.message, "error")
    }
  }

  const handleSettled = () => {
    setSettleGoal(null)
    onToast && onToast("Goal ditandai terealisasi ✓", "success")
    refetch()
    onUsageChange?.()
  }

  if (loading) {
    return (
      <div className="mt-6 animate-bento-in">
        <div className="flex items-center gap-1.5 mb-3 px-1">
          <Target size={14} className="text-moss-500" aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Kantong &amp; Target</h3>
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
          <Target size={14} className="text-moss-500" aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Kantong &amp; Target</h3>
        </div>
        <div className="bento-tile bg-rose-50 border border-rose-200 p-4 shadow-warm" role="alert">
          <p className="text-sm font-semibold text-rose-800">Gagal memuat goals</p>
          <p className="text-xs text-rose-700 mt-1">{error}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 text-xs font-bold px-3 py-1.5 rounded-full text-white bg-rose-600 hover:bg-rose-700"
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
          <Target size={14} className="text-moss-500" aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Kantong &amp; Target</h3>
          {activeGoals.length > 0 && (
            <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">
              {activeGoals.length} aktif
            </span>
          )}
        </div>
        <button
          onClick={() => setSetupState({ mode: "create" })}
          className="text-[11px] font-bold text-violet-600 flex items-center gap-1 hover:gap-2 transition-all"
          aria-label="Add new goal"
        >
          <Plus size={12} strokeWidth={3} aria-hidden="true" /> Tambah
        </button>
      </div>

      <section className="bento-tile-dark mesh-hero text-white p-5 sm:p-6 shadow-pop" aria-label="Ringkasan tabungan">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">Total Tabungan</p>
        <p className="mt-2 text-3xl sm:text-4xl font-display font-bold tracking-tight break-words">{formatRpFull(netWorth)}</p>
        <p className="mt-1 text-[11px] font-semibold text-white/75">Sama dengan Kekayaan Bersih di Beranda</p>
        <div className="mt-4 rounded-2xl px-4 py-3 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.12)" }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-white/80">Tersedia untuk dibagi</span>
            <strong className="text-sm font-bold text-white">{formatRpFull(availableSavings)}</strong>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-white/75">
          Total tabungan diperoleh dari surplus antara pemasukan dikurangi pengeluaran kamu tiap bulan
        </p>
      </section>

      {goals.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={20} />}
          title="Belum ada goals"
          hint="Tambah goal pertama kamu — misal Dana Darurat, Liburan, atau DP Rumah. Transaksi Tabungan otomatis terhitung."
          action={
            <button
              onClick={() => setSetupState({ mode: "create" })}
              className="text-xs font-bold px-4 py-2 rounded-full text-white mesh-violet shadow-pop"
            >
              Buat Goal
            </button>
          }
        />
      ) : (
        <>
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeGoals.map(goal => {
                const progress = progressByGoal[goal.id] || 0
                const pct = goal.target > 0 ? (progress / goal.target) * 100 : 0
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    progress={progress}
                    onContribute={() => setContributeGoal(goal)}
                    onEdit={() => setSetupState({ mode: "edit", goal })}
                    onDelete={() => handleDelete(goal)}
                    onSettle={pct >= 100 ? () => setSettleGoal(goal) : undefined}
                  />
                )
              })}
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setCompletedExpanded(!completedExpanded)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-earth-500 hover:text-earth-700 transition-colors mb-2"
              >
                {completedExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                Completed ({completedGoals.length})
              </button>
              {completedExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {completedGoals.map(goal => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      progress={progressByGoal[goal.id] || 0}
                      onEdit={() => setSetupState({ mode: "edit", goal })}
                      onDelete={() => handleDelete(goal)}
                      isCompleted
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(42,32,24,0.5)", backdropFilter: "blur(8px)" }} onClick={() => setConfirmDelete(null)}>
          <div className="glass-strong rounded-t-[32px] sm:rounded-[32px] p-6 shadow-pop-lg w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-display font-bold text-earth-800 mb-1">Hapus goal ini?</h3>
            <p className="text-sm text-earth-600 mb-5">
              <strong>{confirmDelete.nama}</strong> akan dihapus. Transaksi Tabungan terkait tidak akan terhapus, hanya goal-nya saja.
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

      {setupState && (
        <GoalSetupModal
          goal={setupState.goal}
          onClose={() => setSetupState(null)}
          onSaved={() => {
            setSetupState(null)
            onToast && onToast(setupState.mode === "edit" ? "Goal diperbarui ✓" : "Goal dibuat ✓", "success")
            refetch()
            onUsageChange?.()
          }}
        />
      )}

      {contributeGoal && (
        <GoalContributeModal
          goal={contributeGoal}
          onClose={() => setContributeGoal(null)}
          onSaved={() => {
            setContributeGoal(null)
            onToast && onToast("Kontribusi disimpan ✓", "success")
            refetch()
            onUsageChange?.()
          }}
          transactionUsage={transactionUsage}
        />
      )}

      {settleGoal && (
        <GoalSettleModal
          goal={settleGoal}
          progress={progressByGoal[settleGoal.id] || 0}
          onClose={() => setSettleGoal(null)}
          onSettled={handleSettled}
        />
      )}
    </div>
  )
}
