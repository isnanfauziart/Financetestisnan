export const THEME = {
  bg: "#FBF8F1",
  surface: "#FFFFFF",
  surfaceMuted: "#F7F2EA",
  surfaceWarm: "#F3ECE2",
  border: "#E2D9CC",
  textPrimary: "#29231E",
  textSecondary: "#6B625A",
  textTertiary: "#7A7168",
  income: "#2F6B57",
  incomeBg: "#E5F0EB",
  expense: "#A45343",
  expenseBg: "#F8E8E4",
  savings: "#2D6A62",
  savingsBg: "#E6F2EF",
  primary: "#2F6B57",
  primaryBg: "#E5F0EB",
  primaryDeep: "#255344",
  smart: "#6E59B5",
  smartBg: "#F0EBFA",
  warning: "#8A5A00",
  warningBg: "#FFF1CC",
  danger: "#B33A3A",
  dangerBg: "#FCE8E8",
  heroBg: "#1F2D28",
  heroMid: "#255344",
  heroLight: "#8EB5A5",
}

export const COLORS = ["#2F6B57", "#A45343", "#2D6A62", "#6E59B5", "#8A5A00", "#5B7F9A", "#B33A3A", "#8FBAB2", "#CB796B", "#B9AADE"]

export const EXPENSE_CATEGORIES = [
  "Transportasi","Sedekah","Elektronik","Healthcare","Utang","Body Care",
  "Musibah","Kondangan","Makan di luar","Makan di rumah","Hiburan","Jajan",
  "Skincare","Belanja","Laundry","Ilmu","Pakaian", "Tabungan Cash"
]

export const INCOME_CATEGORIES = ["Monthly Salary","Insentif","Reimbursement","Pemberian","THR"]

export const SAVINGS_CATEGORIES = ["Tabungan Cash","Emas","Saham"]

export const BANK_ACCOUNTS = ["Cash","Bank BCA","Bank BNI","Bank BRI","Bank Mandiri","OVO","DANA","ShoopePay","Gopay","BSI","Other Bank"]

export const AVAILABLE_MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]

export const MONTHS_MAP = { Jan:0, Feb:1, Mar:2, Apr:3, Mei:4, Jun:5, Jul:6, Agu:7, Ags:7, Sep:8, Okt:9, Nov:10, Des:11 }

export const BILL_CATEGORIES = [
  "Listrik", "Air (PDAM)", "Internet/WiFi", "Pulsa & Data",
  "BPJS Kesehatan", "BPJS Ketenagakerjaan", "Asuransi",
  "Sewa Rumah", "Cicilan/Kredit", "Netflix", "Spotify",
  "YouTube Premium", "Gym", "Arisan", "Other"
]

export const BILL_FREQUENCIES = ["weekly", "biweekly", "monthly", "quarterly", "yearly"]

export const BILL_TO_EXPENSE_MAP = {
  "Listrik": "Tagihan",
  "Air (PDAM)": "Tagihan",
  "Internet/WiFi": "Tagihan",
  "Pulsa & Data": "Tagihan",
  "BPJS Kesehatan": "Healthcare",
  "BPJS Ketenagakerjaan": "Healthcare",
  "Asuransi": "Healthcare",
  "Sewa Rumah": "Tagihan",
  "Cicilan/Kredit": "Utang",
  "Netflix": "Hiburan",
  "Spotify": "Hiburan",
  "YouTube Premium": "Hiburan",
  "Gym": "Healthcare",
  "Arisan": "Tabungan Cash",
  "Other": "Tagihan",
}

export const BILL_TO_INCOME_MAP = {
  "Monthly Salary": "Monthly Salary",
  "Insentif": "Insentif",
  "Reimbursement": "Reimbursement",
  "Other": "Pemberian",
}

export const EVENT_TYPES = ["anak-sekolah", "lebaran-thr", "custom"]

export const EVENT_MODES = ["independent", "exempt"]

export const EVENT_STATUSES = ["planning", "active", "completed", "archived"]

export const EVENT_COLORS = {
  "anak-sekolah": "#5B7F9A",
  "lebaran-thr": "#8A5A00",
  "custom": "#6E59B5",
}

export function getCategoryOptions(categories, type, fallback, current = "") {
  const configured = categories?.[type]
  const names = Array.isArray(configured)
    ? configured.filter(item => item && item.active !== false).map(item => typeof item === "string" ? item : item.name).filter(Boolean)
    : fallback
  return current && !names.includes(current) ? [...names, current] : names
}

const CATEGORY_ALIASES = {
  Healthcare: ["Kesehatan"],
  "Monthly Salary": ["Gaji"],
  Insentif: ["Bonus & THR"],
  THR: ["Bonus & THR"],
  Reimbursement: ["Penggantian Biaya"],
}

export function resolveCategoryName(preferred, options) {
  if (!preferred || options.includes(preferred)) return preferred
  return CATEGORY_ALIASES[preferred]?.find(name => options.includes(name)) || preferred
}
