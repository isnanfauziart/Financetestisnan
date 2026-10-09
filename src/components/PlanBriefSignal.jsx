"use client"
import { useBudgets, useGoals, useDebts, useEvents } from "@/lib/useSharedData"
import { matchesBudgetPeriod } from "@/lib/budgetPace"
import { computeAllGoalProgress } from "@/app/dashboard/_components/goalUtils"
import { formatRp, maskRupiah } from "@/app/dashboard/_components/helpers"

function Signal({ value, detail, prefix }) {
  return <><strong id={prefix ? `${prefix}-value` : undefined} className="plan-brief-value">{value}</strong><span id={prefix ? `${prefix}-detail` : undefined} className="plan-brief-detail">{detail}</span></>
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split("-")
  if (parts.length !== 3) return null
  const due = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24))
}

// --- Data hooks -----------------------------------------------------------
// Each returns { status: "loading" | "error" | "ok", value, detail } so the
// Rencana pillars can lay the headline number and caption out separately.
// The *Brief components below stay as thin wrappers to keep their tested
// text contract intact.

export function useBudgetBriefData({ selectedMonth, selectedYear, selectedAccount, transactions = [], moneyHidden = false }) {
  const { budgets, loading, error } = useBudgets(selectedMonth === "Semua Bulan" ? "" : selectedMonth || "", selectedYear === "Semua Tahun" ? "" : selectedYear || "")
  if (loading) return { status: "loading", value: "Memuat…", detail: "Menyiapkan ringkasan anggaran." }
  if (error) return { status: "error", value: "Belum tersedia", detail: "Buka Anggaran untuk mencoba lagi." }
  const visible = budgets.filter(b => !selectedAccount || selectedAccount === "Semua Akun" || !b.akun || b.akun === selectedAccount)
  const limit = visible.reduce((sum, b) => sum + (Number(b.limit) || 0), 0)
  const spent = visible.reduce((sum, b) => sum + transactions.reduce((total, t) =>
    t.type === "expense" && t.category === b.kategori && (!b.akun || b.akun === t.account) && matchesBudgetPeriod(t, b)
      ? total + (Number(t.amount) || 0) : total, 0), 0)
  // Privacy-eye mode: the sisa/melebihi figure is masked; the percentage
  // headline stays readable on purpose — it is not an amount.
  const masked = (formatted) => (moneyHidden ? maskRupiah(formatted) : formatted)
  if (!(limit > 0)) return { status: "ok", value: "Belum ada anggaran", detail: "Tentukan batas belanja untuk periode ini." }
  return {
    status: "ok",
    value: `${Math.round(spent / limit * 100)}% digunakan`,
    detail: `${spent > limit ? "Melebihi anggaran" : "Sisa anggaran"} ${masked(formatRp(Math.abs(limit - spent)))}`,
  }
}

export function BudgetBrief(props) {
  const { value, detail } = useBudgetBriefData(props)
  return <Signal value={value} detail={detail} prefix={props.prefix} />
}

export function useGoalBriefData({ allocations }) {
  const { goals, loading, error } = useGoals()
  if (loading) return { status: "loading", value: "Memuat…", detail: "Menyiapkan ringkasan target." }
  if (error) return { status: "error", value: "Belum tersedia", detail: "Buka Target untuk mencoba lagi." }
  const progress = computeAllGoalProgress(goals, allocations)
  const leading = goals.filter(g => g.status !== "settled" && Number(g.target) > 0)
    .map(g => ({ ...g, percent: Math.min(100, Math.max(0, (progress[g.id] || 0) / g.target * 100)) }))
    .sort((a, b) => b.percent - a.percent)[0]
  if (!leading) return { status: "ok", value: "Belum ada target aktif", detail: "Mulai dari satu tujuan yang ingin kamu capai." }
  return { status: "ok", value: `${Math.round(leading.percent)}% tercapai`, detail: leading.nama }
}

