export class RequestValidationError extends Error {
  constructor(code, message = code) {
    super(message)
    this.name = "RequestValidationError"
    this.code = code
    this.status = code === "PAYLOAD_TOO_LARGE" ? 413 : 400
  }
}

export async function readJsonBody(request, { maxBytes = 64 * 1024 } = {}) {
  const text = await request.text()
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new RequestValidationError("PAYLOAD_TOO_LARGE")
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new RequestValidationError("INVALID_JSON")
  }
}

export function objectValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RequestValidationError("INVALID_OBJECT")
  }
  return value
}

export function boundedString(value, { required = false, max = 255 } = {}) {
  if (typeof value !== "string") {
    if (value == null && !required) return ""
    throw new RequestValidationError("INVALID_STRING")
  }
  const result = value.trim()
  if (required && !result) throw new RequestValidationError("INVALID_STRING")
  if (result.length > max) throw new RequestValidationError("INVALID_STRING")
  return result
}

export function booleanValue(value) {
  if (typeof value !== "boolean") throw new RequestValidationError("INVALID_BOOLEAN")
  return value
}

export function oneOf(value, allowed) {
  if (!allowed.includes(value)) throw new RequestValidationError("INVALID_OPTION")
  return value
}
