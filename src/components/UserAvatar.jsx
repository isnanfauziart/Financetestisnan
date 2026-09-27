"use client"

import { useState } from "react"

// Wave 10 — avatar fallback. Google accounts may have no profile photo; a bare
// <img> then renders a broken-image icon. This renders the photo when it loads
// and a deterministic initials tile when it fails or is missing.
const TILE_STYLES = [
  { background: "#2F6B57" },
  { background: "#7C5CBF" },
  { background: "#3E5C76" },
  { background: "#A8792E" },
  { background: "#A45343" },
]

function initialsFrom(name, email) {
  const source = String(name || "").trim()
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean)
    const first = parts[0]?.charAt(0) || ""
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ""
    const text = (first + last).toUpperCase()
    if (text) return text
  }
  const fallback = String(email || "").trim()
  return fallback ? fallback.charAt(0).toUpperCase() : "A"
}

function tileStyleFor(name, email) {
  const seed = String(name || email || "A")
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 997
  return TILE_STYLES[hash % TILE_STYLES.length]
}

export default function UserAvatar({ src, name, email, className = "" }) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden bg-md3-surface-container-high ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="avatar-fallback-tile flex h-full w-full select-none items-center justify-center font-bold text-white"
          style={tileStyleFor(name, email)}
        >
          {initialsFrom(name, email)}
        </span>
      )}
    </span>
  )
}
