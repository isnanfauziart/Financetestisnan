import "server-only"
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

const TTL_MS = 30_000

function secret() {
  if (!process.env.NEXTAUTH_SECRET) throw new Error("NEXTAUTH_SECRET is required")
  return process.env.NEXTAUTH_SECRET
}

function sign(encoded) {
  return createHmac("sha256", secret()).update(encoded).digest("base64url")
}

export function createUndoToken({ userId, spreadsheetId, tab, rowIndex, row }, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    userId, spreadsheetId, tab, rowIndex, row, jti: randomUUID(), exp: now + TTL_MS,
  })).toString("base64url")
  return `${payload}.${sign(payload)}`
}

export function verifyUndoToken(token, { userId, spreadsheetId }, now = Date.now()) {
  const [payload, signature, extra] = String(token || "").split(".")
  if (!payload || !signature || extra) throw new Error("INVALID_UNDO_TOKEN")
  const expected = Buffer.from(sign(payload))
  const actual = Buffer.from(signature)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("INVALID_UNDO_TOKEN")
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString())
  if (decoded.exp <= now || decoded.userId !== userId || decoded.spreadsheetId !== spreadsheetId) {
    throw new Error("INVALID_UNDO_TOKEN")
  }
  return decoded
}
