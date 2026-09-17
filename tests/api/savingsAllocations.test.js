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
vi.mock("@/lib/categories", async () => {
  const actual = await vi.importActual("@/lib/categories")
  return { ...actual, getLegacyCategories: vi.fn() }
})

const OPERATION_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
const GOAL_ID = "g1"
const AUTH = { user: { id: "u1" }, accessToken: "token-1", spreadsheetId: "sheet-1", tier: "free" }

const CATEGORIES = {
  expense: [],
  income: [],
  savings: [
    { name: "Tabungan Likuid", savingsKind: "liquid" },
    { name: "Reksadana", savingsKind: "investment" },
  ],
}

function savingsRow({ id, category, amount, goalId = "", status = "", remaining = "" }) {
  const row = new Array(21).fill("")
  row[0] = "1 Agu 2026"
  row[1] = id
  row[2] = `Setoran ${id}`
  row[3] = category
  row[4] = amount
  row[7] = "BCA"
  row[8] = amount
  row[15] = goalId
  row[16] = status
  row[17] = remaining
  return row
}

const HEADER_ROW = new Array(21).fill("").map((_, index) => `K${index}`)

function postSavings(body) {
  return new Request("http://localhost/api/savings/allocations", { method: "POST", body: JSON.stringify(body) })
}

function getSavings(query = "") {
  return new Request(`http://localhost/api/savings/allocations${query}`)
}

async function sheetRows() {
  return [
    HEADER_ROW,
    savingsRow({ id: "SV1", category: "Tabungan Likuid", amount: 500_000 }),
    savingsRow({ id: "SV2", category: "Reksadana", amount: 300_000 }),
    savingsRow({ id: "SV3", category: "Tabungan Likuid", amount: 200_000, goalId: GOAL_ID, status: "allocated", remaining: 150_000 }),
    savingsRow({ id: "SV4", category: "Tabungan Likuid", amount: 100_000, status: "released" }),
  ]
}

function fingerprintOf(rows, rowIndex) {
  const indexes = [0, 1, 2, 3, 4, 7, 8, 15, 16, 17]
  const cells = indexes.map(index => String(rows[rowIndex - 1]?.[index] ?? "").trim())
  return `sv:${rowIndex}:${cells.join("\u0001")}`
}

async function batchWrites() {
  const { batchUpdateSheetValues } = await import("@/lib/sheets")
  return batchUpdateSheetValues.mock.calls[0]?.[2] || []
}

beforeEach(async () => {
  vi.clearAllMocks()
  const { getAuthContext } = await import("@/lib/apiAuth")
  const { featureUnavailableResponse } = await import("@/lib/featureGuard")
  const { batchUpdateSheetValues, ensureExpenseClassHeader, findNextEmptyRow, getSheetData } = await import("@/lib/sheets")
  const { claimRecordCreation, releaseRecordCreation } = await import("@/lib/recordQuota")
  const { reserveTransaction, releaseTransaction } = await import("@/lib/transactionQuota")
  const { claimFeatureWrite, releaseFeatureWrite } = await import("@/lib/writeClaims")
  const { ensureFinancialSchema } = await import("@/lib/financialSchema")
  const { findOperationReceipt } = await import("@/lib/financialOperations")
  const { getLegacyCategories } = await import("@/lib/categories")

  const rows = await sheetRows()

  getAuthContext.mockResolvedValue(AUTH)
  featureUnavailableResponse.mockReturnValue(null)
  getLegacyCategories.mockReturnValue(CATEGORIES)
  ensureExpenseClassHeader.mockResolvedValue(undefined)
  findNextEmptyRow.mockImplementation(async (token, sheetName) => (sheetName === "_ArtamiOperations" ? 2 : 9))
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
    if (String(range).startsWith("Goals!")) return [["ID"], [GOAL_ID]]
    return []
  })
})

afterEach(() => {
  vi.resetModules()
})

