import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
vi.mock("@/lib/featureGuard", () => ({ featureUnavailableResponse: vi.fn(() => null) }))
vi.mock("@/lib/sheets", () => ({
  appendSheetValues: vi.fn(),
  batchUpdateSheetValues: vi.fn(),
  ensureExpenseClassHeader: vi.fn(),
  findNextEmptyRow: vi.fn(),
  getSheetData: vi.fn(),
  parseRupiah: vi.fn(value => Number(value) || 0),
  updateSheetValues: vi.fn(),
}))
vi.mock("@/lib/recordQuota", () => ({
  claimRecordCreation: vi.fn(),
  releaseRecordCreation: vi.fn(),
}))
vi.mock("@/lib/transactionQuota", () => ({
  reserveTransaction: vi.fn(),
  releaseTransaction: vi.fn(),
  quotaErrorResponse: vi.fn(() => Response.json({ error: "quota" }, { status: 403 })),
}))
vi.mock("@/lib/writeClaims", () => ({
  claimFeatureWrite: vi.fn(),
  releaseFeatureWrite: vi.fn(),
}))
vi.mock("@/lib/financialSchema", async () => {
  const actual = await vi.importActual("@/lib/financialSchema")
  return { ...actual, ensureFinancialSchema: vi.fn() }
})
vi.mock("@/lib/financialOperations", async () => {
  const actual = await vi.importActual("@/lib/financialOperations")
  return { ...actual, findOperationReceipt: vi.fn() }
})

const OPERATION_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
const CHECKPOINT_ID = "1f0a3a3c-9f2e-4c0d-8a1b-2d3e4f5a6b7c"
const GOAL_ID = "g1"
const AUTH = { user: { id: "u1" }, accessToken: "token-1", spreadsheetId: "sheet-1", tier: "paid" }

function savingsRow({ id, amount, goalId = GOAL_ID, status = "allocated", remaining }) {
  const row = new Array(21).fill("")
  row[0] = "1 Agu 2026"
  row[1] = id
  row[2] = `Setoran ${id}`
  row[3] = "Tabungan Likuid"
  row[4] = amount
  row[8] = amount
  row[15] = goalId
  row[16] = status
  row[17] = remaining
  return row
}

const HEADER_ROW = new Array(21).fill("").map((_, index) => `K${index}`)

function savingsRows() {
  return [
    HEADER_ROW,
    savingsRow({ id: "SV1", amount: 200_000, remaining: 200_000 }),
    savingsRow({ id: "SV2", amount: 300_000, remaining: 100_000 }),
    savingsRow({ id: "SV3", amount: 500_000, goalId: "other", remaining: 500_000 }),
    savingsRow({ id: "SV4", amount: 400_000, status: "released", remaining: 0 }),
  ]
}

function spend(body) {
  return new Request("http://localhost/api/goals/spend", { method: "POST", body: JSON.stringify(body) })
}

async function batchWrites() {
  const { batchUpdateSheetValues } = await import("@/lib/sheets")
  return batchUpdateSheetValues.mock.calls[0]?.[2] || []
}

beforeEach(async () => {
  vi.clearAllMocks()
  const { getAuthContext } = await import("@/lib/apiAuth")
  const { batchUpdateSheetValues, ensureExpenseClassHeader, findNextEmptyRow, getSheetData } = await import("@/lib/sheets")
  const { claimRecordCreation, releaseRecordCreation } = await import("@/lib/recordQuota")
  const { reserveTransaction, releaseTransaction } = await import("@/lib/transactionQuota")
  const { claimFeatureWrite, releaseFeatureWrite } = await import("@/lib/writeClaims")
  const { ensureFinancialSchema } = await import("@/lib/financialSchema")
  const { findOperationReceipt } = await import("@/lib/financialOperations")

  const rows = savingsRows()

  getAuthContext.mockResolvedValue(AUTH)
  ensureExpenseClassHeader.mockResolvedValue(undefined)
  findNextEmptyRow.mockImplementation(async (token, sheetName) => (sheetName === "_ArtamiOperations" ? 2 : 7))
  batchUpdateSheetValues.mockResolvedValue({})
  claimRecordCreation.mockResolvedValue("lock-1")
  releaseRecordCreation.mockResolvedValue(undefined)
  reserveTransaction.mockResolvedValue({ userId: "u1", period: "2026-08", current: 1 })
  releaseTransaction.mockResolvedValue(undefined)
  claimFeatureWrite.mockResolvedValue(true)
  releaseFeatureWrite.mockResolvedValue(true)
  ensureFinancialSchema.mockResolvedValue({ applied: false })
  findOperationReceipt.mockResolvedValue(null)
  getSheetData.mockImplementation(async (token, range) => {
    if (String(range).startsWith("Tabungan!")) return rows
    if (String(range).startsWith("Settings!")) {
      return [["currentCashBalance", "1000000"], ["currentCashBalanceCheckpointId", CHECKPOINT_ID]]
    }
    return []
  })
})

afterEach(() => {
  vi.resetModules()
})

describe("goal-funded expense validation", () => {
  it("requires an operation id", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/goals/spend/route")

    const response = await POST(spend({ goalId: GOAL_ID, amount: 50_000, kategori: "Jajan" }))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("OPERATION_ID_REQUIRED")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("requires a goal, a category, and a positive amount", async () => {
    const { POST } = await import("@/app/api/goals/spend/route")

    const base = { operationId: OPERATION_ID, goalId: GOAL_ID, amount: 50_000, kategori: "Jajan" }
    const cases = [
      { ...base, goalId: "" },
      { ...base, kategori: "" },
      { ...base, amount: 0 },
      { ...base, amount: -1 },
      { ...base, amount: "banyak" },
      { ...base, tanggal: "2026-02-30" },
      { ...base, sifat: "Kadang" },
    ]

    for (const body of cases) {
      const response = await POST(spend(body))
      expect(response.status).toBe(400)
    }
  })

  it("refuses to spend more than the goal has remaining", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/goals/spend/route")

    const response = await POST(spend({ operationId: OPERATION_ID, goalId: GOAL_ID, amount: 400_000, kategori: "Jajan" }))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("INSUFFICIENT_ALLOCATION")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })
})

