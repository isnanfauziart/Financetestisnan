/**
 * Relative heatmap thresholds (revamp B).
 *
 * Replaces the absolute 100k/250k/500k day-color cutoffs: quartiles are
 * computed from the nonzero daily totals actually displayed, so low and high
 * spenders both get a meaningful color spread. Zero days stay on the empty
 * color. Deterministic and dependency-free for easy unit testing.
 */

/**
 * Compute the three quartile thresholds from nonzero amounts.
 * Returns null when there is no nonzero data (caller keeps static defaults).
 */
export function computeHeatmapThresholds(amounts) {
  const values = (Array.isArray(amounts) ? amounts : [])
    .map(value => Number(value) || 0)
    .filter(value => value > 0)
    .sort((a, b) => a - b)
  if (values.length === 0) return null

  const quantile = fraction => {
    const position = (values.length - 1) * fraction
    const lower = Math.floor(position)
    const upper = Math.ceil(position)
    if (lower === upper) return values[lower]
    return values[lower] + (values[upper] - values[lower]) * (position - lower)
  }

  return [quantile(0.25), quantile(0.5), quantile(0.75)]
}

/**
 * Thresholds to display: relative when at least two distinct nonzero values
 * exist, otherwise the static defaults (a single spending day carries no
 * spread to learn from).
 */
export function getDisplayThresholds(amounts, fallback = [100000, 250000, 500000]) {
  const relative = computeHeatmapThresholds(amounts)
  if (!relative) return fallback
  const distinct = new Set(relative.map(value => Math.round(value)))
  return distinct.size >= 2 ? relative : fallback
}
