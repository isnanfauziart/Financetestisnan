// Shared Recharts style constants.
//
// Chart SVG attributes need real resolved color values, NOT var() strings.
// The legacy contract kept everything light-mode hex in this file; the stats
// revamp adds `resolveChartTheme(isDark)` so charts can follow the
// `data-theme="dark"` attribute set in ProfileTab without breaking Recharts.
//
// Sync contract: keep `snapshot` hex values in sync with src/lib/designTokens.js
// and the --md-sys-color-* vars in src/app/globals.css (:root). Update all
// three together.

import { themes as md3Themes } from "./designTokens"

/** Legacy light-mode snapshot. Tests import this for exact color assertions. */
export const chartTheme = {
  // Axis ticks: on-surface-variant
  axisTick: { fontSize: 11, fill: '#6B625A' },
  // Grid stroke: outline-variant (exported for charts that add CartesianGrid)
  gridStroke: '#E2D9CC',
  // Ordered categorical series palette: [primary violet, tertiary gold, terracotta/clay, moss, sage]
  seriesPalette: ['#6E59B5', '#D4A853', '#A45343', '#2D6A62', '#2F6B57'],
  // Heatmap: zero-state + 4 tonal steps of the clay container family (light -> dark)
  heatmap: {
    empty: '#F6EFE5',
    thresholds: [100000, 250000, 500000],
    ramp: ['#F6D8D1', '#E9B6AA', '#CB796B', '#A45343'],
    textDark: '#29231E',
    textLight: '#FFFFFF',
  },
  // Achievement/tertiary accent used outside charts too (progress ring completed state)
  tertiaryAccent: '#8A5A00',
}

export default chartTheme

/**
 * Resolve the full chart theme for the current color scheme. `isDark` comes
 * from the documentElement `data-theme` attribute (see ProfileTab) so both
 * schemes render correctly; the light values match `chartTheme` above.
 */
export function resolveChartTheme(isDark = false) {
  const tokens = isDark ? md3Themes.dark : md3Themes.light
  if (!isDark) return chartTheme

  return {
    axisTick: { fontSize: 11, fill: tokens.onSurfaceVariant },
    gridStroke: tokens.outlineVariant,
    seriesPalette: ['#D6CDEE', '#EFBF63', '#E89A8A', '#5FA79C', '#7FB89F'],
    heatmap: {
      empty: tokens.surfaceContainerHigh,
      thresholds: chartTheme.heatmap.thresholds,
      ramp: ['#5C3F3A', '#7A5148', '#A46A5C', '#E89A8A'],
      textDark: '#F0EAE2',
      textLight: '#29231E',
    },
    tertiaryAccent: tokens.tertiary,
  }
}

/** Read the active scheme from the document (client only). */
export function getChartSchemeIsDark() {
  if (typeof document === "undefined") return false
  return document.documentElement.getAttribute("data-theme") === "dark"
}
