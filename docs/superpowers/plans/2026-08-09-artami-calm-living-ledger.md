# Artami Calm Living Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Apply the approved Calm Living Ledger UI/UX direction to Artami without changing its four-tab shell, floating Catat flow, data contracts, or feature gates.

**Architecture:** Make the smallest frontend-only changes in the existing dashboard components. Centralize visual tokens and motion in the existing CSS/Tailwind/theme files, add one reusable sync status component, then refine Home, Stats, and Plan in place. Keep internal feature keys and route behavior stable.

**Tech Stack:** Next.js 14 App Router, React 18, JavaScript, Tailwind CSS 3.4, Recharts, Lucide React, Vitest, Testing Library.

## Global Constraints

- Keep exactly four bottom navigation items: Beranda, Statistik, Rencana, Profil.
- Keep floating `Catat` detached from tab semantics and opening Quick Add.
- Do not change Google Sheets, Supabase, quota, feature-gating, payment, or ledger APIs.
- Keep user-facing copy Indonesian-first and conversational with `kamu`.
- Keep internal feature key `financialIndependence`; only rename its user-facing label to `Financial Freedom`.
- Use forest green for primary actions and violet only for smart/Pro surfaces.
- All new interactive controls must meet a 44px minimum hit target.
- Every production behavior change gets focused Vitest coverage before it is marked complete.
- Respect `prefers-reduced-motion` and avoid continuous animation in the finance dashboard.

## Implementation Tasks

### Task 1: Visual foundation and brand assets

Modify `src/app/globals.css`, `tailwind.config.js`, `src/app/dashboard/_components/constants.js`, `public/icons/icon.svg`, `public/manifest.json`, and generated icon PNGs. Add focused token/contrast assertions to `tests/lib/theme.test.js` or `tests/lib/uiContrast.test.js`. Replace hard-coded dashboard action gradients with semantic tokens, reduce universal bento movement, and define the approved timing/easing utilities.

Verify with the focused theme/contrast tests and `npm run generate:icons`.

### Task 2: Sync status and shell motion

Create `src/app/dashboard/_components/SyncStatus.jsx`. Integrate it into `src/app/dashboard/page.js` using the existing `lastSyncAt`, `refreshing`, `isOnline`, `fetchData`, and `getLastSyncAgo` values. Keep the four nav items and floating Catat. Add focused tests for current, refreshing, and offline status. Reduce FAB/header/nav motion to approved values and preserve safe areas.

### Task 3: Beranda hierarchy

Modify `src/app/dashboard/HomeTab.jsx` and `tests/components/HomeTab.test.jsx`. Keep the net-worth hero and existing callbacks. Add a compact cash-flow card with direct income/expense/savings values, use the existing priority action computation, show at most two actionable insights, and remove competing repeated smart previews from the main narrative. Preserve recent transaction and budget/bill routes.

### Task 4: Statistik hierarchy and accessibility

Modify `src/app/dashboard/StatsTab.jsx`, `tests/components/StatsTab.test.jsx`, and chart helper styles as needed. Add an opening takeaway below compact filters and before section tabs. Keep the Ringkasan financial summary card inside Ringkasan. Rename only the displayed `Recap` label to `Laporan`. Add accessible text summaries for major charts, reduce chart motion, and preserve existing data/feature-gating props and test contracts.

### Task 5: Rencana overview and promoted Simulasi

Modify `src/app/dashboard/PlanTab.jsx`, `src/components/WhatIfModal.jsx`, `src/components/FITrackerCard.jsx`, `tests/components/PlanTab.test.jsx`, and affected feature-visibility tests. Add a planning overview while preserving deep-link support. Feature Simulasi with the approved headline and existing What-If action. Change visible Financial Independence copy to Financial Freedom only; preserve the internal entitlement key and calculations.

### Task 6: Verification and documentation

Run focused component/lib tests, then `npm run test`, `npm run build` with the repository's documented temporary environment values, `git diff --check`, and inspect the final diff. Append a dated entry to `progress.md` listing changes, decisions, verification, and any local environment blocker. Do not alter unrelated dirty files.
