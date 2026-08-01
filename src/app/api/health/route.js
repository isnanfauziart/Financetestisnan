import { getEnvironmentStatus } from "@/lib/env"
import { requestHeaders } from "@/lib/logger"

export const dynamic = "force-dynamic"

export function GET(request) {
  const status = getEnvironmentStatus()
  const configured = status.configured
  return Response.json({
    ok: configured,
    configured,
    missing: status.missing,
    presentCount: status.presentCount,
    requiredCount: status.requiredCount,
    version: process.env.npm_package_version || null,
  }, { status: configured ? 200 : 503, headers: requestHeaders(request) })
}
