function trimString(value) {
  return typeof value === "string" ? value.trim() : ""
}

export function getEffectiveUserName({ savedName, googleName, email } = {}) {
  return trimString(savedName) || trimString(googleName) || trimString(email)
}
