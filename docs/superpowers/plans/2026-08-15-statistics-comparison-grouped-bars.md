# Statistics Comparison Grouped Bars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Statistik month-comparison line chart with a readable grouped vertical bar chart that compares two selected months per expense category.

**Architecture:** Keep the existing comparison data derivation in `dashboard/page.js`, including its combined-value descending sort and zero-filled category union. Change only the comparison chart rendering in `StatsTab.jsx`, with focused assertions in `StatsTab.test.jsx`.

**Tech Stack:** Next.js 14, React 18, Recharts 2.12, Vitest, Testing Library, Tailwind CSS.

## Global Constraints

- Preserve existing comparison selectors, reset action, tooltip, custom color key, filters, and `Rutin`/`Semua` data selection.
- Use categories on the X-axis and expense amounts on the Y-axis.
- Render two adjacent month bars per category, ordered by combined expense across both months.
- Render both nominal values above their bars, including zero-filled categories.
- Use `9px` for the nominal labels above bars.
- Place a custom color key below the X-axis with one colored circle for each month and the caption `Keduanya menunjukkan pengeluaran`.
- Keep the chart horizontally scrollable on narrow screens.
- Do not change APIs, Google Sheets, Supabase, quotas, entitlements, transactions, or dependencies.

---

### Task 1: Replace the comparison chart

**Files:**
- Modify: `src/app/dashboard/StatsTab.jsx:448-470`
- Test: `tests/components/StatsTab.test.jsx:142-184`

**Interfaces:**
- Consumes: `activeCompareChartData`, `compareLabelA`, `compareLabelB`, `formatRp`, `THEME`, and the existing comparison controls.
- Produces: A grouped `BarChart` with `XAxis dataKey="category"`, formatted `YAxis`, two `Bar` series, compact nominal `LabelList`s, tooltip, custom below-axis color key, and the existing accessible summary.

- [x] **Step 1: Write the failing test**

  Update the comparison test to require rendered bar rectangles, two bar label lists, no line curves, all category labels, nominal values for both months, and formatted Y-axis ticks.

- [x] **Step 2: Run the focused test and verify the expected failure**

  Run `npm run test -- tests/components/StatsTab.test.jsx`.

  Expected: the old line chart fails because it renders no `.recharts-bar-rectangle` elements.

- [x] **Step 3: Implement the minimal chart replacement**

  Render the existing `activeCompareChartData` through:

  ```jsx
  <BarChart data={activeCompareChartData} margin={{ top: 24, right: 12, left: 0, bottom: 28 }} barCategoryGap="24%" barGap={4}>
    <XAxis dataKey="category" interval={0} tickMargin={8} axisLine={false} tickLine={false} />
    <YAxis width={58} tickFormatter={value => formatRp(value)} allowDecimals={false} axisLine={false} tickLine={false} />
    <Tooltip content={<CustomTooltip />} />
    <Bar dataKey={compareLabelA} name={compareLabelA} fill={THEME.income} radius={[6, 6, 0, 0]} maxBarSize={24}>
      <LabelList dataKey={compareLabelA} position="top" formatter={value => formatRp(value || 0)} fill={THEME.textPrimary} fontSize={9} />
    </Bar>
    <Bar dataKey={compareLabelB} name={compareLabelB} fill={THEME.expense} radius={[6, 6, 0, 0]} maxBarSize={24}>
      <LabelList dataKey={compareLabelB} position="top" formatter={value => formatRp(value || 0)} fill={THEME.textPrimary} fontSize={9} />
    </Bar>
  </BarChart>
  ```

- [x] **Step 4: Run the focused test and verify it passes**

  Run `npm run test -- tests/components/StatsTab.test.jsx`.

  Expected: 27 tests pass.

- [x] **Step 5: Add the compact labels and explicit expense color key**

  Set `fontSize={9}` on both value `LabelList` components, remove the automatic comparison legend, and render this key after the chart inside the horizontal scroll surface:

  ```jsx
  <div role="group" aria-label="Keterangan warna perbandingan">
    <span><span aria-hidden="true" style={{ background: THEME.income }} />{compareLabelA}</span>
    <span><span aria-hidden="true" style={{ background: THEME.expense }} />{compareLabelB}</span>
    <p>Keduanya menunjukkan pengeluaran</p>
  </div>
  ```

### Task 2: Verify and document the refinement

**Files:**
- Modify: `docs/superpowers/specs/2026-08-11-statistik-rencana-refinement-design.md`
- Modify: `progress.md`

**Interfaces:**
- Consumes: the approved grouped-bar behavior and focused test evidence.
- Produces: source-of-truth design and chronological progress entries.

- [x] **Step 1: Update the design specification**

  Replace the previous line-chart wording with grouped bars, combined-value ordering, visible Rupiah Y-axis ticks, and labels above both bars.

- [x] **Step 2: Run the final verification gate**

  Run `npm run test`, `npm run build` with process-only placeholders for absent local production variables, and `git diff --check`.

- [x] **Step 3: Append the completed session to `progress.md`**

  Record the changed chart, focused/full verification, review findings, and the fact that unrelated worktree changes remain untouched.
