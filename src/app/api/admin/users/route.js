import { requireAdmin } from "@/lib/adminAuth"
import { logError, requestHeaders } from "@/lib/logger"
import { boundedString, oneOf, RequestValidationError } from "@/lib/validation"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const MAX_RESULTS = 100
const DAY_MS = 24 * 60 * 60 * 1000

function response(body, status, request) {
  return Response.json(body, { status, headers: requestHeaders(request) })
}
function adminStatus(error) {
  return error === "forbidden" ? 403 : 401
}

function firstParam(params, names) {
  for (const name of names) {
    if (params.has(name)) return params.get(name)
  }
  return null
}

function filterDate(value, code) {
  const raw = boundedString(value, { required: true, max: 40 })
  const date = new Date(raw)
  if (!Number.isFinite(date.getTime())) throw new RequestValidationError(code)
  return date.toISOString()
}

function ageDays(value, code) {
  const raw = boundedString(value, { required: true, max: 5 })
  if (!/^\d{1,5}$/.test(raw)) throw new RequestValidationError(code)
  const days = Number(raw)
  if (!Number.isSafeInteger(days) || days > 36500) throw new RequestValidationError(code)
  return days
}

function escapeFilter(value) {
  return value.replace(/[\\%_,()]/g, "\\$&")
}

function writeError(error, request) {
  if (error instanceof RequestValidationError) {
    return response({ error: error.code, message: "Permintaan tidak valid." }, error.status, request)
  }
  logError("AdminUsers", error, request)
  return response({ error: "INTERNAL_ERROR", message: "Gagal mencari pengguna." }, 500, request)
}

export async function GET(request) {
  try {
    const admin = await requireAdmin(request)
    if (admin.error) return response({ error: admin.error }, adminStatus(admin.error), request)

    const params = new URL(request.url).searchParams
    const search = boundedString(params.get("search"), { max: 100 })
    const tier = params.get("tier")
    if (tier) oneOf(tier, ["free", "paid"])

    const createdAfterRaw = firstParam(params, ["createdAfter", "createdAtFrom", "created_at_from"])
    const createdBeforeRaw = firstParam(params, ["createdBefore", "createdAtTo", "created_at_to"])
    const createdAfter = createdAfterRaw ? filterDate(createdAfterRaw, "INVALID_CREATED_AFTER") : null
    const createdBefore = createdBeforeRaw ? filterDate(createdBeforeRaw, "INVALID_CREATED_BEFORE") : null
    if (createdAfter && createdBefore && new Date(createdAfter) > new Date(createdBefore)) {
      throw new RequestValidationError("INVALID_CREATED_RANGE")
    }

    const minAgeRaw = firstParam(params, ["minAgeDays", "ageMinDays"])
    const maxAgeRaw = firstParam(params, ["maxAgeDays", "ageMaxDays"])
    const minAge = minAgeRaw === null ? null : ageDays(minAgeRaw, "INVALID_MIN_AGE")
    const maxAge = maxAgeRaw === null ? null : ageDays(maxAgeRaw, "INVALID_MAX_AGE")
    if (minAge !== null && maxAge !== null && minAge > maxAge) {
      throw new RequestValidationError("INVALID_AGE_RANGE")
    }

    let query = supabaseAdmin
      .from("users")
      .select("id,email,name,tier,created_at")
    if (search) query = query.or(`email.ilike.%${escapeFilter(search)}%,name.ilike.%${escapeFilter(search)}%`)
    if (tier) query = query.eq("tier", tier)
    if (createdAfter) query = query.gte("created_at", createdAfter)
    if (createdBefore) query = query.lte("created_at", createdBefore)

    const now = Date.now()
    if (minAge !== null) query = query.lte("created_at", new Date(now - minAge * DAY_MS).toISOString())
    if (maxAge !== null) query = query.gte("created_at", new Date(now - maxAge * DAY_MS).toISOString())

    const { data, error } = await query.order("created_at", { ascending: false }).limit(MAX_RESULTS)
    if (error) throw error

    const users = (data || []).map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      created_at: user.created_at,
    }))
    return response({ users }, 200, request)
  } catch (error) {
    return writeError(error, request)
  }
}
