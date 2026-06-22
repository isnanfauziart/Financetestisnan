"use client"
import { useState, useEffect, useCallback, useSyncExternalStore } from "react"

// ─── Budgets shared cache ───────────────────────────────────────────
let budgetCache = null
let budgetParamsKey = null
let budgetListeners = new Set()
let budgetInFlight = null
let budgetError = null

function subscribeBudgets(listener) {
  budgetListeners.add(listener)
  return () => budgetListeners.delete(listener)
}

function getBudgetSnapshot() {
  return JSON.stringify({ data: budgetCache, key: budgetParamsKey, error: budgetError })
}

function notifyBudgets() {
  budgetListeners.forEach((fn) => fn())
}

async function fetchBudgets(month, year) {
  const params = new URLSearchParams()
  if (month) params.set("month", month)
  if (year) params.set("year", year)
  const url = `/api/budgets?${params.toString()}`
  const key = `${month || ""}|${year || ""}`

  if (budgetParamsKey === key && budgetCache !== null) return

  if (budgetInFlight) {
    await budgetInFlight
    if (budgetParamsKey === key) return
  }

  budgetError = null
  notifyBudgets()

  budgetInFlight = (async () => {
    try {
      const res = await fetch(url)
      const data = await res.json()
      budgetCache = data.budgets || []
      budgetParamsKey = key
    } catch (err) {
      budgetError = err.message
      budgetCache = []
      budgetParamsKey = key
    } finally {
      budgetInFlight = null
      notifyBudgets()
    }
  })()

  await budgetInFlight
}

/**
 * Shared budgets hook. Multiple components calling useBudgets with the same
 * params share a single fetch. The cache is module-scoped so any component
 * calling refetch() propagates the update to all subscribers.
 *
 * @param {string} [month]  — e.g. "Jun" or "" for all months
 * @param {string} [year]   — e.g. "2026" or "" for all years
 * @returns {{ budgets: Array, loading: boolean, error: string|null, refetch: () => Promise<void> }}
 */
export function useBudgets(month, year) {
  const monthParam = month || ""
  const yearParam = year || ""

  useEffect(() => {
    fetchBudgets(monthParam, yearParam)
  }, [monthParam, yearParam])

  const snapshot = useSyncExternalStore(subscribeBudgets, getBudgetSnapshot, getBudgetSnapshot)
  const parsed = JSON.parse(snapshot)
  const isLoading = parsed.key !== `${monthParam}|${yearParam}` || (parsed.data === null && parsed.error === null)

  const refetch = useCallback(async () => {
    budgetParamsKey = null
    budgetCache = null
    budgetError = null
    await fetchBudgets(monthParam, yearParam)
  }, [monthParam, yearParam])

  return {
    budgets: parsed.data || [],
    loading: isLoading,
    error: parsed.error,
    refetch,
  }
}

// ─── Goals shared cache ─────────────────────────────────────────────
let goalsCache = null
let goalsLoaded = false
let goalsListeners = new Set()
let goalsInFlight = null
let goalsError = null

function subscribeGoals(listener) {
  goalsListeners.add(listener)
  return () => goalsListeners.delete(listener)
}

function getGoalsSnapshot() {
  return JSON.stringify({ data: goalsCache, loaded: goalsLoaded, error: goalsError })
}

function notifyGoals() {
  goalsListeners.forEach((fn) => fn())
}

async function fetchGoalsInternal() {
  if (goalsLoaded && goalsCache !== null) return

  if (goalsInFlight) {
    await goalsInFlight
    return
  }

  goalsError = null
  notifyGoals()

  goalsInFlight = (async () => {
    try {
      const res = await fetch("/api/goals")
      const data = await res.json()
      if (res.ok) {
        goalsCache = data.goals || []
      } else {
        goalsError = data.error || "Gagal memuat goals"
        goalsCache = []
      }
      goalsLoaded = true
    } catch (err) {
      goalsError = err.message
      goalsCache = []
      goalsLoaded = true
    } finally {
      goalsInFlight = null
      notifyGoals()
    }
  })()

  await goalsInFlight
}

/**
 * Shared goals hook. Multiple components calling useGoals share a single
 * fetch. Calling refetch() propagates the update to all subscribers.
 *
 * @returns {{ goals: Array, loading: boolean, error: string|null, refetch: () => Promise<void> }}
 */
export function useGoals() {
  useEffect(() => {
    fetchGoalsInternal()
  }, [])

  const snapshot = useSyncExternalStore(subscribeGoals, getGoalsSnapshot, getGoalsSnapshot)
  const parsed = JSON.parse(snapshot)
  const isLoading = !parsed.loaded && parsed.data === null && parsed.error === null

  const refetch = useCallback(async () => {
    goalsLoaded = false
    goalsCache = null
    goalsError = null
    await fetchGoalsInternal()
  }, [])

  return {
    goals: parsed.data || [],
    loading: isLoading,
    error: parsed.error,
    refetch,
  }
}

