"use client"
import { useMemo, useState } from "react"
import { Info, PiggyBank, Shield, Target, TrendingDown, TrendingUp, ChevronRight } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { useCountUp } from "@/app/dashboard/_components/helpers"
import { useBudgets } from "@/lib/useSharedData"
import { computeHealthScore } from "@/lib/healthScore"
import Sheet from "@/app/dashboard/_components/Sheet"

const ICONS = { PiggyBank, Shield, Target, TrendingDown, TrendingUp }

const EXCLUSION_REASONS = {
  budget_adherence: "Tidak aktif: Budget Adherence — belum ada budget bulan ini",
  expense_trend: "Tidak aktif: Expense Trend — butuh minimal 2 bulan data",
  income_stability: "Tidak aktif: Income Stability — butuh minimal 2 bulan data",
  savings_rate: "Tidak aktif: Savings Rate — belum ada pemasukan tercatat",
}

const FORMULA_ROWS = [
  { label: "Savings Rate", weight: "30%", desc: "Rata-rata (Pemasukan \u2013 Pengeluaran) / Pemasukan. Target: \u2265 20%" },
  { label: "Emergency Fund", weight: "25%", desc: "Tabungan kategori bisa digunakan pilihanmu / rata-rata pengeluaran bulanan. Target: \u2265 6 bulan" },
  { label: "Budget Adherence", weight: "20%", desc: "Kategori di bawah limit / total kategori berbudget. Tanpa budget = tidak aktif" },
  { label: "Expense Trend", weight: "15%", desc: "Tren pengeluaran 6 bulan terakhir (linear regression). Turun = bagus, naik = buruk" },
  { label: "Income Stability", weight: "10%", desc: "Konsistensi pemasukan (1 \u2013 koefisien variasi). Butuh \u2265 2 bulan data" },
]

