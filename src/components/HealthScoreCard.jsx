"use client"
import { useMemo, useState } from "react"
import { Info, PiggyBank, Shield, Target, TrendingDown, TrendingUp, ChevronRight } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { useCountUp } from "@/app/dashboard/_components/helpers"
import { useBudgets } from "@/lib/useSharedData"
import { computeHealthScore } from "@/lib/healthScore"
import Sheet from "@/app/dashboard/_components/Sheet"

const ICONS = { PiggyBank, Shield, Target, TrendingDown, TrendingUp }

const FORMULA_ROWS = [
  { label: "Savings Rate", weight: "30%", desc: "Rata-rata (Pemasukan \u2013 Pengeluaran) / Pemasukan. Target: \u2265 20%" },
  { label: "Emergency Fund", weight: "25%", desc: "(Tabungan Cash + Emas) / rata-rata pengeluaran bulanan. Target: \u2265 6 bulan" },
  { label: "Budget Adherence", weight: "20%", desc: "Kategori di bawah limit / total kategori berbudget. Tanpa budget = tidak aktif" },
  { label: "Expense Trend", weight: "15%", desc: "Tren pengeluaran 6 bulan terakhir (linear regression). Turun = bagus, naik = buruk" },
  { label: "Income Stability", weight: "10%", desc: "Konsistensi pemasukan (1 \u2013 koefisien variasi). Butuh \u2265 2 bulan data" },
]

export default function HealthScoreCard({
  transactions,
  monthlyData,
  selectedMonth,
  selectedYear,
}) {
  const [formulaOpen, setFormulaOpen] = useState(false)
  const { budgets } = useBudgets(
    selectedMonth && selectedMonth !== "Semua Bulan" ? selectedMonth : "",
    selectedYear && selectedYear !== "Semua Tahun" ? selectedYear : ""
  )

  const healthResult = useMemo(() => {
    if (!transactions || transactions.length === 0) return null
    return computeHealthScore({ transactions, monthlyData, budgets })
  }, [transactions, monthlyData, budgets])

  const animatedScore = useCountUp(healthResult?.score || 0, 1400)

  if (!healthResult) {
    return (
      <div className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in">
        <div className="flex items-center gap-1.5 mb-2">
          <Info size={14} className="text-earth-400" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Skor Kesehatan Finansial</p>
        </div>
        <p className="text-sm text-earth-500">Belum ada transaksi untuk menghitung skor.</p>
      </div>
    )
  }

  const { score, grade, gradeColor, gradeDesc, delta, components } = healthResult

  return (
    <>
      <div
        className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in cursor-pointer active:scale-[0.99] transition-transform"
        onClick={() => setFormulaOpen(true)}
        role="button"
        aria-label="Ketuk untuk melihat penjelasan rumus skor kesehatan"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setFormulaOpen(true) }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <Info size={14} className="text-earth-400" aria-hidden="true" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Skor Kesehatan Finansial</p>
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

        {/* Score bar + number */}
        <div className="mb-4">
          <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ background: THEME.surfaceWarm }}>
            <div
              className="h-full rounded-full transition-all duration-1100"
              style={{
                width: `${Math.min(100, animatedScore)}%`,
                background: `linear-gradient(90deg, ${THEME.savings}, ${gradeColor})`,
                transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-5xl font-display font-bold tracking-tight leading-none"
              style={{ color: gradeColor }}
            >
              {animatedScore}
            </span>
            <span
              className="text-lg font-display font-bold"
              style={{ color: gradeColor }}
            >
              {grade}
            </span>
            {delta !== 0 && (
              <span
                className="text-[11px] font-semibold flex items-center gap-0.5"
                style={{ color: delta > 0 ? THEME.income : THEME.danger }}
              >
                {delta > 0 ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
                {delta > 0 ? "+" : ""}{delta} dari bulan lalu
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-earth-100 mb-4" />

        {/* Component breakdown */}
        <div className="space-y-3">
          {components.map((c, i) => {
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
                    <span className="text-[11px] font-semibold text-earth-700">{c.label}</span>
                    <span className="text-[10px] font-bold text-earth-500">
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
                      <span className="text-[9px] text-earth-500 w-16 text-right flex-shrink-0 truncate">{c.detail}</span>
                    </div>
                  ) : (
                    <p className="text-[9px] text-earth-400">{c.detail}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer hint */}
        <p className="text-[10px] text-earth-400 mt-4 flex items-center gap-1">
          <Info size={10} aria-hidden="true" /> Ketuk untuk penjelasan rumus
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
        <p className="text-xs text-earth-600 mb-4">
          Skor dihitung dari 5 komponen. Komponen tanpa data tidak ikut dihitung (bobot didistribusikan ke komponen aktif):
        </p>
        <div className="space-y-3">
          {FORMULA_ROWS.map((row, i) => (
            <div key={i} className="rounded-2xl p-3" style={{ background: THEME.surfaceWarm }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-earth-800">{i + 1}. {row.label}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">{row.weight}</span>
              </div>
              <p className="text-[10px] text-earth-600 leading-relaxed">{row.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl p-3 border border-earth-200">
          <p className="text-[10px] font-bold text-earth-700 mb-1">Grade:</p>
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
