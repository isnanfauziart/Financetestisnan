import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/sheets", () => ({
  batchUpdateSheetValues: vi.fn(),
  findNextEmptyRow: vi.fn(),
}))

vi.mock("@/lib/recordQuota", () => ({
  claimRecordCreation: vi.fn(),
  releaseRecordCreation: vi.fn(),
}))

vi.mock("@/lib/writeClaims", () => ({
  claimFeatureWrite: vi.fn(),
  releaseFeatureWrite: vi.fn(),
}))

vi.mock("@/lib/transactionQuota", () => ({
  reserveTransaction: vi.fn(),
  releaseTransaction: vi.fn(),
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
const ACCESS_TOKEN = "token-1"
const SHEET_ID = "sheet-1"

const AUTH = {
  user: { id: "user-1" },
  accessToken: ACCESS_TOKEN,
  spreadsheetId: SHEET_ID,
  tier: "free",
  entitlementVerified: true,
}

const RECEIPT = {
  rowIndex: 2,
  operationId: OPERATION_ID,
  kind: "transaction_create",
  relatedId: "Pengeluaran!A5",
  committedAt: "2026-08-12T03:00:00.000Z",
}

async function load() {
  const sheets = await import("@/lib/sheets")
  const recordQuota = await import("@/lib/recordQuota")
  const writeClaims = await import("@/lib/writeClaims")
  const transactionQuota = await import("@/lib/transactionQuota")
  const financialSchema = await import("@/lib/financialSchema")
  const financialOperations = await import("@/lib/financialOperations")
  const pipeline = await import("@/lib/financialWrites")
  return { sheets, recordQuota, writeClaims, transactionQuota, financialSchema, financialOperations, pipeline }
}

beforeEach(async () => {
  const { sheets, recordQuota, writeClaims, transactionQuota, financialSchema, financialOperations } = await load()
  vi.clearAllMocks()
  sheets.findNextEmptyRow.mockResolvedValue(2)
  sheets.batchUpdateSheetValues.mockResolvedValue({})
  recordQuota.claimRecordCreation.mockResolvedValue("lock-token")
  recordQuota.releaseRecordCreation.mockResolvedValue(undefined)
  writeClaims.claimFeatureWrite.mockResolvedValue(true)
  writeClaims.releaseFeatureWrite.mockResolvedValue(true)
  transactionQuota.reserveTransaction.mockResolvedValue({ userId: "user-1", period: "2026-08", current: 1 })
  transactionQuota.releaseTransaction.mockResolvedValue(undefined)
  financialSchema.ensureFinancialSchema.mockResolvedValue({ applied: false })
  financialOperations.findOperationReceipt.mockResolvedValue(null)
})

afterEach(() => {
  vi.resetModules()
})

function prepare(overrides = {}) {
  return vi.fn().mockResolvedValue({
    data: [{ range: "Pengeluaran!A5:T5", values: [["1 Agu 2026"]] }],
    relatedId: "Pengeluaran!A5",
    response: { rowIndex: 5 },
    ...overrides,
  })
}

describe("financial write pipeline", () => {
  it("rejects a missing operation id before claiming anything", async () => {
    const { pipeline, writeClaims, recordQuota } = await load()

    await expect(pipeline.runFinancialWrite({ auth: AUTH, operationId: "", kind: "transaction_create", prepare: prepare() }))
      .rejects.toMatchObject({ code: "OPERATION_ID_REQUIRED" })
    expect(writeClaims.claimFeatureWrite).not.toHaveBeenCalled()
    expect(recordQuota.claimRecordCreation).not.toHaveBeenCalled()
  })

  it("commits the mutation and its receipt in one atomic call", async () => {
    const { pipeline, sheets, recordQuota, writeClaims, transactionQuota } = await load()

    const result = await pipeline.runFinancialWrite({
      auth: AUTH,
      operationId: OPERATION_ID,
      kind: "transaction_create",
      prepare: prepare(),
    })

    expect(result.replayed).toBe(false)
    expect(result.response).toMatchObject({ success: true, operationId: OPERATION_ID, status: "committed", rowIndex: 5 })

    expect(sheets.batchUpdateSheetValues).toHaveBeenCalledTimes(1)
    const [token, spreadsheetId, data, inputOption] = sheets.batchUpdateSheetValues.mock.calls[0]
    expect(token).toBe(ACCESS_TOKEN)
    expect(spreadsheetId).toBe(SHEET_ID)
    expect(inputOption).toBe("RAW")
    expect(data).toHaveLength(2)
    expect(data[0]).toEqual({ range: "Pengeluaran!A5:T5", values: [["1 Agu 2026"]] })
    expect(data[1].range).toBe("_ArtamiOperations!A2:D2")
    expect(data[1].values[0][0]).toBe(OPERATION_ID)
    expect(data[1].values[0][1]).toBe("transaction_create")
    expect(data[1].values[0][2]).toBe("Pengeluaran!A5")
    expect(data[1].values[0][3]).toBeTruthy()

    expect(transactionQuota.reserveTransaction).toHaveBeenCalledWith(AUTH)
    expect(recordQuota.releaseRecordCreation).toHaveBeenCalledWith("user-1", pipeline.FINANCIAL_LOCK_KEY, "lock-token")
    // The claim stays behind as the permanent replay marker.
    expect(writeClaims.releaseFeatureWrite).not.toHaveBeenCalled()
    expect(transactionQuota.releaseTransaction).not.toHaveBeenCalled()
  })

  it("returns already_committed without writing or consuming quota", async () => {
    const { pipeline, sheets, financialOperations, writeClaims, transactionQuota } = await load()
    financialOperations.findOperationReceipt.mockResolvedValue(RECEIPT)

    const result = await pipeline.runFinancialWrite({
      auth: AUTH,
      operationId: OPERATION_ID,
      kind: "transaction_create",
      prepare: prepare(),
    })

    expect(result.replayed).toBe(true)
    expect(result.response).toMatchObject({ status: "already_committed", operationId: OPERATION_ID, relatedId: "Pengeluaran!A5" })
    expect(sheets.batchUpdateSheetValues).not.toHaveBeenCalled()
    expect(transactionQuota.reserveTransaction).not.toHaveBeenCalled()
    expect(writeClaims.claimFeatureWrite).not.toHaveBeenCalled()
  })

  it("treats an in-flight operation as a retryable conflict", async () => {
    const { pipeline, writeClaims, sheets } = await load()
    writeClaims.claimFeatureWrite.mockResolvedValue(false)

    await expect(pipeline.runFinancialWrite({ auth: AUTH, operationId: OPERATION_ID, kind: "transaction_create", prepare: prepare() }))
      .rejects.toMatchObject({ code: "OPERATION_IN_FLIGHT", status: 409, retryable: true })
    expect(sheets.batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("resolves an in-flight operation that actually committed first", async () => {
    const { pipeline, writeClaims, financialOperations, sheets } = await load()
    writeClaims.claimFeatureWrite.mockResolvedValue(false)
    financialOperations.findOperationReceipt
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(RECEIPT)

    const result = await pipeline.runFinancialWrite({
      auth: AUTH,
      operationId: OPERATION_ID,
      kind: "transaction_create",
      prepare: prepare(),
    })

    expect(result.replayed).toBe(true)
    expect(result.response.status).toBe("already_committed")
    expect(sheets.batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("skips quota for operations that write no ledger row", async () => {
    const { pipeline, transactionQuota } = await load()

    await pipeline.runFinancialWrite({
      auth: AUTH,
      operationId: OPERATION_ID,
      kind: "balance_checkpoint",
      quotaUnits: 0,
      prepare: prepare(),
    })

    expect(transactionQuota.reserveTransaction).not.toHaveBeenCalled()
    expect(transactionQuota.releaseTransaction).not.toHaveBeenCalled()
  })

  it("fails closed when another financial write holds the lock", async () => {
    const { pipeline, recordQuota, writeClaims, transactionQuota, sheets } = await load()
    recordQuota.claimRecordCreation.mockResolvedValue(null)

    await expect(pipeline.runFinancialWrite({ auth: AUTH, operationId: OPERATION_ID, kind: "transaction_create", prepare: prepare() }))
      .rejects.toMatchObject({ code: "FINANCIAL_WRITE_BUSY", retryable: true })

    expect(sheets.batchUpdateSheetValues).not.toHaveBeenCalled()
    expect(transactionQuota.reserveTransaction).not.toHaveBeenCalled()
    expect(writeClaims.releaseFeatureWrite).toHaveBeenCalledWith("user-1", `op:${OPERATION_ID}`)
  })

  it("releases quota and the claim when the commit fails with no receipt", async () => {
    const { pipeline, sheets, transactionQuota, writeClaims, recordQuota } = await load()
    sheets.batchUpdateSheetValues.mockRejectedValue(new Error("Sheets API error: 500"))

    await expect(pipeline.runFinancialWrite({ auth: AUTH, operationId: OPERATION_ID, kind: "transaction_create", prepare: prepare() }))
      .rejects.toThrow("Sheets API error: 500")

    expect(transactionQuota.releaseTransaction).toHaveBeenCalled()
    expect(writeClaims.releaseFeatureWrite).toHaveBeenCalledWith("user-1", `op:${OPERATION_ID}`)
    expect(recordQuota.releaseRecordCreation).toHaveBeenCalled()
  })

  it("reports success when a failed response had already committed", async () => {
    const { pipeline, sheets, transactionQuota, writeClaims, financialOperations } = await load()
    sheets.batchUpdateSheetValues.mockRejectedValue(new Error("socket hang up"))
    financialOperations.findOperationReceipt
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(RECEIPT)

    const result = await pipeline.runFinancialWrite({
      auth: AUTH,
      operationId: OPERATION_ID,
      kind: "transaction_create",
      prepare: prepare(),
    })

    expect(result.resolvedAfterFailure).toBe(true)
    expect(result.response.status).toBe("committed")
    expect(transactionQuota.releaseTransaction).not.toHaveBeenCalled()
    expect(writeClaims.releaseFeatureWrite).not.toHaveBeenCalled()
  })

  it("keeps the claim and quota when the outcome stays unknown", async () => {
    const { pipeline, sheets, transactionQuota, writeClaims, financialOperations } = await load()
    sheets.batchUpdateSheetValues.mockRejectedValue(new Error("timeout"))
    financialOperations.findOperationReceipt
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("Sheets unavailable"))

    await expect(pipeline.runFinancialWrite({ auth: AUTH, operationId: OPERATION_ID, kind: "transaction_create", prepare: prepare() }))
      .rejects.toMatchObject({ code: "OPERATION_UNRESOLVED", status: 503, retryable: false, operationId: OPERATION_ID })

    expect(transactionQuota.releaseTransaction).not.toHaveBeenCalled()
    expect(writeClaims.releaseFeatureWrite).not.toHaveBeenCalled()
  })

  it("propagates a quota rejection without writing", async () => {
    const { pipeline, transactionQuota, sheets, writeClaims } = await load()
    transactionQuota.reserveTransaction.mockRejectedValue(Object.assign(new Error("FEATURE_LIMIT_REACHED"), { code: "FEATURE_LIMIT_REACHED" }))

    await expect(pipeline.runFinancialWrite({ auth: AUTH, operationId: OPERATION_ID, kind: "transaction_create", prepare: prepare() }))
      .rejects.toMatchObject({ code: "FEATURE_LIMIT_REACHED" })

    expect(sheets.batchUpdateSheetValues).not.toHaveBeenCalled()
    expect(writeClaims.releaseFeatureWrite).toHaveBeenCalled()
  })

  it("stops before writing when the spreadsheet schema conflicts", async () => {
    const { pipeline, financialSchema, sheets, writeClaims, transactionQuota } = await load()
    financialSchema.ensureFinancialSchema.mockRejectedValue(new financialSchema.SchemaConflictError({
      conflicts: [{ tab: "Pemasukan", column: "P", header: "CheckpointId", found: "Catatan" }],
    }))

    await expect(pipeline.runFinancialWrite({ auth: AUTH, operationId: OPERATION_ID, kind: "transaction_create", prepare: prepare() }))
      .rejects.toBeInstanceOf(financialSchema.SchemaConflictError)

    expect(sheets.batchUpdateSheetValues).not.toHaveBeenCalled()
    expect(transactionQuota.releaseTransaction).toHaveBeenCalled()
    expect(writeClaims.releaseFeatureWrite).toHaveBeenCalled()
  })

  it("refuses a write plan with nothing to save", async () => {
    const { pipeline, sheets, writeClaims } = await load()

    await expect(pipeline.runFinancialWrite({
      auth: AUTH,
      operationId: OPERATION_ID,
      kind: "transaction_create",
      prepare: prepare({ data: [] }),
    })).rejects.toMatchObject({ code: "FINANCIAL_WRITE_EMPTY" })

    expect(sheets.batchUpdateSheetValues).not.toHaveBeenCalled()
    expect(writeClaims.releaseFeatureWrite).toHaveBeenCalled()
  })

  it("looks up an operation without writing", async () => {
    const { pipeline, financialOperations, sheets } = await load()
    financialOperations.findOperationReceipt.mockResolvedValue(RECEIPT)

    const found = await pipeline.lookupFinancialOperation(ACCESS_TOKEN, SHEET_ID, OPERATION_ID)
    expect(found).toMatchObject({ resolved: true, committed: true, status: "already_committed" })

    financialOperations.findOperationReceipt.mockResolvedValue(null)
    const missing = await pipeline.lookupFinancialOperation(ACCESS_TOKEN, SHEET_ID, OPERATION_ID)
    expect(missing).toMatchObject({ resolved: true, committed: false, status: "not_committed" })
    expect(sheets.batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("rejects a malformed lookup id", async () => {
    const { pipeline } = await load()
    await expect(pipeline.lookupFinancialOperation(ACCESS_TOKEN, SHEET_ID, "nope"))
      .rejects.toMatchObject({ code: "OPERATION_ID_REQUIRED" })
  })
})

describe("financial write error responses", () => {
  it("maps every pipeline failure to a client-safe response", async () => {
    const { pipeline } = await load()

    const idError = await pipeline.financialWriteErrorResponse(new pipeline.FinancialWriteError("OPERATION_ID_REQUIRED", "x"))
    expect(idError.status).toBe(400)
    expect((await idError.json()).code).toBe("OPERATION_ID_REQUIRED")

    const inFlight = await pipeline.financialWriteErrorResponse(new pipeline.FinancialWriteError("OPERATION_IN_FLIGHT", "x"))
    expect(inFlight.status).toBe(409)
    expect(inFlight.headers.get("Retry-After")).toBe("2")

    const busy = await pipeline.financialWriteErrorResponse(new pipeline.FinancialWriteError("FINANCIAL_WRITE_BUSY", "x"))
    expect((await busy.json()).retryable).toBe(true)

    const unresolved = await pipeline.financialWriteErrorResponse(new pipeline.FinancialWriteError("OPERATION_UNRESOLVED", "x", { operationId: OPERATION_ID }))
    expect(unresolved.status).toBe(503)
    expect(await unresolved.json()).toMatchObject({ code: "OPERATION_UNRESOLVED", operationId: OPERATION_ID })
  })

  it("reports schema conflicts as a read-only state", async () => {
    const { pipeline, financialSchema } = await load()
    const error = new financialSchema.SchemaConflictError({
      conflicts: [{ tab: "Tabungan", column: "P", header: "GoalId", found: "Rencana" }],
    })

    const response = pipeline.financialWriteErrorResponse(error)
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: "Struktur Google Sheets perlu ditinjau agar data baru dapat disimpan",
      code: "SCHEMA_CONFLICT",
      readOnly: true,
      conflicts: [{ tab: "Tabungan", column: "P", expected: "GoalId" }],
    })
  })

  it("returns null for errors it does not own", async () => {
    const { pipeline } = await load()
    expect(pipeline.financialWriteErrorResponse(new Error("other"))).toBeNull()
  })

  it("validates operation ids", async () => {
    const { pipeline } = await load()
    expect(pipeline.isValidOperationId(OPERATION_ID)).toBe(true)
    expect(pipeline.isValidOperationId("  " + OPERATION_ID + "  ")).toBe(true)
    expect(pipeline.isValidOperationId("abc")).toBe(false)
    expect(pipeline.isValidOperationId(undefined)).toBe(false)
  })
})
