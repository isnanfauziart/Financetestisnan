"use client"
import QuotaNotice from "./QuotaNotice"

export default function TransactionQuotaStatus({ usage, error, proRegistrationOpen = true }) {
  const reachedError = error || (usage?.warning === "reached" ? {
    error: `Batas ${usage.limit} transaksi bulan ini sudah tercapai.`,
    code: "FEATURE_LIMIT_REACHED",
  } : null)
  return (
    <>
      {usage?.limit !== null && usage?.warning === "near" && (
        <p role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          {usage.current} dari {usage.limit} transaksi bulan ini. Batas akan direset pada periode berikutnya.
        </p>
      )}
      <QuotaNotice error={reachedError} proRegistrationOpen={proRegistrationOpen} />
    </>
  )
}
