"use client"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line, LineChart, Legend } from "recharts"
import { LogOut, Plus, Check, X, ChevronDown, Activity, CreditCard, User, Home, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react"

// Premium color palette based on reference
const THEME = {
  bg: "#f4f7f9",
  cardBg: "#ffffff",
  heroBg: "#4a4771",
  heroLight: "#5d5988",
  textPrimary: "#2d2f45",
  textSecondary: "#8a8d9f",
  income: "#50b5e9", // Cyan
  expense: "#e87d9a", // Pink
  savings: "#5cbd8a", // Mint green
}

const COLORS = ["#50b5e9", "#e87d9a", "#5cbd8a", "#f5a623", "#9f87ef", "#64b5f6", "#81c784", "#ba68c8"]

const EXPENSE_CATEGORIES = [
  "Transportasi","Sedekah","Elektronik","Healthcare","Utang","Body Care",
  "Musibah","Kondangan","Makan di luar","Makan di rumah","Hiburan","Jajan",
  "Skincare","Belanja","Laundry","Ilmu","Pakaian", "Tabungan Cash"
]
const INCOME_CATEGORIES = ["Monthly Salary","Insentif","Reimbursement","Pemberian"]
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
      <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-100 text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {formatRp(p.value)}</p>
        ))}
      </div>
    )
  }
  return null
}

