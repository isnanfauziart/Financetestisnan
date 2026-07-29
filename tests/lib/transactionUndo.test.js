import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createUndoToken, verifyUndoToken } from "../../src/lib/transactionUndo"

describe("transaction undo token", () => {
  beforeEach(() => { process.env.NEXTAUTH_SECRET = "test-secret" })
  afterEach(() => { delete process.env.NEXTAUTH_SECRET })

  it("binds the exact row to user and sheet for 30 seconds", () => {
    const input = { userId: "u1", spreadsheetId: "s1", tab: "Pengeluaran", rowIndex: 7, row: ["1 Jul 2026", "id"] }
    const token = createUndoToken(input, 1_000)
    expect(verifyUndoToken(token, input, 30_999)).toMatchObject(input)
    expect(() => verifyUndoToken(token, { userId: "u2", spreadsheetId: "s1" }, 2_000)).toThrow()
    expect(() => verifyUndoToken(token, input, 31_001)).toThrow()
    expect(() => verifyUndoToken(token + "x", input, 2_000)).toThrow()
  })
})
