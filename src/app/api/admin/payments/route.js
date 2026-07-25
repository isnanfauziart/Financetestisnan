import { requireAdmin } from "@/lib/adminAuth"
import { normalizePaymentForClient } from "@/lib/payments"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const TERMINAL = ["approved", "rejected", "revoked", "expired", "cancelled"]

export async function GET(request) {
  try {
    const admin = await requireAdmin(request)
    if (admin.error) return Response.json({ error: admin.error }, { status: admin.error === "forbidden" ? 403 : 401 })
    const cutoff = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString()
    await supabaseAdmin.from("payments").update({
      status: "expired", expired_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("status", "awaiting_payment").lt("created_at", cutoff)
    const url = new URL(request.url)
    const status = url.searchParams.get("status") === "history" ? "history" : "pending"
    const search = String(url.searchParams.get("search") || "").trim().toLowerCase()
    const page = Math.max(Number(url.searchParams.get("page")) || 1, 1)
    const pageSize = 50

    let query = supabaseAdmin.from("payments").select("*, users(email)", { count: search ? undefined : "exact" })
    query = status === "pending"
      ? query.eq("status", "pending").order("created_at", { ascending: true })
      : query.in("status", TERMINAL).order("created_at", { ascending: false })

    if (!search) query = query.range((page - 1) * pageSize, page * pageSize - 1)
    else query = query.limit(1000)

    const { data, error, count } = await query
    if (error) throw error
    let rows = data || []
    if (search) {
      const needle = search.replace(/^pay-/, "").replaceAll("-", "")
      rows = rows.filter((row) =>
        row.id.replaceAll("-", "").toLowerCase().startsWith(needle) ||
        String(row.users?.email || "").toLowerCase().includes(search)
      )
    }
    const total = search ? rows.length : count || 0
    if (search) rows = rows.slice((page - 1) * pageSize, page * pageSize)
    return Response.json({
      payments: rows.map((row) => ({
        ...normalizePaymentForClient(row),
        userEmail: row.users?.email || "",
        users: undefined,
      })),
      total,
      page,
      pageSize,
    })
  } catch (error) {
    console.error("[AdminPayments:GET]", error)
    return Response.json({ error: "Gagal mengambil pembayaran." }, { status: 500 })
  }
}
