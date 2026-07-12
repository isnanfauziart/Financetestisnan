# Design Spec: Artami Launch Motion Graphics

**Date:** 2026-07-12
**Status:** Approved for storyboard; awaiting written-spec review
**Scope:** One editable Remotion project for a 28-second landscape product-launch master. This specification does not change the Artami web application.

## 1. Objective

Create a premium, product-led motion graphic that drives Google Play downloads for Artami after its listing is live. It must make Artami's value clear without voiceover, pricing, real-person footage, or generative AI video.

The narrative is a guided financial journey:

1. Everyday spending feels scattered.
2. Artami organizes it into understandable statistics.
3. Statistics become financial intelligence and a realistic plan.
4. Financial data remains in the user's own Google Sheets.
5. A short real-app capture proves the product is live.
6. The end card asks viewers to download Artami.

## 2. Audience And Message

- Audience: broad Indonesian market, primarily ages 25-35; relevant to salaried workers, freelancers, students, and young families.
- Language: Bahasa Indonesia, practical and conversational.
- Fictional user: a young salaried professional.
- Core promise: Artami brings clarity, planning, and ownership to personal-finance data.
- CTA: `Download Artami`.
- Exclusions: price, lifetime-access message, QR code, APK language, URLs, and secondary CTA.

## 3. Format And Visual System

### Output

- Primary master: `1920 x 1080`, 30 fps, H.264 MP4, approximately 28 seconds.
- Fallback: `1280 x 720`, using the same composition and timing.
- Future deliverable: a separately recomposed vertical cutdown, never a crop of the landscape master.

### Composition

- Left 55%: Indonesian copy, supporting visual data, and transitions.
- Right 45%: portrait Artami phone/mockup surface.
- Keep headlines, CTA, and key figures away from outer edges for later platform-safe re-layout.
- The real app capture remains framed as a portrait surface in the landscape master.

### Art Direction

- Use Artami's warm cream, earth, violet, moss, clay, and amber system.
- Reuse the app's rounded bento cards, mesh gradients, soft glass, and editorial serif accents.
- Motion is smooth and premium: slow camera drift, restrained soft springs, calm count-ups, and clear transitions.
- Never use people, lifestyle shots, avatars, or AI-generated realistic video.
- Never use AI-generated product UI; all mockup UI is code-built and based on Artami's visual system.

## 4. Audio

- No voiceover.
- Use an understated optimistic electronic music placeholder and commercially safe placeholder UI SFX.
- UI sound palette: payment confirmations, notification/bell cues, taps, swipes, card settles, and number ticks.
- Replace placeholders with final commercially approved assets before publication.
- Sound effects support visual transitions and never overpower the interface.

## 5. Consistent Fictional Scenario

Every mockup derives from one editable financial scenario. Values must remain internally consistent.

| Metric | Value |
|---|---:|
| Monthly income | Rp 5.000.000 |
| Monthly expenses | Rp 4.600.000 |
| Current monthly savings | Rp 400.000 / 8% |
| Projected monthly savings target | Rp 600.000 / 12% |
| Health Score | 54 sekarang -> target 68 |
| FI Index | 12% |

| Expense category | Amount | Share |
|---|---:|---:|
| Kos & Tagihan | Rp 1.840.000 | 40% |
| Makan & Minum | Rp 920.000 | 20% |
| Langganan | Rp 920.000 | 20% |
| Jajan | Rp 552.000 | 12% |
| Transportasi | Rp 368.000 | 8% |

The forecast represents a gradual, believable recovery after identifying flexible spending. It must not imply that the improved Health Score has already been achieved.

## 6. Storyboard

