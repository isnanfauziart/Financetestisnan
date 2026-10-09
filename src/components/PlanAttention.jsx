"use client"
import { useMemo } from "react"
import { ArrowRight, Receipt, Wallet, HandCoins } from "lucide-react"
import { useBudgets, useDebts } from "@/lib/useSharedData"
import { matchesBudgetPeriod } from "@/lib/budgetPace"
import { formatRp, maskRupiah } from "@/app/dashboard/_components/helpers"
import { hasFeature } from "@/lib/featureAccess"

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

function dueLabel(days) {
  if (days < 0) return `${Math.abs(days)} hari terlambat`
  if (days === 0) return "jatuh tempo hari ini"
  if (days === 1) return "jatuh tempo besok"
  return `jatuh tempo ${days} hari lagi`
}

const SECTION_ICON = { tagihan: Receipt, budget: Wallet, utang: HandCoins }
const SECTION_LABEL = { tagihan: "Tagihan", budget: "Anggaran", utang: "Utang & Piutang" }

// Urgency rules (approved 2026-10-09): bills due within 3 days (overdue
// included), budgets at >=80% used, open debts due within 7 days (overdue
// included). Returns at most 3 items, most urgent first. Empty when calm.
export function useAttentionItems({ entitlement, bills = [], transactions = [], selectedMonth, selectedYear, selectedAccount, moneyHidden = false }) {
  const { budgets } = useBudgets(selectedMonth === "Semua Bulan" ? "" : selectedMonth || "", selectedYear === "Semua Tahun" ? "" : selectedYear || "")
  const { debts } = useDebts()

  return useMemo(() => {
    const items = []
    const masked = (formatted) => (moneyHidden ? maskRupiah(formatted) : formatted)

    if (hasFeature(entitlement, "bills")) {
      bills
        .filter(b => b.aktif !== false && b.daysUntilDue != null && b.daysUntilDue <= 3)
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
        .forEach(b => items.push({
          id: `bill-${b.id}`,
          section: "tagihan",
          title: b.nama || "Tagihan",
          detail: `${masked(formatRp(b.jumlah))} ${dueLabel(b.daysUntilDue)}`,
          rank: b.daysUntilDue,
        }))
    }

    if (hasFeature(entitlement, "budgets")) {
      const visible = budgets.filter(b => !selectedAccount || selectedAccount === "Semua Akun" || !b.akun || b.akun === selectedAccount)
      visible.forEach(b => {
        const limit = Number(b.limit) || 0
        if (!(limit > 0)) return
        const spent = transactions.reduce((total, t) =>
          t.type === "expense" && t.category === b.kategori && (!b.akun || b.akun === t.account) && matchesBudgetPeriod(t, b)
            ? total + (Number(t.amount) || 0) : total, 0)
        const pct = spent / limit
        if (pct >= 0.8) items.push({
          id: `budget-${b.kategori}-${b.akun || "all"}`,
          section: "budget",
          title: `Anggaran ${b.kategori}`,
          detail: `${Math.round(pct * 100)}% terpakai · sisa ${masked(formatRp(Math.max(0, limit - spent)))}`,
          rank: 100 + pct,
        })
      })
    }

    if (hasFeature(entitlement, "debts")) {
      debts
        .filter(d => d.status === "open" && d.jatuhTempo)
        .map(d => ({ ...d, days: daysUntil(d.jatuhTempo) }))
        .filter(d => d.days != null && d.days <= 7)
        .sort((a, b) => a.days - b.days)
        .forEach(d => items.push({
          id: `debt-${d.id}`,
          section: "utang",
          title: `${d.arah === "utang" ? "Utang" : "Piutang"} ${d.nama || ""}`.trim(),
          detail: `${masked(formatRp(d.sisaSaldo))} ${dueLabel(d.days)}`,
          rank: 200 + d.days,
        }))
    }

    return items.sort((a, b) => a.rank - b.rank).slice(0, 3)
  }, [entitlement, bills, transactions, budgets, debts, selectedMonth, selectedYear, selectedAccount, moneyHidden])
}

export function AttentionBand({ items, onOpen }) {
  if (!items || items.length === 0) return null
  return (
    <section aria-label="Perlu perhatian">
      <div className="-mx-5 bg-[var(--attention-bg)] px-5 py-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--attention-text)]">Perlu perhatian</p>
        <div className="divide-y divide-[var(--attention-border)]">
          {items.map(item => {
            const Icon = SECTION_ICON[item.section] || Receipt
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpen(item.section)}
                aria-label={`Buka ${SECTION_LABEL[item.section]}: ${item.title}`}
                className="flex w-full items-center gap-3 py-4 text-left"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--attention-text)]" aria-hidden="true">
                  <Icon size={17} strokeWidth={2.1} />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-[15px] font-bold text-md3-on-surface">{item.title}</strong>
                  <span className="mt-0.5 block text-xs leading-relaxed text-md3-on-surface-variant">{item.detail}</span>
                </span>
                <ArrowRight size={15} className="flex-shrink-0 text-md3-on-surface-variant" aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
