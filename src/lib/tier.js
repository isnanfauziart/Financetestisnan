export const CANONICAL_FEATURES = [
  "transactions",
  "budgets",
  "goals",
  "debts",
  "momental",
  "bills",
  "insights",
]

export const FREE_LIMITS = {
  transactions: 75,
  budgets: 3,
  goals: 1,
  debts: 3,
  momental: 1,
  bills: 3,
  insights: 3,
}

export const SMART_FEATURES = [
  "healthScore",
  "cashFlowForecast",
  "anomalyAlerts",
  "financialIndependence",
  "whatIf",
  "yearInReview",
  "recurringExpenseRadar",
]

const FEATURE_ALIASES = {
  maxTransactionsPerMonth: "transactions",
  maxBudgets: "budgets",
  maxGoals: "goals",
  maxDebts: "debts",
  maxMomentalEvents: "momental",
  maxBills: "bills",
  maxInsightsPerWeek: "insights",
}

function wibDateParts(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return { year: Number(values.year), month: Number(values.month) }
}

function addMonths(year, month, delta) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}

function monthStart({ year, month }) {
  return `${year}-${String(month).padStart(2, "0")}-01`
}

function monthEnd({ year, month }) {
  return `${year}-${String(month).padStart(2, "0")}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`
}

function limitsFor(tier) {
  if (normalizeTier(tier) === "paid") {
    return Object.fromEntries(CANONICAL_FEATURES.map(feature => [feature, null]))
  }
  return { ...FREE_LIMITS }
}

export function normalizeTier(tier) {
  return tier === "paid" ? "paid" : "free"
}

export function isPaid(tier) {
  return normalizeTier(tier) === "paid"
}

export function isUnlimited(limit) {
  return limit === null || limit === -1
}

export function getFeatureLimit(tier, feature) {
  return limitsFor(tier)[feature] ?? null
}

export function getFeatureWarnings(feature) {
  const limit = FREE_LIMITS[feature]
  return {
    warningAt: Math.ceil(limit * 0.8),
    limitAt: limit,
  }
}

export function getSmartFeatureFlags(tier) {
  const enabled = isPaid(tier)
  return Object.fromEntries(SMART_FEATURES.map(feature => [feature, enabled]))
}

export function getHistoryWindow(tier, now = new Date()) {
  if (isPaid(tier)) {
    return { months: null, from: null, to: null }
  }
  const current = wibDateParts(now)
  return {
    months: 4,
    from: monthStart(addMonths(current.year, current.month, -3)),
    to: monthEnd(current),
  }
}

export function getTierLimits(tier) {
  const normalized = normalizeTier(tier)
  const usage = limitsFor(normalized)
  const history = getHistoryWindow(normalized)
  return {
    tier: normalized,
    usage,
    historyMonths: history.months,
    smartFeatures: isPaid(normalized),
    monthlyPdfWatermark: !isPaid(normalized),
    pdfWatermark: !isPaid(normalized),
    maxHistoryMonths: history.months,
    ...Object.fromEntries(
      Object.entries(FEATURE_ALIASES).map(([legacyName, feature]) => [legacyName, usage[feature]])
    ),
  }
}
