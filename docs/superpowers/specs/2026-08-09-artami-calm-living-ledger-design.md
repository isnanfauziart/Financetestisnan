# Artami Calm Living Ledger Design

**Date:** 2026-08-09
**Status:** Approved for implementation
**Scope:** Frontend UI/UX revamp only. Existing Google Sheets, Supabase, quota, feature-gating, payment, and ledger contracts remain unchanged.

## Direction

Artami becomes a calm, intelligent personal ledger. It keeps the existing four-item mobile shell and floating `Catat` action, but reduces decorative competition, improves hierarchy, and makes every feature explain its value before asking for setup.

## Navigation

- `Beranda`: financial condition, monthly flow, priorities, plan progress, and recent evidence.
- `Statistik`: analytical takeaway, summary, categories, trends, and reports. The label stays `Statistik`.
- `Rencana`: overview, Target, Anggaran, Tagihan, promoted Simulasi, then secondary tools.
- `Profil`: identity, data ownership, plan/access, preferences, help, and account controls.
- Floating `Catat`: stays above bottom navigation and opens the existing Quick Add sheet. Desktop may expose the same action in the header.

## Beranda

Order content as condition -> monthly flow -> priorities -> planning progress -> one or two prioritized insights -> recent transactions. Show a compact sync status row: `Tersinkron ke Google Sheets - 2 menit lalu`, with loading/offline states and an info sheet explaining that the ledger remains in the user's Google Sheets.

The dark net-worth hero remains, but continuous glow and gradient movement are removed. Keep the existing financial values and behavior. Add a clean cash-flow visualization using direct values; do not add decorative plants or unrelated imagery. Smart features remain discoverable in Statistik; Beranda shows the highest-priority actionable insight, or two when both are urgent.

## Statistik

Keep the existing financial summary card containing total Surplus/Defisit, Pemasukan, and Pengeluaran. Put the order on the page as compact filters -> opening takeaway -> section navigation -> selected section. The takeaway interprets the selected period and mode; the summary card presents totals when `Ringkasan` is selected. Rename the user-facing `Recap` label to `Laporan` while keeping internal keys stable.

Use ranked horizontal bars before composition charts, limit default trend series, keep direct labels, and provide text summaries for charts. Chart motion settles quickly and never delays reading.

## Rencana and Simulasi

Open on `Rencana Bulan Ini` with three primary planning pillars: Target, Anggaran, and Tagihan. Feature Simulasi immediately after them with the headline:

> Kalau kebiasaanmu berubah, hasilnya bagaimana?

Use the existing `What-If` name. Rename the user-facing Financial Independence label to `Financial Freedom`; retain existing entitlement keys and calculations. Personalized What-If and Financial Freedom values remain gated exactly as today. Free users may see static, clearly labelled examples.

## Visual system

- Canvas: warm paper `#FBF8F1`; surfaces: white; borders: `#E2D9CC`.
- Primary action: forest `#2F6B57`; hover/deep `#255344`; soft `#E5F0EB`.
- Smart/Pro: violet `#6E59B5`, reserved for Simulasi, Financial Freedom, smart insights, and Pro.
- Text: ink `#29231E`, secondary `#6B625A`.
- Semantic colors remain distinct: income green, expense clay-red, savings teal, warning amber, danger red.
- Standard cards use white, border, and restrained shadow. Glass is limited to navigation and sheets. The dark hero owns the strongest surface.
- Keep Playfair Display for short editorial headings and DM Sans for figures, labels, charts, and body copy.
- Keep Lucide icons with approximately 2px stroke and 44px minimum interactive hit areas.
- Replace the detailed wallet icon with a small-size-safe ledger `A` mark: forest on warm cream with one violet smart marker and no gradients or sparkles.

## Motion

- Press: 120-140ms scale feedback.
- Controls/tabs: 160-220ms.
- Sheets: 280-320ms with drawer easing `cubic-bezier(0.32, 0.72, 0, 1)`.
- Rare education/completion: 350-450ms.
- Remove continuous glow, animated header gradients, broad page bento motion, long chart animations, and repeated count-up on revisits.
- Simulasi uses cause-and-effect motion: input changes immediately, result numbers crossfade/retarget in 180-220ms, and the target date marker moves in 220ms.
- Reduced motion removes positional movement and keeps short opacity/color feedback.

## Acceptance

- Four bottom-nav items remain unchanged.
- Floating `Catat` remains detached from tab semantics and opens Quick Add.
- No backend or data-schema changes.
- Indonesian-first copy is consistent and uses `kamu`.
- Touch targets are at least 44px, charts have text alternatives, and reduced motion is supported.
- Existing feature gates, quota behavior, and transaction flows continue to pass their tests.
