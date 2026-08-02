import { makePaymentReference } from "./payments"

export const USER_PAGE_SIZES = [25, 50, 100]
export const USER_ACTIVITY_FILTERS = ["24h", "7d", "30d", "never"]
export const USER_SHEET_FILTERS = ["connected", "not_connected"]
export const USER_SORTS = {
  created_desc: { column: "created_at", ascending: false },
  created_asc: { column: "created_at", ascending: true },
  last_seen_desc: { column: "last_seen_at", ascending: false },
  last_seen_asc: { column: "last_seen_at", ascending: true },
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase()
}

export function adminEmailSet(rows = []) {
  return new Set(rows.map(row => normalizeEmail(row.email)).filter(Boolean))
}

export function directoryUser(user, adminEmails) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url || null,
    tier: user.tier,
    created_at: user.created_at,
    last_seen_at: user.last_seen_at || null,
    sheetConnected: Boolean(user.spreadsheet_id),
    isAdmin: adminEmails.has(normalizeEmail(user.email)),
  }
}

export function activityCutoff(filter, now = new Date()) {
  const hours = filter === "24h" ? 24 : filter === "7d" ? 24 * 7 : filter === "30d" ? 24 * 30 : null
  return hours === null ? null : new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
}

export function paymentMetadata(payment) {
  return {
    id: payment.id,
    reference: makePaymentReference(payment.id),
    amount: payment.amount,
    status: payment.status,
    created_at: payment.created_at,
    payment_at: payment.payment_at || null,
    reviewed_at: payment.reviewed_at || null,
    reviewed_by: payment.reviewed_by || null,
    payer_name: payment.payer_name || null,
    rejection_reason: payment.rejection_reason || null,
    rejection_note: payment.rejection_note || null,
    correction_reason: payment.correction_reason || null,
    correction_note: payment.correction_note || null,
    revocation_reason: payment.revocation_reason || null,
    revocation_note: payment.revocation_note || null,
    proof_uploaded_late: Boolean(payment.proof_uploaded_late),
    hasProof: Boolean(payment.proof_url),
  }
}

export function transactionUsage({ tier, period, count, resetAt }) {
  const unlimited = tier === "paid"
  return {
    period,
    current: count,
    limit: unlimited ? null : 75,
    resetAt: unlimited ? null : resetAt,
    verified: count !== null,
  }
}
