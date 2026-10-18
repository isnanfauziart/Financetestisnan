/**
 * Item 20 — Beranda edit mode: card order + visibility, persisted per device.
 * localStorage only; the server never sees layout prefs. Unknown keys from
 * older/newer versions are merged against the defaults so new cards appear
 * instead of vanishing.
 */

const STORAGE_KEY = "artami:home-layout:v1"

export const HOME_CARD_DEFS = [
  { key: "hero", label: "Hero saldo", locked: true },
  { key: "coach", label: "Saran hari ini" },
  { key: "healthGrid", label: "Kesehatan harian" },
  { key: "checklist", label: "Yang perlu dicek" },
  { key: "topExpenses", label: "Top 3 pengeluaran" },
  { key: "focusNote", label: "Catatan fokus" },
  { key: "budgets", label: "Status anggaran" },
  { key: "insights", label: "Insights" },
  { key: "healthScore", label: "Skor kesehatan" },
  { key: "recent", label: "Transaksi terbaru" },
]

export const DEFAULT_HOME_LAYOUT = {
  order: HOME_CARD_DEFS.map((d) => d.key),
  hidden: [],
}

function normalizeLayout(raw) {
  const defKeys = HOME_CARD_DEFS.map((d) => d.key)
  const savedOrder = Array.isArray(raw?.order) ? raw.order.filter((k) => defKeys.includes(k)) : []
  // New cards the saved layout never saw are appended in default position.
  const order = [...savedOrder, ...defKeys.filter((k) => !savedOrder.includes(k))]
  const hidden = Array.isArray(raw?.hidden) ? raw.hidden.filter((k) => defKeys.includes(k)) : []
  return { order, hidden: hidden.filter((k) => k !== "hero") }
}

export function loadHomeLayout() {
  if (typeof window === "undefined" || !window.localStorage) return { ...DEFAULT_HOME_LAYOUT }
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (!raw) return { ...DEFAULT_HOME_LAYOUT }
    return normalizeLayout(raw)
  } catch {
    return { ...DEFAULT_HOME_LAYOUT }
  }
}

export function saveHomeLayout(layout) {
  if (typeof window === "undefined" || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeLayout(layout)))
  } catch {
    // Storage full or unavailable — layout simply doesn't persist.
  }
}

export function resetHomeLayout() {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
  return { ...DEFAULT_HOME_LAYOUT }
}
