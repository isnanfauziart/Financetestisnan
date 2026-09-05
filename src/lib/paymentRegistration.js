import "server-only"
import { supabaseAdmin } from "./supabaseAdmin"

export const PRO_REGISTRATION_CLOSED_MESSAGE = "Pendaftaran Pro sedang ditutup sementara. Silakan coba lagi nanti."

export class PaymentRegistrationError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

function rpcErrorCode(error) {
  const message = String(error?.message || "")
  if (message.includes("pro_registration_closed")) return "PRO_REGISTRATION_CLOSED"
  if (message.includes("payment_active")) return "ACTIVE_PAYMENT"
  if (message.includes("user_already_pro")) return "ALREADY_PRO"
  if (message.includes("user_not_found")) return "USER_NOT_FOUND"
  if (message.includes("pro_registration_unavailable")) return "PRO_REGISTRATION_UNAVAILABLE"
  if (message.includes("invalid_payment_request")) return "INVALID_PAYMENT_REQUEST"
  return null
}

export async function createPaymentRequest({
  userId,
  amount,
  expiresAt,
  replaceExpired = false,
  client = supabaseAdmin,
} = {}) {
  const { data, error } = await client.rpc("create_payment_request", {
    p_user_id: userId,
    p_amount: amount,
    p_expires_at: expiresAt,
    p_replace_expired: Boolean(replaceExpired),
  })
  if (error) {
    const code = rpcErrorCode(error)
    if (code) throw new PaymentRegistrationError(code)
    throw error
  }
  if (!data) throw new PaymentRegistrationError("PRO_REGISTRATION_UNAVAILABLE")
  return Array.isArray(data) ? data[0] : data
}

export async function getProRegistrationState({ client = supabaseAdmin, now = new Date() } = {}) {
  const { data, error } = await client.from("feature_flags")
    .select("enabled,scheduled_enabled,scheduled_at,updated_at,updated_by")
    .eq("key", "pro_registration")
    .maybeSingle()
  if (error) throw error
  if (!data) return { open: false, scheduledAt: null, scheduledEnabled: null, updatedAt: null, updatedBy: null }

  const scheduledAt = data.scheduled_at ? new Date(data.scheduled_at) : null
  const validSchedule = scheduledAt && Number.isFinite(scheduledAt.getTime()) && typeof data.scheduled_enabled === "boolean"
  const due = validSchedule && scheduledAt.getTime() <= now.getTime()
  const pending = validSchedule && scheduledAt.getTime() > now.getTime()
  return {
    open: Boolean(due ? data.scheduled_enabled : data.enabled),
    scheduledAt: pending ? scheduledAt.toISOString() : null,
    scheduledEnabled: pending && typeof data.scheduled_enabled === "boolean" ? data.scheduled_enabled : null,
    updatedAt: data.updated_at || null,
    updatedBy: data.updated_by || null,
  }
}

export async function getPaymentRegistrationCapacity({ client = supabaseAdmin } = {}) {
  const [{ count: awaitingCount, error: awaitingError }, { count: pendingCount, error: pendingError }] = await Promise.all([
    client.from("payments").select("id", { count: "exact", head: true }).eq("status", "awaiting_payment"),
    client.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ])
  if (awaitingError) throw awaitingError
  if (pendingError) throw pendingError
  return { awaitingCount: awaitingCount || 0, pendingCount: pendingCount || 0 }
}
