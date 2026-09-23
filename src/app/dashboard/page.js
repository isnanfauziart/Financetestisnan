"use client"
import { useSession, signIn, signOut } from "next-auth/react"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { LogOut, Plus, X, ChevronDown, Activity, User, Home, ArrowUpRight, Wallet, Sparkles, Lightbulb, TrendingUp, TrendingDown, PiggyBank, Target, Calendar, CreditCard } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "./_components/constants"
import { useCountUp, useSoundPref, playSuccessSound, parseTxDate, formatRp, relativeDate, countUrgentBills } from "./_components/helpers"
import useHaptics from "./_components/useHaptics"
import useHapticsPref from "./_components/useHapticsPref"
import { computeAllGoalProgress, computeGoalProgress } from "./_components/goalUtils"
import { submitFinancialWrite } from "@/lib/financialWriteClient"
import { markPending, markSchemaConflict, markStale, markSynced, reportWriteOutcome, resetWriteState, useFinancialWriteGuard } from "@/lib/financialWriteState"
import { buildMonthlyCashFlowData, getStatsPeriodDefaults, getComparePeriodOptions, getCompareSeriesLabels } from "./_components/statsPeriod"
import EmptyState from "./_components/EmptyState"
import HomeTab from "./HomeTab"
import StatsTab from "./StatsTab"
import PlanTab, { getPlanSectionLabel } from "./PlanTab"
import ProfileTab from "./ProfileTab"
import EditTransactionModal from "./_components/EditTransactionModal"
import ConfirmSheet from "./_components/ConfirmSheet"
import Sheet, { closeTopSheetOnBack } from "./_components/Sheet"
import RowActionsMenu from "./_components/RowActionsMenu"
import Toast from "./_components/Toast"
import Skeleton from "./_components/Skeleton"
import QuickAddSheet from "./_components/QuickAddSheet"
import OnboardingOverlay from "./_components/OnboardingOverlay"
import { deriveOnboardingState, ONBOARDING_STEPS } from "./_components/useOnboardingState"
import { buildRepeatPrefill, isRepeatableTransaction } from "@/lib/transactionRepeat"
import { diffDashboardUrlState, parseDashboardUrl, serializeDashboardUrl, splitComparePeriod } from "./_components/dashboardUrlState"
import SyncStatus from "./_components/SyncStatus"
import { readCache, writeCache, clearCache, getLastSyncAgo, shouldAutoRefreshOnVisible } from "./_components/useDashboardCache"
import GoalCelebration from "@/components/GoalCelebration"
import GoalPickerModal from "@/components/GoalPickerModal"
import WhatIfModal from "@/components/WhatIfModal"
import BillPayModal from "@/components/BillPayModal"
import BillSetupModal from "@/components/BillSetupModal"
import EventCelebration from "@/components/EventCelebration"
import LegacySheetConnector from "@/components/LegacySheetConnector"
import UserNameSetup from "@/components/UserNameSetup"
import PaymentStatusBanner from "./_components/PaymentStatusBanner"
import { SharedDataScopeContext, useBills, useSettings } from "@/lib/useSharedData"
import { registerServiceWorker, requestNotificationPermission } from "@/lib/notifications"
import { hasFeature, isProRegistrationOpen } from "@/lib/featureAccess"
import { getEffectiveUserName } from "@/lib/userDisplayName"
import { isSpecialExpense } from "@/lib/expenseClass"
import { getCategoryVisual } from "@/lib/categoryIcons"

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
    <span className="inline-flex flex-shrink-0 items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-violet-700">
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
  const [checkingRefresh, setCheckingRefresh] = useState(false)
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === "undefined") return true
    return navigator.onLine
  })
  const [syncNow, setSyncNow] = useState(() => Date.now())
  // Wave 5 — URL-backed view state. Parsed once on the first client render so
  // deep links and refresh restore the same view; the server renders defaults
  // and the client re-renders from the URL after hydration.
  const [urlViewState] = useState(() => (typeof window === "undefined" ? null : parseDashboardUrl(window.location.search)))
  const [activeNav, setActiveNav] = useState(() => urlViewState?.tab ?? "home")
  const [activePlanSection, setActivePlanSection] = useState(() => urlViewState?.planSection ?? "overview")
  // Wave 7 — polite announcement for deliberate Rencana section navigation.
  const [planSectionAnnouncement, setPlanSectionAnnouncement] = useState("")
  const [planAnnouncementCount, setPlanAnnouncementCount] = useState(0)
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
  // Wave 5 — Ulangi transaksi: the row being repeated, cleared on every
  // non-repeat open and when the sheet closes.
  const [repeatTx, setRepeatTx] = useState(null)

  // Stats state — Wave 5: URL-backed. Lazy initializers read deep-linked values
  // once; missing or invalid parameters fall back to the same defaults.
  const [statsActiveSection, setStatsActiveSection] = useState(() => urlViewState?.statsSection ?? "ringkasan")
  const [analysisMode, setAnalysisMode] = useState(() => urlViewState?.analysisMode ?? "routine")
  const [selectedMonth, setSelectedMonth] = useState(() => urlViewState?.month ?? statsDefaults.selectedMonth)
  const [selectedYear, setSelectedYear] = useState(() => urlViewState?.year ?? statsDefaults.selectedYear)
  const [selectedAccount, setSelectedAccount] = useState(() => urlViewState?.account ?? "Semua Akun")
  const [categoryFilter, setCategoryFilter] = useState(() => urlViewState?.category ?? null)
  const [dateFrom, setDateFrom] = useState(() => urlViewState?.dateFrom ?? "")
  const [dateTo, setDateTo] = useState(() => urlViewState?.dateTo ?? "")

  // Comparison state — Wave 5: URL-backed as one "Mei 2026" period per side.
  const urlCompareA = urlViewState?.compareA || `${statsDefaults.compareMonthA} ${statsDefaults.compareYearA}`
  const urlCompareB = urlViewState?.compareB || `${statsDefaults.compareMonthB} ${statsDefaults.compareYearB}`
  const [compareMode, setCompareMode] = useState(() => urlViewState?.compare ?? true)
  const [compareMonthA, setCompareMonthA] = useState(() => splitComparePeriod(urlCompareA).month)
  const [compareYearA, setCompareYearA] = useState(() => splitComparePeriod(urlCompareA).year)
  const [compareMonthB, setCompareMonthB] = useState(() => splitComparePeriod(urlCompareB).month)
  const [compareYearB, setCompareYearB] = useState(() => splitComparePeriod(urlCompareB).year)

  // Calendar state for daily expense heatmap — Wave 5: URL-backed.
  const [calMonth, setCalMonth] = useState(() => urlViewState?.calMonth ?? AVAILABLE_MONTHS[new Date().getMonth()])
  const [calYear, setCalYear] = useState(() => urlViewState ? Number(urlViewState.calYear) || new Date().getFullYear() : new Date().getFullYear())
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
  const [onboardingOptionalDone, setOnboardingOptionalDone] = useState(false)
  // Once the first transaction commits inside the overlay, hold the shell at
  // the optional next-step screen; the Sheet-derived rule alone would drop the
  // gate the moment the transaction lands. A refresh intentionally skips the
  // optional offer — it is an offer, not a required outcome.
  const [onboardingFirstTxDone, setOnboardingFirstTxDone] = useState(false)
  // The balance write is durable once the server accepts it (it stamps
  // startingBalanceConfirmed); local commit state keeps the gate engaged while
  // the settings/dashboard feeds refetch, so a slow or failed refetch can
  // never drop the gate back to an unconfirmed dashboard.
  const [onboardingBalanceDone, setOnboardingBalanceDone] = useState(false)

  // Settings
  const { bills, loading: billsLoading, error: billsError, refetch: refetchBills } = useBills(status === "authenticated", sessionKey)
  const { settings, loading: settingsLoading, error: settingsError, refetch: refetchSettings } = useSettings(sessionKey)
  // D5 Rencana badge: overdue / due-today bills (HomeTab priority-card urgency subset)
  const urgentBillCount = useMemo(() => countUrgentBills(bills), [bills])
  const effectiveUserName = getEffectiveUserName({
    savedName: settings.userName,
    googleName: session?.user?.name,
    email: session?.user?.email,
  })

  // Scroll Y for P8 parallax
  const [scrollY, setScrollY] = useState(0)
  const [fabVisible, setFabVisible] = useState(true)
  // D6 top app bar scroll-away
  const [headerHidden, setHeaderHidden] = useState(false)
  const lastScrollYRef = useRef(0)
  const fabRef = useRef(null)
  // D5 contextual notification permission — ask once per session, after first bill pay
  const billNotifPromptShownRef = useRef(false)

  const setFabVisibility = useCallback((visible) => {
    if (!visible && fabRef.current === document.activeElement) fabRef.current.blur()
    setFabVisible(visible)
  }, [])

  const hasSessionData = status === "authenticated" && !!sessionKey && storedDataOwner === sessionKey
  const data = hasSessionData ? storedData : null
  const dashboardLoading = status === "authenticated" && !hasSessionData ? true : loading
  const proRegistrationOpen = isProRegistrationOpen(entitlement)
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
    // Wave 2 login freshness: cached figures may render immediately, but money
    // writes wait for the first fresh fetch (or a known failure state).
    if (cache?.data) markPending("cached")
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
    if (!session) return Promise.resolve()
    fetchEntitlement()
    if (data) setRefreshing(true)
    return fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => {
        if (d.needsSheetConnection || d.code === "SHEET_CONNECTION_REQUIRED") {
          setNeedsSheetConnection(true)
          setStoredDataOwner(sessionKey)
          setStoredData(null)
          setError(null)
          return
        }
        if (d.code === "SCHEMA_CONFLICT") {
          // Additive schema upgrade refused: cached figures stay on screen and
          // money writes stop until the Sheet is reviewed.
          markSchemaConflict(d.error)
          setError(null)
          return
        }
        if (d.error) {
          markStale(d.error)
          setError(d.error)
        } else {
          setNeedsSheetConnection(false)
          setStoredDataOwner(sessionKey)
          setStoredData(d)
          setError(null)
          const ts = d.serverTimestamp || new Date().toISOString()
          setStoredLastSyncAt(ts)
          markSynced(ts)
          writeCache(d, sessionKey)
        }
      })
      .catch(e => { markStale(e.message); setError(e.message) })
      .finally(() => { setLoading(false); setRefreshing(false); setCheckingRefresh(false) })
  }, [session, sessionKey, data, fetchEntitlement])

  useEffect(() => { if (session) fetchData() }, [session?.user?.email])

  // Wave 4 — required guided first use. Sheet-derived new-account rule:
  // onboarding only when the account has zero transactions and the opening
  // balance was never confirmed; everyone else enters normally.
  const onboarding = deriveOnboardingState({
    transactions: data?.transactions || [],
    settings,
    settingsLoading,
    settingsError,
  })
  const onboardingActive = onboarding.active && !onboardingOptionalDone
  const onboardingEngaged = !onboardingOptionalDone && (onboarding.active || onboardingBalanceDone || onboardingFirstTxDone)
  // null renders the neutral loading screen (fail-closed while settings are
  // unknown and no outcome has committed locally yet).
  const onboardingStep = onboardingFirstTxDone
    ? ONBOARDING_STEPS.optional
    : !onboarding.ready
      ? null
      : onboardingBalanceDone || onboarding.step === ONBOARDING_STEPS.transaction
        ? ONBOARDING_STEPS.transaction
        : ONBOARDING_STEPS.balance

  // Browser Back must not bypass a required step. Push one sentinel entry so
  // the first Back press pops the sentinel (and does nothing) instead of
  // leaving the dashboard; refresh and reopen resume from Sheet-backed state.
  const onboardingBackGuardRef = useRef(false)
  useEffect(() => {
    if (!onboardingActive || onboardingBackGuardRef.current) return
    onboardingBackGuardRef.current = true
    const sentinel = { __artamiOnboarding: true }
    window.history.pushState(sentinel, "")
    const onPopState = () => { window.history.pushState(sentinel, "") }
    window.addEventListener("popstate", onPopState)
    return () => {
      onboardingBackGuardRef.current = false
      window.removeEventListener("popstate", onPopState)
    }
  }, [onboardingActive])

  const handleOnboardingBalanceSaved = useCallback(async ({ amount, date }) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [
            ["startingBalance", amount],
            ["startingBalanceDate", date],
          ],
        }),
      })
      const result = await res.json().catch(() => null)
      if (!res.ok) return { ok: false, error: result?.error || "Gagal menyimpan. Coba lagi." }
      setOnboardingBalanceDone(true)
      // The server stamps startingBalanceConfirmed on this write. Refresh both
      // cached feeds so the transaction step is derived from confirmed state.
      await Promise.all([refetchSettings(), fetchData()])
      return { ok: true }
    } catch {
      return { ok: false, error: "Gagal menyimpan. Coba lagi." }
    }
  }, [refetchSettings, fetchData])

  const handleOnboardingFinish = useCallback(() => {
    setOnboardingOptionalDone(true)
    setActiveNav("home")
    setActivePlanSection("overview")
  }, [])

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

  const refreshingRef = useRef(false)
  useEffect(() => { refreshingRef.current = refreshing }, [refreshing])

  // Wave 1: auto-refresh when the app becomes visible again after a long pause.
  // Figures stay on screen; SyncStatus shows "Memeriksa pembaruan…" meanwhile.
  useEffect(() => {
    if (status !== "authenticated") return undefined
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      if (shouldAutoRefreshOnVisible({ lastSyncAt: storedLastSyncAt, refreshing: refreshingRef.current, isOnline })) {
        setCheckingRefresh(true)
        fetchData()
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [status, storedLastSyncAt, isOnline, fetchData])

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
      const allocations = data?.balances?.allocations
      const prev = prevGoalPctRef.current
      for (const goal of goals) {
        const sum = computeGoalProgress(goal, allocations)
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

  // P8: Parallax scroll listener (+ D6 top app bar scroll-away)
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentY = window.scrollY
          setScrollY(currentY)
          if (currentY > 100) {
            setFabVisibility(currentY < lastScrollYRef.current || currentY < lastScrollYRef.current + 10)
            // Scrolling down hides the app bar; any scroll-up restores it.
            setHeaderHidden(currentY > lastScrollYRef.current)
          } else {
            setFabVisibility(true)
            setHeaderHidden(false)
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
    // The dashboard scrolls at window level; the content div is not an overflow
    // container, so its scrollTop is always 0 and can never gate the pull.
    // Gate on window.scrollY so pull-to-refresh only starts at the actual top.
    if (window.scrollY <= 0) {
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
      const startedAt = Date.now()
      // ponytail: min-hold 400ms so the spinner doesn't flash; dismisses when fetchData settles
      Promise.resolve(fetchData()).catch(() => {}).finally(() => {
        setTimeout(() => setPullRefreshing(false), Math.max(0, 400 - (Date.now() - startedAt)))
      })
    }
    setPullDistance(0)
    pullDistRef.current = 0
    pullStartY.current = 0
    pullLocked.current = false
  }, [fetchData])

  // Wave 5 — URL sync. One effect owns the address bar: destination changes
  // (tab, plan/stats section) push a history entry users can Back through;
  // filter changes replace the current entry so tweaking filters does not
  // create history noise. Back/Forward re-applies the URL's view state, after
  // any open sheet has had its chance to consume the pop (modal history).
  const previousViewStateRef = useRef(null)
  const applyingPopRef = useRef(null)

  const buildViewState = useCallback(() => ({
    tab: activeNav,
    planSection: activePlanSection,
    statsSection: statsActiveSection,
    analysisMode,
    month: selectedMonth,
    year: selectedYear,
    account: selectedAccount,
    category: categoryFilter,
    dateFrom,
    dateTo,
    compare: compareMode,
    compareA: `${compareMonthA} ${compareYearA}`,
    compareB: `${compareMonthB} ${compareYearB}`,
    calMonth,
    calYear: String(calYear),
  }), [activeNav, activePlanSection, statsActiveSection, analysisMode, selectedMonth, selectedYear,
    selectedAccount, categoryFilter, dateFrom, dateTo, compareMode, compareMonthA, compareYearA,
    compareMonthB, compareYearB, calMonth, calYear])

  const applyViewState = useCallback((view) => {
    setActiveNav(view.tab)
    setActivePlanSection(view.planSection)
    setStatsActiveSection(view.statsSection)
    setAnalysisMode(view.analysisMode)
    setSelectedMonth(view.month)
    setSelectedYear(view.year)
    setSelectedAccount(view.account)
    setCategoryFilter(view.category)
    setDateFrom(view.dateFrom)
    setDateTo(view.dateTo)
    setCompareMode(view.compare)
    const a = splitComparePeriod(view.compareA)
    setCompareMonthA(a.month); setCompareYearA(a.year)
    const b = splitComparePeriod(view.compareB)
    setCompareMonthB(b.month); setCompareYearB(b.year)
    setCalMonth(view.calMonth)
    setCalYear(Number(view.calYear) || new Date().getFullYear())
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const view = buildViewState()
    const nextQuery = serializeDashboardUrl(view)
    const currentQuery = window.location.search.replace(/^\?/, "")

    if (previousViewStateRef.current === null) {
      // First run: normalize the address bar (drop unknown params) without
      // creating a history entry, since the view already came from the URL.
      previousViewStateRef.current = view
      if (nextQuery !== currentQuery) {
        window.history.replaceState(window.history.state, "", nextQuery ? `?${nextQuery}` : window.location.pathname)
      }
      return
    }

    if (applyingPopRef.current) {
      // The change came from Back/Forward; the popped URL is already correct.
      applyingPopRef.current = null
      previousViewStateRef.current = view
      return
    }

    const kind = diffDashboardUrlState(previousViewStateRef.current, view)
    previousViewStateRef.current = view
    if (kind === "none") {
      // View unchanged; repair the address bar if it drifted (e.g. after an
      // open sheet consumed a Back pop).
      if (nextQuery !== currentQuery) {
        window.history.replaceState(window.history.state, "", nextQuery ? `?${nextQuery}` : window.location.pathname)
      }
      return
    }
    const url = nextQuery ? `?${nextQuery}` : window.location.pathname
    if (kind === "push") {
      window.history.pushState(window.history.state, "", url)
    } else {
      window.history.replaceState(window.history.state, "", url)
    }
  }, [buildViewState])

  useEffect(() => {
    if (typeof window === "undefined") return undefined
    const onPopState = () => {
      // An open sheet owns the press first (close or discard-confirm); only a
      // non-sheet pop re-applies the URL's view state.
      if (closeTopSheetOnBack()) return
      applyingPopRef.current = true
      applyViewState(parseDashboardUrl(window.location.search))
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [applyViewState])

  // Wave 5 — after a controlled destination change (tab or section), move focus
  // to the destination heading so keyboard and screen-reader users land there.
  // Filter-only changes never focus (no destination change → no effect).
  const prevDestinationRef = useRef({
    tab: typeof window === "undefined" ? "home" : parseDashboardUrl(window.location.search).tab,
    plan: activePlanSection,
    stats: statsActiveSection,
  })
  useEffect(() => {
    const prev = prevDestinationRef.current
    const tabChanged = prev.tab !== activeNav
    const planChanged = activeNav === "plan" && prev.plan !== activePlanSection
    const statsChanged = activeNav === "stats" && prev.stats !== statsActiveSection
    prevDestinationRef.current = { tab: activeNav, plan: activePlanSection, stats: statsActiveSection }
    if (!tabChanged && !planChanged && !statsChanged) return undefined
    // Wave 7 — announce the opened Rencana section and move focus to the
    // section's own nav control (fallback: the Rencana heading).
    if (planChanged) {
      setPlanSectionAnnouncement(`Bagian ${getPlanSectionLabel(activePlanSection)} dibuka`)
      setPlanAnnouncementCount(count => count + 1)
    }
    const frame = requestAnimationFrame(() => {
      const target = planChanged
        ? (document.querySelector('[aria-controls="plan-section-panel"][aria-current="page"]') || document.getElementById("plan-page-title"))
        : statsChanged
          ? document.querySelector('[data-testid="stats-section-tab"][aria-selected="true"]')
          : document.getElementById("dashboard-heading")
      target?.focus({ preventScroll: false })
    })
    return () => cancelAnimationFrame(frame)
  }, [activeNav, activePlanSection, statsActiveSection])

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

  // Wave 6 — Beranda checklist evidence links land on the exact stats section
  // and category that prove the item.
  const openStatsDestination = useCallback((destination = {}) => {
    setActiveNav("stats")
    if (destination.section) setStatsActiveSection(destination.section)
    if (destination.category) setCategoryFilter(destination.category)
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
  const gatedInsights = hasFeature(entitlement, "insights") ? insights : []

  // Stable identity: showToast is passed down as onToast to every tab/section.
  // A new identity per render would invalidate section-level useCallback deps
  // (e.g. BillsSection fetchBills) and restart their fetch effects on every
  // scroll/click re-render.
  const showToast = useCallback((msg, type = "success", action = null, options = {}) => {
    setToast({ msg, type, action, duration: options.duration })
  }, [])

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
      const write = await submitFinancialWrite({
        url: "/api/transaction",
        body: { ...requestFormData, jumlah: rawAmount.replace(/\./g, ""), type: txType },
      })
      const result = write.data || {}
      reportWriteOutcome(write)
      if (write.ok) {
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
          write.error || "Gagal menyimpan",
          "error",
          result.code === "FEATURE_LIMIT_REACHED"
            ? { label: proRegistrationOpen ? "Upgrade" : "Pro sementara ditutup", onClick: () => window.location.assign("/upgrade") }
            : null,
          write.outcome === "unresolved" ? { duration: null } : undefined
        )
        return { ok: false, error: { ...result, operationId: write.operationId } }
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

  const handleSignOut = useCallback(() => {
    clearCache(sessionKey)
    resetWriteState()
    signOut({ callbackUrl: "/" })
  }, [sessionKey])

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

  const writeGuard = useFinancialWriteGuard()
  const writeBlockedToast = useCallback(() => {
    showToast(writeGuard.message || "Sinkronkan data sebelum menyimpan perubahan.", "error")
  }, [writeGuard.message, showToast])

  const performDelete = async () => {
    if (writeGuard.blocked) {
      writeBlockedToast()
      return
    }
    const tx = deleteConfirmTx
    if (!tx) return
    setDeletingTx(true)
    try {
      const write = await submitFinancialWrite({
        url: `/api/transaction/${tx.id}`,
        method: "DELETE",
        body: {
          tab: tx.type === "income" ? "Pemasukan" : tx.type === "savings" ? "Tabungan" : "Pengeluaran",
          rowIndex: tx.rowIndex,
        },
      })
      reportWriteOutcome(write)
      if (!write.ok) throw new Error(write.error || "Gagal menghapus")
      const result = write.data || {}
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
    if (writeGuard.blocked) {
      showToast(writeGuard.message || "Sinkronkan data sebelum memulihkan transaksi.", "error")
      return
    }
    setToast(null)
    try {
      const write = await submitFinancialWrite({ url: "/api/transaction", body: { undoToken } })
      reportWriteOutcome(write)
      if (write.ok) {
        if (hapticsEnabled) haptics.success()
        showToast("Transaksi dipulihkan ✓")
        fetchData()
        setGoalsRefreshTrigger(t => t + 1)
      } else {
        showToast(write.error || "Gagal memulihkan", "error")
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
        <p className="text-sm font-semibold text-md3-on-surface-variant">Memuat data keuangan...</p>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-strong rounded-[32px] p-8 max-w-sm w-full text-center" role="status">
          <h1 className="text-xl font-bold text-md3-on-surface mb-2 font-display">Sesi tidak ditemukan</h1>
          <p className="text-sm text-md3-on-surface-variant">Mengalihkan ke halaman masuk...</p>
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
        onSignOut={handleSignOut}
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
          <h2 className="text-xl font-bold text-md3-on-surface mb-2 font-display">Gagal Memuat Data</h2>
          <p className="text-sm text-md3-on-surface-variant mb-6">{error}</p>
          <div className="space-y-3">
            <button onClick={() => { setError(null); setLoading(true); fetchData() }} className="w-full py-3.5 rounded-2xl text-white font-semibold mesh-violet shadow-pop active:scale-95 transition-transform">
              Coba Lagi
            </button>
            <button onClick={handleSignOut} className="w-full py-3.5 rounded-2xl text-rose-500 font-semibold bg-rose-50 active:scale-95 transition-transform">
              Log Out & Relogin
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Wave 4: required guided first use replaces the whole shell while active —
  // tabs, FAB, and every other surface stay out of reach until both required
  // outcomes commit. There is no dismiss control, so Escape/backdrop cannot
  // bypass it; browser Back is guarded above; refresh/reopen resume from the
  // Sheet-backed state.
  if (onboardingEngaged) {
    return (
      <SharedDataScopeContext.Provider value={sessionKey || ""}>
        {onboardingStep === null ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-cream-50" role="status" aria-label="Memuat panduan pertama kali">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-md3-outline-variant border-t-transparent" aria-hidden="true" />
          </div>
        ) : (
          <OnboardingOverlay
            step={onboardingStep}
            specialSuggestion={specialSuggestion}
            transactionUsage={entitlement?.usage?.transactions}
            proRegistrationOpen={proRegistrationOpen}
            transactions={data?.transactions || []}
            onBalanceSaved={handleOnboardingBalanceSaved}
            onFirstTransactionSaved={() => { setOnboardingFirstTxDone(true); fetchData(); refetchSettings() }}
            onOpenPlan={openPlanSection}
            onFinish={handleOnboardingFinish}
            submitTransaction={submitTransaction}
          />
        )}
      </SharedDataScopeContext.Provider>
    )
  }

  // --- Non-hook derivations (depend on hooks defined above) ---
  const clientMonthlyData = buildMonthlyDataFromTransactions(filteredTransactions, isAllMonths)
  const routineClientMonthlyData = buildMonthlyDataFromTransactions(routineFilteredTransactions, isAllMonths)
  const cashFlowMonthlyData = isAllMonths ? buildMonthlyCashFlowData(filteredTransactions) : []
  const routineCashFlowMonthlyData = isAllMonths ? buildMonthlyCashFlowData(routineFilteredTransactions) : []

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
    setRepeatTx(null)
    setTxType(type)
    setQuickAddOpen(true)
  }

  // Wave 5 — opens the same Quick Add sheet prefilled from an eligible row;
  // validation, quota, stale-state gating, and duplicate protection are the
  // ordinary Quick Add path because submission never changes.
  const handleRepeatTransaction = (tx) => {
    if (!hasFeature(entitlement, "transactions")) {
      showToast("Fitur transaksi sedang tidak tersedia.", "info")
      return
    }
    if (!isRepeatableTransaction(tx)) return
    if (hapticsEnabled) haptics.tap()
    setRepeatTx(tx)
    setTxType(tx.type)
    setQuickAddOpen(true)
  }

  const repeatPrefill = useMemo(
    () => (repeatTx ? buildRepeatPrefill(repeatTx) : null),
    [repeatTx],
  )

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
    // Contextual permission ask: only after the user's first successful bill payment.
    if (!billNotifPromptShownRef.current) {
      billNotifPromptShownRef.current = true
      requestNotificationPermission()
    }
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
    <SharedDataScopeContext.Provider value={sessionKey || ""}>
      <div className="min-h-screen pb-52 sm:pb-44 font-body relative text-md3-on-surface">
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

      {/* Header — D6 scroll-away: slides up scrolling down, restores on scroll-up.
          Kept mounted and non-display-none so it stays accessible. */}
      <header
        className={`sticky top-0 z-20 px-5 pt-6 pb-3 glass-nav safe-top motion-safe:transition-transform duration-300 [transition-timing-function:var(--ease-emphasized)] ${headerHidden ? "-translate-y-full pointer-events-none" : "translate-y-0"}`}
        inert={headerHidden ? "" : undefined}
      >
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-md3-on-surface-variant">
              {activeNav === "home" ? "Beranda" : activeNav === "stats" ? "Statistik" : activeNav === "plan" ? "Rencana" : "Profil"}
            </p>
            <h1 id="dashboard-heading" tabIndex={-1} className="text-2xl font-display font-bold text-md3-on-surface tracking-tight leading-tight mt-0.5 focus:outline-none">
              {activeNav === "home" && (data?.transactions?.[0] ? "Halo 👋" : "Artami")}
              {activeNav === "home" && effectiveUserName ? `, ${effectiveUserName}` : ""}
              {activeNav === "stats" && "Statistik"}
              {activeNav === "plan" && "Rencana"}
              {activeNav === "profile" && "Profil"}
            </h1>
            {activeNav === "plan" && planSectionAnnouncement && (
              <p key={planAnnouncementCount} role="status" aria-live="polite" className="sr-only">{planSectionAnnouncement}</p>
            )}
            {activeNav === "home" && (
              <SyncStatus
                lastSyncAt={lastSyncAt}
                refreshing={refreshing}
                isOnline={isOnline}
                onRefresh={fetchData}
                getLastSyncAgo={getLastSyncAgo}
                checkingRefresh={checkingRefresh}
                now={syncNow}
                haptics={haptics}
                hapticsEnabled={hapticsEnabled}
              />
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2 ml-3">
            {/* Wave 5: persistent desktop entry — same Quick Add state as the FAB */}
            {hasFeature(entitlement, "transactions") && (
              <button
                onClick={() => { if (hapticsEnabled) haptics.tap(); openQuickAdd("expense") }}
                aria-label="Tambah transaksi baru"
                aria-haspopup="dialog"
                className="hidden md:inline-flex items-center gap-1.5 min-h-11 px-4 py-2.5 rounded-2xl text-sm font-bold text-white mesh-violet shadow-pop active:scale-95 transition-transform"
              >
                <Plus size={16} strokeWidth={2.5} aria-hidden="true" /> Tambah transaksi
              </button>
            )}
            {activeNav === "home" && (
              <button onClick={() => setActiveNav("profile")} aria-label="Buka profil" className="relative active:scale-95 transition-transform flex-shrink-0">
                <img src={session?.user?.image} alt="" className="w-11 h-11 rounded-2xl border-2 border-white shadow-warm" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-moss-500 border-2 border-cream-50 rounded-full" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || pullRefreshing) && (
        <div className="pull-to-refresh-indicator fixed top-0 left-0 right-0 z-30 flex items-center justify-center transition-[height,background-color] duration-300 overflow-hidden"
          style={{ height: pullRefreshing ? 48 : pullDistance, background: pullDistance >= 80 ? THEME.surfaceWarm : "transparent" }} aria-hidden="true">
          <div className={`flex items-center gap-2 text-xs font-bold text-md3-on-surface-variant transition-opacity duration-300 ${pullRefreshing ? "opacity-100" : pullDistance >= 80 ? "opacity-100" : "opacity-0"}`}>
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
        className="pull-to-refresh-content relative z-10 max-w-3xl mx-auto"
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
            openStatsDestination={openStatsDestination}
            onRepeat={handleRepeatTransaction}
            allTransactions={data?.transactions || []}
            filteredTransactions={filteredTransactions}
            selectedMonth={selectedMonth} selectedYear={selectedYear}
            monthlyData={routineAnalysisMonthlyData}
            insights={gatedInsights}
            entitlement={entitlement}
            sessionKey={sessionKey}
          />
        )}
        {activeNav === "stats" && (
          <StatsTab
            data={data}
            filteredTransactions={filteredTransactions}
             statIncome={statIncome} statExpense={statExpense} statSavings={statSavings} statSurplus={statSurplus}
             routineStatIncome={routineStatIncome} routineStatExpense={routineStatExpense} routineStatSurplus={routineStatIncome - routineStatExpense}
             expenseCategories={expenseCategories} incomeCategories={incomeCategories}
             availableYears={availableYears} compareYearOptions={compareYearOptions} availableAccounts={availableAccounts}
             selectedMonth={selectedMonth} selectedYear={selectedYear} selectedAccount={selectedAccount} categoryFilter={categoryFilter}
            dateFrom={dateFrom} dateTo={dateTo}
            setSelectedMonth={setSelectedMonth} setSelectedYear={setSelectedYear} setSelectedAccount={setSelectedAccount} setCategoryFilter={setCategoryFilter}
            setDateFrom={setDateFrom} setDateTo={setDateTo}
              clientMonthlyData={clientMonthlyData}
              routineClientMonthlyData={routineClientMonthlyData}
              cashFlowMonthlyData={cashFlowMonthlyData}
              routineCashFlowMonthlyData={routineCashFlowMonthlyData}
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
             insights={gatedInsights}
            isAllMonths={isAllMonths} refreshing={refreshing}
            onToast={showToast}
            onEditTx={handleEditTx}
             onDeleteTx={handleDelete}
             onRepeatTx={handleRepeatTransaction}
             haptics={haptics}
              hapticsEnabled={hapticsEnabled}
              monthlyData={data?.monthlyData || []}
              routineMonthlyData={routineAnalysisMonthlyData}
              allTransactions={data?.transactions || []}
              now={syncNow}
              bills={bills}
              billsLoading={billsLoading}
              billsError={billsError}
              refetchBills={refetchBills}
              onCategoryClick={handleAnomalyCategoryClick}
             userName={effectiveUserName}
             entitlement={entitlement}
             controlledSection={statsActiveSection}
             onSectionChange={setStatsActiveSection}
             controlledAnalysisMode={analysisMode}
             onAnalysisModeChange={setAnalysisMode}
          />
        )}
        {activeNav === "plan" && (
          <PlanTab
             data={data}
             transactions={data?.transactions || []}
             monthlyData={data?.monthlyData || []}
             netWorthHistory={data?.netWorthHistory || []}
             now={syncNow}
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
            onDataChanged={fetchData}
            activeSection={activePlanSection}
            onSectionChange={setActivePlanSection}
            onUsageChange={fetchEntitlement}
             onBillsChanged={handleBillsChanged}
             transactionUsage={entitlement?.usage?.transactions}
             entitlement={entitlement}
             proRegistrationOpen={proRegistrationOpen}
              bills={bills}
              billsLoading={billsLoading}
              billsError={billsError}
              settings={settings}
              onSettingsChanged={refetchSettings}
              sessionKey={sessionKey}
            />
        )}
        {activeNav === "profile" && (
          <ProfileTab userName={effectiveUserName} session={session} data={data} entitlement={entitlement} signOut={handleSignOut} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} hapticsEnabled={hapticsEnabled} setHapticsEnabled={setHapticsEnabled} onToast={showToast} onRefresh={fetchData} lastSyncAt={lastSyncAt} isOnline={isOnline} refreshing={refreshing} />
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
            <p className="text-xs text-md3-on-surface-variant text-center py-4">Tidak ada pengeluaran pada hari ini</p>
          ) : (
            <div className="space-y-3">
              {selectedDayTx.transactions.map((t, i) => (
                <div key={i} className="flex justify-between items-center pb-3 border-b border-md3-outline-variant last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="font-semibold text-sm text-md3-on-surface truncate">{t.category}</p>
                      {isSpecialExpense(t) && <SpecialBadge />}
                    </div>
                    {t.desc && <p className="text-xs text-md3-on-surface-variant mt-0.5 truncate">{t.desc}</p>}
                  </div>
                  <p className="font-bold text-sm text-clay-500 ml-3">-{formatRp(t.amount)}</p>
                </div>
              ))}
              <div className="pt-2 flex justify-between items-center">
                <span className="text-xs font-bold text-md3-on-surface-variant">Total</span>
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
          onRepeat={handleRepeatTransaction}
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
        onClose={() => { setRepeatTx(null); setQuickAddOpen(false) }}
        initialType={txType}
        onSubmit={submitTransaction}
        onGoalContribute={openGoalPicker}
        transactionUsage={entitlement?.usage?.transactions}
        proRegistrationOpen={proRegistrationOpen}
        specialSuggestion={specialSuggestion}
        transactions={data?.transactions || []}
        suppress={onboardingActive}
        initialValues={repeatPrefill}
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
        allocations={data?.balances?.allocations}
        transactionUsage={entitlement?.usage?.transactions}
        proRegistrationOpen={proRegistrationOpen}
        onSaved={() => {
          fetchData()
          setGoalsRefreshTrigger(t => t + 1)
          setEventsRefreshTrigger(t => t + 1)
          setTimeout(() => checkGoalCelebration(), 800)
          setTimeout(() => checkEventCelebration(), 800)
        }}
      />

      {/* What-If Scenario Modal */}
      {hasFeature(entitlement, "whatIf") && <WhatIfModal open={whatIfOpen} onClose={() => setWhatIfOpen(false)} transactions={data?.transactions || []} allocations={data?.balances?.allocations} />}

      {/* Bill Pay Modal */}
      {billPayTarget && (
        <BillPayModal
          bill={billPayTarget}
          onClose={() => setBillPayTarget(null)}
          onPaid={handleBillPaid}
          onEdit={handleBillEditFromPay}
          transactionUsage={entitlement?.usage?.transactions}
          proRegistrationOpen={proRegistrationOpen}
        />
      )}

      {/* Bill Edit Modal */}
      {billEditTarget && (
        <BillSetupModal
          bill={billEditTarget}
          onClose={() => setBillEditTarget(null)}
          onSaved={handleBillEditSaved}
          proRegistrationOpen={proRegistrationOpen}
        />
      )}

      {/* Floating Action Button */}
      {hasFeature(entitlement, "transactions") && <button
           onClick={() => { if (hapticsEnabled) haptics.tap(); openQuickAdd("expense") }}
           aria-label="Tambah transaksi baru"
           aria-haspopup="dialog"
           aria-hidden={!fabVisible}
           tabIndex={fabVisible ? 0 : -1}
           ref={fabRef}
           className={`fixed bottom-24 sm:bottom-20 right-4 sm:right-5 z-40 max-w-md transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-opacity ${fabVisible ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none motion-safe:translate-y-24 opacity-0"}`}
         >
          <div className="w-14 h-14 rounded-2xl shadow-pop flex items-center justify-center motion-safe:active:scale-90 transition-transform duration-[140ms] motion-reduce:transition-none" style={{ backgroundColor: THEME.primaryBg, boxShadow: "0 12px 32px rgba(47,107,87,0.28)" }}>
           <Plus size={22} color={THEME.primaryDeep} strokeWidth={2.5} aria-hidden="true" />
         </div>
      </button>}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-4 sm:bottom-5 left-4 sm:left-5 right-4 sm:right-5 z-30 safe-bottom max-w-md mx-auto" role="tablist" aria-label="Main navigation">
        <div className="glass-nav h-16 rounded-[24px] p-2 flex items-center gap-1 overflow-hidden">
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
                aria-label={nav.id === "plan" && urgentBillCount > 0 ? `${nav.aria}, ${urgentBillCount} tagihan perlu perhatian` : nav.aria}
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  if (hapticsEnabled) haptics.tap()
                  if (nav.id === "plan") setActivePlanSection("overview")
                  setActiveNav(nav.id)
                }}
                className={`group relative flex min-w-0 h-12 items-center justify-center rounded-[20px] px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md3-primary transition-[flex,background-color,color] duration-[var(--motion-control)] [transition-timing-function:var(--ease-emphasized)] ${isActive ? "flex-[1.6] gap-1.5 bg-md3-primary text-md3-on-primary" : "flex-1 gap-0 text-md3-on-surface-variant"}`}
              >
                <div className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center">
                  <nav.icon size={20} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                  {nav.id === "plan" && urgentBillCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-2 -top-2 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center bg-md3-error text-md3-on-error tabular-nums"
                    >
                      {urgentBillCount > 9 ? "9+" : urgentBillCount}
                    </span>
                  )}
                </div>
                <span
                  aria-hidden={!isActive}
                  className={`overflow-hidden whitespace-nowrap text-[11px] font-bold leading-none transition-[max-width,opacity,transform] duration-[var(--motion-control)] [transition-timing-function:var(--ease-emphasized)] ${isActive ? "max-w-[5.5rem] translate-x-0 opacity-100" : "max-w-0 -translate-x-1 opacity-0"}`}
                >
                  {nav.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
      </div>
    </SharedDataScopeContext.Provider>
  )
}

function DrillDownModal({ drillDown, data, onClose, onEdit, onDelete }) {
  const txs = useMemo(() => (drillDown.transactions ?? data?.transactions ?? [])
    .filter(t => t.type === drillDown.type)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10), [data, drillDown.transactions, drillDown.type])

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
            <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant mb-0.5">Total Top 10</p>
            <p className="text-xl font-display font-bold" style={{ color: drillDown.type === "income" ? THEME.income : drillDown.type === "savings" ? THEME.savings : THEME.expense }}>
              {formatRp(animatedTotal)}
            </p>
          </div>
          <div>
            {txs.map((t, i) => {
              const colorOfType = drillDown.type === "income" ? THEME.income : drillDown.type === "savings" ? THEME.savings : THEME.expense
              const { icon: CategoryIcon } = getCategoryVisual(t.category)
              return (
                <div key={i}>
                  {i > 0 && <div aria-hidden="true" className="border-t border-md3-outline-variant ml-12" />}
                  {/* MD3 two-line list row: category avatar · name + relative date · right-aligned tabular-nums amount */}
                  <div className="flex items-center gap-3 px-1 py-2.5 hover:bg-md3-surface-container-high transition-colors">
                    <div aria-hidden="true" className="w-9 h-9 rounded-full bg-md3-secondary-container flex items-center justify-center flex-shrink-0">
                      <CategoryIcon size={15} strokeWidth={2.1} className="text-md3-on-secondary-container" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-md3-on-surface truncate">{t.category}</p>
                      <p className="text-[11px] text-md3-on-surface-variant mt-0.5 truncate">
                        {relativeDate(t.date)}{t.desc ? ` · ${t.desc}` : ""}
                      </p>
                    </div>
                    <p className="font-bold text-sm flex-shrink-0 tabular-nums" style={{ color: colorOfType }}>
                      {drillDown.type === "income" ? "+" : drillDown.type === "savings" ? "" : "-"}{formatRp(t.amount)}
                    </p>
                    <RowActionsMenu
                      onEdit={() => onEdit(t)}
                      onDelete={() => onDelete(t)}
                      onRepeat={isRepeatableTransaction(t) ? () => onRepeat(t) : undefined}
                      menuLabel={`Aksi transaksi ${t.category}`}
                      editLabel={`Edit ${t.category}`}
                      deleteLabel={`Delete ${t.category}`}
                    />
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