function SelectField({ label, value, onChange, options, placeholder, isDark = false }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      {label && <label className="text-[11px] font-medium text-[#8a8d9f] mb-1 block uppercase tracking-wider">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm text-left transition-colors ${
          isDark ? "bg-[#5d5988] text-white" : "bg-white border border-gray-100 text-[#2d2f45] shadow-sm"
        }`}
      >
        <span>{value || placeholder}</span>
        <ChevronDown size={16} className={`transition-transform duration-200 ${open ? "rotate-180" : ""} ${isDark ? "text-white opacity-70" : "text-[#8a8d9f]"}`} />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden" style={{ maxHeight: "220px", overflowY: "auto" }}>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false) }}
              className="w-full text-left px-4 py-3 text-sm hover:bg-[#f4f7f9] transition-colors border-b last:border-b-0 border-gray-50"
              style={{ color: value === opt ? THEME.income : THEME.textPrimary, fontWeight: value === opt ? 600 : 400 }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
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
  
  // Comparison state
  const [compareMode, setCompareMode] = useState(false)
  const [compareMonthA, setCompareMonthA] = useState(AVAILABLE_MONTHS[new Date().getMonth()])
  const [compareYearA, setCompareYearA] = useState(new Date().getFullYear().toString())
  const [compareMonthB, setCompareMonthB] = useState(AVAILABLE_MONTHS[new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1])
  const [compareYearB, setCompareYearB] = useState(new Date().getMonth() === 0 ? (new Date().getFullYear() - 1).toString() : new Date().getFullYear().toString())

  useEffect(() => { if (status === "unauthenticated") router.push("/") }, [status, router])

  const fetchData = () => {
    if (!session) return
    setLoading(true)
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { fetchData() }, [session])

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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7f9] gap-4">
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: THEME.heroBg, borderTopColor: "transparent" }} />
        <p className="text-sm font-medium" style={{ color: THEME.textSecondary }}>Memuat data keuangan...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7f9] px-6">
        <div className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-lg shadow-gray-200/50">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <X size={24} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-[#2d2f45] mb-2">Gagal Memuat Data</h2>
          <p className="text-sm text-[#8a8d9f] mb-6">{error}</p>
          <div className="space-y-3">
            <button onClick={() => { setError(null); fetchData() }} className="w-full py-3.5 rounded-2xl text-white font-medium shadow-md transition-transform active:scale-95" style={{ background: THEME.heroBg }}>Coba Lagi</button>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full py-3.5 rounded-2xl text-[#e87d9a] font-medium bg-[#f4f7f9] transition-transform active:scale-95">Log Out & Relogin</button>
          </div>
        </div>
      </div>
    )
  }

  // --- Statistics Derived Data ---
  const isAllMonths = selectedMonth === "Semua Bulan"
  const isAllYears = selectedYear === "Semua Tahun"

  const filteredTransactions = data?.transactions?.filter(t => 
    (isAllYears || t.year === selectedYear) && 
    (isAllMonths || t.month === selectedMonth)
  ) || []
  
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
      // Find transactions for this month (already filtered by year above)
      const monthTx = filteredTransactions.filter(t => t.month === m)
      const pemasukan = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const pengeluaran = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const tabungan = monthTx.filter(t => t.type === 'savings').reduce((s, t) => s + t.amount, 0)
      return { month: m, pemasukan, pengeluaran, tabungan, surplus: pemasukan - pengeluaran }
    }).filter(d => d.pemasukan > 0 || d.pengeluaran > 0 || d.tabungan > 0)
  }

  const availableYears = Array.from(new Set(data?.transactions?.map(t => t.year).filter(Boolean) || [])).sort((a,b) => b.localeCompare(a))
  if (availableYears.length === 0) availableYears.push(new Date().getFullYear().toString())

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

  // All-category-level comparison data for dual bar chart
  const allCompareCategories = Array.from(new Set([...compareDataA.categories.map(c => c.name), ...compareDataB.categories.map(c => c.name)]))
  const compareChartData = allCompareCategories.map(cat => ({
    category: cat,
    [compareMonthA]: compareDataA.categories.find(c => c.name === cat)?.value || 0,
    [compareMonthB]: compareDataB.categories.find(c => c.name === cat)?.value || 0,
  })).sort((a,b) => (b[compareMonthA] + b[compareMonthB]) - (a[compareMonthA] + a[compareMonthB]))

  // --- Expense Category Trend (top 5) ---
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
  const gaugeColor = expenseRatio < 50 ? THEME.savings : expenseRatio < 80 ? "#f5a623" : THEME.expense


  return (
    <div className="min-h-screen pb-32 font-sans" style={{ background: THEME.bg, color: THEME.textPrimary }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 z-50 px-6 py-3.5 rounded-full shadow-xl shadow-black/10 text-sm font-semibold text-white flex items-center gap-3 transition-all"
          style={{ transform: "translateX(-50%)", background: toast.type === "error" ? THEME.expense : THEME.savings }}>
          {toast.type === "error" ? <X size={16} strokeWidth={3} /> : <Check size={16} strokeWidth={3} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 px-6 pt-8 pb-4 backdrop-blur-md bg-[#f4f7f9]/80">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{activeNav === 'home' ? 'Overview' : activeNav === 'stats' ? 'Statistics' : activeNav === 'wallet' ? 'Transaction' : 'Profile'}</h1>
            <p className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: THEME.textSecondary }}>
              {activeNav === "home" ? "Welcome back" : activeNav === "stats" ? "Your financial health" : ""}
            </p>
          </div>
          {activeNav === "home" && (
            <img src={session?.user?.image} alt="avatar" className="w-10 h-10 rounded-full border border-gray-200 shadow-sm" />
          )}
        </div>
      </header>

      {/* HOME TAB */}
      {activeNav === "home" && (
        <div className="px-6 space-y-6 mt-2">
          {/* Main Balance Card */}
          <div className="rounded-[32px] p-6 shadow-xl relative overflow-hidden" style={{ background: THEME.heroBg, color: "white" }}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            
            <p className="text-sm font-medium opacity-80 mb-1">Total Balance</p>
            <h2 className="text-4xl font-bold mb-6">{formatRpFull(data?.totalSurplus || 0)}</h2>
            
            <div className="flex justify-between items-end border-t border-white/10 pt-4">
              <div>
                <p className="text-xs opacity-70 mb-1">Total Income</p>
                <p className="font-semibold">{formatRp(data?.totalIncome || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-70 mb-1">Total Expense</p>
                <p className="font-semibold">{formatRp(data?.totalExpense || 0)}</p>
              </div>
            </div>
          </div>

          {/* KPI Mini Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${THEME.savings}15`, color: THEME.savings }}>
                <ArrowUpRight size={20} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color: THEME.textSecondary }}>Savings</p>
                <p className="font-bold text-lg">{formatRp(data?.totalSavings || 0)}</p>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${THEME.income}15`, color: THEME.income }}>
                <Activity size={20} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color: THEME.textSecondary }}>Margin</p>
                <p className="font-bold text-lg">{data?.profitMargin || 0}%</p>
              </div>
            </div>
          </div>

          {/* Spending vs Earning Gauge */}
          <div className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-50">
            <h3 className="text-xs font-bold text-[#8a8d9f] text-center mb-2">Pengeluaran / Pemasukan</h3>
            <div className="flex flex-col items-center">
              <svg width="160" height="90" viewBox="0 0 160 90">
                <defs>
                  <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={THEME.savings} />
                    <stop offset="50%" stopColor="#f5a623" />
                    <stop offset="100%" stopColor={THEME.expense} />
                  </linearGradient>
                </defs>
                {/* Background arc */}
                <path d="M20 80 A 60 60 0 0 1 140 80" fill="none" stroke="#e8ecf0" strokeWidth="12" strokeLinecap="round" />
                {/* Colored arc */}
                <path d="M20 80 A 60 60 0 0 1 140 80" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${(gaugeAngle / 180) * 188.5} 188.5`} />
                {/* Needle */}
                {(() => {
                  const angleRad = (gaugeAngle - 90) * (Math.PI / 180)
                  const cx = 80, cy = 80, len = 40
                  const nx = cx + len * Math.cos(angleRad)
                  const ny = cy + len * Math.sin(angleRad)
                  return <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#2d2f45" strokeWidth="2.5" strokeLinecap="round" />
                })()}
                <circle cx="80" cy="80" r="5" fill="#2d2f45" />
              </svg>
              <p className="text-3xl font-bold mt-1" style={{ color: gaugeColor }}>{expenseRatio.toFixed(1)}%</p>
              <p className="text-[10px] font-medium text-[#8a8d9f] mt-1">
                {expenseRatio < 50 ? "Healthy — spending well below income" : expenseRatio < 80 ? "Moderate — watch your spending" : "High — spending close to income"}
              </p>
            </div>
          </div>

          {/* Recent Transactions List */}
          <div>
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-lg font-bold">Recent Transactions</h3>
              <button onClick={() => setActiveNav("stats")} className="text-xs font-semibold" style={{ color: THEME.income }}>View All</button>
            </div>
            <div className="bg-white rounded-[32px] p-2 shadow-sm border border-gray-50">
              {data?.transactions?.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-b-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: THEME.bg }}>
                      {t.type === "income" ? <ArrowDownRight size={20} color={THEME.income} /> : t.type === "savings" ? <Wallet size={20} color={THEME.savings} /> : <ArrowUpRight size={20} color={THEME.expense} />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.category}</p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: THEME.textSecondary }}>{t.date} • {t.desc || t.type}</p>
                    </div>
                  </div>
                  <p className="font-bold text-sm" style={{ color: t.type === "income" ? THEME.income : THEME.textPrimary }}>
                    {t.type === "income" ? "+" : "-"}{formatRp(t.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STATISTIK TAB */}
      {activeNav === "stats" && (
        <div className="px-6 space-y-6 mt-2">
          
          <div className="flex justify-end gap-2 mb-2">
            <div className="w-32">
              <SelectField value={selectedYear} onChange={setSelectedYear} options={["Semua Tahun", ...availableYears]} placeholder="Year" />
            </div>
            <div className="w-36">
              <SelectField value={selectedMonth} onChange={setSelectedMonth} options={["Semua Bulan", ...AVAILABLE_MONTHS]} placeholder="Month" />
            </div>
          </div>

          {/* Profit and Loss Hero Card */}
          <div className="rounded-[32px] p-6 shadow-xl" style={{ background: THEME.heroBg, color: "white" }}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm font-medium opacity-80 mb-1">Net profit</p>
                <h2 className="text-3xl font-bold">{formatRpFull(statSurplus)}</h2>
              </div>
            </div>

            {/* Income / Cost Progress bars matching reference */}
            <div className="space-y-4 border-t border-white/10 pt-5">
              <div>
                <div className="flex justify-between text-xs font-medium mb-2">
                  <span className="opacity-80">Income</span>
                  <span>{formatRp(statIncome)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: THEME.heroLight }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (statIncome / (statIncome + statExpense || 1)) * 100)}%`, background: THEME.income }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium mb-2">
                  <span className="opacity-80">Cost of sales</span>
                  <span>{formatRp(statExpense)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: THEME.heroLight }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (statExpense / (statIncome + statExpense || 1)) * 100)}%`, background: THEME.expense }} />
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Trend Chart (Combo) only show on 'Semua Bulan' */}
          {isAllMonths && (
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50">
              <h3 className="text-sm font-bold mb-4">Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={clientMonthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: THEME.textSecondary }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pemasukan" name="Income" fill={THEME.income} radius={[4, 4, 0, 0]} maxBarSize={12} />
                  <Bar dataKey="pengeluaran" name="Expense" fill={THEME.expense} radius={[4, 4, 0, 0]} maxBarSize={12} />
                  <Line type="monotone" dataKey="surplus" name="Surplus" stroke={THEME.heroBg} strokeWidth={3} dot={{ r: 3, fill: THEME.heroBg }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Donut Charts side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-50 flex flex-col">
              <h3 className="text-xs font-bold text-center mb-4">Income Mix</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie 
                      data={incomeCategories} cx="50%" cy="50%" innerRadius={40} outerRadius={60} 
                      paddingAngle={2} dataKey="value" stroke="none"
                      labelLine={{ stroke: "#8a8d9f", strokeWidth: 1 }}
                      label={({ name, percent }) => percent > 0.02 ? `${name} ${(percent * 100).toFixed(1)}%` : ''}
                      style={{ fontSize: '10px', fontWeight: 600 }}
                    >
                      {incomeCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-50 flex flex-col">
              <h3 className="text-xs font-bold text-center mb-4">Expense Mix</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie 
                      data={expenseCategories} cx="50%" cy="50%" innerRadius={40} outerRadius={60} 
                      paddingAngle={2} dataKey="value" stroke="none"
                      labelLine={{ stroke: "#8a8d9f", strokeWidth: 1 }}
                      label={({ name, percent }) => percent > 0.02 ? `${name} ${(percent * 100).toFixed(1)}%` : ''}
                      style={{ fontSize: '10px', fontWeight: 600 }}
                    >
                      {expenseCategories.map((_, i) => <Cell key={i} fill={COLORS[(i+3) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* --- Expense Category Trend (LineChart) --- */}
          {isAllMonths && isAllYears && top5Categories.length > 0 && (
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50">
              <h3 className="text-sm font-bold mb-4">Top Kategori Pengeluaran</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: THEME.textSecondary }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  {top5Categories.map((cat, i) => (
                    <Line key={cat} type="monotone" dataKey={cat} name={cat} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ r: 3, fill: COLORS[i % COLORS.length] }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* --- Month vs Month Comparison --- */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold">Bandingkan Bulan</h3>
              <button onClick={() => setCompareMode(!compareMode)} className="text-xs font-semibold py-1.5 px-4 rounded-xl transition-colors"
                style={{ background: compareMode ? THEME.heroBg : "#f4f7f9", color: compareMode ? "white" : THEME.textSecondary }}>
                {compareMode ? "Sembunyikan" : "Bandingkan"}
              </button>
            </div>

            {compareMode && (
              <div className="space-y-4 mt-4">
                {/* Month selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-[#8a8d9f] mb-1">Bulan A</p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <SelectField value={compareMonthA} onChange={setCompareMonthA} options={AVAILABLE_MONTHS} placeholder="Month" />
                      </div>
                      <div className="w-24">
                        <SelectField value={compareYearA} onChange={setCompareYearA} options={availableYears} placeholder="Year" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#8a8d9f] mb-1">Bulan B</p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <SelectField value={compareMonthB} onChange={setCompareMonthB} options={AVAILABLE_MONTHS} placeholder="Month" />
                      </div>
                      <div className="w-24">
                        <SelectField value={compareYearB} onChange={setCompareYearB} options={availableYears} placeholder="Year" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI comparison cards */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Pemasukan", a: compareDataA.income, b: compareDataB.income, color: THEME.income },
                    { label: "Pengeluaran", a: compareDataA.expense, b: compareDataB.expense, color: THEME.expense },
                    { label: "Surplus", a: compareDataA.surplus, b: compareDataB.surplus, color: THEME.savings },
                  ].map((item) => {
                    const delta = item.b > 0 ? ((item.a - item.b) / item.b * 100) : 0
                    const isUp = delta > 0
                    return (
                      <div key={item.label} className="rounded-2xl p-3 text-center" style={{ background: "#f4f7f9" }}>
                        <p className="text-[10px] font-medium text-[#8a8d9f] mb-1">{item.label}</p>
                        <p className="text-sm font-bold" style={{ color: item.color }}>{formatRp(item.a)}</p>
                        <p className="text-[10px] text-[#8a8d9f] my-0.5">vs {formatRp(item.b)}</p>
                        {delta !== 0 && (
                          <p className="text-[11px] font-bold" style={{ color: isUp && item.label !== "Pengeluaran" ? THEME.savings : isUp ? THEME.expense : isUp ? THEME.expense : THEME.savings }}>
                            {isUp ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Dual bar chart */}
                {compareChartData.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-[#8a8d9f] mb-3">Perbandingan per Kategori</p>
                    <ResponsiveContainer width="100%" height={Math.max(150, compareChartData.length * 30)}>
                      <BarChart data={compareChartData} layout="vertical" barCategoryGap="30%">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="category" width={80} tick={{ fontSize: 10, fill: THEME.textSecondary }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey={compareMonthA} name={compareMonthA} fill={THEME.income} radius={[0, 4, 4, 0]} maxBarSize={12} />
                        <Bar dataKey={compareMonthB} name={compareMonthB} fill={THEME.expense} radius={[0, 4, 4, 0]} maxBarSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Overview Table */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold">{isAllMonths ? "Annual Overview" : "Monthly Breakdown"}</h3>
            </div>
            
            {isAllMonths ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="pb-4 text-[10px] font-bold text-[#8a8d9f] uppercase tracking-wider pr-4 border-b border-gray-50">Bulan</th>
                      <th className="pb-4 text-[10px] font-bold text-[#8a8d9f] uppercase tracking-wider pr-4 border-b border-gray-50">Pemasukan</th>
                      <th className="pb-4 text-[10px] font-bold text-[#8a8d9f] uppercase tracking-wider pr-4 border-b border-gray-50">Pengeluaran</th>
                      <th className="pb-4 text-[10px] font-bold text-[#8a8d9f] uppercase tracking-wider pr-4 border-b border-gray-50">Selisih</th>
                      <th className="pb-4 text-[10px] font-bold text-[#8a8d9f] uppercase tracking-wider text-right border-b border-gray-50">Tabungan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientMonthlyData.map((row, i) => (
                      <tr key={i} className="hover:bg-[#f4f7f9]/50 transition-colors">
                        <td className="py-4 text-xs font-medium pr-4 border-b border-gray-50 last:border-b-0">{row.month}</td>
                        <td className="py-4 text-xs text-[#50b5e9] font-semibold pr-4 border-b border-gray-50 last:border-b-0">{formatRp(row.pemasukan)}</td>
                        <td className="py-4 text-xs text-[#e87d9a] font-semibold pr-4 border-b border-gray-50 last:border-b-0">{formatRp(row.pengeluaran)}</td>
                        <td className="py-4 text-xs font-semibold pr-4 border-b border-gray-50 last:border-b-0">{formatRp(row.surplus)}</td>
                        <td className="py-4 text-xs font-bold text-right border-b border-gray-50 last:border-b-0 text-[#5cbd8a]">{formatRp(row.tabungan)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // Display transactions for the month
              <div className="space-y-4">
                {filteredTransactions.slice(0, 15).map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#f4f7f9] flex items-center justify-center font-bold text-[10px] text-gray-500 text-center leading-tight">
                          {t.date.slice(0,5)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{t.category}</p>
                          <p className="text-[11px] text-[#8a8d9f] mt-0.5">{t.desc || t.type}</p>
                        </div>
                     </div>
                     <p className="font-bold text-sm" style={{ color: t.type === "income" ? THEME.income : t.type === "savings" ? THEME.savings : THEME.textPrimary }}>
                       {t.type === "income" ? "+" : "-"}{formatRp(t.amount)}
                     </p>
                  </div>
                ))}
                {filteredTransactions.length === 0 && <p className="text-center text-xs text-gray-400 py-4">No transactions found.</p>}
              </div>
            )}
          </div>

        </div>
      )}

      {/* DOMPET TAB */}
      {activeNav === "wallet" && (
        <div className="px-6 mt-2">
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50">
            {/* Type Toggle */}
            <div className="flex gap-2 mb-6 p-1.5 bg-[#f4f7f9] rounded-2xl">
              <button onClick={() => { setTxType("expense"); setFormData(f => ({ ...f, kategori: "" })) }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${txType === "expense" ? "bg-white text-[#2d2f45]" : "bg-transparent text-[#8a8d9f] shadow-none"}`}>
                Expense
              </button>
              <button onClick={() => { setTxType("income"); setFormData(f => ({ ...f, kategori: "" })) }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${txType === "income" ? "bg-white text-[#2d2f45]" : "bg-transparent text-[#8a8d9f] shadow-none"}`}>
                Income
              </button>
            </div>

            <div className="text-center mb-8 mt-4">
              <p className="text-xs font-medium text-[#8a8d9f] uppercase tracking-wider mb-2">Amount</p>
              <h2 className="text-4xl font-bold" style={{ color: txType === "expense" ? THEME.textPrimary : THEME.income }}>
                {rawAmount ? `Rp ${rawAmount}` : "Rp 0"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-medium text-[#8a8d9f] mb-1 block uppercase tracking-wider">Amount</label>
                  <input type="text" inputMode="numeric" placeholder="0" value={rawAmount} onChange={e => setRawAmount(formatInputRupiah(e.target.value))}
                    className="w-full px-4 py-3 bg-[#f4f7f9] rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 transition-shadow" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#8a8d9f] mb-1 block uppercase tracking-wider">Date</label>
                  <input type="date" value={formData.tanggal} onChange={e => setFormData(f => ({ ...f, tanggal: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#f4f7f9] rounded-2xl text-sm font-semibold outline-none" />
                </div>
              </div>

              <SelectField label="Category" value={formData.kategori} onChange={v => setFormData(f => ({ ...f, kategori: v }))}
                options={txType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES} placeholder="Select Category" />

              <SelectField label="Bank Account" value={formData.akunBank} onChange={v => setFormData(f => ({ ...f, akunBank: v }))}
                options={BANK_ACCOUNTS} placeholder="Select Bank" />

              <div>
                <label className="text-[11px] font-medium text-[#8a8d9f] mb-1 block uppercase tracking-wider">Note</label>
                <input type="text" placeholder="Description..." value={formData.keterangan} onChange={e => setFormData(f => ({ ...f, keterangan: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#f4f7f9] rounded-2xl text-sm font-medium outline-none" />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-4 mt-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                style={{ background: submitting ? "#ccc" : THEME.heroBg }}>
                {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={18} /> Save Transaction</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PROFIL TAB */}
      {activeNav === "profile" && (
        <div className="px-6 mt-6 flex flex-col items-center">
          <div className="relative mb-6">
            <img src={session?.user?.image} alt="avatar" className="w-24 h-24 rounded-full border-4 border-white shadow-xl" />
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-400 border-2 border-white rounded-full"></div>
          </div>
          <h2 className="text-2xl font-bold mb-1">{session?.user?.name}</h2>
          <p className="text-sm font-medium text-[#8a8d9f] mb-8">{session?.user?.email}</p>

          <div className="w-full bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 space-y-5">
             <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <span className="text-sm font-medium text-[#8a8d9f]">Account Type</span>
                <span className="text-sm font-bold text-[#4a4771]">Premium</span>
             </div>
             <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <span className="text-sm font-medium text-[#8a8d9f]">Data Source</span>
                <span className="text-sm font-bold text-[#2d2f45]">Google Sheets</span>
             </div>
             <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full pt-2 flex items-center justify-between group">
                <span className="text-sm font-bold text-[#e87d9a] group-hover:opacity-80 transition-opacity">Log Out</span>
                <LogOut size={16} color={THEME.expense} className="group-hover:translate-x-1 transition-transform" />
             </button>
          </div>
        </div>
      )}

      {/* Modern Bottom Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 z-30">
        <div className="bg-white shadow-2xl shadow-[#4a4771]/10 rounded-[32px] px-6 py-4 flex justify-between items-center">
          {[
            { id: "home", label: "Overview", icon: Home },
            { id: "stats", label: "Statistics", icon: Activity },
            { id: "wallet", label: "Transaction", icon: Plus },
            { id: "profile", label: "Profile", icon: User },
          ].map((nav) => (
            <button key={nav.id} onClick={() => setActiveNav(nav.id)} className="flex flex-col items-center gap-1.5 group">
              <div 
                className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${activeNav === nav.id ? 'shadow-md -translate-y-1' : 'group-hover:bg-[#f4f7f9]'}`}
                style={{ background: activeNav === nav.id && nav.id === "wallet" ? THEME.income : activeNav === nav.id ? THEME.heroBg : "transparent" }}>
                <nav.icon size={22} color={activeNav === nav.id ? "white" : "#8a8d9f"} strokeWidth={activeNav === nav.id ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold transition-all ${activeNav === nav.id ? 'text-[#2d2f45]' : 'text-[#8a8d9f]'}`}>
                {nav.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
