"use client"
import { createContext, useContext, useState, useEffect, useCallback, useSyncExternalStore } from "react"
import { getLegacyCategories } from "@/lib/categories"

export const SharedDataScopeContext = createContext("")

const EMPTY_SETTINGS = {
  startingBalance: 0,
  startingBalanceDate: "",
  userName: "",
  userNamePromptDismissed: false,
  financialFreedomMonthlyExpenseOverride: null,
  recurringExpenseDismissals: [],
  categories: getLegacyCategories(),
}

// ─── Budgets shared cache ───────────────────────────────────────────
const budgetEntries = new Map()
let budgetListeners = new Set()
let budgetSnapshotVersion = 0

function subscribeBudgets(listener) {
  budgetListeners.add(listener)
  return () => budgetListeners.delete(listener)
}

function getBudgetSnapshot() {
  return budgetSnapshotVersion
}

function getBudgetEntry(key) {
  let entry = budgetEntries.get(key)
  if (!entry) {
    entry = { data: null, error: null, inFlight: null, requestVersion: 0 }
    budgetEntries.set(key, entry)
  }
  return entry
}

function notifyBudgets() {
  budgetSnapshotVersion += 1
  budgetListeners.forEach((fn) => fn())
}

async function fetchBudgets(month, year, scope) {
  const params = new URLSearchParams()
  if (month) params.set("month", month)
  if (year) params.set("year", year)
  const url = `/api/budgets?${params.toString()}`
  const key = `${scope}|${month || ""}|${year || ""}`
  const entry = getBudgetEntry(key)

  if (entry.data !== null) return

  if (entry.inFlight) {
    await entry.inFlight
    return
  }

  if (entry.error !== null) {
    entry.error = null
    notifyBudgets()
  }

  const requestVersion = entry.requestVersion
  const request = (async () => {
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (requestVersion !== entry.requestVersion) return
      if (res.ok) {
        entry.data = data.budgets || []
      } else {
        entry.error = data.error || "Gagal memuat budget"
        entry.data = []
      }
    } catch (err) {
      if (requestVersion !== entry.requestVersion) return
      entry.error = err.message
      entry.data = []
    } finally {
      if (requestVersion === entry.requestVersion) {
        entry.inFlight = null
        notifyBudgets()
      }
    }
  })()
  entry.inFlight = request

  await request
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
export function useBudgets(month, year, scopeKey) {
  const monthParam = month || ""
  const yearParam = year || ""
  const contextScope = useContext(SharedDataScopeContext)
  const scope = scopeKey || contextScope || ""
  const cacheKey = `${scope}|${monthParam}|${yearParam}`

  useEffect(() => {
    fetchBudgets(monthParam, yearParam, scope)
  }, [monthParam, yearParam, scope])

  const snapshot = useSyncExternalStore(subscribeBudgets, getBudgetSnapshot, getBudgetSnapshot)
  const entry = budgetEntries.get(cacheKey)
  const isLoading = !entry || (entry.data === null && entry.error === null)

  const refetch = useCallback(async () => {
    const entry = getBudgetEntry(cacheKey)
    entry.requestVersion += 1
    entry.data = null
    entry.error = null
    entry.inFlight = null
    notifyBudgets()
    await fetchBudgets(monthParam, yearParam, scope)
  }, [cacheKey, monthParam, yearParam, scope])

  return {
    budgets: entry?.data || [],
    loading: isLoading,
    error: entry?.error ?? null,
    refetch,
  }
}

// ─── Goals shared cache ─────────────────────────────────────────────
const goalsEntries = new Map()
let goalsListeners = new Set()

function subscribeGoals(listener) {
  goalsListeners.add(listener)
  return () => goalsListeners.delete(listener)
}

function getGoalsEntry(scope) {
  let entry = goalsEntries.get(scope)
  if (!entry) {
    entry = { data: null, loaded: false, inFlight: null, error: null, requestVersion: 0 }
    goalsEntries.set(scope, entry)
  }
  return entry
}

function getGoalsSnapshot(scope) {
  const entry = getGoalsEntry(scope)
  return JSON.stringify({ data: entry.data, loaded: entry.loaded, error: entry.error })
}

function notifyGoals() {
  goalsListeners.forEach((fn) => fn())
}

async function fetchGoalsInternal(scope) {
  const entry = getGoalsEntry(scope)
  if (entry.loaded && entry.data !== null) return

  if (entry.inFlight) {
    await entry.inFlight
    return
  }

  entry.error = null
  notifyGoals()

  const requestVersion = entry.requestVersion
  const request = (async () => {
    try {
      const res = await fetch("/api/goals")
      const data = await res.json()
      if (requestVersion !== entry.requestVersion) return
      if (res.ok) {
        entry.data = data.goals || []
      } else {
        entry.error = data.error || "Gagal memuat goals"
        entry.data = []
      }
      entry.loaded = true
    } catch (err) {
      if (requestVersion !== entry.requestVersion) return
      entry.error = err.message
      entry.data = []
      entry.loaded = true
    } finally {
      if (requestVersion === entry.requestVersion) {
        entry.inFlight = null
        notifyGoals()
      }
    }
  })()
  entry.inFlight = request

  await request
}

