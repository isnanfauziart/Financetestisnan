"use client"
import { useState, useMemo } from "react"
import { ListFilter, X } from "lucide-react"
import {
  THEME,
  AVAILABLE_MONTHS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  SAVINGS_CATEGORIES,
} from "./constants"
import SelectField from "./SelectField"
import PillButton from "./PillButton"
import EmptyState from "./EmptyState"
import RecapMonthGroup from "./RecapMonthGroup"
import { parseTxDate } from "./helpers"

const TYPE_OPTIONS = [
  { value: "all", label: "Semua", color: "primary" },
  { value: "income", label: "Pemasukan", color: "income" },
  { value: "expense", label: "Pengeluaran", color: "expense" },
  { value: "savings", label: "Tabungan", color: "savings" },
]

function monthIndex(monthName) {
  return AVAILABLE_MONTHS.indexOf(monthName)
}

function getMonthKey(month, year) {
  return `${month} ${year}`
}

export default function RecapSection({ transactions = [], onEdit, onDelete }) {
  const [filter, setFilter] = useState({
    month: "all",
    year: "all",
    account: "all",
    category: "all",
    type: "all",
  })
  const [expanded, setExpanded] = useState({})
  const [pages, setPages] = useState({})

  const availableYears = useMemo(() => {
    const ys = Array.from(new Set(transactions.map(t => String(t.year)).filter(Boolean)))
    ys.sort((a, b) => b.localeCompare(a))
    return ys
  }, [transactions])

  const availableAccounts = useMemo(() => {
    const accs = Array.from(new Set(transactions.map(t => t.account).filter(Boolean)))
    accs.sort()
    return accs
  }, [transactions])

  const availableCategories = useMemo(() => {
    const all = new Set()
    transactions.forEach(t => { if (t.category) all.add(t.category) })
    ;[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...SAVINGS_CATEGORIES].forEach(c => all.add(c))
    return Array.from(all).sort()
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filter.year !== "all" && String(t.year) !== String(filter.year)) return false
      if (filter.month !== "all" && t.month !== filter.month) return false
      if (filter.account !== "all" && (t.account || "") !== filter.account) return false
      if (filter.category !== "all" && t.category !== filter.category) return false
      if (filter.type !== "all" && t.type !== filter.type) return false
      return true
    })
  }, [transactions, filter])

  const groups = useMemo(() => {
    const map = new Map()
    filtered.forEach(t => {
      const key = getMonthKey(t.month, t.year)
      if (!map.has(key)) {
        map.set(key, {
          key,
          month: t.month,
          year: String(t.year),
          transactions: [],
          totals: { income: 0, expense: 0, savings: 0, net: 0 },
        })
      }
      const g = map.get(key)
      g.transactions.push(t)
      if (t.type === "income") g.totals.income += t.amount
      else if (t.type === "savings") g.totals.savings += t.amount
      else g.totals.expense += t.amount
    })

    const sorted = Array.from(map.values()).map(g => {
      g.transactions.sort((a, b) => parseTxDate(b.date) - parseTxDate(a.date))
      g.totals.net = g.totals.income - g.totals.expense
      return g
    })

    sorted.sort((a, b) => {
      const ya = Number(a.year), yb = Number(b.year)
      if (ya !== yb) return yb - ya
      return monthIndex(b.month) - monthIndex(a.month)
    })

    return sorted
  }, [filtered])

  const hasFilter =
    filter.month !== "all" ||
    filter.year !== "all" ||
    filter.account !== "all" ||
    filter.category !== "all" ||
    filter.type !== "all"

  const clearFilter = () =>
    setFilter({ month: "all", year: "all", account: "all", category: "all", type: "all" })

  if (transactions.length === 0) {
    return (
      <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm">
        <h3 className="text-sm font-bold mb-3 font-display text-earth-800 flex items-center gap-1.5">
          <ListFilter size={14} aria-hidden="true" /> Recap Bulanan
        </h3>
        <EmptyState
          icon={<ListFilter size={20} />}
          title="Belum ada transaksi"
          hint="Tambah transaksi untuk mulai melihat recap per bulan"
        />
      </div>
    )
  }

  const totalTx = filtered.length

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 px-1">
        <ListFilter size={14} className="text-violet-600" aria-hidden="true" />
        <h3 className="text-sm font-bold font-display text-earth-800 uppercase tracking-wider">
          Recap Bulanan
        </h3>
        <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider ml-1">
          · {groups.length} bulan · {totalTx} tx
        </span>
      </div>

      <div className="bento-tile glass rounded-2xl p-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            value={filter.month === "all" ? "Semua Bulan" : filter.month}
            onChange={v => setFilter(f => ({ ...f, month: v === "Semua Bulan" ? "all" : v }))}
            options={["Semua Bulan", ...AVAILABLE_MONTHS]}
            placeholder="Bulan"
          />
          <SelectField
            value={filter.year === "all" ? "Semua Tahun" : filter.year}
            onChange={v => setFilter(f => ({ ...f, year: v === "Semua Tahun" ? "all" : v }))}
            options={["Semua Tahun", ...availableYears]}
            placeholder="Tahun"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            value={filter.account === "all" ? "Semua Akun" : filter.account}
            onChange={v => setFilter(f => ({ ...f, account: v === "Semua Akun" ? "all" : v }))}
            options={["Semua Akun", ...availableAccounts]}
            placeholder="Akun"
          />
          <SelectField
            value={filter.category === "all" ? "Semua Kategori" : filter.category}
            onChange={v => setFilter(f => ({ ...f, category: v === "Semua Kategori" ? "all" : v }))}
            options={["Semua Kategori", ...availableCategories]}
            placeholder="Kategori"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider mr-1">Tipe:</span>
          {TYPE_OPTIONS.map(opt => (
            <PillButton
              key={opt.value}
              active={filter.type === opt.value}
              onClick={() => setFilter(f => ({ ...f, type: opt.value }))}
              color={opt.color}
            >
              {opt.label}
            </PillButton>
          ))}
          {hasFilter && (
            <button
              onClick={clearFilter}
              className="ml-auto text-[10px] font-bold text-violet-600 hover:underline flex items-center gap-1"
              aria-label="Atur ulang filter recap"
            >
              <X size={10} strokeWidth={3} aria-hidden="true" /> Atur Ulang
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm text-center">
          <p className="text-xs text-earth-500 py-4">Tidak ada transaksi yang cocok dengan filter.</p>
          <button onClick={clearFilter} className="text-[11px] font-bold text-violet-600 hover:underline">
            Atur ulang filter
          </button>
        </div>
      ) : (
        groups.map((g, idx) => {
          const isExpanded = expanded[g.key] ?? idx === 0
          return (
            <RecapMonthGroup
              key={g.key}
              month={g.month}
              year={g.year}
              transactions={g.transactions}
              totals={g.totals}
              page={pages[g.key] || 1}
              expanded={isExpanded}
              onToggle={() => setExpanded(prev => ({ ...prev, [g.key]: !isExpanded }))}
              onPageChange={p => setPages(prev => ({ ...prev, [g.key]: p }))}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )
        })
      )}
    </div>
  )
}
