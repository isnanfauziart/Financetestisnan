import { getPaymentUser } from "@/lib/paymentAuth"
import { featureUnavailableResponse } from "@/lib/featureGuard"
import { normalizePaymentForClient, PAYMENT_AMOUNT } from "@/lib/payments"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import {
  createPaymentRequest,
  getProRegistrationState,
  PRO_REGISTRATION_CLOSED_MESSAGE,
} from "@/lib/paymentRegistration"

export const dynamic = "force-dynamic"

function jsonError(message, status, code = null) {
  return Response.json(code ? { error: code, message } : { error: message }, { status })
}

function registrationErrorResponse(error) {
  if (error?.code === "PRO_REGISTRATION_CLOSED") {
    return jsonError(PRO_REGISTRATION_CLOSED_MESSAGE, 403, "PRO_REGISTRATION_CLOSED")
  }
  if (error?.code === "ACTIVE_PAYMENT") return jsonError("Anda masih memiliki satu pembayaran aktif.", 409)
  if (error?.code === "ALREADY_PRO") return jsonError("Akun Anda sudah memiliki akses Pro.", 409)
  if (error?.code === "PRO_REGISTRATION_UNAVAILABLE") return jsonError("Pendaftaran Pro belum dapat diproses. Coba lagi sebentar.", 503)
  if (error?.code === "USER_NOT_FOUND") return jsonError("Silakan masuk terlebih dahulu.", 401)
  if (error?.code === "INVALID_PAYMENT_REQUEST") return jsonError("Permintaan pembayaran tidak valid.", 400)
  return null
}

async function expireOldRequests(userId) {
  const cutoff = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString()
  await supabaseAdmin.from("payments").update({
    status: "expired",
    expired_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId).eq("status", "awaiting_payment").lt("created_at", cutoff)
}

export async function GET(request) {
  try {
    const user = await getPaymentUser(request)
    if (!user) return jsonError("Silakan masuk terlebih dahulu.", 401)
    const blocked = featureUnavailableResponse(user, "paymentQris", request)
    if (blocked) return blocked
    await expireOldRequests(user.id)
    const url = new URL(request.url)
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 50)
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0)
    const { data, error, count } = await supabaseAdmin.from("payments")
      .select("*", { count: "exact" }).eq("user_id", user.id)
      .order("created_at", { ascending: false }).range(offset, offset + limit - 1)
    if (error) throw error
    const hasApprovedPayment = (data || []).some((payment) => payment.status === "approved")
    return Response.json({
      payments: (data || []).map(normalizePaymentForClient),
      total: count || 0,
      tier: user.tier === "paid" || hasApprovedPayment ? "paid" : (user.tier || "free"),
      proRegistrationOpen: await getProRegistrationState().then(state => state.open).catch(() => false),
    })
  } catch (error) {
    console.error("[Payments:GET]", error)
    return jsonError("Gagal mengambil pembayaran.", 500)
  }
}

export async function POST(request) {
  try {
    const user = await getPaymentUser(request)
    if (!user) return jsonError("Silakan masuk terlebih dahulu.", 401)
    const blocked = featureUnavailableResponse(user, "paymentQris", request)
    if (blocked) return blocked
    if (user.tier === "paid") return jsonError("Akun Anda sudah memiliki akses Pro.", 409)
    const body = await request.json().catch(() => ({}))
    const now = new Date()
    const data = await createPaymentRequest({
      userId: user.id,
      amount: PAYMENT_AMOUNT,
      expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
      replaceExpired: body.replaceExpired === true,
    })
    return Response.json({ payment: normalizePaymentForClient(data) }, { status: 201 })
  } catch (error) {
    const registrationResponse = registrationErrorResponse(error)
    if (registrationResponse) return registrationResponse
    console.error("[Payments:POST]", error)
    return jsonError("Gagal membuat pembayaran.", 500)
  }
}
