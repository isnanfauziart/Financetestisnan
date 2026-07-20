# Artami Landing Page V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, production-ready Next.js landing page in `Landingpagev2/` that opens the Artami web app today, presents Play Store availability honestly, and makes user-owned Google Sheets data the central brand promise.

**Architecture:** A Next.js 14 App Router project renders most content as server components. Interactive navigation and GSAP scroll behavior are isolated in small client components; content and outbound destinations are centralized under `lib/` so Play Store launch requires a data change instead of a redesign.

**Tech Stack:** Next.js 14.2.35, React 18.3, JavaScript, Tailwind CSS 3.4, GSAP 3 with `@gsap/react`, Lucide React, Node's built-in test runner.

## Global Constraints

- Create only `Landingpagev2/`, the plan/spec documents, and the required bottom entry in root `progress.md`; do not modify `landingpageartami` or the dashboard.
- Indonesian-first copy; use **Datamu, tetap milikmu** as the main trust promise.
- Say that transactions are stored in the user's Google Sheet and not duplicated into an Artami transaction database; do not claim the app never receives authorized access.
- Primary CTA opens the existing web app; Play Store remains clearly unavailable until `lib/links.js` contains a real store URL.
- Use Outfit, ink `#10120F`, paper `#F4EFE6`, moss `#2E4036`, clay `#CC5833`, sage `#DDE6D6`, and line `#D8D0C3`.
- No emojis, fake testimonials, stock photos, purple gradients, decorative hero badges, cheap meta labels, or subscription language.
- Mobile and reduced-motion modes must not use scroll pinning.
- Minimum 44×44px interaction targets, visible focus styles, one H1, sequential headings, and no horizontal overflow.

---

### Task 1: Standalone project foundation and content contracts

**Files:**
- Create: `Landingpagev2/package.json`
- Create: `Landingpagev2/next.config.js`
- Create: `Landingpagev2/jsconfig.json`
- Create: `Landingpagev2/postcss.config.js`
- Create: `Landingpagev2/tailwind.config.js`
- Create: `Landingpagev2/lib/links.js`
- Create: `Landingpagev2/lib/content.js`
- Create: `Landingpagev2/tests/content.test.mjs`

**Interfaces:**
- Produces: `SITE_LINKS`, `NAV_ITEMS`, `FEATURES`, `EVENT_BUDGETS`, `PRICING_PLANS`, and `SCENARIOS` named exports.
- `SITE_LINKS.webApp` is a non-empty URL or route string.
- `SITE_LINKS.playStore` is `null` before publication and `SITE_LINKS.playStoreAvailable` derives from it.

- [ ] **Step 1: Write the failing content-contract test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { SITE_LINKS } from "../lib/links.js";
import { FEATURES, EVENT_BUDGETS, PRICING_PLANS, SCENARIOS } from "../lib/content.js";

test("launch destinations remain explicit", () => {
  assert.equal(typeof SITE_LINKS.webApp, "string");
  assert.ok(SITE_LINKS.webApp.length > 0);
  assert.equal(SITE_LINKS.playStoreAvailable, Boolean(SITE_LINKS.playStore));
});

