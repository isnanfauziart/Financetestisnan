/**
 * Wave 6 — Yang perlu kamu cek.
 *
 * One deterministic builder owns the Beranda check surface. Items come from
 * real records only, in the approved priority order:
 *
 *   1. overdue bill
 *   2. budget exceeded or near its established warning threshold (80%)
 *   3. goal falling behind its required pace
 *   4. unusual spending supported by the anomaly rules
 *
 * At most two items render; ties inside a category resolve worst-first. When
 * nothing qualifies the single approved fallback is a compact Tambah transaksi
 * prompt — never a generic financial recommendation. Loading or failed sources
 * simply provide no candidates (they cannot invent items).
 *
 * The builder returns structured items (kind + destination + copy); icons and
 * tints stay in the component layer.
 */

import { matchesBudgetPeriod } from "@/lib/budgetPace"
import { computeAllGoalProgress, computeGoalPace } from "@/app/dashboard/_components/goalUtils"
import { formatRp } from "@/app/dashboard/_components/helpers"

/** The established budget warning threshold (warn at 80%, escalate at 100%). */
export const BUDGET_WARNING_PCT = 80

function overdueBillItem(bills) {
  const overdue = (bills || [])
    .filter((bill) => bill && bill.status === "overdue")
    .sort((a, b) => (a.daysUntilDue || 0) - (b.daysUntilDue || 0))
  const bill = overdue[0]
  if (!bill) return null
  return {
    key: `bill-${bill.id || bill.nama}`,
    kind: "bill",
    eyebrow: "Tagihan terlambat",
    title: `Bayar tagihan ${bill.nama}`,
    description: bill.jumlah
      ? `${formatRp(bill.jumlah)} • Buka Rencana untuk lanjut bayar.`
      : "Buka Rencana untuk cek dan selesaikan tagihan ini.",
    aria: `Bayar tagihan ${bill.nama}`,
    destination: { tab: "plan", section: "bill", billId: bill.id },
  }
}

function budgetItem({ budgets, allTransactions, month, year }) {
  if (!budgets?.length) return null
  const worst = budgets
    .map((budget) => {
      const spent = (allTransactions || []).reduce((sum, tx) => {
        if (tx.type !== "expense" || tx.category !== budget.kategori) return sum
        if (budget.akun && tx.account !== budget.akun) return sum
        if (!matchesBudgetPeriod(tx, budget)) return sum
        return sum + (Number(tx.amount) || 0)
      }, 0)
      const pct = budget.limit > 0 ? (spent / budget.limit) * 100 : 0
      return { ...budget, spent, pct }
    })
    .filter((budget) => budget.limit > 0 && budget.pct >= BUDGET_WARNING_PCT)
    .sort((a, b) => b.pct - a.pct || String(a.kategori).localeCompare(String(b.kategori)))[0]
  if (!worst) return null
  const overLimit = worst.pct >= 100
  return {
    key: `budget-${worst.kategori}-${worst.bulan}-${worst.tahun}-${worst.akun || ""}`,
    kind: "budget",
    eyebrow: overLimit ? "Budget jebol" : "Budget menipis",
    title: `Cek budget ${worst.kategori}`,
    description: `${worst.pct.toFixed(0)}% terpakai • Buka Rencana untuk cek dan atur budget.`,
    aria: `Cek budget ${worst.kategori}`,
    destination: { tab: "plan", section: "budget", month: worst.bulan, year: worst.tahun },
  }
}

function goalItem({ goals, allocations, now }) {
  if (!goals?.length) return null
  const progressByGoal = computeAllGoalProgress(goals, allocations)
  const behind = goals
    .map((goal) => ({ goal, pace: computeGoalPace(goal, progressByGoal[goal?.id], now) }))
    .filter(({ pace }) => pace && pace.status === "behind")
    .sort((a, b) =>
      (b.pace.additionalMonthly - a.pace.additionalMonthly) ||
      String(a.goal?.nama).localeCompare(String(b.goal?.nama)) ||
      String(a.goal?.id).localeCompare(String(b.goal?.id)),
    )[0]
  if (!behind) return null
  const { goal, pace } = behind
  return {
    key: `goal-${goal.id || goal.nama}`,
    kind: "goal",
    eyebrow: "Target tertinggal",
    title: `Kejar target ${goal.nama}`,
    description: `Kurang ${formatRp(pace.additionalMonthly)} per bulan • Buka Rencana untuk atur target.`,
    aria: `Kejar target ${goal.nama}`,
    destination: { tab: "plan", section: "goal", goalId: goal.id },
  }
}

function anomalyItem({ anomalies, anomalyEnabled }) {
  if (!anomalyEnabled || !anomalies?.length) return null
  const worst = anomalies[0]
  return {
    key: `anomaly-${worst.category}`,
    kind: "anomaly",
    eyebrow: "Pengeluaran tidak biasa",
    title: `Cek kategori ${worst.category}`,
    description: `${formatRp(worst.current)} bulan ini, rata-rata ${formatRp(worst.avg)} • Buka Statistik untuk buktinya.`,
    aria: `Cek kategori ${worst.category} di Statistik`,
    destination: { tab: "stats", section: "ringkasan", category: worst.category },
  }
}

function quickAddItem() {
  return {
    key: "quick-add-expense",
    kind: "quickAdd",
    eyebrow: "Quick actions",
    title: "Tambah transaksi hari ini",
    description: "Catat pengeluaran atau pemasukan tanpa buka form penuh.",
    aria: "Tambah transaksi hari ini",
    destination: { action: "quickAdd", txType: "expense" },
  }
}

/**
 * Build the at-most-two Beranda check actions.
 *
 * @param {object} input
 * @param {Array}  input.bills            Bill records (`status`, `daysUntilDue`).
 * @param {Array}  input.budgets          Budget records for the active period.
 * @param {Array}  input.allTransactions  For budget spend computation.
 * @param {string} input.month            Active budget month (e.g. "Jul").
 * @param {string} input.year             Active budget year (e.g. "2026").
 * @param {Array}  input.goals            Goal records.
 * @param {object} input.allocations      Balance allocation summary (`byGoal`).
 * @param {Array}  input.anomalies        Output of detectAnomalies().
 * @param {boolean} input.anomalyEnabled  Entitlement for anomaly evidence.
 * @param {Date}    [now]                 Clock for pace math (tests inject it).
 */
export function buildChecklistActions(input = {}, now = new Date()) {
  const items = [
    overdueBillItem(input.bills),
    budgetItem(input),
    goalItem({ ...input, now }),
    anomalyItem(input),
  ].filter(Boolean)
  return items.slice(0, 2).length > 0 ? items.slice(0, 2) : [quickAddItem()]
}
