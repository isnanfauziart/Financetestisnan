# Artami Landing Page V2 — Design Specification

**Date:** 20 July 2026  
**Status:** Approved  
**Target:** Standalone Next.js app in `Landingpagev2/`

## Goal

Build an Indonesian-first landing page that sends visitors to the existing Artami web app today and can promote the Play Store listing later. The page must be visually distinct from `landingpageartami` and treat user-owned Google Sheets storage as Artami's principal competitive advantage.

## Positioning and accurate privacy copy

Primary promise:

> Datamu, tetap milikmu.

Supporting explanation:

> Data transaksi disimpan di Google Sheets milikmu, bukan disalin ke database transaksi Artami. Artami mendapat akses terbatas setelah kamu memberikan izin, hanya untuk menjalankan fitur yang kamu gunakan.

Avoid the absolute claim that Artami never has access: the app must receive authorized access while serving the user. Emphasize ownership, limited OAuth scope, no bank linking, no ads, and no sale of transaction data.

## Conversion

- Current primary CTA: **Buka Artami**.
- Current secondary state: **Segera hadir di Play Store**, clearly unavailable until a real URL exists.
- Store URLs and availability live in `Landingpagev2/lib/links.js` so the Play Store action can later become primary without restructuring the page.

## Creative direction

Use an **Editorial Finance Briefing** aesthetic: calm, analytical, tactile, and premium. Avoid repeating the old page's lifestyle hero, phone-shell composition, rounded SaaS-card rhythm, decorative badges, emojis, fake testimonials, and purple gradients.

Visual system:

- Ink `#10120F`, paper `#F4EFE6`, moss `#2E4036`, clay `#CC5833`, sage `#DDE6D6`, line `#D8D0C3`.
- Outfit for display and body text; tabular numerals for financial figures.
- Fine rules, restrained radii, editorial annotations, dense but legible data compositions.

## GPT-Taste plan

```text
seed = Artami brief character count
hero = Editorial Split
font = Outfit
components = Gapless Bento, Horizontal Feature Panels, Scenario Calculator
motion = Pinned Feature Stack, Scrubbed Text Reveal
```

- AIDA: navigation → hero → product intelligence → scenario/trust desire → pricing/download action.
- H1 uses a 72rem maximum and `clamp(3.4rem, 7vw, 6.8rem)` to remain within two or three lines.
- Desktop bento uses 12 dense columns: row one `5 + 3 + 4`, row two `5 + 7`; no empty cells.
- Buttons use paper-on-ink or ink-on-paper contrast with visible focus states.

## Page chapters

1. **Navigation** — Fitur, Privasi, Harga, and **Buka Artami**.
2. **Hero** — “Keuangan pribadi yang akhirnya bisa dibaca.” Paired with a financial briefing composition rather than a phone mockup.
3. **Problem** — “Catatan ada. Keputusan belum.” Show the gap between totals and meaningful decisions.
4. **Intelligence bento** — Financial Health Score, cash-flow projection, spending anomaly alerts, monthly budgets, and Personal Independence Index.
5. **Pinned product story** — see today's condition, estimate what comes next, choose a change, and measure its effect on a goal.
6. **Indonesian event budgets** — Anak Masuk Sekolah, THR/Lebaran, Kondangan, Arisan, BPJS, and annual obligations.
7. **What-if scenario** — show how reducing Jajan by Rp300.000 or adding Rp1.000.000 income changes a goal date and independence progress. Treat this as an illustrative estimate, not financial advice.
8. **Data ownership** — a major full-width chapter using the flow **Kamu → Google Sheet milikmu → Artami menampilkan insight**. State no bank linking, no ads, no data sale, user-inspectable Sheets, and limited file authorization.
9. **Pricing** — Gratis limits versus Rp49.000 one-time lifetime access. Never use subscription language.
10. **Final CTA and footer** — web app available now, Play Store coming soon, plus privacy and terms links.

## Architecture

Create an independent Next.js App Router project with its own package and lockfile. Keep `app/page.js` server-rendered. Isolate navigation state and GSAP behavior in client components. Centralize copy and links under `lib/`.

Suggested components: `Navigation`, `EditorialHero`, `FinancialBriefing`, `FeatureBento`, `PinnedFeatureStory`, `EventBudgetRail`, `WhatIfScenario`, `DataOwnership`, `Pricing`, `FinalCTA`, and `Footer`.

## Interaction, responsive, and accessibility

- Desktop may use pinned stacking; mobile and reduced-motion modes use a normal vertical flow.
- Animate transform and opacity only; every interactive target is at least 44×44px.
- Include a skip link, one H1, sequential headings, visible focus states, and text summaries for decorative charts.
- Do not communicate progress, anomaly, or pricing differences with color alone.
- Verify 375px, 768px, 1024px, and 1440px with no horizontal overflow.

## Performance and verification

- Keep most content as server components and restrict GSAP to the motion chapter.
- Prefer local product screenshots and CSS-generated graphics over stock photography.
- Run `npm run build` inside `Landingpagev2`.
- Verify keyboard navigation, reduced motion, CTA destinations, privacy-copy accuracy, and honest Play Store state.

## Out of scope

- A new waitlist backend.
- Publishing the Play Store listing.
- Editing the existing dashboard or `landingpageartami`.
- Fabricated testimonials, usage claims, or personalized financial advice.
