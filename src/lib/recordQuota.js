import { FREE_LIMITS } from "./tier"
import { getSheetData } from "./sheets"
import { getNextMonthlyResetAt } from "./usage"
import { randomUUID } from "node:crypto"

export const RECORD_RANGES = {
  budgets: "Budgets!A:F",
  goals: "Goals!A:A",
  debts: "Utang!A:A",
  momental: "Momental!A:A",
  bills: "Tagihan!A:A",
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
const FEATURE_LABELS = {
  budgets: "budget",
  goals: "goal",
  debts: "utang dan piutang",
  momental: "event budget",
  bills: "tagihan",
}

export function currentWibBudgetPeriod(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now).map(part => [part.type, part.value]))
  return { month: MONTHS[Number(parts.month) - 1], year: parts.year }
}

export function countRecordRows(feature, rows, options = {}) {
  return (rows || []).slice(1).filter(row => {
    if (!String(row?.[0] || "").trim()) return false
    if (feature !== "budgets") return true
    return String(row?.[1] || "").trim() === String(options.month || "").trim()
      && String(row?.[2] || "").trim() === String(options.year || "").trim()
  }).length
}

export function recordQuotaResponse(feature, current, limit = FREE_LIMITS[feature]) {
  if (current === null) {
    return Response.json({
      error: "Kuota belum bisa diverifikasi. Coba lagi sebentar.",
      code: "FEATURE_LIMIT_UNVERIFIABLE",
      feature,
      retryable: true,
    }, { status: 503, headers: { "Retry-After": "30" } })
  }
  return Response.json({
    error: `Batas ${FEATURE_LABELS[feature] || feature} paket Free sudah tercapai.`,
    code: "FEATURE_LIMIT_REACHED",
    feature,
    upgrade: true,
    current,
    limit,
    resetAt: feature === "budgets" ? getNextMonthlyResetAt() : null,
  }, { status: 403 })
}

async function admin() {
  return (await import("./supabaseAdmin")).supabaseAdmin
}

export async function claimRecordCreation(userId, feature) {
  const token = randomUUID()
  const { data, error } = await (await admin()).rpc("claim_feature_creation", {
    p_user_id: userId,
    p_feature: feature,
    p_lock_token: token,
  })
  if (error) throw error
  return data ? token : null
}

export async function releaseRecordCreation(userId, feature, token) {
  const { error } = await (await admin()).rpc("release_feature_creation", {
    p_user_id: userId,
    p_feature: feature,
    p_lock_token: token,
  })
  if (error) throw error
}

export async function runRecordCreation(auth, feature, options, create) {
  if (!auth?.entitlementVerified) return recordQuotaResponse(feature, null)
  if (auth.tier === "paid" || auth.isAdmin) return create(null)
  let lockToken
  try {
    lockToken = await claimRecordCreation(auth.user.id, feature)
    if (!lockToken) {
      return Response.json({
        error: "Pembuatan sedang diproses. Coba lagi sebentar.",
        code: "FEATURE_CREATION_BUSY",
        feature,
        retryable: true,
      }, { status: 409, headers: { "Retry-After": "2" } })
    }
  } catch (error) {
    console.error(`[Quota:${feature}] Lock unavailable:`, error)
    return recordQuotaResponse(feature, null)
  }
  try {
    let rows
    try {
      rows = await getSheetData(auth.accessToken, RECORD_RANGES[feature], auth.spreadsheetId)
    } catch (error) {
      console.error(`[Quota:${feature}] Sheet count unavailable:`, error)
      return recordQuotaResponse(feature, null)
    }
    const current = countRecordRows(feature, rows, options)
    if (current >= FREE_LIMITS[feature]) return recordQuotaResponse(feature, current)
    return await create(rows)
  } finally {
    if (lockToken) {
      try {
        await releaseRecordCreation(auth.user.id, feature, lockToken)
      } catch (error) {
        console.error(`[Quota:${feature}] Failed to release creation lock:`, error)
      }
    }
  }
}
