"use client"
import { useMemo, useRef, useState } from "react"
import { Wallet, ChevronLeft, ChevronRight, Lightbulb, X, Check, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, CartesianGrid } from "recharts"
import { THEME, AVAILABLE_MONTHS } from "./_components/constants"
import { formatRp, formatRpFull, maskRupiah } from "./_components/helpers"
import EyeToggle from "./_components/EyeToggle"
import SelectField from "./_components/SelectField"
import CustomTooltip from "./_components/CustomTooltip"
import EmptyState from "./_components/EmptyState"
import RecapSection from "./_components/RecapSection"
import StatsDataTable from "./_components/StatsDataTable"
import useOverflowHint from "./_components/useOverflowHint"
import ChartTile from "@/components/charts/ChartTile"
import { Sparkline } from "@/components/charts/Sparkline"
import { useChartScheme } from "@/components/charts/useChartScheme"
import { chartTheme, resolveChartTheme } from "@/lib/chartTheme"
import MonthlyReportButton from "@/components/MonthlyReportButton"
import YearInReviewButton from "@/components/YearInReviewButton"
import CashFlowForecast from "@/components/CashFlowForecast"
import SavingsRateTrend from "@/components/SavingsRateTrend"
import NetWorthTrend from "@/components/NetWorthTrend"
import AnomalyAlerts from "@/components/AnomalyAlerts"
import LockedFeaturePreview from "@/components/LockedFeaturePreview"
import InsightCard from "@/components/InsightCard"
import { hasFeature, isFeatureEnabled, getFeatureGate, isProRegistrationOpen } from "@/lib/featureAccess"
import { getDisplayThresholds } from "@/lib/heatmapThresholds"
import { isSpecialExpense } from "@/lib/expenseClass"

const DAY_HEADERS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
const STATS_SECTIONS = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "kategori", label: "Kategori" },
  { key: "tren", label: "Tren" },
  { key: "recap", label: "Laporan" },
]
const ANALYSIS_MODES = [
  { key: "routine", label: "Rutin" },
  { key: "actual", label: "Semua" },
]
const SURPLUS_SPARK_MONTHS = 6

function ChartSkeleton({ height = 180 }) {
  return (
    <div className="shimmer-bg rounded-2xl" style={{ height }} aria-hidden="true" />
  )
}

function getCategorySummary(title, categories) {
  if (!categories.length) return `${title}: belum ada data.`
  const ranked = categories.slice(0, 5).map(category => `${category.name} ${formatRp(category.value)}`).join(", ")
  return `${title}: ${ranked}.`
}

