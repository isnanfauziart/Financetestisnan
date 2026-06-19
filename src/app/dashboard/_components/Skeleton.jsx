export default function Skeleton({ variant = "tile", className = "" }) {
  const heights = {
    tile: "h-[110px]",
    card: "h-[140px]",
    row: "h-[64px]",
    chart: "h-[180px]",
    hero: "h-[220px]",
  }
  const cls = heights[variant] || heights.tile
  return <div className={`shimmer-bg rounded-2xl ${cls} ${className}`} aria-hidden="true" />
}
