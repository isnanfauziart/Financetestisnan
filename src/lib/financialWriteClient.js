/**
 * Client half of the protected financial-write pipeline.
 *
 * One operation id is generated before submitting and kept while the outcome is
 * resolved. The same id is reused for a safe retry, so the server can answer
 * `already_committed` instead of writing a second row. When the browser cannot
 * tell whether the request landed, exactly one verification runs; only an
 * unreadable receipt table leaves the operation pending for `Periksa lagi`.
 */

export const WRITE_OUTCOME = {
  ok: "ok",
  retryable: "retryable",
  unresolved: "unresolved",
  failed: "failed",
}

export const WRITE_MESSAGES = {
  unresolved: "Status belum dapat dipastikan",
  unresolvedHint: "Periksa lagi sebelum menyimpan perubahan lain.",
  retryable: "Penyimpanan lain sedang diproses. Coba lagi sebentar.",
  offline: "Tidak ada koneksi internet.",
  schemaConflict: "Struktur Google Sheets perlu ditinjau agar data baru dapat disimpan.",
  stale: "Data belum tersinkron. Muat ulang dulu sebelum menyimpan.",
  alreadyCommitted: "Perubahan ini memang sudah tersimpan.",
}

/** Codes that mean "retry the very same operation id" rather than "give up". */
const RETRYABLE_CODES = ["FINANCIAL_WRITE_BUSY", "OPERATION_IN_FLIGHT"]

export function createOperationId() {
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : null
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") return cryptoObj.randomUUID()
  const bytes = new Uint8Array(16)
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") cryptoObj.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

/**
 * @returns {Promise<{ok: boolean, outcome: string, operationId: string, data: object|null, error: string}>}
 */
export async function submitFinancialWrite({
  url,
  method = "POST",
  body = {},
  fetchImpl,
  retryDelayMs = 1200,
  attempts = 2,
}) {
  const request = fetchImpl || (typeof fetch !== "undefined" ? fetch : null)
  const operationId = String(body.operationId || "").trim() || createOperationId()
  if (!request) {
    return { ok: false, outcome: WRITE_OUTCOME.failed, operationId, error: "Fetch tidak tersedia", data: null }
  }

  let response = null
  let data = null
  let transportError = null

  try {
    response = await request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, operationId }),
    })
    data = await readJson(response)
  } catch (error) {
    transportError = error
  }

  if (!transportError && response) {
    if (response.ok) {
      return {
        ok: true,
        outcome: WRITE_OUTCOME.ok,
        operationId,
        data,
        replayed: data?.status === "already_committed",
        error: "",
      }
    }

    const code = data?.code || ""
    if (response.status === 409 && RETRYABLE_CODES.includes(code) && attempts > 1) {
      await delay(retryDelayMs)
      return submitFinancialWrite({ url, method, body: { ...body, operationId }, fetchImpl: request, retryDelayMs, attempts: attempts - 1 })
    }

    return {
      ok: false,
      outcome: WRITE_OUTCOME.failed,
      operationId,
      data,
      error: data?.error || "Gagal menyimpan",
      code,
    }
  }

  // The browser cannot tell whether the request landed, so verify exactly once.
  const verification = await verifyFinancialOperation(operationId, { fetchImpl: request })
  if (verification.committed) {
    return { ok: true, outcome: WRITE_OUTCOME.ok, operationId, data: verification.data, replayed: true, error: "" }
  }
  if (!verification.resolved) {
    return { ok: false, outcome: WRITE_OUTCOME.unresolved, operationId, data: verification.data, error: WRITE_MESSAGES.unresolved }
  }
  return {
    ok: false,
    outcome: WRITE_OUTCOME.retryable,
    operationId,
    data: verification.data,
    error: WRITE_MESSAGES.retryable,
  }
}

/**
 * Read-only status check used by an automatic verification and by `Periksa lagi`.
 * A missing or unreachable lookup endpoint reports `resolved: false` so the UI
 * never claims an operation was definitely not committed.
 */
export async function verifyFinancialOperation(operationId, { fetchImpl } = {}) {
  const request = fetchImpl || (typeof fetch !== "undefined" ? fetch : null)
  if (!request || !operationId) return { resolved: false, committed: null, data: null }
  try {
    const response = await request(`/api/financial-operations/${encodeURIComponent(operationId)}`, { headers: { Accept: "application/json" } })
    const data = await readJson(response)
    if (!response.ok || !data) return { resolved: false, committed: null, data }
    return { resolved: data.resolved !== false, committed: Boolean(data.committed), data }
  } catch {
    return { resolved: false, committed: null, data: null }
  }
}
