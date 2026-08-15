# Statistik And Rencana Refinement Design

## Goal

Improve Statistik chart readability, strengthen Rencana discoverability, and add first-use education for Utang/Piutang without changing financial data behavior.

## Approved Design

### Statistik

- Remove the duplicate `Ringkasannya` section entirely.
- Keep `Kondisi Keuangan` as the single financial summary surface.
- Use a distinct `COLORS` entry for every expense category bar and matching detail marker.
- Show each displayed expense category as `nominal · percentage`, with the percentage calculated against the active expense-category total.
- Replace the horizontal month-comparison line chart with a grouped vertical bar chart.
- Use categories on the X-axis, expense amounts on the Y-axis, and the two selected months as adjacent bar series.
- Sort categories by combined expense across both selected months, highest first; the existing comparison data derivation already applies this order.
- Make the chart horizontally scrollable on narrow screens.
- Render nominal data labels above both month bars at every category, including zero-filled categories that exist in only one month.
- Render visible abbreviated Rupiah ticks on the Y-axis, with consistent distinct colors for the selected month series.
- Preserve current selectors, reset action, tooltip, legend, filters, and `Rutin`/`Semua` data selection.

### Rencana

- Use semantic tones: Ringkasan earth, Target sage, Anggaran amber, Tagihan clay, Utang rose, Event muted blue, and Simulasi violet.
- Keep inactive navigation readable and neutral while tinting each icon tile semantically.
- Keep the active navigation surface dark earth while retaining the semantic icon tile.
- Add slim semantic top borders, larger icon tiles, visible `Buka` affordances, trailing arrows, and clear hover/pressed/focus states to the Target, Anggaran, and Tagihan overview cards.
- Preserve existing feature gates, section keys, callbacks, and 44px touch targets.

### Utang/Piutang Education

- Replace the empty one-line shortcut with the shared `FeatureEducation` component.
- Title: `Pantau utang dan piutang dengan jelas`.
- Description: `Catat siapa yang terlibat, jumlahnya, dan kapan perlu diselesaikan.`
- Steps: choose the type, fill the details, set the due date, and record payments until settled.
- Example: `Cicilan keluarga / Pinjaman ke teman`.
- CTA: `Tambah Utang/Piutang`, wired to the existing setup modal.

## Boundaries

- No API, Google Sheets, Supabase, quota, entitlement, payment, schema, dependency, or unrelated dashboard changes.
- Preserve internal `actual`/`routine` keys and all existing financial calculations.
- Preserve existing animation and reduced-motion behavior.
- Use the existing DM Sans/Playfair typography, semantic tokens, Lucide icons, Tailwind, and Recharts.

## Verification

- Focused tests cover chart colors, percentages, removal of `Ringkasannya`, complete comparison data, labels, Rencana affordances, gates, and Utang/Piutang education.
- Run the full Vitest suite, production build with process-only placeholders for absent local production variables, `git diff --check`, and one independent final diff review.
