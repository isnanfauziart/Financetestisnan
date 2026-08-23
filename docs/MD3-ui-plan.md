# Artami MD3 UI/UX Update Plan

> **Status:** Approved, NOT started. This document is the single source of truth for implementation.
> **Date created:** 2026-08-23
> **Origin:** Material Design 3 audit by UI Designer + UX Architect subagents against current source.
> **Companion docs:** `docs/play-store-react-native-plan.md` (this plan feeds it), `docs/UI & UX Analysis.md`

---

## 1. Task Contract

| Item | Value |
|---|---|
| **Outcome** | App shell + components align to Material Design 3: tonal color roles, motion tokens, bottom-sheet flows, correct component variants, completed dark mode |
| **Included** | Visual/token system, snackbar, chips, buttons, FAB, sheets, fields, lists, menus, banners, badges, charts theming, dark mode, small UX fixes (PTR, focus rings, touch targets, dead code) |
| **Exclusions** | Routing/deep links (deferred to RN-port era), navigation rail, API routes, quota/entitlement/payment logic, Google Sheets reads/writes, new npm dependencies |
| **Protected invariants** | Bottom nav stays FIXED-BOTTOM at every screen size · glass kept ONLY on nav/header/sheets · all copy stays Bahasa Indonesia · no behavior change to transaction/quota/auth paths · existing tests stay green |
| **Risk tier** | Low–Medium (pure presentation layer; no High-risk areas touched) |
| **Integration owner** | Primary agent across all batches; exactly ONE independent final diff reviewer |

## 2. Locked Decisions (user-approved)

1. **Bottom navigation stays at the bottom** on all screen sizes. Navigation rail idea REJECTED/cut.
2. **Glassmorphism kept but contained** to nav bar, header, and sheets only (brand signature; documented `backdrop-filter` stacking-context gotcha).
3. **Dark mode finished properly** — full role remap + toggle, not deleted.
4. **Routing/deep links deferred** until RN-port era.
5. Optional add-ons N2/N7/N10/N12 are OUT of scope unless explicitly approved later.

---

## 3. Current-State Findings (evidence)

### Visual gaps
- Hardcoded chart hexes: tick fills `#6b625a` / `#8c7b6a` (`StatsTab.jsx:296-302`)
- Heatmap ramp ad-hoc colors (`StatsTab.jsx:651-657`); today-cell ring violet (`StatsTab.jsx:595`)
- 4× copy-pasted submit gradient buttons (`WalletTab.jsx:156`, `EditTransactionModal.jsx:122`, `BudgetSetupModal.jsx:122`, `GoalContributeModal.jsx:102`)
- `.chip-active` uses colored drop-shadow instead of container swap (`globals.css:381-386`), ~29px height
- FAB inconsistent 48dp mobile / 56dp desktop, raw primary fill (`page.js:1479`)
- Half-wired dark mode: only 8 of ~25 vars remapped (`globals.css:37-46`)
- Tiny text: `text-[8px]` ×13, `text-[9px]` ×37 occurrences
- Money suffixes at ~3.4:1 contrast (`text-earth-400`: `BudgetCard.jsx:48`, `GoalCard.jsx:74`, `ProfileTab.jsx:259`)
- ✎/× text glyphs as icons, 28px drill-down touch targets (`page.js:1572-1576`)
- No `tabular-nums` on amount renders
- GoalProgressRing hardcoded colors (`GoalProgressRing.jsx:14,20`)
- Toast has countdown progress bar + gradient fills (`Toast.jsx:5-9,102-107`)

### UX gaps
- Single-page tab shell (no routes) — deferred, see exclusions
- Pull-to-refresh hides on fixed `setTimeout(1200)` regardless of network (`page.js:477-478`)
- SelectField trigger has zero focus-visible styling (`SelectField.jsx:112-128`)
- `requestNotificationPermission()` exported+imported but never called (`notifications.js:13`, `page.js:35`)
- `WalletTab.jsx` dead code: imported at `page.js:14`, rendered nowhere; special-expense form block triplicated (≈ `WalletTab.jsx:12-59` ≈ `QuickAddSheet.jsx:24-79`)
- Bottom sheets lack drag handles (`Sheet.jsx:161`)
- Nav labels 9px (`page.js:1514`)
- No bills badge despite `bills` loaded globally (`page.js:227`)
- No empty-state guidance (`HomeTab.jsx:404-414`)

