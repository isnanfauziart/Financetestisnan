"use client"
import { useState } from "react"
import { Wallet, ChevronLeft, ChevronRight, Lightbulb, X, AlertCircle, Info, TrendingUp, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, LineChart, LabelList, Legend } from "recharts"
import { THEME, COLORS, AVAILABLE_MONTHS } from "./_components/constants"
import { formatRp, formatRpFull } from "./_components/helpers"
import SelectField from "./_components/SelectField"
import CustomTooltip from "./_components/CustomTooltip"
import EmptyState from "./_components/EmptyState"
import RecapSection from "./_components/RecapSection"
import MonthlyReportButton from "@/components/MonthlyReportButton"
import YearInReviewButton from "@/components/YearInReviewButton"
import CashFlowForecast from "@/components/CashFlowForecast"
import SavingsRateTrend from "@/components/SavingsRateTrend"
import AnomalyAlerts from "@/components/AnomalyAlerts"
import LockedFeaturePreview from "@/components/LockedFeaturePreview"
import { hasFeature, isFeatureEnabled } from "@/lib/featureAccess"

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

function getMonthlyTrendSummary(monthlyData) {
  if (!monthlyData.length) return "Tren bulanan: belum ada data."
  const latest = monthlyData[monthlyData.length - 1]
  return `Tren bulanan: ${monthlyData.length} periode. Periode terakhir ${latest.month || "terakhir"}, pemasukan ${formatRp(latest.pemasukan || 0)}, pengeluaran ${formatRp(latest.pengeluaran || 0)}, surplus ${formatRp(latest.surplus || 0)}.`
}

