import "server-only"

async function admin() {
  return (await import("./supabaseAdmin")).supabaseAdmin
}

export async function claimFeatureWrite(userId, writeKey) {
  const { data, error } = await (await admin()).rpc("claim_feature_write", {
    p_user_id: userId,
    p_write_key: writeKey,
  })
  if (error) throw new Error(`Failed to claim feature write: ${error.message}`)
  return Boolean(data)
}

export async function releaseFeatureWrite(userId, writeKey) {
  const { data, error } = await (await admin()).rpc("release_feature_write", {
    p_user_id: userId,
    p_write_key: writeKey,
  })
  if (error) throw new Error(`Failed to release feature write: ${error.message}`)
  return Boolean(data)
}
