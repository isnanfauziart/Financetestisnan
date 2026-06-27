export const THEME = {
  bg: "#fefaf3",
  surface: "#ffffff",
  surfaceMuted: "#fdf6ea",
  surfaceWarm: "#f6efe5",
  textPrimary: "#2a2018",
  textSecondary: "#6b5b4f",
  textTertiary: "#9c8978",
  income: "#7c8c5a",
  incomeBg: "#f4f6ec",
  expense: "#c47d5a",
  expenseBg: "#fbf0e9",
  savings: "#5b8c7a",
  savingsBg: "#ebf3f0",
  primary: "#7c5fcf",
  primaryBg: "#f3effc",
  primaryDeep: "#6349a8",
  warning: "#d4a853",
  warningBg: "#fdf7e8",
  danger: "#c44545",
  dangerBg: "#fbecec",
  heroBg: "#4a3d33",
  heroMid: "#6b5b4f",
  heroLight: "#8c7b6a",
}

export const COLORS = ["#7c8c5a", "#c47d5a", "#5b8c7a", "#9f87ef", "#d4a853", "#5069cc", "#c44545", "#7aab9a", "#d99a7d", "#a8b3e6"]

export const EXPENSE_CATEGORIES = [
  "Transportasi","Sedekah","Elektronik","Healthcare","Utang","Body Care",
  "Musibah","Kondangan","Makan di luar","Makan di rumah","Hiburan","Jajan",
  "Skincare","Belanja","Laundry","Ilmu","Pakaian", "Tabungan Cash"
]

export const INCOME_CATEGORIES = ["Monthly Salary","Insentif","Reimbursement","Pemberian"]

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
