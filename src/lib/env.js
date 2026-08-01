export const REQUIRED_ENV_VARS = [
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

function hasValue(value) {
  return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null
}

export function getEnvironmentStatus(env = process.env) {
  const missing = REQUIRED_ENV_VARS.filter(name => !hasValue(env[name]))
  return {
    configured: missing.length === 0,
    missing,
    presentCount: REQUIRED_ENV_VARS.length - missing.length,
    requiredCount: REQUIRED_ENV_VARS.length,
  }
}

export function validateEnvironment(env = process.env, { nodeEnv = process.env.NODE_ENV, warn = console.warn } = {}) {
  const status = getEnvironmentStatus(env)
  if (!status.configured) {
    const message = `Missing required environment variables: ${status.missing.join(", ")}`
    if (nodeEnv === "production") throw new Error(message)
    if (nodeEnv !== "test") warn(message)
  }
  return { ...status, valid: status.configured }
}
