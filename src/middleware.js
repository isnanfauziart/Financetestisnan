import { NextResponse } from "next/server"
import { apiRateLimiter, createRateLimiter } from "@/lib/rateLimit"

const limiters = {
  normal: apiRateLimiter,
  auth: createRateLimiter({ limit: 60 }),
  payment: createRateLimiter({ limit: 10 }),
  destructive: createRateLimiter({ limit: 5 }),
}

function clientIp(request) {
  return request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown"
}

function categoryFor(request) {
  const pathname = new URL(request.url).pathname
  if (pathname.startsWith("/api/auth/")) return "auth"
  if (pathname.startsWith("/api/payments")
    || pathname.startsWith("/api/admin/payments")
    || pathname === "/api/download-apk") return "payment"
  if (pathname === "/api/account" && request.method === "DELETE") return "destructive"
  return "normal"
}

export function resetApiRateLimits() {
  Object.values(limiters).forEach((limiter) => limiter.clear())
}

export function middleware(request) {
  const category = categoryFor(request)
  const result = limiters[category].check(`${category}:${clientIp(request)}`)
  if (!result.allowed) {
    return NextResponse.json({
      error: "TOO_MANY_REQUESTS",
      message: "Terlalu banyak permintaan. Coba lagi sebentar.",
    }, {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/api/:path*"],
}
