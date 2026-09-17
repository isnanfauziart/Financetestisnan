import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/sheets", () => ({ getSheetData: vi.fn() }))

const OPERATION_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"

beforeEach(async () => {
  vi.clearAllMocks()
  const { getSheetData } = await import("@/lib/sheets")
  getSheetData.mockResolvedValue([
    ["OperationId", "Kind", "RelatedId", "CommittedAt"],
    [OPERATION_ID, "transaction_create", "Pengeluaran!A9", "2026-08-11T02:00:00.000Z"],
  ])
})

afterEach(() => {
  vi.resetModules()
})

describe("operation receipts", () => {
  it("reads receipts with their sheet row", async () => {
    const { readOperationReceipts } = await import("@/lib/financialOperations")

    expect(await readOperationReceipts("token", "sheet")).toEqual([{
      rowIndex: 2,
      operationId: OPERATION_ID,
      kind: "transaction_create",
      relatedId: "Pengeluaran!A9",
      committedAt: "2026-08-11T02:00:00.000Z",
    }])
  })

  it("finds exactly one receipt", async () => {
    const { findOperationReceipt } = await import("@/lib/financialOperations")

    expect((await findOperationReceipt("token", "sheet", OPERATION_ID)).kind).toBe("transaction_create")
    expect(await findOperationReceipt("token", "sheet", "99999999-8888-4777-8666-555555555555")).toBeNull()
    expect(await findOperationReceipt("token", "sheet", "")).toBeNull()
  })

  it("treats a missing receipt tab as a knowable absence", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    getSheetData.mockRejectedValue(new Error("Sheets API error: {\"error\":{\"message\":\"Unable to parse range: _ArtamiOperations!A:D\"}}"))
    const { findOperationReceipt } = await import("@/lib/financialOperations")

    expect(await findOperationReceipt("token", "sheet", OPERATION_ID)).toBeNull()
  })

  it("propagates an unreadable receipt table instead of reporting absence", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    getSheetData.mockRejectedValue(new Error("Sheets API error: 503 Service Unavailable"))
    const { findOperationReceipt } = await import("@/lib/financialOperations")

    await expect(findOperationReceipt("token", "sheet", OPERATION_ID)).rejects.toThrow("503")
  })

  it("keeps the receipt row to the four documented columns", async () => {
    const { operationReceiptRow, RECEIPT_COLUMN_COUNT, OPERATION_KINDS } = await import("@/lib/financialOperations")

    const row = operationReceiptRow({
      operationId: OPERATION_ID,
      kind: OPERATION_KINDS.balanceCheckpoint,
      relatedId: "",
      committedAt: "2026-08-11T02:00:00.000Z",
    })

    expect(row).toEqual([OPERATION_ID, "balance_checkpoint", "", "2026-08-11T02:00:00.000Z"])
    expect(RECEIPT_COLUMN_COUNT).toBe(4)
  })
})
