"use client"
import { useState, useMemo } from "react"
import { Plus, Target, Sparkles } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"
import { useBudgets } from "@/lib/useSharedData"
import BudgetCard from "./BudgetCard"
import BudgetSetupModal from "./BudgetSetupModal"
import BudgetDetailModal from "./BudgetDetailModal"
import EmptyState from "@/app/dashboard/_components/EmptyState"

export default function BudgetsSection({
  selectedMonth,
  selectedYear,
  selectedAccount,
  filteredTransactions,
  expenseCategories,
  onToast,
}) {
  const [setupState, setSetupState] = useState(null)
  const [detailBudget, setDetailBudget] = useState(null)

  const monthParam = selectedMonth && selectedMonth !== "Semua Bulan" ? selectedMonth : ""
  const yearParam = selectedYear && selectedYear !== "Semua Tahun" ? selectedYear : ""

  const { budgets, loading, refetch } = useBudgets(monthParam, yearParam)

  const visibleBudgets = useMemo(() => {
    if (selectedAccount === "Semua Akun") return budgets
    return budgets.filter(b => !b.akun || b.akun === selectedAccount)
  }, [budgets, selectedAccount])

  const spentByCategoryAccount = useMemo(() => {
    const map = {}
    for (const t of (filteredTransactions || [])) {
      if (t.type !== "expense") continue
      const key = `${t.category}|${t.account || ""}`
      map[key] = (map[key] || 0) + t.amount
    }
    const byCategory = {}
    for (const b of visibleBudgets) {
      const accountKey = b.akun || ""
      if (accountKey) {
        byCategory[b.kategori] = (byCategory[b.kategori] || 0) + (map[`${b.kategori}|${accountKey}`] || 0)
      } else {
        const sumForCat = Object.entries(map)
          .filter(([k]) => k.startsWith(`${b.kategori}|`))
          .reduce((s, [, v]) => s + v, 0)
        byCategory[b.kategori] = (byCategory[b.kategori] || 0) + sumForCat
      }
    }
    return byCategory
  }, [filteredTransactions, visibleBudgets])

  const detailMonthLabel = selectedMonth && selectedMonth !== "Semua Bulan" ? selectedMonth : (budgets[0]?.bulan || "")
  const detailYear = selectedYear && selectedYear !== "Semua Tahun" ? selectedYear : (budgets[0]?.tahun || String(new Date().getFullYear()))

  const detailTransactions = useMemo(() => {
    if (!detailBudget) return []
    return (filteredTransactions || []).filter(t =>
      t.type === "expense" &&
      t.category === detailBudget.kategori &&
      (!detailBudget.akun || t.account === detailBudget.akun)
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
      onToast?.("Budget dihapus ✓", "success")
      refetch()
    } catch (err) {
      onToast?.(err.message, "error")
    }
  }

  function handleSaved() {
    onToast?.(setupState?.mode === "edit" ? "Budget diperbarui ✓" : "Budget dibuat ✓", "success")
    closeSetup()
    refetch()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <Target size={14} color={THEME.primary} aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Budgets</h3>
          {selectedMonth && selectedMonth !== "Semua Bulan" && (
            <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">· {selectedMonth} {selectedYear}</span>
          )}
        </div>
        <button
          onClick={() => openCreate("")}
          aria-label="Add new budget"
          className="text-[11px] font-bold py-1.5 px-3 rounded-full text-white flex items-center gap-1 shadow-pop active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg, #4a3d33, #7c5fcf)" }}
        >
          <Plus size={12} aria-hidden="true" /> Add
        </button>
      </div>

      {loading ? (
        <div className="shimmer-bg rounded-2xl h-24" aria-hidden="true" />
      ) : visibleBudgets.length === 0 ? (
        <div className="bento-tile bg-white border border-earth-100 p-4 shadow-warm">
          <EmptyState
            icon={<Target size={20} />}
            title="Belum ada budget bulan ini"
            hint="Tetapkan limit per kategori agar pengeluaran lebih terkontrol"
            action={
              <button onClick={() => openCreate("")} className="text-xs font-bold px-4 py-2 rounded-full text-white mesh-violet shadow-pop">
                Buat Budget
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleBudgets.map((b, i) => {
            const key = `${b.kategori}|${b.bulan}|${b.tahun}|${b.akun || ""}`
            return (
              <div key={key} className="animate-fade-in-up" style={{ animationDelay: `${0.05 * i}s` }}>
                <BudgetCard
                  budget={b}
                  spent={spentByCategoryAccount[b.kategori] || 0}
                  onClick={() => setDetailBudget(b)}
                  onEdit={() => openEdit(b)}
                  onDelete={() => handleDelete(b)}
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
            <p className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">Saran budget</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unbudgetedCategories.map(name => (
              <button
                key={name}
                onClick={() => openCreate(name)}
                className="text-[10px] font-bold py-1 px-2.5 rounded-full bg-earth-50 hover:bg-violet-100 text-earth-600 hover:text-violet-700 transition-colors"
                aria-label={`Set budget for ${name}`}
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
        />
      )}

      {detailBudget && (
        <BudgetDetailModal
          budget={detailBudget}
          transactions={detailTransactions}
          month={detailMonthLabel}
          year={detailYear}
          onClose={() => setDetailBudget(null)}
        />
      )}
    </div>
  )
}