// ─── Settings shared cache ─────────────────────────────────────────
let settingsCache = null
let settingsLoaded = false
let settingsListeners = new Set()
let settingsInFlight = null
let settingsError = null

function subscribeSettings(listener) {
  settingsListeners.add(listener)
  return () => settingsListeners.delete(listener)
}

function getSettingsSnapshot() {
  return JSON.stringify({ data: settingsCache, loaded: settingsLoaded, error: settingsError })
}

function notifySettings() {
  settingsListeners.forEach((fn) => fn())
}

async function fetchSettingsInternal() {
  if (settingsLoaded && settingsCache !== null) return

  if (settingsInFlight) {
    await settingsInFlight
    return
  }

  settingsError = null
  notifySettings()

  settingsInFlight = (async () => {
    try {
      const res = await fetch("/api/settings")
      const data = await res.json()
      if (res.ok) {
        settingsCache = data.settings || { startingBalance: 0, startingBalanceDate: "" }
      } else {
        settingsError = data.error || "Gagal memuat settings"
        settingsCache = { startingBalance: 0, startingBalanceDate: "" }
      }
      settingsLoaded = true
    } catch (err) {
      settingsError = err.message
      settingsCache = { startingBalance: 0, startingBalanceDate: "" }
      settingsLoaded = true
    } finally {
      settingsInFlight = null
      notifySettings()
    }
  })()

  await settingsInFlight
}

/**
 * Shared settings hook. Multiple components calling useSettings share a single
 * fetch. Calling refetch() propagates the update to all subscribers.
 *
 * @returns {{ settings: Object, loading: boolean, error: string|null, refetch: () => Promise<void> }}
 */
export function useSettings() {
  useEffect(() => {
    fetchSettingsInternal()
  }, [])

  const snapshot = useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getSettingsSnapshot)
  const parsed = JSON.parse(snapshot)
  const isLoading = !parsed.loaded && parsed.data === null && parsed.error === null

  const refetch = useCallback(async () => {
    settingsLoaded = false
    settingsCache = null
    settingsError = null
    await fetchSettingsInternal()
  }, [])

  return {
    settings: parsed.data || { startingBalance: 0, startingBalanceDate: "" },
    loading: isLoading,
    error: parsed.error,
    refetch,
  }
}

// ─── Debts shared cache ─────────────────────────────────────────────
let debtsCache = null
let debtsLoaded = false
let debtsListeners = new Set()
let debtsInFlight = null
let debtsError = null

function subscribeDebts(listener) {
  debtsListeners.add(listener)
  return () => debtsListeners.delete(listener)
}

function getDebtsSnapshot() {
  return JSON.stringify({ data: debtsCache, loaded: debtsLoaded, error: debtsError })
}

function notifyDebts() {
  debtsListeners.forEach((fn) => fn())
}

async function fetchDebtsInternal() {
  if (debtsLoaded && debtsCache !== null) return

  if (debtsInFlight) {
    await debtsInFlight
    return
  }

  debtsError = null
  notifyDebts()

  debtsInFlight = (async () => {
    try {
      const res = await fetch("/api/debts")
      const data = await res.json()
      if (res.ok) {
        debtsCache = data.debts || []
      } else {
        debtsError = data.error || "Gagal memuat utang"
        debtsCache = []
      }
      debtsLoaded = true
    } catch (err) {
      debtsError = err.message
      debtsCache = []
      debtsLoaded = true
    } finally {
      debtsInFlight = null
      notifyDebts()
    }
  })()

  await debtsInFlight
}

/**
 * Shared debts hook. Multiple components calling useDebts share a single
 * fetch. Calling refetch() propagates the update to all subscribers.
 *
 * @returns {{ debts: Array, loading: boolean, error: string|null, refetch: () => Promise<void> }}
 */
export function useDebts() {
  useEffect(() => {
    fetchDebtsInternal()
  }, [])

  const snapshot = useSyncExternalStore(subscribeDebts, getDebtsSnapshot, getDebtsSnapshot)
  const parsed = JSON.parse(snapshot)
  const isLoading = !parsed.loaded && parsed.data === null && parsed.error === null

  const refetch = useCallback(async () => {
    debtsLoaded = false
    debtsCache = null
    debtsError = null
    await fetchDebtsInternal()
  }, [])

  return {
    debts: parsed.data || [],
    loading: isLoading,
    error: parsed.error,
    refetch,
  }
}

// ─── Test helpers ───────────────────────────────────────────────────
// Reset caches between test runs. Not used in production.
export function _resetBudgetCache() {
  budgetCache = null
  budgetParamsKey = null
  budgetError = null
  budgetInFlight = null
  notifyBudgets()
}

export function _resetGoalsCache() {
  goalsCache = null
  goalsLoaded = false
  goalsError = null
  goalsInFlight = null
  notifyGoals()
}
