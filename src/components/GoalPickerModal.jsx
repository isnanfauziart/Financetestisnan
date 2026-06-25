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

export default function GoalPickerModal({ open, onClose, onSaved, transactions }) {
  const { goals, loading, refetch } = useGoals()
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
            <div className="w-8 h-8 mx-auto border-2 border-earth-200 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pickableGoals.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles size={24} className="mx-auto text-earth-400 mb-3" />
            <p className="text-sm font-bold text-earth-700 mb-1">Belum ada goal aktif</p>
            <p className="text-xs text-earth-500 mb-4">Buat goal di tab Home untuk mulai menabung</p>
            <button onClick={onClose}
              className="text-xs font-bold px-4 py-2 rounded-full text-white mesh-violet shadow-pop">
              Tutup
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
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-earth-50 hover:bg-earth-100 transition-colors text-left active:scale-[0.98]">
                  <GoalProgressRing progress={pct} color={color} size={36} stroke={5} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-earth-800 truncate">{goal.nama}</p>
                    <p className="text-[10px] text-earth-500">{goal.kategori} · {formatRp(progress)} / {formatRp(goal.target)}</p>
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
        />
      )}
    </>
  )
}
