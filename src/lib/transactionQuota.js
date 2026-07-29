import "server-only"
import { FREE_LIMITS } from "./tier"
import { getCurrentMonthPeriod, getNextMonthlyResetAt, releaseUsage, reserveUsage } from "./usage"

export class QuotaError extends Error {
  constructor(code, current = null) {
    super(code)
    this.code = code
    this.current = current
  }
}

export async function reserveTransaction(auth) {
  if (auth.tier === "paid") return null
  if (!auth.entitlementVerified) throw new QuotaError("ENTITLEMENT_UNAVAILABLE")
  const period = getCurrentMonthPeriod()
  try {
    const current = await reserveUsage(auth.user.id, "transactions", FREE_LIMITS.transactions, period)
    return { userId: auth.user.id, period, current }
  } catch (error) {
    if (String(error.message).includes("feature_limit_exceeded")) {
      throw new QuotaError("FEATURE_LIMIT_REACHED", FREE_LIMITS.transactions)
    }
    throw new QuotaError("ENTITLEMENT_UNAVAILABLE")
  }
}

export async function releaseTransaction(reservation) {
  if (reservation) await releaseUsage(reservation.userId, "transactions", reservation.period)
}

export function quotaErrorResponse(error) {
  if (error?.code === "FEATURE_LIMIT_REACHED") {
    return Response.json({
      error: "Batas 75 transaksi bulan ini sudah tercapai",
      code: error.code,
      feature: "transactions",
      upgrade: true,
      current: error.current,
      limit: FREE_LIMITS.transactions,
      resetAt: getNextMonthlyResetAt(),
    }, { status: 403 })
  }
  return Response.json({
    error: "Status paket belum dapat diverifikasi. Coba lagi.",
    code: "ENTITLEMENT_UNAVAILABLE",
    retryable: true,
  }, { status: 503 })
}
