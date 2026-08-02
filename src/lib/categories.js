import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  SAVINGS_CATEGORIES,
} from "@/app/dashboard/_components/constants"

export const CATEGORIES_KEY = "categories_v1"

const CATEGORY_TYPES = ["expense", "income", "savings"]
const PROTECTED_DEFAULTS = {
  expense: { name: "Utang", icon: "Scale" },
  income: { name: "Piutang", icon: "Coins" },
}

const STARTER_CATEGORIES = {
  expense: [
    ["Makan & Minum", "Utensils"], ["Jajan", "Popcorn"], ["Transportasi", "Bus"],
    ["Belanja Harian", "ShoppingBag"], ["Tagihan", "Receipt"], ["Tempat Tinggal", "Home"],
    ["Kesehatan", "HeartPulse"], ["Pendidikan", "BookOpen"], ["Hiburan", "Sparkles"],
    ["Perawatan Diri", "Sparkles"], ["Keluarga", "Home"], ["Sedekah & Donasi", "Gift"],
    ["Kondangan & Hadiah", "Gift"], ["Utang", "Scale"], ["Lainnya", "Wallet"],
  ],
  income: [
    ["Gaji", "BadgeDollarSign"], ["Bonus & THR", "Coins"], ["Freelance", "Laptop"],
    ["Usaha", "ShoppingBag"], ["Investasi", "CircleDollarSign"], ["Penjualan", "ShoppingBag"],
    ["Penggantian Biaya", "Receipt"], ["Pemberian", "Gift"], ["Piutang", "Coins"], ["Lainnya", "Wallet"],
  ],
  savings: [
    ["Tabungan Cash", "PiggyBank", "liquid"], ["Dana Darurat", "ShieldPlus", "liquid"],
    ["Emas", "Gem", "investment"], ["Investasi", "CircleDollarSign", "investment"],
    ["Pendidikan", "BookOpen", "liquid"], ["Liburan", "Plane", "liquid"],
    ["Rumah", "Home", "liquid"], ["Kendaraan", "Car", "liquid"], ["Lainnya", "Wallet", "liquid"],
  ],
}

function copyCategories(categories) {
  return Object.fromEntries(CATEGORY_TYPES.map(type => [
    type,
    categories[type].map(item => ({ ...item })),
  ]))
}

function legacyItem(type, name) {
  const item = { name, icon: "Wallet", active: true }
  if (type === "savings") {
    // Emas was part of the old Health Score emergency-fund definition.
    item.savingsKind = name === "Saham" ? "investment" : "liquid"
  }
  if ((type === "expense" && name === "Utang") || (type === "income" && name === "Piutang")) {
    item.protected = true
  }
  return item
}

export function getLegacyCategories() {
  const income = INCOME_CATEGORIES.map(name => legacyItem("income", name))
  if (!income.some(item => item.name.toLocaleLowerCase() === "piutang")) income.push(legacyItem("income", "Piutang"))
  return {
    expense: EXPENSE_CATEGORIES.map(name => legacyItem("expense", name)),
    income,
    savings: SAVINGS_CATEGORIES.map(name => legacyItem("savings", name)),
  }
}

export function getStarterCategories() {
  const categories = Object.fromEntries(CATEGORY_TYPES.map(type => [
    type,
    STARTER_CATEGORIES[type].map(([name, icon, savingsKind]) => ({
      name,
      icon,
      active: true,
      ...(type === "savings" ? { savingsKind } : {}),
      ...((type === "expense" && name === "Utang") || (type === "income" && name === "Piutang")
        ? { protected: true }
        : {}),
    })),
  ]))
  return categories
}

export function normalizeCategories(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  if (Object.keys(value).some(key => !CATEGORY_TYPES.includes(key))) return null

  const normalized = {}
  for (const type of CATEGORY_TYPES) {
    if (!Array.isArray(value[type])) return null
    const seen = new Set()
    normalized[type] = []
    for (const raw of value[type]) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
      const name = typeof raw.name === "string" ? raw.name.trim() : ""
      const icon = typeof raw.icon === "string" ? raw.icon.trim() : ""
      if (!name || !icon || typeof raw.active !== "boolean") return null
      const nameKey = name.toLocaleLowerCase()
      if (seen.has(nameKey)) return null
      seen.add(nameKey)

      const item = {
        name,
        icon,
        active: raw.active,
      }
      if (raw.protected !== undefined && typeof raw.protected !== "boolean") return null
      if (raw.protected === true) item.protected = true
      if (type === "savings") {
        if (!["liquid", "investment"].includes(raw.savingsKind)) return null
        item.savingsKind = raw.savingsKind
      } else if (raw.savingsKind !== undefined) {
        return null
      }

      if (type === "expense" && nameKey === "utang") {
        item.active = true
        item.protected = true
      }
      if (type === "income" && nameKey === "piutang") {
        item.active = true
        item.protected = true
      }
      normalized[type].push(item)
    }
  }

  for (const type of ["expense", "income"]) {
    const required = PROTECTED_DEFAULTS[type]
    if (!normalized[type].some(item => item.name.toLocaleLowerCase() === required.name.toLocaleLowerCase())) {
      normalized[type].push({ ...required, active: true, protected: true })
    }
  }
  return normalized
}

export function parseStoredCategories(raw) {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw
    return normalizeCategories(value)
  } catch {
    return null
  }
}

export function getLiquidSavingsCategories(categories) {
  const normalized = normalizeCategories(categories)
  if (!normalized) return ["Tabungan Cash", "Emas"]
  return normalized.savings.filter(item => item.active && item.savingsKind === "liquid").map(item => item.name)
}

export function serializeCategories(categories) {
  const normalized = normalizeCategories(categories)
  return normalized ? JSON.stringify(normalized) : null
}

export const DEFAULT_CATEGORIES = getStarterCategories()
export const LEGACY_CATEGORIES = getLegacyCategories()

export function cloneCategories(categories) {
  const normalized = normalizeCategories(categories)
  return normalized ? copyCategories(normalized) : null
}
