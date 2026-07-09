"use client"
import { useState, useMemo } from "react"
import { Calculator, ChevronRight, Sparkles, Clock, TrendingUp } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { formatRp, formatRpFull, formatInputRupiah } from "@/app/dashboard/_components/helpers"
import { computeGoalProgress } from "@/app/dashboard/_components/goalUtils"
import { useGoals } from "@/lib/useSharedData"
import SelectField from "@/app/dashboard/_components/SelectField"
import Sheet from "@/app/dashboard/_components/Sheet"

function formatDaysSaved(days) {
  if (!days || days <= 0) return null
  const months = Math.floor(days / 30.44)
  const remaining = Math.round(days % 30.44)
  if (months === 0) return `${remaining} hari`
  if (remaining === 0) return `${months} bulan`
  return `${months} bulan ${remaining} hari`
}

function formatDateFromDays(now, totalDays) {
  const d = new Date(now.getTime() + totalDays * 86400000)
  if (d > new Date(now.getFullYear() + 10, 0, 1)) return "Sangat lama"
  return `${AVAILABLE_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default function WhatIfModal({ open, onClose, transactions }) {
  const { goals } = useGoals()
  const [selectedCategory, setSelectedCategory] = useState("")
  const [rawReduction, setRawReduction] = useState("")
  const [rawIncomeIncrease, setRawIncomeIncrease] = useState("")
  const [selectedGoalId, setSelectedGoalId] = useState("")

  const expenseCategories = useMemo(() => {
    if (!transactions) return []
    const map = {}
    transactions.filter(t => t.type === "expense").forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
  }, [transactions])

  const categoryAvg = useMemo(() => {
    if (!selectedCategory || !transactions) return 0
    const monthMap = {}
    transactions.filter(t => t.type === "expense" && t.category === selectedCategory).forEach(t => {
      const k = `${t.month} ${t.year}`
      monthMap[k] = (monthMap[k] || 0) + t.amount
    })
    const values = Object.values(monthMap)
    if (values.length === 0) return 0
    return Math.round(values.reduce((s, v) => s + v, 0) / values.length)
  }, [selectedCategory, transactions])

  const targetCategorySpend = useMemo(() => {
    const num = parseFloat(String(rawReduction).replace(/\./g, ""))
    return isNaN(num) || num <= 0 ? 0 : num
  }, [rawReduction])

  const categorySavings = useMemo(() => {
    if (!selectedCategory || categoryAvg <= 0 || targetCategorySpend <= 0) return 0
    return Math.max(0, categoryAvg - targetCategorySpend)
  }, [selectedCategory, categoryAvg, targetCategorySpend])

  const incomeIncrease = useMemo(() => {
    const num = parseFloat(String(rawIncomeIncrease).replace(/\./g, ""))
    return isNaN(num) || num <= 0 ? 0 : num
  }, [rawIncomeIncrease])

  const totalExtra = categorySavings + incomeIncrease

  const activeGoals = useMemo(() => {
    return (goals || []).filter(g => g.target > 0 && g.nama)
  }, [goals])

  const goalOptions = useMemo(() => {
    return activeGoals.map(g => `${g.nama} (${formatRp(g.target)})`)
  }, [activeGoals])

  const selectedGoal = useMemo(() => {
    if (!selectedGoalId) return null
    return activeGoals.find(g => `${g.nama} (${formatRp(g.target)})` === selectedGoalId) || null
  }, [selectedGoalId, activeGoals])

  const monthlyContributions = useMemo(() => {
    if (!selectedGoal || !transactions) return 0
    const savingsByMonth = {}
    transactions.filter(t => t.type === "savings").forEach(t => {
      if (!selectedGoal.kategori || t.category === selectedGoal.kategori) {
        const k = `${t.month} ${t.year}`
        savingsByMonth[k] = (savingsByMonth[k] || 0) + t.amount
      }
    })
    const values = Object.values(savingsByMonth)
    if (values.length === 0) return 0
    return Math.round(values.reduce((s, v) => s + v, 0) / values.length)
  }, [selectedGoal, transactions])

  const result = useMemo(() => {
    if (!totalExtra || !selectedGoal || !transactions) return null
    if (monthlyContributions <= 0) return { noContributions: true }

    const currentProgress = computeGoalProgress(selectedGoal, transactions)
    const remaining = Math.max(0, selectedGoal.target - currentProgress)
    if (remaining <= 0) return { alreadyDone: true }

    const now = new Date()

    const originalDays = (remaining / monthlyContributions) * 30.44
    const newMonthlyContribution = monthlyContributions + totalExtra
    const newDays = (remaining / newMonthlyContribution) * 30.44
    const daysSaved = Math.round(originalDays - newDays)

    const origDate = formatDateFromDays(now, originalDays)
    const newDate = formatDateFromDays(now, newDays)

      const parts = []
      if (targetCategorySpend > 0 && selectedCategory) {
        if (categorySavings > 0) {
          parts.push(`${selectedCategory} jadi ${formatRp(targetCategorySpend)}/bulan, hemat ${formatRp(categorySavings)}/bulan`)
        } else {
          parts.push(`${selectedCategory} tetap ${formatRp(targetCategorySpend)}/bulan`)
        }
      }
      if (incomeIncrease > 0) {
        parts.push(`tambah pemasukan ${formatRp(incomeIncrease)}`)
    }
    const summaryAction = parts.join(" + ")

    return {
      goal: selectedGoal,
      currentProgress,
      remaining,
      monthlyContributions,
      newMonthlyContribution,
      totalExtra,
      originalDays: Math.round(originalDays),
      newDays: Math.round(newDays),
      daysSaved,
      originalDate: origDate,
      newDate: newDate,
      targetSpendPct: categoryAvg > 0 ? ((targetCategorySpend / categoryAvg) * 100).toFixed(0) : 0,
      categorySavings,
      summaryAction,
    }
  }, [totalExtra, selectedGoal, transactions, monthlyContributions, targetCategorySpend, incomeIncrease, selectedCategory, categoryAvg, categorySavings])

  const hasInput = targetCategorySpend > 0 || incomeIncrease > 0

  return (
    <Sheet
      open={open}
      onClose={onClose}
      subtitle="Simulasi"
      size="md"
      maxHeight="90vh"
      header={
        <div className="flex items-center gap-2">
          <Calculator size={18} color={THEME.primary} aria-hidden="true" />
          <h3 className="text-lg font-display font-bold text-earth-800">What-If Scenario</h3>
        </div>
      }
    >
      <p className="text-xs text-earth-600 mb-4">
        Simulasikan dampak perubahan pengeluaran dan pemasukan terhadap pencapaian goal kamu.
      </p>

      <div className="space-y-3">
        {/* Expense target */}
        <SelectField
          label="Kurangi Pengeluaran (opsional)"
          value={selectedCategory}
          onChange={setSelectedCategory}
          options={expenseCategories}
          placeholder="Pilih kategori"
        />

        {selectedCategory && categoryAvg > 0 && (
          <div className="rounded-2xl p-3 flex items-center justify-between" style={{ background: THEME.surfaceWarm }}>
            <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">Rata-rata bulanan</span>
            <span className="text-sm font-bold text-earth-700">{formatRpFull(categoryAvg)}</span>
          </div>
        )}

        <div>
          <label htmlFor="reduction-amount" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">
            Jumlah Pengurangan yang Diharapkan (Rp)
          </label>
          <input
            id="reduction-amount"
            type="text"
            inputMode="numeric"
            placeholder="500000"
            value={rawReduction}
            onChange={e => setRawReduction(formatInputRupiah(e.target.value))}
            className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200"
          />
          {selectedCategory && categoryAvg > 0 && targetCategorySpend > 0 && (
            <p className="text-[10px] text-earth-500 mt-1 px-1">
              {targetCategorySpend >= categoryAvg
                ? `Target di atas atau sama dengan rata-rata ${selectedCategory}, tidak ada penghematan`
                : `Target ${result?.targetSpendPct || 0}% dari rata-rata ${selectedCategory}, hemat ${formatRp(categorySavings)}/bulan`}
            </p>
          )}
        </div>

        {/* Income increase */}
        <div className="h-px bg-earth-100" />

        <div>
          <label htmlFor="income-amount" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">
            Tambah Pemasukan /bulan (opsional)
          </label>
          <input
            id="income-amount"
            type="text"
            inputMode="numeric"
            placeholder="1000000"
            value={rawIncomeIncrease}
            onChange={e => setRawIncomeIncrease(formatInputRupiah(e.target.value))}
            className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200"
          />
          {incomeIncrease > 0 && (
            <p className="text-[10px] text-earth-500 mt-1 px-1 flex items-center gap-1">
              <TrendingUp size={10} className="text-moss-600" />
              Tambahan {formatRp(incomeIncrease)} per bulan
            </p>
          )}
        </div>

        {/* Goal selector */}
        {activeGoals.length > 0 ? (
          <SelectField
            label="Alokasi ke Goal"
            value={selectedGoalId}
            onChange={setSelectedGoalId}
            options={goalOptions}
            placeholder="Pilih goal"
          />
        ) : (
          <div className="rounded-2xl p-3 text-center" style={{ background: THEME.surfaceWarm }}>
            <p className="text-xs text-earth-500">Belum ada goal. Buat goal terlebih dahulu.</p>
          </div>
        )}
      </div>

      {/* Results */}
      {result && !result.noContributions && !result.alreadyDone && (
        <div className="mt-5 space-y-3">
          <div className="h-px bg-earth-100" />

          <div className="rounded-2xl p-4 border-2" style={{ background: THEME.primaryBg, borderColor: THEME.primary + "30" }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} color={THEME.primary} aria-hidden="true" />
              <span className="text-xs font-bold text-earth-700">Hasil Simulasi</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-xl p-3" style={{ background: "white" }}>
                <p className="text-[8px] font-bold uppercase tracking-wider text-earth-500 mb-0.5">Kontribusi/bulan</p>
                <p className="text-sm font-bold text-earth-800">{formatRpFull(result.newMonthlyContribution)}</p>
                <p className="text-[9px] text-earth-400">Sebelum: {formatRp(result.monthlyContributions)}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: "white" }}>
                <p className="text-[8px] font-bold uppercase tracking-wider text-earth-500 mb-0.5">Sisa ke goal</p>
                <p className="text-sm font-bold text-earth-800">{formatRp(result.remaining)}</p>
                <p className="text-[9px] text-earth-400">Target: {formatRp(result.goal.target)}</p>
              </div>
            </div>

            {result.daysSaved > 0 && (
              <div className="rounded-xl p-3 border-2" style={{ background: THEME.incomeBg, borderColor: THEME.income + "30" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={12} color={THEME.income} aria-hidden="true" />
                  <span className="text-xs font-bold" style={{ color: THEME.income }}>
                    Lebih cepat {formatDaysSaved(result.daysSaved)}!
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-earth-500">
                    Sebelum: <strong className="text-earth-700">{result.originalDate}</strong>
                  </span>
                  <ChevronRight size={10} className="text-earth-400" />
                  <span className="text-earth-500">
                    Sesudah: <strong style={{ color: THEME.income }}>{result.newDate}</strong>
                  </span>
                </div>
              </div>
            )}

            {result.daysSaved <= 0 && (
              <div className="rounded-xl p-3" style={{ background: THEME.surfaceWarm }}>
                <p className="text-xs text-earth-600 text-center">
                  Perubahan ini terlalu kecil untuk mempercepat goal secara signifikan. Coba nominal lebih besar.
                </p>
              </div>
            )}

            {result.daysSaved > 0 && (
              <div className="mt-3 pt-3 border-t border-earth-100">
                <p className="text-[10px] text-earth-500 text-center leading-relaxed">
                  {result.summaryAction}
                  {result.summaryAction ? " /bulan = " : ""}
                  goal <strong style={{ color: THEME.primary }}>{result.goal.nama}</strong> tercapai{" "}
                  <strong style={{ color: THEME.income }}>{formatDaysSaved(result.daysSaved)} lebih cepat</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {result?.noContributions && (
        <div className="mt-5">
          <div className="rounded-xl p-3" style={{ background: THEME.surfaceWarm }}>
            <p className="text-xs text-earth-600 text-center">
              Kontribusi bulanan saat ini 0. Tambahkan kontribusi ke goal ini terlebih dahulu.
            </p>
          </div>
        </div>
      )}

      {result?.alreadyDone && (
        <div className="mt-5">
          <div className="rounded-xl p-3" style={{ background: THEME.incomeBg }}>
            <p className="text-xs text-earth-600 text-center">
              Goal ini sudah tercapai! 🎉
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl p-3 border border-earth-200">
        <p className="text-[10px] font-bold text-earth-700 mb-1">Cara kerja:</p>
        <ul className="text-[10px] text-earth-600 space-y-0.5 list-disc list-inside">
          <li>Pilih kategori pengeluaran yang ingin diatur (opsional)</li>
          <li>Masukkan target pengeluaran bulanan baru untuk kategori tersebut</li>
          <li>Tambah pemasukan tambahan per bulan (opsional)</li>
          <li>Pilih goal yang ingin dipercepat</li>
          <li>Lihat perbandingan timeline pencapaian goal</li>
        </ul>
      </div>
    </Sheet>
  )
}
