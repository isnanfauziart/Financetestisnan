import { describe, expect, it } from "vitest"
import { deriveOnboardingState, ONBOARDING_STEPS } from "@/app/dashboard/_components/useOnboardingState"

const settingsUnconfirmed = { startingBalance: 0, startingBalanceConfirmed: false }
const settingsRp0Confirmed = { startingBalance: 0, startingBalanceConfirmed: true }
const settingsRp50kConfirmed = { startingBalance: 50000, startingBalanceConfirmed: true }
const settingsStringTrue = { startingBalanceConfirmed: "true" }

describe("deriveOnboardingState", () => {
  it("gates a brand-new account with no transactions and no confirmed balance", () => {
    expect(
      deriveOnboardingState({ transactions: [], settings: settingsUnconfirmed }),
    ).toEqual({ ready: true, active: true, step: ONBOARDING_STEPS.balance })
  })

  it("resumes at the transaction step when the balance is confirmed but no transaction exists", () => {
    expect(
      deriveOnboardingState({ transactions: [], settings: settingsRp0Confirmed }),
    ).toEqual({ ready: true, active: true, step: ONBOARDING_STEPS.transaction })
  })

  it("resumes at the transaction step for a confirmed non-zero balance too", () => {
    expect(
      deriveOnboardingState({ transactions: [], settings: settingsRp50kConfirmed }),
    ).toEqual({ ready: true, active: true, step: ONBOARDING_STEPS.transaction })
  })

  it("accepts the Sheet's string 'true' confirmation", () => {
    expect(
      deriveOnboardingState({ transactions: [], settings: settingsStringTrue }),
    ).toEqual({ ready: true, active: true, step: ONBOARDING_STEPS.transaction })
  })

  it("never gates an account that has transactions — even with unknown settings", () => {
    const transactions = [{ id: "t1" }]
    expect(
      deriveOnboardingState({ transactions, settings: null }),
    ).toEqual({ ready: true, active: false, step: ONBOARDING_STEPS.balance })
    expect(
      deriveOnboardingState({ transactions, settings: settingsUnconfirmed, settingsError: "boom" }),
    ).toEqual({ ready: true, active: false, step: ONBOARDING_STEPS.balance })
  })

  it("fails closed while settings are unknown and there is no transaction proof", () => {
    expect(
      deriveOnboardingState({ transactions: [], settings: null }),
    ).toEqual({ ready: false, active: false, step: ONBOARDING_STEPS.balance })
    expect(
      deriveOnboardingState({ transactions: [], settings: settingsUnconfirmed, settingsLoading: true }),
    ).toEqual({ ready: false, active: false, step: ONBOARDING_STEPS.balance })
    expect(
      deriveOnboardingState({ transactions: [], settings: settingsUnconfirmed, settingsError: "gagal" }),
    ).toEqual({ ready: false, active: false, step: ONBOARDING_STEPS.balance })
  })

  it("treats missing or non-array transactions as none", () => {
    expect(
      deriveOnboardingState({ settings: settingsUnconfirmed }),
    ).toEqual({ ready: true, active: true, step: ONBOARDING_STEPS.balance })
    expect(
      deriveOnboardingState({ transactions: "nope", settings: settingsUnconfirmed }),
    ).toEqual({ ready: true, active: true, step: ONBOARDING_STEPS.balance })
  })

  it("treats empty-string and false confirmations as unconfirmed", () => {
    for (const settings of [
      { startingBalanceConfirmed: false },
      { startingBalanceConfirmed: "" },
      { startingBalanceConfirmed: "false" },
      {},
    ]) {
      expect(
        deriveOnboardingState({ transactions: [], settings }),
      ).toEqual({ ready: true, active: true, step: ONBOARDING_STEPS.balance })
    }
  })
})
