"use client"
import { useBudgets, useGoals } from "@/lib/useSharedData"
import { matchesBudgetPeriod } from "@/lib/budgetPace"
import { computeAllGoalProgress } from "@/app/dashboard/_components/goalUtils"
import { formatRp } from "@/app/dashboard/_components/helpers"

function Signal({ value, detail, prefix }) {
  return <><strong id={prefix ? `${prefix}-value` : undefined} className="plan-brief-value">{value}</strong><span id={prefix ? `${prefix}-detail` : undefined} className="plan-brief-detail">{detail}</span></>
}

export function BudgetBrief({ selectedMonth, selectedYear, selectedAccount, transactions = [], prefix }) {
  const { budgets, loading, error } = useBudgets(selectedMonth === "Semua Bulan" ? "" : selectedMonth || "", selectedYear === "Semua Tahun" ? "" : selectedYear || "")
  if (loading) return <Signal prefix={prefix} value="Memuat…" detail="Menyiapkan ringkasan anggaran." />
  if (error) return <Signal prefix={prefix} value="Belum tersedia" detail="Buka Anggaran untuk mencoba lagi." />
  const visible = budgets.filter(b => !selectedAccount || selectedAccount === "Semua Akun" || !b.akun || b.akun === selectedAccount)
  const limit = visible.reduce((sum, b) => sum + (Number(b.limit) || 0), 0)
  const spent = visible.reduce((sum, b) => sum + transactions.reduce((total, t) =>
    t.type === "expense" && t.category === b.kategori && (!b.akun || b.akun === t.account) && matchesBudgetPeriod(t, b)
      ? total + (Number(t.amount) || 0) : total, 0), 0)
  return <Signal prefix={prefix} value={limit > 0 ? `${Math.round(spent / limit * 100)}% digunakan` : "Belum ada anggaran"} detail={limit > 0 ? `${spent > limit ? "Melebihi anggaran" : "Sisa anggaran"} ${formatRp(Math.abs(limit - spent))}` : "Tentukan batas belanja untuk periode ini."} />
}

export function GoalBrief({ allocations, prefix }) {
  const { goals, loading, error } = useGoals()
  if (loading) return <Signal prefix={prefix} value="Memuat…" detail="Menyiapkan ringkasan target." />
  if (error) return <Signal prefix={prefix} value="Belum tersedia" detail="Buka Target untuk mencoba lagi." />
  const progress = computeAllGoalProgress(goals, allocations)
  const leading = goals.filter(g => g.status !== "settled" && Number(g.target) > 0)
    .map(g => ({ ...g, percent: Math.min(100, Math.max(0, (progress[g.id] || 0) / g.target * 100)) }))
    .sort((a, b) => b.percent - a.percent)[0]
  return <Signal prefix={prefix} value={leading ? `${Math.round(leading.percent)}% tercapai` : "Belum ada target aktif"} detail={leading ? leading.nama : "Mulai dari satu tujuan yang ingin kamu capai."} />
}

export function BillBrief({ bills = [], billsLoading, billsError, prefix }) {
  if (billsLoading) return <Signal prefix={prefix} value="Memuat…" detail="Menyiapkan agenda tagihan." />
  if (billsError) return <Signal prefix={prefix} value="Belum tersedia" detail="Buka Tagihan untuk mencoba lagi." />
  const next = bills.filter(b => b.aktif !== false).slice().sort((a, b) => (a.daysUntilDue ?? Infinity) - (b.daysUntilDue ?? Infinity))[0]
  const days = next?.daysUntilDue
  const value = !next ? "Belum ada tagihan" : days == null ? "Terjadwal" : days < 0 ? `${Math.abs(days)} hari terlambat` : days === 0 ? "Hari ini" : days === 1 ? "Besok" : `${days} hari lagi`
  return <Signal prefix={prefix} value={value} detail={next ? `${next.nama} · ${formatRp(next.jumlah)}` : "Semua jadwal pembayaran ada di sini."} />
}