/**
 * Shared goals hook. Multiple components calling useGoals share a single
 * fetch. Calling refetch() propagates the update to all subscribers.
 *
 * @returns {{ goals: Array, loading: boolean, error: string|null, refetch: () => Promise<void> }}
 */
export function useGoals(scopeKey) {
  const contextScope = useContext(SharedDataScopeContext)
  const scope = scopeKey || contextScope || ""
  const getSnapshot = useCallback(() => getGoalsSnapshot(scope), [scope])

  useEffect(() => {
    fetchGoalsInternal(scope)
  }, [scope])

  const snapshot = useSyncExternalStore(subscribeGoals, getSnapshot, getSnapshot)
  const parsed = JSON.parse(snapshot)
  const isLoading = !parsed.loaded && parsed.data === null && parsed.error === null

  const refetch = useCallback(async () => {
    const entry = getGoalsEntry(scope)
    entry.requestVersion += 1
    entry.loaded = false
    entry.data = null
    entry.error = null
    entry.inFlight = null
    notifyGoals()
    await fetchGoalsInternal(scope)
  }, [scope])

  return {
    goals: parsed.data || [],
    loading: isLoading,
    error: parsed.error,
    refetch,
  }
}

// ─── Settings shared cache ─────────────────────────────────────────
const settingsEntries = new Map()
let settingsListeners = new Set()

function getSettingsEntry(scopeKey) {
  let entry = settingsEntries.get(scopeKey)
  if (!entry) {
    entry = { data: null, loaded: false, inFlight: null, error: null, requestVersion: 0 }
    settingsEntries.set(scopeKey, entry)
  }
  return entry
}

function subscribeSettings(listener) {
  settingsListeners.add(listener)
  return () => settingsListeners.delete(listener)
}

function getSettingsSnapshot(scopeKey) {
  const entry = getSettingsEntry(scopeKey)
  return JSON.stringify({ data: entry.data, loaded: entry.loaded, error: entry.error })
}

function notifySettings() {
  settingsListeners.forEach((fn) => fn())
}

async function fetchSettingsInternal(scopeKey) {
  const entry = getSettingsEntry(scopeKey)
  if (entry.loaded && entry.data !== null) return

  if (entry.inFlight) {
    await entry.inFlight
    return
  }

  entry.error = null
  notifySettings()

  const requestVersion = entry.requestVersion
  const request = (async () => {
    try {
      const res = await fetch("/api/settings")
      const data = await res.json()
      if (requestVersion !== entry.requestVersion) return
      if (res.ok) {
        entry.data = data.settings || EMPTY_SETTINGS
      } else {
        entry.error = data.error || "Gagal memuat settings"
        entry.data = EMPTY_SETTINGS
      }
      entry.loaded = true
    } catch (err) {
      if (requestVersion !== entry.requestVersion) return
      entry.error = err.message
      entry.data = EMPTY_SETTINGS
      entry.loaded = true
    } finally {
      if (requestVersion === entry.requestVersion) {
        entry.inFlight = null
        notifySettings()
      }
    }
  })()
  entry.inFlight = request

  await request
}

/**
 * Shared settings hook. Multiple components calling useSettings share a single
 * fetch. Calling refetch() propagates the update to all subscribers.
 *
 * @returns {{ settings: Object, loading: boolean, error: string|null, refetch: () => Promise<void> }}
 */
