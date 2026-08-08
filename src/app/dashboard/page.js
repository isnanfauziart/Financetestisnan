"use client"
import { useSession, signIn, signOut } from "next-auth/react"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { LogOut, Plus, X, ChevronDown, Activity, User, Home, ArrowUpRight, Wallet, Sparkles, Lightbulb, TrendingUp, TrendingDown, PiggyBank, Target, Calendar, CreditCard } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "./_components/constants"
import { useCountUp, useSoundPref, playSuccessSound, parseTxDate, formatRp } from "./_components/helpers"
import useHaptics from "./_components/useHaptics"
import useHapticsPref from "./_components/useHapticsPref"
import { computeAllGoalProgress, computeGoalProgress } from "./_components/goalUtils"
import { getStatsPeriodDefaults, getComparePeriodOptions, getCompareSeriesLabels } from "./_components/statsPeriod"
import EmptyState from "./_components/EmptyState"
import HomeTab from "./HomeTab"
import StatsTab from "./StatsTab"
import PlanTab from "./PlanTab"
import ProfileTab from "./ProfileTab"
import EditTransactionModal from "./_components/EditTransactionModal"
import ConfirmSheet from "./_components/ConfirmSheet"
import Sheet from "./_components/Sheet"
import Toast from "./_components/Toast"
import Skeleton from "./_components/Skeleton"
import QuickAddSheet from "./_components/QuickAddSheet"
import { readCache, writeCache, getLastSyncAgo } from "./_components/useDashboardCache"
import GoalCelebration from "@/components/GoalCelebration"
import GoalPickerModal from "@/components/GoalPickerModal"
import WhatIfModal from "@/components/WhatIfModal"
import SetupSaldoAwal from "@/components/SetupSaldoAwal"
import BillPayModal from "@/components/BillPayModal"
import BillSetupModal from "@/components/BillSetupModal"
import EventCelebration from "@/components/EventCelebration"
import LegacySheetConnector from "@/components/LegacySheetConnector"
import UserNameSetup from "@/components/UserNameSetup"
import PaymentStatusBanner from "./_components/PaymentStatusBanner"
import { useBills, useSettings } from "@/lib/useSharedData"
import { registerServiceWorker, requestNotificationPermission } from "@/lib/notifications"
import { hasFeature } from "@/lib/featureAccess"
import { getEffectiveUserName } from "@/lib/userDisplayName"
import { isSpecialExpense } from "@/lib/expenseClass"

const SPECIAL_SUGGESTION_MIN_MONTHS = 3
const SPECIAL_SUGGESTION_MAX_MONTHS = 6

function createTransactionFormData() {
  return {
    tanggal: new Date().toISOString().split("T")[0],
    keterangan: "",
    kategori: "",
    jumlah: "",
    akunBank: "",
    catatan: "",
    eventId: "",
    sifat: "Rutin",
  }
}

function monthSortIndex(month, year) {
  const monthIndex = AVAILABLE_MONTHS.indexOf(month)
  const numericYear = Number(year)
  if (!Number.isFinite(numericYear) || monthIndex < 0) return NaN
  return numericYear * 12 + monthIndex
}

function median(values) {
  const sorted = values.filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b)
  if (sorted.length === 0) return 0
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function getSpecialExpenseSuggestion(transactions = [], now = Date.now()) {
  const current = new Date(now)
  const currentMonthIndex = current.getFullYear() * 12 + current.getMonth()
  const monthlyRoutineExpense = new Map()

  for (const transaction of transactions) {
    if (transaction?.type !== "expense" || isSpecialExpense(transaction)) continue
    const monthIndex = monthSortIndex(transaction.month, transaction.year)
    if (!Number.isFinite(monthIndex) || monthIndex >= currentMonthIndex) continue
    const key = `${transaction.year}-${String(AVAILABLE_MONTHS.indexOf(transaction.month) + 1).padStart(2, "0")}`
    monthlyRoutineExpense.set(key, (monthlyRoutineExpense.get(key) || 0) + (Number(transaction.amount) || 0))
  }

  const recent = Array.from(monthlyRoutineExpense.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, SPECIAL_SUGGESTION_MAX_MONTHS)
    .map(([, value]) => value)
    .filter(value => value > 0)

  if (recent.length < SPECIAL_SUGGESTION_MIN_MONTHS) return null

  return {
    threshold: median(recent),
    baselineMonths: recent.length,
  }
}

function getSubmitFormDataForType(formData, txType) {
  const { sifat, ...rest } = formData || {}
  if (txType !== "expense") return rest
  return { ...rest, sifat: sifat === "Spesial" ? "Spesial" : "Rutin" }
}

function buildMonthlyDataFromTransactions(transactions, isAllMonths) {
  if (!isAllMonths) return []
  return AVAILABLE_MONTHS.map(m => {
    const monthTx = transactions.filter(t => t.month === m)
    const pemasukan = monthTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
    const pengeluaran = monthTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
    const tabungan = monthTx.filter(t => t.type === "savings").reduce((s, t) => s + t.amount, 0)
    return { month: m, pemasukan, pengeluaran, tabungan, surplus: pemasukan - pengeluaran }
  }).filter(d => d.pemasukan > 0 || d.pengeluaran > 0 || d.tabungan > 0)
}

function getMonthDataFromTransactions(transactions, month, year) {
  const tx = transactions.filter(t => t.month === month && t.year === year)
  const income = tx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const expense = tx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const savings = tx.filter(t => t.type === "savings").reduce((s, t) => s + t.amount, 0)
  const catMap = {}
  tx.filter(t => t.type === "expense").forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount })
  const categories = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  return { income, expense, savings, surplus: income - expense, categories }
}

function getTopExpenseCategories(transactions) {
  return Object.entries(
    transactions.filter(t => t.type === "expense").reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name)
}

function buildExpenseTrendData(transactions, categories) {
  return AVAILABLE_MONTHS.map(m => {
    const row = { month: m }
    categories.forEach(cat => {
      row[cat] = transactions.filter(t => t.month === m && t.type === "expense" && t.category === cat).reduce((s, t) => s + t.amount, 0)
    })
    return row
  })
}