describe("savings allocations list", () => {
  it("requires authentication", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    getAuthContext.mockResolvedValue(null)
    const { GET } = await import("@/app/api/savings/allocations/route")

    expect((await GET(getSavings())).status).toBe(401)
  })

  it("lists unreleased allocations with fingerprints and a summary", async () => {
    const { GET } = await import("@/app/api/savings/allocations/route")

    const body = await (await GET(getSavings())).json()

    expect(body.allocations.map(allocation => allocation.id)).toEqual(["SV1", "SV2", "SV3"])
    expect(body.allocations[0]).toMatchObject({ status: "reserved", remaining: 500_000, liquid: true, needsReview: false })
    expect(body.allocations[1]).toMatchObject({ savingsKind: "investment", investment: true })
    expect(body.allocations[0].fingerprint).toMatch(/^sv:2:/)
    expect(body.summary).toMatchObject({
      liquidUnassigned: 500_000,
      liquidAssigned: 150_000,
      investmentReserved: 300_000,
      releasedTotal: 100_000,
      unassignedCount: 2,
      allocatedCount: 1,
      estimate: false,
    })
  })

  it("can include released rows", async () => {
    const { GET } = await import("@/app/api/savings/allocations/route")

    const body = await (await GET(getSavings("?includeReleased=1"))).json()

    expect(body.allocations.map(allocation => allocation.id)).toEqual(["SV1", "SV2", "SV3", "SV4"])
  })

  it("flags unknown legacy classifications as needing review and marks the amount an estimate", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    const rows = await sheetRows()
    rows[2][3] = "Tabungan Misterius"
    getSheetData.mockImplementation(async (token, range) => {
      if (String(range).startsWith("Tabungan!")) return rows
      if (String(range).startsWith("Goals!")) return [["ID"], [GOAL_ID]]
      return []
    })
    const { GET } = await import("@/app/api/savings/allocations/route")

    const body = await (await GET(getSavings())).json()

    expect(body.allocations[1]).toMatchObject({ needsReview: true, savingsKind: null })
    expect(body.summary).toMatchObject({ estimate: true, needsReviewCount: 1, needsReviewTotal: 300_000 })
  })
})

