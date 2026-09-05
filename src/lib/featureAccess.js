export function isFeatureEnabled(entitlement, key) {
  if (entitlement === null || entitlement?.entitlementVerified === false) return false

  const availability = entitlement?.featureAvailability
  if (availability && Object.prototype.hasOwnProperty.call(availability, key)) return Boolean(availability[key])

  const access = entitlement?.featureAccess
  if (access && Object.prototype.hasOwnProperty.call(access, key)) return Boolean(access[key])

  return true
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
