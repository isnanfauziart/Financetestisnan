"use client"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef, useCallback } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line, LineChart, Legend } from "recharts"
import { LogOut, Plus, Check, X, ChevronDown, ChevronLeft, ChevronRight, Activity, CreditCard, User, Home, ArrowUpRight, ArrowDownRight, Wallet, Calendar, Sparkles, TrendingUp, TrendingDown, Lightbulb, Filter, XCircle, Target, Zap, ArrowRight, PiggyBank } from "lucide-react"

// Extended color palette
const THEME = {
  bg: "#fefaf3",
  surface: "#ffffff",
  surfaceMuted: "#fdf6ea",
  surfaceWarm: "#f6efe5",
  textPrimary: "#2a2018",
  textSecondary: "#6b5b4f",
  textTertiary: "#9c8978",
  income: "#7c8c5a",
  incomeBg: "#f4f6ec",
  expense: "#c47d5a",
  expenseBg: "#fbf0e9",
  savings: "#5b8c7a",
  savingsBg: "#ebf3f0",
  primary: "#7c5fcf",
  primaryBg: "#f3effc",
  primaryDeep: "#6349a8",
  warning: "#d4a853",
  warningBg: "#fdf7e8",
  danger: "#c44545",
  dangerBg: "#fbecec",
  heroBg: "#4a3d33",
  heroMid: "#6b5b4f",
  heroLight: "#8c7b6a",
}

const COLORS = ["#7c8c5a", "#c47d5a", "#5b8c7a", "#9f87ef", "#d4a853", "#5069cc", "#c44545", "#7aab9a", "#d99a7d", "#a8b3e6"]

const EXPENSE_CATEGORIES = [
  "Transportasi","Sedekah","Elektronik","Healthcare","Utang","Body Care",
  "Musibah","Kondangan","Makan di luar","Makan di rumah","Hiburan","Jajan",
  "Skincare","Belanja","Laundry","Ilmu","Pakaian", "Tabungan Cash"
]
const INCOME_CATEGORIES = ["Monthly Salary","Insentif","Reimbursement","Pemberian"]
const SAVINGS_CATEGORIES = ["Tabungan Cash","Emas","Saham"]
const BANK_ACCOUNTS = ["Cash","Bank BCA","Bank BNI","Bank BRI","Bank Mandiri","OVO","DANA","ShoopePay","Gopay","BSI","Other Bank"]
const AVAILABLE_MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]

function formatRp(amount) {
  if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)} jt`
  if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(0)} rb`
  return `Rp ${amount}`
}
function formatRpFull(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount)
}
function formatInputRupiah(val) {
  const num = val.replace(/[^0-9]/g, "")
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-strong rounded-2xl p-3 text-xs">
        <p className="font-semibold text-earth-800 mb-1.5">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }} className="font-medium">
            {p.name}: <span className="font-bold">{formatRp(p.value)}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

function SelectField({ label, value, onChange, options, placeholder, isDark = false }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const ddRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 200 })

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const dw = Math.max(rect.width, 160)
      const vw = window.innerWidth
      let left = rect.left
      if (left + dw > vw - 8) left = vw - dw - 8
      setPos({ top: rect.bottom + 4, left: Math.max(8, left), width: dw })
    }
  }, [])

  useEffect(() => {
    if (!open) return
    updatePos()
    const handleOutside = (e) => {
      const isOutsideBtn = btnRef.current && !btnRef.current.contains(e.target)
      const isOutsideDd = !ddRef.current || (ddRef.current && !ddRef.current.contains(e.target))
      if (isOutsideBtn && isOutsideDd) setOpen(false)
    }
    window.addEventListener("scroll", updatePos, { passive: true })
    window.addEventListener("resize", updatePos, { passive: true })
    document.addEventListener("mousedown", handleOutside)
    return () => {
      window.removeEventListener("scroll", updatePos)
      window.removeEventListener("resize", updatePos)
      document.removeEventListener("mousedown", handleOutside)
    }
  }, [open, updatePos])

  return (
    <div className="relative">
      {label && <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">{label}</label>}
      <button
        ref={btnRef}
        type="button"
        onClick={() => { if (!open) updatePos(); setOpen(!open) }}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm text-left transition-all active:scale-[0.98] ${
          isDark ? "bg-white/15 text-white hover:bg-white/20" : "glass text-earth-800 hover:bg-white/90"
        }`}
      >
        <span className="truncate font-medium">{value || placeholder}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 flex-shrink-0 ml-2 ${open ? "rotate-180" : ""} ${isDark ? "text-white/70" : "text-earth-500"}`} />
      </button>
      {open && (
        <div
          ref={ddRef}
          className="fixed z-[9999] glass-strong rounded-2xl overflow-hidden shadow-pop-lg"
          style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: "50vh", overflowY: "auto" }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false) }}
              className="w-full text-left px-4 py-3.5 sm:py-3 text-sm hover:bg-earth-100/60 transition-colors border-b last:border-b-0 border-earth-100/40"
              style={{ color: value === opt ? THEME.primary : THEME.textPrimary, fontWeight: value === opt ? 700 : 500 }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target || target === 0) { setValue(0); return }
    let startTime = null
    const animate = (ts) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target])
  return value
}

