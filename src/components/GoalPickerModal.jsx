"use client"
import { useState, useMemo } from "react"
import { Target, Sparkles, ArrowRight } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"
import { computeAllGoalProgress } from "@/app/dashboard/_components/goalUtils"
import { useGoals } from "@/lib/useSharedData"
import Sheet from "@/app/dashboard/_components/Sheet"
import GoalContributeModal from "./GoalContributeModal"
import GoalProgressRing from "./GoalProgressRing"

export default function GoalPickerModal({ open, onClose, onSaved, onOpenGoals, transactions, transactionUsage, proRegistrationOpen = true }) {
  const { goals, loading, error, refetch } = useGoals()
  const [selectedGoal, setSelectedGoal] = useState(null)

  const progressMap = useMemo(() => computeAllGoalProgress(goals, transactions), [goals, transactions])

  const pickableGoals = useMemo(() => {
    return goals.filter(g => {
      if (g.status === "settled") return false
      const progress = progressMap[g.id] || 0
      if (g.target > 0 && progress >= g.target) return false
      return true
    })
  }, [goals, progressMap])

  if (!open) return null

  return (
    <>
      <Sheet open={open && !selectedGoal} onClose={onClose}
        title="Pilih Goal" subtitle="Kontribusi Tabungan"
        size="md" maxHeight="80vh">
        {loading ? (
          <div className="py-8 text-center">
            <div className="w-8 h-8 mx-auto border-2 border-md3-outline-variant border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-6" role="alert">
            <Sparkles size={24} className="mx-auto text-rose-400 mb-3" />
            <p className="text-sm font-bold text-rose-800 mb-1">Gagal memuat goal</p>
            <p className="text-xs text-rose-700 mb-4">{error}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs font-bold px-4 py-2 rounded-full text-white bg-rose-600 hover:bg-rose-700"
            >
              Coba lagi
            </button>
          </div>
        ) : pickableGoals.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles size={24} className="mx-auto text-earth-400 mb-3" />
            <p className="text-sm font-bold text-md3-on-surface-variant mb-1">Belum ada goal aktif</p>
            <p className="text-xs text-md3-on-surface-variant mb-4">Buat goal di Rencana untuk mulai menabung.</p>
            <button type="button" onClick={() => {
              onClose?.()
              onOpenGoals?.()
            }} aria-label="Buat Goal"
              className="text-xs font-bold px-4 py-2 rounded-full text-white mesh-violet shadow-pop">
              Buat Goal
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {pickableGoals.map(goal => {
              const progress = progressMap[goal.id] || 0
              const pct = goal.target > 0 ? (progress / goal.target) * 100 : 0
              const color = goal.color || THEME.savings
              return (
                <button key={goal.id}
                  onClick={() => setSelectedGoal(goal)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-md3-surface hover:bg-md3-surface-container-high transition-colors text-left active:scale-[0.98]">
                  <GoalProgressRing progress={pct} color={color} size={36} stroke={5} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-md3-on-surface truncate">{goal.nama}</p>
                    <p className="text-[10px] text-md3-on-surface-variant">{goal.kategori} · {formatRp(progress)} / {formatRp(goal.target)}</p>
                  </div>
                  <ArrowRight size={14} className="text-earth-400 flex-shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </Sheet>

      {selectedGoal && (
        <GoalContributeModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onSaved={() => {
            setSelectedGoal(null)
            onSaved?.()
          }}
          transactionUsage={transactionUsage}
          proRegistrationOpen={proRegistrationOpen}
        />
      )}
    </>
  )
}
