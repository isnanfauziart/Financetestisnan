import "server-only"
import { supabaseAdmin } from "./supabaseAdmin"

export const FEATURE_REGISTRY = Object.freeze({
  transactions: { flagKey: "transactions_enabled", protected: false, paidOnly: false, safeOnFailure: true },
  budgets: { flagKey: "budgets_enabled", protected: false, paidOnly: false, safeOnFailure: true },
  goals: { flagKey: "goals_enabled", protected: false, paidOnly: false, safeOnFailure: true },
  debts: { flagKey: "debts_enabled", protected: false, paidOnly: false, safeOnFailure: true },
  momental: { flagKey: "momental_enabled", protected: false, paidOnly: false, safeOnFailure: true },
  bills: { flagKey: "bills_enabled", protected: false, paidOnly: false, safeOnFailure: true },
  insights: { flagKey: "smart_insights", protected: false, paidOnly: false, safeOnFailure: false },
  healthScore: { flagKey: "health_score", protected: false, paidOnly: true, safeOnFailure: false },
  cashFlowForecast: { flagKey: "forecast", protected: false, paidOnly: true, safeOnFailure: false },
  anomalyAlerts: { flagKey: "anomaly_alerts", protected: false, paidOnly: true, safeOnFailure: false },
  financialIndependence: { flagKey: "financial_independence", protected: false, paidOnly: true, safeOnFailure: false },
  whatIf: { flagKey: "what_if", protected: false, paidOnly: true, safeOnFailure: false },
  yearInReview: { flagKey: "year_in_review", protected: false, paidOnly: true, safeOnFailure: false },
  pdfReports: { flagKey: "pdf_reports", protected: false, paidOnly: false, safeOnFailure: false },
  paymentQris: { flagKey: "payment_qris", protected: false, paidOnly: false, safeOnFailure: false },
  authentication: { protected: true },
  dataIntegrity: { protected: true },
})

const CACHE_TTL_MS = 60_000
const cache = new Map()

export function invalidateFeatureFlagCache(userId) {
  if (!userId) return cache.clear()
  for (const key of cache.keys()) {
    if (key === userId || key.startsWith(`${userId}:`)) cache.delete(key)
  }
}

function failClosed() {
  const access = Object.fromEntries(Object.entries(FEATURE_REGISTRY).map(([key, definition]) => [
    key,
    Boolean(definition.protected || definition.safeOnFailure),
  ]))
  return withAvailability(access, { ...access })
}

function withAvailability(access, availability) {
  Object.defineProperty(access, "availability", {
    value: Object.freeze({ ...availability }),
    enumerable: false,
    configurable: false,
  })
  return access
}

function scheduledValue(row, now) {
  if (row.scheduled_at && row.scheduled_enabled !== null && new Date(row.scheduled_at) <= now) {
    return { enabled: row.scheduled_enabled, scheduled_enabled: null, scheduled_at: null, due: true }
  }
  return { enabled: row.enabled, due: false }
}

async function readRows(client, table, userId) {
  let query = client.from(table).select("*")
  if (userId) query = query.eq("user_id", userId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function applyDue(client, table, row, key, now) {
  const current = scheduledValue(row, now)
  if (!current.due) return current.enabled
  const query = client.from(table).update({
    enabled: current.enabled,
    scheduled_enabled: null,
    scheduled_at: null,
    updated_at: now.toISOString(),
  })
  const result = await query.eq(key, row[key])
  if (result?.error) throw result.error
  return current.enabled
}

export async function resolveFeatureAccess(user, { client = supabaseAdmin, now = new Date(), entitlement } = {}) {
  const userId = user?.id
  if (!userId) return failClosed()
  const effective = entitlement || { tier: user.tier === "paid" || user.isAdmin ? "paid" : "free" }
  const cacheKey = `${userId}:${effective.tier}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now() && (!cached.nextAt || cached.nextAt > now.getTime())) return withAvailability({ ...cached.access }, cached.availability)

  try {
    const [globalRows, overrides] = await Promise.all([
      readRows(client, "feature_flags"),
      readRows(client, "feature_flag_overrides", userId),
    ])
    const global = Object.fromEntries(globalRows.map(row => [row.key, row]))
    const override = Object.fromEntries(overrides.map(row => [row.feature_key, row]))
    const access = {}
    const availability = {}
    for (const [key, definition] of Object.entries(FEATURE_REGISTRY)) {
      if (definition.protected) {
        availability[key] = true
        access[key] = true
        continue
      }
      const row = override[key]
      const globalRow = global[definition.flagKey]
      const selected = row || globalRow
      if (!selected) {
        availability[key] = false
        access[key] = false
        continue
      }
      const enabled = await applyDue(client, row ? "feature_flag_overrides" : "feature_flags", selected, row ? "id" : "key", now)
      availability[key] = Boolean(enabled)
      access[key] = availability[key] && (!definition.paidOnly || effective.tier === "paid")
    }
    const nextAt = [...globalRows, ...overrides]
      .map(row => row.scheduled_at ? new Date(row.scheduled_at).getTime() : null)
      .filter(value => Number.isFinite(value) && value > now.getTime())
      .sort((a, b) => a - b)[0]
    cache.set(cacheKey, { access, availability, expiresAt: Date.now() + CACHE_TTL_MS, nextAt })
    return withAvailability({ ...access }, availability)
  } catch (error) {
    console.error("[FeatureFlags] Read failed:", error.message)
    return failClosed()
  }
}

export function toClientFeatureAccess(access) {
  return Object.fromEntries(Object.keys(FEATURE_REGISTRY).filter(key => key in access).map(key => [key, Boolean(access[key])]))
}

export function toClientFeatureAvailability(access) {
  const availability = access?.availability || access
  return Object.fromEntries(Object.keys(FEATURE_REGISTRY).filter(key => key in availability).map(key => [key, Boolean(availability[key])]))
}

async function writeFlag(table, matchKey, matchValue, values, client) {
  const result = await client.from(table).upsert({
    [matchKey]: matchValue,
    ...values,
    updated_at: new Date().toISOString(),
  }, { onConflict: matchKey })
  if (result?.error) throw result.error
  invalidateFeatureFlagCache()
}

export async function setGlobalFeatureFlag(key, enabled, { scheduledEnabled = null, scheduledAt = null, updatedBy, client = supabaseAdmin } = {}) {
  const definition = FEATURE_REGISTRY[key]
  if (!definition || definition.protected) throw new Error("invalid_feature_flag")
  await writeFlag("feature_flags", "key", definition.flagKey, {
    enabled: Boolean(enabled),
    scheduled_enabled: scheduledEnabled,
    scheduled_at: scheduledAt,
    updated_by: updatedBy,
  }, client)
}

export async function setUserFeatureOverride(userId, key, enabled, { scheduledEnabled = null, scheduledAt = null, updatedBy, client = supabaseAdmin } = {}) {
  const definition = FEATURE_REGISTRY[key]
  if (!definition || definition.protected) throw new Error("invalid_feature_flag")
  const result = await client.from("feature_flag_overrides").upsert({
    user_id: userId,
    feature_key: key,
    enabled,
    scheduled_enabled: scheduledEnabled,
    scheduled_at: scheduledAt,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,feature_key" })
  if (result?.error) throw result.error
  invalidateFeatureFlagCache()
}

export async function clearUserFeatureOverride(userId, key, { client = supabaseAdmin } = {}) {
  const query = client.from("feature_flag_overrides").delete().eq("user_id", userId).eq("feature_key", key)
  const result = await query
  if (result?.error) throw result.error
  invalidateFeatureFlagCache()
}
