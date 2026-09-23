/**
 * Wave 4 — Required guided first use.
 *
 * Decision (approved): the new-account rule is Sheet-derived. Onboarding is
 * required only when the account has ZERO transactions and the opening balance
 * was never confirmed. No Supabase signal, no deploy-date cutoff, no migration.
 *
 * Fails closed on unknown state: while settings are loading or errored the
 * derivation is `ready: false` and the shell waits instead of guessing —
 * except when the account already has transactions, which proves onboarding
 * completed, so an existing user is never blocked by a settings hiccup.
 */

export const ONBOARDING_STEPS = {
  balance: "balance",
  transaction: "transaction",
  optional: "optional",
}

function isConfirmed(value) {
  return value === true || value === "true"
}

/**
 * @param {{
 *   transactions?: Array,
 *   settings?: object | null,
 *   settingsLoading?: boolean,
 *   settingsError?: string | null,
 * }} input
 * @returns {{
 *   ready: boolean,
 *   active: boolean,
 *   step: "balance" | "transaction",
 * }}
 */
export function deriveOnboardingState({ transactions, settings, settingsLoading, settingsError } = {}) {
  const hasTransactions = Array.isArray(transactions) && transactions.length > 0

  // An account with transactions has provably completed the required steps.
  if (hasTransactions) return { ready: true, active: false, step: ONBOARDING_STEPS.balance }

  if (settingsLoading || settingsError || !settings) {
    return { ready: false, active: false, step: ONBOARDING_STEPS.balance }
  }

  if (isConfirmed(settings.startingBalanceConfirmed)) {
    return { ready: true, active: true, step: ONBOARDING_STEPS.transaction }
  }

  return { ready: true, active: true, step: ONBOARDING_STEPS.balance }
}