---

## 4. Implementation Batches

Execute in order A → E. One batch at a time; after each, run ONLY its focused checks.

### Batch A — Quick Wins (Low risk)
| # | Change | Files | Done when |
|---|--------|-------|-----------|
| A1 | Delete dead `WalletTab`; extract triplicated special-expense block into one shared field group used by QuickAddSheet | `WalletTab.jsx` (delete), `QuickAddSheet.jsx`, `page.js:14` import removed | No duplicate form blocks; Quick Add unchanged behavior |
| A2 | Nav active-pill indicator (secondary-container pill behind active icon) + labels 9→11px | `page.js:1508-1516` | Active tab shows pill; labels legible |
| A3 | Toast → MD3 snackbar: flat inverse-surface, inverse-on-surface text, one action max, drop countdown bar + gradients, ≥44px action target, keep 5s/8s durations | `Toast.jsx` | No gradients/progress bar; anchored above nav |
| A4 | Single `.btn-filled` class replaces 4 gradient submits; text-button style for secondary actions | `EditTransactionModal.jsx:122`, `BudgetSetupModal.jsx:122`, `GoalContributeModal.jsx:102`, globals.css | One class, no copy-paste |
| A5 | Chips: selected = secondary-container bg + leading checkmark + on-secondary-container text, NO shadow; unselected = outline-variant border; height ≥32px | `globals.css:381-386`, `StatsTab.jsx:175-189` | Spec-compliant chip states |
| A6 | ✎/× glyphs → lucide `Pencil`/`X`; drill-down edit/delete targets ≥44px | `page.js:1572-1577` | Real icons, compliant targets |
| A7 | FAB unified 56dp both breakpoints, primary-container fill + on-primary-container icon | `page.js:1479` | Consistent size/tone |
| A8 | PTR spinner dismisses on fetch settle (min-hold 400ms), not fixed timeout | `page.js:477-478` | Spinner reflects real network state |
| A9 | Sheet drag handles (h-1 w-8 rounded, earth-200 or token equivalent) | `Sheet.jsx:161` | Handle visible on all sheets |
| A10 | SelectField trigger focus-visible ring (match `PlanTab.jsx:128` convention) | `SelectField.jsx:112-128` | Keyboard focus visible |
| A11 | QuotaNotice → MD3 banner anatomy: surface-container-high strip, message + "Upgrade" filled + "Nanti" text actions | `QuotaNotice.jsx` | Banner spec shape |
| A12 | A11y floor sweep: all `text-[8px]/[9px]` → ≥11px; money suffixes → `on-surface-variant` (~4.6:1); `tabular-nums` on every amount render | BudgetCard:48, GoalCard:74, ProfileTab:259, HomeTab, StatsTab, cards | grep finds no sub-11px text; contrast pass |

**Focused check:** vitest filtered to touched components + dev-server smoke (nav/toast/chips/FAB/PTR/banner).

### Batch B — Token Foundation + Data Viz (Medium risk)
| # | Change | Files | Done when |
|---|--------|-------|-----------|
| B1 | Define MD3 role CSS vars in `:root`: `primary/on-primary`, `primary-container/on-primary-container`, `secondary-container/on-secondary-container`, `tertiary/on-tertiary`, `error-container/on-error-container`, `surface` + `surface-container-lowest/low/high/highest`, `on-surface/on-surface-variant`, `outline/outline-variant`, `inverse-surface/inverse-on-surface/inverse-primary`. Seed values from existing violet/earth palette so look shifts gently | `globals.css` | All roles defined; page renders near-identical |
| B2 | Tailwind color names map to `var(--md-sys-color-*)`; legacy names (earth/sage/clay/moss/violet) aliased during migration | `tailwind.config.js` | Both naming layers work |
| B3 | Pure-JS token module exporting same values (NativeWind bridge for RN port). No DOM/browser APIs inside | NEW `src/lib/designTokens.js` | Module imports cleanly web-side |
| B4 | `chartTheme.js`: ticks 11px `on-surface-variant`, grid stroke `outline-variant`, series palette [primary, tertiary, gold, terracotta, moss]; heatmap → 5-step tonal ramp of one container hue; today-ring → primary; tooltip border outline-variant | NEW `chartTheme.js`, `StatsTab.jsx:296-302,368,417,444,533-540,595,613,651-657`, `CustomTooltip.jsx:7` | grep proves zero hardcoded tick hexes remain |
| B5 | Progress ring colors → tokens | `GoalProgressRing.jsx:14,20` | Ring uses scheme roles |

