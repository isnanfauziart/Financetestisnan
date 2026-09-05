"use client"
import { useState, useMemo } from "react"
import { Plus, Target, Sparkles } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"
import { useBudgets, useSettings } from "@/lib/useSharedData"
import BudgetCard from "./BudgetCard"
import BudgetSetupModal from "./BudgetSetupModal"
import BudgetDetailModal from "./BudgetDetailModal"
import FeatureEducation from "./FeatureEducation"
import { matchesBudgetPeriod } from "@/lib/budgetPace"

export default function BudgetsSection({
  selectedMonth,
  selectedYear,
  selectedAccount,
  filteredTransactions,
  expenseCategories,
  onToast,
  onUsageChange,
  bills = [],
  billsLoading = false,
  billsError = null,
  now,
  proRegistrationOpen = true,
}) {
  const [setupState, setSetupState] = useState(null)
  const [detailBudget, setDetailBudget] = useState(null)

  const monthParam = selectedMonth && selectedMonth !== "Semua Bulan" ? selectedMonth : ""
  const yearParam = selectedYear && selectedYear !== "Semua Tahun" ? selectedYear : ""

  const { budgets, loading, error, refetch } = useBudgets(monthParam, yearParam)
  const { settings } = useSettings()

  const visibleBudgets = useMemo(() => {
    if (selectedAccount === "Semua Akun") return budgets
    return budgets.filter(b => !b.akun || b.akun === selectedAccount)
  }, [budgets, selectedAccount])

  const spentByBudget = useMemo(() => {
    const result = {}
    for (const b of visibleBudgets) {
      result[`${b.kategori}|${b.bulan}|${b.tahun}|${b.akun || ""}`] = (filteredTransactions || []).reduce((sum, t) => {
        if (t.type !== "expense" || t.category !== b.kategori || (b.akun && t.account !== b.akun) || !matchesBudgetPeriod(t, b)) return sum
        return sum + (Number(t.amount) || 0)
      }, 0)
    }
    return result
  }, [filteredTransactions, visibleBudgets])

  const detailMonthLabel = detailBudget?.bulan || (selectedMonth && selectedMonth !== "Semua Bulan" ? selectedMonth : "")
  const detailYear = detailBudget?.tahun || (selectedYear && selectedYear !== "Semua Tahun" ? selectedYear : String(new Date().getFullYear()))

  const detailTransactions = useMemo(() => {
    if (!detailBudget) return []
    return (filteredTransactions || []).filter(t =>
      t.type === "expense" &&
      t.category === detailBudget.kategori &&
      (!detailBudget.akun || t.account === detailBudget.akun) &&
      matchesBudgetPeriod(t, detailBudget)
    )
  }, [detailBudget, filteredTransactions])

  const unbudgetedCategories = useMemo(() => {
    const budgeted = new Set(visibleBudgets.map(b => b.kategori))
    return (expenseCategories || [])
      .map(c => c.name)
      .filter(name => !budgeted.has(name))
      .slice(0, 4)
  }, [visibleBudgets, expenseCategories])

  function openCreate(prefillKategori = "") {
    setSetupState({ mode: "create", budget: null, prefillKategori })
  }

  function openEdit(budget) {
    setSetupState({ mode: "edit", budget, prefillKategori: "" })
  }

  function closeSetup() {
    setSetupState(null)
  }

  async function handleDelete(budget) {
    if (!confirm(`Hapus budget ${budget.kategori} ${budget.bulan} ${budget.tahun}?`)) return
    try {
      const res = await fetch("/api/budgets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kategori: budget.kategori, bulan: budget.bulan, tahun: budget.tahun, akun: budget.akun || "" }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Gagal menghapus")
       onToast?.("Anggaran dihapus ✓", "success")
      refetch()
      onUsageChange?.()
    } catch (err) {
      onToast?.(err.message, "error")
    }
  }

  function handleSaved() {
     onToast?.(setupState?.mode === "edit" ? "Anggaran diperbarui ✓" : "Anggaran dibuat ✓", "success")
    closeSetup()
    refetch()
    onUsageChange?.()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <Target size={14} color={THEME.primary} aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-md3-on-surface">Anggaran</h3>
          {selectedMonth && selectedMonth !== "Semua Bulan" && (
            <span className="text-[10px] font-bold text-md3-on-surface-variant uppercase tracking-wider">· {selectedMonth} {selectedYear}</span>
          )}
        </div>
        <button
          onClick={() => openCreate("")}
          aria-label="Tambah anggaran baru"
          className="min-h-11 min-w-11 text-[11px] font-bold py-1.5 px-3 rounded-xl text-white flex items-center gap-1 shadow-pop active:scale-95 transition-transform bg-sage-500 hover:bg-sage-600"
        >
          <Plus size={12} aria-hidden="true" /> Tambah Anggaran
        </button>
      </div>

      {error ? (
        <div className="bento-tile bg-rose-50 border border-rose-200 p-4 shadow-warm" role="alert">
          <p className="text-sm font-semibold text-rose-800">Gagal memuat anggaran</p>
          <p className="text-xs text-rose-700 mt-1">{error}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 min-h-11 min-w-11 text-xs font-bold px-3 py-1.5 rounded-xl text-white bg-rose-600 hover:bg-rose-700"
          >
            Coba lagi
          </button>
        </div>
      ) : loading ? (
        <div className="shimmer-bg rounded-2xl h-24" aria-hidden="true" />
      ) : visibleBudgets.length === 0 ? (
        <FeatureEducation
          title="Jaga pengeluaran tetap terkendali"
          description="Tetapkan batas yang membantu kamu menjaga pengeluaran tetap tenang sepanjang bulan."
          steps={[
            { icon: <Target size={16} aria-hidden="true" />, title: "Pilih kategori", description: "Mulai dari kebutuhan yang paling penting." },
            { icon: <Target size={16} aria-hidden="true" />, title: "Tentukan limit", description: "Isi batas pengeluaran untuk bulan ini." },
            { icon: <Target size={16} aria-hidden="true" />, title: "Catat seperti biasa", description: "Transaksi tetap berjalan seperti biasanya." },
            { icon: <Target size={16} aria-hidden="true" />, title: "Cek sisa anggaran", description: "Lihat ruang yang masih tersedia." },
          ]}
          example="Jajan / Transportasi"
          action={
            <button
              type="button"
              onClick={() => openCreate("")}
              className="min-h-11 min-w-11 rounded-xl bg-sage-500 px-4 py-2 text-xs font-bold text-white shadow-pop transition-colors hover:bg-sage-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-200 focus-visible:ring-offset-2"
            >
              Buat Anggaran
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleBudgets.map((b, i) => {
            const key = `${b.kategori}|${b.bulan}|${b.tahun}|${b.akun || ""}`
            return (
              <div key={key} className="animate-fade-in-up" style={{ animationDelay: `${0.05 * i}s` }}>
                <BudgetCard
                  budget={b}
                  spent={spentByBudget[`${b.kategori}|${b.bulan}|${b.tahun}|${b.akun || ""}`] || 0}
                  categoryMeta={settings?.categories?.expense?.find(item => (typeof item === "string" ? item : item?.name) === b.kategori)}
                  onClick={() => setDetailBudget(b)}
                  onEdit={() => openEdit(b)}
                  onDelete={() => handleDelete(b)}
                  now={now}
                />
              </div>
            )
          })}
        </div>
      )}

      {unbudgetedCategories.length > 0 && visibleBudgets.length > 0 && (
        <div className="mt-3 px-1 animate-fade-in">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={11} className="text-amber-500" aria-hidden="true" />
            <p className="text-[10px] font-bold text-md3-on-surface-variant uppercase tracking-wider">Saran anggaran</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unbudgetedCategories.map(name => (
              <button
                key={name}
                onClick={() => openCreate(name)}
                className="min-h-11 min-w-11 text-[10px] font-bold py-1 px-2.5 rounded-xl bg-md3-surface hover:bg-sage-100 text-md3-on-surface-variant hover:text-sage-700 transition-colors"
                aria-label={`Atur anggaran untuk ${name}`}
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {setupState && (
          <BudgetSetupModal
          budget={setupState.budget}
          defaultMonth={selectedMonth !== "Semua Bulan" ? selectedMonth : undefined}
          defaultYear={selectedYear !== "Semua Tahun" ? selectedYear : undefined}
          prefillKategori={setupState.prefillKategori}
          onClose={closeSetup}
          onSaved={handleSaved}
          proRegistrationOpen={proRegistrationOpen}
        />
      )}

      {detailBudget && (
        <BudgetDetailModal
          budget={detailBudget}
          transactions={detailTransactions}
          month={detailMonthLabel}
          year={detailYear}
          onClose={() => setDetailBudget(null)}
          bills={bills}
          billsLoading={billsLoading}
          billsError={billsError}
          now={now}
        />
      )}
    </div>
  )
}
