import { describe, expect, it } from "vitest"

import {
  CHECKPOINT_KEYS,
  buildCheckpointSettingsRows,
  createCheckpointId,
  isValidCheckpointId,
  parseCheckpointBalance,
  parseConfirmedFlag,
  readCheckpointSettings,
  resolveCheckpoint,
} from "@/lib/checkpoint"

const VALID_ID = "1f0a3a3c-9f2e-4c0d-8a1b-2d3e4f5a6b7c"

describe("checkpoint identity", () => {
  it("mints unique valid checkpoint ids", () => {
    const first = createCheckpointId()
    const second = createCheckpointId()

    expect(isValidCheckpointId(first)).toBe(true)
    expect(isValidCheckpointId(second)).toBe(true)
    expect(first).not.toBe(second)
  })

  it("rejects anything that is not a uuid", () => {
    expect(isValidCheckpointId("")).toBe(false)
    expect(isValidCheckpointId("checkpoint-1")).toBe(false)
    expect(isValidCheckpointId("  " + VALID_ID + "  ")).toBe(true)
  })

  it("parses a confirmed flag from sheet text", () => {
    expect(parseConfirmedFlag("true")).toBe(true)
    expect(parseConfirmedFlag("TRUE")).toBe(true)
    expect(parseConfirmedFlag("false")).toBe(false)
    expect(parseConfirmedFlag("")).toBe(false)
    expect(parseConfirmedFlag(undefined)).toBe(false)
  })

  it("treats a blank balance as missing and Rp0 as a real value", () => {
    expect(parseCheckpointBalance("")).toBeNull()
    expect(parseCheckpointBalance(null)).toBeNull()
    expect(parseCheckpointBalance("0")).toBe(0)
    expect(parseCheckpointBalance(0)).toBe(0)
    expect(parseCheckpointBalance("2.500.000")).toBe(2_500_000)
    expect(parseCheckpointBalance("Rp 2.500.000")).toBe(2_500_000)
  })

  it("rejects unparseable text instead of saving an empty balance", () => {
    expect(parseCheckpointBalance("banyak")).toBeNull()
    expect(parseCheckpointBalance("-")).toBeNull()
    expect(parseCheckpointBalance(true)).toBeNull()
  })

  it("rejects negative balances", () => {
    expect(parseCheckpointBalance("-1")).toBeNull()
    expect(parseCheckpointBalance("-2.500.000")).toBeNull()
  })
})

describe("checkpoint settings", () => {
  it("reads the checkpoint keys case-insensitively", () => {
    const state = readCheckpointSettings([
      ["StartingBalance", "1000000"],
      ["currentcashbalance", "2500000"],
      ["CurrentCashBalanceCheckpointId", VALID_ID],
      ["currentcashbalancerecordedat", "2026-08-10T02:00:00.000Z"],
      ["startingbalanceconfirmed", "true"],
    ])

    expect(state).toEqual({
      balance: 2_500_000,
      checkpointId: VALID_ID,
      recordedAt: "2026-08-10T02:00:00.000Z",
      startingBalanceConfirmed: true,
    })
  })

  it("requires both a balance and a valid id before a checkpoint counts as saved", () => {
    expect(resolveCheckpoint({ balance: 2_500_000, checkpointId: "" })).toMatchObject({ saved: false, provisional: true, balance: null })
    expect(resolveCheckpoint({ balance: null, checkpointId: VALID_ID })).toMatchObject({ saved: false, provisional: true })
    expect(resolveCheckpoint({ balance: 2_500_000, checkpointId: "not-a-uuid" })).toMatchObject({ saved: false, provisional: true })
  })

  it("treats a confirmed Rp0 checkpoint as saved rather than incomplete", () => {
    const resolved = resolveCheckpoint({ balance: 0, checkpointId: VALID_ID, recordedAt: "2026-08-10T02:00:00.000Z" })

    expect(resolved).toEqual({
      saved: true,
      provisional: false,
      balance: 0,
      checkpointId: VALID_ID,
      recordedAt: "2026-08-10T02:00:00.000Z",
      startingBalanceConfirmed: false,
    })
  })

  it("writes the three expected settings rows", () => {
    expect(buildCheckpointSettingsRows({ balance: 0, checkpointId: VALID_ID, recordedAt: "2026-08-10T02:00:00.000Z" })).toEqual([
      [CHECKPOINT_KEYS.balance, "0"],
      [CHECKPOINT_KEYS.checkpointId, VALID_ID],
      [CHECKPOINT_KEYS.recordedAt, "2026-08-10T02:00:00.000Z"],
    ])
  })
})
