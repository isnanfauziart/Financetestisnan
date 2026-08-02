import { requireAdmin } from "@/lib/adminAuth"
import { adminEmailSet, directoryUser, paymentMetadata, transactionUsage } from "@/lib/adminUsers"
import { logError, requestHeaders } from "@/lib/logger"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getCurrentMonthPeriod, getNextMonthlyResetAt, getUsage } from "@/lib/usage"
import { boundedString, oneOf, RequestValidationError } from "@/lib/validation"

export const dynamic = "force-dynamic"

const SECTIONS = ["all", "account", "usage", "payments"]

function response(body, status, request) {
  return Response.json(body, { status, headers: requestHeaders(request) })
}

function adminStatus(error) {
  return error === "forbidden" ? 403 : 401
}

async function loadUser(id) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id,email,name,avatar_url,tier,created_at,last_seen_at,spreadsheet_id,deleted_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  if (error) throw error
  return data
}

async function loadAdminEmails() {
  const { data, error } = await supabaseAdmin.from("admins").select("email")
  if (error) throw error
  return adminEmailSet(data || [])
}

async function loadPayments(userId) {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("id,amount,status,created_at,payment_at,reviewed_at,reviewed_by,payer_name,rejection_reason,rejection_note,correction_reason,correction_note,revocation_reason,revocation_note,proof_uploaded_late,proof_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)
  if (error) throw error
  return (data || []).map(paymentMetadata)
}

async function loadUsage(user, isAdmin) {
  const tier = isAdmin || user.tier === "paid" ? "paid" : "free"
  const period = getCurrentMonthPeriod()
  const resetAt = getNextMonthlyResetAt()
  try {
    const count = await getUsage(user.id, "transactions", period)
    return { transactions: transactionUsage({ tier, period, count, resetAt }) }
  } catch (error) {
    logError("AdminUserUsage", error)
    return {
      transactions: transactionUsage({ tier, period, count: null, resetAt }),
      error: "USAGE_UNAVAILABLE",
    }
  }
}

function readSection(request) {
  const value = new URL(request.url).searchParams.get("section") || "all"
  return oneOf(value, SECTIONS)
}

function writeError(error, request) {
  if (error instanceof RequestValidationError) {
    return response({ error: error.code, message: "Permintaan tidak valid." }, error.status, request)
  }
  logError("AdminUserDetail", error, request)
  return response({ error: "INTERNAL_ERROR", message: "Gagal memuat detail pengguna." }, 500, request)
}

export async function GET(request, { params }) {
  try {
    const admin = await requireAdmin(request)
    if (admin.error) return response({ error: admin.error }, adminStatus(admin.error), request)

    const id = boundedString(params?.id, { required: true, max: 100 })
    const section = readSection(request)
    const user = await loadUser(id)
    if (!user) return response({ error: "NOT_FOUND", message: "Pengguna tidak ditemukan." }, 404, request)

    if (section === "payments") return response({ payments: await loadPayments(id) }, 200, request)

    const adminEmails = await loadAdminEmails()
    const safeUser = directoryUser(user, adminEmails)
    const isAdmin = safeUser.isAdmin

    if (section === "account") return response({ user: safeUser }, 200, request)
    if (section === "usage") return response({ usage: await loadUsage(user, isAdmin) }, 200, request)

    const [usage, payments] = await Promise.all([
      loadUsage(user, isAdmin),
      loadPayments(id),
    ])
    return response({ user: safeUser, usage, payments }, 200, request)
  } catch (error) {
    return writeError(error, request)
  }
}
