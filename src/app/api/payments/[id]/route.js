import { getPaymentUser } from "@/lib/paymentAuth"
import { featureUnavailableResponse } from "@/lib/featureGuard"
import { getPaymentWindow, isPaymentAtWithinWindow, normalizePaymentForClient, PAYMENT_BUCKET, validateProof } from "@/lib/payments"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }

function jsonError(message, status) {
  return Response.json({ error: message }, { status })
}

export async function PATCH(request, { params }) {
  try {
    const user = await getPaymentUser(request)
    if (!user) return jsonError("Silakan masuk terlebih dahulu.", 401)
    const blocked = featureUnavailableResponse(user, "paymentQris", request)
    if (blocked) return blocked
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      if (form.get("action") !== "submit_proof") return jsonError("Aksi tidak valid.", 400)
      const file = form.get("proof")
      const errorMessage = validateProof(file)
      if (errorMessage) return jsonError(errorMessage, 400)
      const paymentAt = new Date(String(form.get("payment_at") || ""))
      if (Number.isNaN(paymentAt.getTime())) return jsonError("Waktu pembayaran wajib diisi.", 400)
      if (paymentAt.getTime() > Date.now() + 5 * 60 * 1000) return jsonError("Waktu pembayaran tidak valid.", 400)

      const { data: payment, error: findError } = await supabaseAdmin.from("payments")
        .select("*").eq("id", params.id).eq("user_id", user.id).maybeSingle()
      if (findError) throw findError
      if (!payment) return jsonError("Pembayaran tidak ditemukan.", 404)
      if (payment.status !== "awaiting_payment" || payment.proof_url) {
        return jsonError("Bukti pembayaran sudah dikirim atau pembayaran tidak aktif.", 409)
      }
      const window = getPaymentWindow(payment.created_at)
      if (!window.canUpload || !isPaymentAtWithinWindow(paymentAt, payment.created_at, window.expiresAt)) {
        return jsonError("Waktu pembayaran telah berakhir.", 409)
      }

      const path = `${user.id}/${payment.id}.${EXTENSIONS[file.type]}`
      const bytes = await file.arrayBuffer()
      const { error: uploadError } = await supabaseAdmin.storage.from(PAYMENT_BUCKET)
        .upload(path, bytes, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      const { data: updated, error: updateError } = await supabaseAdmin.from("payments").update({
        proof_url: path,
        status: "pending",
        payment_at: paymentAt.toISOString(),
        payer_name: String(form.get("payer_name") || "").trim().slice(0, 120) || null,
        proof_uploaded_late: window.inGrace,
        updated_at: new Date().toISOString(),
      }).eq("id", payment.id).eq("user_id", user.id).eq("status", "awaiting_payment")
        .is("proof_url", null).select().maybeSingle()
      if (updateError || !updated) {
        await supabaseAdmin.storage.from(PAYMENT_BUCKET).remove([path])
        if (updateError) throw updateError
        return jsonError("Bukti sudah dikirim dari perangkat lain.", 409)
      }
      return Response.json({ payment: normalizePaymentForClient(updated) })
    }

    const body = await request.json().catch(() => ({}))
    if (body.action !== "cancel") return jsonError("Aksi tidak valid.", 400)
    const { data, error } = await supabaseAdmin.from("payments").update({
      status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", params.id).eq("user_id", user.id).eq("status", "awaiting_payment")
      .is("proof_url", null).select().maybeSingle()
    if (error) throw error
    if (!data) return jsonError("Pembayaran tidak dapat dibatalkan.", 409)
    return Response.json({ payment: normalizePaymentForClient(data) })
  } catch (error) {
    console.error("[Payments:PATCH]", error)
    return jsonError("Gagal memperbarui pembayaran.", 500)
  }
}
