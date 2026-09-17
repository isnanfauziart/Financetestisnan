import { describe, expect, it, vi } from "vitest"

import {
  WRITE_OUTCOME,
  createOperationId,
  submitFinancialWrite,
  verifyFinancialOperation,
} from "@/lib/financialWriteClient"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

describe("operation ids", () => {
  it("generates a v4-shaped uuid", () => {
    expect(createOperationId()).toMatch(UUID)
    expect(createOperationId()).not.toBe(createOperationId())
  })
})

describe("financial write client", () => {
  it("submits once with a generated operation id and reports success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { success: true, status: "committed" }))

    const result = await submitFinancialWrite({ url: "/api/transaction", body: { jumlah: 1000 }, fetchImpl })

    expect(result).toMatchObject({ ok: true, outcome: WRITE_OUTCOME.ok, replayed: false })
    expect(result.operationId).toMatch(UUID)
    const sent = JSON.parse(fetchImpl.mock.calls[0][1].body)
    expect(sent.operationId).toBe(result.operationId)
    expect(sent.jumlah).toBe(1000)
  })

  it("keeps a caller-supplied operation id so a retry can be recognised", async () => {
    const operationId = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { success: true, status: "already_committed" }))

    const result = await submitFinancialWrite({ url: "/api/transaction", body: { operationId }, fetchImpl })

    expect(result).toMatchObject({ ok: true, replayed: true, operationId })
  })

  it("retries a busy write with the same id instead of inventing a new one", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse(409, { code: "FINANCIAL_WRITE_BUSY" }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, status: "committed" }))

    const result = await submitFinancialWrite({ url: "/api/transaction", body: {}, fetchImpl, retryDelayMs: 1 })

    expect(result.ok).toBe(true)
    const first = JSON.parse(fetchImpl.mock.calls[0][1].body).operationId
    const second = JSON.parse(fetchImpl.mock.calls[1][1].body).operationId
    expect(second).toBe(first)
  })

  it("does not retry an in-flight operation forever", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(409, { code: "OPERATION_IN_FLIGHT" }))

    const result = await submitFinancialWrite({ url: "/api/transaction", body: {}, fetchImpl, retryDelayMs: 1 })

    expect(result.ok).toBe(false)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it("surfaces validation failures without verification", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(400, { error: "Jumlah tidak valid", code: "INVALID_BILL" }))

    const result = await submitFinancialWrite({ url: "/api/bills/pay", body: {}, fetchImpl })

    expect(result).toMatchObject({ ok: false, outcome: WRITE_OUTCOME.failed, error: "Jumlah tidak valid" })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it("verifies once after a transport failure and accepts a committed receipt", async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(jsonResponse(200, { committed: true, resolved: true, status: "already_committed" }))

    const result = await submitFinancialWrite({ url: "/api/transaction", body: {}, fetchImpl })

    expect(result).toMatchObject({ ok: true, replayed: true })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[1][0]).toContain("/api/financial-operations/")
  })

  it("allows a retry when the receipt table proves nothing was committed", async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(jsonResponse(200, { committed: false, resolved: true, status: "not_committed" }))

    const result = await submitFinancialWrite({ url: "/api/transaction", body: {}, fetchImpl })

    expect(result).toMatchObject({ ok: false, outcome: WRITE_OUTCOME.retryable })
  })

  it("stops automatic retries when the outcome cannot be verified", async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(jsonResponse(200, { committed: null, resolved: false, status: "unresolved" }))

    const result = await submitFinancialWrite({ url: "/api/transaction", body: {}, fetchImpl })

    expect(result).toMatchObject({ ok: false, outcome: WRITE_OUTCOME.unresolved, error: "Status belum dapat dipastikan" })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it("never reports an absence when the lookup endpoint is missing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(404, { error: "Not found" }))

    const verification = await verifyFinancialOperation("3f2504e0-4f89-41d3-9a0c-0305e82c3301", { fetchImpl })

    expect(verification).toMatchObject({ resolved: false, committed: null })
  })
})
