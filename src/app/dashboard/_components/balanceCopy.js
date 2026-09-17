/**
 * User-facing names for the canonical money model.
 *
 * `liquid` and `investment` are storage values that must never reach the screen:
 * the plan replaces every visible "likuid" label.
 */
export const SAVINGS_KIND_LABELS = {
  liquid: "Bisa digunakan",
  investment: "Investasi (nilai nominal)",
}

export const BALANCE_COPY = {
  netWorth: "Kekayaan Bersih",
  availableNow: "Dana yang bisa dipakai saat ini",
  currentCash: "Total saldo saat ini",
  basisSaved: "Berdasarkan Total saldo saat ini",
  basisProvisional: "Berdasarkan data terakhir",
  estimateNote: "Angka ini perkiraan karena ada tabungan lama yang klasifikasinya belum jelas.",
  unassignedSavings: "Tabungan belum dibagi ke target",
  needsReview: "Perlu ditinjau",
  unpaidBills: "Tagihan belum dibayar",
  unpaidBillsNote: "Tidak mengurangi dana yang bisa dipakai sampai benar-benar dibayar.",
}

export function savingsKindLabel(kind) {
  return SAVINGS_KIND_LABELS[String(kind || "").trim()] || SAVINGS_KIND_LABELS.liquid
}

export function formatBalanceBasis(provisional) {
  return provisional ? BALANCE_COPY.basisProvisional : BALANCE_COPY.basisSaved
}

/**
 * Rows for `Rincian saldo`. Values stay numeric so the UI formats them with the
 * same money helper everywhere; rows with nothing to show are dropped.
 */
export function buildRincianRows(balances) {
  if (!balances) return []
  const rincian = balances.rincian || {}
  const outstanding = balances.outstanding || {}
  const unpaid = rincian.unpaidBills || {}
  const rows = [
    { key: "recorded", label: "Saldo Tercatat", value: rincian.recordedBalance ?? balances.recordedBalance ?? 0 },
    { key: "current", label: BALANCE_COPY.currentCash, value: balances.currentCash?.value ?? 0, note: formatBalanceBasis(balances.currentCash?.provisional) },
    { key: "utang", label: "Utang belum lunas", value: outstanding.utang || 0, count: outstanding.utangCount || 0, negative: true },
    { key: "piutang", label: "Piutang belum diterima", value: outstanding.piutang || 0, count: outstanding.piutangCount || 0 },
    { key: "netWorth", label: BALANCE_COPY.netWorth, value: balances.netWorth || 0 },
    { key: "goalReservations", label: "Disisihkan untuk target", value: rincian.goalReservations || 0 },
    { key: "unassigned", label: BALANCE_COPY.unassignedSavings, value: rincian.unassignedSavings || 0, count: rincian.unassignedSavingsCount || 0 },
    { key: "investment", label: SAVINGS_KIND_LABELS.investment, value: rincian.investmentReserved || 0, note: "Tidak dihitung sebagai uang tunai" },
    { key: "unpaidBills", label: BALANCE_COPY.unpaidBills, value: unpaid.total || 0, count: unpaid.count || 0, note: BALANCE_COPY.unpaidBillsNote },
    { key: "needsReview", label: BALANCE_COPY.needsReview, value: rincian.needsReviewTotal || 0, count: rincian.needsReviewCount || 0 },
    { key: "available", label: BALANCE_COPY.availableNow, value: balances.available?.value || 0, emphasis: true },
  ]
  if ((rincian.shortfall || 0) > 0) {
    rows.push({ key: "shortfall", label: "Kekurangan alokasi", value: rincian.shortfall, negative: true })
  }
  return rows.filter(row => row.value !== 0 || ["recorded", "current", "available"].includes(row.key))
}
