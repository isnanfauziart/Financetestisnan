import { AVAILABLE_MONTHS } from "./constants"
import { getStatsPeriodDefaults } from "./statsPeriod"

/**
 * Wave 5 — URL-backed navigation state.
 *
 * One dashboard-owned adapter parses and serializes every piece of view state
 * that materially changes what the user sees. Components never read the URL
 * themselves; page.js owns the only copy and hands down normalized values.
 *
 * Rules:
 * - Unknown or invalid parameters fail closed to the defaults; nothing throws.
 * - Values equal to the defaults are omitted from the serialized query string.
 * - `tab`, `section` (Rencana), `stats` (Statistik) are destinations that users
 *   expect Back to revisit; everything else is a filter tweak.
 */

export const DASHBOARD_TABS = ["home", "stats", "plan", "profile"]

export const PLAN_SECTION_KEYS = [
  "overview",
  "budget",
  "goal",
  "bill",
  "debt",
  "event",
  "simulasi",
]

export const STATS_SECTION_KEYS = ["ringkasan", "kategori", "tren", "recap"]

const ANALYSIS_MODE_KEYS = ["routine", "actual"]
const ANALYSIS_MODE_LABELS = { Rutin: "routine", Semua: "actual" }
const YEAR_PATTERN = /^\d{4}$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const FREE_TEXT_MAX = 60

const ALL_MONTHS = [...AVAILABLE_MONTHS, "Semua Bulan"]
const ALL_YEARS = ["Semua Tahun"]

export function getDashboardUrlDefaults(now = new Date()) {
  const stats = getStatsPeriodDefaults(now)
  return {
    tab: "home",
    planSection: "overview",
    statsSection: "ringkasan",
    analysisMode: "routine",
    month: stats.selectedMonth,
    year: stats.selectedYear,
    account: "Semua Akun",
    category: null,
    dateFrom: "",
    dateTo: "",
    compare: true,
    compareA: `${stats.compareMonthA} ${stats.compareYearA}`,
    compareB: `${stats.compareMonthB} ${stats.compareYearB}`,
    calMonth: AVAILABLE_MONTHS[now.getMonth()] || "Jan",
    calYear: String(now.getFullYear()),
  }
}

function cleanParam(params, key) {
  const raw = params.get(key)
  if (raw == null) return ""
  return String(raw).trim().slice(0, 120)
}

function validYearOr(value, fallback) {
  const trimmed = String(value || "").trim()
  if (YEAR_PATTERN.test(trimmed)) return trimmed
  return fallback
}

function validDateOr(value, fallback) {
  const trimmed = String(value || "").trim()
  if (!DATE_PATTERN.test(trimmed)) return fallback
  const month = Number(trimmed.slice(5, 7))
  const day = Number(trimmed.slice(8, 10))
  if (month < 1 || month > 12 || day < 1 || day > 31) return fallback
  return trimmed
}

function validComparePeriodOr(value, fallback) {
  const trimmed = String(value || "").trim()
  const spaceIndex = trimmed.lastIndexOf(" ")
  if (spaceIndex <= 0) return fallback
  const month = trimmed.slice(0, spaceIndex)
  const year = trimmed.slice(spaceIndex + 1)
  if (!AVAILABLE_MONTHS.includes(month) || !YEAR_PATTERN.test(year)) return fallback
  return `${month} ${year}`
}

/**
 * Parse `?tab=stats&section=tren&month=Mei&year=2026`-style state into a
 * normalized view-state object. Always returns every key; invalid values
 * silently fall back to the defaults.
 */
