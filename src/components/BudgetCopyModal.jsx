"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Check, Copy } from "lucide-react"
import {
  AVAILABLE_MONTHS,
  EXPENSE_CATEGORIES,
  MONTHS_MAP,
  THEME,
} from "@/app/dashboard/_components/constants"
import { formatInputRupiah } from "@/app/dashboard/_components/helpers"
import SelectField from "@/app/dashboard/_components/SelectField"
import Sheet from "@/app/dashboard/_components/Sheet"
import QuotaNotice from "@/components/QuotaNotice"
import { useSettings } from "@/lib/useSharedData"
import { budgetCompositeKey } from "@/lib/budgetCopy"
import { FREE_LIMITS } from "@/lib/tier"

const CURRENT_YEAR = new Date().getFullYear()

function periodLabel(month, year) {
  return `${month} ${year}`
}

function parsePeriodLabel(value) {
  const text = String(value || "").trim()
  const splitAt = text.lastIndexOf(" ")
  if (splitAt < 1) return { bulan: "", tahun: "" }
  return { bulan: text.slice(0, splitAt), tahun: text.slice(splitAt + 1) }
}

function parseLimit(value) {
  const digits = String(value ?? "").replace(/\./g, "").replace(/[^0-9]/g, "")
  return Number(digits)
}

function formatLimit(value) {
  return formatInputRupiah(String(Math.max(0, Number(value) || 0)))
}

function sortPeriodValues(a, b) {
  const aPeriod = parsePeriodLabel(a)
  const bPeriod = parsePeriodLabel(b)
  const aYear = Number(aPeriod.tahun) || 0
  const bYear = Number(bPeriod.tahun) || 0
  if (aYear !== bYear) return aYear - bYear
  return (MONTHS_MAP[aPeriod.bulan] ?? 0) - (MONTHS_MAP[bPeriod.bulan] ?? 0)
}

function categoryName(value) {
  return typeof value === "string" ? value : value?.name
}

