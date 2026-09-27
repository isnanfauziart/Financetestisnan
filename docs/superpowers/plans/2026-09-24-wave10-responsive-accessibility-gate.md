# Wave 10 — Final responsive and accessibility gate (implementation plan)

Date: 2026-09-24 · Source: `docs/2026-09-09-product-improvement-roadmap.md` → Wave 10 (line 1050) · Risk: Medium (spans shared interaction surfaces; no auth/quota/payment/financial-write changes) · Status: plan only

## Current state (explored 2026-09-24)

**Foundations already in place (verify, do not rebuild):**

- `Sheet.jsx`: portal dialog with Tab/Shift+Tab focus trap, initial focus + restore on close, Escape, dirty-discard `alertdialog`, Wave 5 Back integration (`tests/components/SheetHistory.test.jsx`).
- Wave 7 ARIA completeness: roving-tabindex tabs, `aria-expanded`/`aria-pressed`/`aria-controls`, `StatsDataTable` chart alternatives, `useOverflowHint`, Plan rail with `aria-current` + focus/announce.
- Bottom nav `role="tablist"` with Indonesian labels; FAB `aria-hidden`/Tab handling pinned by `DashboardMotion.test.jsx`.
- 44px `min-h-11` conventions on primary controls; Wave 7 calendar pseudo-element hit areas.
- Dark theme bootstrap (`data-theme` in `layout.js`), `prefers-reduced-motion` blocks (`globals.css:1228+`), `role="status"` Toast, `.safe-bottom`/`.safe-top` helpers (`globals.css:619–624`).
- No non-semantic clickable cards — interactive surfaces are real `<button>`s.

**Gaps found (the corrective scope):**

1. **Safe-area support is dead code.** `layout.js` `viewport` export has only `themeColor` — no `viewportFit: "cover"`, so `env(safe-area-inset-*)` always resolves to 0 on notched devices. Nav has `.safe-bottom`; the FAB (`fixed bottom-24 sm:bottom-20 right-4`, `page.js:1885`) has none.
2. **No dashboard skip link.** "Langsung ke konten" exists only on the landing page; Wave 5 already focuses `#dashboard-heading` (tabIndex −1) — a visually-hidden skip link can target it.
3. **No avatar fallback.** `ProfileTab.jsx:153` (w-24) and `page.js:1578` (w-11 header) render bare `<img src={session?.user?.image} alt="">` — broken-image icon when a Google account has no photo. Roadmap explicitly lists "avatar fallback".
4. **Non-Indonesian accessible labels.** `Sheet.jsx:119` `aria-label="Tutup"`; `RecapMonthGroup.jsx` `Page ${p}`, `Collapse/Expand`, `Edit/Delete ${category}` — inconsistent with the Indonesian labels used elsewhere ("Tutup saran…", nav labels).
5. **Sub-44px interactive controls.** `SegmentedButtons` `min-h-[40px]`, `PillButton` chips, `SpecialExpenseField` suggestion buttons. Classify: primary touch controls get 44px via the Wave 7 pseudo-element pattern (visual size unchanged); secondary chips documented or fixed where hit accuracy matters.
6. **No durable responsive pins.** Wave 7's 360×640 harness was dev-only and deleted. jsdom cannot do layout, so verification = source-contract tests (the `DashboardUrlContract`/`DashboardMotion` style) + component tests + a recorded manual viewport pass via the preview browser.

## Task contract

**Outcome:** The dashboard passes every Wave 10 checklist item: correct behavior at 360×640, 375, large phone, tablet, desktop, and landscape; working safe areas under keyboards/notches; keyboard-only operability with visible focus and skip/heading structure; Indonesian accessible labels and live regions; light/dark/high-text/zoom/reduced-motion/loading/empty/stale/error/locked/unavailable states verified; 44px primary touch targets; avatar fallback; no page-level horizontal overflow.

**Included:** items 1–7 above (viewport `viewportFit`, FAB + content clearance, skip link, avatar fallback, label localization, 44px extensions, verification matrix).

**Exclusions:** no endpoint/migration/Supabase/quota/entitlement/stale-write-gate changes; no React Native work; no new dependencies (no axe library — zero-dep contract); no `/admin` or landing-page changes (each gets only a one-line manual confirmation check); no copy changes beyond the localized labels; no chart or calculation changes.

**Protected invariants:** Wave 5 URL contract and popstate/focus behavior; Wave 6 hero and checklist; Wave 7 disclosure contracts and section keys; Wave 4 onboarding gate; Sheet trap/restore/dirty-Back semantics (only labels change); financial-write pipelines; reduced-motion and dark-mode support.

## Batches (tests first, one focused run each)

**A — Safe areas + fixed surfaces.** `viewport` export gains `viewportFit: "cover"`; FAB gets safe-bottom clearance; content bottom-padding audit; landscape check. Source-contract test pins the viewport export and FAB classes; focused: `tests/components/DashboardA11yGate.test.jsx` (new, source-assertion style).

**B — Keyboard & screen-reader gaps.** Skip link as first focusable element → `#dashboard-heading`; Indonesianize `Close`/`Page N`/`Collapse`/`Expand`/`Edit`/`Delete` labels; no trap/restore behavior changes. Component tests for Sheet labels; focused: same new test file + `Sheet` test additions.

