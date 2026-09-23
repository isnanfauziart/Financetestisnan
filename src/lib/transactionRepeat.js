/**
 * Wave 5 — Ulangi transaksi.
 *
 * Repetition is offered for ordinary manually recorded income and expense
 * rows only. System-generated rows must never repeat through Quick Add:
 * a repeated ledger row could bypass the owning workflow (bill payment,
 * debt payment). Those rows carry a generated id prefix.
 */

const GENERATED_ID_PREFIXES = ["billpay:", "debtpay:"]

export function isRepeatableTransaction(tx) {
  if (!tx || typeof tx !== "object") return false
  if (tx.type !== "income" && tx.type !== "expense") return false
  const id = String(tx.id || "").trim().toLowerCase()
  return !GENERATED_ID_PREFIXES.some((prefix) => id.startsWith(prefix))
}

/**
 * Prefill for the Quick Add review form: description, category, amount,
 * account, and routine/special class are copied; the date defaults to today
 * and the event tag is never copied. The user must review before saving —
 * nothing is written until Quick Add submits through its normal pipeline.
 */
export function buildRepeatPrefill(tx, now = new Date()) {
  if (!isRepeatableTransaction(tx)) return null
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  return {
    id: tx.id,
    txType: tx.type,
    formData: {
      tanggal: date,
      keterangan: String(tx.desc || ""),
      kategori: String(tx.category || ""),
      jumlah: "",
      akunBank: String(tx.account || ""),
      catatan: "",
      eventId: "",
      sifat:
        tx.type === "expense" && String(tx.expenseClass || "").toLowerCase() === "special"
          ? "Spesial"
          : "Rutin",
    },
    rawAmount: String(Math.round(Number(tx.amount) || 0)),
  }
}