**Focused check:** vitest stats/ring tests; visual diff of charts acceptable.

### Batch C — Sheets, Motion, Input Specs (Medium risk)
| # | Change | Files | Done when |
|---|--------|-------|-----------|
| C1 | Convert create/edit dialogs → modal bottom sheets: 28dp top corners (extra-large), scrim, drag handle, portal-to-body per SelectField precedent | `BudgetSetupModal`, `GoalSetupModal`, `GoalContributeModal`, `BillSetupModal`, `BillPayModal`, `EditTransactionModal`, `Sheet.jsx` primitive | All create flows open as sheets; ESC/scrim dismiss works |
| C2 | Motion tokens: `--ease-emphasized: cubic-bezier(0.2,0,0,1)` 500ms; enter decelerate `cubic-bezier(0.05,0.7,0.1,1)` 400ms; exit accelerate `cubic-bezier(0.3,0,0.8,0.15)` 200ms; update `animate-slide-up`; add exit keyframes; `prefers-reduced-motion` fallback = simple fades | `globals.css` | Sheet enter/exit uses tokens; reduced-motion honored |
| C3 | Outlined field spec: transparent bg, 1px `outline` border, 8dp corners, focus = 2px primary outline (replaces violet-ring convention) | `StatsTab.jsx:163,167`, `ProfileTab.jsx:268`, shared `.field-outlined` class | Consistent field styling app-wide |
| C4 | Segmented buttons replace period filter chips (Hari/Minggu/Bulan/Tahun): connected group, secondary-container selected state | `StatsTab.jsx`, small shared component | Mutually exclusive selection via segment |

**Focused check:** vitest modal-related tests; manual open/dismiss each sheet incl. reduced-motion.

### Batch D — Lists, Menus, Delight (Medium risk)
| # | Change | Files | Done when |
|---|--------|-------|-----------|
| D1 | Two-line transaction rows: leading category avatar (icon in secondary-container circle), name+date line, right-aligned tabular-nums amount, inset dividers (outline-variant) | HomeTab recent list, drill-down list | List anatomy per spec |
| D2 | ⋮ trailing menu replaces always-visible edit/delete pairs; menu items Pencil/Edit + X/Delete with proper labels. Outside-click MUST use `mousedown` (touchstart gotcha) | Drill-down rows, `BudgetCard.jsx:58-63`, `GoalCard.jsx:60-65` | No glyph icons; targets compliant; tap never lost |
| D3 | Emphasized typography on money: hero saldo headline-emphasized weight, card totals title-emphasized | HomeTab hero, NetWorthCard, budget/goal cards | Clear type hierarchy on amounts |
| D4 | Empty states: one-line explanation + suggestion chip ("Catat transaksi pertama") | `HomeTab.jsx:404-414`, budgets/goals/bills empty sections | Every section has guided empty state |
| D5 | Bills badge (dot or count) on Rencana nav item from existing global `bills` state (`overdue`/`due_today`, matching HomeTab priority logic `HomeTab.jsx:83-100`); call `requestNotificationPermission()` contextually after first successful bill pay | `page.js:227,1495-1506`, bills/pay success handler | Badge appears; permission prompt contextual not cold |
| D6 | Top app bar scroll-away reusing existing rAF-throttled listener: translate header up scrolling down past ~100px, restore on scroll-up | `page.js:424-444,1163-1196` | Smooth collapse, no jank |
| D7 | Recent-category suggestion chips in Quick Add: 4–5 input chips from user's most frequent recent categories (derive from `data.transactions`); tap prefills kategori+akun | `QuickAddSheet.jsx:139-140` area | Repeat entry: 3 taps → 1 |

