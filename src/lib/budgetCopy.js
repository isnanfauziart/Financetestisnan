import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { parseRupiah } from "@/lib/sheets"

const MAX_COPY_ITEMS = 100

export function budgetCompositeKey(kategori, bulan, tahun, akun = "") {
  return [kategori, bulan, tahun, akun].map(value => String(value ?? "").trim()).join("|")
}

function normalizePeriod(period) {
  const bulan = typeof period?.bulan === "string" ? period.bulan.trim() : ""
  const rawYear = period?.tahun
  const tahun = rawYear === undefined || rawYear === null ? "" : String(rawYear).trim()
  return { bulan, tahun }
}

function isValidYear(year) {
  return /^\d{4}$/.test(year) && Number(year) >= 2000 && Number(year) <= 2100
}

export function validateBudgetCopyBody(body) {
  const errors = []
  const source = normalizePeriod(body?.source)
  const destination = normalizePeriod(body?.destination)

  if (!AVAILABLE_MONTHS.includes(source.bulan) || !isValidYear(source.tahun)) {
    errors.push("source period is invalid")
  }
  if (!AVAILABLE_MONTHS.includes(destination.bulan) || !isValidYear(destination.tahun)) {
    errors.push("destination period is invalid")
  }
  if (source.bulan === destination.bulan && source.tahun === destination.tahun) {
    errors.push("source and destination periods must differ")
  }

  const rawItems = Array.isArray(body?.items) ? body.items : []
  if (rawItems.length === 0) errors.push("at least one budget must be selected")
  if (rawItems.length > MAX_COPY_ITEMS) errors.push(`no more than ${MAX_COPY_ITEMS} budgets may be copied at once`)

  const rowIndexes = new Set()
  const items = rawItems.map((item) => {
    const rowIndex = Number(item?.rowIndex)
    const kategori = typeof item?.kategori === "string" ? item.kategori.trim() : ""
    const akun = item?.akun == null ? "" : String(item.akun).trim()
    const limit = parseRupiah(item?.limit)

    if (!Number.isInteger(rowIndex) || rowIndex < 2) errors.push("source row index is invalid")
    if (rowIndexes.has(rowIndex)) errors.push("source rows must be unique")
    rowIndexes.add(rowIndex)
    if (!kategori) errors.push("budget category is required")
    if (!Number.isFinite(limit) || limit <= 0 || limit > 999999999999) errors.push("budget limit is invalid")

    return { rowIndex, kategori, akun, limit }
  })

  return { errors, source, destination, items }
}
