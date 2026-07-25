import { requireAdmin } from "@/lib/adminAuth"
import { normalizePaymentForClient } from "@/lib/payments"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const REASONS = {
  reject: ["Bukti tidak jelas", "Nominal tidak sesuai", "Pembayaran belum ditemukan", "Bukti duplikat", "Lainnya"],
  revoke: ["Dana dikembalikan", "Pembayaran duplikat", "Pembayaran terdeteksi palsu", "Koreksi administratif", "Lainnya"],
  correct: ["Kesalahan verifikasi admin", "Bukti pembayaran ditemukan", "Konfirmasi melalui CS", "Lainnya"],
}

export async function PATCH(request, { params }) {
  try {
    const admin = await requireAdmin(request)
    if (admin.error) return Response.json({ error: admin.error }, { status: admin.error === "forbidden" ? 403 : 401 })
    const body = await request.json().catch(() => ({}))
    const action = body.action
    if (!["approve", "reject", "revoke", "correct"].includes(action)) {
      return Response.json({ error: "Aksi tidak valid." }, { status: 400 })
    }
    const reason = String(body.reason || "").trim()
    const note = String(body.note || "").trim().slice(0, 1000)
    if (action !== "approve" && !REASONS[action].includes(reason)) {
      return Response.json({ error: "Alasan wajib dipilih." }, { status: 400 })
    }
    if (reason === "Lainnya" && !note) {
      return Response.json({ error: "Catatan wajib diisi untuk alasan Lainnya." }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin.rpc("review_payment", {
      target_payment: params.id,
      admin_email: admin.email,
      action_name: action,
      reason_text: reason || null,
      note_text: note || null,
    })
    if (error) {
      if (error.message.includes("newer_active_payment")) {
        const { data: payment } = await supabaseAdmin.from("payments").select("user_id").eq("id", params.id).single()
        const { data: active } = await supabaseAdmin.from("payments").select("id")
          .eq("user_id", payment.user_id).in("status", ["awaiting_payment", "pending"]).maybeSingle()
        return Response.json({
          error: "Koreksi diblokir karena ada pembayaran aktif yang lebih baru.",
          activePayment: active ? normalizePaymentForClient(active) : null,
        }, { status: 409 })
      }
      if (error.message.includes("invalid_transition")) {
        return Response.json({ error: "Status pembayaran sudah berubah. Segarkan halaman." }, { status: 409 })
      }
      throw error
    }
    return Response.json({ payment: normalizePaymentForClient(Array.isArray(data) ? data[0] : data) })
  } catch (error) {
    console.error("[AdminPayments:PATCH]", error)
    return Response.json({ error: "Gagal memproses pembayaran." }, { status: 500 })
  }
}