**Focused check:** vitest touched components; verify menu outside-click via mousedown; badge logic unit check.

### Batch E — Dark Mode Completion (Medium-High within UI domain)
| # | Change | Files | Done when |
|---|--------|-------|-----------|
| E1 | Complete `[data-theme="dark"]` remap for ALL roles incl. income/expense/savings/gold semantic colors + chart tokens (currently only 8 vars at `globals.css:37-46`) | `globals.css` | Full dark scheme, charts included |
| E2 | Theme toggle (Terang/Gelap/Sistem) in Profile → Pengaturan; localStorage persist; FOUC-safe inline script in `layout.js` sets `data-theme` pre-paint | `ProfileTab.jsx:195-241`, `layout.js` | Toggle persists; no flash on load |
| E3 | Sweep remaining `bg-white` / hardcoded `text-earth-*` classes to role utilities | dashboard-wide grep | Zero raw surface/text classes outside tokens |
| E4 | `prefers-contrast: more` swaps to higher-contrast variable block (medium/high contrast tier) | `globals.css` | Contrast preference honored |

**Focused check:** toggle light/dark/auto on every tab; spot-check contrast; vitest profile tests.

---

## 5. Verification Gates (repo workflow rules)

1. After EACH batch: only tests covering changed behavior + smallest adjacent regression check. NO full suite per batch.
2. After ALL batches: **exactly one** independent final diff review (reviewer did NOT implement). Reviewer may block only on: task regressions, unmet acceptance criteria, invariant violations, security/privacy/a11y defects in changed code, missing focused coverage.
3. Then: full `npm run test` once → one `npm run build` → `git diff --check`.
4. Update `progress.md` once at milestone end. NO commits unless user asks.
5. High-risk checks not applicable (no auth/quota/payment/data paths touched).

## 6. Known Gotchas (baked into plan)

- **`backdrop-filter` stacking contexts** → sheets/modals portal to body level (follow `SelectField.jsx:129-158` portal precedent)
- **Outside-click** handlers use `mousedown`, never `touchstart`
- **`const` TDZ**: define callbacks before they appear in another hook's dependency array in `page.js`
- **@material/web NOT added** — maintenance-mode; pure CSS-vars/Tailwind approach instead
- **Touch ordering**: `touchstart` fires before `click`
- Glass remains ONLY on nav/header/sheets

## 7. Before → After Reference Mockups (spec material)

### Bottom Navigation — active pill
```
BEFORE                                AFTER
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│  💰        📊        ➕      👤  │  │   ╭─────╮                        │
│ Beranda  Statistik Catat Profil  │  │   │ 🏠 │       📊   ＋   👤     │
│ (9px, color-flip only)           │  │   ╰─────╯                        │
└──────────────────────────────────┘  │  Beranda  Statistik Catat Profil │
                                      └──────────────────────────────────┘
                                      active icon sits in secondary-container
                                      pill; 11px labels; STAYS AT BOTTOM
```

### Snackbar
```
BEFORE                                AFTER
╔══════════════════════════════════╗  ┌──────────────────────────────────┐
║ ▓▓ Transaksi disimpan! ▓▓▓▓▓▓▓▓  ║  │ Transaksi berhasil disimpan URUNGI│
║ ▓▓░░░ countdown bar ░░░░░░░░░░░  ║  └──────────────────────────────────┘
╚══════════════════════════════════╝  flat inverse-surface, one action, no bar
```

### Buttons
```
BEFORE: 4× copied gradients          AFTER: variant hierarchy
╔═════════════════╗                  ╭──────────────╮  filled = primary,
║ ▓▓ Simpan ▓▓▓▓▓ ║ (×4 files)      │    Simpan    │  full-rounded
╚═════════════════╝                  ╰──────────────╱
                                     ┌──────────────┐  tonal = secondary-
                                     │    Batal→    │  container (secondary)
                                     └──────────────┘
                                     Lihat semua      text = low emphasis
```

