"use client"

import { useEffect, useMemo, useState } from "react"
import { Calculator, Clock, Info, Target, TrendingUp } from "lucide-react"
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp, formatRpFull } from "@/app/dashboard/_components/helpers"
import Sheet from "@/app/dashboard/_components/Sheet"
import { calculateFinancialFreedom } from "@/lib/financialFreedom"
import { useSettings } from "@/lib/useSharedData"

const MAX_MONTHLY_EXPENSE_OVERRIDE = 999999999999

function parsePositiveRupiah(value) {
  const digits = String(value ?? "").replace(/[^0-9]/g, "")
  const amount = Number(digits)
  return Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_MONTHLY_EXPENSE_OVERRIDE ? amount : null
}

function formatSignedRp(value) {
  const amount = Number(value) || 0
  return amount < 0 ? `-${formatRp(Math.abs(amount))}` : formatRp(amount)
}

function formatEta(months) {
  if (months === null || months === undefined) return "Belum bisa diperkirakan"
  if (months <= 0) return "Sudah menyamai angka patokan"

  const roundedMonths = Math.max(1, Math.ceil(months))
  if (roundedMonths < 12) return `Sekitar ${roundedMonths} bulan lagi`

  return `Sekitar ${(months / 12).toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} tahun lagi`
}

function formatEstimatedDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return ""
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(value)
}

function ProjectionTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  const actual = payload.find((entry) => entry.dataKey === "actual")?.value
  const projected = payload.find((entry) => entry.dataKey === "projected")?.value

  return (
    <div className="rounded-xl border border-md3-outline-variant bg-md3-surface-container-lowest p-3 shadow-warm">
      <p className="mb-1 text-[10px] font-bold text-md3-on-surface-variant">{label}</p>
      {actual !== null && actual !== undefined && (
        <p className="text-xs font-bold" style={{ color: THEME.primary }}>
          Tercatat: {formatRp(actual)}
        </p>
      )}
      {projected !== null && projected !== undefined && (
        <p className="text-xs font-bold" style={{ color: THEME.warning }}>
          Patokan: {formatRp(projected)}
        </p>
      )}
    </div>
  )
}

function ProjectionChart({ data, target }) {
  const chart = (
    <LineChart width={320} height={170} data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
      <CartesianGrid stroke={THEME.surfaceWarm} strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9c8978" }} axisLine={false} tickLine={false} />
      <YAxis hide domain={["auto", "auto"]} />
      <Tooltip content={<ProjectionTooltip />} />
      <ReferenceLine y={target} stroke={THEME.warning} strokeDasharray="2 3" label={{ value: "Target", position: "insideTopRight", fill: THEME.warning, fontSize: 10 }} />
      <Line type="monotone" dataKey="actual" name="Tercatat" stroke={THEME.primary} strokeWidth={2.5} dot={{ r: 3, fill: THEME.primary, stroke: "#fff", strokeWidth: 1.5 }} connectNulls={false} isAnimationActive={false} />
      <Line type="monotone" dataKey="projected" name="Patokan" stroke={THEME.warning} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: THEME.warning, stroke: "#fff", strokeWidth: 1.5 }} connectNulls={false} isAnimationActive={false} />
    </LineChart>
  )

  if (typeof ResizeObserver === "undefined") return chart
  return <ResponsiveContainer width="100%" height={170}>{chart}</ResponsiveContainer>
}

