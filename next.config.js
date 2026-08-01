/** @type {import('next').NextConfig} */
const REQUIRED_RUNTIME_ENV_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "LEGACY_SHEET_OWNER_EMAIL",
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
  "NEXT_PUBLIC_GOOGLE_PICKER_API_KEY",
  "NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]

if (process.env.NODE_ENV === "production") {
  const missing = REQUIRED_RUNTIME_ENV_VARS.filter((name) => !String(process.env[name] || "").trim())
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`)
  }
}

const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
