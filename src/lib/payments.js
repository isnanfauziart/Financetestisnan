export const PAYMENT_AMOUNT = 40000
export const PAYMENT_BUCKET = "payment-proofs"
export const PAYMENT_PROOF_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024
export const WHATSAPP_NUMBER = "62882006282613"

const TWO_DAYS = 48 * 60 * 60 * 1000
const ONE_HOUR = 60 * 60 * 1000

export function makePaymentReference(id) {
  return `PAY-${String(id || "").replaceAll("-", "").slice(0, 8).toUpperCase()}`
}

export function getPaymentWindow(createdAt, now = new Date()) {
  const expires = new Date(new Date(createdAt).getTime() + TWO_DAYS)
  const graceEnds = new Date(expires.getTime() + ONE_HOUR)
  const time = now.getTime()
  return {
    expiresAt: expires.toISOString(),
    graceEndsAt: graceEnds.toISOString(),
    expired: time > expires.getTime(),
    inGrace: time > expires.getTime() && time <= graceEnds.getTime(),
    canUpload: time <= graceEnds.getTime(),
  }
}

export function validateProof(file) {
  if (!PAYMENT_PROOF_TYPES.includes(file?.type)) {
    return "Bukti harus berupa gambar JPEG, PNG, atau WebP."
  }
  if (!Number.isFinite(file?.size) || file.size <= 0 || file.size > PAYMENT_PROOF_MAX_BYTES) {
    return "Ukuran bukti maksimal 5 MB."
  }
  return null
}

export function normalizePaymentForClient(payment) {
  const { proof_url: proofPath, ...safe } = payment
  return {
    ...safe,
    reference: makePaymentReference(payment.id),
    hasProof: Boolean(proofPath),
  }
}

export function whatsappUrl(reference, issue) {
  const message = `Halo CS Artami, saya membutuhkan bantuan untuk ${reference}: ${issue}.`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
