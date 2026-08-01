function safeIncomingId(value) {
  const id = String(value || "")
  return /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : null
}

export function getRequestId(request) {
  const incoming = safeIncomingId(request?.headers?.get?.("x-request-id"))
  if (incoming) return incoming
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function logError(scope, error, request) {
  console.error(`[${scope}]`, JSON.stringify({
    requestId: getRequestId(request),
    error: error?.name || "Error",
    code: error?.code || "INTERNAL_ERROR",
  }))
}

export function requestHeaders(request) {
  return { "X-Request-Id": getRequestId(request) }
}