export default function FITrackerCard({
  netWorth,
  monthlyData,
  netWorthHistory,
  monthlyExpenseOverride,
  financialFreedomMonthlyExpenseOverride,
  now,
}) {
  const { settings, refetch: refetchSettings } = useSettings()
  const [formulaOpen, setFormulaOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [draftExpense, setDraftExpense] = useState("")
  const [saveError, setSaveError] = useState("")
  const [saving, setSaving] = useState(false)

  const propOverride = financialFreedomMonthlyExpenseOverride !== undefined
    ? financialFreedomMonthlyExpenseOverride
    : monthlyExpenseOverride
  const settingsOverride = settings?.financialFreedomMonthlyExpenseOverride ?? null
  const [activeOverride, setActiveOverride] = useState(propOverride !== undefined ? propOverride : settingsOverride)

  useEffect(() => {
    if (propOverride === undefined) setActiveOverride(settingsOverride)
  }, [propOverride, settingsOverride])

  const calculation = useMemo(() => calculateFinancialFreedom({
    monthlyData,
    netWorth,
    netWorthHistory,
    monthlyExpenseOverride: activeOverride,
    now: now === undefined ? new Date() : now,
  }), [activeOverride, monthlyData, netWorth, netWorthHistory, now])

  const hasProjection = calculation.monthsToFreedom !== null
    && calculation.projectionData.some((point) => point.projected !== null)
  const projectionSummary = [
    `Target ${formatRpFull(calculation.target)}.`,
    `Kekayaan bersih tercatat saat ini ${formatRpFull(calculation.currentNetWorth)}.`,
    calculation.estimatedDate
      ? `Perkiraan pencapaian ${formatEstimatedDate(calculation.estimatedDate)}.`
      : "Tanggal perkiraan pencapaian belum tersedia.",
    "Garis putus-putus adalah estimasi sederhana berbasis surplus bulanan, bukan jaminan hasil.",
  ].join(" ")

  const openEditor = () => {
    const currentOverride = parsePositiveRupiah(activeOverride)
    const actualExpense = Number.isFinite(calculation.actualMonthlyExpense)
      ? Math.round(calculation.actualMonthlyExpense)
      : null
    setDraftExpense(String(currentOverride || actualExpense || ""))
    setSaveError("")
    setEditorOpen(true)
  }

  const persistOverride = async (value) => {
    setSaving(true)
    setSaveError("")
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: [["financialFreedomMonthlyExpenseOverride", value]] }),
      })
      if (!response.ok) throw new Error("Pengaturan belum tersimpan")

      setActiveOverride(value)
      if (typeof refetchSettings === "function") await refetchSettings()
      setEditorOpen(false)
    } catch {
      setSaveError("Pengaturan belum tersimpan. Coba lagi.")
    } finally {
      setSaving(false)
    }
  }

  const saveCustomTarget = () => {
    const value = parsePositiveRupiah(draftExpense)
    if (!value) {
      setSaveError("Masukkan pengeluaran bulanan yang lebih dari Rp 0.")
      return
    }
    persistOverride(value)
  }

  const resetToActual = () => persistOverride(null)

  const openFormula = () => setFormulaOpen(true)

  const renderEditor = () => (
    <Sheet
      open={editorOpen}
      onClose={() => !saving && setEditorOpen(false)}
      title="Ubah target"
      subtitle="Target bebas finansial"
      size="sm"
      maxHeight="85vh"
      position="center"
    >
      <p className="text-sm leading-relaxed text-md3-on-surface-variant">
        Atur nominal pengeluaran bulanan yang dipakai untuk menghitung dana yang kamu butuhkan.
      </p>
      <label htmlFor="financial-freedom-expense" className="mt-5 block text-xs font-bold text-md3-on-surface">
        Pengeluaran bulanan (Rupiah)
      </label>
      <div className="mt-2 flex min-h-11 items-center rounded-2xl border border-md3-outline-variant bg-md3-surface-container-lowest px-3 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
        <span className="mr-2 text-sm font-bold text-md3-on-surface-variant">Rp</span>
        <input
          id="financial-freedom-expense"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          value={draftExpense}
          onChange={(event) => setDraftExpense(event.target.value.replace(/[^0-9]/g, ""))}
          className="min-h-11 w-full bg-transparent text-sm font-bold text-md3-on-surface outline-none"
          aria-label="Pengeluaran bulanan"
        />
      </div>
      {saveError && <p className="mt-2 text-xs font-semibold text-rose-600" role="alert">{saveError}</p>}
      <div className="mt-5 grid gap-2">
        <button
          type="button"
          onClick={saveCustomTarget}
          disabled={saving}
          className="min-h-11 rounded-2xl bg-earth-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-earth-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
        >
          {saving ? "Menyimpan…" : "Simpan target"}
        </button>
        <button
          type="button"
          onClick={resetToActual}
          disabled={saving}
          className="min-h-11 rounded-2xl border border-md3-outline-variant bg-md3-surface-container-lowest px-4 py-2.5 text-sm font-bold text-md3-on-surface-variant transition-colors hover:bg-md3-surface disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
        >
          Gunakan pengeluaran aktual
        </button>
      </div>
    </Sheet>
  )

  const renderFormula = () => (
    <Sheet
      open={formulaOpen}
      onClose={() => setFormulaOpen(false)}
      title="Cara menghitung"
      subtitle="Target bebas finansial"
      size="md"
      maxHeight="85vh"
      position="center"
    >
      <p className="text-sm leading-relaxed text-md3-on-surface-variant">
        Rata-rata pengeluaran aktual bulanan diambil dari maksimal 12 bulan selesai yang memiliki pengeluaran tercatat. Bulan berjalan yang masih parsial tidak ikut dihitung.
      </p>
      <div className="mt-4 space-y-3">
        <div className="rounded-2xl bg-md3-surface p-3">
          <p className="text-xs font-bold text-md3-on-surface">1. Dana yang kamu butuhkan</p>
          <p className="mt-1 text-[11px] leading-relaxed text-md3-on-surface-variant">Pengeluaran bulanan × 12 × 25. Nominal khusus hanya mengubah target ini, bukan surplus aktual.</p>
        </div>
        <div className="rounded-2xl bg-md3-surface p-3">
          <p className="text-xs font-bold text-md3-on-surface">2. Perkiraan waktu</p>
          <p className="mt-1 text-[11px] leading-relaxed text-md3-on-surface-variant">Dana yang masih dibutuhkan dibagi surplus aktual rata-rata dari bulan yang sama.</p>
        </div>
        <div className="rounded-2xl bg-md3-surface p-3">
          <p className="text-xs font-bold text-md3-on-surface">3. Proyeksi tercatat</p>
          <p className="mt-1 text-[11px] leading-relaxed text-md3-on-surface-variant">Garis putus-putus menunjukkan patokan target; garis penuh menunjukkan kekayaan bersih tercatat dari riwayat yang tersedia.</p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-md3-outline-variant bg-violet-50 p-3">
        <p className="text-xs font-bold text-md3-on-surface">Catatan penting</p>
        <p className="mt-1 text-[11px] leading-relaxed text-md3-on-surface-variant">Estimasi edukatif, bukan jaminan atau nasihat investasi. Tidak menghitung inflasi, imbal hasil, pajak, biaya, atau perubahan gaya hidup.</p>
      </div>
    </Sheet>
  )

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-1.5">
          <Target size={14} color={THEME.primary} aria-hidden="true" />
          <p className="text-xs font-bold uppercase tracking-wider text-md3-on-surface-variant">Simulasi</p>
        </div>
        <h2 id="fi-card-title" className="text-lg font-display font-bold text-md3-on-surface">Target Bebas Finansial</h2>
      </div>
      <button
        type="button"
        onClick={openEditor}
        className="min-h-11 flex-shrink-0 rounded-xl border border-md3-outline-variant bg-md3-surface-container-lowest px-3 py-2 text-xs font-bold text-md3-on-surface-variant transition-colors hover:bg-md3-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
      >
        Ubah
      </button>
    </div>
  )

  if (calculation.status === "insufficient-data" || calculation.status === "invalid-net-worth") {
    return (
      <>
        <section className="mt-6 bento-tile animate-bento-in border border-md3-outline-variant bg-md3-surface-container-lowest p-5 shadow-warm motion-reduce:animate-none" aria-labelledby="fi-card-title">
          {header}
          <div className="mt-5 rounded-2xl bg-md3-surface p-4">
            <p className="text-sm leading-relaxed text-md3-on-surface-variant">
              {calculation.status === "invalid-net-worth"
                ? "Kekayaan bersih tercatat belum tersedia. Coba muat ulang dashboard."
                : "Butuh minimal 2 bulan selesai dengan pengeluaran tercatat untuk menampilkan target otomatis."}
            </p>
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-md3-on-surface-variant">
            <Info size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>Setelah datanya cukup, target akan dihitung dari pola keuanganmu sendiri.</span>
          </div>
          <button
            type="button"
            onClick={openFormula}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-md3-outline-variant px-3 py-2 text-xs font-bold text-md3-on-surface-variant transition-colors hover:bg-md3-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
          >
            <Calculator size={14} aria-hidden="true" />
            Cara menghitung
          </button>
        </section>
        {renderEditor()}
        {renderFormula()}
      </>
    )
  }

  const progress = Math.round(calculation.progress)
  const targetReached = calculation.remaining === 0
  const progressColor = progress >= 50 ? THEME.income : progress >= 20 ? THEME.savings : THEME.primary
  const estimatedDateLabel = formatEstimatedDate(calculation.estimatedDate)

  return (
    <>
      <section className="mt-6 bento-tile animate-bento-in border border-md3-outline-variant bg-md3-surface-container-lowest p-5 shadow-warm motion-reduce:animate-none" aria-labelledby="fi-card-title">
        {header}

        <div className="mt-5 rounded-2xl p-4" style={{ background: THEME.surfaceMuted }}>
          <p className="text-xs font-bold uppercase tracking-wider text-md3-on-surface-variant">Dana yang kamu butuhkan</p>
          <p className="mt-1 text-3xl font-display font-bold" style={{ color: progressColor }}>
            {formatRpFull(calculation.target)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-md3-on-surface-variant">
            {calculation.expenseBasis === "custom"
              ? `Target khusus dari Rp ${Number(calculation.monthlyExpense).toLocaleString("id-ID")} per bulan.`
              : `Dari rata-rata pengeluaran aktual ${calculation.monthCount} bulan selesai.`}
          </p>
        </div>

        {calculation.expenseBasis === "custom" && (
          <p role="note" className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-md3-on-surface-variant">
            Kamu sedang memakai target khusus. Disarankan menggunakan nominal pengeluaran aktualmu agar patokannya mengikuti catatan transaksi.
          </p>
        )}

        <div className="mt-4 rounded-2xl border border-md3-outline-variant p-4" style={{ background: THEME.primaryBg }}>
          <div className="flex items-center gap-1.5">
            <Clock size={14} color={THEME.primary} aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-wider text-md3-on-surface-variant">Dengan pola keuanganmu sekarang</p>
          </div>
          <p className="mt-2 text-xl font-display font-bold text-md3-on-surface">{formatEta(calculation.monthsToFreedom)}</p>
          {targetReached ? (
            <p className="mt-1 text-xs leading-relaxed text-md3-on-surface-variant">Kekayaan bersih tercatat sudah menyamai angka patokan. Ini bukan kepastian bebas finansial.</p>
          ) : calculation.monthsToFreedom === null ? (
            <p className="mt-1 text-xs leading-relaxed text-md3-on-surface-variant">Surplus aktual bulanan belum positif, jadi ETA belum tersedia.</p>
          ) : (
            <p className="mt-1 text-xs text-md3-on-surface-variant">Perkiraan sekitar {estimatedDateLabel}.</p>
          )}
          <p className="mt-2 text-[11px] text-md3-on-surface-variant">Surplus aktual bulanan: {formatSignedRp(calculation.averageMonthlySurplus)}</p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-md3-on-surface-variant">Kekayaan bersih tercatat: {formatRp(calculation.currentNetWorth)}</span>
            <span className="font-semibold text-md3-on-surface-variant">Dana yang masih dibutuhkan: {formatRp(calculation.remaining)}</span>
          </div>
          <div
            className="mt-2 h-3 overflow-hidden rounded-full"
            style={{ background: THEME.surfaceWarm }}
            role="progressbar"
            aria-label="Progres kekayaan bersih tercatat"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={String(progress)}
            aria-valuetext={`${progress}% dari target. Dana yang masih dibutuhkan ${formatRp(calculation.remaining)}.`}
          >
            <div
              className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-reduce:transition-none"
              style={{ width: `${progress}%`, background: progressColor }}
            />
          </div>
          <p className="mt-2 text-right text-xs font-bold" style={{ color: progressColor }}>{progress}% dari target</p>
        </div>

        {hasProjection && (
          <div className="mt-4 rounded-2xl border border-md3-outline-variant p-3" style={{ background: THEME.surfaceMuted }}>
            <div className="mb-2 flex items-center gap-1.5">
              <TrendingUp size={14} color={THEME.primary} aria-hidden="true" />
              <p className="text-xs font-bold text-md3-on-surface">Proyeksi kekayaan bersih tercatat</p>
            </div>
            <p id="fi-projection-summary" className="sr-only">
              {projectionSummary}
            </p>
            <div role="img" aria-label="Proyeksi kekayaan bersih tercatat" aria-describedby="fi-projection-summary" className="overflow-x-auto">
              <ProjectionChart data={calculation.projectionData} target={calculation.target} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold text-md3-on-surface-variant">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: THEME.primary }} />Tercatat</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: THEME.warning }} />Patokan target</span>
            </div>
          </div>
        )}

        {calculation.currentNetWorth < 0 && (
          <p className="mt-4 rounded-2xl p-3 text-xs leading-relaxed text-md3-on-surface-variant" style={{ background: THEME.expenseBg }}>
            Kekayaan bersih tercatat masih negatif. Fokus dulu pada surplus bulanan yang stabil dan pengurangan kewajiban.
          </p>
        )}

        <div className="mt-4 rounded-2xl border border-md3-outline-variant p-3" style={{ background: THEME.surfaceWarm }}>
          <p className="text-xs font-semibold text-md3-on-surface">Estimasi edukatif, bukan jaminan atau nasihat investasi.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-md3-on-surface-variant">Hasil ini memakai catatan kekayaan bersih dan pola arus kas yang tersedia; inflasi, imbal hasil, pajak, biaya, dan perubahan gaya hidup tidak dihitung.</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1 text-xs text-md3-on-surface-variant">
            <Info size={12} aria-hidden="true" /> Gunakan sebagai patokan awal.
          </p>
          <button
            type="button"
            onClick={openFormula}
            className="min-h-11 inline-flex items-center gap-2 rounded-xl bg-earth-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-earth-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
          >
            <Calculator size={14} aria-hidden="true" />
            Cara menghitung
          </button>
        </div>
      </section>
      {renderEditor()}
      {renderFormula()}
    </>
  )
}