export function useSettings(scopeKey = "") {
  const contextScope = useContext(SharedDataScopeContext)
  const scope = scopeKey || contextScope || ""
  const getSnapshot = useCallback(() => getSettingsSnapshot(scope), [scope])

  useEffect(() => {
    fetchSettingsInternal(scope)
  }, [scope])

  const snapshot = useSyncExternalStore(subscribeSettings, getSnapshot, getSnapshot)
  const parsed = JSON.parse(snapshot)
  const isLoading = !parsed.loaded && parsed.data === null && parsed.error === null

  const refetch = useCallback(async () => {
    const entry = getSettingsEntry(scope)
    entry.requestVersion += 1
    entry.loaded = false
    entry.data = null
    entry.error = null
    entry.inFlight = null
    notifySettings()
    await fetchSettingsInternal(scope)
  }, [scope])

  const entry = getSettingsEntry(scope)

  return {
    settings: entry.data || EMPTY_SETTINGS,
    loading: isLoading,
    error: entry.error,
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

// ─── Bills shared cache ─────────────────────────────────────────────
const billsEntries = new Map()
let billsListeners = new Set()

function getBillsEntry(scopeKey) {
  let entry = billsEntries.get(scopeKey)
  if (!entry) {
    entry = { data: null, loaded: false, inFlight: null, error: null, requestVersion: 0 }
    billsEntries.set(scopeKey, entry)
  }
  return entry
}

function subscribeBills(listener) {
  billsListeners.add(listener)
  return () => billsListeners.delete(listener)
}

function getBillsSnapshot(scopeKey) {
  const entry = getBillsEntry(scopeKey)
  return JSON.stringify({ data: entry.data, loaded: entry.loaded, error: entry.error })
}

function notifyBills() {
  billsListeners.forEach((fn) => fn())
}

function clearBillsCache(scopeKey) {
  const entry = getBillsEntry(scopeKey)
  entry.requestVersion += 1
  entry.data = null
  entry.loaded = false
  entry.error = null
  entry.inFlight = null
  notifyBills()
}

async function fetchBillsInternal(scopeKey) {
  const entry = getBillsEntry(scopeKey)
  if (entry.loaded && entry.data !== null) return

  if (entry.inFlight) {
    await entry.inFlight
    return
  }

  entry.error = null
  notifyBills()

  const requestVersion = entry.requestVersion
  const request = (async () => {
    try {
      const res = await fetch("/api/bills")
      const data = await res.json()
      if (requestVersion !== entry.requestVersion) return
      if (res.ok) {
        entry.data = data.bills || []
      } else {
        entry.error = data.error || "Gagal memuat tagihan"
        entry.data = []
      }
      entry.loaded = true
    } catch (err) {
      if (requestVersion !== entry.requestVersion) return
      entry.error = err.message
      entry.data = []
      entry.loaded = true
    } finally {
      if (requestVersion === entry.requestVersion) {
        entry.inFlight = null
        notifyBills()
      }
    }
  })()
  entry.inFlight = request

  await request
}

export function useBills(enabled = true, scopeKey = "") {
  const contextScope = useContext(SharedDataScopeContext)
  const scope = scopeKey || contextScope || ""
  const getSnapshot = useCallback(() => getBillsSnapshot(scope), [scope])

  useEffect(() => {
    if (!enabled) {
      clearBillsCache(scope)
      return
    }
    fetchBillsInternal(scope)
  }, [enabled, scope])

  const snapshot = useSyncExternalStore(subscribeBills, getSnapshot, getSnapshot)
  const parsed = JSON.parse(snapshot)
  const isLoading = enabled && !parsed.loaded && parsed.data === null && parsed.error === null

  const refetch = useCallback(async () => {
    if (!enabled) return
    const entry = getBillsEntry(scope)
    entry.loaded = false
    entry.data = null
    entry.error = null
    entry.inFlight = null
    entry.requestVersion += 1
    notifyBills()
    await fetchBillsInternal(scope)
  }, [enabled, scope])

  const entry = getBillsEntry(scope)

  return {
    bills: entry.data || [],
    loading: isLoading,
    error: entry.error,
    refetch,
  }
}

// ─── Test helpers ───────────────────────────────────────────────────
// Reset caches between test runs. Not used in production.
export function _resetBudgetCache() {
  budgetEntries.clear()
  notifyBudgets()
}

export function _resetGoalsCache() {
  goalsEntries.clear()
  notifyGoals()
}

export function _resetSettingsCache() {
  settingsEntries.clear()
  notifySettings()
}

export function _resetBillsCache() {
  billsEntries.clear()
  notifyBills()
}

// ─── Events shared cache ────────────────────────────────────────────
let eventsCache = null
let eventsLoaded = false
let eventsListeners = new Set()
let eventsInFlight = null
let eventsError = null

function subscribeEvents(listener) {
  eventsListeners.add(listener)
  return () => eventsListeners.delete(listener)
}

function getEventsSnapshot() {
  return JSON.stringify({ data: eventsCache, loaded: eventsLoaded, error: eventsError })
}

function notifyEvents() {
  eventsListeners.forEach((fn) => fn())
}

async function fetchEventsInternal() {
  if (eventsLoaded && eventsCache !== null) return

  if (eventsInFlight) {
    await eventsInFlight
    return
  }

  eventsError = null
  notifyEvents()

  eventsInFlight = (async () => {
    try {
      const res = await fetch("/api/momental?progress=true")
      const data = await res.json()
      if (res.ok) {
        eventsCache = data.events || []
      } else {
        eventsError = data.error || "Gagal memuat event"
        eventsCache = []
      }
      eventsLoaded = true
    } catch (err) {
      eventsError = err.message
      eventsCache = []
      eventsLoaded = true
    } finally {
      eventsInFlight = null
      notifyEvents()
    }
  })()

  await eventsInFlight
}

/**
 * Shared events hook. Multiple components calling useEvents share a single
 * fetch. Calling refetch() propagates the update to all subscribers.
 *
 * @returns {{ events: Array, loading: boolean, error: string|null, refetch: () => Promise<void> }}
 */
export function useEvents() {
  useEffect(() => {
    fetchEventsInternal()
  }, [])

  const snapshot = useSyncExternalStore(subscribeEvents, getEventsSnapshot, getEventsSnapshot)
  const parsed = JSON.parse(snapshot)
  const isLoading = !parsed.loaded && parsed.data === null && parsed.error === null

  const refetch = useCallback(async () => {
    eventsLoaded = false
    eventsCache = null
    eventsError = null
    await fetchEventsInternal()
  }, [])

  return {
    events: parsed.data || [],
    loading: isLoading,
    error: parsed.error,
    refetch,
  }
}