function PillButton({ active, onClick, children, color = "primary" }) {
  const colorMap = {
    primary: { active: "bg-earth-800 text-white", idle: "text-earth-600 hover:bg-white/80" },
    income: { active: "bg-sage-500 text-white", idle: "text-sage-600 hover:bg-sage-50" },
    expense: { active: "bg-clay-500 text-white", idle: "text-clay-600 hover:bg-clay-50" },
    savings: { active: "bg-moss-500 text-white", idle: "text-moss-600 hover:bg-moss-50" },
  }
  const c = colorMap[color] || colorMap.primary
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 ${active ? c.active : c.idle} ${active ? "shadow-sm" : ""}`}
    >
      {children}
    </button>
  )
}

function EmptyState({ icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-earth-50 flex items-center justify-center mb-3 text-earth-400">
        {icon}
      </div>
      <p className="text-sm font-semibold text-earth-700 mb-1">{title}</p>
      {hint && <p className="text-xs text-earth-500 mb-3 max-w-[220px]">{hint}</p>}
      {action}
    </div>
  )
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeNav, setActiveNav] = useState("home")

  // Form state
  const [txType, setTxType] = useState("expense")
  const [formData, setFormData] = useState({ tanggal: new Date().toISOString().split("T")[0], keterangan: "", kategori: "", jumlah: "", akunBank: "", catatan: "" })
  const [rawAmount, setRawAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  // Stats state
  const [selectedMonth, setSelectedMonth] = useState("Semua Bulan")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedAccount, setSelectedAccount] = useState("Semua Akun")
  const [categoryFilter, setCategoryFilter] = useState(null)

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

  const fetchData = useCallback(() => {
    if (!session) return
    setLoading(true)
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [session])

  useEffect(() => { fetchData() }, [fetchData])

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

  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
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

  // Animated values
  const animatedBalance = useCountUp(data?.totalSurplus || 0)
  const animatedIncome = useCountUp(data?.totalIncome || 0)
  const animatedExpense = useCountUp(data?.totalExpense || 0)
  const animatedSavings = useCountUp(data?.totalSavings || 0)

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
            <X size={24} className="text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-earth-900 mb-2 font-display">Gagal Memuat Data</h2>
          <p className="text-sm text-earth-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button onClick={() => { setError(null); fetchData() }} className="w-full py-3.5 rounded-2xl text-white font-semibold mesh-violet shadow-pop active:scale-95 transition-transform">
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

  const filteredTransactions = (data?.transactions || []).filter(t =>
    (isAllYears || t.year === selectedYear) &&
    (isAllMonths || t.month === selectedMonth) &&
    (isAllAccounts || (t.account || "") === selectedAccount) &&
    (!categoryFilter || t.category === categoryFilter)
  )

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

  // Derived Client Monthly Data for chart and table
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

  // --- Comparison Derived Data ---
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

  // --- Top categories ---
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

  // --- Spending vs Earning Ratio ---
  const expenseRatio = data ? (data.totalExpense / (data.totalIncome || 1)) * 100 : 0
  const gaugeAngle = Math.min(expenseRatio / 100 * 180, 180)
  const gaugeColor = expenseRatio < 50 ? THEME.savings : expenseRatio < 80 ? THEME.warning : THEME.danger
  const gaugeOffset = (1 - gaugeAngle / 180) * 188.5

  // --- Smart Insights ---
  const insights = (() => {
    const out = []
    if (!data?.transactions) return out
    const allTx = data.transactions
    const monthsWithData = Array.from(new Set(allTx.map(t => `${t.month} ${t.year}`)))
    if (monthsWithData.length === 0) return out

    const sortedMonthKeys = monthsWithData.sort((a, b) => {
      const idxA = AVAILABLE_MONTHS.indexOf(a.split(" ")[0])
      const idxB = AVAILABLE_MONTHS.indexOf(b.split(" ")[0])
      const yA = parseInt(a.split(" ")[1])
      const yB = parseInt(b.split(" ")[1])
      return (yA - yB) || (idxA - idxB)
    })
    const lastKey = sortedMonthKeys[sortedMonthKeys.length - 1]
    const prevKey = sortedMonthKeys[sortedMonthKeys.length - 2]

    const sumBy = (key, type, cat) => allTx
      .filter(t => `${t.month} ${t.year}` === key && t.type === type && (!cat || t.category === cat))
      .reduce((s, t) => s + t.amount, 0)

    if (prevKey) {
      // Expense change
      const lastExp = sumBy(lastKey, "expense")
      const prevExp = sumBy(prevKey, "expense")
      if (prevExp > 0) {
        const delta = ((lastExp - prevExp) / prevExp) * 100
        if (Math.abs(delta) > 5) {
          out.push({
            type: delta > 0 ? "warning" : "positive",
            icon: delta > 0 ? TrendingUp : TrendingDown,
            text: delta > 0
              ? `Pengeluaran naik ${delta.toFixed(0)}% dari ${prevKey.split(" ")[0]}`
              : `Pengeluaran turun ${Math.abs(delta).toFixed(0)}% dari ${prevKey.split(" ")[0]}`,
            color: delta > 0 ? THEME.clay : THEME.sage
          })
        }
      }
      // Top category change
      const lastCatMap = {}
      const prevCatMap = {}
      allTx.filter(t => `${t.month} ${t.year}` === lastKey && t.type === "expense").forEach(t => { lastCatMap[t.category] = (lastCatMap[t.category] || 0) + t.amount })
      allTx.filter(t => `${t.month} ${t.year}` === prevKey && t.type === "expense").forEach(t => { prevCatMap[t.category] = (prevCatMap[t.category] || 0) + t.amount })
      let maxDelta = 0; let maxCat = null; let maxPct = 0
      Object.keys(lastCatMap).forEach(cat => {
        const lc = lastCatMap[cat] || 0
        const pc = prevCatMap[cat] || 0
        if (pc > 0) {
          const d = ((lc - pc) / pc) * 100
          if (Math.abs(d) > Math.abs(maxDelta)) { maxDelta = d; maxCat = cat; maxPct = ((lc - pc) / pc) * 100 }
        }
      })
      if (maxCat && Math.abs(maxPct) > 15) {
        out.push({
          type: maxPct > 0 ? "warning" : "positive",
          icon: Zap,
          text: `'${maxCat}' ${maxPct > 0 ? "naik" : "turun"} ${Math.abs(maxPct).toFixed(0)}% dari bulan lalu`,
          color: maxPct > 0 ? THEME.amber : THEME.sage
        })
      }
    }

    // Best savings month
    const savingsByMonth = {}
    allTx.filter(t => t.type === "savings").forEach(t => {
      const k = `${t.month} ${t.year}`
      savingsByMonth[k] = (savingsByMonth[k] || 0) + t.amount
    })
    const sortedSavings = Object.entries(savingsByMonth).sort((a, b) => b[1] - a[1])
    if (sortedSavings.length > 1) {
      const [bestKey, bestVal] = sortedSavings[0]
      const avg = sortedSavings.reduce((s, [, v]) => s + v, 0) / sortedSavings.length
      if (bestVal > avg * 1.4) {
        out.push({
          type: "positive",
          icon: PiggyBank,
          text: `Tabungan terbaik: ${bestKey} (${Math.round(((bestVal - avg) / avg) * 100)}% di atas rata-rata)`,
          color: THEME.moss
        })
      }
    }

    // Spending ratio health
    if (expenseRatio > 0) {
      out.push({
        type: expenseRatio < 50 ? "positive" : expenseRatio < 80 ? "info" : "warning",
        icon: expenseRatio < 50 ? Target : Activity,
        text: expenseRatio < 50 ? `Sangat sehat — ${expenseRatio.toFixed(0)}% income terpakai`
            : expenseRatio < 80 ? `Moderat — ${expenseRatio.toFixed(0)}% income terpakai`
            : `Tinggi — ${expenseRatio.toFixed(0)}% income terpakai`,
        color: expenseRatio < 50 ? THEME.sage : expenseRatio < 80 ? THEME.amber : THEME.danger
      })
    }

    // Top spender insight
    if (expenseCategories.length > 0) {
      const top = expenseCategories[0]
      const pct = (top.value / (statExpense || 1)) * 100
      if (pct > 25) {
        out.push({
          type: "info",
          icon: Sparkles,
          text: `Kategori terbesar: ${top.name} (${pct.toFixed(0)}% dari pengeluaran)`,
          color: THEME.primary
        })
      }
    }

    return out.slice(0, 4)
  })()

  // --- Calendar helpers ---
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

  function heatmapColor(amount) {
    if (!amount || amount === 0) return "#f6efe5"
    if (amount <= 100000) return "#e8d5c0"
    if (amount <= 250000) return "#d4a853"
    if (amount <= 500000) return "#c47d5a"
    return "#8c5a3a"
  }
  function heatmapTextColor(amount) {
    if (!amount || amount <= 250000) return THEME.textPrimary
    return "#fff"
  }

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

  // Quick-add pre-fill
  const openQuickAdd = (type = "expense") => {
    setTxType(type)
    setActiveNav("wallet")
  }

  // Top category for hero card
  const topCategory = expenseCategories[0] || { name: "—", value: 0 }
  const topCategoryPct = statExpense > 0 ? (topCategory.value / statExpense) * 100 : 0

  // Top income / savings for bento tiles
  const recent5 = (data?.transactions || []).slice(0, 5)

  return (
    <div className="min-h-screen pb-32 font-body relative text-earth-800">
      <div className="fixed inset-0 pointer-events-none z-0 bg-organic" />

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 z-50 px-6 py-3 rounded-2xl shadow-pop-lg text-sm font-semibold text-white flex items-center gap-3 animate-slide-down"
          style={{ transform: "translateX(-50%)", background: toast.type === "error" ? THEME.danger : "linear-gradient(135deg, #5b8c7a, #7aab9a)" }}>
          {toast.type === "error" ? <X size={16} strokeWidth={3} /> : <Check size={16} strokeWidth={3} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 px-5 pt-6 pb-3 glass-nav safe-top">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div>
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
            <button onClick={() => setActiveNav("profile")} className="relative active:scale-95 transition-transform">
              <img src={session?.user?.image} alt="avatar" className="w-11 h-11 rounded-2xl border-2 border-white shadow-warm" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-moss-500 border-2 border-cream-50 rounded-full" />
            </button>
          )}
        </div>
      </header>

      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || pullRefreshing) && (
        <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-center transition-all duration-300 overflow-hidden"
          style={{ height: pullRefreshing ? 48 : pullDistance, background: pullDistance >= 60 ? THEME.surfaceWarm : "transparent" }}>
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
        {/* HOME TAB — Bento grid */}
        {activeNav === "home" && (
          <div className="px-5 pt-4 animate-bento-in" key="home-tab">
            {/* Bento Grid */}
            <div className="grid grid-cols-3 gap-3 auto-rows-[110px]">

              {/* Hero — Total Balance (2 cols x 2 rows) */}
              <div className="col-span-2 row-span-2 bento-tile-dark mesh-hero text-white p-5 relative overflow-hidden animate-bento-in stagger-1">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl animate-glow" style={{ background: "radial-gradient(circle, rgba(159,135,239,0.4) 0%, transparent 70%)" }} />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(212,168,83,0.3) 0%, transparent 70%)" }} />

                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Wallet size={12} className="opacity-70" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">Total Balance</p>
                    </div>
                    <h2 className="text-3xl font-display font-bold tracking-tight animate-count-in leading-none">
                      {formatRpFull(animatedBalance)}
                    </h2>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 rounded-2xl px-3 py-2 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <p className="text-[9px] font-bold uppercase tracking-wider opacity-70 mb-0.5">Income</p>
                      <p className="text-sm font-bold flex items-center gap-1">
                        <ArrowDownRight size={11} /> {formatRp(animatedIncome)}
                      </p>
                    </div>
                    <div className="flex-1 rounded-2xl px-3 py-2 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <p className="text-[9px] font-bold uppercase tracking-wider opacity-70 mb-0.5">Expense</p>
                      <p className="text-sm font-bold flex items-center gap-1">
                        <ArrowUpRight size={11} /> {formatRp(animatedExpense)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Category — small */}
              <button
                onClick={() => { setActiveNav("stats") }}
                className="col-span-1 row-span-1 bento-tile mesh-violet text-white p-3.5 relative overflow-hidden text-left animate-bento-in stagger-2 active:scale-95 transition-transform"
              >
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl" style={{ background: "rgba(255,255,255,0.3)" }} />
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <Sparkles size={14} className="opacity-80" />
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider opacity-80">Top</p>
                    <p className="text-[11px] font-bold leading-tight truncate">{topCategory.name}</p>
                    <p className="text-[10px] font-semibold opacity-80 mt-0.5">{topCategoryPct.toFixed(0)}%</p>
                  </div>
                </div>
              </button>

              {/* Quick add — small */}
              <button
                onClick={() => openQuickAdd("expense")}
                className="col-span-1 row-span-1 bento-tile mesh-amber text-white p-3.5 relative overflow-hidden text-left animate-bento-in stagger-3 active:scale-95 transition-transform"
              >
                <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full blur-2xl" style={{ background: "rgba(255,255,255,0.3)" }} />
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <Plus size={14} className="opacity-80" />
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider opacity-80">Quick</p>
                    <p className="text-[11px] font-bold leading-tight">Add</p>
                  </div>
                </div>
              </button>

              {/* Income tile */}
              <button onClick={() => setDrillDown({ type: "income", title: "Pemasukan" })} className="col-span-1 row-span-1 bento-tile bg-sage-50 border border-sage-100 p-3.5 text-left animate-bento-in stagger-4 active:scale-95 transition-transform">
                <div className="h-full flex flex-col justify-between">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: THEME.income + "22", color: THEME.income }}>
                    <ArrowDownRight size={14} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-sage-700">Income</p>
                    <p className="text-sm font-bold text-sage-700 leading-tight">{formatRp(animatedIncome)}</p>
                  </div>
                </div>
              </button>

              {/* Expense tile */}
              <button onClick={() => setDrillDown({ type: "expense", title: "Pengeluaran" })} className="col-span-1 row-span-1 bento-tile bg-clay-50 border border-clay-100 p-3.5 text-left animate-bento-in stagger-5 active:scale-95 transition-transform">
                <div className="h-full flex flex-col justify-between">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: THEME.expense + "22", color: THEME.expense }}>
                    <ArrowUpRight size={14} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-clay-600">Expense</p>
                    <p className="text-sm font-bold text-clay-600 leading-tight">{formatRp(animatedExpense)}</p>
                  </div>
                </div>
              </button>

              {/* Savings tile */}
              <button onClick={() => setDrillDown({ type: "savings", title: "Tabungan" })} className="col-span-1 row-span-1 bento-tile bg-moss-50 border border-moss-100 p-3.5 text-left animate-bento-in stagger-6 active:scale-95 transition-transform">
                <div className="h-full flex flex-col justify-between">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: THEME.savings + "22", color: THEME.savings }}>
                    <PiggyBank size={14} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-moss-600">Savings</p>
                    <p className="text-sm font-bold text-moss-600 leading-tight">{formatRp(animatedSavings)}</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Smart Insights */}
            {insights.length > 0 && (
              <div className="mt-6 animate-bento-in stagger-7">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb size={14} className="text-amber-500" />
                    <h3 className="text-sm font-bold font-display text-earth-800">Smart Insights</h3>
                  </div>
                  <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">{insights.length} baru</span>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {insights.map((ins, i) => {
                    const Icon = ins.icon
                    return (
                      <div key={i} className="insight-card animate-fade-in-up" style={{ background: ins.color + "12", color: ins.color, animationDelay: `${0.05 * i}s` }}>
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: ins.color + "22", boxShadow: `0 4px 12px ${ins.color}30` }}>
                          <Icon size={20} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{ins.type === "positive" ? "Positif" : ins.type === "warning" ? "Perhatian" : "Info"}</p>
                          <p className="text-sm font-semibold text-earth-800 leading-snug mt-0.5">{ins.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Spending gauge */}
            <div className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in stagger-8">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Spending Ratio</p>
                  <p className="text-xs text-earth-600">Pengeluaran / Pemasukan</p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: gaugeColor + "18", color: gaugeColor }}>
                  {expenseRatio < 50 ? "Sehat" : expenseRatio < 80 ? "Moderat" : "Tinggi"}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <svg width="200" height="110" viewBox="0 0 200 110" className="overflow-visible">
                  <defs>
                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={THEME.savings} />
                      <stop offset="50%" stopColor={THEME.warning} />
                      <stop offset="100%" stopColor={THEME.danger} />
                    </linearGradient>
                  </defs>
                  <path d="M20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#ede0d0" strokeWidth="14" strokeLinecap="round" />
                  <path d="M20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round"
                    strokeDasharray="251 251"
                    style={{ "--gauge-offset": `${(1 - gaugeAngle / 180) * 251}px`, animation: `gaugeFill 1.4s cubic-bezier(0.16, 1, 0.3, 1) both` }} />
                  {(() => {
                    const angleRad = (gaugeAngle - 90) * (Math.PI / 180)
                    const cx = 100, cy = 100, len = 52
                    const nx = cx + len * Math.cos(angleRad)
                    const ny = cy + len * Math.sin(angleRad)
                    return <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#2a2018" strokeWidth="3" strokeLinecap="round" />
                  })()}
                  <circle cx="100" cy="100" r="6" fill="#2a2018" />
                </svg>
                <p className="text-3xl font-display font-bold -mt-3" style={{ color: gaugeColor }}>{expenseRatio.toFixed(1)}%</p>
              </div>
            </div>

            {/* Recent transactions */}
            <div className="mt-6 animate-bento-in stagger-9">
              <div className="flex justify-between items-end mb-3 px-1">
                <h3 className="text-base font-bold font-display text-earth-800">Recent</h3>
                <button onClick={() => setActiveNav("stats")} className="text-[11px] font-bold text-violet-600 flex items-center gap-1 hover:gap-2 transition-all">
                  View All <ArrowRight size={12} />
                </button>
              </div>
              {recent5.length === 0 ? (
                <EmptyState
                  icon={<Wallet size={20} />}
                  title="Belum ada transaksi"
                  hint="Tambah transaksi pertama kamu untuk mulai melacak keuangan"
                  action={
                    <button onClick={() => openQuickAdd("expense")} className="text-xs font-bold px-4 py-2 rounded-full text-white mesh-violet shadow-pop">
                      Tambah Transaksi
                    </button>
                  }
                />
              ) : (
                <div className="bento-tile bg-white border border-earth-100 shadow-warm p-2">
                  {recent5.map((t, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-2xl hover:bg-earth-50/60 transition-colors animate-fade-in-up stagger-${i + 1}`}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: t.type === "income" ? THEME.incomeBg : t.type === "savings" ? THEME.savingsBg : THEME.expenseBg }}>
                          {t.type === "income" ? <ArrowDownRight size={16} color={THEME.income} /> : t.type === "savings" ? <PiggyBank size={16} color={THEME.savings} /> : <ArrowUpRight size={16} color={THEME.expense} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-earth-800 truncate">{t.category}</p>
                          <p className="text-[11px] text-earth-500 mt-0.5 truncate">
                            {t.desc || "—"} · {t.date}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-sm flex-shrink-0 ml-2" style={{ color: t.type === "income" ? THEME.income : t.type === "savings" ? THEME.savings : THEME.expense }}>
                        {t.type === "income" ? "+" : t.type === "savings" ? "" : "-"}{formatRp(t.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATS TAB */}
        {activeNav === "stats" && (
          <div className="px-5 pt-4 space-y-5 animate-bento-in" key="stats-tab">
            {/* Filter bar — glass */}
            <div className="glass rounded-2xl p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <SelectField value={selectedYear} onChange={setSelectedYear} options={["Semua Tahun", ...availableYears]} placeholder="Year" />
                <SelectField value={selectedMonth} onChange={setSelectedMonth} options={["Semua Bulan", ...AVAILABLE_MONTHS]} placeholder="Month" />
                <SelectField value={selectedAccount} onChange={setSelectedAccount} options={["Semua Akun", ...availableAccounts]} placeholder="Account" />
              </div>
              {categoryFilter && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">Active filter:</span>
                  <div className="chip chip-active">
                    {categoryFilter}
                    <button onClick={() => setCategoryFilter(null)} className="ml-1 hover:opacity-70">
                      <X size={10} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Smart Insights (compact) */}
            {insights.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <Lightbulb size={13} className="text-amber-500" />
                  <h3 className="text-xs font-bold font-display text-earth-700 uppercase tracking-wider">Insights</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {insights.slice(0, 4).map((ins, i) => {
                    const Icon = ins.icon
                    return (
                      <div key={i} className="insight-card animate-fade-in-up" style={{ background: ins.color + "12", color: ins.color, animationDelay: `${0.05 * i}s` }}>
                        <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: ins.color + "22", boxShadow: `0 4px 12px ${ins.color}30` }}>
                          <Icon size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{ins.type === "positive" ? "Positif" : ins.type === "warning" ? "Perhatian" : "Info"}</p>
                          <p className="text-xs font-semibold text-earth-800 leading-snug mt-0.5">{ins.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stat hero */}
            <div className="bento-tile-dark mesh-hero text-white p-5 shadow-pop relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(159,135,239,0.3) 0%, transparent 70%)" }} />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">Net Profit · {isAllMonths ? "All Months" : selectedMonth}</p>
                    <h2 className="text-3xl font-display font-bold">{formatRpFull(statSurplus)}</h2>
                  </div>
                </div>
                <div className="space-y-3 border-t border-white/15 pt-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="opacity-80">Income</span>
                      <span>{formatRp(statIncome)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (statIncome / (statIncome + statExpense || 1)) * 100)}%`, background: THEME.savings }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="opacity-80">Expense</span>
                      <span>{formatRp(statExpense)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (statExpense / (statIncome + statExpense || 1)) * 100)}%`, background: THEME.expense }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly trend */}
            {isAllMonths && (
              <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm">
                <h3 className="text-sm font-bold mb-3 font-display text-earth-800">Monthly Trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={clientMonthlyData}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#8c7b6a" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="pemasukan" name="Income" fill={THEME.income} radius={[6, 6, 0, 0]} maxBarSize={14} animationBegin={200} animationDuration={800} />
                    <Bar dataKey="pengeluaran" name="Expense" fill={THEME.expense} radius={[6, 6, 0, 0]} maxBarSize={14} animationBegin={400} animationDuration={800} />
                    <Line type="monotone" dataKey="surplus" name="Surplus" stroke={THEME.primary} strokeWidth={3} dot={{ r: 4, fill: THEME.primary, strokeWidth: 2, stroke: "#fff" }} animationBegin={600} animationDuration={800} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pie charts — clickable */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bento-tile bg-white border border-earth-100 p-4 shadow-warm">
                <h3 className="text-xs font-bold text-center mb-2 font-display text-earth-800">Income Mix</h3>
                {incomeCategories.length === 0 ? (
                  <EmptyState icon={<Wallet size={18} />} title="Belum ada" />
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={incomeCategories} cx="50%" cy="50%" innerRadius={42} outerRadius={64}
                        paddingAngle={2} dataKey="value" stroke="none"
                        onClick={(d) => { setCategoryFilter(d.name); setActiveNav("stats") }}
                        labelLine={false}
                        label={({ percent }) => percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : ''}
                        style={{ fontSize: '10px', fontWeight: 700 }}
                        animationBegin={200} animationDuration={800}
                      >
                        {incomeCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {(() => {
                  const incTotal = incomeCategories.reduce((s, c) => s + c.value, 0) || 1
                  return (
                    <div className="mt-2 space-y-1.5">
                      {incomeCategories.slice(0, 6).map((c, i) => {
                        const pct = ((c.value / incTotal) * 100).toFixed(1)
                        return (
                          <div key={c.name} className="flex items-center gap-2 text-[10px]">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="flex-1 truncate font-medium text-earth-700">{c.name}</span>
                            <span className="font-bold text-earth-800">{pct}%</span>
                            <span className="text-earth-500 font-medium">{formatRp(c.value)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
              <div className="bento-tile bg-white border border-earth-100 p-4 shadow-warm">
                <h3 className="text-xs font-bold text-center mb-2 font-display text-earth-800">Expense Mix</h3>
                {expenseCategories.length === 0 ? (
                  <EmptyState icon={<Wallet size={18} />} title="Belum ada" />
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={expenseCategories} cx="50%" cy="50%" innerRadius={42} outerRadius={64}
                        paddingAngle={2} dataKey="value" stroke="none"
                        onClick={(d) => { setCategoryFilter(d.name); setActiveNav("stats") }}
                        labelLine={false}
                        label={({ percent }) => percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : ''}
                        style={{ fontSize: '10px', fontWeight: 700 }}
                        animationBegin={200} animationDuration={800}
                      >
                        {expenseCategories.map((_, i) => <Cell key={(i+3) % COLORS.length} fill={COLORS[(i+3) % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {(() => {
                  const expTotal = expenseCategories.reduce((s, c) => s + c.value, 0) || 1
                  return (
                    <div className="mt-2 space-y-1.5">
                      {expenseCategories.slice(0, 6).map((c, i) => {
                        const pct = ((c.value / expTotal) * 100).toFixed(1)
                        return (
                          <div key={c.name} className="flex items-center gap-2 text-[10px]">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[(i+3) % COLORS.length] }} />
                            <span className="flex-1 truncate font-medium text-earth-700">{c.name}</span>
                            <span className="font-bold text-earth-800">{pct}%</span>
                            <span className="text-earth-500 font-medium">{formatRp(c.value)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Top categories trend */}
            {top5Categories.length > 0 && (
              <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm">
                <h3 className="text-sm font-bold mb-3 font-display text-earth-800">Top Kategori Pengeluaran</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#8c7b6a" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    {top5Categories.map((cat, i) => (
                      <Line key={cat} type="monotone" dataKey={cat} name={cat} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ r: 3, fill: COLORS[i % COLORS.length] }} connectNulls animationBegin={i * 150} animationDuration={800} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Month comparison */}
            <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold font-display text-earth-800">Bandingkan Bulan</h3>
                <button onClick={() => setCompareMode(!compareMode)} className="text-[11px] font-bold py-1.5 px-3 rounded-full transition-all"
                  style={{ background: compareMode ? THEME.heroBg : THEME.surfaceWarm, color: compareMode ? "white" : THEME.textSecondary }}>
                  {compareMode ? "Sembunyikan" : "Bandingkan"}
                </button>
              </div>
              {compareMode && (
                <div className="space-y-4 mt-3 animate-slide-down">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-earth-500 mb-1.5">Bulan A</p>
                      <div className="flex gap-2">
                        <div className="flex-1"><SelectField value={compareMonthA} onChange={setCompareMonthA} options={AVAILABLE_MONTHS} placeholder="Month" /></div>
                        <div className="w-20"><SelectField value={compareYearA} onChange={setCompareYearA} options={availableYears} placeholder="Year" /></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-earth-500 mb-1.5">Bulan B</p>
                      <div className="flex gap-2">
                        <div className="flex-1"><SelectField value={compareMonthB} onChange={setCompareMonthB} options={AVAILABLE_MONTHS} placeholder="Month" /></div>
                        <div className="w-20"><SelectField value={compareYearB} onChange={setCompareYearB} options={availableYears} placeholder="Year" /></div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Pemasukan", a: compareDataA.income, b: compareDataB.income, color: THEME.income },
                      { label: "Pengeluaran", a: compareDataA.expense, b: compareDataB.expense, color: THEME.expense },
                      { label: "Surplus", a: compareDataA.surplus, b: compareDataB.surplus, color: THEME.savings },
                    ].map((item) => {
                      const delta = item.b > 0 ? ((item.a - item.b) / item.b * 100) : 0
                      const isUp = delta > 0
                      return (
                        <div key={item.label} className="rounded-2xl p-3 text-center" style={{ background: THEME.surfaceWarm }}>
                          <p className="text-[10px] font-bold text-earth-500 mb-1">{item.label}</p>
                          <p className="text-sm font-bold" style={{ color: item.color }}>{formatRp(item.a)}</p>
                          <p className="text-[10px] text-earth-500 my-0.5">vs {formatRp(item.b)}</p>
                          {delta !== 0 && (
                            <p className="text-[11px] font-bold" style={{ color: isUp && item.label !== "Pengeluaran" ? THEME.savings : isUp ? THEME.danger : THEME.savings }}>
                              {isUp ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {compareChartData.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-earth-500 mb-2">Perbandingan per Kategori</p>
                      <ResponsiveContainer width="100%" height={Math.max(150, compareChartData.length * 30)}>
                        <BarChart data={compareChartData} layout="vertical" barCategoryGap="30%">
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="category" width={80} tick={{ fontSize: 10, fill: "#8c7b6a" }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey={compareMonthA} name={compareMonthA} fill={THEME.income} radius={[0, 6, 6, 0]} maxBarSize={12} />
                          <Bar dataKey={compareMonthB} name={compareMonthB} fill={THEME.expense} radius={[0, 6, 6, 0]} maxBarSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Daily expense calendar */}
            <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm overflow-hidden">
              <h3 className="text-sm font-bold mb-1 font-display text-earth-800">Peta Pengeluaran Harian</h3>
              <p className="text-[10px] text-earth-500 mb-3">Rincian pengeluaran harian bulan {calMonth} {calYear}</p>
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => navigateCalendar(-1)} className="w-8 h-8 rounded-xl bg-earth-50 hover:bg-earth-100 transition-colors flex items-center justify-center">
                  <ChevronLeft size={14} color={THEME.textSecondary} />
                </button>
                <span className="text-sm font-bold text-earth-800">{calMonth} {calYear}</span>
                <button onClick={() => navigateCalendar(1)} className="w-8 h-8 rounded-xl bg-earth-50 hover:bg-earth-100 transition-colors flex items-center justify-center">
                  <ChevronRight size={14} color={THEME.textSecondary} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1.5">
                {DAY_HEADERS.map(d => (
                  <div key={d} className="text-center text-[9px] font-bold text-earth-500 uppercase py-0.5">{d}</div>
                ))}
              </div>
              <div className="space-y-1">
                {calWeeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-1">
                    {week.map((cell, ci) => {
                      if (!cell) return <div key={ci} className="aspect-square rounded-xl" />
                      const bg = heatmapColor(cell.amount)
                      const txt = heatmapTextColor(cell.amount)
                      return (
                        <button
                          key={ci}
                          onClick={() => handleDayClick(cell)}
                          className="aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer"
                          style={{ background: bg, color: txt }}
                        >
                          <span className="text-[10px] font-bold leading-none">{cell.day}</span>
                          {cell.amount > 0 && (
                            <span className="text-[8px] font-semibold mt-0.5 leading-none" style={{ opacity: 0.85 }}>
                              {cell.amount >= 1000000 ? `${(cell.amount / 1000000).toFixed(1)}jt` : `${(cell.amount / 1000).toFixed(0)}rb`}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-earth-100">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-earth-500">Sedikit</span>
                  <div className="flex-1 h-2.5 rounded-full" style={{ background: "linear-gradient(90deg, #f6efe5 0%, #e8d5c0 25%, #d4a853 50%, #c47d5a 75%, #8c5a3a 100%)" }} />
                  <span className="text-[9px] font-bold text-earth-500">Banyak</span>
                </div>
              </div>
            </div>

            {/* Overview table */}
            <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm overflow-hidden">
              <h3 className="text-sm font-bold mb-3 font-display text-earth-800">{isAllMonths ? "Annual Overview" : "Monthly Breakdown"}</h3>
              {isAllMonths ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr>
                        <th className="pb-3 text-[10px] font-bold text-earth-500 uppercase tracking-wider pr-3 border-b border-earth-100">Bulan</th>
                        <th className="pb-3 text-[10px] font-bold text-earth-500 uppercase tracking-wider pr-3 border-b border-earth-100">Pemasukan</th>
                        <th className="pb-3 text-[10px] font-bold text-earth-500 uppercase tracking-wider pr-3 border-b border-earth-100">Pengeluaran</th>
                        <th className="pb-3 text-[10px] font-bold text-earth-500 uppercase tracking-wider pr-3 border-b border-earth-100">Selisih</th>
                        <th className="pb-3 text-[10px] font-bold text-earth-500 uppercase tracking-wider text-right border-b border-earth-100">Tabungan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientMonthlyData.map((row, i) => (
                        <tr key={i} className={`hover:bg-earth-50/60 transition-colors animate-fade-in-up stagger-${(i % 10) + 1}`}>
                          <td className="py-3 text-xs font-semibold pr-3 border-b border-earth-100/60">{row.month}</td>
                          <td className="py-3 text-xs text-sage-600 font-bold pr-3 border-b border-earth-100/60">{formatRp(row.pemasukan)}</td>
                          <td className="py-3 text-xs text-clay-500 font-bold pr-3 border-b border-earth-100/60">{formatRp(row.pengeluaran)}</td>
                          <td className="py-3 text-xs font-semibold pr-3 border-b border-earth-100/60 text-earth-800">{formatRp(row.surplus)}</td>
                          <td className="py-3 text-xs font-bold text-right border-b border-earth-100/60 text-moss-500">{formatRp(row.tabungan)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.slice(0, 15).map((t, idx) => (
                    <div key={idx} className={`flex justify-between items-center pb-3 border-b border-earth-100/60 last:border-0 last:pb-0 animate-fade-in-up stagger-${(idx % 10) + 1}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-earth-50 flex items-center justify-center font-bold text-[10px] text-earth-600 text-center leading-tight">
                          {t.date.slice(0,5)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-earth-800">{t.category}</p>
                          <p className="text-[11px] text-earth-500 mt-0.5">{t.desc || t.type}</p>
                        </div>
                      </div>
                      <p className="font-bold text-sm" style={{ color: t.type === "income" ? THEME.income : t.type === "savings" ? THEME.savings : THEME.textPrimary }}>
                        {t.type === "income" ? "+" : "-"}{formatRp(t.amount)}
                      </p>
                    </div>
                  ))}
                  {filteredTransactions.length === 0 && <p className="text-center text-xs text-earth-500 py-4">No transactions found.</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* WALLET TAB */}
        {activeNav === "wallet" && (
          <div className="px-5 pt-4 animate-bento-in" key="wallet-tab">
            <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm">
              <div className="flex gap-2 mb-5 p-1.5 rounded-2xl" style={{ background: THEME.surfaceWarm }}>
                <button onClick={() => { setTxType("expense"); setFormData(f => ({ ...f, kategori: "" })) }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${txType === "expense" ? "bg-white text-earth-800 shadow-warm" : "text-earth-500"}`}>
                  Expense
                </button>
                <button onClick={() => { setTxType("income"); setFormData(f => ({ ...f, kategori: "" })) }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${txType === "income" ? "bg-white text-earth-800 shadow-warm" : "text-earth-500"}`}>
                  Income
                </button>
                <button onClick={() => { setTxType("savings"); setFormData(f => ({ ...f, kategori: "" })) }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${txType === "savings" ? "bg-white text-earth-800 shadow-warm" : "text-earth-500"}`}>
                  Tabungan
                </button>
              </div>

              <div className="text-center mb-6 mt-2">
                <p className="text-[10px] font-bold text-earth-500 uppercase tracking-wider mb-2">Amount</p>
                <h2 className="text-4xl font-display font-bold" style={{ color: txType === "expense" ? THEME.textPrimary : txType === "savings" ? THEME.savings : THEME.income }}>
                  {rawAmount ? `Rp ${rawAmount}` : "Rp 0"}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Amount</label>
                    <input type="text" inputMode="numeric" placeholder="0" value={rawAmount} onChange={e => setRawAmount(formatInputRupiah(e.target.value))}
                      className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200 transition-shadow" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Date</label>
                    <input type="date" value={formData.tanggal} onChange={e => setFormData(f => ({ ...f, tanggal: e.target.value }))}
                      className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none" />
                  </div>
                </div>
                <SelectField label="Category" value={formData.kategori} onChange={v => setFormData(f => ({ ...f, kategori: v }))}
                  options={txType === "expense" ? EXPENSE_CATEGORIES : txType === "savings" ? SAVINGS_CATEGORIES : INCOME_CATEGORIES} placeholder="Select Category" />
                <SelectField label="Bank Account" value={formData.akunBank} onChange={v => setFormData(f => ({ ...f, akunBank: v }))}
                  options={BANK_ACCOUNTS} placeholder="Select Bank" />
                <div>
                  <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Note</label>
                  <input type="text" placeholder="Description..." value={formData.keterangan} onChange={e => setFormData(f => ({ ...f, keterangan: e.target.value }))}
                    className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-medium outline-none" />
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full py-4 mt-2 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-pop transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
                  style={{ background: submitting ? "#ccc" : "linear-gradient(135deg, #4a3d33, #7c5fcf)" }}>
                  {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={18} /> Save Transaction</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeNav === "profile" && (
          <div className="px-5 pt-4 flex flex-col items-center animate-bento-in" key="profile-tab">
            <div className="relative mb-5">
              <img src={session?.user?.image} alt="avatar" className="w-24 h-24 rounded-3xl border-4 border-white shadow-pop-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-moss-500 border-2 border-white rounded-2xl" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-1 text-earth-900">{session?.user?.name}</h2>
            <p className="text-sm font-medium text-earth-500 mb-6">{session?.user?.email}</p>

            <div className="w-full bento-tile bg-white border border-earth-100 p-5 shadow-warm space-y-4">
              <div className="flex justify-between items-center border-b border-earth-100 pb-3">
                <span className="text-sm font-medium text-earth-500">Account Type</span>
                <span className="text-sm font-bold text-violet-600">Premium</span>
              </div>
              <div className="flex justify-between items-center border-b border-earth-100 pb-3">
                <span className="text-sm font-medium text-earth-500">Data Source</span>
                <span className="text-sm font-bold text-earth-800">Google Sheets</span>
              </div>
              <div className="flex justify-between items-center border-b border-earth-100 pb-3">
                <span className="text-sm font-medium text-earth-500">Total Transactions</span>
                <span className="text-sm font-bold text-earth-800">{data?.transactions?.length || 0}</span>
              </div>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full pt-2 flex items-center justify-between group">
                <span className="text-sm font-bold text-rose-500 group-hover:opacity-80 transition-opacity">Log Out</span>
                <LogOut size={16} color={THEME.danger} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Day transactions modal */}
      {selectedDayTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(42,32,24,0.5)", backdropFilter: "blur(8px)" }} onClick={() => setSelectedDayTx(null)}>
          <div className="glass-strong rounded-t-[32px] sm:rounded-[32px] p-6 shadow-pop-lg w-full max-w-md max-h-[80vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold font-display text-earth-800">{selectedDayTx.day} {calMonth} {calYear}</h3>
              <button onClick={() => setSelectedDayTx(null)} className="w-8 h-8 rounded-full bg-earth-50 hover:bg-earth-100 transition-colors flex items-center justify-center">
                <X size={14} color={THEME.textSecondary} />
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
                    <p className="font-bold text-sm text-clay-500 ml-3">-{formatRp(t.amount)}</p>
                  </div>
                ))}
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-xs font-bold text-earth-600">Total</span>
                  <span className="text-sm font-bold text-clay-500">
                    -{formatRp(selectedDayTx.transactions.reduce((s, t) => s + t.amount, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drill-down modal */}
      {drillDown && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(42,32,24,0.5)", backdropFilter: "blur(8px)" }} onClick={() => setDrillDown(null)}>
          <div className="glass-strong rounded-t-[32px] sm:rounded-[32px] p-6 shadow-pop-lg w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Top 10 Transaksi</p>
                <h3 className="text-lg font-display font-bold text-earth-800">{drillDown.title}</h3>
              </div>
              <button onClick={() => setDrillDown(null)} className="w-8 h-8 rounded-full bg-earth-50 hover:bg-earth-100 transition-colors flex items-center justify-center">
                <X size={14} color={THEME.textSecondary} />
              </button>
            </div>
            {(() => {
              const txs = (data?.transactions || []).filter(t => t.type === drillDown.type)
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 10)
              if (txs.length === 0) {
                return <EmptyState icon={<Wallet size={20} />} title="Belum ada transaksi" />
              }
              return (
                <div className="space-y-2.5">
                  {txs.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-earth-50/80 transition-colors">
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-[10px]"
                        style={{ background: (drillDown.type === "income" ? THEME.income : drillDown.type === "savings" ? THEME.savings : THEME.expense) + "18",
                                 color: (drillDown.type === "income" ? THEME.income : drillDown.type === "savings" ? THEME.savings : THEME.expense) }}>
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-earth-800 truncate">{t.category}</p>
                        <p className="text-[10px] text-earth-500 mt-0.5">{t.date} · {t.desc || "—"}</p>
                      </div>
                      <p className="font-bold text-sm flex-shrink-0"
                        style={{ color: (drillDown.type === "income" ? THEME.income : drillDown.type === "savings" ? THEME.savings : THEME.expense) }}>
                        {drillDown.type === "income" ? "+" : drillDown.type === "savings" ? "" : "-"}{formatRp(t.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Bottom Navigation — glassmorphism */}
      <nav className="fixed bottom-5 left-5 right-5 z-30 safe-bottom max-w-md mx-auto">
        <div className="glass-nav rounded-[28px] px-3 py-3 flex justify-between items-center">
          {[
            { id: "home", label: "Overview", icon: Home },
            { id: "stats", label: "Statistics", icon: Activity },
            { id: "wallet", label: "Add", icon: Plus, isFab: true },
            { id: "profile", label: "Profile", icon: User },
          ].map((nav) => {
            const isActive = activeNav === nav.id
            if (nav.isFab) {
              return (
                <button key={nav.id} onClick={() => setActiveNav(nav.id)} className="-mt-8 active:scale-95 transition-transform">
                  <div className="w-14 h-14 rounded-2xl mesh-aurora shadow-pop flex items-center justify-center" style={{ boxShadow: "0 12px 32px rgba(124,95,207,0.4)" }}>
                    <nav.icon size={24} color="white" strokeWidth={2.5} />
                  </div>
                </button>
              )
            }
            return (
              <button key={nav.id} onClick={() => setActiveNav(nav.id)} className="flex flex-col items-center gap-0.5 group relative px-3 py-1 rounded-2xl transition-all">
                {isActive && (
                  <span className="absolute inset-0 rounded-2xl animate-scale-in" style={{ background: THEME.surfaceWarm }} />
                )}
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${isActive ? '-translate-y-0.5' : ''}`}>
                  <nav.icon size={20} color={isActive ? THEME.textPrimary : THEME.textTertiary} strokeWidth={isActive ? 2.5 : 2} />
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