function getCategoryTrendSummary(monthlyData, categories) {
  if (!monthlyData.length || !categories.length) return "Tren kategori pengeluaran: belum ada data."
  const latest = [...monthlyData].reverse().find(row => categories.some(category => Number(row[category]) > 0)) || monthlyData[monthlyData.length - 1]
  const ranked = categories.slice(0, 5).map(category => `${category} ${formatRp(latest[category] || 0)}`).join(", ")
  return `Tren kategori pengeluaran: ${latest.month || "periode terakhir"}. ${ranked}.`
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
}) {
  const effectiveEntitlement = entitlement === undefined ? { features: { anomalyAlerts: true, cashFlowForecast: true, yearInReview: true } } : entitlement
  const [showDateRange, setShowDateRange] = useState(false)
  const [activeSection, setActiveSection] = useState("ringkasan")
  const [analysisMode, setAnalysisMode] = useState("routine")
  const hasDateRange = dateFrom || dateTo
  const routineAnalyticsMonthlyData = routineMonthlyData || monthlyData
  const isRoutineMode = analysisMode === "routine"
  const chartExpenseCategories = isRoutineMode ? (routineExpenseCategories || expenseCategories) : expenseCategories
  const chartClientMonthlyData = isRoutineMode ? (routineClientMonthlyData || clientMonthlyData) : clientMonthlyData
  const chartTop5Categories = isRoutineMode ? (routineTop5Categories || top5Categories) : top5Categories
  const chartTrendData = isRoutineMode ? (routineTrendData || trendData) : trendData
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
  const insightCards = Array.isArray(insights) ? insights : []

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
        <button onClick={() => setShowDateRange(!showDateRange)} className="text-[10px] font-bold text-earth-500 uppercase tracking-wider flex items-center gap-1.5 hover:text-violet-600 transition-colors">
          {showDateRange ? "− Sembunyikan" : "+ Tambah"} rentang tanggal
        </button>
        {showDateRange && (
          <div className="grid grid-cols-2 gap-2 pt-1 animate-slide-down">
            <div>
              <label className="text-[10px] font-bold text-earth-500 mb-1 block uppercase tracking-wider">Dari</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2.5 bg-earth-50 border border-earth-100 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-violet-200" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-earth-500 mb-1 block uppercase tracking-wider">Sampai</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2.5 bg-earth-50 border border-earth-100 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-violet-200" />
            </div>
          </div>
        )}
        {(categoryFilter || hasDateRange) && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">Filter aktif:</span>
            {categoryFilter && (
              <div className="chip chip-active">
                {categoryFilter}
                <button onClick={() => setCategoryFilter(null)} className="ml-1 hover:opacity-70" aria-label="Hapus filter kategori">
                  <X size={10} strokeWidth={3} aria-hidden="true" />
                </button>
              </div>
            )}
            {hasDateRange && (
              <div className="chip chip-active">
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
          {STATS_SECTIONS.map((section) => {
            const isActive = activeSection === section.key
            return (
              <button
                key={section.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSection(section.key)}
                className={`rounded-2xl px-3 py-2.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-earth-900 text-white shadow-warm"
                    : "bg-white/70 text-earth-500 hover:bg-white hover:text-earth-800"
                }`}
              >
                {section.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeSection === "ringkasan" && (
        <>
          {/* Financial summary */}
          {refreshing ? <ChartSkeleton height={160} /> : (
            <section className="bento-tile-dark mesh-hero text-white p-4 sm:p-5 shadow-pop relative overflow-hidden" role="region" aria-label="Kondisi keuangan">
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(159,135,239,0.3) 0%, transparent 70%)" }} />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-80">Kondisi Keuangan · {summaryPeriod}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1.5">
                      <h2 className="text-2xl sm:text-3xl font-display font-bold tabular-nums">{formatRpFull(Math.abs(statSurplus))}</h2>
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={summaryStatusStyle}>{summaryStatus}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 border-t border-white/15 pt-3">
                  <div className="rounded-2xl border border-sage-300/20 bg-sage-500/20 p-3" role="group" aria-label={`Pemasukan ${formatRp(statIncome)}`}>
                    <div className="flex items-center gap-1.5 text-sage-200">
                      <ArrowDownLeft size={13} strokeWidth={2.5} aria-hidden="true" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">Pemasukan</p>
                    </div>
                    <p className="mt-1 text-sm sm:text-base font-bold tabular-nums text-white">{formatRp(statIncome)}</p>
                  </div>
                  <div className="rounded-2xl border border-clay-300/20 bg-clay-400/20 p-3" role="group" aria-label={`Pengeluaran ${formatRp(statExpense)}`}>
                    <div className="flex items-center gap-1.5 text-clay-200">
                      <ArrowUpRight size={13} strokeWidth={2.5} aria-hidden="true" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">Pengeluaran</p>
                    </div>
                    <p className="mt-1 text-sm sm:text-base font-bold tabular-nums text-white">{formatRp(statExpense)}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Smart Insights (compact) */}
          {hasFeature(effectiveEntitlement, "insights") && insightCards.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <Lightbulb size={13} className="text-amber-500" aria-hidden="true" />
                <h3 className="text-xs font-bold font-display text-earth-700 uppercase tracking-wider">Insights</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {insightCards.slice(0, 5).map((ins, i) => {
                  const Icon = ins.icon
                  const TypeIcon = ins.type === "positive" ? TrendingUp : ins.type === "warning" ? AlertCircle : Info
                  return (
                    <div key={i} className="insight-card animate-fade-in-up" style={{ background: ins.color + "12", color: ins.color, animationDelay: `${0.05 * i}s` }}>
                      <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 relative" style={{ background: ins.color + "22", boxShadow: `0 4px 12px ${ins.color}30` }}>
                        <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: ins.color, color: "white" }}>
                          <TypeIcon size={8} strokeWidth={3} aria-hidden="true" />
                        </span>
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

          {!isFeatureEnabled(effectiveEntitlement, "anomalyAlerts") ? <LockedFeaturePreview title="Anomaly Alerts" description="Fitur sedang tidak tersedia." unavailable /> : hasFeature(effectiveEntitlement, "anomalyAlerts") ? <AnomalyAlerts transactions={allTransactions} selectedMonth={selectedMonth} selectedYear={selectedYear} onCategoryClick={onCategoryClick} /> : <LockedFeaturePreview title="Anomaly Alerts" description="Deteksi pola transaksi tidak biasa tersedia di Pro." />}
        </>
      )}

      {activeSection === "kategori" && (
        <>
          {/* Ranked category bars — clickable */}
          {refreshing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><ChartSkeleton height={260} /><ChartSkeleton height={260} /></div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "expense", title: "Pengeluaran terbesar", categories: chartExpenseCategories, colorOffset: 3, summaryId: "stats-expense-category-summary" },
              { key: "income", title: "Pemasukan terbesar", categories: incomeCategories, colorOffset: 0, summaryId: "stats-income-category-summary" },
            ].map(({ key, title, categories, colorOffset, summaryId }) => (
              <section key={key} className="bento-tile bg-white border border-earth-100 p-4 shadow-warm" aria-labelledby={`${summaryId}-title`}>
                <h3 id={`${summaryId}-title`} className="text-xs font-bold text-center mb-2 font-display text-earth-800">{title}</h3>
                <p id={summaryId} className="sr-only">{getCategorySummary(title, categories)}</p>
                {categories.length === 0 ? (
                  <EmptyState icon={<Wallet size={18} />} title="Belum ada" />
                ) : (
                  <div role="img" aria-describedby={summaryId}>
                    <ResponsiveContainer width="100%" height={Math.max(180, Math.min(280, categories.slice(0, 8).length * 34 + 36))}>
                      <BarChart data={categories.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barCategoryGap="22%">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={82} tick={{ fontSize: 10, fill: "#6b625a" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="value"
                          name={title}
                          fill={COLORS[colorOffset % COLORS.length]}
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
                            <Cell key={category.name} fill={COLORS[(index + colorOffset) % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="mt-2 space-y-1.5" aria-label={`${title} detail`}>
                  {categories.slice(0, 6).map((category, index) => (
                    <div key={category.name} className="flex items-center gap-2 text-[10px]">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: COLORS[(index + colorOffset) % COLORS.length] }} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate font-medium text-earth-700">{category.name}</span>
                      <span className="flex-shrink-0 font-bold text-earth-800">
                        {formatRp(category.value)}{key === "expense" ? ` · ${formatCategoryPercentage(category.value, chartExpenseTotal)}%` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
          )}

          {/* Top categories trend */}
          {chartTop5Categories.length > 0 && (
            refreshing ? <ChartSkeleton height={270} /> : (
            <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm">
              <h3 className="text-sm font-bold mb-3 font-display text-earth-800">Tren Kategori Pengeluaran</h3>
              <p id="stats-category-trend-summary" className="sr-only">{getCategoryTrendSummary(chartTrendData, chartTop5Categories)}</p>
              <div role="img" aria-describedby="stats-category-trend-summary">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartTrendData}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#8c7b6a" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    {chartTop5Categories.map((cat, i) => (
                      <Line key={cat} type="monotone" dataKey={cat} name={cat} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ r: 3, fill: COLORS[i % COLORS.length] }} connectNulls animationBegin={Math.min(i * 40, 120)} animationDuration={240} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            )
          )}
        </>
      )}

      {activeSection === "tren" && (
        <>
          {/* Monthly trend */}
          {isAllMonths && (
            refreshing ? <ChartSkeleton height={240} /> : (
            <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm">
              <h3 className="text-sm font-bold mb-3 font-display text-earth-800">Tren Bulanan</h3>
              <p id="stats-monthly-trend-summary" className="sr-only">{getMonthlyTrendSummary(chartClientMonthlyData)}</p>
              <div role="img" aria-describedby="stats-monthly-trend-summary">
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={chartClientMonthlyData}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#8c7b6a" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="pemasukan" name="Pemasukan" fill={THEME.income} radius={[6, 6, 0, 0]} maxBarSize={14} animationBegin={0} animationDuration={220} />
                    <Bar dataKey="pengeluaran" name="Pengeluaran" fill={THEME.expense} radius={[6, 6, 0, 0]} maxBarSize={14} animationBegin={40} animationDuration={220} />
                    <Line type="monotone" dataKey="surplus" name="Surplus" stroke={THEME.primary} strokeWidth={3} dot={{ r: 4, fill: THEME.primary, strokeWidth: 2, stroke: "#fff" }} animationBegin={80} animationDuration={260} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            )
          )}

          {!isFeatureEnabled(effectiveEntitlement, "cashFlowForecast") ? <LockedFeaturePreview title="Cash Flow Forecast" description="Fitur sedang tidak tersedia." unavailable /> : hasFeature(effectiveEntitlement, "cashFlowForecast") ? <CashFlowForecast monthlyData={routineAnalyticsMonthlyData} transactions={allTransactions} bills={bills} billsLoading={billsLoading} billsError={billsError} now={now} /> : <LockedFeaturePreview title="Cash Flow Forecast" description="Prediksi arus kas tersedia di Pro." />}
          <SavingsRateTrend monthlyData={routineAnalyticsMonthlyData} />

          {/* Month comparison */}
          <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm">
            <div className="flex flex-col gap-2.5 mb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold font-display text-earth-800">Bandingkan Bulan</h3>
                <p className="text-[10px] text-earth-500 mt-1">Default: bulan ini vs bulan lalu</p>
              </div>
              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 sm:flex sm:items-center">
                <button
                  type="button"
                  onClick={resetComparePeriods}
                  className="text-[11px] font-bold py-2 px-3 rounded-full transition-all bg-earth-50 text-earth-600 hover:bg-earth-100"
                >
                  Reset ke bulan ini
                </button>
                <button onClick={() => setCompareMode(!compareMode)} aria-label="Tampilkan perbandingan bulan" className="text-[11px] font-bold py-2 px-3 rounded-full transition-all"
                  style={{ background: compareMode ? THEME.heroBg : THEME.surfaceWarm, color: compareMode ? "white" : THEME.textSecondary }}>
                  {compareMode ? "Sembunyikan" : "Bandingkan"}
                </button>
              </div>
            </div>
            {compareMode && (
              <div className="space-y-4 mt-3 animate-slide-down">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold text-earth-500 mb-1.5">Periode utama</p>
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px] gap-2">
                      <div className="min-w-0"><SelectField value={compareMonthA} onChange={setCompareMonthA} options={AVAILABLE_MONTHS} placeholder="Bulan" /></div>
                      <div className="min-w-0"><SelectField value={compareYearA} onChange={setCompareYearA} options={compareYearOptions || availableYears} placeholder="Tahun" /></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-earth-500 mb-1.5">Bandingkan dengan</p>
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
                {activeCompareChartData.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-earth-500 mb-2">Perbandingan per Kategori</p>
                    <p className="text-[10px] text-earth-500 -mt-1 mb-2">{compareLabelA} vs {compareLabelB}</p>
                    <p id="stats-comparison-summary" className="sr-only">
                      Perbandingan pengeluaran {compareLabelA} dan {compareLabelB}: {activeCompareChartData.map(item => `${item.category}, ${formatRp(item[compareLabelA] || 0)} dan ${formatRp(item[compareLabelB] || 0)}`).join("; ")}.
                    </p>
                    <div className="overflow-x-auto">
                      <div style={{ minWidth: Math.max(640, activeCompareChartData.length * 110) }}>
                        <div role="img" aria-describedby="stats-comparison-summary">
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={activeCompareChartData} margin={{ top: 24, right: 12, left: 0, bottom: 28 }} barCategoryGap="24%" barGap={4}>
                              <XAxis dataKey="category" interval={0} tick={{ fontSize: 10, fill: THEME.textSecondary }} tickMargin={8} axisLine={false} tickLine={false} />
                              <YAxis width={58} tickFormatter={value => formatRp(value)} tick={{ fontSize: 10, fill: THEME.textSecondary }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip content={<CustomTooltip />} />
                              <Bar dataKey={compareLabelA} name={compareLabelA} fill={THEME.income} radius={[6, 6, 0, 0]} maxBarSize={24} animationBegin={0} animationDuration={240}>
                                <LabelList dataKey={compareLabelA} position="top" formatter={value => formatRp(value || 0)} fill={THEME.textPrimary} fontSize={9} />
                              </Bar>
                              <Bar dataKey={compareLabelB} name={compareLabelB} fill={THEME.expense} radius={[6, 6, 0, 0]} maxBarSize={24} animationBegin={40} animationDuration={240}>
                                <LabelList dataKey={compareLabelB} position="top" formatter={value => formatRp(value || 0)} fill={THEME.textPrimary} fontSize={9} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div role="group" aria-label="Keterangan warna perbandingan" className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-earth-500">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: THEME.income }} aria-hidden="true" />
                            {compareLabelA}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: THEME.expense }} aria-hidden="true" />
                            {compareLabelB}
                          </span>
                          <p className="basis-full text-center text-[10px] text-earth-600">Keduanya menunjukkan pengeluaran</p>
                        </div>
                      </div>
                    </div>
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
              <button onClick={() => navigateCalendar(-1)} aria-label="Bulan sebelumnya" className="w-8 h-8 rounded-xl bg-earth-50 hover:bg-earth-100 transition-colors flex items-center justify-center">
                <ChevronLeft size={14} color={THEME.textSecondary} aria-hidden="true" />
              </button>
              <span className="text-sm font-bold text-earth-800">{calMonth} {calYear}</span>
              <button onClick={() => navigateCalendar(1)} aria-label="Bulan berikutnya" className="w-8 h-8 rounded-xl bg-earth-50 hover:bg-earth-100 transition-colors flex items-center justify-center">
                <ChevronRight size={14} color={THEME.textSecondary} aria-hidden="true" />
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
                    const bg = cell.amount > 0 ? heatmapColor(cell.amount) : "#f6efe5"
                    const txt = heatmapTextColor(cell.amount)
                    const isToday = isTodayCell(cell.day, calMonth, calYear)
                    return (
                      <button
                        key={ci}
                        onClick={() => handleDayClick(cell)}
                        aria-label={`${cell.day} ${calMonth}, ${cell.amount > 0 ? formatRp(cell.amount) + " pengeluaran" : "tidak ada pengeluaran"}`}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer ${isToday ? "ring-2 ring-violet-500 ring-offset-1 ring-offset-white" : ""}`}
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
        </>
      )}

      {activeSection === "recap" && (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Laporan & Ringkasan</p>
                <p className="text-sm font-semibold text-earth-700">Unduh ringkasan dan telusuri transaksi per bulan.</p>
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
              {!isFeatureEnabled(effectiveEntitlement, "yearInReview") ? <LockedFeaturePreview title="Year-in-Review" description="Fitur sedang tidak tersedia." unavailable /> : hasFeature(effectiveEntitlement, "yearInReview") ? <YearInReviewButton transactions={allTransactions} monthlyData={monthlyData} routineMonthlyData={routineMonthlyData} userName={userName} entitlement={effectiveEntitlement} /> : <LockedFeaturePreview title="Year-in-Review" description="Kilasan tahunan tersedia untuk pengguna Pro." />}
            </div>
          </div>
          <RecapSection transactions={data?.transactions || []} history={data?.history} onEdit={onEditTx} onDelete={onDeleteTx} />
        </>
      )}
    </div>
  )
}

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

function isTodayCell(day, calMonth, calYear) {
  const today = new Date()
  const todayMonthName = AVAILABLE_MONTHS[today.getMonth()]
  return day === today.getDate() && calMonth === todayMonthName && calYear === today.getFullYear()
}
