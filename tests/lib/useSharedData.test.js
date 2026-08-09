import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { _resetBudgetCache, useBudgets } from "@/lib/useSharedData"

const originalFetch = global.fetch

describe("useBudgets shared cache", () => {
  beforeEach(() => {
    act(() => _resetBudgetCache())
  })

  afterEach(() => {
    act(() => _resetBudgetCache())
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
})