**C — Fallbacks, targets, states.** Shared initials avatar fallback (name-derived, deterministic, used by both `img` call sites); 44px pseudo-element extensions for classified primary controls; contrast spot-fixes only where measured as failing. Component tests: avatar fallback with/without image/name; hit-area classes pinned.

**D — Verification matrix + final gate.** Preview-browser pass at 360×640, 375×667, 412×892, 768×1024, 1440×900, and 640×360 landscape: keyboard-only sweep, dark, 200% zoom, reduced motion, and the loading/empty/stale/error/locked/unavailable state matrix; results recorded as an implementation record in the plan doc. Gate: one independent diff review → full suite once → production build once → `git diff --check` → `progress.md` entry.

## Roadmap focused-check mapping

| Roadmap bullet | Covered by |
|---|---|
| Six-viewport layouts, landscape, no horizontal overflow | Batch A audit + Batch D matrix |
| Mobile keyboard + safe area; nav/FAB never cover content | Batch A + Batch D |
| Keyboard-only nav, focus trap/restoration, Back, visible focus, skip/headings | Batch B (+ existing SheetHistory/UrlContract regressions) |
| SR names, descriptions, live status, chart alternatives, Indonesian labels | Batch B (+ existing Wave 7 pins) |
| Light/dark/high-text/zoom/reduced-motion + full state matrix | Batch C + Batch D matrix |
| 44px primary touch areas, compact icons | Batch C |
| Semantic buttons, avatar fallback, contrast, no overflow | Batches C + D |

No open decision gates remain for this wave (SLA settled in Wave 9; Rencana nav settled in Wave 7's decision record; pairing is a separate project).

## Implementation record (2026-09-24)

All four batches implemented matching the plan:

1. **Safe areas (Batch A):** `src/app/layout.js` viewport export gained `viewportFit: "cover"` (verified live: the rendered meta tag is `width=device-width, initial-scale=1, viewport-fit=cover`). The FAB moved from `bottom-24 sm:bottom-20` classes to `style={{ bottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}` with `z-[45]` so it sits above the nav but below the Toast/discard layers and clears notches. The shell already carried `pb-52 sm:pb-44` — content clearance was audited and kept (tabs correctly have no per-tab bottom padding).
2. **Keyboard & SR labels (Batch B):** visually-hidden skip link `Langsung ke konten utama` → `#dashboard-heading` added as the shell's first focusable control. Localized to Indonesian: Sheet `Tutup`, Recap pager `Halaman sebelumnya/berikutnya`, `Halaman ${p}`, `Tutup/Buka ringkasan ${key}`, row `Hapus ${category}`, BudgetCard `Edit/Hapus budget ${kategori}` + `Buka rincian budget ${kategori}`, GoalCard `Edit/Hapus target ${nama}` + `Kontribusi ke ${nama}`, PlanTab `Buka simulator What-If`. DebtCard/EventCard already used `Hapus` and were left untouched (tight diff).
3. **Fallbacks & targets (Batch C):** new `src/components/UserAvatar.jsx` — deterministic initials tile (name initials → email initial → "A", hash-picked color) used by both former bare `<img>` call sites (header w-11, Profile w-24); `onError` swaps a broken photo for initials; `avatar-fallback-tile` gets a dark-mode contrast pin in `globals.css`. 44px hit areas added via the new `.touch-target-44` pseudo-element helper (4px box growth, overflow-visible parent) on `SegmentedButtons` (visual min-height stays 40px), `PillButton`, and both `SpecialExpenseField` suggestion buttons. `SegmentedButtons` meets the minimum with a real `min-h-[44px]` (its clipped pill needs `overflow-hidden`, so the pseudo-element trick doesn't apply there).

## Verification matrix (2026-09-24, preview browser, unauthenticated surfaces)

| Check | Result |
|---|---|
| Rendered meta viewport contains `viewport-fit=cover` | Pass (live HTML) |
| Compiled CSS contains `.touch-target-44::after`, `.safe-bottom`, `.safe-top`, `.avatar-fallback-tile` dark pin | Pass (fetched layout.css) |
| No page-level horizontal overflow at 360×640, 375×667, 412×892, 768×1024, 1440×900, 640×360 landscape | Pass (all six) |
| Landing skip link is the first Tab focus and visibly focusable | Pass |
| Dark color-scheme emulation on the landing page | Pass (landing is intentionally light-only; dashboard dark mode covered by unit pins + manual check) |
| **Authenticated dashboard states (hero, nav overlap, keyboard-only pass, 200% zoom, reduced motion, state matrix)** | **Not verifiable from this environment** — Google OAuth redirect chain lands on the Vercel SSO login for the deployment's `NEXTAUTH_URL` |

**Manual follow-up (requires a signed-in browser):** sign in on a local deployment with real credentials, then confirm the dashboard shell at 360×640 and landscape: nav/FAB clear the hero and last list rows, keyboard-only Tab path (skip link → heading focus), dark mode + 200% zoom, and the loading/empty/stale/error/locked/unavailable state matrix.