| Time | Scene | Copy | Visual And Motion | Audio |
|---|---|---|---|---|
| 0.0-3.0s | Money pressure | `Gaji masuk, tapi cepat habis.` then `Setiap bulan, uangmu ke mana aja?` | Cream mesh background. Chips for Jajan, Ngopi, Kondangan, and Tagihan accumulate with small expense amounts and a declining balance. They remain calm and readable. | Payment pings and soft notifications. |
| 3.0-7.0s | Spending clarity | `Lihat pengeluaranmu dengan jelas.` | Floating inputs snap into Artami's top-expense cards and an expense donut. The portrait phone sits on the right. | Tap and card-settle cues. |
| 7.0-10.0s | Daily habits | `Pahami pola pengeluaranmu setiap hari.` | Daily heatmap fills by intensity beside a `Savings Rate 8%` card. | Quiet calendar/page-turn cue and number tick. |
| 10.0-15.0s | Plan forward | `Rencanakan, dan lihat prediksi masa depanmu.` | Cash-flow line extends from Rp 400.000 toward Rp 600.000. `8% -> 12%` remains readable. | Music gently lifts; restrained upward chime. |
| 15.0-19.0s | Financial intelligence | `Pahami kondisi keuanganmu.` then `Lihat seberapa dekat kamu ke tujuan finansialmu.` | Health Score ring shows `54 sekarang -> target 68`; FI Index ring shows 12%. The target appears as a marker, not an achieved animation. | Calm score-ring trace and light confirmation. |
| 19.0-22.5s | Data ownership | `Data tetap milikmu.` `Bukan di server kami.` `Tersimpan di Google Sheets-mu.` | Artami-styled transaction rows morph into a recognizable Sheets-style grid, ending with Google Sheets icon. | Gentle sync/success cue. |
| 22.5-25.5s | Product proof | Optional small support line: `Artami dalam genggamanmu.` | Real Android app capture: Home -> Statistics -> one intelligence view -> Home. It is masked within the portrait phone. | Smooth transition from mockup to capture; preserve music continuity. |
| 25.5-28.0s | End card | `Download Artami` | Artami icon with official Google Play badge. | Music resolve and one quiet confirmation chime. |

## 7. Remotion Architecture

### Composition Layer

- `ArtamiLaunchLandscape` is the 1920x1080, 30 fps primary composition.
- `ArtamiLaunchLandscape720` reuses the master logic at 1280x720.
- A future portrait composition consumes the same scenario and copy props but gets its own layout and scene timing adjustments.

### Scene Components

- `MoneyPressureScene`: chips, amounts, and balance-pressure opening.
- `StatisticsScene`: top expenses, donut, heatmap, and savings rate.
- `IntelligenceScene`: forecast, Health Score, and FI Index.
- `SheetsOwnershipScene`: Artami transaction rows to Sheets-style grid transition.
- `ProductProofScene`: trimmed real recording inside a device frame.
- `EndCardScene`: icon, CTA, and Google Play badge.

Each scene owns its local animation only. The composition coordinates scene duration, transitions, shared background treatment, and audio timing.

### Editable Props

- Copy strings and CTA.
- Scene durations and composition duration.
- Brand colors.
- Scenario amounts, labels, chart data, Health Score, FI Index, and savings targets.
- UI screenshot/mockup asset paths.
- Real-app proof file path and trim range.
- Audio asset paths and volumes.
- Artami icon and Google Play badge paths.
- Output dimensions through individual composition definitions.

## 8. Real-App Proof Requirements

- Re-record the proof clip with a generic demo profile and fictional data.
- Use the installed Android app whenever possible so no browser URL is visible.
- The existing recording cannot be used unedited because it exposes a personal name and `ultah.biz.id`.
- Never show a personal name, email address, website URL, spreadsheet ID, real transaction, or other sensitive account data.
- Preserve enough visible product interaction to make the capture credible.

## 9. Asset Requirements

- Use the current `public/icons/icon.svg` for Artami unless a final replacement is supplied.
- Add the official Google Play badge only after the listing is approved.
- Store approved music, SFX, screenshots, and real capture assets in project-local asset folders with clear names.
- Track commercial-use source/license details beside any non-owned audio asset.

## 10. Validation

Before final publication, verify:

- The master renders at 1920x1080, 30 fps, around 28 seconds.
- 720p fallback renders with the same pacing and no cropped critical content.
- All Indonesian copy is spelled correctly and remains readable at common playback sizes.
- Amounts, percentages, top expenses, savings rate, forecast, Health Score, and FI Index match the scenario tables.
- The forecast and Health Score wording do not imply guaranteed or already-achieved outcomes.
- The Google Sheets statement accurately reflects Artami's user-owned Sheets architecture.
- The real proof capture shows no personal or sensitive information.
- CTA includes only Artami icon, `Download Artami`, and the official Google Play badge.
- All audio assets are commercially cleared before publishing.

## 11. Scope Boundaries

In scope:

- One editable landscape Remotion master and 720p fallback.
- Placeholder music and UI SFX.
- Code-built Artami visual mockups.
- One prepared slot for a clean real-app proof capture.
- A future-ready shared scenario and copy interface for a vertical re-composition.

Out of scope:

- A completed vertical cutdown in the first delivery.
- AI-generated realistic footage or product UI.
- Voiceover, pricing, waitlist, QR code, direct APK, or website-url CTA treatment.
- Changes to Artami's production web application.
