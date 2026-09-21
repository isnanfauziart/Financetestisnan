"use client"
import { useCallback, useEffect, useSyncExternalStore } from "react"
import { WRITE_MESSAGES } from "./financialWriteClient"

/**
 * Financial writes are disabled whenever the app cannot trust what it is
 * showing: offline, a stale payload, a Sheet schema conflict, or an operation
 * whose outcome is still unknown. One store keeps every money-writing screen
 * consistent instead of each component guessing.
 */
export const WRITE_BLOCK = {
  offline: "offline",
  stale: "stale",
  schemaConflict: "schema_conflict",
  unresolved: "unresolved",
  pending: "pending",
}

export const WRITE_BLOCK_MESSAGES = {
  [WRITE_BLOCK.offline]: WRITE_MESSAGES.offline,
  [WRITE_BLOCK.stale]: WRITE_MESSAGES.stale,
  [WRITE_BLOCK.schemaConflict]: WRITE_MESSAGES.schemaConflict,
  [WRITE_BLOCK.unresolved]: WRITE_MESSAGES.unresolved,
  [WRITE_BLOCK.pending]: "Memuat data terbaru…",
}

let state = { reason: null, detail: "", lastSyncedAt: "" }
let unresolvedOperationId = ""
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

function setState(next) {
  state = next
  emit()
}

export function getWriteState() {
  return state
}

export function subscribeWriteState(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function blockedBy(reason, detail = "") {
  if (reason === WRITE_BLOCK.unresolved) {
    return { reason, detail: detail || unresolvedOperationId, lastSyncedAt: state.lastSyncedAt }
  }
  return { reason, detail, lastSyncedAt: state.lastSyncedAt }
}

function sync() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setState(blockedBy(WRITE_BLOCK.offline))
  } else if (state.reason === WRITE_BLOCK.offline) {
    setState({ ...state, reason: null, detail: "" })
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", sync)
  window.addEventListener("offline", sync)
  if (!window.__artamiWriteStateBound) {
    window.__artamiWriteStateBound = true
    sync()
  }
}

/** A successful, complete dashboard read clears stale and schema blocks. */
export function markSynced(at = new Date().toISOString()) {
  setState({ reason: null, detail: "", lastSyncedAt: at })
}

/**
 * Wave 2 login freshness gate: cached figures may be shown on a returning
 * login, but financial writes stay blocked until the first fresh fetch
 * resolves. Known stronger blocks (schema conflict, unresolved operation) are
 * never downgraded; a failed fetch replaces pending with stale.
 */
export function markPending(detail = "") {
  if (state.reason === WRITE_BLOCK.unresolved || state.reason === WRITE_BLOCK.schemaConflict) return
  setState({ reason: WRITE_BLOCK.pending, detail: detail || "cached", lastSyncedAt: state.lastSyncedAt })
}

/** A refresh failed while cached figures stay on screen. */
export function markStale(detail = "") {
  if (state.reason === WRITE_BLOCK.unresolved) return
  setState(blockedBy(WRITE_BLOCK.stale, detail))
}

export function markSchemaConflict(detail = "") {
  setState(blockedBy(WRITE_BLOCK.schemaConflict, detail))
}

export function markUnresolvedOperation(operationId) {
  unresolvedOperationId = String(operationId || "")
  setState(blockedBy(WRITE_BLOCK.unresolved, unresolvedOperationId))
}

export function clearUnresolvedOperation() {
  unresolvedOperationId = ""
  setState({ reason: null, detail: "", lastSyncedAt: state.lastSyncedAt })
}

export function resetWriteState() {
  unresolvedOperationId = ""
  state = { reason: null, detail: "", lastSyncedAt: "" }
  emit()
}

export function useFinancialWriteState() {
  const current = useSyncExternalStore(subscribeWriteState, getWriteState, getWriteState)
  useEffect(() => {
    sync()
  }, [])
  return current
}

export function useFinancialWriteGuard() {
  const current = useFinancialWriteState()
  const blocked = Boolean(current.reason)
  return {
    ...current,
    blocked,
    message: blocked ? WRITE_BLOCK_MESSAGES[current.reason] || "" : "",
    unresolvedOperationId: current.reason === WRITE_BLOCK.unresolved ? current.detail : "",
  }
}

/** Reports the outcome of a write to the shared store. */
export function reportWriteOutcome(result) {
  if (!result) return
  if (result.outcome === "unresolved") {
    markUnresolvedOperation(result.operationId)
    return
  }
  if (result.ok && state.reason === WRITE_BLOCK.unresolved && result.operationId === unresolvedOperationId) {
    clearUnresolvedOperation()
  }
}

export function useResolveUnresolvedOperation() {
  return useCallback(async (verify) => {
    const operationId = unresolvedOperationId
    if (!operationId) return { resolved: true, committed: false }
    const verification = await verify(operationId)
    if (verification?.committed) clearUnresolvedOperation()
    else if (verification?.resolved) clearUnresolvedOperation()
    return verification
  }, [])
}
