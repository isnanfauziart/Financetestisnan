"use client"
import { useState, useMemo } from "react"
import { Copy, Plus, Target, Sparkles } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"
import { useBudgets, useSettings } from "@/lib/useSharedData"
import BudgetCard from "./BudgetCard"
import BudgetSetupModal from "./BudgetSetupModal"
import BudgetCopyModal from "./BudgetCopyModal"
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
  entitlement,
}) {
  const [setupState, setSetupState] = useState(null)
  const [detailBudget, setDetailBudget] = useState(null)
  const [copyOpen, setCopyOpen] = useState(false)

  const monthParam = selectedMonth && selectedMonth !== "Semua Bulan" ? selectedMonth : ""
  const yearParam = selectedYear && selectedYear !== "Semua Tahun" ? selectedYear : ""

  const { budgets, loading, error, refetch } = useBudgets(monthParam, yearParam)
  const allBudgetState = useBudgets("", "")
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

  const budgetTotals = useMemo(() => {
    const limit = visibleBudgets.reduce((sum, budget) => sum + (Number(budget.limit) || 0), 0)
    const spent = visibleBudgets.reduce((sum, budget) => sum + (spentByBudget[`${budget.kategori}|${budget.bulan}|${budget.tahun}|${budget.akun || ""}`] || 0), 0)
    return { limit, spent, percentage: limit > 0 ? Math.round((spent / limit) * 100) : 0 }
  }, [spentByBudget, visibleBudgets])

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

  async function handleCopySaved(count) {
    await Promise.all([refetch(), allBudgetState.refetch()])
    onUsageChange?.()
    setCopyOpen(false)
    onToast?.(`${count} anggaran berhasil disalin ✓`, "success")
  }

  return (
    <div className="plan-section-shell">
      <div className="plan-section-heading">
        <div className="plan-section-heading__title">
          <Target size={14} color={THEME.primary} aria-hidden="true" />
          <h2>Anggaran</h2>
          {selectedMonth && selectedMonth !== "Semua Bulan" && (
            <span className="plan-section-heading__meta">{selectedMonth} {selectedYear}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => setCopyOpen(true)}
            aria-label="Salin anggaran historis"
            className="plan-section-action min-w-11 border border-md3-outline-variant px-3 py-1.5 text-md3-on-surface flex items-center gap-1 hover:bg-md3-surface-container-high active:scale-95"
          >
            <Copy size={12} aria-hidden="true" /> Salin Anggaran
          </button>
          <button
            onClick={() => openCreate("")}
            aria-label="Tambah anggaran baru"
            className="min-h-11 min-w-11 rounded-xl bg-sage-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-pop flex items-center gap-1 transition-colors hover:bg-sage-600 active:scale-95"
          >
            <Plus size={12} aria-hidden="true" /> Tambah Anggaran
          </button>
        </div>
      </div>

      {error && visibleBudgets.length === 0 ? (
        <div className="plan-error-state bg-rose-50 p-4" role="alert">
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
        <div className="plan-loading-state shimmer-bg" role="status" aria-label="Memuat anggaran" aria-busy="true">
          <span className="sr-only">Memuat anggaran…</span>
        </div>
      ) : visibleBudgets.length === 0 ? (
        <FeatureEducation
          className="plan-empty-state"
          title="Jaga pengeluaran tetap terkendali"
          description="Tetapkan batas yang membantu kamu menjaga pengeluaran tetap tenang sepanjang bulan."
          steps={[
            { icon: <Target size={16} aria-hidden="true" />, title: "Pilih kategori", description: "Mulai dari kebutuhan yang paling penting." },
            { icon: <Target size={16} aria-hidden="true" />, title: "Tentukan limit", description: "Isi batas pengeluaran untuk bulan ini." },
            { icon: <Target size={16} aria-hidden="true" />, title: "Catat seperti biasa", description: "Transaksi tetap berjalan seperti biasanya." },
            { icon: <Target size={16} aria-hidden="true" />, title: "Cek sisa anggaran", description: "Lihat sisa anggaran bulan ini." },
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
        <>
          <div className="plan-summary-strip">
            <div className="plan-summary-strip__item">
              <span>Total batas</span>
              <strong>{formatRp(budgetTotals.limit)}</strong>
              <em>{formatRp(budgetTotals.spent)} terpakai</em>
            </div>
            <div className="plan-summary-strip__item">
              <span>Ritme bulan ini</span>
              <strong>{budgetTotals.percentage}%</strong>
              <em>pengeluaran dari seluruh batas</em>
            </div>
            <div className="plan-summary-strip__item">
              <span>Petunjuk</span>
              <strong>Garis pace</strong>
              <em>patokan belanja sesuai waktu</em>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visibleBudgets.map((b, i) => {
              const key = `${b.kategori}|${b.bulan}|${b.tahun}|${b.akun || ""}`
              return (
                <div key={key} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 7) * 0.04}s` }}>
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
        </>
      )}

      {error && visibleBudgets.length > 0 && (
        <div className="plan-error-state mb-4 bg-rose-50 p-3" role="alert">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-rose-800">Anggaran terakhir masih ditampilkan</p>
              <p className="mt-1 text-xs text-rose-700">{error}</p>
            </div>
            <button type="button" onClick={() => refetch()} className="min-h-11 min-w-11 flex-shrink-0 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700">
              Coba lagi
            </button>
          </div>
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

      {copyOpen && (
        <BudgetCopyModal
          budgets={allBudgetState.budgets}
          defaultMonth={selectedMonth !== "Semua Bulan" ? selectedMonth : undefined}
          defaultYear={selectedYear !== "Semua Tahun" ? selectedYear : undefined}
          expenseCategories={expenseCategories}
          entitlement={entitlement}
          onClose={() => setCopyOpen(false)}
          onSaved={handleCopySaved}
          onRefresh={allBudgetState.refetch}
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
