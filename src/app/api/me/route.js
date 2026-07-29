import { getAuthContext } from "@/lib/apiAuth"
import {
  CANONICAL_FEATURES,
  getFeatureWarnings,
  getHistoryWindow,
  getSmartFeatureFlags,
  getTierLimits,
} from "@/lib/tier"
import {
  getCurrentMonthPeriod,
  getCurrentWeekPeriod,
  getNextMonthlyResetAt,
  getNextWeeklyResetAt,
  getUsage,
} from "@/lib/usage"
import { batchGetSheetData } from "@/lib/sheets"
import { countRecordRows, currentWibBudgetPeriod, RECORD_RANGES } from "@/lib/recordQuota"

export const dynamic = "force-dynamic"

function jsonError(error, message, status) {
  return Response.json({ error, message }, { status })
}

function retryableLimitError() {
  return Response.json({
    error: "FEATURE_LIMIT_UNVERIFIABLE",
    message: "Kuota transaksi belum bisa diverifikasi. Coba lagi sebentar.",
    retryable: true,
  }, {
    status: 503,
    headers: { "Retry-After": "30" },
  })
}

function usageEntry(feature, limit, current, extra) {
  const warnings = limit === null ? { warningAt: null, limitAt: null } : getFeatureWarnings(feature)
  return {
    feature,
    current,
    limit,
    warning: limit === null || current === null
      ? null
      : current >= limit
        ? "reached"
        : current >= warnings.warningAt
          ? "near"
          : null,
    ...warnings,
    ...extra,
  }
}

export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return jsonError("UNAUTHORIZED", "Silakan masuk terlebih dahulu.", 401)
  }

  const tier = auth.tier || "free"
  const limits = getTierLimits(tier)
  const period = getCurrentMonthPeriod()
  let transactionCount
  let usageVerified = true
  const recordCounts = {}

  try {
    transactionCount = await getUsage(auth.user.id, "transactions", period)
  } catch (error) {
    console.error("[Me:GET] Transaction usage unavailable:", error)
    if (auth.entitlementVerified && (tier === "paid" || auth.isAdmin)) {
      transactionCount = null
      usageVerified = false
    } else {
      return retryableLimitError()
    }
  }

  try {
    const features = Object.keys(RECORD_RANGES)
    const valueRanges = await batchGetSheetData(
      auth.accessToken,
      features.map(feature => RECORD_RANGES[feature]),
      auth.spreadsheetId
    )
    const budgetPeriod = currentWibBudgetPeriod()
    features.forEach((feature, index) => {
      recordCounts[feature] = countRecordRows(feature, valueRanges[index]?.values || [], budgetPeriod)
    })
  } catch (error) {
    console.error("[Me:GET] Sheet usage unavailable:", error)
    usageVerified = false
    Object.keys(RECORD_RANGES).forEach(feature => { recordCounts[feature] = null })
  }

  const usage = Object.fromEntries(CANONICAL_FEATURES.map(feature => {
    if (feature === "transactions") {
      return [feature, usageEntry(feature, limits.usage[feature], transactionCount, {
        metered: true,
        source: "usage",
        period,
        resetAt: getNextMonthlyResetAt(),
      })]
    }
    if (feature === "insights") {
      return [feature, usageEntry(feature, limits.usage[feature], null, {
        metered: false,
        source: "stable-weekly",
        period: getCurrentWeekPeriod(),
        resetAt: getNextWeeklyResetAt(),
      })]
    }
    const isBudget = feature === "budgets"
    return [feature, usageEntry(feature, limits.usage[feature], recordCounts[feature], {
      metered: false,
      source: "sheets",
      period: isBudget ? period : null,
      resetAt: isBudget ? getNextMonthlyResetAt() : null,
    })]
  }))

  return Response.json({
    tier,
    isAdmin: Boolean(auth.isAdmin),
    entitlementVerified: Boolean(auth.entitlementVerified),
    usageVerified,
    upgrade: "/upgrade",
    usage,
    features: getSmartFeatureFlags(tier),
    monthlyPdfWatermark: limits.monthlyPdfWatermark,
    history: getHistoryWindow(tier),
  })
}
