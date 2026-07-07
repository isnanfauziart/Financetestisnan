"use client"
import { useState } from "react"
import { Wallet, ChevronLeft, ChevronRight, Lightbulb, X, AlertCircle, Info, TrendingUp, BarChart3, BarChartHorizontal } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line, LineChart, Legend } from "recharts"
import { THEME, COLORS, AVAILABLE_MONTHS } from "./_components/constants"
import { formatRp, formatRpFull } from "./_components/helpers"
import SelectField from "./_components/SelectField"
import CustomTooltip from "./_components/CustomTooltip"
import EmptyState from "./_components/EmptyState"
import RecapSection from "./_components/RecapSection"
import EventBudgetsSection from "@/components/EventBudgetsSection"
import MonthlyReportButton from "@/components/MonthlyReportButton"
import YearInReviewButton from "@/components/YearInReviewButton"
import CashFlowForecast from "@/components/CashFlowForecast"
import SavingsRateTrend from "@/components/SavingsRateTrend"
import AnomalyAlerts from "@/components/AnomalyAlerts"

const DAY_HEADERS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
const STATS_SECTIONS = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "kategori", label: "Kategori" },
  { key: "tren", label: "Tren" },
  { key: "recap", label: "Recap" },
]

function ChartSkeleton({ height = 180 }) {
  return (
    <div className="shimmer-bg rounded-2xl" style={{ height }} aria-hidden="true" />
  )
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
  top5Categories, trendData,
  compareMode, compareMonthA, compareYearA, compareMonthB, compareYearB, compareDataA, compareDataB, compareChartData,
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
  allTransactions,
  eventsRefreshTrigger,
  onCategoryClick,
}) {
  const [showDateRange, setShowDateRange] = useState(false)
  const [activeSection, setActiveSection] = useState("ringkasan")
  const hasDateRange = dateFrom || dateTo

  return (
    <div className="px-5 pt-4 space-y-5 animate-bento-in" key="stats-tab">
      {/* Filter bar — glass */}
      <div className="glass rounded-2xl p-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <SelectField value={selectedYear} onChange={setSelectedYear} options={["Semua Tahun", ...availableYears]} placeholder="Tahun" />
          <SelectField value={selectedMonth} onChange={setSelectedMonth} options={["Semua Bulan", ...AVAILABLE_MONTHS]} placeholder="Bulan" />
          <SelectField value={selectedAccount} onChange={setSelectedAccount} options={["Semua Akun", ...availableAccounts]} placeholder="Akun" />
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
        <div className="grid grid-cols-4 gap-2">
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
          {/* Smart Insights (compact) */}
          {insights.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <Lightbulb size={13} className="text-amber-500" aria-hidden="true" />
                <h3 className="text-xs font-bold font-display text-earth-700 uppercase tracking-wider">Insights</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {insights.slice(0, 5).map((ins, i) => {
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

          <AnomalyAlerts
            transactions={allTransactions}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onCategoryClick={onCategoryClick}
          />

          {/* Stat hero */}
          {refreshing ? <ChartSkeleton height={200} /> : (
          <div className="bento-tile-dark mesh-hero text-white p-5 shadow-pop relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(159,135,239,0.3) 0%, transparent 70%)" }} />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">Ringkasan Keuangan · {isAllMonths ? "Semua Bulan" : selectedMonth}</p>
              <h2 className="text-3xl font-display font-bold">{formatRpFull(statSurplus)}</h2>
              <p className="mt-2 text-[11px] font-semibold text-white/80">Surplus bersih untuk periode yang sedang kamu lihat</p>
            </div>
          </div>
          <div className="space-y-3 border-t border-white/15 pt-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="opacity-80">Pemasukan</span>
                <span>{formatRp(statIncome)}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (statIncome / (statIncome + statExpense || 1)) * 100)}%`, background: THEME.savings }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="opacity-80">Pengeluaran</span>
                <span>{formatRp(statExpense)}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (statExpense / (statIncome + statExpense || 1)) * 100)}%`, background: THEME.expense }} />
              </div>
            </div>
          </div>
        </div>
      </div>
          )}

          {/* Event Budgets section */}
          <EventBudgetsSection
            filteredTransactions={filteredTransactions}
            onToast={onToast}
            refreshTrigger={eventsRefreshTrigger || 0}
          />
        </>
      )}

      {activeSection === "kategori" && (
        <>
          {/* Pie charts — clickable */}
          {refreshing ? (
            <div className="grid grid-cols-2 gap-3"><ChartSkeleton height={260} /><ChartSkeleton height={260} /></div>
          ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bento-tile bg-white border border-earth-100 p-4 shadow-warm">
              <h3 className="text-xs font-bold text-center mb-2 font-display text-earth-800">Komposisi Pemasukan</h3>
              {incomeCategories.length === 0 ? (
                <EmptyState icon={<Wallet size={18} />} title="Belum ada" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={incomeCategories} cx="50%" cy="50%" innerRadius={42} outerRadius={64}
                      paddingAngle={2} dataKey="value" stroke="none"
                      onClick={(d) => { if (hapticsEnabled) haptics.tap(); setCategoryFilter(d.name) }}
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
              <h3 className="text-xs font-bold text-center mb-2 font-display text-earth-800">Komposisi Pengeluaran</h3>
              {expenseCategories.length === 0 ? (
                <EmptyState icon={<Wallet size={18} />} title="Belum ada" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={expenseCategories} cx="50%" cy="50%" innerRadius={42} outerRadius={64}
                      paddingAngle={2} dataKey="value" stroke="none"
                      onClick={(d) => { if (hapticsEnabled) haptics.tap(); setCategoryFilter(d.name) }}
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
          )}

          {/* Top categories trend */}
          {top5Categories.length > 0 && (
            refreshing ? <ChartSkeleton height={270} /> : (
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
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={clientMonthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#8c7b6a" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pemasukan" name="Pemasukan" fill={THEME.income} radius={[6, 6, 0, 0]} maxBarSize={14} animationBegin={200} animationDuration={800} />
                  <Bar dataKey="pengeluaran" name="Pengeluaran" fill={THEME.expense} radius={[6, 6, 0, 0]} maxBarSize={14} animationBegin={400} animationDuration={800} />
                  <Line type="monotone" dataKey="surplus" name="Surplus" stroke={THEME.primary} strokeWidth={3} dot={{ r: 4, fill: THEME.primary, strokeWidth: 2, stroke: "#fff" }} animationBegin={600} animationDuration={800} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            )
          )}

          <CashFlowForecast monthlyData={monthlyData} />
          <SavingsRateTrend monthlyData={monthlyData} />

          {/* Month comparison */}
          <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold font-display text-earth-800">Bandingkan Bulan</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetComparePeriods}
                  className="text-[11px] font-bold py-1.5 px-3 rounded-full transition-all bg-earth-50 text-earth-600 hover:bg-earth-100"
                >
                  Reset ke bulan ini
                </button>
                <button onClick={() => setCompareMode(!compareMode)} aria-label="Tampilkan perbandingan bulan" className="text-[11px] font-bold py-1.5 px-3 rounded-full transition-all"
                  style={{ background: compareMode ? THEME.heroBg : THEME.surfaceWarm, color: compareMode ? "white" : THEME.textSecondary }}>
                  {compareMode ? "Sembunyikan" : "Bandingkan"}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-earth-500 mb-3">Default: bulan ini vs bulan lalu</p>
            {compareMode && (
              <div className="space-y-4 mt-3 animate-slide-down">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-earth-500 mb-1.5">Periode utama</p>
                    <div className="flex gap-2">
                      <div className="flex-1"><SelectField value={compareMonthA} onChange={setCompareMonthA} options={AVAILABLE_MONTHS} placeholder="Bulan" /></div>
                      <div className="w-20"><SelectField value={compareYearA} onChange={setCompareYearA} options={compareYearOptions || availableYears} placeholder="Tahun" /></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-earth-500 mb-1.5">Bandingkan dengan</p>
                    <div className="flex gap-2">
                      <div className="flex-1"><SelectField value={compareMonthB} onChange={setCompareMonthB} options={AVAILABLE_MONTHS} placeholder="Bulan" /></div>
                      <div className="w-20"><SelectField value={compareYearB} onChange={setCompareYearB} options={compareYearOptions || availableYears} placeholder="Tahun" /></div>
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
                        <Bar dataKey={compareLabelA} name={compareLabelA} fill={THEME.income} radius={[0, 6, 6, 0]} maxBarSize={12} />
                        <Bar dataKey={compareLabelB} name={compareLabelB} fill={THEME.expense} radius={[0, 6, 6, 0]} maxBarSize={12} />
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Recap & Laporan</p>
                <p className="text-sm font-semibold text-earth-700">Unduh ringkasan dan telusuri transaksi per bulan.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <MonthlyReportButton
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                transactions={filteredTransactions}
                monthlyData={monthlyData}
                allTransactions={allTransactions}
              />
              <YearInReviewButton
                transactions={allTransactions}
                monthlyData={monthlyData}
              />
            </div>
          </div>
          <RecapSection transactions={data?.transactions || []} onEdit={onEditTx} onDelete={onDeleteTx} />
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
