/**
 * User-facing names for the canonical money model.
 *
 * One concept gets one name across the app. `liquid` and `investment` are
 * storage values that must never reach the screen; the plan replaces every
 * visible "likuid" label.
 */
export const SAVINGS_KIND_LABELS = {
  liquid: "Bisa digunakan",
  investment: "Investasi (nilai nominal)",
}

export const BALANCE_COPY = {
  netWorth: "Kekayaan Bersih",
  availableNow: "Bisa dipakai sekarang",
  currentCash: "Uang kamu",
  recordedBalance: "Saldo Tercatat",
  goalAllocated: "Dialokasikan ke target",
  investmentHeld: SAVINGS_KIND_LABELS.investment,
  heldInSavings: "Disisihkan di tabungan",
  basisSaved: "Berdasarkan Total saldo saat ini",
  basisProvisional: "Berdasarkan data terakhir",
  estimateNote: "Angka ini perkiraan karena ada tabungan lama yang klasifikasinya belum jelas.",
  unassignedSavings: "Tabungan tanpa target",
  needsReview: "Perlu ditinjau",
  unpaidBills: "Tagihan belum dibayar",
  unpaidBillsNote: "Tidak mengurangi dana yang bisa dipakai sampai benar-benar dibayar.",
  manageSavings: "Atur tabungan",
  heldInSavingsHint: "Uang yang sudah kamu sisihkan — tidak dihitung sebagai uang bebas.",
}

export function savingsKindLabel(kind) {
  return SAVINGS_KIND_LABELS[String(kind || "").trim()] || SAVINGS_KIND_LABELS.liquid
}

export function formatBalanceBasis(provisional) {
  return provisional ? BALANCE_COPY.basisProvisional : BALANCE_COPY.basisSaved
}

/**
 * Rows for `Rincian saldo`. The list answers one story — how the hero numbers
 * come together — so each concept appears exactly once: money you have, what is
 * set aside, debts, informational bills, then what is left to spend. A nonzero
 * allocation shortfall always appends its own warning row. Values stay numeric
 * so the UI formats them with the same money helper everywhere.
 */
export function buildRincianRows(balances) {
  if (!balances) return []
  const rincian = balances.rincian || {}
  const outstanding = balances.outstanding || {}
  const unpaid = rincian.unpaidBills || {}
  const rows = [
    { key: "current", label: BALANCE_COPY.currentCash, value: balances.currentCash?.value ?? rincian.recordedBalance ?? balances.recordedBalance ?? 0, note: formatBalanceBasis(balances.currentCash?.provisional) },
    { key: "recorded", label: BALANCE_COPY.recordedBalance, value: balances.recordedBalance ?? rincian.recordedBalance ?? 0 },
    { key: "goalAllocated", label: BALANCE_COPY.goalAllocated, value: rincian.goalReservations || 0 },
    { key: "unassignedSavings", label: BALANCE_COPY.unassignedSavings, value: rincian.unassignedSavings || 0, count: rincian.unassignedSavingsCount || 0 },
    { key: "investmentReserved", label: BALANCE_COPY.investmentHeld, value: rincian.investmentReserved || 0 },
    { key: "utang", label: "Utang belum lunas", value: outstanding.utang || 0, count: outstanding.utangCount || 0, negative: true },
    { key: "piutang", label: "Piutang belum diterima", value: outstanding.piutang || 0, count: outstanding.piutangCount || 0 },
    { key: "unpaidBills", label: BALANCE_COPY.unpaidBills, value: unpaid.total || 0, count: unpaid.count || 0, note: BALANCE_COPY.unpaidBillsNote },
    { key: "needsReview", label: BALANCE_COPY.needsReview, value: rincian.needsReviewTotal || 0, count: rincian.needsReviewCount || 0 },
    { key: "available", label: BALANCE_COPY.availableNow, value: balances.available?.value || 0, emphasis: true },
  ]
  if ((rincian.shortfall || 0) > 0) {
    rows.push({
      key: "shortfall",
      label: "Kekurangan alokasi",
      value: rincian.shortfall,
      negative: true,
      note: "Sisihkanmu melebihi uang yang tercatat — bebaskan sebagian tabungan atau perbarui Total saldo saat ini.",
    })
  }
  return rows.filter(row => row.value !== 0 || ["current", "available"].includes(row.key))
}
