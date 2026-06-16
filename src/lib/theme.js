let cached = null

function getVar(name) {
  if (typeof window === "undefined") return ""
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function getTheme() {
  if (cached) return cached
  cached = {
    bg: getVar("--bg"),
    surface: getVar("--surface"),
    surfaceWarm: getVar("--surface-warm"),
    textPrimary: getVar("--text-primary"),
    textSecondary: getVar("--text-secondary"),
    textTertiary: getVar("--text-tertiary"),
    income: getVar("--income"),
    expense: getVar("--expense"),
    savings: getVar("--savings"),
    primary: getVar("--primary"),
    primaryDeep: getVar("--primary-deep"),
    warning: getVar("--warning"),
    danger: getVar("--danger"),
    heroBg: getVar("--hero-bg"),
    heroMid: getVar("--hero-mid"),
    heroLight: getVar("--hero-light"),
  }
  return cached
}

export function resetThemeCache() {
  cached = null
}
