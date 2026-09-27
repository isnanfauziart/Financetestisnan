export function isFeatureEnabled(entitlement, key) {
  if (entitlement === null || entitlement?.entitlementVerified === false) return false

  const availability = entitlement?.featureAvailability
  if (availability && Object.prototype.hasOwnProperty.call(availability, key)) return Boolean(availability[key])

  const access = entitlement?.featureAccess
  if (access && Object.prototype.hasOwnProperty.call(access, key)) return Boolean(access[key])

  return true
}

/**
 * Wave 8 — resolved gate state for rendering decisions.
 *
 * Distinct from hasFeature/isFeatureEnabled booleans: callers need to know WHY
 * something is hidden so they can render the right placeholder. `null`
 * entitlement means /api/me has not answered yet → "unresolved" (render a
 * neutral placeholder, never "tidak tersedia"). An explicit server answer that
 * denies availability stays "unavailable" (fail-closed), a tier answer stays
 * "locked" (show the Pro preview).
 */
export function getFeatureGate(entitlement, key) {
  if (entitlement === null || entitlement?.entitlementVerified === false) return "unresolved"
  if (!isFeatureEnabled(entitlement, key)) return "unavailable"
  if (!hasFeature(entitlement, key)) return "locked"
  return "enabled"
}

export function hasFeature(entitlement, key) {
  if (!isFeatureEnabled(entitlement, key)) return false

  const legacy = entitlement?.features
  if (legacy && Object.prototype.hasOwnProperty.call(legacy, key)) {
    return Boolean(legacy[key]) || Boolean(entitlement?.isAdmin)
  }

  return true
}

export function isProRegistrationOpen(entitlement) {
  if (entitlement === null || entitlement === undefined) return true
  const availability = entitlement?.featureAvailability
  if (availability && Object.prototype.hasOwnProperty.call(availability, "proRegistration")) return Boolean(availability.proRegistration)
  const access = entitlement?.featureAccess
  if (access && Object.prototype.hasOwnProperty.call(access, "proRegistration")) return Boolean(access.proRegistration)
  return true
}