export function GoalBrief(props) {
  const { value, detail } = useGoalBriefData(props)
  return <Signal value={value} detail={detail} prefix={props.prefix} />
}

export function useBillBriefData({ bills = [], billsLoading, billsError, moneyHidden = false }) {
  if (billsLoading) return { status: "loading", value: "Memuat…", detail: "Menyiapkan agenda tagihan." }
  if (billsError) return { status: "error", value: "Belum tersedia", detail: "Buka Tagihan untuk mencoba lagi." }
  const next = bills.filter(b => b.aktif !== false).slice().sort((a, b) => (a.daysUntilDue ?? Infinity) - (b.daysUntilDue ?? Infinity))[0]
  if (!next) return { status: "ok", value: "Belum ada tagihan", detail: "Semua jadwal pembayaran ada di sini." }
  const days = next.daysUntilDue
  const value = days == null ? "Terjadwal" : days < 0 ? `${Math.abs(days)} hari terlambat` : days === 0 ? "Hari ini" : days === 1 ? "Besok" : `${days} hari lagi`
  // Privacy-eye mode: the next bill's amount is masked; the due-day headline
  // stays readable on purpose — it is not an amount.
  const masked = (formatted) => (moneyHidden ? maskRupiah(formatted) : formatted)
  return { status: "ok", value, detail: `${next.nama} · ${masked(formatRp(next.jumlah))}` }
}

export function BillBrief(props) {
  const { value, detail } = useBillBriefData(props)
  return <Signal value={value} detail={detail} prefix={props.prefix} />
}

export function useUtangBriefData({ moneyHidden = false } = {}) {
  const { debts, loading, error } = useDebts()
  if (loading) return { status: "loading", value: "Memuat…", detail: "Menyiapkan ringkasan utang." }
  if (error) return { status: "error", value: "Belum tersedia", detail: "Buka Utang & Piutang untuk mencoba lagi." }
  const open = debts.filter(d => d.status === "open")
  if (open.length === 0) return { status: "ok", value: "Lunas semua", detail: "Tidak ada utang/piutang terbuka." }
  const total = open.reduce((sum, d) => sum + (Number(d.sisaSaldo) || 0), 0)
  const masked = (formatted) => (moneyHidden ? maskRupiah(formatted) : formatted)
  return { status: "ok", value: masked(formatRp(total)), detail: `${open.length} catatan terbuka` }
}

export function UtangBrief(props) {
  const { value, detail } = useUtangBriefData(props)
  return <Signal value={value} detail={detail} prefix={props.prefix} />
}

export function useEventBriefData({ moneyHidden = false } = {}) {
  const { events, loading, error } = useEvents()
  if (loading) return { status: "loading", value: "Memuat…", detail: "Menyiapkan agenda event." }
  if (error) return { status: "error", value: "Belum tersedia", detail: "Buka Event untuk mencoba lagi." }
  const upcoming = events
    .filter(e => (e.effectiveStatus || e.status) !== "settled" && e.tanggalSelesai)
    .map(e => ({ ...e, days: daysUntil(e.tanggalSelesai) }))
    .filter(e => e.days != null && e.days >= 0)
    .sort((a, b) => a.days - b.days)[0]
  if (!upcoming) return { status: "ok", value: "Belum ada event", detail: "Rencanakan anggaran untuk momen spesial." }
  const value = upcoming.days === 0 ? "Hari ini" : upcoming.days === 1 ? "Besok" : `${upcoming.days} hari`
  const masked = (formatted) => (moneyHidden ? maskRupiah(formatted) : formatted)
  const pct = Math.round(Number(upcoming.pct) || 0)
  return { status: "ok", value, detail: `${upcoming.nama} · ${masked(formatRp(upcoming.totalBudget))} · ${pct}% terkumpul` }
}

export function EventBrief(props) {
  const { value, detail } = useEventBriefData(props)
  return <Signal value={value} detail={detail} prefix={props.prefix} />
}