function formatCategoryPercentage(value, total) {
  const percentage = total > 0 ? (Number(value) || 0) / total * 100 : 0
  return percentage.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function getYearCategorySummary(rows, yearLabel) {
  if (!rows.length) return "Rata-rata pengeluaran kategori: belum ada data."
  const ranked = rows.map((row, index) => `${index + 1}. ${row.category} ${formatRp(row.average)} per bulan`).join(", ")
  return `Rata-rata pengeluaran terbesar di tahun ${yearLabel}. ${ranked}.`
}

export default function StatsTab({
  data,
  filteredTransactions,
  statIncome, statExpense, statSavings, statSurplus,
  expenseCategories, incomeCategories,
  availableYears, compareYearOptions, availableAccounts,
  selectedMonth, selectedYear, selectedAccount, categoryFilter, dateFrom, dateTo,
  setSelectedMonth, setSelectedYear, setSelectedAccount, setCategoryFilter, setDateFrom, setDateTo,
  clientMonthlyData,
  routineClientMonthlyData,
  cashFlowMonthlyData,
  routineCashFlowMonthlyData,
  top5Categories, trendData,
  routineExpenseCategories,
  routineTop5Categories,
  routineTrendData,
  compareMode, compareMonthA, compareYearA, compareMonthB, compareYearB, compareDataA, compareDataB, compareChartData,
  routineCompareDataA, routineCompareDataB, routineCompareChartData,
  compareLabelA, compareLabelB,
  setCompareMode, setCompareMonthA, setCompareYearA, setCompareMonthB, setCompareYearB,
  resetComparePeriods,
  calMonth, calYear, calMonthIdx, calWeeks, calendarDayTotals,
  navigateCalendar, handleDayClick,
  insights,
  isAllMonths, refreshing,
  onToast,
  onEditTx,
  onDeleteTx,
  haptics,
  hapticsEnabled,
  monthlyData,
  routineMonthlyData,
  allTransactions,
  now,
  bills,
  billsLoading,
  billsError,
  onCategoryClick,
  userName,
  entitlement,
  controlledSection,
  onSectionChange,
  onOpenPlanBills = undefined,
  controlledAnalysisMode,
  onAnalysisModeChange,
  onRepeatTx,
  moneyHidden = false,
  onToggleMoneyVisibility,
}) {
  const isDark = useChartScheme()
  // Dark-mode-aware chart tokens; identical object to the legacy snapshot in light mode.
  const activeChartTheme = resolveChartTheme(isDark)
  const effectiveEntitlement = entitlement === undefined ? { features: { anomalyAlerts: true, cashFlowForecast: true, yearInReview: true } } : entitlement
  const proRegistrationOpen = isProRegistrationOpen(effectiveEntitlement)
  // Privacy-eye mode: shared with the hero and Top 3 eyes — any eye toggles all.
  const masked = (formatted) => (moneyHidden ? maskRupiah(formatted) : formatted)
  const showEye = typeof onToggleMoneyVisibility === "function"
  const [showDateRange, setShowDateRange] = useState(false)
  // Per-card trend windows (6 bln / 12 bln / Semua), independent per card.
  // Defaults preserve each card's previous behavior: the forecast used
  // 6 months and the savings-rate chart used 12.
  const [spanForecast, setSpanForecast] = useState("6 bln")
  const [spanSavings, setSpanSavings] = useState("12 bln")
  // Wave 5: section and analysis mode are URL-backed. The page passes a
  // controlled value + callback; the internal fallback keeps standalone usage
  // (and existing tests) working unchanged.
  const statsTabRefs = useRef([])
  // Wave 7 — WAI-ARIA tabs pattern: roving tabindex with automatic activation.
  const handleStatsTabKeyDown = (index, event) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"]
    if (!keys.includes(event.key)) return
    event.preventDefault()
    const count = STATS_SECTIONS.length
    let next = index
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % count
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + count) % count
    if (event.key === "Home") next = 0
    if (event.key === "End") next = count - 1
    setActiveSection(STATS_SECTIONS[next].key)
    statsTabRefs.current[next]?.focus()
  }
  const [internalSection, setInternalSection] = useState("ringkasan")
  const activeSection = controlledSection ?? internalSection
  const setActiveSection = (key) => (onSectionChange ? onSectionChange(key) : setInternalSection(key))
  const [internalAnalysisMode, setInternalAnalysisMode] = useState("routine")
  const resolvedAnalysisMode = controlledAnalysisMode ?? internalAnalysisMode
  const setAnalysisMode = (mode) => (onAnalysisModeChange ? onAnalysisModeChange(mode) : setInternalAnalysisMode(mode))
  // Trailing-window anchor: with a selected month the trend windows end at
  // that month ("what led into October?"); otherwise they end at the present.
  const trendAnchor = useMemo(
    () => (isAllMonths ? null : { month: selectedMonth, year: selectedYear }),
    [isAllMonths, selectedMonth, selectedYear]
  )
  const hasDateRange = dateFrom || dateTo
  const routineAnalyticsMonthlyData = routineMonthlyData || monthlyData
  const isRoutineMode = resolvedAnalysisMode === "routine"
  const chartExpenseCategories = isRoutineMode ? (routineExpenseCategories || expenseCategories) : expenseCategories
  const activeCashFlowMonthlyData = isAllMonths
    ? (isRoutineMode ? (routineCashFlowMonthlyData || cashFlowMonthlyData || []) : (cashFlowMonthlyData || []))
    : []
  // Trend card year: the filter year, or the latest year present in the data.
  const trendYearLabel = useMemo(() => {
    if (selectedYear && selectedYear !== "Semua Tahun") return String(selectedYear)
    const years = (data?.transactions || []).map(t => Number(t.year)).filter(y => Number.isFinite(y))
    return years.length ? String(Math.max(...years)) : String(new Date().getFullYear())
  }, [data, selectedYear])
  // Item 6 — the real computed window for the trend-year card, shared by
  // the rows below and the badge in the card header (not a hardcoded label).
  const elapsedMonths = useMemo(() => {
    const now = new Date()
    return trendYearLabel === String(now.getFullYear()) ? now.getMonth() + 1 : 12
  }, [trendYearLabel])
  // Year-scoped top-category rows: monthly average for the trend year + YoY
  // against the same elapsed window last year. Built from raw transactions
  // (not the span-sliced trend series) so the "di tahun X" title always holds.
  const yearCategoryRows = useMemo(() => {
    const transactions = data?.transactions || []
    const prevYearLabel = String(Number(trendYearLabel) - 1)
    const sumFor = (year, category, months) => {
      let total = 0
      for (const t of transactions) {
        if (String(t.year) !== year || t.type !== "expense" || t.category !== category) continue
        if (months && !months.includes(t.month)) continue
        if (isRoutineMode && isSpecialExpense(t)) continue
        total += Number(t.amount) || 0
      }
      return total
    }
    const totals = {}
    for (const t of transactions) {
      if (String(t.year) !== trendYearLabel || t.type !== "expense") continue
      if (isRoutineMode && isSpecialExpense(t)) continue
      totals[t.category] = (totals[t.category] || 0) + (Number(t.amount) || 0)
    }
    const windowMonths = AVAILABLE_MONTHS.slice(0, elapsedMonths)
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category], index) => {
        const series = AVAILABLE_MONTHS.map(m => sumFor(trendYearLabel, category, [m]))
        const totalY = series.reduce((s, v) => s + v, 0)
        const average = elapsedMonths > 0 ? totalY / elapsedMonths : 0
        const totalPrev = sumFor(prevYearLabel, category, windowMonths)
        const delta = totalPrev > 0 ? ((totalY - totalPrev) / totalPrev) * 100 : null
        return {
          category,
          series,
          average,
          delta,
          color: activeChartTheme.seriesPalette[index % activeChartTheme.seriesPalette.length],
        }
      })
  }, [data, trendYearLabel, isRoutineMode, activeChartTheme, elapsedMonths])
  const activeCompareDataA = isRoutineMode ? (routineCompareDataA || compareDataA) : compareDataA
  const activeCompareDataB = isRoutineMode ? (routineCompareDataB || compareDataB) : compareDataB
  const activeCompareChartData = isRoutineMode ? (routineCompareChartData || compareChartData) : compareChartData
  const chartExpenseTotal = chartExpenseCategories.reduce((total, category) => total + (Number(category.value) || 0), 0)
  const summaryStatus = statSurplus > 0 ? "Surplus" : statSurplus < 0 ? "Defisit" : "Seimbang"
  const summaryPeriod = [
    selectedMonth || (isAllMonths ? "Semua Bulan" : "Periode"),
    selectedYear && selectedYear !== "Semua Tahun" ? selectedYear : null,
  ].filter(Boolean).join(" ")
  const summaryStatusStyle = statSurplus > 0
    ? { background: "rgba(122,171,154,0.2)", color: "#d9efe7" }
    : statSurplus < 0
      ? { background: "rgba(217,154,125,0.2)", color: "#ffd8c7" }
      : { background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.88)" }
  // Kategori — expense bar caption names the selected period explicitly.
  const expenseCaption = isAllMonths
    ? `Pengeluaran terbesar · ${summaryPeriod.toLowerCase()}`
    : `Pengeluaran terbesar bulan ${summaryPeriod}`
  const insightCards = Array.isArray(insights) ? insights : []
  // Wave 7 — persistent readable summary of the material filters (roadmap decision 17).
  // Removable filters keep their chips below; period/account/basis/comparison render as text.
  const filterSummaryParts = [
    { label: "Periode", value: isAllMonths ? "Semua bulan" : summaryPeriod },
    { label: "Akun", value: selectedAccount || "Semua Akun" },
    { label: "Dasar analisis", value: isRoutineMode ? "Rutin" : "Semua transaksi" },
    { label: "Kategori", value: categoryFilter || "Semua" },
    { label: "Rentang tanggal", value: hasDateRange ? `${dateFrom || "…"} → ${dateTo || "…"}` : "Semua" },
    { label: "Perbandingan", value: compareMode && compareLabelA && compareLabelB ? `${compareLabelA} vs ${compareLabelB}` : "Nonaktif" },
  ]
  // Wave 7 — inclusive-actual vs routine-only basis disclosure wherever the two can appear together.
  const chartBasisLabel = isRoutineMode ? "Dasar: Pengeluaran rutin saja" : "Dasar: Semua transaksi"
  // Revamp B — hero 6-month surplus sparkline + month-over-month delta chip.
  const heroSpark = useMemo(() => {
    const series = (clientMonthlyData || []).slice(-SURPLUS_SPARK_MONTHS)
    return {
      points: series.map(row => Number(row.surplus) || 0),
      labels: series.map(row => row.month || ""),
      current: series.length ? Number(series[series.length - 1].surplus) || 0 : null,
      previous: series.length > 1 ? Number(series[series.length - 2].surplus) || 0 : null,
    }
  }, [clientMonthlyData])
  const heroDelta = heroSpark.current != null && heroSpark.previous != null
    ? heroSpark.current - heroSpark.previous
    : null
  const heroDeltaUp = heroDelta != null && heroDelta > 0
  // Revamp B — relative quartile heatmap thresholds for the displayed month.
  // The legacy snapshot array is passed as fallback so identity can detect
  // "relative thresholds active" for the footnote.
  const heatmapThresholds = useMemo(
    () => getDisplayThresholds(Object.values(calendarDayTotals || {}), chartTheme.heatmap.thresholds),
    [calendarDayTotals],
  )
  // Wave 7 — overflow-gated horizontal-scroll hints and keyboard-operable chart data tables.
  const [cashFlowScrollRef, cashFlowOverflows] = useOverflowHint()
  const categoryTableRows = chartExpenseCategories.slice(0, 8).map(category => ({
    label: category.name,
    values: [formatRp(category.value), `${formatCategoryPercentage(category.value, chartExpenseTotal)}%`],
  }))
  const trendCategoryTableRows = yearCategoryRows.map(row => ({
    label: row.category,
    values: [`${formatRp(row.average)}/bln`],
  }))
  const comparisonTableRows = activeCompareChartData.map(item => ({
    label: item.category,
    values: [formatRp(item[compareLabelA] || 0), formatRp(item[compareLabelB] || 0)],
  }))
  const cashFlowChartData = activeCashFlowMonthlyData.map(row => ({
    ...row,
    label: selectedYear === "Semua Tahun" ? `${row.month} ${row.year}` : row.month,
  }))
  const cashFlowYAxisMax = cashFlowChartData.reduce((max, row) => Math.max(
    max,
    Number(row.pemasukan) || 0,
    Number(row.pengeluaran) || 0,
    Number(row.rataRataPemasukan) || 0,
    Number(row.rataRataPengeluaran) || 0,
  ), 0)
  const cashFlowYAxisDomain = [0, Math.max(1, cashFlowYAxisMax)]
  const latestCashFlowRow = cashFlowChartData[cashFlowChartData.length - 1]
  const cashFlowAverageWindow = Math.min(3, cashFlowChartData.length)
  const cashFlowChartSummary = cashFlowChartData.length
    ? `Arus kas bulanan: ${cashFlowChartData.map(row => `${row.label}, pemasukan ${formatRp(row.pemasukan)}, pengeluaran ${formatRp(row.pengeluaran)}`).join("; ")}. Rata-rata bergerak ${cashFlowAverageWindow} bulan terakhir: pemasukan ${formatRp(latestCashFlowRow.rataRataPemasukan)} dan pengeluaran ${formatRp(latestCashFlowRow.rataRataPengeluaran)}.`
    : "Arus kas bulanan: belum ada data pemasukan atau pengeluaran."
  const cashFlowTableColumns = ["Bulan", "Pemasukan", "Pengeluaran", "Rata-rata pemasukan", "Rata-rata pengeluaran"]
  const cashFlowTableRows = cashFlowChartData.map(row => ({
    label: row.label,
    values: [formatRp(row.pemasukan), formatRp(row.pengeluaran), formatRp(row.rataRataPemasukan || 0), formatRp(row.rataRataPengeluaran || 0)],
  }))

  return (
    <div className="px-5 pt-4 space-y-5 animate-bento-in" key="stats-tab">
      {/* Filter bar — glass */}
      <div className="glass rounded-2xl p-3 space-y-2" role="region" aria-label="Filter Statistik">
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-4 gap-2">
          <SelectField label="Tahun" value={selectedYear} onChange={setSelectedYear} options={["Semua Tahun", ...availableYears]} placeholder="Tahun" />
          <SelectField label="Bulan" value={selectedMonth} onChange={setSelectedMonth} options={["Semua Bulan", ...AVAILABLE_MONTHS]} placeholder="Bulan" />
          <SelectField label="Akun" value={selectedAccount} onChange={setSelectedAccount} options={["Semua Akun", ...availableAccounts]} placeholder="Akun" />
          <SelectField
            label="Tampilan"
            value={isRoutineMode ? "Rutin" : "Semua"}
            onChange={(mode) => setAnalysisMode(mode === "Rutin" ? "routine" : "actual")}
            options={ANALYSIS_MODES.map(({ label }) => label)}
          />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1" role="group" aria-label="Ringkasan filter">
          {filterSummaryParts.map(({ label, value }) => (
            <span key={label} className="text-[10px] font-semibold text-md3-on-surface-variant">
              {label}: <span className="font-bold text-md3-on-surface">{value}</span>
            </span>
          ))}
        </div>
        <button
          onClick={() => setShowDateRange(!showDateRange)}
          aria-expanded={showDateRange}
          aria-controls="stats-date-range-fields"
          className="text-[10px] font-bold text-md3-on-surface-variant uppercase tracking-wider flex items-center gap-1.5 hover:text-violet-600 transition-colors"
        >
          {showDateRange ? "− Sembunyikan" : "+ Tambah"} rentang tanggal
        </button>
        {showDateRange && (
          <div id="stats-date-range-fields" className="grid grid-cols-2 gap-2 pt-1 animate-slide-down">
            <div>
              <label className="text-[10px] font-bold text-md3-on-surface-variant mb-1 block uppercase tracking-wider">Dari</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="field-outlined w-full px-3 py-2.5 text-xs font-semibold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-md3-on-surface-variant mb-1 block uppercase tracking-wider">Sampai</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="field-outlined w-full px-3 py-2.5 text-xs font-semibold" />
            </div>
          </div>
        )}
        {(categoryFilter || hasDateRange) && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[10px] font-bold text-md3-on-surface-variant uppercase tracking-wider">Filter aktif:</span>
            {categoryFilter && (
              <div className="chip chip-active">
                <Check size={12} strokeWidth={3} aria-hidden="true" />
                {categoryFilter}
                <button onClick={() => setCategoryFilter(null)} className="ml-1 hover:opacity-70" aria-label="Hapus filter kategori">
                  <X size={10} strokeWidth={3} aria-hidden="true" />
                </button>
              </div>
            )}
            {hasDateRange && (
              <div className="chip chip-active">
                <Check size={12} strokeWidth={3} aria-hidden="true" />
                {dateFrom || "..."} → {dateTo || "..."}
                <button onClick={() => { setDateFrom(""); setDateTo("") }} className="ml-1 hover:opacity-70" aria-label="Hapus rentang tanggal">
                  <X size={10} strokeWidth={3} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-2" role="tablist" aria-label="Navigasi Statistik">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATS_SECTIONS.map((section, index) => {
            const isActive = activeSection === section.key
            return (
              <button
                key={section.key}
                ref={element => { statsTabRefs.current[index] = element }}
                type="button"
                role="tab"
                id={`stats-tab-${section.key}`}
                aria-selected={isActive}
                aria-controls={`stats-panel-${section.key}`}
                tabIndex={isActive ? 0 : -1}
                onKeyDown={event => handleStatsTabKeyDown(index, event)}
                onClick={() => setActiveSection(section.key)}
                data-testid="stats-section-tab"
                className={`rounded-2xl px-3 py-2.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-earth-900 text-white shadow-warm"
                    : "bg-md3-surface-container-lowest text-md3-on-surface-variant hover:bg-md3-surface-container-low hover:text-md3-on-surface"
                }`}
              >
                {section.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeSection === "ringkasan" && (
        <div id="stats-panel-ringkasan" role="tabpanel" aria-labelledby="stats-tab-ringkasan" tabIndex={-1} className="space-y-5">
          {/* Financial summary */}
          {refreshing ? <ChartSkeleton height={160} /> : (
            <section className="bento-tile-dark mesh-hero text-white p-4 sm:p-5 shadow-pop relative overflow-hidden" role="region" aria-label="Kondisi keuangan">
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(159,135,239,0.3) 0%, transparent 70%)" }} />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold opacity-80">Kondisi Keuangan · {summaryPeriod} · Termasuk semua transaksi</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1.5">
                      <h2 className="text-2xl sm:text-3xl font-display font-bold tabular-nums">{masked(formatRpFull(Math.abs(statSurplus)))}</h2>
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={summaryStatusStyle}>{summaryStatus}</span>
                      {heroDelta != null && heroDelta !== 0 && (
                        <span
                          className="rounded-full px-2 py-1 text-[10px] font-bold inline-flex items-center gap-1"
                          style={{ background: heroDeltaUp ? "rgba(122,171,154,0.25)" : "rgba(217,154,125,0.25)", color: heroDeltaUp ? "#d9efe7" : "#ffd8c7" }}
                          aria-label={`Surplus ${heroDeltaUp ? "naik" : "turun"} ${formatRp(Math.abs(heroDelta))} dibanding bulan sebelumnya`}
                        >
                          {heroDeltaUp ? "↑" : "↓"} {formatRp(Math.abs(heroDelta))} vs bulan lalu
                        </span>
                      )}
                    </div>
                    {heroSpark.points.length >= 2 && (
                      <div className="mt-2 flex items-center gap-2" aria-hidden="true">
                        <Sparkline points={heroSpark.points} mode="area" color="#8EB5A5" width={120} height={34} endDot />
                        <span className="text-[10px] font-semibold opacity-70">Surplus 6 bulan</span>
                      </div>
                    )}
                  </div>
                  {showEye && <EyeToggle hidden={moneyHidden} onToggle={onToggleMoneyVisibility} tone="dark" />}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 border-t border-white/15 pt-3">
                  <div className="rounded-2xl border border-sage-300/20 bg-sage-500/20 p-3" role="group" aria-label={`Pemasukan ${masked(formatRp(statIncome))}`}>
                    <div className="flex items-center gap-1.5 text-sage-200">
                      <ArrowDownLeft size={13} strokeWidth={2.5} aria-hidden="true" />
                      <p className="text-[11px] font-semibold">Pemasukan</p>
                    </div>
                    <p className="mt-1 text-sm sm:text-base font-bold tabular-nums text-white">{masked(formatRp(statIncome))}</p>
                  </div>
                  <div className="rounded-2xl border border-clay-300/20 bg-clay-400/20 p-3" role="group" aria-label={`Pengeluaran ${masked(formatRp(statExpense))}`}>
                    <div className="flex items-center gap-1.5 text-clay-200">
                      <ArrowUpRight size={13} strokeWidth={2.5} aria-hidden="true" />
                      <p className="text-[11px] font-semibold">Pengeluaran</p>
                    </div>
                    <p className="mt-1 text-sm sm:text-base font-bold tabular-nums text-white">{masked(formatRp(statExpense))}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Net worth trend — month-end history on a warm band, below the hero card */}
          {refreshing ? <ChartSkeleton height={260} /> : (
            <NetWorthTrend history={data?.netWorthHistory || []} moneyHidden={moneyHidden} />
          )}

          {isAllMonths && (
            refreshing ? <ChartSkeleton height={300} /> : (
              <ChartTile
                title="Pemasukan vs Pengeluaran"
                ariaLabel="Arus kas bulanan"
                basis={`Perbandingan arus kas aktual per bulan. ${chartBasisLabel}.`}
                badge={cashFlowChartData.length > 0 ? `${cashFlowChartData.length} bulan` : undefined}
                legend={[
                  { label: "Pemasukan", kind: "swatch", color: THEME.income },
                  { label: "Pengeluaran", kind: "swatch", color: THEME.expense },
                  { label: `Rata-rata pemasukan (${cashFlowAverageWindow} bulan)`, kind: "line", color: THEME.income },
                  { label: `Rata-rata pengeluaran (${cashFlowAverageWindow} bulan)`, kind: "line", color: THEME.expense },
                ]}
                isEmpty={cashFlowChartData.length === 0}
                emptyIcon={<Wallet size={18} />}
                emptyTitle="Belum ada data arus kas"
                emptyHint="Pilih rentang dengan pemasukan atau pengeluaran untuk melihat grafik."
                table={cashFlowChartData.length > 0 ? { id: "stats-cash-flow-table", caption: "Data arus kas bulanan", columns: cashFlowTableColumns, rows: cashFlowTableRows } : undefined}
                skeletonHeight={300}
              >
                <p id="stats-cash-flow-summary" className="sr-only">{cashFlowChartSummary}</p>
                <div className="mt-2" role="img" aria-describedby="stats-cash-flow-summary">
                  <div data-testid="stats-cash-flow-scroll" className="overflow-x-auto" ref={cashFlowScrollRef}>
                    <div data-testid="stats-cash-flow-plot" style={{ minWidth: Math.max(480, cashFlowChartData.length * 84) }}>
                      <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={cashFlowChartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }} barCategoryGap="22%" barGap={4}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={activeChartTheme.gridStroke} />
                          <XAxis dataKey="label" interval={0} tick={activeChartTheme.axisTick} tickMargin={8} axisLine={false} tickLine={false} />
                          <YAxis
                            width={58}
                            domain={cashFlowYAxisDomain}
                            tickFormatter={value => formatRp(value)}
                            tick={activeChartTheme.axisTick}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="pemasukan" name="Pemasukan" fill={THEME.income} radius={[6, 6, 0, 0]} maxBarSize={28} animationBegin={0} animationDuration={220} />
                          <Bar dataKey="pengeluaran" name="Pengeluaran" fill={THEME.expense} radius={[6, 6, 0, 0]} maxBarSize={28} animationBegin={40} animationDuration={220} />
                          <Line type="monotone" dataKey="rataRataPemasukan" name="Rata-rata pemasukan" stroke={THEME.income} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls animationBegin={80} animationDuration={260} />
                          <Line type="monotone" dataKey="rataRataPengeluaran" name="Rata-rata pengeluaran" stroke={THEME.expense} strokeWidth={2.5} dot={false} connectNulls animationBegin={120} animationDuration={260} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {cashFlowOverflows && (
                    <p data-testid="stats-cash-flow-hint" className="mt-2 text-[10px] font-semibold text-md3-on-surface-variant">Geser untuk melihat semua bulan</p>
                  )}
                </div>
              </ChartTile>
            )
          )}

          {/* Smart Insights (compact) */}
          {hasFeature(effectiveEntitlement, "insights") && insightCards.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <Lightbulb size={13} className="text-amber-500" aria-hidden="true" />
                <h3 className="text-xs font-bold font-display text-md3-on-surface-variant uppercase tracking-wider">Insights</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {insightCards.slice(0, 5).map((ins, i) => (
                  <InsightCard
                    key={`${ins.text || "insight"}-${i}`}
                    insight={ins}
                    variant="tinted"
                    style={{ animationDelay: `${0.05 * i}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {getFeatureGate(effectiveEntitlement, "anomalyAlerts") === "unavailable" ? <LockedFeaturePreview title="Anomaly Alerts" description="Fitur sedang tidak tersedia." unavailable proRegistrationOpen={proRegistrationOpen} /> : getFeatureGate(effectiveEntitlement, "anomalyAlerts") === "unresolved" ? <LockedFeaturePreview title="Anomaly Alerts" unresolved /> : hasFeature(effectiveEntitlement, "anomalyAlerts") ? <AnomalyAlerts transactions={allTransactions} selectedMonth={selectedMonth} selectedYear={selectedYear} onCategoryClick={onCategoryClick} /> : <LockedFeaturePreview title="Anomaly Alerts" description="Deteksi pola transaksi tidak biasa tersedia di Pro." example="Contoh: kategori Jajan bulan ini 45% di atas rata-rata tiga bulan sebelumnya." proRegistrationOpen={proRegistrationOpen} />}
        </div>
      )}

      {activeSection === "kategori" && (
        <div id="stats-panel-kategori" role="tabpanel" aria-labelledby="stats-tab-kategori" tabIndex={-1} className="space-y-5">
          {/* Ranked category bars — clickable */}
          {refreshing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><ChartSkeleton height={260} /><ChartSkeleton height={260} /></div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "expense", title: "Pengeluaran terbesar", categories: chartExpenseCategories, summaryId: "stats-expense-category-summary", ariaLabel: "Pengeluaran terbesar" },
              { key: "income", title: "Pemasukan terbesar", categories: incomeCategories, summaryId: "stats-income-category-summary", ariaLabel: "Pemasukan terbesar" },
            ].map(({ key, title, categories, summaryId, ariaLabel }) => (
              <section key={key} className="bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-4 shadow-warm" aria-label={ariaLabel}>
                <h3 id={`${summaryId}-title`} className="text-sm font-bold mb-2 font-display text-md3-on-surface">{title}</h3>
                <p className="text-[11px] text-md3-on-surface-variant">{key === "expense" ? expenseCaption : "Dasar: Semua transaksi"}</p>
                <p id={summaryId} className="sr-only">{getCategorySummary(title, categories)}</p>
                {categories.length === 0 ? (
                  <EmptyState icon={<Wallet size={18} />} title="Belum ada" />
                ) : (
                  <div role="img" aria-describedby={summaryId}>
                    <ResponsiveContainer width="100%" height={Math.max(180, Math.min(280, categories.slice(0, 8).length * 34 + 36))}>
                      <BarChart data={categories.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barCategoryGap="22%">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={82} tick={activeChartTheme.axisTick} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="value"
                          name={title}
                          fill={activeChartTheme.seriesPalette[0]}
                          radius={[0, 6, 6, 0]}
                          maxBarSize={18}
                          animationDuration={240}
                          onClick={(entry) => {
                            const category = entry?.name || entry?.payload?.name
                            if (!category) return
                            if (hapticsEnabled) haptics.tap()
                            setCategoryFilter(category)
                          }}
                        >
                          {categories.slice(0, 8).map((category, index) => (
                            <Cell key={category.name} fill={activeChartTheme.seriesPalette[index % activeChartTheme.seriesPalette.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="mt-2 space-y-1.5" aria-label={`${title} detail`}>
                  {categories.slice(0, 6).map((category, index) => (
                    <div key={category.name} className="flex items-center gap-2 text-[11px]">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: activeChartTheme.seriesPalette[index % activeChartTheme.seriesPalette.length] }} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate font-medium text-md3-on-surface-variant">{category.name}</span>
                      <span className="flex-shrink-0 font-bold text-md3-on-surface tabular-nums">
                        {formatRp(category.value)}{key === "expense" ? ` · ${formatCategoryPercentage(category.value, chartExpenseTotal)}%` : ""}
                      </span>
                    </div>
                  ))}
                </div>
                {key === "expense" && (
                  <StatsDataTable
                    id="stats-expense-category-table"
                    caption="Data pengeluaran per kategori"
                    columns={["Kategori", "Jumlah", "Persentase"]}
                    rows={categoryTableRows}
                  />
                )}
              </section>
            ))}
          </div>
          )}

          {/* Yearly average category trend — ranked rows with YoY pills */}
          {yearCategoryRows.length > 0 && (
            refreshing ? <ChartSkeleton height={270} /> : (
            <section className="bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-4 sm:p-5 shadow-warm" aria-label={`Rata-rata pengeluaran terbesar di tahun ${trendYearLabel}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold font-display text-md3-on-surface">Rata-rata pengeluaran terbesar di tahun {trendYearLabel}</h3>
                  <p className="mt-1 text-[11px] text-md3-on-surface-variant">Rata-rata per bulan · % vs tahun {String(Number(trendYearLabel) - 1)}</p>
                </div>
                {/* Item 6 — window badge derived from the real computed
                    window (elapsed months of the selected year), not a
                    hardcoded label. */}
                <span className="flex-shrink-0 rounded-full bg-md3-surface px-2.5 py-1 text-[10px] font-bold text-md3-on-surface-variant">
                  {elapsedMonths} bulan
                </span>
              </div>
              <p id="stats-category-trend-summary" className="sr-only">{getYearCategorySummary(yearCategoryRows, trendYearLabel)}</p>
              <div className="mt-2" aria-describedby="stats-category-trend-summary">
                {yearCategoryRows.map((row, index) => {
                  const deltaUp = row.delta != null && row.delta > 0
                  return (
                    <div key={row.category} className="flex items-center gap-2.5 border-b border-md3-outline-variant/60 px-2 py-2.5 last:border-0 hover:bg-md3-surface-container-low transition-colors">
                      <span className="w-4 flex-shrink-0 font-display text-[13px] font-bold text-md3-on-surface-variant" aria-hidden="true">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-md3-on-surface">{row.category}</span>
                      <Sparkline points={row.series} mode="area" width={64} height={30} color={row.color} strokeWidth={1.75} />
                      {row.delta == null ? (
                        <span className="flex-shrink-0 rounded-full bg-md3-surface px-2 py-1 text-[10px] font-bold text-md3-on-surface-variant">baru</span>
                      ) : (
                        <span className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-bold tabular-nums ${deltaUp ? "bg-clay-100 text-clay-600" : "bg-sage-100 text-sage-700"}`}>
                          {deltaUp ? "↑" : "↓"} {Math.abs(Math.round(row.delta))}%
                        </span>
                      )}
                      <span className="w-[92px] flex-shrink-0 text-right text-xs font-bold tabular-nums text-md3-on-surface">
                        {formatRp(row.average)}<span className="font-medium text-md3-on-surface-variant">/bln</span>
                      </span>
                    </div>
                  )
                })}
              </div>
              <StatsDataTable
                id="stats-category-trend-table"
                caption="Data rata-rata kategori pengeluaran"
                columns={["Kategori", "Rata-rata per bulan"]}
                rows={trendCategoryTableRows}
              />
            </section>
            )
          )}
        </div>
      )}

      {activeSection === "tren" && (
        <div id="stats-panel-tren" role="tabpanel" aria-labelledby="stats-tab-tren" tabIndex={-1} className="space-y-5">
          {getFeatureGate(effectiveEntitlement, "cashFlowForecast") === "unavailable" ? <LockedFeaturePreview title="Cash Flow Forecast" description="Fitur sedang tidak tersedia." unavailable proRegistrationOpen={proRegistrationOpen} /> : getFeatureGate(effectiveEntitlement, "cashFlowForecast") === "unresolved" ? <LockedFeaturePreview title="Cash Flow Forecast" unresolved /> : hasFeature(effectiveEntitlement, "cashFlowForecast") ? <CashFlowForecast monthlyData={routineAnalyticsMonthlyData} transactions={allTransactions} bills={bills} billsLoading={billsLoading} billsError={billsError} now={now} onOpenBills={onOpenPlanBills} span={spanForecast} onSpanChange={setSpanForecast} anchor={trendAnchor} /> : <LockedFeaturePreview title="Cash Flow Forecast" description="Prediksi arus kas tersedia di Pro." example="Contoh: surplus bulan depan diproyeksikan dari enam bulan lengkap terakhir." proRegistrationOpen={proRegistrationOpen} />}
          <SavingsRateTrend monthlyData={routineAnalyticsMonthlyData} span={spanSavings} onSpanChange={setSpanSavings} anchor={trendAnchor} />

          {/* Month comparison */}
          <section className="bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-4 sm:p-5 shadow-warm" aria-label="Bandingkan Bulan">
            <div className="flex flex-col gap-2.5 mb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold font-display text-md3-on-surface">Bandingkan Bulan</h3>
                <p className="mt-1 text-[11px] text-md3-on-surface-variant">Default: bulan ini vs bulan lalu. {chartBasisLabel}.</p>
              </div>
              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 sm:flex sm:items-center">
                <button
                  type="button"
                  onClick={resetComparePeriods}
                  className="text-[11px] font-bold py-2 px-3 rounded-full transition-all bg-md3-surface text-md3-on-surface-variant hover:bg-md3-surface-container-high"
                >
                  Reset ke bulan ini
                </button>
                <button onClick={() => setCompareMode(!compareMode)} aria-pressed={compareMode} className="text-[11px] font-bold py-2 px-3 rounded-full transition-all"
                  style={{ background: compareMode ? THEME.heroBg : THEME.surfaceWarm, color: compareMode ? "white" : THEME.textSecondary }}>
                  {compareMode ? "Sembunyikan" : "Bandingkan"}
                </button>
              </div>
            </div>
            {compareMode && (
              <div className="space-y-4 mt-3 animate-slide-down">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-bold text-md3-on-surface-variant mb-1.5">Periode utama</p>
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px] gap-2">
                      <div className="min-w-0"><SelectField value={compareMonthA} onChange={setCompareMonthA} options={AVAILABLE_MONTHS} placeholder="Bulan" /></div>
                      <div className="min-w-0"><SelectField value={compareYearA} onChange={setCompareYearA} options={compareYearOptions || availableYears} placeholder="Tahun" /></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-md3-on-surface-variant mb-1.5">Bandingkan dengan</p>
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px] gap-2">
                      <div className="min-w-0"><SelectField value={compareMonthB} onChange={setCompareMonthB} options={AVAILABLE_MONTHS} placeholder="Bulan" /></div>
                      <div className="min-w-0"><SelectField value={compareYearB} onChange={setCompareYearB} options={compareYearOptions || availableYears} placeholder="Tahun" /></div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { label: "Pemasukan", a: activeCompareDataA.income, b: activeCompareDataB.income, color: THEME.income },
                    { label: "Pengeluaran", a: activeCompareDataA.expense, b: activeCompareDataB.expense, color: THEME.expense },
                    { label: "Surplus", a: activeCompareDataA.surplus, b: activeCompareDataB.surplus, color: THEME.savings },
                  ].map((item) => {
                    const delta = item.b > 0 ? ((item.a - item.b) / item.b * 100) : 0
                    const isUp = delta > 0
                    return (
                      <div key={item.label} className="rounded-2xl p-3 text-center" style={{ background: THEME.surfaceWarm }}>
                        <p className="text-[11px] font-bold text-md3-on-surface-variant mb-1">{item.label}</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: item.color }}>{formatRp(item.a)}</p>
                        <p className="text-[11px] text-md3-on-surface-variant my-0.5">vs {formatRp(item.b)}</p>
                        {delta !== 0 && (
                          <p className="text-[11px] font-bold" style={{ color: isUp && item.label !== "Pengeluaran" ? THEME.savings : isUp ? THEME.danger : THEME.savings }}>
                            {isUp ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
                {activeCompareChartData.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-md3-on-surface-variant mb-2">Perbandingan per Kategori</p>
                    <p className="text-[11px] text-md3-on-surface-variant -mt-1 mb-2">{compareLabelA} vs {compareLabelB}</p>
                    <p id="stats-comparison-summary" className="sr-only">
                      Perbandingan pengeluaran {compareLabelA} dan {compareLabelB}: {activeCompareChartData.map(item => `${item.category}, ${formatRp(item[compareLabelA] || 0)} dan ${formatRp(item[compareLabelB] || 0)}`).join("; ")}.
                    </p>
                    <div aria-describedby="stats-comparison-summary">
                      {activeCompareChartData.slice(0, 8).map((item, index) => {
                        const valueA = Number(item[compareLabelA]) || 0
                        const valueB = Number(item[compareLabelB]) || 0
                        const pairMax = Math.max(valueA, valueB)
                        const delta = valueB > 0 ? ((valueA - valueB) / valueB) * 100 : null
                        const isUp = delta != null && delta > 0
                        return (
                          <div key={item.category} className="rounded-xl px-2 py-2.5 hover:bg-md3-surface-container-low transition-colors">
                            <div className="flex items-center gap-2.5">
                              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: activeChartTheme.seriesPalette[index % activeChartTheme.seriesPalette.length] }} aria-hidden="true" />
                              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-md3-on-surface">{item.category}</span>
                              {delta == null ? (
                                <span className="flex-shrink-0 rounded-full bg-md3-surface px-2 py-1 text-[10px] font-bold text-md3-on-surface-variant">baru</span>
                              ) : (
                                <span className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-bold tabular-nums ${isUp ? "bg-clay-100 text-clay-600" : "bg-sage-100 text-sage-700"}`}>
                                  {isUp ? "↑" : "↓"} {Math.abs(delta).toLocaleString("id-ID", { maximumFractionDigits: 0 })}%
                                </span>
                              )}
                            </div>
                            <div className="mt-2 space-y-1.5">
                              {[
                                { value: valueA, width: pairMax > 0 ? (valueA / pairMax) * 100 : 0, bar: "bg-sage-500", label: "text-md3-on-surface" },
                                { value: valueB, width: pairMax > 0 ? (valueB / pairMax) * 100 : 0, bar: "bg-sage-300", label: "text-md3-on-surface-variant" },
                              ].map((bar, barIndex) => (
                                <div key={barIndex} className="flex items-center gap-2">
                                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-md3-surface-container-high">
                                    <div className={`h-full rounded-full ${bar.bar}`} style={{ width: `${bar.width}%` }} />
                                  </div>
                                  <span className={`w-16 flex-shrink-0 text-[10px] font-bold tabular-nums ${bar.label}`}>{formatRp(bar.value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div role="group" aria-label="Keterangan warna perbandingan" className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-md3-on-surface-variant">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-sage-500" aria-hidden="true" />
                        {compareLabelA}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-sage-300" aria-hidden="true" />
                        {compareLabelB}
                      </span>
                    </div>
                    <StatsDataTable
                      id="stats-comparison-table"
                      caption="Data perbandingan bulan"
                      columns={["Kategori", compareLabelA, compareLabelB]}
                      rows={comparisonTableRows}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Daily expense calendar */}
          <div className="bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-5 shadow-warm overflow-hidden">
            <h3 className="text-sm font-bold mb-1 font-display text-md3-on-surface">Peta Pengeluaran Harian</h3>
            <p className="text-[11px] text-md3-on-surface-variant mb-3">Rincian pengeluaran harian bulan {calMonth} {calYear}</p>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => navigateCalendar(-1)} aria-label="Bulan sebelumnya" className="relative w-8 h-8 rounded-xl bg-md3-surface hover:bg-md3-surface-container-high transition-colors flex items-center justify-center before:absolute before:inset-[-6px] before:content-['']">
                <ChevronLeft size={14} color={THEME.textSecondary} aria-hidden="true" />
              </button>
              <span className="text-sm font-bold text-md3-on-surface">{calMonth} {calYear}</span>
              <button onClick={() => navigateCalendar(1)} aria-label="Bulan berikutnya" className="relative w-8 h-8 rounded-xl bg-md3-surface hover:bg-md3-surface-container-high transition-colors flex items-center justify-center before:absolute before:inset-[-6px] before:content-['']">
                <ChevronRight size={14} color={THEME.textSecondary} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1.5">
              {DAY_HEADERS.map(d => (
                <div key={d} className="text-center text-[11px] font-bold text-md3-on-surface-variant uppercase py-0.5">{d}</div>
              ))}
            </div>
            <div className="space-y-1">
              {calWeeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((cell, ci) => {
                    if (!cell) return <div key={ci} className="aspect-square rounded-xl" />
                    const bg = cell.amount > 0 ? heatmapColor(cell.amount, heatmapThresholds, activeChartTheme.heatmap) : activeChartTheme.heatmap.empty
                    const txt = heatmapTextColor(cell.amount, heatmapThresholds, activeChartTheme.heatmap)
                    const isToday = isTodayCell(cell.day, calMonth, calYear)
                    return (
                      <button
                        key={ci}
                        onClick={() => handleDayClick(cell)}
                        aria-label={`${cell.day} ${calMonth}, ${cell.amount > 0 ? formatRp(cell.amount) + " pengeluaran" : "tidak ada pengeluaran"}`}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer ${isToday ? "ring-2 ring-[var(--md-sys-color-primary)] ring-offset-1 ring-offset-white" : ""}`}
                        style={{ background: bg, color: txt }}
                      >
                        <span className="text-[10px] font-bold leading-none tabular-nums">{cell.day}</span>
                        {cell.amount > 0 && (
                          <span className="text-[11px] font-semibold mt-0.5 leading-none tabular-nums" style={{ opacity: 0.85 }}>
                            {cell.amount >= 1000000 ? `${(cell.amount / 1000000).toFixed(1)}jt` : `${(cell.amount / 1000).toFixed(0)}rb`}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-md3-outline-variant">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-md3-on-surface-variant">Sedikit</span>
                <div className="flex-1 h-2.5 rounded-full" style={{ background: `linear-gradient(90deg, ${activeChartTheme.heatmap.empty} 0%, ${activeChartTheme.heatmap.ramp[0]} 25%, ${activeChartTheme.heatmap.ramp[1]} 50%, ${activeChartTheme.heatmap.ramp[2]} 75%, ${activeChartTheme.heatmap.ramp[3]} 100%)` }} />
                <span className="text-[11px] font-bold text-md3-on-surface-variant">Banyak</span>
              </div>
              {heatmapThresholds !== chartTheme.heatmap.thresholds && (
                <p className="mt-1.5 text-[10px] text-md3-on-surface-variant text-center">Skala mengikuti pola pengeluaran bulan ini</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSection === "recap" && (
        <div id="stats-panel-recap" role="tabpanel" aria-labelledby="stats-tab-recap" tabIndex={-1} className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-md3-on-surface-variant">Laporan & Ringkasan</p>
                <p className="text-sm font-semibold text-md3-on-surface-variant">Unduh ringkasan dan telusuri transaksi per bulan.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <MonthlyReportButton
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                transactions={filteredTransactions}
                monthlyData={monthlyData}
                routineMonthlyData={routineMonthlyData}
                allTransactions={allTransactions}
                userName={userName}
                entitlement={effectiveEntitlement}
              />
              {getFeatureGate(effectiveEntitlement, "yearInReview") === "unavailable" ? <LockedFeaturePreview title="Year-in-Review" description="Fitur sedang tidak tersedia." unavailable proRegistrationOpen={proRegistrationOpen} /> : getFeatureGate(effectiveEntitlement, "yearInReview") === "unresolved" ? <LockedFeaturePreview title="Year-in-Review" unresolved /> : hasFeature(effectiveEntitlement, "yearInReview") ? <YearInReviewButton transactions={allTransactions} monthlyData={monthlyData} routineMonthlyData={routineMonthlyData} userName={userName} entitlement={effectiveEntitlement} /> : <LockedFeaturePreview title="Year-in-Review" description="Kilasan tahunan tersedia untuk pengguna Pro." example="Contoh: kilasan Jan–Des dalam PDF — total pemasukan, pengeluaran rutin dan spesial, serta tabungan." proRegistrationOpen={proRegistrationOpen} />}
            </div>
          </div>
          <RecapSection
            transactions={data?.transactions || []}
            history={data?.history}
            onEdit={onEditTx}
            onDelete={onDeleteTx}
            onRepeat={onRepeatTx}
            globalFilter={{
              month: selectedMonth === "Semua Bulan" ? "all" : selectedMonth,
              year: selectedYear === "Semua Tahun" ? "all" : selectedYear,
              account: selectedAccount === "Semua Akun" ? "all" : selectedAccount,
            }}
          />
        </div>
      )}
    </div>
  )
}

function heatmapColor(amount, thresholds = chartTheme.heatmap.thresholds, heatmap = chartTheme.heatmap) {
  if (!amount || amount === 0) return heatmap.empty
  if (amount <= thresholds[0]) return heatmap.ramp[0]
  if (amount <= thresholds[1]) return heatmap.ramp[1]
  if (amount <= thresholds[2]) return heatmap.ramp[2]
  return heatmap.ramp[3]
}

function heatmapTextColor(amount, thresholds = chartTheme.heatmap.thresholds, heatmap = chartTheme.heatmap) {
  if (!amount || amount <= thresholds[2]) return heatmap.textDark
  return heatmap.textLight
}

function isTodayCell(day, calMonth, calYear) {
  const today = new Date()
  const todayMonthName = AVAILABLE_MONTHS[today.getMonth()]
  return day === today.getDate() && calMonth === todayMonthName && calYear === today.getFullYear()
}
