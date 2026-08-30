import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { _resetBillsCache, _resetBudgetCache, _resetGoalsCache, _resetSettingsCache, useBills, useBudgets, useGoals, useSettings } from "@/lib/useSharedData"

const originalFetch = global.fetch

describe("useBudgets shared cache", () => {
  beforeEach(() => {
    act(() => {
      _resetBudgetCache()
      _resetGoalsCache()
      _resetBillsCache()
      _resetSettingsCache()
    })
  })

  afterEach(() => {
    act(() => {
      _resetBudgetCache()
      _resetGoalsCache()
      _resetBillsCache()
      _resetSettingsCache()
    })
    global.fetch = originalFetch
  })

  it("keeps responses separate for different month and year keys", async () => {
    const pending = {}
    global.fetch = vi.fn((url) => {
      const params = new URL(url, "http://localhost").searchParams
      const month = params.get("month")
      const year = params.get("year")

      return new Promise(resolve => {
        pending[`${month} ${year}`] = resolve
      })
    })

    let july
    let june
    await act(async () => {
      july = renderHook(() => useBudgets("Jul", "2026"))
      june = renderHook(() => useBudgets("Jun", "2026"))
    })

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))

    await act(async () => {
      pending["Jul 2026"]({
        ok: true,
        json: async () => ({ budgets: [{ kategori: "Jul 2026", limit: 100000 }] }),
      })
      pending["Jun 2026"]({
        ok: true,
        json: async () => ({ budgets: [{ kategori: "Jun 2026", limit: 100000 }] }),
      })
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    await act(async () => {
      await waitFor(() => {
        expect(july.result.current.loading).toBe(false)
        expect(june.result.current.loading).toBe(false)
      })
    })

    expect(july.result.current.budgets).toEqual([{ kategori: "Jul 2026", limit: 100000 }])
    expect(june.result.current.budgets).toEqual([{ kategori: "Jun 2026", limit: 100000 }])
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it("clears settings and bills snapshots when the account scope changes", async () => {
    const settingsByAccount = {
      "user-a": { userName: "Ayu" },
      "user-b": { userName: "Bima" },
    }
    const billsByAccount = {
      "user-a": [{ id: "bill-a", nama: "A bill" }],
      "user-b": [{ id: "bill-b", nama: "B bill" }],
    }
    let settingsAccount = "user-a"
    let billsAccount = "user-a"
    global.fetch = vi.fn((url) => Promise.resolve({
      ok: true,
      json: async () => url === "/api/settings"
        ? { settings: settingsByAccount[settingsAccount] }
        : { bills: billsByAccount[billsAccount] },
    }))

    const settingsHook = renderHook(({ account }) => useSettings(account), { initialProps: { account: "user-a" } })
    const billsHook = renderHook(({ account }) => useBills(true, account), { initialProps: { account: "user-a" } })

    await waitFor(() => {
      expect(settingsHook.result.current.settings.userName).toBe("Ayu")
      expect(billsHook.result.current.bills).toEqual([{ id: "bill-a", nama: "A bill" }])
    })

    settingsAccount = "user-b"
    billsAccount = "user-b"
    settingsHook.rerender({ account: "user-b" })
    billsHook.rerender({ account: "user-b" })

    expect(settingsHook.result.current.settings.userName).toBe("")
    expect(billsHook.result.current.bills).toEqual([])

    await waitFor(() => {
      expect(settingsHook.result.current.settings.userName).toBe("Bima")
      expect(billsHook.result.current.bills).toEqual([{ id: "bill-b", nama: "B bill" }])
    })
  })

  it("keeps goals and budgets separate when the account scope changes", async () => {
    let account = "user-a"
    global.fetch = vi.fn((url) => Promise.resolve({
      ok: true,
      json: async () => url.startsWith("/api/goals")
        ? { goals: [{ id: `goal-${account}` }] }
        : { budgets: [{ kategori: `budget-${account}`, limit: 100000 }] },
    }))

    const goalsHook = renderHook(({ scope }) => useGoals(scope), { initialProps: { scope: "user-a" } })
    const budgetsHook = renderHook(({ scope }) => useBudgets("Jul", "2026", scope), { initialProps: { scope: "user-a" } })
    await waitFor(() => {
      expect(goalsHook.result.current.goals).toEqual([{ id: "goal-user-a" }])
      expect(budgetsHook.result.current.budgets).toEqual([{ kategori: "budget-user-a", limit: 100000 }])
    })

    account = "user-b"
    goalsHook.rerender({ scope: "user-b" })
    budgetsHook.rerender({ scope: "user-b" })

    expect(goalsHook.result.current.goals).toEqual([])
    expect(budgetsHook.result.current.budgets).toEqual([])
    await waitFor(() => {
      expect(goalsHook.result.current.goals).toEqual([{ id: "goal-user-b" }])
      expect(budgetsHook.result.current.budgets).toEqual([{ kategori: "budget-user-b", limit: 100000 }])
    })
  })
})
