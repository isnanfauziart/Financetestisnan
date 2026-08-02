import "server-only"
import { supabaseAdmin } from "./supabaseAdmin"

export const ACTIVITY_WRITE_INTERVAL_MS = 5 * 60 * 1000

function timestamp(value) {
  if (value === null || value === undefined || value === "") return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date.getTime() : null
}

export function shouldRecordActivity(lastSeenAt, now = new Date(), minimumIntervalMs = ACTIVITY_WRITE_INTERVAL_MS) {
  const current = timestamp(now)
  if (current === null) return false
  if (lastSeenAt === null || lastSeenAt === undefined || lastSeenAt === "") return true

  const previous = timestamp(lastSeenAt)
  if (previous === null) return true
  return current - previous >= minimumIntervalMs
}

export async function recordAuthenticatedActivity(userId, lastSeenAt, now = new Date()) {
  if (!userId || !shouldRecordActivity(lastSeenAt, now)) return null

  const recordedAt = (now instanceof Date ? now : new Date(now)).toISOString()
  let query = supabaseAdmin
    .from("users")
    .update({ last_seen_at: recordedAt })
    .eq("id", userId)

  const previous = timestamp(lastSeenAt)
  query = previous === null
    ? query.is("last_seen_at", null)
    : query.eq("last_seen_at", new Date(previous).toISOString())

  const { data, error } = await query
    .select("last_seen_at")
    .maybeSingle()

  if (error) throw error
  return data?.last_seen_at || null
}