export function parseDashboardUrl(search, now = new Date()) {
  const defaults = getDashboardUrlDefaults(now)
  let params
  try {
    params = new URLSearchParams(String(search || ""))
  } catch {
    return defaults
  }

  const tab = cleanParam(params, "tab")
  const planSection = cleanParam(params, "section")
  const statsSection = cleanParam(params, "stats")
  const modeRaw = cleanParam(params, "mode").toLowerCase()
  const modeLabel = ANALYSIS_MODE_LABELS[cleanParam(params, "mode")]
  const month = cleanParam(params, "month")
  const year = cleanParam(params, "year")
  const account = cleanParam(params, "account")
  const category = cleanParam(params, "category")
  const dateFrom = cleanParam(params, "from")
  const dateTo = cleanParam(params, "to")
  const compareRaw = cleanParam(params, "compare").toLowerCase()
  const compareA = cleanParam(params, "cmpA")
  const compareB = cleanParam(params, "cmpB")
  const calMonth = cleanParam(params, "calMonth")
  const calYear = cleanParam(params, "calYear")

  return {
    tab: DASHBOARD_TABS.includes(tab) ? tab : defaults.tab,
    planSection: PLAN_SECTION_KEYS.includes(planSection) ? planSection : defaults.planSection,
    statsSection: STATS_SECTION_KEYS.includes(statsSection) ? statsSection : defaults.statsSection,
    analysisMode: ANALYSIS_MODE_KEYS.includes(modeRaw)
      ? modeRaw
      : modeLabel || defaults.analysisMode,
    month: ALL_MONTHS.includes(month) ? month : defaults.month,
    year: ALL_YEARS.includes(year) || YEAR_PATTERN.test(year) ? year : defaults.year,
    account: account === "" ? defaults.account : account,
    category: category === "" ? null : category.slice(0, FREE_TEXT_MAX),
    dateFrom: validDateOr(dateFrom, defaults.dateFrom),
    dateTo: validDateOr(dateTo, defaults.dateTo),
    compare: compareRaw === "0" || compareRaw === "false" ? false : defaults.compare,
    compareA: validComparePeriodOr(compareA, defaults.compareA),
    compareB: validComparePeriodOr(compareB, defaults.compareB),
    calMonth: AVAILABLE_MONTHS.includes(calMonth) ? calMonth : defaults.calMonth,
    calYear: validYearOr(calYear, defaults.calYear),
  }
}

/**
 * Serialize view state to a query string (no leading `?`). Keys equal to the
 * defaults are omitted so ordinary dashboard URLs stay short and stable.
 */
export function serializeDashboardUrl(state, now = new Date()) {
  const defaults = getDashboardUrlDefaults(now)
  const params = new URLSearchParams()
  const putIf = (key, value, defaultValue) => {
    const clean = String(value ?? "")
    if (clean === "" || clean === String(defaultValue ?? "")) return
    params.set(key, clean)
  }

  putIf("tab", state.tab, defaults.tab)
  putIf("section", state.planSection, defaults.planSection)
  putIf("stats", state.statsSection, defaults.statsSection)
  putIf("mode", state.analysisMode, defaults.analysisMode)
  putIf("month", state.month, defaults.month)
  putIf("year", state.year, defaults.year)
  putIf("account", state.account, defaults.account)
  if (state.category) params.set("category", String(state.category).slice(0, FREE_TEXT_MAX))
  putIf("from", state.dateFrom, defaults.dateFrom)
  putIf("to", state.dateTo, defaults.dateTo)
  if (state.compare === false) params.set("compare", "0")
  putIf("cmpA", state.compareA, defaults.compareA)
  putIf("cmpB", state.compareB, defaults.compareB)
  putIf("calMonth", state.calMonth, defaults.calMonth)
  putIf("calYear", state.calYear, defaults.calYear)

  return params.toString()
}

/**
 * Split a serialized `"Mei 2026"` compare period into its parts. Falls back to
 * the provided fallback parts (or empty strings) when the value is invalid.
 */
export function splitComparePeriod(period, fallback = {}) {
  const trimmed = String(period || "").trim()
  const spaceIndex = trimmed.lastIndexOf(" ")
  if (spaceIndex <= 0) return { month: fallback.month || "", year: fallback.year || "" }
  const month = trimmed.slice(0, spaceIndex)
  const year = trimmed.slice(spaceIndex + 1)
  if (!AVAILABLE_MONTHS.includes(month) || !YEAR_PATTERN.test(year)) {
    return { month: fallback.month || "", year: fallback.year || "" }
  }
  return { month, year }
}

/** Keys whose change is a destination change (Back should revisit it). */
const DESTINATION_KEYS = ["tab", "planSection", "statsSection"]

/**
 * Compare two normalized view states. Returns "push" when a destination
 * changed, "replace" when only filters changed, and "none" when the states
 * serialize identically.
 */
export function diffDashboardUrlState(prev, next, now = new Date()) {
  const prevQuery = serializeDashboardUrl(prev, now)
  const nextQuery = serializeDashboardUrl(next, now)
  if (prevQuery === nextQuery) return "none"
  const destinationChanged = DESTINATION_KEYS.some((key) => prev[key] !== next[key])
  return destinationChanged ? "push" : "replace"
}
