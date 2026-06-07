"use client"
import { useState, useEffect, useMemo } from "react"
import { Plus, Target, Sparkles } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import EmptyState from "@/app/dashboard/_components/EmptyState"
import { computeAllGoalProgress } from "@/app/dashboard/_components/goalUtils"
import GoalCard from "./GoalCard"
import GoalSetupModal from "./GoalSetupModal"
import GoalContributeModal from "./GoalContributeModal"

export default function GoalsSection({ transactions, onToast, refreshTrigger }) {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [setupState, setSetupState] = useState(null)
  const [contributeGoal, setContributeGoal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchGoals = async () => {
    try {
      const res = await fetch("/api/goals")
      const data = await res.json()
      if (res.ok) {
        setGoals(data.goals || [])
      } else if (data.error) {
        onToast && onToast(data.error, "error")
      }
    } catch (err) {
      onToast && onToast(err.message, "error")
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchGoals()
  }, [refreshTrigger])

  const progressByGoal = useMemo(() => {
    return computeAllGoalProgress(goals, transactions)
  }, [goals, transactions])

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
      fetchGoals()
    } catch (err) {
      onToast && onToast(err.message, "error")
    }
  }

  if (loading) {
    return (
      <div className="mt-6 animate-bento-in">
        <div className="flex items-center gap-1.5 mb-3 px-1">
          <Target size={14} className="text-moss-500" aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Goals</h3>
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
          <Target size={14} className="text-moss-500" aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Goals</h3>
          {goals.length > 0 && (
            <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">
              {goals.length} aktif
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              progress={progressByGoal[goal.id] || 0}
              onContribute={() => setContributeGoal(goal)}
              onEdit={() => setSetupState({ mode: "edit", goal })}
              onDelete={() => handleDelete(goal)}
            />
          ))}
        </div>
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
            fetchGoals()
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
            fetchGoals()
          }}
        />
      )}
    </div>
  )
}
