import "server-only"

export const USAGE_FEATURES = {
  transactions: "transactions",
  budgets: "budgets",
  goals: "goals",
  debts: "debts",
  momental: "momental",
  bills: "bills",
  insights: "insights",
}

export const QUOTA_TIME_ZONE = "Asia/Jakarta"

function jakartaParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: QUOTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)

  return Object.fromEntries(parts.map(part => [part.type, part.value]))
}

export function getCurrentMonthPeriod(now = new Date()) {
  const parts = jakartaParts(now)
  return `${parts.year}-${parts.month}`
}

export function getNextMonthlyResetAt(now = new Date()) {
  const parts = jakartaParts(now)
  const year = Number(parts.year)
  const month = Number(parts.month)
  const next = new Date(Date.UTC(year, month, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01T00:00:00+07:00`
}

export function getCurrentWeekPeriod(now = new Date()) {
  const parts = jakartaParts(now)
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

export function getNextWeeklyResetAt(now = new Date()) {
  const parts = jakartaParts(now)
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + (8 - day))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}T00:00:00+07:00`
}

export function getCurrentPeriod(feature, now = new Date()) {
  return feature === USAGE_FEATURES.insights
    ? getCurrentWeekPeriod(now)
    : getCurrentMonthPeriod(now)
}

async function getSupabaseAdmin() {
  return (await import("./supabaseAdmin")).supabaseAdmin
}

export async function getUsage(userId, feature, period = getCurrentPeriod(feature)) {
  const supabaseAdmin = await getSupabaseAdmin()
  const { data, error } = await supabaseAdmin.rpc("get_usage_count", {
    p_user_id: userId,
    p_feature: feature,
    p_period: period,
  })
  if (error) throw new Error(`Failed to get usage: ${error.message}`)
  return data || 0
}

export async function incrementUsage(userId, feature, period = getCurrentPeriod(feature)) {
  const supabaseAdmin = await getSupabaseAdmin()
  const { data, error } = await supabaseAdmin.rpc("increment_usage", {
    p_user_id: userId,
    p_feature: feature,
    p_period: period,
  })
  if (error) throw new Error(`Failed to track usage: ${error.message}`)
  return data || 0
}

export async function checkLimit(userId, feature, limit, period = getCurrentPeriod(feature)) {
  const supabaseAdmin = await getSupabaseAdmin()
  const { data, error } = await supabaseAdmin.rpc("check_usage_limit", {
    p_user_id: userId,
    p_feature: feature,
    p_period: period,
    p_limit: limit,
  })
  if (error) throw new Error(`Failed to check usage limit: ${error.message}`)
  return Boolean(data)
}

export async function reserveUsage(userId, feature, limit, period = getCurrentPeriod(feature)) {
  const supabaseAdmin = await getSupabaseAdmin()
  const { data, error } = await supabaseAdmin.rpc("reserve_usage", {
    p_user_id: userId,
    p_feature: feature,
    p_period: period,
    p_limit: limit,
  })
  if (error) throw new Error(`Failed to reserve usage: ${error.message}`)
  return data || 0
}

export async function releaseUsage(userId, feature, period = getCurrentPeriod(feature)) {
  const supabaseAdmin = await getSupabaseAdmin()
  const { data, error } = await supabaseAdmin.rpc("release_usage", {
    p_user_id: userId,
    p_feature: feature,
    p_period: period,
  })
  if (error) throw new Error(`Failed to release usage: ${error.message}`)
  return data || 0
}
