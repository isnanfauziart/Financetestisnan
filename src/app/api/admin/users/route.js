import { requireAdmin } from "@/lib/adminAuth"
import { logError, requestHeaders } from "@/lib/logger"
import {
  activityCutoff,
  adminEmailSet,
  directoryUser,
  USER_ACTIVITY_FILTERS,
  USER_PAGE_SIZES,
  USER_SHEET_FILTERS,
  USER_SORTS,
} from "@/lib/adminUsers"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { boundedString, oneOf, RequestValidationError } from "@/lib/validation"

export const dynamic = "force-dynamic"

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_PAGE = 100000

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

function pageValue(value) {
  const raw = value || "1"
  if (!/^\d{1,6}$/.test(raw)) throw new RequestValidationError("INVALID_PAGE")
  const page = Number(raw)
  if (!Number.isSafeInteger(page) || page < 1 || page > MAX_PAGE) throw new RequestValidationError("INVALID_PAGE")
  return page
}

function pageSizeValue(value) {
  const raw = value || String(USER_PAGE_SIZES[0])
  if (!USER_PAGE_SIZES.map(String).includes(raw)) throw new RequestValidationError("INVALID_PAGE_SIZE")
  return Number(raw)
}

function escapeFilter(value) {
  return value.replace(/[\\%_,()]/g, "\\$&")
}

function readOptions(params) {
  const search = boundedString(params.get("search"), { max: 100 })
  const tier = params.get("tier") || ""
  if (tier) oneOf(tier, ["free", "paid"])

  const activity = params.get("activity") || ""
  if (activity) oneOf(activity, USER_ACTIVITY_FILTERS)

  const sheet = params.get("sheet") || ""
  if (sheet) oneOf(sheet, USER_SHEET_FILTERS)

  const sort = params.get("sort") || "created_desc"
  if (!USER_SORTS[sort]) throw new RequestValidationError("INVALID_SORT")

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

  return {
    search,
    tier,
    activity,
    sheet,
    sort,
    createdAfter,
    createdBefore,
    minAge,
    maxAge,
  }
}

function applyFilters(query, options, now) {
  if (options.search) query = query.or(`email.ilike.%${escapeFilter(options.search)}%,name.ilike.%${escapeFilter(options.search)}%`)
  if (options.tier) query = query.eq("tier", options.tier)
  if (options.createdAfter) query = query.gte("created_at", options.createdAfter)
  if (options.createdBefore) query = query.lte("created_at", options.createdBefore)

  if (options.minAge !== null) query = query.lte("created_at", new Date(now - options.minAge * DAY_MS).toISOString())
  if (options.maxAge !== null) query = query.gte("created_at", new Date(now - options.maxAge * DAY_MS).toISOString())

  if (options.activity === "never") query = query.is("last_seen_at", null)
  if (["24h", "7d", "30d"].includes(options.activity)) query = query.gte("last_seen_at", activityCutoff(options.activity, new Date(now)))

  if (options.sheet === "connected") query = query.not("spreadsheet_id", "is", null)
  if (options.sheet === "not_connected") query = query.is("spreadsheet_id", null)

  return query
}

async function countUsers({ tier = "", activity = "", sheet = "" } = {}, now) {
  let query = supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)

  if (tier) query = query.eq("tier", tier)
  if (activity) {
    if (activity === "never") query = query.is("last_seen_at", null)
    else query = query.gte("last_seen_at", activityCutoff(activity, new Date(now)))
  }
  if (sheet === "connected") query = query.not("spreadsheet_id", "is", null)
  if (sheet === "not_connected") query = query.is("spreadsheet_id", null)

  const { count, error } = await query
  if (error) throw error
  return count || 0
}

async function getSummary(now) {
  const [total, free, paid, active7d, sheetConnected] = await Promise.all([
    countUsers({}, now),
    countUsers({ tier: "free" }, now),
    countUsers({ tier: "paid" }, now),
    countUsers({ activity: "7d" }, now),
    countUsers({ sheet: "connected" }, now),
  ])
  return { total, free, paid, active7d, sheetConnected }
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
    const page = pageValue(params.get("page"))
    const pageSize = pageSizeValue(params.get("pageSize"))
    const options = readOptions(params)
    const now = Date.now()

    let usersQuery = supabaseAdmin
      .from("users")
      .select("id,email,name,avatar_url,tier,created_at,last_seen_at,spreadsheet_id,deleted_at", { count: "exact" })
      .is("deleted_at", null)
    usersQuery = applyFilters(usersQuery, options, now)
    const sort = USER_SORTS[options.sort]
    usersQuery = usersQuery
      .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    const [{ data, count, error }, { data: adminRows, error: adminError }, summary] = await Promise.all([
      usersQuery,
      supabaseAdmin.from("admins").select("email"),
      getSummary(now),
    ])
    if (error) throw error
    if (adminError) throw adminError

    const adminEmails = adminEmailSet(adminRows || [])
    const users = (data || []).map(user => directoryUser(user, adminEmails))
    return response({ users, total: count || 0, page, pageSize, summary }, 200, request)
  } catch (error) {
    return writeError(error, request)
  }
}
