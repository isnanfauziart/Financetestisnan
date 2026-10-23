import { requireAdmin } from "@/lib/adminAuth"
import { logError, requestHeaders } from "@/lib/logger"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

// Amount rows are fetched as a single narrow column and summed here; the cap
// keeps a pathological backlog from turning the overview into a full scan.
const MAX_AMOUNT_ROWS = 10000

function response(body, status, request) {
  return Response.json(body, { status, headers: requestHeaders(request) })
}

async function paymentTotals(status) {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("amount")
    .eq("status", status)
    .range(0, MAX_AMOUNT_ROWS - 1)
  if (error) throw error
  const rows = data || []
  return {
    count: rows.length,
    amount: rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
  }
}

async function userCount(tier) {
  let query = supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
  if (tier) query = query.eq("tier", tier)
  const { count, error } = await query
  if (error) throw error
  return count || 0
}

export async function GET(request) {
  try {
    const admin = await requireAdmin(request)
    if (admin.error) return response({ error: admin.error }, admin.error === "forbidden" ? 403 : 401, request)

    const [pending, approved, totalUsers, paidUsers] = await Promise.all([
      paymentTotals("pending"),
      paymentTotals("approved"),
      userCount(""),
      userCount("paid"),
    ])

    return response({
      pendingCount: pending.count,
      pendingAmount: pending.amount,
      approvedCount: approved.count,
      approvedRevenue: approved.amount,
      totalUsers,
      paidUsers,
    }, 200, request)
  } catch (error) {
    logError("AdminOverview", error, request)
    return response({ error: "INTERNAL_ERROR", message: "Gagal memuat ringkasan admin." }, 500, request)
  }
}