function SpecialBadge() {
  return (
    <span className="inline-flex flex-shrink-0 items-center rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700">
      Spesial
    </span>
  )
}

export default function Dashboard() {
  const statsDefaults = getStatsPeriodDefaults()
  const { data: session, status } = useSession()
  const sessionKey = session?.user?.email?.trim().toLowerCase() || null
  const signInRequestedRef = useRef(false)
  const [storedData, setStoredData] = useState(null)
  const [storedDataOwner, setStoredDataOwner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [entitlement, setEntitlement] = useState(null)
  const [needsSheetConnection, setNeedsSheetConnection] = useState(false)
  const [storedLastSyncAt, setStoredLastSyncAt] = useState(null)
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === "undefined") return true
    return navigator.onLine
  })
  const [syncNow, setSyncNow] = useState(() => Date.now())
  const [activeNav, setActiveNav] = useState("home")
  const [activePlanSection, setActivePlanSection] = useState("goal")
  const [soundEnabled, setSoundEnabled] = useSoundPref()
  const [hapticsEnabled, setHapticsEnabled] = useHapticsPref()
  const haptics = useHaptics()

  // Form state
  const [txType, setTxType] = useState("expense")
  const [formData, setFormData] = useState(createTransactionFormData)
  const [rawAmount, setRawAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [editingTx, setEditingTx] = useState(null)
  const [deleteConfirmTx, setDeleteConfirmTx] = useState(null)
  const [deletingTx, setDeletingTx] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  // Stats state
  const [selectedMonth, setSelectedMonth] = useState(statsDefaults.selectedMonth)
  const [selectedYear, setSelectedYear] = useState(statsDefaults.selectedYear)
  const [selectedAccount, setSelectedAccount] = useState("Semua Akun")
  const [categoryFilter, setCategoryFilter] = useState(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Comparison state
  const [compareMode, setCompareMode] = useState(true)
  const [compareMonthA, setCompareMonthA] = useState(statsDefaults.compareMonthA)
  const [compareYearA, setCompareYearA] = useState(statsDefaults.compareYearA)
  const [compareMonthB, setCompareMonthB] = useState(statsDefaults.compareMonthB)
  const [compareYearB, setCompareYearB] = useState(statsDefaults.compareYearB)

  // Calendar state for daily expense heatmap
  const [calMonth, setCalMonth] = useState(AVAILABLE_MONTHS[new Date().getMonth()])
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectedDayTx, setSelectedDayTx] = useState(null)

  // Drill-down modal
  const [drillDown, setDrillDown] = useState(null)

  // Goals state
  const [goalsRefreshTrigger, setGoalsRefreshTrigger] = useState(0)
  const [goalCelebration, setGoalCelebration] = useState(null)
  const [goalPickerOpen, setGoalPickerOpen] = useState(false)
  const [whatIfOpen, setWhatIfOpen] = useState(false)
  const prevGoalPctRef = useRef({})

  // Bills state
  const [billsRefreshTrigger, setBillsRefreshTrigger] = useState(0)
  const [billPayTarget, setBillPayTarget] = useState(null)
  const [billEditTarget, setBillEditTarget] = useState(null)
  const [eventsRefreshTrigger, setEventsRefreshTrigger] = useState(0)
  const [eventCelebration, setEventCelebration] = useState(null)
  const prevEventPctRef = useRef({})
  const [userNamePromptClosed, setUserNamePromptClosed] = useState(false)

  // Settings
  const { bills, loading: billsLoading, error: billsError, refetch: refetchBills } = useBills(status === "authenticated")
  const { settings, loading: settingsLoading, error: settingsError, refetch: refetchSettings } = useSettings()
  const effectiveUserName = getEffectiveUserName({
    savedName: settings.userName,
    googleName: session?.user?.name,
    email: session?.user?.email,
  })

  // Scroll Y for P8 parallax
  const [scrollY, setScrollY] = useState(0)
  const [fabVisible, setFabVisible] = useState(true)
  const lastScrollYRef = useRef(0)

  const hasSessionData = status === "authenticated" && !!sessionKey && storedDataOwner === sessionKey
  const data = hasSessionData ? storedData : null
  const dashboardLoading = status === "authenticated" && !hasSessionData ? true : loading
  const lastSyncAt = hasSessionData ? storedLastSyncAt : null

  useEffect(() => {
    setUserNamePromptClosed(false)
  }, [sessionKey])

  useEffect(() => {
    if (status !== "authenticated" || !sessionKey) {
      setStoredDataOwner(null)
      setStoredData(null)
      setStoredLastSyncAt(null)
      setLoading(false)
      setRefreshing(false)
      setError(null)
      setEntitlement(null)
      setNeedsSheetConnection(false)
      return
    }

    const cache = readCache(sessionKey)
    setStoredDataOwner(sessionKey)
    setStoredData(cache?.data || null)
    setStoredLastSyncAt(cache?.cachedAt || null)
    setLoading(!cache?.data)
    setRefreshing(false)
    setError(null)
    setEntitlement(null)
    setNeedsSheetConnection(false)
  }, [status, sessionKey])

  useEffect(() => {
    if (status === "unauthenticated" && !signInRequestedRef.current) {
      signInRequestedRef.current = true
      signIn("google", { callbackUrl: "/dashboard" })
    }
    if (status !== "unauthenticated") signInRequestedRef.current = false
  }, [status])

  const fetchEntitlement = useCallback(() => {
    if (!session) return
    fetch("/api/me")
      .then(response => response.ok ? response.json() : null)
      .then(result => { if (result) setEntitlement(result) })
      .catch(() => {})
  }, [session])

  const fetchData = useCallback(() => {
    if (!session) return
    fetchEntitlement()
    if (data) setRefreshing(true)
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => {
        if (d.needsSheetConnection || d.code === "SHEET_CONNECTION_REQUIRED") {
          setNeedsSheetConnection(true)
          setStoredDataOwner(sessionKey)
          setStoredData(null)
          setError(null)
          return
        }
        if (d.error) {
          setError(d.error)
        } else {
          setNeedsSheetConnection(false)
          setStoredDataOwner(sessionKey)
          setStoredData(d)
          setError(null)
          const ts = d.serverTimestamp || new Date().toISOString()
          setStoredLastSyncAt(ts)
          writeCache(d, sessionKey)
        }
      })
      .catch(e => { setError(e.message) })
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [session, sessionKey, data, fetchEntitlement])

  useEffect(() => { if (session) fetchData() }, [session?.user?.email])

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  // Register service worker for notifications
  useEffect(() => {
    registerServiceWorker()
  }, [])

  useEffect(() => {
    const id = setInterval(() => setSyncNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  // Bill notification check (while app is open)
  useEffect(() => {
    if (!session) return
    if (!hasFeature(entitlement, "bills")) return
    const checkBills = async () => {
      try {
        const res = await fetch("/api/bills/summary")
        if (!res.ok) return
        const summary = await res.json()
        const all = [...(summary.overdue || []), ...(summary.upcoming || [])]
        for (const bill of all) {
          if (bill.daysUntilDue <= 0 && "Notification" in window && Notification.permission === "granted") {
            new Notification(`Tagihan ${bill.nama} terlambat!`, {
              body: `${formatRp(bill.jumlah)} · Jatuh tempo ${Math.abs(bill.daysUntilDue)} hari lalu`,
              icon: "/icons/icon-192.png",
              tag: `bill-${bill.id}`,
            })
          } else if (bill.daysUntilDue <= 1 && "Notification" in window && Notification.permission === "granted") {
            new Notification(`Tagihan ${bill.nama} jatuh tempo besok`, {
              body: `${formatRp(bill.jumlah)} · ${bill.akunBank || ""}`,
              icon: "/icons/icon-192.png",
              tag: `bill-${bill.id}`,
            })
          }
        }
      } catch {}
    }
    // Check once after 5s, then every 30 minutes
    const timeout = setTimeout(checkBills, 5000)
    const interval = setInterval(checkBills, 30 * 60 * 1000)
    return () => { clearTimeout(timeout); clearInterval(interval) }
  }, [session, entitlement])

  const checkGoalCelebration = useCallback(async () => {
    try {
      const res = await fetch("/api/goals")
      if (!res.ok) return
      const d = await res.json()
      const goals = d.goals || []
      const tx = data?.transactions || []
      const prev = prevGoalPctRef.current
      for (const goal of goals) {
        const sum = computeGoalProgress(goal, tx)
        const pct = goal.target > 0 ? (sum / goal.target) * 100 : 0
        const prevPct = prev[goal.id] || 0
        if (prevPct < 100 && pct >= 100) {
          setGoalCelebration(goal)
          prev[goal.id] = pct
          break
        }
        prev[goal.id] = pct
      }
    } catch {}
  }, [data])

  const checkEventCelebration = useCallback(async () => {
    try {
      const res = await fetch("/api/momental?progress=true")
      if (!res.ok) return
      const d = await res.json()
      const events = d.events || []
      const prev = prevEventPctRef.current
      for (const evt of events) {
        const pct = evt.pct || 0
        const prevPct = prev[evt.id] || 0
        if (prevPct < 100 && pct >= 100) {
          setEventCelebration(evt)
          prev[evt.id] = pct
          break
        }
        prev[evt.id] = pct
      }
    } catch {}
  }, [])

  // P8: Parallax scroll listener
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentY = window.scrollY
          setScrollY(currentY)
          if (currentY > 100) {
            setFabVisible(currentY < lastScrollYRef.current || currentY < lastScrollYRef.current + 10)
          } else {
            setFabVisible(true)
          }
          lastScrollYRef.current = currentY
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
  const pullLocked = useRef(false)
  const contentRef = useRef(null)

  const handleTouchStart = useCallback((e) => {
    if (contentRef.current && contentRef.current.scrollTop <= 0) {
      pullStartY.current = e.touches[0].clientY
      pullLocked.current = false
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (pullStartY.current === 0) return
    const dy = e.touches[0].clientY - pullStartY.current
    if (dy <= 0) { setPullDistance(0); pullDistRef.current = 0; pullLocked.current = false; return }
    if (!pullLocked.current) {
      if (dy < 20) return
      pullLocked.current = true
    }
    const d = Math.min((dy - 20) * 0.5, 120)
    setPullDistance(d)
    pullDistRef.current = d
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (pullDistRef.current >= 80) {
      setPullRefreshing(true)
      fetchData()
      setTimeout(() => setPullRefreshing(false), 1200)
    }
    setPullDistance(0)
    pullDistRef.current = 0
    pullStartY.current = 0
    pullLocked.current = false
  }, [fetchData])

  const resetComparePeriods = useCallback(() => {
    const defaults = getStatsPeriodDefaults()
    setCompareMonthA(defaults.compareMonthA)
    setCompareYearA(defaults.compareYearA)
    setCompareMonthB(defaults.compareMonthB)
    setCompareYearB(defaults.compareYearB)
  }, [])

  const openPlanSection = useCallback((sectionKey) => {
    setActivePlanSection(sectionKey)
    setActiveNav("plan")
  }, [])

  // --- Hooks that must run on every render (before any early return) ---
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

  const routineTransactions = useMemo(() => (
    (data?.transactions || []).filter(t => !isSpecialExpense(t))
  ), [data])

  const routineFilteredTransactions = useMemo(() => (
    filteredTransactions.filter(t => !isSpecialExpense(t))
  ), [filteredTransactions])

  const routineAnalysisMonthlyData = useMemo(() => {
    if (Array.isArray(data?.routineMonthlyData) && data.routineMonthlyData.length > 0) {
      return data.routineMonthlyData.map(row => ({
        ...row,
        pengeluaran: row.pengeluaranRutin || 0,
        surplus: row.surplusRutin ?? ((row.pemasukan || 0) - (row.pengeluaranRutin || 0)),
        tabungan: row.tabungan || 0,
      }))
    }

    const monthly = {}
    for (const transaction of routineTransactions) {
      if (!transaction?.month) continue
      const key = `${transaction.month} ${transaction.year || ""}`.trim()
      if (!monthly[key]) {
        monthly[key] = {
          month: transaction.month,
          year: transaction.year,
          sortKey: transaction.year
            ? `${transaction.year}-${String(AVAILABLE_MONTHS.indexOf(transaction.month) + 1).padStart(2, "0")}`
            : transaction.month,
          pemasukan: 0,
          pengeluaran: 0,
          tabungan: 0,
          surplus: 0,
        }
      }
      if (transaction.type === "income") monthly[key].pemasukan += transaction.amount
      if (transaction.type === "expense") monthly[key].pengeluaran += transaction.amount
      if (transaction.type === "savings") monthly[key].tabungan += transaction.amount
    }

    return Object.values(monthly)
      .map(row => ({ ...row, surplus: row.pemasukan - row.pengeluaran }))
      .sort((a, b) => String(a.sortKey || "").localeCompare(String(b.sortKey || "")))
  }, [data, routineTransactions])

  const specialSuggestion = useMemo(() => (
    getSpecialExpenseSuggestion(data?.transactions || [], syncNow)
  ), [data?.transactions, syncNow])

  const statIncome = filteredTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const statExpense = filteredTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const statSavings = filteredTransactions.filter(t => t.type === "savings").reduce((s, t) => s + t.amount, 0)
  const statSurplus = statIncome - statExpense

  const routineStatIncome = routineFilteredTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const routineStatExpense = routineFilteredTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const routineStatSavings = routineFilteredTransactions.filter(t => t.type === "savings").reduce((s, t) => s + t.amount, 0)

  const expenseCategories = useMemo(() => {
    const map = {}
    filteredTransactions.filter(t => t.type === "expense").forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount })
    return Object.entries(map).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value)
  }, [filteredTransactions])

  const routineExpenseCategories = useMemo(() => {
    const map = {}
    routineFilteredTransactions.filter(t => t.type === "expense").forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount })
    return Object.entries(map).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value)
  }, [routineFilteredTransactions])

  const incomeCategories = useMemo(() => {
    const map = {}
    filteredTransactions.filter(t => t.type === "income").forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount })
    return Object.entries(map).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value)
  }, [filteredTransactions])

  const insights = useMemo(() => {
    if (Array.isArray(data?.insights)) {
      const icons = {
        target: Target,
        activity: Activity,
        "credit-card": CreditCard,
        "piggy-bank": PiggyBank,
        user: User,
      }
      return data.insights.map(insight => ({
        ...insight,
        icon: icons[insight.iconKey] || Lightbulb,
      }))
    }
    const out = []
    const tx = routineFilteredTransactions
    if (tx.length === 0) return out

    if (routineStatIncome > 0) {
      const ratio = (routineStatExpense / routineStatIncome) * 100
      out.push({
        type: ratio < 50 ? "positive" : ratio < 80 ? "info" : "warning",
        icon: ratio < 50 ? Target : Activity,
        text: ratio < 50 ? `Sangat sehat — ${ratio.toFixed(0)}% income terpakai`
            : ratio < 80 ? `Moderat — ${ratio.toFixed(0)}% income terpakai`
            : `Tinggi — ${ratio.toFixed(0)}% income terpakai`,
        color: ratio < 50 ? THEME.sage : ratio < 80 ? THEME.amber : THEME.danger
      })
    }

    if (routineExpenseCategories.length > 0) {
      const top = routineExpenseCategories[0]
      const pct = (top.value / (routineStatExpense || 1)) * 100
      if (pct > 10) {
        out.push({
          type: "info",
          icon: CreditCard,
          text: `Kategori terbesar: ${top.name} (${pct.toFixed(0)}% dari pengeluaran)`,
          color: THEME.primary
        })
      }
    }

    if (!isAllMonths) {
      const allTx = routineTransactions
      const monthExpense = routineStatExpense
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

    const allTx = routineTransactions

    if (!isAllMonths) {
      const monthIdx = AVAILABLE_MONTHS.indexOf(selectedMonth)
      const prevMonth = AVAILABLE_MONTHS[monthIdx - 1] || AVAILABLE_MONTHS[11]
      const prevYear = monthIdx === 0 ? String(Number(selectedYear) - 1) : selectedYear
      const prevTx = allTx.filter(t => t.month === prevMonth && t.year === prevYear)
      const prevExp = prevTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
      if (prevExp > 0 && routineStatExpense > 0) {
        const delta = ((routineStatExpense - prevExp) / prevExp) * 100
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

      if (routineStatSavings > 0) {
        out.push({
          type: "positive",
          icon: PiggyBank,
          text: `Tabungan ${selectedMonth}: ${formatRp(routineStatSavings)}`,
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
          const pct = (val / (routineStatExpense || 1)) * 100
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

      if (routineStatSavings > 0) {
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

    return out.slice(0, 3)
  }, [routineFilteredTransactions, isAllMonths, isAllAccounts, selectedMonth, selectedYear, routineStatIncome, routineStatExpense, routineStatSavings, routineExpenseCategories, data, routineTransactions])

  const showToast = (msg, type = "success", action = null, options = {}) => {
    setToast({ msg, type, action, duration: options.duration })
  }

  const dismissToast = useCallback(() => {
    setToast(null)
  }, [])

  const submitTransaction = async ({ formData, rawAmount, txType }) => {
    if (!formData.tanggal || !formData.kategori || !rawAmount) {
      showToast("Tanggal, kategori, dan jumlah wajib diisi!", "error")
      return { ok: false }
    }
    try {
      const requestFormData = getSubmitFormDataForType(formData, txType)
      const res = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...requestFormData, jumlah: rawAmount.replace(/\./g, ""), type: txType }),
      })
      const result = await res.json()
      if (result.success) {
        if (hapticsEnabled) haptics.success()
        if (soundEnabled) playSuccessSound()
        showToast("Transaksi berhasil disimpan", "success", null, { duration: 1500 })
        fetchData()
        setGoalsRefreshTrigger(t => t + 1)
        setEventsRefreshTrigger(t => t + 1)
        if (txType === "savings") {
          setTimeout(() => checkGoalCelebration(), 800)
        }
        setTimeout(() => checkEventCelebration(), 800)
        return { ok: true }
      } else {
        showToast(
          result.error || "Gagal menyimpan",
          "error",
          result.code === "FEATURE_LIMIT_REACHED"
            ? { label: "Upgrade", onClick: () => window.location.assign("/upgrade") }
            : null
        )
        return { ok: false, error: result }
      }
    } catch (err) {
      showToast("Terjadi kesalahan", "error")
      return { ok: false }
    }
  }

  const handleWalletSubmit = (data) => {
    setSubmitting(true)
    submitTransaction(data).then((result) => {
      if (result.ok) {
        setFormData(createTransactionFormData())
        setRawAmount("")
      }
      setSubmitting(false)
    })
  }

  const openGoalPicker = () => setGoalPickerOpen(true)

  const handleEditSave = () => {
    setEditingTx(null)
    if (hapticsEnabled) haptics.success()
    if (soundEnabled) playSuccessSound()
    showToast("Transaksi diperbarui ✓")
    fetchData()
  }

  const handleEditTx = (tx) => {
    setDeleteConfirmTx(null)
    setEditingTx(tx)
  }

  const handleDelete = (tx) => {
    setDeleteConfirmTx(tx)
  }

  const performDelete = async () => {
    const tx = deleteConfirmTx
    if (!tx) return
    setDeletingTx(true)
    try {
      const res = await fetch(`/api/transaction/${tx.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tab: tx.type === "income" ? "Pemasukan" : tx.type === "savings" ? "Tabungan" : "Pengeluaran",
          rowIndex: tx.rowIndex,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        const err = result
        throw new Error(err.error || "Gagal menghapus")
      }
      if (hapticsEnabled) haptics.warning()
      setDeleteConfirmTx(null)
      setGoalsRefreshTrigger(t => t + 1)
      showToast("Transaksi dihapus", "success", {
        label: "Undo",
        onClick: () => restoreTransaction(result.undoToken),
      })
      fetchData()
    } catch (err) {
      showToast(err.message, "error")
    } finally {
      setDeletingTx(false)
    }
  }

  const restoreTransaction = async (undoToken) => {
    setToast(null)
    try {
      const res = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ undoToken }),
      })
      const result = await res.json()
      if (result.success) {
        if (hapticsEnabled) haptics.success()
        showToast("Transaksi dipulihkan ✓")
        fetchData()
        setGoalsRefreshTrigger(t => t + 1)
      } else {
        showToast(result.error || "Gagal memulihkan", "error")
      }
    } catch {
      showToast("Gagal memulihkan", "error")
    }
  }

  if (status === "loading") {
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

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-strong rounded-[32px] p-8 max-w-sm w-full text-center" role="status">
          <h1 className="text-xl font-bold text-earth-900 mb-2 font-display">Sesi tidak ditemukan</h1>
          <p className="text-sm text-earth-600">Mengalihkan ke halaman masuk...</p>
        </div>
      </div>
    )
  }

  if (dashboardLoading && !data) {
    return (
      <div className="min-h-screen p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3 auto-rows-[110px] pt-6">
          <Skeleton variant="hero" className="col-span-2 row-span-2" />
          <Skeleton variant="tile" />
          <Skeleton variant="tile" />
          <Skeleton variant="tile" />
          <Skeleton variant="tile" />
        </div>
        <Skeleton variant="chart" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    )
  }

  if (needsSheetConnection) {
    return (
      <LegacySheetConnector
        userName={effectiveUserName}
        onConnected={() => window.location.reload()}
        onSignOut={() => signOut({ callbackUrl: "/" })}
      />
    )
  }

  if (error && !data) {
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

  // --- Non-hook derivations (depend on hooks defined above) ---
  const clientMonthlyData = buildMonthlyDataFromTransactions(filteredTransactions, isAllMonths)
  const routineClientMonthlyData = buildMonthlyDataFromTransactions(routineFilteredTransactions, isAllMonths)

  const availableYears = Array.from(new Set(data?.transactions?.map(t => t.year).filter(Boolean) || [])).sort((a,b) => b.localeCompare(a))
  if (availableYears.length === 0) availableYears.push(new Date().getFullYear().toString())
  const compareYearOptions = getComparePeriodOptions(availableYears, {
    currentYear: statsDefaults.selectedYear,
    previousYear: statsDefaults.compareYearB,
  })

  const availableAccounts = Array.from(new Set((data?.transactions || []).map(t => t.account).filter(Boolean))).sort()

  const compareDataA = getMonthDataFromTransactions(data?.transactions || [], compareMonthA, compareYearA)
  const compareDataB = getMonthDataFromTransactions(data?.transactions || [], compareMonthB, compareYearB)
  const routineCompareDataA = getMonthDataFromTransactions(routineTransactions, compareMonthA, compareYearA)
  const routineCompareDataB = getMonthDataFromTransactions(routineTransactions, compareMonthB, compareYearB)
  const { compareLabelA, compareLabelB } = getCompareSeriesLabels(compareMonthA, compareYearA, compareMonthB, compareYearB)

  const allCompareCategories = Array.from(new Set([...compareDataA.categories.map(c => c.name), ...compareDataB.categories.map(c => c.name)]))
  const compareChartData = allCompareCategories.map(cat => ({
    category: cat,
    [compareLabelA]: compareDataA.categories.find(c => c.name === cat)?.value || 0,
    [compareLabelB]: compareDataB.categories.find(c => c.name === cat)?.value || 0,
  })).sort((a,b) => (b[compareLabelA] + b[compareLabelB]) - (a[compareLabelA] + a[compareLabelB]))

  const routineCompareCategories = Array.from(new Set([...routineCompareDataA.categories.map(c => c.name), ...routineCompareDataB.categories.map(c => c.name)]))
  const routineCompareChartData = routineCompareCategories.map(cat => ({
    category: cat,
    [compareLabelA]: routineCompareDataA.categories.find(c => c.name === cat)?.value || 0,
    [compareLabelB]: routineCompareDataB.categories.find(c => c.name === cat)?.value || 0,
  })).sort((a,b) => (b[compareLabelA] + b[compareLabelB]) - (a[compareLabelA] + a[compareLabelB]))

  const top5Categories = getTopExpenseCategories(data?.transactions || [])
  const routineTop5Categories = getTopExpenseCategories(routineTransactions)
  const trendData = buildExpenseTrendData(data?.transactions || [], top5Categories)
  const routineTrendData = buildExpenseTrendData(routineTransactions, routineTop5Categories)

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
    if (!hasFeature(entitlement, "transactions")) {
      showToast("Fitur transaksi sedang tidak tersedia.", "info")
      return
    }
    setTxType(type)
    setQuickAddOpen(true)
  }

  const handleAnomalyCategoryClick = (category) => {
    setCategoryFilter(category)
    setActiveNav("stats")
  }

  // Bill handlers
  const handleBillPay = (bill) => setBillPayTarget(bill)
  const handleBillsChanged = async () => {
    await refetchBills()
    fetchData()
  }
  const handleBillPaid = async (result) => {
    setBillPayTarget(null)
    if (hapticsEnabled) haptics.success()
    if (soundEnabled) playSuccessSound()
    showToast(`Tagihan dibayar! ${result.transaction?.kategori} · ${formatRp(result.transaction?.jumlah)} ✓`)
    fetchData()
    setBillsRefreshTrigger(t => t + 1)
    await refetchBills()
  }
  const handleBillEditFromPay = (bill) => {
    setBillPayTarget(null)
    setBillEditTarget(bill)
  }
  const handleBillEditSaved = async () => {
    setBillEditTarget(null)
    showToast("Tagihan diperbarui ✓")
    fetchData()
    setBillsRefreshTrigger(t => t + 1)
    await refetchBills()
  }

  const topCategory = expenseCategories[0] || { name: "—", value: 0 }
  const topCategoryPct = statExpense > 0 ? (topCategory.value / statExpense) * 100 : 0

  const recent5 = (data?.transactions || [])
    .slice()
    .sort((a, b) => parseTxDate(b.date) - parseTxDate(a.date))
    .slice(0, 5)

  return (
    <div className="min-h-screen pb-52 sm:pb-44 font-body relative text-earth-800">
      {/* P8: Parallax background */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-organic" style={{ transform: `translateY(${scrollY * -0.15}px)` }} aria-hidden="true" />

      {/* Toast */}
      {toast && (
        <Toast
          open={!!toast}
          onDone={dismissToast}
          variant={toast.type}
          position="bottom"
          duration={toast.duration ?? (toast.action ? 8000 : 5000)}
          action={toast.action}
        >
          {toast.msg}
        </Toast>
      )}

      <UserNameSetup
        initialValue={effectiveUserName}
        open={Boolean(
          data &&
          session &&
          !needsSheetConnection &&
          !settingsLoading &&
          !settingsError &&
          !String(settings.userName || "").trim() &&
          !settings.userNamePromptDismissed &&
          !userNamePromptClosed,
        )}
        mode="prompt"
        onClose={() => setUserNamePromptClosed(true)}
        onSaved={async () => {
          setUserNamePromptClosed(true)
          await refetchSettings()
        }}
        onDismissed={async () => {
          setUserNamePromptClosed(true)
          await refetchSettings()
        }}
      />

      {/* Header with P4 animated gradient */}
      <header className="sticky top-0 z-20 px-5 pt-6 pb-3 glass-nav safe-top">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-earth-500">
              {activeNav === "home" ? "Beranda" : activeNav === "stats" ? "Statistik" : activeNav === "plan" ? "Rencana" : "Profil"}
            </p>
            <h1 className="text-2xl font-display font-bold text-earth-900 tracking-tight leading-tight mt-0.5">
              {activeNav === "home" && (data?.transactions?.[0] ? "Halo 👋" : "Artami")}
              {activeNav === "home" && effectiveUserName ? `, ${effectiveUserName}` : ""}
              {activeNav === "stats" && "Statistik"}
              {activeNav === "plan" && "Rencana"}
              {activeNav === "profile" && "Profil"}
            </h1>
            {activeNav === "home" && lastSyncAt && (
              <button
                onClick={() => fetchData()}
                disabled={refreshing}
                className="text-[10px] font-bold text-earth-500 mt-1 tracking-wide active:opacity-60 transition-opacity"
                aria-label="Perbarui data"
              >
                {!isOnline
                  ? `Offline · ${getLastSyncAgo(lastSyncAt, syncNow)}`
                  : refreshing
                    ? "Memperbarui..."
                    : `Tersinkron ${getLastSyncAgo(lastSyncAt, syncNow)} · Ketuk untuk perbarui`}
              </button>
            )}
          </div>
          {activeNav === "home" && (
            <button onClick={() => setActiveNav("profile")} aria-label="Buka profil" className="relative active:scale-95 transition-transform flex-shrink-0 ml-3">
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
          style={{ height: pullRefreshing ? 48 : pullDistance, background: pullDistance >= 80 ? THEME.surfaceWarm : "transparent" }} aria-hidden="true">
          <div className={`flex items-center gap-2 text-xs font-bold text-earth-500 transition-all duration-300 ${pullRefreshing ? "opacity-100" : pullDistance >= 80 ? "opacity-100" : "opacity-0"}`}>
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
        <PaymentStatusBanner enabled={hasFeature(entitlement, "paymentQris")} />
        {/*
          Product & IA ownership contract (Task 1 pre-migration lock):
          - Beranda/home owns summary + urgent actions; keep "Fokus hari ini" as a P1 Beranda element.
          - Statistik/stats owns analysis + reports.
          - Rencana/plan owns goals + budgets + bills + planning.
          - Profil/profile owns account + settings.
          - Preserve the 4-tab shell in this task; do not move UI ownership here.
        */}
        {activeNav === "home" && (
          <HomeTab
            data={data}
            statIncome={statIncome} statExpense={statExpense} statSavings={statSavings}
            topCategory={topCategory} topCategoryPct={topCategoryPct}
            recent5={recent5}
            setActiveNav={setActiveNav} openPlanSection={openPlanSection} openQuickAdd={openQuickAdd} setDrillDown={setDrillDown}
            allTransactions={data?.transactions || []}
            selectedMonth={selectedMonth} selectedYear={selectedYear}
            monthlyData={routineAnalysisMonthlyData}
            insights={insights}
            entitlement={entitlement}
          />
        )}
        {activeNav === "stats" && (
          <StatsTab
            data={data}
            filteredTransactions={filteredTransactions}
            statIncome={statIncome} statExpense={statExpense} statSavings={statSavings} statSurplus={statSurplus}
            expenseCategories={expenseCategories} incomeCategories={incomeCategories}
             availableYears={availableYears} compareYearOptions={compareYearOptions} availableAccounts={availableAccounts}
             selectedMonth={selectedMonth} selectedYear={selectedYear} selectedAccount={selectedAccount} categoryFilter={categoryFilter}
            dateFrom={dateFrom} dateTo={dateTo}
            setSelectedMonth={setSelectedMonth} setSelectedYear={setSelectedYear} setSelectedAccount={setSelectedAccount} setCategoryFilter={setCategoryFilter}
            setDateFrom={setDateFrom} setDateTo={setDateTo}
             clientMonthlyData={clientMonthlyData}
             routineClientMonthlyData={routineClientMonthlyData}
             top5Categories={top5Categories} trendData={trendData}
             routineExpenseCategories={routineExpenseCategories}
             routineTop5Categories={routineTop5Categories} routineTrendData={routineTrendData}
             compareMode={compareMode} compareMonthA={compareMonthA} compareYearA={compareYearA} compareMonthB={compareMonthB} compareYearB={compareYearB}
             compareLabelA={compareLabelA} compareLabelB={compareLabelB}
             compareDataA={compareDataA} compareDataB={compareDataB} compareChartData={compareChartData}
             routineCompareDataA={routineCompareDataA} routineCompareDataB={routineCompareDataB} routineCompareChartData={routineCompareChartData}
             setCompareMode={setCompareMode} setCompareMonthA={setCompareMonthA} setCompareYearA={setCompareYearA} setCompareMonthB={setCompareMonthB} setCompareYearB={setCompareYearB}
             resetComparePeriods={resetComparePeriods}
             calMonth={calMonth} calYear={calYear} calMonthIdx={calMonthIdx} calWeeks={calWeeks} calendarDayTotals={calendarDayTotals}
            navigateCalendar={navigateCalendar} handleDayClick={handleDayClick}
            insights={insights}
            isAllMonths={isAllMonths} refreshing={refreshing}
            onToast={showToast}
            onEditTx={handleEditTx}
             onDeleteTx={handleDelete}
             haptics={haptics}
              hapticsEnabled={hapticsEnabled}
              monthlyData={routineAnalysisMonthlyData}
              allTransactions={data?.transactions || []}
              now={syncNow}
              bills={bills}
              billsLoading={billsLoading}
              billsError={billsError}
              refetchBills={refetchBills}
              onCategoryClick={handleAnomalyCategoryClick}
             userName={effectiveUserName}
             entitlement={entitlement}
          />
        )}
        {activeNav === "plan" && (
          <PlanTab
            data={data}
            transactions={data?.transactions || []}
            monthlyData={data?.monthlyData || []}
            goalsRefreshTrigger={goalsRefreshTrigger}
            eventsRefreshTrigger={eventsRefreshTrigger}
            billsRefreshTrigger={billsRefreshTrigger}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            selectedAccount={selectedAccount}
            filteredTransactions={filteredTransactions}
            expenseCategories={expenseCategories}
            onToast={showToast}
            onWhatIfOpen={() => setWhatIfOpen(true)}
            activeSection={activePlanSection}
            onSectionChange={setActivePlanSection}
            onUsageChange={fetchEntitlement}
            onBillsChanged={handleBillsChanged}
            transactionUsage={entitlement?.usage?.transactions}
            entitlement={entitlement}
          />
        )}
        {activeNav === "profile" && (
          <ProfileTab userName={effectiveUserName} session={session} data={data} entitlement={entitlement} signOut={signOut} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} hapticsEnabled={hapticsEnabled} setHapticsEnabled={setHapticsEnabled} onToast={showToast} onRefresh={fetchData} />
        )}
      </div>

      {/* Day transactions modal */}
      {selectedDayTx && (
        <Sheet
          open={!!selectedDayTx}
          onClose={() => setSelectedDayTx(null)}
          title={`${selectedDayTx.day} ${calMonth} ${calYear}`}
          size="md"
          maxHeight="80vh"
        >
          {selectedDayTx.transactions.length === 0 ? (
            <p className="text-xs text-earth-500 text-center py-4">Tidak ada pengeluaran pada hari ini</p>
          ) : (
            <div className="space-y-3">
              {selectedDayTx.transactions.map((t, i) => (
                <div key={i} className="flex justify-between items-center pb-3 border-b border-earth-100 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="font-semibold text-sm text-earth-800 truncate">{t.category}</p>
                      {isSpecialExpense(t) && <SpecialBadge />}
                    </div>
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
        </Sheet>
      )}

      {/* Drill-down modal with Q4: animated counter + Edit/Delete actions */}
      {drillDown && (
        <DrillDownModal
          drillDown={drillDown}
          data={data}
          onClose={() => setDrillDown(null)}
          onEdit={handleEditTx}
          onDelete={handleDelete}
        />
      )}

      {/* Delete confirm sheet */}
      {deleteConfirmTx && (
        <ConfirmSheet
          title="Hapus Transaksi?"
          message={`${deleteConfirmTx.category} - ${formatRp(deleteConfirmTx.amount)} pada ${deleteConfirmTx.date} akan dihapus permanen.`}
          confirmLabel="Hapus"
          confirmColor={THEME.danger}
          onConfirm={performDelete}
          onClose={() => { if (!deletingTx) setDeleteConfirmTx(null) }}
          confirming={deletingTx}
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

      {/* Quick-add sheet (mobile-native fast path) */}
      <QuickAddSheet
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        initialType={txType}
        onSubmit={submitTransaction}
        onGoalContribute={openGoalPicker}
        transactionUsage={entitlement?.usage?.transactions}
        specialSuggestion={specialSuggestion}
      />

      {/* Goal celebration */}
      {goalCelebration && (
        <GoalCelebration
          goal={goalCelebration}
          haptics={haptics}
          hapticsEnabled={hapticsEnabled}
          onDone={() => setGoalCelebration(null)}
        />
      )}

      {/* Event celebration */}
      {eventCelebration && (
        <EventCelebration
          event={eventCelebration}
          haptics={haptics}
          hapticsEnabled={hapticsEnabled}
          onDone={() => setEventCelebration(null)}
        />
      )}

      {/* Goal picker modal */}
      <GoalPickerModal
        open={goalPickerOpen}
        onClose={() => setGoalPickerOpen(false)}
        onOpenGoals={() => {
          setGoalPickerOpen(false)
          openPlanSection("goal")
        }}
        transactions={data?.transactions || []}
        transactionUsage={entitlement?.usage?.transactions}
        onSaved={() => {
          fetchData()
          setGoalsRefreshTrigger(t => t + 1)
          setEventsRefreshTrigger(t => t + 1)
          setTimeout(() => checkGoalCelebration(), 800)
          setTimeout(() => checkEventCelebration(), 800)
        }}
      />

      {/* What-If Scenario Modal */}
      {hasFeature(entitlement, "whatIf") && <WhatIfModal open={whatIfOpen} onClose={() => setWhatIfOpen(false)} transactions={data?.transactions || []} />}

      {/* Bill Pay Modal */}
      {billPayTarget && (
        <BillPayModal
          bill={billPayTarget}
          onClose={() => setBillPayTarget(null)}
          onPaid={handleBillPaid}
          onEdit={handleBillEditFromPay}
          transactionUsage={entitlement?.usage?.transactions}
        />
      )}

      {/* Bill Edit Modal */}
      {billEditTarget && (
        <BillSetupModal
          bill={billEditTarget}
          onClose={() => setBillEditTarget(null)}
          onSaved={handleBillEditSaved}
        />
      )}

      {/* Setup Saldo Awal (first-time flow) */}
      <SetupSaldoAwal
        settings={settings}
        onSaved={() => { refetchSettings(); fetchData() }}
      />

      {/* Floating Action Button */}
      {hasFeature(entitlement, "transactions") && <button
          onClick={() => { if (hapticsEnabled) haptics.tap(); openQuickAdd("expense") }}
          aria-label="Tambah transaksi baru"
          aria-haspopup="dialog"
          className={`fixed bottom-24 sm:bottom-20 right-4 sm:right-5 z-40 max-w-md transition-all duration-300 ease-out ${fabVisible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"}`}
        >
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl mesh-aurora shadow-pop flex items-center justify-center active:scale-90 transition-transform" style={{ boxShadow: "0 12px 32px rgba(124,95,207,0.4)" }}>
          <Plus size={22} color="white" strokeWidth={2.5} aria-hidden="true" />
        </div>
      </button>}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-4 sm:bottom-5 left-4 sm:left-5 right-4 sm:right-5 z-30 safe-bottom max-w-md mx-auto" role="tablist" aria-label="Main navigation">
        <div className="glass-nav rounded-[28px] px-3 py-2.5 sm:py-3 flex justify-between items-center">
          {[
            { id: "home", label: "Beranda", icon: Home, aria: "Tab beranda" },
            { id: "stats", label: "Statistik", icon: Activity, aria: "Tab statistik" },
            { id: "plan", label: "Rencana", icon: Target, aria: "Tab rencana" },
            { id: "profile", label: "Profil", icon: User, aria: "Tab profil" },
          ].map((nav) => {
            const isActive = activeNav === nav.id
            return (
              <button
                key={nav.id}
                role="tab"
                aria-selected={isActive}
                aria-label={nav.aria}
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  if (hapticsEnabled) haptics.tap()
                  if (nav.id === "plan") setActivePlanSection("goal")
                  setActiveNav(nav.id)
                }}
                className="flex flex-col items-center gap-0.5 group relative px-3 py-1 rounded-2xl transition-all"
              >
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
    <Sheet
      open={true}
      onClose={onClose}
      subtitle="Top 10 Transaksi"
      title={drillDown.title}
      size="md"
      maxHeight="85vh"
    >
      {txs.length === 0 ? (
        <EmptyState icon={<Wallet size={20} />} title="Belum ada transaksi" />
      ) : (
        <>
          <div className="rounded-2xl p-3 mb-3" style={{ background: THEME.surfaceWarm }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500 mb-0.5">Total Top 10</p>
            <p className="text-xl font-display font-bold" style={{ color: drillDown.type === "income" ? THEME.income : drillDown.type === "savings" ? THEME.savings : THEME.expense }}>
              {formatRp(animatedTotal)}
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
                    {drillDown.type === "income" ? "+" : drillDown.type === "savings" ? "" : "-"}{formatRp(t.amount)}
                  </p>
                  <div className="flex gap-1 opacity-100 can-hover:opacity-0 can-hover:group-hover:opacity-100 transition-opacity">
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
    </Sheet>
  )
}