### Chips
```
BEFORE                                AFTER
╭━━━━━━━━━━━━━╮                      ╭─────────────╮ ╭──────────────╮
┃ Makanan ✦   ┃ colored shadow      │ ✓ Makanan   │ │ Transportasi │
╰━━━━━━━━━━━━━╯ (~29px tall)         ╰─────────────╯ ╰──────────────╯
                                      container swap + ✓, no shadow, ≥32px
```

### FAB
```
BEFORE: 48dp mobile / 56dp desktop, raw primary
AFTER:  56dp always, primary-container fill
        ╭──────╮
        │  ➕  │
        ╰──────╯
```

### Create flows → modal bottom sheet
```
BEFORE: floating centered dialog      AFTER: modal bottom sheet
│   ┌──────────────────┐             │ ░░ scrim ░░░░░░░░░░░░░░ │
│   │  Budget Baru     │             │ ╭─────────────────────╮ │
│   │  [fields...]     │             │ │        ───          │ │ ← handle
│   └──────────────────┘             │ │ Budget Baru         │ │ ← 28dp corners
│                                    │ │ ╭─────────────────╮ │ │
│                                    │ │ │ field (outlined)│ │ │
│                                    │ │ ╰─────────────────╯ │ │
│                                    │ │    [Batal] [Simpan] │ │
│                                    │ ╰─────────────────────╯ │
```

### Depth: tonal surfaces replace shadow-everywhere
```
page bg: surface-container-lowest
╭──────────────────────────────╮
│ surface-container-low  card  │   ← +5% tint = level 1, no shadow
│ ╭──────────────────────────╮ │
│ │ surface-container  inner │ │   ← +8% = level 2
│ ╰──────────────────────────╯ │
╰──────────────────────────────╯
glass reserved for: nav bar / header / sheets only
```

### Motion tokens
```
Sheet enter: translateY(100%→0) cubic-bezier(0.05,0.7,0.1,1) 400ms
Sheet exit:  translateY(0→100%) cubic-bezier(0.3,0,0.8,0.15) 200ms
Screen/tab:  fade+slide cubic-bezier(0.2,0,0,1) 500ms
PTR:         spinner scales w/ pull distance, dismisses on settle
Reduced:     prefers-reduced-motion → simple fades
```

## 8. React Native Port Compatibility

This plan deliberately PREPARES `docs/play-store-react-native-plan.md`:

| This plan | RN destination |
|---|---|
| B3 `designTokens.js` pure JS module | Imported by web AND Expo — identical values |
| B1/B2 MD3 role tokens | NativeWind theme matches Tailwind config (per RN plan strategy) |
| E dark-mode variable remapping | Same roles → `useColorScheme` mapping |
| All component specs/mockups above | Design spec for RN phases 2A–2E (validates UX cheaply pre-port) |

Rebuilt at port time (expected): JSX→RN components, CSS animations→Reanimated, Recharts→Victory Native, sheet/modal code→RN primitives.

Guardrail during implementation: every new value lives in pure JS/CSS vars; no DOM tricks or browser APIs beyond existing patterns; nothing blocks the port.

## 9. Deferred / Rejected

| Item | Status |
|---|---|
| Real routes + deep links | DEFERRED to RN-port era (Batch-E-era follow-up) |
| Navigation rail (left-side nav) | REJECTED by user — bottom nav permanent |
| N2 Search bar/view | Optional, out of scope unless approved |
| N7 FAB speed-dial | Optional, out of scope unless approved |
| N10 Shape-morphing extended FAB | Optional, out of scope unless approved |
| N12 Seed-color theme picker | Optional, trivial after Batch B if approved later |

## 10. Execution Notes for Implementer

- Work batches strictly in order; do not parallelize (shared files: `page.js`, `globals.css`, tailwind config).
- Keep one implementation owner through normal fixes.
- Each batch ends with ITS focused check green before starting next.
- If a batch fails: fix or back out only that batch; earlier passing batches stay intact.
- Final sequence: full suite → production build → `git diff --check` → single progress.md entry.