export default function HealthScoreCard({
  transactions,
  monthlyData,
  routineMonthlyData,
  selectedMonth,
  selectedYear,
  liquidSavingsCategories,
  onOpenPlanBudgets,
}) {
  const [formulaOpen, setFormulaOpen] = useState(false)
  const { budgets } = useBudgets(
    selectedMonth && selectedMonth !== "Semua Bulan" ? selectedMonth : "",
    selectedYear && selectedYear !== "Semua Tahun" ? selectedYear : ""
  )

  const healthResult = useMemo(() => {
    if (!transactions || transactions.length === 0) return null
    return computeHealthScore({ transactions, monthlyData, routineMonthlyData, budgets, liquidSavingsCategories })
  }, [transactions, monthlyData, routineMonthlyData, budgets, liquidSavingsCategories])

  const animatedScore = useCountUp(healthResult?.score || 0, 1400)

  if (!healthResult) {
    return (
      <div className="mt-6 bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-5 shadow-warm animate-bento-in">
        <div className="flex items-center gap-1.5 mb-2">
          <Info size={14} className="text-earth-400" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">Skor Kesehatan Finansial</p>
        </div>
        <p className="text-sm text-md3-on-surface-variant">Belum ada transaksi untuk menghitung skor.</p>
      </div>
    )
  }

  const { score, grade, gradeColor, gradeDesc, delta, components } = healthResult
  const visibleComponents = components.slice(0, 3)
  const monthsCovered = Math.max(routineMonthlyData?.length || 0, monthlyData?.length || 0)
  const liquidCategoriesLabel = (liquidSavingsCategories || []).length > 0
    ? liquidSavingsCategories.join(", ")
    : "Tabungan Cash, Emas"
  const excludedComponents = components.filter((c) => c.score === null).map((c) => c.key)

  return (
    <>
      <div
        className="mt-6 bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-4 sm:p-5 shadow-warm animate-bento-in cursor-pointer active:scale-[0.99] transition-transform"
        onClick={() => setFormulaOpen(true)}
        role="button"
        aria-label="Ketuk untuk melihat penjelasan rumus skor kesehatan"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setFormulaOpen(true) }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5">
            <Info size={14} className="text-earth-400" aria-hidden="true" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">Skor Kesehatan Finansial</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
              style={{ background: gradeColor + "18", color: gradeColor }}
            >
              {gradeDesc}
            </span>
            <ChevronRight size={14} className="text-earth-400" aria-hidden="true" />
          </div>
        </div>

        {/* Item 16 — score as an SVG arc gauge (presentation only; the
            scoring logic above is untouched). The arc draws with the
            count-up so it animates in sync with the number. */}
        <div className="mb-4">
          <div
            className="relative mx-auto w-52"
            role="img"
            aria-label={`Skor kesehatan finansial ${Math.round(animatedScore)} dari 100, grade ${grade}`}
          >
            <svg viewBox="0 0 200 118" className="block w-full" aria-hidden="true">
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke={THEME.surfaceWarm}
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke={gradeColor}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${(Math.min(100, Math.max(0, animatedScore)) / 100) * 251.3} 251.3`}
                style={{ transition: "stroke-dasharray 120ms linear" }}
              />
            </svg>
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
              <span
                className="font-display text-4xl font-bold leading-none tracking-tight tabular-nums sm:text-5xl"
                style={{ color: gradeColor }}
              >
                {animatedScore}
              </span>
              <span className="mt-1 text-sm font-display font-bold" style={{ color: gradeColor }}>
                {grade} · {gradeDesc}
              </span>
            </div>
          </div>
          {delta !== 0 && (
            <p
              className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold"
              style={{ color: delta > 0 ? THEME.income : THEME.danger }}
            >
              {delta > 0 ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
              {delta > 0 ? "+" : ""}{delta} dari bulan lalu
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-md3-surface-container-high mb-4" />

        {/* Component breakdown */}
        <div className="space-y-3">
          {visibleComponents.map((c, i) => {
            const Icon = ICONS[c.icon] || Info
            const isActive = c.score !== null
            return (
              <div key={c.key} className={`flex items-center gap-3 ${!isActive ? "opacity-40" : ""}`}>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: isActive ? gradeColor + "12" : THEME.surfaceWarm, color: isActive ? gradeColor : "#b8a590" }}
                >
                  <Icon size={13} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-semibold text-md3-on-surface-variant">{c.label}</span>
                    <span className="text-[10px] font-bold text-md3-on-surface-variant">
                      {isActive ? Math.round(c.score) : "\u2014"}
                    </span>
                  </div>
                  {isActive ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: THEME.surfaceWarm }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, c.score)}%`,
                            background: c.score >= 70 ? THEME.savings : c.score >= 40 ? THEME.warning : THEME.danger,
                            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                            transitionDelay: `${400 + i * 80}ms`,
                          }}
                        />
                      </div>
                        <span className="text-[11px] text-md3-on-surface-variant w-14 sm:w-16 text-right flex-shrink-0 truncate">{c.detail}</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-earth-400">{c.detail}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer hint */}
        <p className="text-[10px] text-earth-400 mt-4 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1">
            <Info size={10} aria-hidden="true" /> Ketuk untuk penjelasan rumus
          </span>
          <span className="text-md3-on-surface-variant">+{components.length - visibleComponents.length} faktor lain</span>
        </p>
      </div>

      {/* Formula explanation sheet */}
      <Sheet
        open={formulaOpen}
        onClose={() => setFormulaOpen(false)}
        title="Rumus Skor Kesehatan Finansial"
        subtitle="Penjelasan"
        size="md"
        maxHeight="85vh"
        position="center"
      >
        <p className="text-xs text-md3-on-surface-variant mb-4">
          Skor dihitung dari 5 komponen. Komponen tanpa data tidak ikut dihitung (bobot didistribusikan ke komponen aktif):
        </p>
        {/* Wave 8 — live coverage facts for THIS result (no locked-preview exposure). */}
        <div className="mb-4 space-y-2 rounded-2xl bg-md3-surface p-3">
          <p className="text-[11px] font-bold text-md3-on-surface">Data terpakai</p>
          <p className="text-[11px] leading-relaxed text-md3-on-surface-variant">
            Data terpakai: {monthsCovered} bulan lengkap.
          </p>
          <p className="text-[11px] leading-relaxed text-md3-on-surface-variant">
            Dana darurat dihitung dari kategori tabungan: {liquidCategoriesLabel}.
          </p>
          {excludedComponents.length > 0 && (
            <p className="text-[11px] leading-relaxed text-md3-on-surface-variant">
              {excludedComponents.map((key) => EXCLUSION_REASONS[key] || `Tidak aktif: ${key}`).join(" · ")}
            </p>
          )}
        </div>
        <div className="space-y-3">
          {FORMULA_ROWS.map((row, i) => (
            <div key={i} className="rounded-2xl p-3" style={{ background: THEME.surfaceWarm }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-md3-on-surface">{i + 1}. {row.label}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">{row.weight}</span>
              </div>
              <p className="text-[10px] text-md3-on-surface-variant leading-relaxed">{row.desc}</p>
            </div>
          ))}
        </div>
        {typeof onOpenPlanBudgets === "function" && (
          <button
            type="button"
            onClick={() => { setFormulaOpen(false); onOpenPlanBudgets("budget") }}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-md3-outline-variant bg-md3-surface px-3 py-2 text-xs font-bold text-md3-on-surface-variant transition-colors hover:bg-md3-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
          >
            Lihat anggaran
          </button>
        )}
        <div className="mt-4 rounded-2xl p-3 border border-md3-outline-variant">
          <p className="text-[10px] font-bold text-md3-on-surface-variant mb-1">Grade:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { g: "A", d: "\u2265 80", c: THEME.income },
              { g: "B", d: "\u2265 65", c: THEME.savings },
              { g: "C", d: "\u2265 50", c: THEME.warning },
              { g: "D", d: "\u2265 35", c: THEME.expense },
              { g: "F", d: "< 35", c: THEME.danger },
            ].map(({ g, d, c }) => (
              <span key={g} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c + "18", color: c }}>
                {g} ({d})
              </span>
            ))}
          </div>
        </div>
      </Sheet>
    </>
  )
}