describe("savings allocation assign", () => {
  it("requires an operation id", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/savings/allocations/route")

    const response = await POST(postSavings({ action: "assign", goalId: GOAL_ID, selections: [{ rowIndex: 2, fingerprint: "x" }] }))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("OPERATION_ID_REQUIRED")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("requires a goal", async () => {
    const { POST } = await import("@/app/api/savings/allocations/route")

    const response = await POST(postSavings({
      operationId: OPERATION_ID,
      action: "assign",
      selections: [{ rowIndex: 2, fingerprint: "x" }],
    }))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("GOAL_REQUIRED")
  })

  it("rejects an unknown goal before writing", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const rows = await sheetRows()
    const { POST } = await import("@/app/api/savings/allocations/route")

    const response = await POST(postSavings({
      operationId: OPERATION_ID,
      action: "assign",
      goalId: "missing-goal",
      selections: [{ rowIndex: 2, fingerprint: fingerprintOf(rows, 2) }],
    }))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("GOAL_NOT_FOUND")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("assigns the full amount as the remaining allocation", async () => {
    const rows = await sheetRows()
    const { POST } = await import("@/app/api/savings/allocations/route")

    const response = await POST(postSavings({
      operationId: OPERATION_ID,
      action: "assign",
      goalId: GOAL_ID,
      selections: [
        { rowIndex: 2, fingerprint: fingerprintOf(rows, 2) },
        { rowIndex: 3, fingerprint: fingerprintOf(rows, 3) },
      ],
    }))
    const body = await response.json()

    expect(body).toMatchObject({ success: true, status: "committed", action: "assign", updated: 2 })
    const writes = await batchWrites()
    const assignment = writes.find(entry => entry.range === "Tabungan!P2:R2")
    expect(assignment.values).toEqual([[GOAL_ID, "allocated", 500_000]])
    expect(writes.find(entry => entry.range === "Tabungan!P3:R3").values).toEqual([[GOAL_ID, "allocated", 300_000]])
    expect(writes.some(entry => entry.range.startsWith("_ArtamiOperations!"))).toBe(true)
  })

  it("preserves a partially consumed remaining allocation", async () => {
    const rows = await sheetRows()
    const { POST } = await import("@/app/api/savings/allocations/route")

    await POST(postSavings({
      operationId: OPERATION_ID,
      action: "assign",
      goalId: GOAL_ID,
      selections: [{ rowIndex: 4, fingerprint: fingerprintOf(rows, 4) }],
    }))

    expect((await batchWrites()).find(entry => entry.range === "Tabungan!P4:R4").values).toEqual([[GOAL_ID, "allocated", 150_000]])
  })

  it("writes nothing when any selected row changed", async () => {
    const rows = await sheetRows()
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/savings/allocations/route")

    const response = await POST(postSavings({
      operationId: OPERATION_ID,
      action: "assign",
      goalId: GOAL_ID,
      selections: [
        { rowIndex: 2, fingerprint: fingerprintOf(rows, 2) },
        { rowIndex: 3, fingerprint: "sv:3:stale" },
      ],
    }))

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body).toMatchObject({ code: "ALLOCATION_STALE", stale: true })
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("refuses to assign an already released row", async () => {
    const rows = await sheetRows()
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/savings/allocations/route")

    const response = await POST(postSavings({
      operationId: OPERATION_ID,
      action: "assign",
      goalId: GOAL_ID,
      selections: [{ rowIndex: 5, fingerprint: fingerprintOf(rows, 5) }],
    }))

    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe("ALLOCATION_STALE")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("rejects malformed selections", async () => {
    const { POST } = await import("@/app/api/savings/allocations/route")

    for (const selections of [undefined, [], [{ rowIndex: 1, fingerprint: "x" }], [{ rowIndex: 2, fingerprint: "" }]]) {
      const response = await POST(postSavings({ operationId: OPERATION_ID, action: "assign", goalId: GOAL_ID, selections }))
      expect(response.status).toBe(400)
    }
  })

  it("never consumes transaction quota", async () => {
    const rows = await sheetRows()
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    const { POST } = await import("@/app/api/savings/allocations/route")

    await POST(postSavings({
      operationId: OPERATION_ID,
      action: "assign",
      goalId: GOAL_ID,
      selections: [{ rowIndex: 2, fingerprint: fingerprintOf(rows, 2) }],
    }))

    expect(reserveTransaction).not.toHaveBeenCalled()
  })
})

describe("savings allocation release", () => {
  it("marks the row released and zeroes the remaining allocation", async () => {
    const rows = await sheetRows()
    const { POST } = await import("@/app/api/savings/allocations/route")

    const response = await POST(postSavings({
      operationId: OPERATION_ID,
      action: "release",
      selections: [{ rowIndex: 4, fingerprint: fingerprintOf(rows, 4) }],
    }))

    expect((await response.json())).toMatchObject({ status: "committed", action: "release", updated: 1 })
    expect((await batchWrites()).find(entry => entry.range === "Tabungan!Q4:R4").values).toEqual([["released", 0]])
  })

  it("does not require a goal for a release", async () => {
    const rows = await sheetRows()
    const { POST } = await import("@/app/api/savings/allocations/route")

    const response = await POST(postSavings({
      operationId: OPERATION_ID,
      action: "release",
      selections: [{ rowIndex: 2, fingerprint: fingerprintOf(rows, 2) }],
    }))

    expect(response.status).toBe(200)
  })
})

describe("savings allocation replay", () => {
  it("returns already_committed without writing again", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { findOperationReceipt } = await import("@/lib/financialOperations")
    const rows = await sheetRows()
    findOperationReceipt.mockResolvedValue({
      rowIndex: 2, operationId: OPERATION_ID, kind: "savings_assign", relatedId: GOAL_ID, committedAt: "2026-08-11T02:00:00.000Z",
    })
    const { POST } = await import("@/app/api/savings/allocations/route")

    const body = await (await POST(postSavings({
      operationId: OPERATION_ID,
      action: "assign",
      goalId: GOAL_ID,
      selections: [{ rowIndex: 2, fingerprint: fingerprintOf(rows, 2) }],
    }))).json()

    expect(body.status).toBe("already_committed")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })
})