describe("goal-funded expense commit", () => {
  it("records one expense row and reduces the allocation by the same amount", async () => {
    const { POST } = await import("@/app/api/goals/spend/route")

    const response = await POST(spend({
      operationId: OPERATION_ID,
      goalId: GOAL_ID,
      amount: 250_000,
      kategori: "Jajan",
      keterangan: "Beli sepatu",
      akunBank: "BCA",
      tanggal: "2026-08-12",
      sifat: "Spesial",
    }))
    const body = await response.json()

    expect(body).toMatchObject({ success: true, status: "committed", goalId: GOAL_ID, amount: 250_000, fundedRows: 2 })

    const writes = await batchWrites()
    const expense = writes.find(entry => entry.range === "Pengeluaran!A7:T7")
    expect(expense).toBeTruthy()
    // A, B, C, D, E, H are date/id/desc/category/amount/account; P is Sifat.
    expect(expense.values[0][2]).toBe("Beli sepatu")
    expect(expense.values[0][3]).toBe("Jajan")
    expect(expense.values[0][4]).toBe(250_000)
    expect(expense.values[0][7]).toBe("BCA")
    expect(expense.values[0][15]).toBe("Spesial")
    // Q:R carry the checkpoint id and movement kind stamped by the schema layout.
    expect(expense.values[0]).toContain("goal_funded_expense")
    expect(expense.values[0]).toContain(GOAL_ID)
    expect(writes.find(entry => entry.range === "Tabungan!Q2:R2").values).toEqual([["allocated", 0]])
    expect(writes.find(entry => entry.range === "Tabungan!Q3:R3").values).toEqual([["allocated", 50_000]])
    expect(writes.some(entry => entry.range.startsWith("_ArtamiOperations!"))).toBe(true)
  })

  it("leaves other goals and released rows untouched", async () => {
    const { POST } = await import("@/app/api/goals/spend/route")

    await POST(spend({ operationId: OPERATION_ID, goalId: GOAL_ID, amount: 50_000, kategori: "Jajan" }))

    const writes = await batchWrites()
    expect(writes.some(entry => entry.range === "Tabungan!Q4:R4")).toBe(false)
    expect(writes.some(entry => entry.range === "Tabungan!Q5:R5")).toBe(false)
  })

  it("consumes exactly one transaction quota unit", async () => {
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    const { POST } = await import("@/app/api/goals/spend/route")

    await POST(spend({ operationId: OPERATION_ID, goalId: GOAL_ID, amount: 50_000, kategori: "Jajan" }))

    expect(reserveTransaction).toHaveBeenCalledTimes(1)
  })

  it("stamps the active checkpoint id so the funded amount is not double counted", async () => {
    const { POST } = await import("@/app/api/goals/spend/route")

    await POST(spend({ operationId: OPERATION_ID, goalId: GOAL_ID, amount: 50_000, kategori: "Jajan" }))

    const expense = (await batchWrites()).find(entry => entry.range === "Pengeluaran!A7:T7")
    expect(expense.values[0]).toContain(CHECKPOINT_ID)
  })

  it("returns already_committed for a replay without spending quota", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    const { findOperationReceipt } = await import("@/lib/financialOperations")
    findOperationReceipt.mockResolvedValue({
      rowIndex: 2, operationId: OPERATION_ID, kind: "goal_spend", relatedId: "Pengeluaran!A7", committedAt: "2026-08-12T02:00:00.000Z",
    })
    const { POST } = await import("@/app/api/goals/spend/route")

    const body = await (await POST(spend({ operationId: OPERATION_ID, goalId: GOAL_ID, amount: 50_000, kategori: "Jajan" }))).json()

    expect(body.status).toBe("already_committed")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
    expect(reserveTransaction).not.toHaveBeenCalled()
  })

  it("blocks a replayed spend against a different goal than the receipt", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { findOperationReceipt } = await import("@/lib/financialOperations")
    findOperationReceipt.mockResolvedValue({
      rowIndex: 2, operationId: OPERATION_ID, kind: "goal_spend", relatedId: "Pengeluaran!A7", committedAt: "2026-08-12T02:00:00.000Z",
    })
    const { POST } = await import("@/app/api/goals/spend/route")

    const body = await (await POST(spend({ operationId: OPERATION_ID, goalId: "other", amount: 50_000, kategori: "Jajan" }))).json()

    expect(body.status).toBe("already_committed")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("does not fall back to the provisional checkpoint when Settings is unreadable", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    const rows = savingsRows()
    getSheetData.mockImplementation(async (token, range) => {
      if (String(range).startsWith("Tabungan!")) return rows
      if (String(range).startsWith("Settings!")) throw new Error("Sheets API error: 503")
      return []
    })
    const { POST } = await import("@/app/api/goals/spend/route")

    const response = await POST(spend({ operationId: OPERATION_ID, goalId: GOAL_ID, amount: 50_000, kategori: "Jajan" }))

    expect(response.status).toBe(200)
    const expense = (await batchWrites()).find(entry => entry.range === "Pengeluaran!A7:T7")
    expect(expense.values[0]).not.toContain(CHECKPOINT_ID)
  })
})
