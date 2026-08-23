// Shared Recharts style constants.
// ponytail: Recharts/SVG attributes need real hex values, NOT var() strings —
// these are kept in sync MANUALLY with md3 in src/lib/designTokens.js and the
// --md-sys-color-* vars in globals.css. Update all three together.

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