export default function BudgetCopyModal({
  budgets = [],
  defaultMonth,
  defaultYear,
  expenseCategories = [],
  entitlement,
  onClose,
  onSaved,
  onRefresh,
  proRegistrationOpen = true,
}) {
  const { settings } = useSettings()
  const configuredCategories = settings?.categories?.expense
  const activeCategoryNames = useMemo(() => {
    const source = Array.isArray(configuredCategories)
      ? configuredCategories
      : expenseCategories.length > 0
        ? expenseCategories
        : EXPENSE_CATEGORIES
    return new Set(source
      .filter(item => typeof item === "string" || item?.active !== false)
      .map(categoryName)
      .filter(Boolean))
  }, [configuredCategories, expenseCategories])

  const sourcePeriods = useMemo(() => {
    const values = new Set((budgets || [])
      .filter(budget => budget?.kategori && budget?.bulan && budget?.tahun)
      .map(budget => periodLabel(String(budget.bulan).trim(), String(budget.tahun).trim())))
    return Array.from(values).sort(sortPeriodValues)
  }, [budgets])

  const yearOptions = useMemo(() => {
    const values = new Set([
      String(CURRENT_YEAR - 1),
      String(CURRENT_YEAR),
      String(CURRENT_YEAR + 1),
      ...sourcePeriods.map(parsePeriodLabel).map(period => period.tahun),
      defaultYear ? String(defaultYear) : "",
    ])
    return Array.from(values).filter(Boolean).sort((a, b) => Number(a) - Number(b))
  }, [defaultYear, sourcePeriods])

  const initialDestinationMonth = defaultMonth && defaultMonth !== "Semua Bulan"
    ? defaultMonth
    : AVAILABLE_MONTHS[new Date().getMonth()]
  const initialDestinationYear = defaultYear && defaultYear !== "Semua Tahun"
    ? String(defaultYear)
    : String(CURRENT_YEAR)

  const [sourcePeriod, setSourcePeriod] = useState("")
  const [destinationMonth, setDestinationMonth] = useState(initialDestinationMonth)
  const [destinationYear, setDestinationYear] = useState(initialDestinationYear)
  const [selectedRows, setSelectedRows] = useState(() => new Set())
  const [editedLimits, setEditedLimits] = useState({})
  const [error, setError] = useState(null)
  const [requiresRefresh, setRequiresRefresh] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (destinationMonth !== initialDestinationMonth) setDestinationMonth(initialDestinationMonth)
    if (destinationYear !== initialDestinationYear) setDestinationYear(initialDestinationYear)
  }, [initialDestinationMonth, initialDestinationYear])

  useEffect(() => {
    if (sourcePeriods.length === 0) {
      setSourcePeriod("")
      return
    }
    if (sourcePeriod && sourcePeriods.includes(sourcePeriod)) return
    const preferred = sourcePeriods
      .slice()
      .reverse()
      .find(period => period !== periodLabel(destinationMonth, destinationYear))
      || sourcePeriods[sourcePeriods.length - 1]
    setSourcePeriod(preferred)
  }, [destinationMonth, destinationYear, sourcePeriod, sourcePeriods])

  useEffect(() => {
    setSelectedRows(new Set())
    setEditedLimits({})
    setError(null)
    setRequiresRefresh(false)
  }, [sourcePeriod, destinationMonth, destinationYear])

  const destinationKeySet = useMemo(() => new Set(
    (budgets || [])
      .filter(budget => String(budget?.bulan || "").trim() === destinationMonth && String(budget?.tahun || "").trim() === destinationYear)
      .map(budget => budgetCompositeKey(budget.kategori, budget.bulan, budget.tahun, budget.akun)),
  ), [budgets, destinationMonth, destinationYear])

  const source = parsePeriodLabel(sourcePeriod)
  const sourceRows = useMemo(() => (budgets || [])
    .filter(budget => String(budget?.bulan || "").trim() === source.bulan && String(budget?.tahun || "").trim() === source.tahun)
    .map(budget => {
      const duplicate = destinationKeySet.has(budgetCompositeKey(budget.kategori, destinationMonth, destinationYear, budget.akun))
      const inactive = !activeCategoryNames.has(budget.kategori)
      const invalid = !Number.isFinite(Number(budget.limit)) || Number(budget.limit) <= 0
      return {
        ...budget,
        duplicate,
        inactive,
        invalid,
        disabled: duplicate || inactive || invalid,
      }
    }), [activeCategoryNames, budgets, destinationKeySet, destinationMonth, destinationYear, source.bulan, source.tahun])

  const eligibleRows = sourceRows.filter(row => !row.disabled)
  const destinationCount = (budgets || []).filter(budget => String(budget?.bulan || "").trim() === destinationMonth && String(budget?.tahun || "").trim() === destinationYear).length
  const unlimited = entitlement?.tier === "paid" || entitlement?.isAdmin === true
  const remainingSlots = unlimited ? null : Math.max(FREE_LIMITS.budgets - destinationCount, 0)
  const selectedItems = sourceRows
    .filter(row => selectedRows.has(row.rowIndex) && !row.disabled)
    .map(row => ({
      rowIndex: row.rowIndex,
      kategori: row.kategori,
      akun: row.akun || "",
      limit: parseLimit(editedLimits[row.rowIndex] ?? formatLimit(row.limit)),
    }))
  const hasInvalidSelection = selectedItems.some(item => !Number.isFinite(item.limit) || item.limit <= 0)
  const allEligibleSelected = eligibleRows.length > 0 && eligibleRows.every(row => selectedRows.has(row.rowIndex))
  const overQuota = remainingSlots !== null && selectedItems.length > remainingSlots
  const samePeriod = source.bulan === destinationMonth && source.tahun === destinationYear
  const canSave = !submitting && !requiresRefresh && !samePeriod && selectedItems.length > 0 && !hasInvalidSelection && !overQuota

  const toggleRow = (rowIndex) => {
    setSelectedRows(previous => {
      const next = new Set(previous)
      if (next.has(rowIndex)) next.delete(rowIndex)
      else next.add(rowIndex)
      return next
    })
    setError(null)
  }

  const toggleAll = () => {
    setSelectedRows(previous => {
      if (allEligibleSelected) return new Set()
      return new Set(eligibleRows.map(row => row.rowIndex))
    })
    setError(null)
  }

  const handleLimitChange = (rowIndex, value) => {
    setEditedLimits(previous => ({ ...previous, [rowIndex]: formatInputRupiah(value) }))
    setError(null)
  }

  const handleRefresh = async () => {
    await onRefresh?.()
    setRequiresRefresh(false)
    setError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (samePeriod) {
      setError({ error: "Pilih bulan tujuan yang berbeda dari sumber." })
      return
    }
    if (selectedItems.length === 0) {
      setError({ error: "Pilih setidaknya satu anggaran." })
      return
    }
    if (hasInvalidSelection) {
      setError({ error: "Limit yang dipilih harus lebih dari Rp0." })
      return
    }
    if (overQuota) {
      setError({ error: `Pilihan melebihi kuota. Hanya ${remainingSlots} slot tersedia untuk bulan tujuan.` })
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch("/api/budgets/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: { bulan: source.bulan, tahun: source.tahun },
          destination: { bulan: destinationMonth, tahun: destinationYear },
          items: selectedItems,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result)
        setRequiresRefresh(result?.code === "BUDGET_COPY_STALE" || result?.code === "BUDGET_COPY_RETRY")
        return
      }
      await onSaved?.(result.copied || selectedItems.length)
    } catch (submitError) {
      setError({
        error: "Penyalinan mungkin sudah tersimpan. Muat ulang anggaran sebelum mencoba lagi.",
        code: "BUDGET_COPY_RETRY",
        retryable: true,
      })
      setRequiresRefresh(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      open={true}
      onClose={onClose}
      subtitle="Anggaran historis"
      size="md"
      maxHeight="90vh"
      closeOnBackdrop={!submitting}
      header={
        <div className="flex items-center gap-2">
          <Copy size={18} color={THEME.primary} aria-hidden="true" />
          <h3 className="text-lg font-display font-bold text-md3-on-surface">Salin Anggaran</h3>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Salin dari" value={sourcePeriod} onChange={setSourcePeriod} options={sourcePeriods} placeholder="Pilih bulan" />
          <div className="grid grid-cols-2 gap-2">
            <SelectField label="Untuk bulan" value={destinationMonth} onChange={setDestinationMonth} options={AVAILABLE_MONTHS} placeholder="Bulan" />
            <SelectField label="Tahun" value={destinationYear} onChange={setDestinationYear} options={yearOptions} placeholder="Tahun" />
          </div>
        </div>

        {sourcePeriods.length === 0 ? (
          <div className="rounded-2xl border border-md3-outline-variant bg-md3-surface-container-low px-4 py-4 text-sm text-md3-on-surface-variant">
            Belum ada anggaran historis untuk disalin. Buat anggaran pertama secara manual.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-md3-surface-container-low px-3 py-2.5">
              <p role="status" aria-live="polite" className="text-xs font-semibold text-md3-on-surface-variant">
                {selectedItems.length} dipilih
                {remainingSlots !== null ? ` · ${remainingSlots} slot tersedia` : " · Tanpa batas"}
              </p>
              <button
                type="button"
                onClick={toggleAll}
                disabled={eligibleRows.length === 0}
                aria-pressed={allEligibleSelected}
                className="min-h-11 rounded-xl px-3 text-xs font-bold text-sage-700 hover:bg-sage-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {allEligibleSelected ? <Check size={13} className="mr-1 inline" aria-hidden="true" /> : null}
                Pilih semua
              </button>
            </div>

            <div className="space-y-2" aria-label="Anggaran yang dapat disalin">
              {sourceRows.map(row => {
                const accountLabel = row.akun || "Semua akun"
                const disabledReason = row.duplicate
                  ? "Sudah ada di bulan tujuan"
                  : row.inactive
                    ? "Kategori tidak aktif"
                    : row.invalid
                      ? "Limit lama tidak valid"
                      : ""
                return (
                  <div
                    key={row.rowIndex}
                    className={`rounded-2xl border px-3 py-2.5 ${row.disabled ? "border-md3-outline-variant bg-md3-surface-container-low opacity-70" : "border-md3-outline-variant bg-md3-surface"}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.rowIndex)}
                        disabled={row.disabled}
                        onChange={() => toggleRow(row.rowIndex)}
                        aria-label={`${row.kategori} · ${accountLabel}`}
                        className="mt-1 h-5 w-5 shrink-0 accent-sage-600"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-md3-on-surface">{row.kategori}</p>
                            <p className="text-[11px] text-md3-on-surface-variant">{accountLabel}</p>
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editedLimits[row.rowIndex] ?? formatLimit(row.limit)}
                            onChange={event => handleLimitChange(row.rowIndex, event.target.value)}
                            disabled={row.disabled}
                            aria-label={`Limit ${row.kategori} · ${accountLabel}`}
                            className="min-h-11 w-32 rounded-xl border border-md3-outline-variant bg-md3-surface px-3 text-right text-sm font-semibold text-md3-on-surface outline-none focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:bg-md3-surface-container-low"
                          />
                        </div>
                        {disabledReason && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-md3-on-surface-variant">
                            <AlertCircle size={12} aria-hidden="true" /> {disabledReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {samePeriod && <p role="alert" className="text-xs font-semibold text-rose-700">Pilih bulan tujuan yang berbeda dari sumber.</p>}
        {overQuota && <p role="alert" className="text-xs font-semibold text-amber-700">Pilihan melebihi kuota. Hanya {remainingSlots} slot tersedia untuk bulan tujuan.</p>}
        <QuotaNotice error={error} proRegistrationOpen={proRegistrationOpen} />
        {requiresRefresh && (
          <button type="button" onClick={handleRefresh} className="min-h-11 w-full rounded-xl border border-md3-outline-variant px-4 py-2 text-xs font-bold text-md3-on-surface hover:bg-md3-surface-container-high">
            Muat ulang anggaran
          </button>
        )}
        <button type="submit" disabled={!canSave} className="btn-filled w-full mt-2 min-h-11">
          {submitting ? <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : `Salin ${selectedItems.length} anggaran`}
        </button>
      </form>
    </Sheet>
  )
}
