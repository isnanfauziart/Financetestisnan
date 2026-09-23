import { describe, expect, it } from "vitest"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const source = (path) => readFile(resolve(process.cwd(), path), "utf8")

/**
 * Regression guard for React error #310 (production, 2026-09-23): the Wave 5
 * `repeatPrefill` useMemo was added below the shell's conditional early
 * returns, so the loading→authenticated transition changed the hook count and
 * crashed every dashboard visit. page.js is not renderable in this test
 * environment (same reason as DashboardMotion/DashboardUrlContract), so this
 * pins the invariant at the source level: inside the Dashboard component, no
 * hook call may appear after the first conditional early return.
 */
describe("Dashboard hook ordering contract", () => {
  it("keeps every hook above the first conditional early return", async () => {
    const page = await source("src/app/dashboard/page.js")

    const componentStart = page.indexOf("export default function Dashboard()")
    expect(componentStart).toBeGreaterThan(-1)

    // The Dashboard body ends at the next top-level function declaration.
    const nextTopLevel = page.slice(componentStart + 1).search(/\nfunction |\nconst [A-Z]/)
    const body = page.slice(componentStart, nextTopLevel === -1 ? undefined : componentStart + 1 + nextTopLevel)

    const firstEarlyReturn = body.indexOf('if (status === "loading")')
    expect(firstEarlyReturn).toBeGreaterThan(-1)

    const hookPattern = /\b(?:useState|useEffect|useLayoutEffect|useMemo|useCallback|useRef|useContext|useSyncExternalStore|useReducer|useDebugValue|use[A-Z][A-Za-z0-9]*)\s*\(/g
    const offenders = []
    for (const match of body.matchAll(hookPattern)) {
      if (match.index > firstEarlyReturn) {
        offenders.push(body.slice(match.index, match.index + 80).split("\n")[0])
      }
    }

    expect(offenders).toEqual([])
  })

  it("defines the repeat prefill next to its state, before the early returns", async () => {
    const page = await source("src/app/dashboard/page.js")

    const repeatTx = page.indexOf("const [repeatTx, setRepeatTx] = useState(null)")
    const repeatPrefill = page.indexOf("const repeatPrefill = useMemo(")
    const firstEarlyReturn = page.indexOf('if (status === "loading")')

    expect(repeatTx).toBeGreaterThan(-1)
    expect(repeatPrefill).toBeGreaterThan(repeatTx)
    expect(repeatPrefill).toBeLessThan(firstEarlyReturn)
    expect(page.slice(repeatPrefill, repeatPrefill + 160)).toContain("[repeatTx]")
  })
})
