import { randomUUID } from "node:crypto"
import { parseRupiah } from "./sheets"

/**
 * `Total saldo saat ini` is one saved combined balance plus a random checkpoint
 * id. Later cash rows inherit that id, so the adjustment never depends on
 * transaction dates and same-day rows cannot be counted twice.
 */
export const CHECKPOINT_KEYS = {
  balance: "currentCashBalance",
  checkpointId: "currentCashBalanceCheckpointId",
  recordedAt: "currentCashBalanceRecordedAt",
  startingBalanceConfirmed: "startingBalanceConfirmed",
}

export const CHECKPOINT_KEY_LIST = Object.values(CHECKPOINT_KEYS)

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function createCheckpointId() {
  return randomUUID()
}

export function isValidCheckpointId(value) {
  return UUID_PATTERN.test(String(value || "").trim())
}

export function parseConfirmedFlag(value) {
  const normalized = String(value ?? "").trim().toLowerCase()
  return normalized === "true" || normalized === "ya" || normalized === "1"
}

export function parseCheckpointBalance(value) {
  if (value === null || value === undefined) return null
  const raw = String(value).trim()
  // `parseRupiah` maps unparseable text to 0, which would silently save an
  // empty balance. Require at least one digit before trusting the number.
  if (raw === "" || !/[0-9]/.test(raw)) return null
  const amount = parseRupiah(raw)
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

/**
 * @param rows Settings `A:B` rows
 */
export function readCheckpointSettings(rows = []) {
  const state = { balance: null, checkpointId: "", recordedAt: "", startingBalanceConfirmed: false }
  for (const row of rows || []) {
    const key = String(row?.[0] || "").trim().toLowerCase()
    const value = row?.[1]
    if (key === CHECKPOINT_KEYS.balance.toLowerCase()) {
      state.balance = parseCheckpointBalance(value)
    } else if (key === CHECKPOINT_KEYS.checkpointId.toLowerCase()) {
      state.checkpointId = String(value || "").trim()
    } else if (key === CHECKPOINT_KEYS.recordedAt.toLowerCase()) {
      state.recordedAt = String(value || "").trim()
    } else if (key === CHECKPOINT_KEYS.startingBalanceConfirmed.toLowerCase()) {
      state.startingBalanceConfirmed = parseConfirmedFlag(value)
    }
  }
  return state
}

/**
 * A saved checkpoint needs a valid balance **and** a valid id. `Rp0` is a valid
 * confirmed balance, which is why the id — not the amount — marks completion.
 */
export function resolveCheckpoint(state) {
  const balance = state?.balance ?? null
  const checkpointId = String(state?.checkpointId || "").trim()
  const saved = balance !== null && isValidCheckpointId(checkpointId)
  return {
    saved,
    provisional: !saved,
    balance: saved ? balance : null,
    checkpointId: saved ? checkpointId : "",
    recordedAt: saved ? String(state?.recordedAt || "").trim() : "",
    startingBalanceConfirmed: Boolean(state?.startingBalanceConfirmed),
  }
}

export function buildCheckpointSettingsRows({ balance, checkpointId, recordedAt }) {
  return [
    [CHECKPOINT_KEYS.balance, String(balance)],
    [CHECKPOINT_KEYS.checkpointId, checkpointId],
    [CHECKPOINT_KEYS.recordedAt, recordedAt],
  ]
}
