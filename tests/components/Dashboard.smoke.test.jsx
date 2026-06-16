import { describe, it, expect, vi } from "vitest"

// TODO(PR 4+): re-enable once the page.js orchestrator is split into
// testable modules (PR 10) and the Sheet/Toast primitives exist.
// The current page.js is a 898-line "use client" Next.js component with
// recharts, next-auth, and next/navigation dependencies that require
// Next.js's bundler to resolve. A real smoke test will come from rendering
// the extracted lib/ functions + the new primitives in isolation.

describe.skip("Dashboard smoke (deferred — see TODO)", () => {
  it.skip("renders without throwing on initial loading state", () => {})
  it.skip("does not throw 'Rendered fewer hooks' on session transition", () => {})
})
