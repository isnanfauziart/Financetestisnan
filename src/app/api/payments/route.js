import { getPaymentUser } from "@/lib/paymentAuth"
import { featureUnavailableResponse } from "@/lib/featureGuard"
import { getPaymentWindow, normalizePaymentForClient, PAYMENT_AMOUNT } from "@/lib/payments"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

function jsonError(message, status) {
  return Response.json({ error: message }, { status })
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
    await expireOldRequests(user.id)
    const { data: active, error: activeError } = await supabaseAdmin.from("payments")
      .select("*").eq("user_id", user.id).in("status", ["awaiting_payment", "pending"])
      .maybeSingle()
    if (activeError) throw activeError
    if (active) {
      const window = getPaymentWindow(active.created_at)
      if (active.status === "awaiting_payment" && window.inGrace && body.replaceExpired === true) {
        const { error } = await supabaseAdmin.from("payments").update({
          status: "expired", expired_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq("id", active.id).eq("user_id", user.id).eq("status", "awaiting_payment")
        if (error) throw error
      } else {
        return jsonError("Anda masih memiliki satu pembayaran aktif.", 409)
      }
    }
    const now = new Date()
    const { data, error } = await supabaseAdmin.from("payments").insert({
      user_id: user.id,
      amount: PAYMENT_AMOUNT,
      status: "awaiting_payment",
      expires_at: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
    }).select().single()
    if (error?.code === "23505") return jsonError("Anda masih memiliki satu pembayaran aktif.", 409)
    if (error) throw error
    return Response.json({ payment: normalizePaymentForClient(data) }, { status: 201 })
  } catch (error) {
    console.error("[Payments:POST]", error)
    return jsonError("Gagal membuat pembayaran.", 500)
  }
}
