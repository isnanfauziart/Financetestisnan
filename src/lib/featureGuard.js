import { requestHeaders } from "./logger"

export function featureUnavailableResponse(auth, feature, request) {
  const access = auth?.featureAccess
  if (!access || !Object.prototype.hasOwnProperty.call(access, feature) || access[feature]) return null
  return Response.json({
    error: "FEATURE_DISABLED",
    message: "Fitur sedang tidak tersedia.",
    feature,
  }, { status: 403, headers: requestHeaders(request) })
}
