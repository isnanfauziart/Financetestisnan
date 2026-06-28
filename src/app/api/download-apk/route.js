import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    // Get client info for tracking
    const userAgent = request.headers.get("user-agent") || ""
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown"

    // Log download to Supabase
    try {
      await supabaseAdmin.from("downloads").insert({
        user_agent: userAgent,
        ip_address: ip,
        downloaded_at: new Date().toISOString(),
      })
    } catch (err) {
      // Don't fail the download if tracking fails
      console.error("[DownloadAPK] Tracking error:", err.message)
    }

    // Redirect to the actual APK file
    return Response.redirect(new URL("/artami.apk", request.url), 302)
  } catch (err) {
    console.error("[DownloadAPK]", err)
    // Still redirect even if tracking fails
    return Response.redirect(new URL("/artami.apk", request.url), 302)
  }
}
