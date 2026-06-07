"use client"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { LogOut, Plus, Check, X, ChevronDown, Activity, User, Home, ArrowUpRight, Wallet, Sparkles, Lightbulb, TrendingUp, TrendingDown, PiggyBank, Target, Calendar, CreditCard } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "./_components/constants"
import { useCountUp, useSoundPref, playSuccessSound, parseTxDate } from "./_components/helpers"
import EmptyState from "./_components/EmptyState"
import HomeTab from "./HomeTab"
import StatsTab from "./StatsTab"
import WalletTab from "./WalletTab"
import ProfileTab from "./ProfileTab"
import EditTransactionModal from "./_components/EditTransactionModal"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [activeNav, setActiveNav] = useState("home")
  const [soundEnabled, setSoundEnabled] = useSoundPref()

  // Form state
  const [txType, setTxType] = useState("expense")
  const [formData, setFormData] = useState({ tanggal: new Date().toISOString().split("T")[0], keterangan: "", kategori: "", jumlah: "", akunBank: "", catatan: "" })
  const [rawAmount, setRawAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [editingTx, setEditingTx] = useState(null)

  // Stats state
  const [selectedMonth, setSelectedMonth] = useState("Semua Bulan")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedAccount, setSelectedAccount] = useState("Semua Akun")
  const [categoryFilter, setCategoryFilter] = useState(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Comparison state
  const [compareMode, setCompareMode] = useState(false)
  const [compareMonthA, setCompareMonthA] = useState(AVAILABLE_MONTHS[new Date().getMonth()])
  const [compareYearA, setCompareYearA] = useState(new Date().getFullYear().toString())
  const [compareMonthB, setCompareMonthB] = useState(AVAILABLE_MONTHS[new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1])
  const [compareYearB, setCompareYearB] = useState(new Date().getMonth() === 0 ? (new Date().getFullYear() - 1).toString() : new Date().getFullYear().toString())

  // Calendar state for daily expense heatmap
  const [calMonth, setCalMonth] = useState(AVAILABLE_MONTHS[new Date().getMonth()])
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectedDayTx, setSelectedDayTx] = useState(null)

  // Drill-down modal
  const [drillDown, setDrillDown] = useState(null)

  // Scroll Y for P8 parallax
  const [scrollY, setScrollY] = useState(0)

  const fetchData = useCallback(() => {
    if (!session) return
    if (data) setRefreshing(true)
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(e => { setError(e.message) })
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [session, data])

  useEffect(() => { if (session && !data) fetchData() }, [session, data, fetchData])

  // P8: Parallax scroll listener
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Pull-to-refresh
  const [pullDistance, setPullDistance] = useState(0)
  const [pullRefreshing, setPullRefreshing] = useState(false)
  const pullStartY = useRef(0)
  const pullDistRef = useRef(0)
  const contentRef = useRef(null)

  const handleTouchStart = useCallback((e) => {
    if (contentRef.current && contentRef.current.scrollTop <= 0) {
      pullStartY.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (pullStartY.current === 0) return
    const dy = e.touches[0].clientY - pullStartY.current
    if (dy <= 0) { setPullDistance(0); pullDistRef.current = 0; return }
    const d = Math.min(dy * 0.5, 120)
    setPullDistance(d)
    pullDistRef.current = d
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (pullDistRef.current >= 60) {
      setPullRefreshing(true)
      fetchData()
      setTimeout(() => setPullRefreshing(false), 1200)
    }
    setPullDistance(0)
    pullDistRef.current = 0
    pullStartY.current = 0
  }, [fetchData])

  const showToast = (msg, type = "success", action = null) => {
    setToast({ msg, type, action })
    setTimeout(() => setToast(t => (t && t.msg === msg ? null : t)), 5000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.tanggal || !formData.kategori || !rawAmount) {
      showToast("Tanggal, kategori, dan jumlah wajib diisi!", "error")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, jumlah: rawAmount.replace(/\./g, ""), type: txType }),
      })
      const result = await res.json()
      if (result.success) {
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50)
        if (soundEnabled) playSuccessSound()
        showToast("Transaksi berhasil disimpan! ✓")
        setFormData({ tanggal: new Date().toISOString().split("T")[0], keterangan: "", kategori: "", jumlah: "", akunBank: "", catatan: "" })
        setRawAmount("")
        fetchData()
      } else {
        showToast(result.error || "Gagal menyimpan", "error")
      }
    } catch (err) {
      showToast("Terjadi kesalahan", "error")
    }
    setSubmitting(false)
  }

  const handleEditSave = () => {
    setEditingTx(null)
    if (soundEnabled) playSuccessSound()
    showToast("Transaksi diperbarui ✓")
    fetchData()
  }

  const handleDelete = async (tx) => {
    if (!confirm(`Hapus transaksi ${tx.category} - ${formatRpForConfirm(tx.amount)}?`)) return
    try {
      const res = await fetch(`/api/transaction/${tx.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tab: tx.type === "income" ? "Pemasukan" : tx.type === "savings" ? "Tabungan" : "Pengeluaran",
          rowIndex: tx.rowIndex,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Gagal menghapus")
      }
      showToast("Transaksi dihapus")
      fetchData()
    } catch (err) {
      showToast(err.message, "error")
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl mesh-violet animate-glow" />
          <div className="absolute inset-0 w-14 h-14 border-4 border-violet-300 border-t-transparent rounded-2xl animate-spin" />
        </div>
        <p className="text-sm font-semibold text-earth-600">Memuat data keuangan...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-strong rounded-[32px] p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <X size={24} className="text-rose-500" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-earth-900 mb-2 font-display">Gagal Memuat Data</h2>
          <p className="text-sm text-earth-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button onClick={() => { setError(null); setLoading(true); fetchData() }} className="w-full py-3.5 rounded-2xl text-white font-semibold mesh-violet shadow-pop active:scale-95 transition-transform">
              Coba Lagi
            </button>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full py-3.5 rounded-2xl text-rose-500 font-semibold bg-rose-50 active:scale-95 transition-transform">
              Log Out & Relogin
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Statistics Derived Data ---
  const isAllMonths = selectedMonth === "Semua Bulan"
  const isAllYears = selectedYear === "Semua Tahun"
  const isAllAccounts = selectedAccount === "Semua Akun"
  const hasDateRange = dateFrom || dateTo

  const filteredTransactions = useMemo(() => (data?.transactions || []).filter(t => {
    if (!isAllYears && t.year !== selectedYear) return false
    if (!isAllMonths && t.month !== selectedMonth) return false
    if (!isAllAccounts && (t.account || "") !== selectedAccount) return false
    if (categoryFilter && t.category !== categoryFilter) return false
    if (hasDateRange) {
      const txTime = parseTxDate(t.date)
      if (dateFrom && txTime < parseTxDate(`${dateFrom.split("-")[2]} ${AVAILABLE_MONTHS[+dateFrom.split("-")[1] - 1]} ${dateFrom.split("-")[0]}`)) return false
      if (dateTo && txTime > parseTxDate(`${dateTo.split("-")[2]} ${AVAILABLE_MONTHS[+dateTo.split("-")[1] - 1]} ${dateTo.split("-")[0]}`) + 86400000 - 1) return false
    }
    return true
  }), [data, isAllYears, isAllMonths, isAllAccounts, selectedYear, selectedMonth, selectedAccount, categoryFilter, dateFrom, dateTo, hasDateRange])

  const statIncome = filteredTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const statExpense = filteredTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const statSavings = filteredTransactions.filter(t => t.type === "savings").reduce((s, t) => s + t.amount, 0)
  const statSurplus = statIncome - statExpense

  const expenseCategoryMap = {}
  filteredTransactions.filter(t => t.type === "expense").forEach(t => {
    expenseCategoryMap[t.category] = (expenseCategoryMap[t.category] || 0) + t.amount
  })
  const expenseCategories = Object.entries(expenseCategoryMap).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value)

  const incomeCategoryMap = {}
  filteredTransactions.filter(t => t.type === "income").forEach(t => {
    incomeCategoryMap[t.category] = (incomeCategoryMap[t.category] || 0) + t.amount
  })
  const incomeCategories = Object.entries(incomeCategoryMap).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value)

  let clientMonthlyData = []
  if (isAllMonths) {
    clientMonthlyData = AVAILABLE_MONTHS.map(m => {
      const monthTx = filteredTransactions.filter(t => t.month === m)
      const pemasukan = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const pengeluaran = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const tabungan = monthTx.filter(t => t.type === 'savings').reduce((s, t) => s + t.amount, 0)
      return { month: m, pemasukan, pengeluaran, tabungan, surplus: pemasukan - pengeluaran }
    }).filter(d => d.pemasukan > 0 || d.pengeluaran > 0 || d.tabungan > 0)
  }

  const availableYears = Array.from(new Set(data?.transactions?.map(t => t.year).filter(Boolean) || [])).sort((a,b) => b.localeCompare(a))
  if (availableYears.length === 0) availableYears.push(new Date().getFullYear().toString())

  const availableAccounts = Array.from(new Set((data?.transactions || []).map(t => t.account).filter(Boolean))).sort()

  const getMonthData = (month, year) => {
    const tx = (data?.transactions || []).filter(t => t.month === month && t.year === year)
    const income = tx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
    const expense = tx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
    const savings = tx.filter(t => t.type === "savings").reduce((s, t) => s + t.amount, 0)
    const catMap = {}
    tx.filter(t => t.type === "expense").forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount })
    const categories = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    return { income, expense, savings, surplus: income - expense, categories }
  }
  const compareDataA = getMonthData(compareMonthA, compareYearA)
  const compareDataB = getMonthData(compareMonthB, compareYearB)

  const allCompareCategories = Array.from(new Set([...compareDataA.categories.map(c => c.name), ...compareDataB.categories.map(c => c.name)]))
  const compareChartData = allCompareCategories.map(cat => ({
    category: cat,
    [compareMonthA]: compareDataA.categories.find(c => c.name === cat)?.value || 0,
    [compareMonthB]: compareDataB.categories.find(c => c.name === cat)?.value || 0,
  })).sort((a,b) => (b[compareMonthA] + b[compareMonthB]) - (a[compareMonthA] + a[compareMonthB]))

  const top5Categories = Object.entries(
    (data?.transactions || []).filter(t => t.type === "expense").reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name)

  const trendData = AVAILABLE_MONTHS.map(m => {
    const row = { month: m }
    top5Categories.forEach(cat => {
      row[cat] = (data?.transactions || []).filter(t => t.month === m && t.type === "expense" && t.category === cat).reduce((s, t) => s + t.amount, 0)
    })
    return row
  })

  const expenseRatio = statIncome > 0 ? (statExpense / statIncome) * 100 : 0
  const gaugeAngle = Math.min(expenseRatio / 100 * 180, 180)
  const gaugeColor = expenseRatio < 50 ? THEME.savings : expenseRatio < 80 ? THEME.warning : THEME.danger

  // --- Smart Insights ---
  const insights = useMemo(() => {
    const out = []
    const tx = filteredTransactions
    if (tx.length === 0) return out

    if (statIncome > 0) {
      const ratio = (statExpense / statIncome) * 100
      out.push({
        type: ratio < 50 ? "positive" : ratio < 80 ? "info" : "warning",
        icon: ratio < 50 ? Target : Activity,
        text: ratio < 50 ? `Sangat sehat — ${ratio.toFixed(0)}% income terpakai`
            : ratio < 80 ? `Moderat — ${ratio.toFixed(0)}% income terpakai`
            : `Tinggi — ${ratio.toFixed(0)}% income terpakai`,
        color: ratio < 50 ? THEME.sage : ratio < 80 ? THEME.amber : THEME.danger
      })
    }

    if (expenseCategories.length > 0) {
      const top = expenseCategories[0]
      const pct = (top.value / (statExpense || 1)) * 100
      if (pct > 10) {
        out.push({
          type: "info",
          icon: CreditCard,
          text: `Kategori terbesar: ${top.name} (${pct.toFixed(0)}% dari pengeluaran)`,
          color: THEME.primary
        })
      }
    }

    // H8: "This month vs average" insight
    if (!isAllMonths) {
      const allTx = data?.transactions || []
      const monthExpense = statExpense
      if (allTx.length > 0) {
        const monthGroups = {}
        allTx.filter(t => t.type === "expense").forEach(t => {
          const k = `${t.month} ${t.year}`
          monthGroups[k] = (monthGroups[k] || 0) + t.amount
        })
        const monthValues = Object.values(monthGroups)
        if (monthValues.length >= 2) {
          const avg = monthValues.reduce((s, v) => s + v, 0) / monthValues.length
          if (avg > 0) {
            const delta = ((monthExpense - avg) / avg) * 100
            if (Math.abs(delta) > 10) {
              out.push({
                type: delta > 0 ? "warning" : "positive",
                icon: delta > 0 ? TrendingUp : TrendingDown,
                text: delta > 0
                  ? `Spending ${delta.toFixed(0)}% di atas rata-rata`
                  : `Spending ${Math.abs(delta).toFixed(0)}% di bawah rata-rata`,
                color: delta > 0 ? THEME.danger : THEME.savings
              })
            }
          }
        }
      }
    }

    const allTx = data?.transactions || []

    if (!isAllMonths) {
      const monthIdx = AVAILABLE_MONTHS.indexOf(selectedMonth)
      const prevMonth = AVAILABLE_MONTHS[monthIdx - 1] || AVAILABLE_MONTHS[11]
      const prevYear = monthIdx === 0 ? String(Number(selectedYear) - 1) : selectedYear
      const prevTx = allTx.filter(t => t.month === prevMonth && t.year === prevYear)
      const prevExp = prevTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
      if (prevExp > 0 && statExpense > 0) {
        const delta = ((statExpense - prevExp) / prevExp) * 100
        if (Math.abs(delta) > 5) {
          out.push({
            type: delta > 0 ? "warning" : "positive",
            icon: delta > 0 ? TrendingUp : TrendingDown,
            text: delta > 0
              ? `Pengeluaran naik ${delta.toFixed(0)}% dari ${prevMonth}`
              : `Pengeluaran turun ${Math.abs(delta).toFixed(0)}% dari ${prevMonth}`,
            color: delta > 0 ? THEME.clay : THEME.sage
          })
        }
      }

      if (statSavings > 0) {
        out.push({
          type: "positive",
          icon: PiggyBank,
          text: `Tabungan ${selectedMonth}: ${formatRpForInsights(statSavings)}`,
          color: THEME.moss
        })
      }

      if (isAllAccounts) {
        const acctMap = {}
        tx.filter(t => t.type === "expense").forEach(t => {
          acctMap[t.account || "Unknown"] = (acctMap[t.account || "Unknown"] || 0) + t.amount
        })
        const sorted = Object.entries(acctMap).sort((a, b) => b[1] - a[1])
        if (sorted.length > 0) {
          const [name, val] = sorted[0]
          const pct = (val / (statExpense || 1)) * 100
          out.push({
            type: "info",
            icon: User,
            text: `Akun terbesar: ${name} (${pct.toFixed(0)}% pengeluaran)`,
            color: THEME.primaryDeep
          })
        }
      }

    } else {
      const monthlyExpense = {}
      tx.filter(t => t.type === "expense").forEach(t => {
        const k = `${t.month} ${t.year}`
        monthlyExpense[k] = (monthlyExpense[k] || 0) + t.amount
      })
      const sortedMonths = Object.entries(monthlyExpense).sort((a, b) => b[1] - a[1])
      if (sortedMonths.length >= 2) {
        const [best, bestVal] = sortedMonths[0]
        const [worst, worstVal] = sortedMonths[sortedMonths.length - 1]
        if (bestVal > worstVal * 1.5) {
          out.push({
            type: "info",
            icon: Calendar,
            text: `Pengeluaran tertinggi: ${best}, terendah: ${worst}`,
            color: THEME.primary
          })
        }
      }

      if (statSavings > 0) {
        const savingsPerMonth = {}
        tx.filter(t => t.type === "savings").forEach(t => {
          const k = `${t.month} ${t.year}`
          savingsPerMonth[k] = (savingsPerMonth[k] || 0) + t.amount
        })
        const sortedSav = Object.entries(savingsPerMonth).sort((a, b) => b[1] - a[1])
        if (sortedSav.length >= 2) {
          const [bestKey, bestVal] = sortedSav[0]
          const avg = sortedSav.reduce((s, [, v]) => s + v, 0) / sortedSav.length
          if (bestVal > avg * 1.3) {
            out.push({
              type: "positive",
              icon: PiggyBank,
              text: `Tabungan terbaik: ${bestKey} (${Math.round(((bestVal - avg) / avg) * 100)}% di atas rata-rata)`,
              color: THEME.moss
            })
          }
        }
      }

      if (isAllAccounts) {
        const acctMap = {}
        tx.forEach(t => {
          acctMap[t.account || "Unknown"] = (acctMap[t.account || "Unknown"] || 0) + t.amount
        })
        const sorted = Object.entries(acctMap).sort((a, b) => b[1] - a[1])
        if (sorted.length > 0) {
          const [name, val] = sorted[0]
          out.push({
            type: "info",
            icon: User,
            text: `Akun paling aktif: ${name}`,
            color: THEME.primaryDeep
          })
        }
      }
    }

    return out.slice(0, 5)
  }, [filteredTransactions, isAllMonths, isAllAccounts, selectedMonth, selectedYear, statIncome, statExpense, statSavings, expenseCategories, data])

  const DAY_HEADERS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
  const calMonthIdx = AVAILABLE_MONTHS.indexOf(calMonth)
  const daysInCalMonth = new Date(calYear, calMonthIdx + 1, 0).getDate()
  const firstDayOfWeek = new Date(calYear, calMonthIdx, 1).getDay()

  const calendarDayTotals = {}
  ;(data?.transactions || []).filter(t => t.type === "expense" && t.month === calMonth && String(t.year) === String(calYear)).forEach(t => {
    const dayMatch = t.date?.match(/^(\d+)/)
    if (dayMatch) {
      const day = parseInt(dayMatch[1], 10)
      calendarDayTotals[day] = (calendarDayTotals[day] || 0) + t.amount
    }
  })

  const calGrid = []
  let dayCount = 1
  const totalCells = Math.ceil((firstDayOfWeek + daysInCalMonth) / 7) * 7
  for (let cell = 0; cell < totalCells; cell++) {
    if (cell < firstDayOfWeek || dayCount > daysInCalMonth) {
      calGrid.push(null)
    } else {
      calGrid.push({ day: dayCount, amount: calendarDayTotals[dayCount] || 0 })
      dayCount++
    }
  }
  const calWeeks = []
  for (let i = 0; i < calGrid.length; i += 7) {
    calWeeks.push(calGrid.slice(i, i + 7))
  }

  const handleDayClick = (day) => {
    if (!day) return
    const txs = (data?.transactions || []).filter(t =>
      t.type === "expense" && t.month === calMonth && String(t.year) === String(calYear) && t.date?.startsWith(String(day.day))
    )
    setSelectedDayTx({ day: day.day, transactions: txs })
  }

  const navigateCalendar = (delta) => {
    let newIdx = calMonthIdx + delta
    let newYear = calYear
    if (newIdx < 0) { newIdx = 11; newYear-- }
    if (newIdx > 11) { newIdx = 0; newYear++ }
    setCalMonth(AVAILABLE_MONTHS[newIdx])
    setCalYear(newYear)
  }

  const openQuickAdd = (type = "expense") => {
    setTxType(type)
    setActiveNav("wallet")
  }

  const topCategory = expenseCategories[0] || { name: "—", value: 0 }
  const topCategoryPct = statExpense > 0 ? (topCategory.value / statExpense) * 100 : 0

  const recent5 = (data?.transactions || [])
    .slice()
    .sort((a, b) => parseTxDate(b.date) - parseTxDate(a.date))
    .slice(0, 5)

  return (
    <div className="min-h-screen pb-44 font-body relative text-earth-800">
      {/* P8: Parallax background */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-organic" style={{ transform: `translateY(${scrollY * -0.15}px)` }} aria-hidden="true" />

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 z-50 px-6 py-3 rounded-2xl shadow-pop-lg text-sm font-semibold text-white flex items-center gap-3 animate-slide-down"
          style={{ transform: "translateX(-50%)", background: toast.type === "error" ? THEME.danger : toast.type === "info" ? THEME.primary : "linear-gradient(135deg, #5b8c7a, #7aab9a)" }} role="status" aria-live="polite">
          {toast.type === "error" ? <X size={16} strokeWidth={3} aria-hidden="true" /> : <Check size={16} strokeWidth={3} aria-hidden="true" />}
          {toast.msg}
          {toast.action && (
            <button onClick={toast.action.onClick} className="ml-2 px-2 py-1 rounded-lg bg-white/20 text-xs font-bold hover:bg-white/30">
              {toast.action.label}
            </button>
          )}
        </div>
      )}

      {/* Header with P4 animated gradient */}
      <header className="sticky top-0 z-20 px-5 pt-6 pb-3 glass-nav safe-top">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-earth-500">
              {activeNav === "home" ? "Overview" : activeNav === "stats" ? "Statistics" : activeNav === "wallet" ? "New Transaction" : "Profile"}
            </p>
            <h1 className="text-2xl font-display font-bold text-earth-900 tracking-tight leading-tight mt-0.5">
              {activeNav === "home" && (data?.transactions?.[0] ? "Halo 👋" : "Keuangan")}
              {activeNav === "home" && session?.user?.name?.split(" ")[0] ? `, ${session.user.name.split(" ")[0]}` : ""}
              {activeNav === "stats" && "Statistics"}
              {activeNav === "wallet" && "Add Transaction"}
              {activeNav === "profile" && "Profile"}
            </h1>
          </div>
          {activeNav === "home" && (
            <button onClick={() => setActiveNav("profile")} aria-label="Open profile" className="relative active:scale-95 transition-transform flex-shrink-0 ml-3">
              <img src={session?.user?.image} alt="" className="w-11 h-11 rounded-2xl border-2 border-white shadow-warm" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-moss-500 border-2 border-cream-50 rounded-full" />
            </button>
          )}
        </div>
        {/* P4: Animated gradient bar */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-0.5 rounded-full mesh-aurora animate-gradient opacity-60" aria-hidden="true" />
      </header>

      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || pullRefreshing) && (
        <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-center transition-all duration-300 overflow-hidden"
          style={{ height: pullRefreshing ? 48 : pullDistance, background: pullDistance >= 60 ? THEME.surfaceWarm : "transparent" }} aria-hidden="true">
          <div className={`flex items-center gap-2 text-xs font-bold text-earth-500 transition-all duration-300 ${pullRefreshing ? "opacity-100" : pullDistance >= 60 ? "opacity-100" : "opacity-0"}`}>
            {pullRefreshing ? (
              <><div className="w-4 h-4 border-2 border-earth-400 border-t-transparent rounded-full animate-spin" /> Memperbarui...</>
            ) : (
              <><ArrowUpRight size={14} className="rotate-90" /> Lepaskan untuk memperbarui</>
            )}
          </div>
        </div>
      )}

      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative z-10 max-w-3xl mx-auto"
        style={{ transform: `translateY(${pullDistance}px)`, transition: pullDistance === 0 ? "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)" : "none" }}
      >
        {activeNav === "home" && (
          <HomeTab
            data={data} session={session}
            statIncome={statIncome} statExpense={statExpense} statSavings={statSavings}
            topCategory={topCategory} topCategoryPct={topCategoryPct}
            insights={insights}
            expenseRatio={expenseRatio} gaugeAngle={gaugeAngle} gaugeColor={gaugeColor}
            recent5={recent5}
            setActiveNav={setActiveNav} openQuickAdd={openQuickAdd} setDrillDown={setDrillDown}
          />
        )}
        {activeNav === "stats" && (
          <StatsTab
            data={data}
            filteredTransactions={filteredTransactions}
            statIncome={statIncome} statExpense={statExpense} statSavings={statSavings} statSurplus={statSurplus}
            expenseCategories={expenseCategories} incomeCategories={incomeCategories}
            availableYears={availableYears} availableAccounts={availableAccounts}
            selectedMonth={selectedMonth} selectedYear={selectedYear} selectedAccount={selectedAccount} categoryFilter={categoryFilter}
            dateFrom={dateFrom} dateTo={dateTo}
            setSelectedMonth={setSelectedMonth} setSelectedYear={setSelectedYear} setSelectedAccount={setSelectedAccount} setCategoryFilter={setCategoryFilter}
            setDateFrom={setDateFrom} setDateTo={setDateTo}
            clientMonthlyData={clientMonthlyData}
            top5Categories={top5Categories} trendData={trendData}
            compareMode={compareMode} compareMonthA={compareMonthA} compareYearA={compareYearA} compareMonthB={compareMonthB} compareYearB={compareYearB}
            compareDataA={compareDataA} compareDataB={compareDataB} compareChartData={compareChartData}
            setCompareMode={setCompareMode} setCompareMonthA={setCompareMonthA} setCompareYearA={setCompareYearA} setCompareMonthB={setCompareMonthB} setCompareYearB={setCompareYearB}
            calMonth={calMonth} calYear={calYear} calMonthIdx={calMonthIdx} calWeeks={calWeeks} calendarDayTotals={calendarDayTotals}
            navigateCalendar={navigateCalendar} handleDayClick={handleDayClick}
            insights={insights}
            isAllMonths={isAllMonths} refreshing={refreshing}
          />
        )}
        {activeNav === "wallet" && (
          <WalletTab
            txType={txType} formData={formData} rawAmount={rawAmount} submitting={submitting}
            setTxType={setTxType} setFormData={setFormData} setRawAmount={setRawAmount} handleSubmit={handleSubmit}
          />
        )}
        {activeNav === "profile" && (
          <ProfileTab session={session} data={data} signOut={signOut} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} />
        )}
      </div>

      {/* Day transactions modal */}
      {selectedDayTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(42,32,24,0.5)", backdropFilter: "blur(8px)" }} onClick={() => setSelectedDayTx(null)}>
          <div className="glass-strong rounded-t-[32px] sm:rounded-[32px] p-6 shadow-pop-lg w-full max-w-md max-h-[80vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold font-display text-earth-800">{selectedDayTx.day} {calMonth} {calYear}</h3>
              <button onClick={() => setSelectedDayTx(null)} aria-label="Close day transactions" className="w-8 h-8 rounded-full bg-earth-50 hover:bg-earth-100 transition-colors flex items-center justify-center">
                <X size={14} color={THEME.textSecondary} aria-hidden="true" />
              </button>
            </div>
            {selectedDayTx.transactions.length === 0 ? (
              <p className="text-xs text-earth-500 text-center py-4">Tidak ada pengeluaran pada hari ini</p>
            ) : (
              <div className="space-y-3">
                {selectedDayTx.transactions.map((t, i) => (
                  <div key={i} className="flex justify-between items-center pb-3 border-b border-earth-100 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-earth-800">{t.category}</p>
                      {t.desc && <p className="text-xs text-earth-500 mt-0.5 truncate">{t.desc}</p>}
                    </div>
                    <p className="font-bold text-sm text-clay-500 ml-3">-{formatRpForConfirm(t.amount)}</p>
                  </div>
                ))}
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-xs font-bold text-earth-600">Total</span>
                  <span className="text-sm font-bold text-clay-500">
                    -{formatRpForConfirm(selectedDayTx.transactions.reduce((s, t) => s + t.amount, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drill-down modal with Q4: animated counter + Edit/Delete actions */}
      {drillDown && (
        <DrillDownModal
          drillDown={drillDown}
          data={data}
          onClose={() => setDrillDown(null)}
          onEdit={setEditingTx}
          onDelete={handleDelete}
        />
      )}

      {/* Edit modal */}
      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSaved={handleEditSave}
        />
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-5 left-5 right-5 z-30 safe-bottom max-w-md mx-auto" aria-label="Main navigation">
        <div className="glass-nav rounded-[28px] px-3 py-3 flex justify-between items-center">
          {[
            { id: "home", label: "Overview", icon: Home, aria: "Overview tab" },
            { id: "stats", label: "Statistics", icon: Activity, aria: "Statistics tab" },
            { id: "wallet", label: "Add", icon: Plus, isFab: true, aria: "Add transaction tab" },
            { id: "profile", label: "Profile", icon: User, aria: "Profile tab" },
          ].map((nav) => {
            const isActive = activeNav === nav.id
            if (nav.isFab) {
              return (
                <button key={nav.id} onClick={() => setActiveNav(nav.id)} aria-label={nav.aria} aria-current={isActive ? "page" : undefined} className="-mt-8 active:scale-95 transition-transform">
                  <div className="w-14 h-14 rounded-2xl mesh-aurora shadow-pop flex items-center justify-center" style={{ boxShadow: "0 12px 32px rgba(124,95,207,0.4)" }}>
                    <nav.icon size={24} color="white" strokeWidth={2.5} aria-hidden="true" />
                  </div>
                </button>
              )
            }
            return (
              <button key={nav.id} onClick={() => setActiveNav(nav.id)} aria-label={nav.aria} aria-current={isActive ? "page" : undefined} className="flex flex-col items-center gap-0.5 group relative px-3 py-1 rounded-2xl transition-all">
                {isActive && (
                  <span className="absolute inset-0 rounded-2xl animate-scale-in" style={{ background: THEME.surfaceWarm }} />
                )}
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${isActive ? '-translate-y-0.5' : ''}`}>
                  <nav.icon size={20} color={isActive ? THEME.textPrimary : THEME.textTertiary} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                </div>
                <span className={`relative text-[9px] font-bold tracking-wide transition-all ${isActive ? 'text-earth-800' : 'text-earth-500'}`}>
                  {nav.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function DrillDownModal({ drillDown, data, onClose, onEdit, onDelete }) {
  const txs = useMemo(() => (data?.transactions || [])
    .filter(t => t.type === drillDown.type)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10), [data, drillDown.type])

  const total = useMemo(() => txs.reduce((s, t) => s + t.amount, 0), [txs])
  const animatedTotal = useCountUp(total)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(42,32,24,0.5)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="glass-strong rounded-t-[32px] sm:rounded-[32px] p-6 shadow-pop-lg w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Top 10 Transaksi</p>
            <h3 className="text-lg font-display font-bold text-earth-800">{drillDown.title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close drill-down" className="w-8 h-8 rounded-full bg-earth-50 hover:bg-earth-100 transition-colors flex items-center justify-center">
            <X size={14} color={THEME.textSecondary} aria-hidden="true" />
          </button>
        </div>
        {txs.length === 0 ? (
          <EmptyState icon={<Wallet size={20} />} title="Belum ada transaksi" />
        ) : (
          <>
            <div className="rounded-2xl p-3 mb-3" style={{ background: THEME.surfaceWarm }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500 mb-0.5">Total Top 10</p>
              <p className="text-xl font-display font-bold" style={{ color: drillDown.type === "income" ? THEME.income : drillDown.type === "savings" ? THEME.savings : THEME.expense }}>
                {formatRpForConfirm(animatedTotal)}
              </p>
            </div>
            <div className="space-y-2.5">
              {txs.map((t, i) => {
                const colorOfType = drillDown.type === "income" ? THEME.income : drillDown.type === "savings" ? THEME.savings : THEME.expense
                return (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-2xl hover:bg-earth-50/80 transition-colors group">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-[10px] flex-shrink-0"
                      style={{ background: colorOfType + "18", color: colorOfType }}>
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-earth-800 truncate">{t.category}</p>
                      <p className="text-[10px] text-earth-500 mt-0.5">{t.date} · {t.desc || "—"}</p>
                    </div>
                    <p className="font-bold text-sm flex-shrink-0"
                      style={{ color: colorOfType }}>
                      {drillDown.type === "income" ? "+" : drillDown.type === "savings" ? "" : "-"}{formatRpForConfirm(t.amount)}
                    </p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(t)} aria-label={`Edit ${t.category}`} className="w-7 h-7 rounded-lg bg-earth-50 hover:bg-violet-100 flex items-center justify-center text-earth-600 hover:text-violet-600">
                        <span className="text-xs">✎</span>
                      </button>
                      <button onClick={() => onDelete(t)} aria-label={`Delete ${t.category}`} className="w-7 h-7 rounded-lg bg-earth-50 hover:bg-rose-100 flex items-center justify-center text-earth-600 hover:text-rose-500">
                        <span className="text-xs">×</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function formatRpForConfirm(amount) {
  if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)} jt`
  if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(0)} rb`
  return `Rp ${amount}`
}

function formatRpForInsights(amount) {
  if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)} jt`
  if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(0)} rb`
  return `Rp ${amount}`
}
