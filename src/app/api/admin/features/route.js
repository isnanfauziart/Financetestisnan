import { requireAdmin } from "@/lib/adminAuth"
import {
  FEATURE_REGISTRY,
  clearUserFeatureOverride,
  setGlobalFeatureFlag,
  setUserFeatureOverride,
} from "@/lib/featureFlags"
import { logError, requestHeaders } from "@/lib/logger"
import {
  booleanValue,
  boundedString,
  oneOf,
  objectValue,
  readJsonBody,
  RequestValidationError,
} from "@/lib/validation"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const MAX_TARGETS = 100
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/

function response(body, status, request) {
  return Response.json(body, { status, headers: requestHeaders(request) })
}

function adminStatus(error) {
  return error === "forbidden" ? 403 : 401
}

function requireFeatureKey(value) {
  const key = boundedString(value, { required: true, max: 64 })
  const definition = FEATURE_REGISTRY[key]
  if (!definition || definition.protected) throw new RequestValidationError("INVALID_FEATURE")
  return key
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function readSchedule(body, now) {
  const hasAt = hasOwn(body, "scheduledAt")
  const hasEnabled = hasOwn(body, "scheduledEnabled")
  if (!hasAt && !hasEnabled) return { scheduledAt: null, scheduledEnabled: null }
  if (!hasAt || !hasEnabled) throw new RequestValidationError("INVALID_SCHEDULE")

  const rawAt = boundedString(body.scheduledAt, { required: true, max: 40 })
  if (!rawAt.endsWith("Z")) throw new RequestValidationError("INVALID_SCHEDULE")
  const date = new Date(rawAt)
  if (!Number.isFinite(date.getTime()) || date.getTime() <= now.getTime()) {
    throw new RequestValidationError("INVALID_SCHEDULE")
  }

  return { scheduledAt: date.toISOString(), scheduledEnabled: booleanValue(body.scheduledEnabled) }
}

function readIds(value, field) {
  if (!Array.isArray(value) || value.length > MAX_TARGETS) throw new RequestValidationError(`INVALID_${field}`)
  const ids = value.map(id => {
    if (typeof id !== "string" || !SAFE_ID.test(id)) throw new RequestValidationError(`INVALID_${field}`)
    return id
  })
  return [...new Set(ids)]
}

function writeError(error, request) {
  if (error instanceof RequestValidationError) {
    return response({ error: error.code, message: "Permintaan tidak valid." }, error.status, request)
  }
  logError("AdminFeatures", error, request)
  return response({ error: "INTERNAL_ERROR", message: "Gagal mengubah kontrol fitur." }, 500, request)
}

export async function GET(request) {
  try {
    const admin = await requireAdmin(request)
    if (admin.error) return response({ error: admin.error }, adminStatus(admin.error), request)

    const [{ data, error }, { data: overrideRows, error: overrideError }] = await Promise.all([
      supabaseAdmin
        .from("feature_flags")
        .select("key,enabled,description,updated_at,updated_by,scheduled_enabled,scheduled_at"),
      supabaseAdmin
        .from("feature_flag_overrides")
        .select("feature_key"),
    ])
    if (error) throw error
    if (overrideError) throw overrideError
    const overrideCounts = (overrideRows || []).reduce((counts, row) => {
      counts[row.feature_key] = (counts[row.feature_key] || 0) + 1
      return counts
    }, {})

    const rows = Object.entries(FEATURE_REGISTRY).map(([key, definition]) => {
      const row = (data || []).find(item => item.key === definition.flagKey)
      const scheduledAt = row?.scheduled_at ? new Date(row.scheduled_at) : null
      const pending = scheduledAt && Number.isFinite(scheduledAt.getTime()) && scheduledAt.getTime() > Date.now()
      return {
        key,
        flagKey: definition.flagKey || null,
        description: row?.description || definition.flagKey || key,
        enabled: definition.protected ? true : Boolean(row?.enabled ?? definition.safeOnFailure),
        protected: Boolean(definition.protected),
        paidOnly: Boolean(definition.paidOnly),
        updatedAt: row?.updated_at || null,
        updatedBy: row?.updated_by || null,
        overrideCount: overrideCounts[key] || 0,
        scheduledAt: pending ? scheduledAt.toISOString() : null,
        scheduledEnabled: pending && typeof row.scheduled_enabled === "boolean" ? row.scheduled_enabled : null,
      }
    })

    return response({ features: rows }, 200, request)
  } catch (error) {
    return writeError(error, request)
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request)
    if (admin.error) return response({ error: admin.error }, adminStatus(admin.error), request)

    const body = objectValue(await readJsonBody(request))
    const key = requireFeatureKey(body.feature ?? body.key)
    const scope = oneOf(body.scope, ["global", "users"])
    const schedule = readSchedule(body, new Date())

    if (scope === "global") {
      const enabled = booleanValue(body.enabled)
      await setGlobalFeatureFlag(key, enabled, { ...schedule, updatedBy: admin.email })
      return response({ ok: true, feature: key, scope, enabled, ...schedule }, 200, request)
    }

    if (!hasOwn(body, "enabled") || (body.enabled !== null && typeof body.enabled !== "boolean")) {
      throw new RequestValidationError("INVALID_BOOLEAN")
    }
    if (body.enabled === null && (schedule.scheduledAt || schedule.scheduledEnabled !== null)) {
      throw new RequestValidationError("INVALID_SCHEDULE")
    }

    const userIds = readIds(body.userIds, "USER_IDS")
    const clearIds = body.clearUserIds === undefined ? [] : readIds(body.clearUserIds, "CLEAR_USER_IDS")
    const clearSet = new Set(clearIds)
    const selectedIds = userIds.filter(id => !clearSet.has(id))

    await Promise.all(clearIds.map(userId => clearUserFeatureOverride(userId, key)))
    if (body.enabled === null) {
      await Promise.all(userIds.filter(id => !clearSet.has(id)).map(userId => clearUserFeatureOverride(userId, key)))
    } else {
      await Promise.all(selectedIds.map(userId => setUserFeatureOverride(userId, key, body.enabled, {
        ...schedule,
        updatedBy: admin.email,
      })))
    }

    return response({
      ok: true,
      feature: key,
      scope,
      enabled: body.enabled,
      userIds: selectedIds,
      clearUserIds: clearIds,
      ...schedule,
    }, 200, request)
  } catch (error) {
    return writeError(error, request)
  }
}
