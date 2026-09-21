import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  clearUnresolvedOperation,
  getWriteState,
  markPending,
  markSchemaConflict,
  markStale,
  markSynced,
  markUnresolvedOperation,
  resetWriteState,
  WRITE_BLOCK,
} from "@/lib/financialWriteState"

beforeEach(() => resetWriteState())
afterEach(() => resetWriteState())

describe("financialWriteState store", () => {
  it("starts fully open", () => {
    expect(getWriteState()).toEqual({ reason: null, detail: "", lastSyncedAt: "" })
  })

  describe("pending login freshness gate", () => {
    it("blocks the gate while waiting for the first fresh fetch", () => {
      markSynced("2026-09-19T08:00:00.000Z")
      markPending("cached")

      const state = getWriteState()
      expect(state.reason).toBe(WRITE_BLOCK.pending)
      expect(state.detail).toBe("cached")
      // The last successful sync time is preserved for honest display.
      expect(state.lastSyncedAt).toBe("2026-09-19T08:00:00.000Z")
    })

    it("is cleared by a successful fetch and replaced by a failed one", () => {
      markPending("cached")
      markStale("network down")
      expect(getWriteState().reason).toBe(WRITE_BLOCK.stale)

      resetWriteState()
      markPending("cached")
      markSynced("2026-09-19T09:00:00.000Z")
      expect(getWriteState().reason).toBeNull()
    })

    it("never downgrades a schema conflict", () => {
      markSchemaConflict("Struktur Google Sheets perlu ditinjau")
      markPending("cached")
      expect(getWriteState().reason).toBe(WRITE_BLOCK.schemaConflict)
    })

    it("never downgrades an unresolved operation", () => {
      markUnresolvedOperation("op-1")
      markPending("cached")
      expect(getWriteState().reason).toBe(WRITE_BLOCK.unresolved)

      clearUnresolvedOperation()
      expect(getWriteState().reason).toBeNull()
    })
  })

  describe("recovery states", () => {
    it("keeps stale and schema conflict as separate blocks", () => {
      markStale("boom")
      expect(getWriteState().reason).toBe(WRITE_BLOCK.stale)
      markSchemaConflict("conflict")
      expect(getWriteState().reason).toBe(WRITE_BLOCK.schemaConflict)
    })

    it("does not overwrite the unresolved block with stale", () => {
      markUnresolvedOperation("op-2")
      markStale("boom")
      expect(getWriteState().reason).toBe(WRITE_BLOCK.unresolved)
    })
  })
})
