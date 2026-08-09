"use client"
import { useState, useEffect, useCallback, useSyncExternalStore } from "react"
import { getLegacyCategories } from "@/lib/categories"

const EMPTY_SETTINGS = {
  startingBalance: 0,
  startingBalanceDate: "",
  userName: "",
  userNamePromptDismissed: false,
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

async function fetchBudgets(month, year) {
  const params = new URLSearchParams()
  if (month) params.set("month", month)
  if (year) params.set("year", year)
  const url = `/api/budgets?${params.toString()}`
  const key = `${month || ""}|${year || ""}`
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
export function useBudgets(month, year) {
  const monthParam = month || ""
  const yearParam = year || ""

  useEffect(() => {
    fetchBudgets(monthParam, yearParam)
  }, [monthParam, yearParam])

  const snapshot = useSyncExternalStore(subscribeBudgets, getBudgetSnapshot, getBudgetSnapshot)
  const entry = budgetEntries.get(`${monthParam}|${yearParam}`)
  const isLoading = !entry || (entry.data === null && entry.error === null)

  const refetch = useCallback(async () => {
    const entry = getBudgetEntry(`${monthParam}|${yearParam}`)
    entry.requestVersion += 1
    entry.data = null
    entry.error = null
    entry.inFlight = null
    notifyBudgets()
    await fetchBudgets(monthParam, yearParam)
  }, [monthParam, yearParam])

  return {
    budgets: entry?.data || [],
    loading: isLoading,
    error: entry?.error ?? null,
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
        settingsCache = data.settings || EMPTY_SETTINGS
      } else {
        settingsError = data.error || "Gagal memuat settings"
        settingsCache = EMPTY_SETTINGS
      }
      settingsLoaded = true
    } catch (err) {
      settingsError = err.message
      settingsCache = EMPTY_SETTINGS
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
    settings: parsed.data || EMPTY_SETTINGS,
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

// ─── Bills shared cache ─────────────────────────────────────────────
let billsCache = null
let billsLoaded = false
let billsListeners = new Set()
let billsInFlight = null
let billsError = null
let billsRequestVersion = 0

function subscribeBills(listener) {
  billsListeners.add(listener)
  return () => billsListeners.delete(listener)
}

function getBillsSnapshot() {
  return JSON.stringify({ data: billsCache, loaded: billsLoaded, error: billsError })
}

function notifyBills() {
  billsListeners.forEach((fn) => fn())
}

function clearBillsCache() {
  billsRequestVersion += 1
  billsCache = null
  billsLoaded = false
  billsError = null
  billsInFlight = null
  notifyBills()
}

async function fetchBillsInternal() {
  if (billsLoaded && billsCache !== null) return

  if (billsInFlight) {
    await billsInFlight
    return
  }

  billsError = null
  notifyBills()

  const requestVersion = billsRequestVersion
  billsInFlight = (async () => {
    try {
      const res = await fetch("/api/bills")
      const data = await res.json()
      if (requestVersion !== billsRequestVersion) return
      if (res.ok) {
        billsCache = data.bills || []
      } else {
        billsError = data.error || "Gagal memuat tagihan"
        billsCache = []
      }
      billsLoaded = true
    } catch (err) {
      if (requestVersion !== billsRequestVersion) return
      billsError = err.message
      billsCache = []
      billsLoaded = true
    } finally {
      if (requestVersion === billsRequestVersion) {
        billsInFlight = null
        notifyBills()
      }
    }
  })()

  await billsInFlight
}

export function useBills(enabled = true) {
  useEffect(() => {
    if (!enabled) {
      clearBillsCache()
      return
    }
    fetchBillsInternal()
  }, [enabled])

  const snapshot = useSyncExternalStore(subscribeBills, getBillsSnapshot, getBillsSnapshot)
  const parsed = JSON.parse(snapshot)
  const isLoading = enabled && !parsed.loaded && parsed.data === null && parsed.error === null

  const refetch = useCallback(async () => {
    if (!enabled) return
    billsLoaded = false
    billsCache = null
    billsError = null
    billsInFlight = null
    billsRequestVersion += 1
    notifyBills()
    await fetchBillsInternal()
  }, [enabled])

  return {
    bills: parsed.data || [],
    loading: isLoading,
    error: parsed.error,
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
  goalsCache = null
  goalsLoaded = false
  goalsError = null
  goalsInFlight = null
  notifyGoals()
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