test("landing content covers Artami's differentiators", () => {
  assert.ok(FEATURES.some(({ id }) => id === "health-score"));
  assert.ok(FEATURES.some(({ id }) => id === "independence-index"));
  assert.ok(EVENT_BUDGETS.includes("THR/Lebaran"));
  assert.equal(PRICING_PLANS.length, 2);
  assert.ok(SCENARIOS.length >= 2);
});
```

- [ ] **Step 2: Run the test and confirm the red state**

Run: `cd Landingpagev2; npm test`  
Expected: FAIL because `package.json`, `lib/links.js`, and `lib/content.js` do not exist.

- [ ] **Step 3: Add the project configuration and content modules**

Use scripts `next dev -p 3001`, `next build`, `next start -p 3001`, and `node --test tests/*.test.mjs`. Add dependencies `next@14.2.35`, `react@18.3.1`, `react-dom@18.3.1`, `gsap@^3.15.0`, `@gsap/react@^2.1.2`, and `lucide-react@^0.460.0`. Define the named exports exactly as tested, with Indonesian feature/pricing copy from the approved spec.

- [ ] **Step 4: Install and run the contract test**

Run: `cd Landingpagev2; npm install; npm test`  
Expected: all Node tests pass and `package-lock.json` is created.

- [ ] **Step 5: Commit the foundation**

```powershell
git add Landingpagev2/package.json Landingpagev2/package-lock.json Landingpagev2/next.config.js Landingpagev2/jsconfig.json Landingpagev2/postcss.config.js Landingpagev2/tailwind.config.js Landingpagev2/lib Landingpagev2/tests
git commit -m "feat: scaffold Artami landing page v2"
```

### Task 2: Server-rendered editorial page and responsive design system

**Files:**
- Create: `Landingpagev2/app/layout.js`
- Create: `Landingpagev2/app/page.js`
- Create: `Landingpagev2/app/globals.css`
- Create: `Landingpagev2/components/EditorialHero.jsx`
- Create: `Landingpagev2/components/FinancialBriefing.jsx`
- Create: `Landingpagev2/components/FeatureBento.jsx`
- Create: `Landingpagev2/components/EventBudgetRail.jsx`
- Create: `Landingpagev2/components/WhatIfScenario.jsx`
- Create: `Landingpagev2/components/DataOwnership.jsx`
- Create: `Landingpagev2/components/Pricing.jsx`
- Create: `Landingpagev2/components/FinalCTA.jsx`
- Create: `Landingpagev2/components/Footer.jsx`
- Create: `Landingpagev2/tests/page-source.test.mjs`

**Interfaces:**
- Consumes: content arrays and `SITE_LINKS` from Task 1.
- Produces: anchor IDs `fitur`, `skenario`, `privasi`, and `harga` consumed by navigation.
- `FinalCTA({ links })` renders a web link and a non-clickable Play Store status when `links.playStoreAvailable` is false.

- [ ] **Step 1: Write the failing source-level page checks**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("page contains conversion and ownership chapters", async () => {
  const page = await readFile(new URL("../app/page.js", import.meta.url), "utf8");
  for (const name of ["EditorialHero", "FeatureBento", "DataOwnership", "Pricing", "FinalCTA"]) {
    assert.match(page, new RegExp(name));
  }
});

test("global styles protect accessibility and overflow", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /focus-visible/);
  assert.match(css, /overflow-x/);
});
```

- [ ] **Step 2: Run the test and confirm the red state**

Run: `cd Landingpagev2; npm test`  
Expected: FAIL because the page and stylesheet do not exist.

- [ ] **Step 3: Implement the static editorial experience**

Use `next/font/google` with Outfit in `layout.js`. Compose every section in `page.js`, keep all financial mockups decorative with adjacent text summaries, and use the 12-column dense bento math from the spec. Put design tokens, global focus treatment, responsive rules, grain, chart styling, and reduced-motion fallbacks in `globals.css`.

- [ ] **Step 4: Run tests and a production build**

Run: `cd Landingpagev2; npm test; npm run build`  
Expected: Node tests pass and Next reports a successful static `/` build.

- [ ] **Step 5: Commit the editorial page**

```powershell
git add Landingpagev2/app Landingpagev2/components Landingpagev2/tests/page-source.test.mjs
git commit -m "feat: build Artami editorial landing experience"
```

### Task 3: Accessible navigation and GSAP product narrative

**Files:**
- Create: `Landingpagev2/components/Navigation.jsx`
- Create: `Landingpagev2/components/PinnedFeatureStory.jsx`
- Create: `Landingpagev2/tests/client-boundaries.test.mjs`
- Modify: `Landingpagev2/app/page.js`
- Modify: `Landingpagev2/app/globals.css`

**Interfaces:**
- `Navigation({ items, links })` consumes Task 1 exports, closes on Escape, restores focus, and renders a real Play Store link only when available.
- `PinnedFeatureStory({ features })` consumes `FEATURES`; GSAP runs only at desktop widths when reduced motion is not requested.

- [ ] **Step 1: Write the failing client-boundary test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("interactive components are explicit client boundaries", async () => {
  for (const file of ["Navigation.jsx", "PinnedFeatureStory.jsx"]) {
    const source = await readFile(new URL(`../components/${file}`, import.meta.url), "utf8");
    assert.match(source, /^['\"]use client['\"]/);
  }
});

test("motion respects reduced-motion and cleans up", async () => {
  const source = await readFile(new URL("../components/PinnedFeatureStory.jsx", import.meta.url), "utf8");
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /useGSAP/);
  assert.match(source, /matchMedia/);
});
```

- [ ] **Step 2: Run the test and confirm the red state**

Run: `cd Landingpagev2; npm test`  
Expected: FAIL because interactive components do not exist.

- [ ] **Step 3: Implement navigation and scoped motion**

Use `useState`, `useRef`, and a keydown effect for the menu. Use `useGSAP` with a scoped ref; register `ScrollTrigger`, use `gsap.matchMedia()`, and return all cleanup through the hook context. Desktop panels may pin and stack; small screens and reduced-motion users receive the same content as a normal document flow.

- [ ] **Step 4: Run tests and build**

Run: `cd Landingpagev2; npm test; npm run build`  
Expected: all tests and the production build pass.

- [ ] **Step 5: Commit interactions**

```powershell
git add Landingpagev2/components/Navigation.jsx Landingpagev2/components/PinnedFeatureStory.jsx Landingpagev2/app/page.js Landingpagev2/app/globals.css Landingpagev2/tests/client-boundaries.test.mjs
git commit -m "feat: add accessible navigation and product motion"
```

### Task 4: Visual, accessibility, copy, and launch-link verification

**Files:**
- Modify as findings require: `Landingpagev2/app/*`, `Landingpagev2/components/*`, `Landingpagev2/lib/*`
- Create: `Landingpagev2/README.md`
- Append: `progress.md`

**Interfaces:**
- Produces a runnable project documented with `npm install`, `npm run dev`, `npm test`, and `npm run build` commands.

- [ ] **Step 1: Run automated checks**

Run: `cd Landingpagev2; npm test; npm run build`  
Expected: zero failing tests and a successful Next production build.

- [ ] **Step 2: Run the page and inspect responsive states**

Run: `cd Landingpagev2; npm run dev`  
Inspect 375px, 768px, 1024px, and 1440px. Confirm no overflow, H1 uses no more than three lines, bento cells have no desktop gaps, navigation remains operable, and the coming-soon Play Store control is not misleading.

- [ ] **Step 3: Inspect accessibility and reduced motion**

Keyboard through skip link, navigation, CTAs, and section links. Enable reduced motion and verify the product narrative becomes a standard vertical flow with no pinned scroll traps.

- [ ] **Step 4: Perform the privacy-copy sweep**

Run: `rg -n "kami tidak punya akses|tidak pernah mengakses|100% aman|pasti|subscription|langganan" Landingpagev2`  
Expected: no misleading access, certainty, or subscription claims.

- [ ] **Step 5: Document and record the milestone**

Add standalone setup instructions to `Landingpagev2/README.md`. Append a dated root `progress.md` entry listing the completed landing page, files, privacy wording decision, verification, and blockers.

- [ ] **Step 6: Commit the verified handoff**

```powershell
git add Landingpagev2 progress.md
git commit -m "docs: finalize Artami landing page v2 handoff"
```
