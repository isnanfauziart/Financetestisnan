# Artami Product Audit, Findings, Suggestions, and Roadmap

**Date:** 9 September 2026

**Decision record updated:** 17 September 2026

**Scope:** Read-only source audit of the current Artami checkout.

**Purpose:** Keep the complete September 2026 findings, suggestions, product decisions, and roadmap in one document.

**Status:** Financial foundations are implemented (September 2026): canonical balances (`Saldo Tercatat`, `Kekayaan Bersih`, `Saldo uang saat ini`, `Dana yang bisa dipakai saat ini`) are computed in `src/lib/balances.js` and served by `/api/dashboard` under `balances`; every ledger mutation runs through the replay-safe financial-write pipeline with `_ArtamiOperations` receipts; the additive Sheet schema (`Pemasukan`→P:S, `Pengeluaran`→Q:T after `Sifat`, `Tabungan`→P:U, `Utang`→J:M, hidden `_ArtamiOperations`) is applied idempotently at write time. Goal progress now follows explicit `goalId` allocations, so legacy category-matched savings stay reserved and unassigned until reviewed. The waves below are still open work.

## Contents

- [Approved decisions from the first discussion](#approved-decisions-from-the-first-discussion)
- [Current product inventory](#current-product-inventory)
- [Financial and trust findings](#confirmed-financial-and-trust-findings)
- [UI and UX findings](#ui-and-ux-findings)
- [Journey findings](#journey-findings)
- [Product decisions](#product-decisions-required-before-financial-changes)
- [Validation](#validation-needed-before-acting-on-this-audit)
- [Product direction](#product-direction)
- [P0–P3 roadmap](#sequenced-roadmap)
- [Design guardrails](#design-guardrails)
- [Deferrals](#explicit-deferrals)
- [Delivery batches](#suggested-delivery-batches)
- [Detailed post-foundation implementation plan](#detailed-implementation-plan-after-financial-foundations)
- [Next product conversation](#next-product-conversation)

## How to Read This Document

This audit separates three kinds of statements:

- **Confirmed implementation finding** — directly supported by current source code.
- **Product decision required** — the source cannot establish the intended business rule; implementation must not guess.
- **UX hypothesis** — useful to validate in a rendered desktop/mobile session before changing the approved composition.

The audit did not use an authenticated production account, write to Google Sheets or Supabase, inspect a real user ledger, or conduct device/browser usability testing. It is not an accounting certification or an accessibility conformance claim.

## Approved Decisions From the First Discussion

This section records the user's explicit approvals in the discussion following the audit. It takes precedence over earlier suggestions elsewhere in this document. The audit findings remain a snapshot of the implementation inspected at that time; these decisions describe intended future behavior, not shipped features. No additional document or runtime change is required just to record these decisions.

### 1. Savings are allocations of existing money

- A `Tabungan` contribution sets aside money the user already owns. It does not create income, new assets, or a net-worth increase.
- Allocation does not change the account's balance or Saldo Tercatat. It reduces Dana tersedia only when the reserved money is in a liquid account.
- Each new contribution belongs to one explicit goal. To fund two goals, the user records two contributions; a multi-goal split editor is not required.
- Categories remain reporting dimensions. They do not determine which goal receives progress.
- Use the savings category's existing **Jenis dana** classification to distinguish liquid savings from nominal investment savings. This classification controls availability treatment; it does not create an investment tracker.

### 2. Unassigned savings remain reserved

- Older contributions without a goal appear as **Tabungan belum dibagi ke target**.
- They remain reserved until the user assigns them to a goal or releases them. Known liquid reservations reduce Dana tersedia; investment reservations do not reduce it again.
- Assigning money from this pool to a goal changes its allocation owner only. It does not create another contribution or subtract the amount a second time.
- Artami must not automatically assign old savings to a goal based only on category.
- When a legacy contribution's usable-fund classification cannot be established, show **Perlu ditinjau** instead of guessing.

### 3. Combined balance, current cash total, and transfers

- Keep the required opening balance as one combined total. It may include investments, but Artami does not split or track those investments in this version.
- After onboarding, users may provide one **Total saldo saat ini** covering bank accounts, e-wallets, and cash at the moment it is saved. This improves **Dana yang bisa dipakai saat ini** without requiring per-account opening balances.
- Do not add separate investment accounts, value updates, holdings, prices, returns, valuation history, or performance screens.
- Existing account names remain useful transaction metadata. Artami does not invent an account distribution from the combined opening balance.
- **Alokasikan ke target** and **Transfer antar akun** are separate actions. Allocation reserves money; transfer moves it between two accounts.
- Transfers do not count as income or expense and do not change total recorded assets or net worth.
- Transfers between recorded bank, e-wallet, and cash labels remain ledger-neutral. Transfers into an investment product are outside this version's scope.

### 4. Beranda financial definitions

Keep **Kekayaan Bersih** as the primary headline. Distinguish it from **Saldo Tercatat**, which tracks assets currently held, including the cash effects of loans. Provide supporting amounts for **Dana tersedia**, **Dialokasikan ke target**, and **Tagihan terjadwal**. Avoid labelling the broader balance **Total Tabungan**.

```text
Kekayaan Bersih
= Saldo Tercatat
+ outstanding Piutang
- outstanding Utang

Saldo uang saat ini
= latest saved Total saldo saat ini adjusted by eligible later cash movements

Raw available amount
= Saldo uang saat ini
- goal reservations held in liquid accounts
- unassigned savings reservations held in liquid accounts

Displayed Dana tersedia = max(0, raw available amount)
Allocation shortfall = max(0, -raw available amount)
```

The approved temporary basis for users who have not provided **Total saldo saat ini** is described below. Nominal savings classified as investment are not deducted from the current cash total a second time; this is an allocation rule, not market-value tracking. The checkpoint uses a generated checkpoint ID, rather than a date cutoff, so transactions recorded on the same day are not counted twice.

**Final bill decision:** neither unpaid bills due this month nor overdue bills reserve or reduce Dana tersedia. Paying a bill reduces the selected account balance, so an ordinary payment from a liquid account reduces Dana tersedia once. Budget limits also are not deducted. This explicitly supersedes the earlier approved proposal to subtract unpaid bills. Goal-funded expense behavior is covered separately below.

### 5. Availability warnings and missing current-balance details

If liquid reservations exceed the liquid balance, preserve the allocations, show Dana tersedia as zero, and explain the shortfall neutrally. Approved example:

> **Dana tersedia · Rp0**
>
> Saldo saat ini Rp2 juta, sementara Rp3 juta masih disisihkan untuk target. Ada selisih Rp1 juta yang perlu ditinjau.
>
> **Tinjau target**

Detail explanation:

> Menyisihkan uang untuk target tidak memindahkan uang dari rekening. Jika saldo berkurang karena pengeluaran, jumlah yang disisihkan mungkin perlu disesuaikan.

Show this message only when the mismatch exists. Do not silently cancel or reduce goals.

**Updated migration decision:** keep **Dana yang bisa dipakai saat ini** visible using the user's latest saved information until **Total saldo saat ini** is supplied. Temporarily use the existing combined opening balance as the basis and apply known usable-fund reservations once. Because that combined figure may include investments, clearly mark it as provisional:

> **Berdasarkan data terakhir**
>
> Masukkan total saldo saat ini agar perhitungan lebih akurat.
>
> **Rinci dana**

Recalculate only after the user successfully saves **Total saldo saat ini**. Unfinished edits must not change the displayed amount. This replaces the earlier **Belum dapat dihitung** state and the earlier per-account classification proposal.

The **Rinci dana** link appears beside the provisional Home amount. Profile keeps the permanent **Total saldo saat ini** editor. Existing users are not blocked from recording transactions while this information is missing.

Users may continue recording transactions while this current-balance detail is incomplete, subject to the normal sync, access, and quota requirements. Missing current-balance detail alone does not place the entire app in read-only mode.

### 6. Releasing savings versus spending from a goal

- **Batalkan alokasi** releases the reservation. The account balance, Saldo Tercatat, and Kekayaan Bersih stay unchanged. Releasing a liquid reservation increases Dana tersedia; releasing an investment reservation does not make the investment liquid.
- **Gunakan untuk pengeluaran** records an expense funded by the selected goal. The account balance and the corresponding reservation both decrease by the same funded amount.
- Example: Saldo uang saat ini Rp5 juta with Rp2 juta reserved for a laptop leaves Dana yang bisa dipakai saat ini Rp3 juta. Spending the reserved Rp2 juta leaves Saldo uang saat ini Rp3 juta and zero laptop reservation; the available amount remains Rp3 juta.
- This must be one coherent financial action, not a separate unlinked expense plus an allocation that remains reserved.

### 7. Utang and Piutang balance behavior

| Action | Selected account / Saldo Tercatat | Outstanding principal |
|---|---|---|
| New Utang received | Increase by principal received | Utang increases |
| New Piutang issued | Decrease by principal lent | Piutang increases |
| Utang repayment | Decrease by principal paid | Utang decreases by the same principal |
| Piutang repayment received | Increase by principal returned | Piutang decreases by the same principal |

True Kekayaan Bersih accounts for the outstanding balances separately. A loan's principal movement therefore does not itself create or destroy wealth. Interest, penalties, and fees are separately classified income or expenses.

Every money-moving action selects the affected account and creates a linked, replay-safe record. Add two entry modes:

- **Transaksi baru:** money moves now; update the selected account.
- **Catat utang/piutang lama:** record the outstanding obligation only; do not repeat cash movement already represented by the opening balance.

Example: a user whose opening BCA balance includes last month's borrowing can record that old debt without adding the borrowed amount to BCA again. The outstanding debt still participates in the net-worth calculation.

### 8. Current-month cash flow versus operational analysis

Preserve the current-month incoming/outgoing summary on Beranda, including actual routine and special expenses. The final labels and inclusion rules are:

| Beranda amount | Includes |
|---|---|
| **Uang masuk** | Operational income, new Utang received, and Piutang repayments received |
| **Uang keluar** | Operational expenses, new Piutang issued, and Utang repayments |
| **Arus kas bersih** | Uang masuk minus Uang keluar |

Show loan movements in the breakdown. Internal transfers, goal allocation/release, and recording an old loan without cash movement are excluded. Avoid calling inclusive net cash flow a salary/consumption surplus.

Budgets, Health Score, routine trends, and spending insights continue using operational income/expense rules, excluding loan principal. Interest and fees remain operational income or expenses. Preserve the established routine-versus-special policy within the relevant analytics.

### 9. Bills and forecast reconciliation

- Paying through Tagihan creates one linked expense and updates the bill occurrence's payment state; preserve replay protection.
- Unpaid and overdue bills remain visible for planning but do not reduce current Dana tersedia.
- Future scheduled bills remain forecast obligations. Excluding them from current Dana tersedia does not exclude them from projections.
- When a detected recurring pattern becomes a bill, retain historical transactions for reporting, link the bill to the pattern, remove matched history from the forecast's general expense baseline, and include the scheduled bill once.
- If the pattern cannot be matched confidently, display a warning instead of silently changing its treatment.
- **Deferred:** selecting an existing manually recorded expense and linking it to a bill. This is a separate reconciliation feature requiring a picker and duplicate-link checks, not ordinary Google Sheets synchronization. Do not include it in the initial implementation.
- Until that feature is separately approved, provide clear guidance to avoid manually recording an expense again after paying through Tagihan. Handling already duplicated legacy entries is not silently authorized here.

### 10. Event / Momental totals

- **Pemakaian anggaran event:** event expenses only.
- **Dana masuk event:** event-tagged incoming funding, displayed separately.
- **Alokasi tabungan event:** reserved event savings, displayed separately and not counted as spending.
- **Biaya bersih event:** event expenses minus event income.
- Every total opens its supporting records. Funding and savings allocations must not increase expense-budget usage.

Approved example: Rp5 juta expenses, Rp1 juta family contribution, and Rp500 ribu saved beforehand produce Rp5 juta budget usage, Rp1 juta incoming funding, Rp500 ribu savings allocation, and Rp4 juta net event cost.

**Simplified scope approved:** keep event reporting focused on ordinary income, expenses, and savings allocations. Money received from parents or other people without a repayment obligation is ordinary **Pemasukan**, using a user-selected category such as **Bantuan keluarga** and an optional event tag. Use the existing income workflow; no separate funding form is needed.

Money that must be repaid remains in the existing **Utang** workflow. Linking loans to events and dedicated event financing/principal-repayment reporting are deferred. The earlier proposed **Pembiayaan utang** and **Pelunasan pokok** event fields are not approved for this version. Do not add loan-reporting complexity to the event summary or change the approved Beranda cash-flow rules.

### 11. Stale-data feedback and financial writes

Whenever the latest dashboard refresh fails, show a visible warning regardless of cache age and retain the last successfully synchronized figures:

> **Pembaruan data gagal**
>
> Menampilkan data terakhir yang berhasil disinkronkan 18 menit lalu.
>
> **Coba lagi**

Change the sync label to **Terakhir tersinkron 18 menit lalu**. If the device is offline, use:

> **Anda sedang offline**
>
> Menampilkan data terakhir yang tersimpan di perangkat ini.

- The failure warning clears only after a successful refresh.
- Cached dashboards, reports, and planning views remain readable to the extent their data is available.
- While offline or in the failed-sync stale state, disable financial creation, edit, delete, bill/debt payment, goal contribution, and other financial writes.
- Explain disabled actions with **Sinkronkan data sebelum menyimpan perubahan.**
- Preserve unfinished form input in memory during the current session. Persistence across browser close/reload is not promised.
- Re-enable writes after synchronization succeeds, while retaining normal authorization, quota, and feature checks.
- Do not automatically queue or submit offline financial writes.

### 12. Automatic refresh policy

- Refresh when the dashboard opens.
- Refresh when the user returns after backgrounding the app if the last successful sync is more than five minutes old.
- Refresh immediately after a successful financial write.
- Keep manual pull-to-refresh and the sync button.
- Avoid continuous polling while the user actively uses the app.
- Show **Memeriksa pembaruan…** with the existing data during an automatic refresh.
- If that refresh fails, enter the approved read-only stale-data state.

Five minutes is the return-to-app refresh threshold; it is not an independently approved rule to block writes merely because the clock passes five minutes. Uncertain saves use a stable operation ID, one automatic verification, and then a user-triggered **Periksa lagi** action if the result remains unresolved.

### 13. Uncertain transaction or payment save outcomes

**Approved 10 September 2026:** a dropped connection or timeout does not establish that the original save failed. Verify that operation's outcome before allowing a fresh submission.

- Preserve the entered details and show **Memeriksa apakah pembayaran sudah tersimpan…** for a payment, with corresponding transaction wording for a transaction.
- Check the original operation instead of blindly creating another one.
- If confirmed saved, show success and refresh balances. Resume financial writes only when the existing synchronization and access requirements also pass.
- If confirmed unsuccessful, allow a safe retry once the normal synchronization requirements pass.
- If still uncertain, show **Status belum dapat dipastikan** and **Periksa lagi**, and keep financial writes disabled.
- A timeout, an inconclusive lookup, or a successful general dashboard refresh alone must not be treated as proof that an uncertain operation failed. The verification mechanism, partial-save recovery, and retry identity rules must be designed and tested before implementation.

This extends the approved stale-data behavior; it does not authorize queued offline writes, a new payment attempt while the old one is unresolved, or implementation of the deferred manual expense-to-bill linking feature.

### 14. Required guided onboarding for new users

- New users must complete two foundational actions before using the rest of the dashboard: save an opening balance and save a first transaction.
- The opening balance is required, but `Rp0` is valid. It represents the user's balance immediately before the first Artami transaction, so the first transaction must not be counted in both the opening balance and the ledger.
- Start with one combined opening balance. The optional **Total saldo saat ini** detail comes later through Home or Profile; per-account and investment tracking are outside this version.
- Guide the user field by field with a visible spotlight, arrow, or focused shape and a short instruction bubble attached to the relevant control. Do not rely on a transient toast for required instructions.
- The guided layer must keep the active field visible above the mobile keyboard, support keyboard and screen-reader use, respect reduced-motion settings, and never hide the action needed to continue.
- Save onboarding progress per account so a user who changes devices resumes at the correct required step.
- After the first transaction succeeds, offer budget and goal setup as optional next steps. Existing users are not blocked; they receive the gradual balance-review flow described in the approved migration decision.

### 15. Navigation and transaction entry

- Keep the four current main dashboard tabs.
- Keep the mobile floating action button and add a persistent **Tambah transaksi** action on desktop. Both open the same Quick Add flow with the same validation, stale-data restrictions, quota rules, and success behavior.
- Preserve the selected tab, section, month, year, and relevant filters in the URL so refresh and authenticated deep links return to the same view.
- Browser Back closes an open sheet or modal before changing the underlying dashboard location. If that surface contains unsaved edits, ask for confirmation before discarding them.

### 16. Repeat an existing transaction

- Add **Ulangi transaksi** for ordinary manually recorded income and expense transactions.
- Open the existing Quick Add review form with description, category, amount, account, notes, and routine/special classification copied. Default the date to today and require the user to review before saving.
- Do not copy an event tag into the repeated transaction.
- Do not offer this action for generated bill, debt, goal, or account-transfer records, where repeating a ledger row could bypass the owning workflow.
- Named reusable templates are deferred. The first version is repetition from an eligible existing transaction only.

### 17. Statistik filter context

- Show a persistent, readable summary of the active period, account, category, and other material filters in Statistik.
- Make the difference between the inclusive actual totals and routine-only analytical trends explicit wherever the two can appear together.
- Clearing or changing a filter updates the URL-backed state and the visible summary consistently.

### 18. Google Sheets status and local privacy

- Add a **Google Sheets Anda** card in Profile with the connected file, **Buka di Google Sheets**, last successful synchronization, and the same retry/failure state used on Beranda.
- Explain ownership and recovery in plain language: the financial ledger remains in the user's Google Drive, while Artami manages the connection and product metadata.
- Logging out clears the current user's locally cached financial data on that device. Theme and non-financial display preferences may remain. The next login fetches fresh financial data before enabling writes.

### 19. Beranda hero and above-the-fold hierarchy

The approved Beranda hero keeps the most important current information visible together in this order:

1. **Kekayaan Bersih** as the main figure, with its monthly change.
2. **Dana tersedia** as a smaller supporting figure, including **Berdasarkan data terakhir** when the approved temporary calculation is in use.
3. A compact current-month row for **Uang masuk**, **Uang keluar**, and **Arus kas bersih**, using the inclusive rules in decision 8.

Place **Rincian saldo** behind a clear action from the hero. It explains **Saldo Tercatat**, liquid goal allocations, unassigned savings, and unpaid bills. Unpaid bills remain informational and do not reduce Dana tersedia.

Move the old generic focus note out of the hero. Place **Yang perlu kamu cek** directly below the hero so warnings and next actions do not compete with the financial headline. Keep the fuller cash-flow section lower on the page for breakdowns and comparison.

Validate that the three hero layers remain visible without scrolling on a 360 x 640 viewport under the normal text setting. With larger text or accessibility scaling, preserve readable content and controls even if the page must scroll; never truncate financial labels or values just to force the above-the-fold layout.

### 20. **Yang perlu kamu cek** priority and limit

- Show at most two actionable items directly below the Beranda hero.
- Use this priority order:
  1. overdue bill;
  2. budget exceeded or approaching its established warning threshold;
  3. goal falling behind its required pace;
  4. unusual spending supported by Artami's anomaly rules.
- Each item opens the relevant bill, budget, goal, or transaction evidence. An overdue bill remains an alert only; it does not reduce Dana tersedia until paid.
- Synchronization and stale-data failure states use the dedicated warning above the hero and do not consume one of these two item slots.
- When no warning qualifies, show a compact **Tambah transaksi** prompt instead of inventing a generic financial recommendation.

### 21. Locked Pro feature previews

- Keep locked Pro features discoverable through compact previews inside their relevant **Statistik** or **Rencana** sections. Do not add them as new main-navigation destinations.
- Use static, non-personal sample content while locked. A preview must not run the real calculation, expose user-derived results, or imply that its example is based on the user's ledger.
- Explain the feature's benefit in plain Indonesian and provide one clear upgrade action. Avoid repeating the same upgrade card across several places on one screen.
- After entitlement is confirmed, replace the preview with the real feature in the same location so the information architecture remains stable.
- A feature disabled by an administrative feature flag uses the approved simple unavailable state rather than an upgrade preview.
- Locked previews must not interrupt ordinary Free workflows or obscure the financial information already available to the user.

### 22. No investment tracker in this version

- Artami does not currently have an investment tracker, and this roadmap does not add one.
- Investments may remain included in the user's combined opening balance and therefore in the starting wealth basis.
- Do not add separate investment accounts, manual valuation updates, holdings, market prices, gains, returns, valuation history, or performance analytics.
- Existing **Jenis dana: Investasi** savings categories remain nominal allocation metadata used to avoid treating non-liquid savings as available cash. They do not represent live investment values.
- Investment tracking may be reconsidered only as a separately approved future feature.

### 23. Existing-user liquidity and savings review

- After onboarding, allow one **Total saldo saat ini** covering bank accounts, e-wallets, and cash at the moment it is saved. Keep the required onboarding input as the combined opening balance.
- While **Total saldo saat ini** is missing, show the provisional available amount using the latest saved combined basis with **Berdasarkan data terakhir**.
- Place a small **Rinci dana** link beside the provisional Home amount and keep the permanent **Total saldo saat ini** editor in Profile.
- Existing users remain unblocked while the current-balance detail or legacy savings review is incomplete.
- Show older savings without a goal in a selectable review list. Include **Pilih semua**, the selected total, and actions to assign the selection to one goal or release the reservation.
- Require confirmation before applying a grouped assignment or release. Preserve the original transaction rows and never infer a goal from category alone.

### 24. Bill reminder scope

- This version provides visible upcoming and overdue bill alerts when Artami is open.
- Do not promise dependable reminders while the browser or app is closed. The current service worker does not schedule or receive background notifications.
- Server-scheduled push delivery, subscription and permission management, delivery failure handling, and native background scheduling remain deferred platform work.

### Superseded proposals and scope boundary

| Earlier proposal | Final approved decision |
|---|---|
| Deduct unpaid or overdue bills from Dana tersedia | Do not reserve them; account balances change on payment |
| Deduct all goal allocations from liquid money | Deduct liquid reservations only, including known liquid unassigned savings |
| Show operational income/expense alone in Beranda's monthly total | Show inclusive Uang masuk/Uang keluar with a separate operational basis for analytics |
| Use the loan-sensitive cash balance as Kekayaan Bersih | Use Saldo Tercatat for held assets and calculate true net worth with outstanding loans |
| Assign savings by category or build a multi-goal split editor | One explicit goal per new contribution; old entries remain unassigned |
| Include manual expense-to-bill linking in the first changes | Deferred as a separate feature |
| Hide Dana tersedia as Belum dapat dihitung until opening balances are classified | Use the latest combined basis provisionally with Berdasarkan data terakhir until the user supplies Total saldo saat ini; do not require an account split |
| Use a dismissible four-step first-use checklist | Require new users to save an opening balance and first transaction through guided, resumable onboarding; budget and goal setup are optional afterward |
| Add a new Wallet/main navigation destination | Keep four main tabs; use the existing mobile action and a persistent desktop Tambah transaksi action |
| Launch repeat entry with named transaction templates | Start with Ulangi transaksi for eligible manual income/expense records; defer named templates |
| Add a separate weekly financial brief card | Use the existing Yang perlu kamu cek section below the hero, limited to the two highest-priority supported actions |
| Hide locked Pro features or add them as navigation destinations | Keep compact static previews within their relevant Statistik or Rencana sections |
| Add per-account investment classification and manual valuations | Keep one combined opening balance plus one later Total saldo saat ini; do not add an investment tracker |
| Add dependable closed-app bill reminders in this version | Keep in-app bill alerts and defer background delivery to platform work |

The major product definitions and implementation order are approved. The approved financial-foundation implementation plan defines the checkpoint, migration, atomicity, and in-flight recovery direction. None of these changes are live until implementation and verification are completed.

## Current Product Inventory

### Product and data model

Artami is an Indonesian-first personal-finance product where each user owns the Google Sheet that stores their finance ledger. Google Sheets holds transaction, budget, goal, debt, event, bill, and settings data. Supabase holds user, tier, payment, usage, admin, and feature-flag data. The system flow and storage boundaries are documented in [Flow-system.md](Flow-system.md).

The current product has no dedicated investment tracker. Its opening-balance copy allows investments to be included in one combined total, and savings categories can carry liquid/investment metadata, but there are no holdings, valuations, returns, or investment-performance views.

The product currently supports:

| Area | Existing capabilities |
|---|---|
| Ledger | Income, expense, savings, account/category/date fields, edit, delete, Undo, routine versus special expenses, account and date filtering |
| Daily dashboard | Net-worth headline, monthly cash flow, recent activity, urgent actions, budget state, insights, Health Score |
| Statistics | Cash-flow, category, trend, comparison, daily calendar, anomalies, forecast, savings trend, monthly/annual reports |
| Planning | Goals, monthly budgets, historical budget copy, bills, debt/receivable records, event budgets, financial-independence tracker, What-If |
| Profile | Artami name, category management, tier/quota information, theme, sound/haptics, starting balance, guides, logout, deletion |
| Commercial flow | Google OAuth, user-owned Sheet provisioning, legacy Sheet connection for the configured owner, QRIS proof flow, admin payments/users/feature controls |

### Navigation and interaction model

The main shell has four destination tabs: **Beranda**, **Statistik**, **Rencana**, and **Profil** ([dashboard/page.js](../src/app/dashboard/page.js)). Transaction entry is a Quick Add bottom sheet opened from the floating action button; there is no separate Wallet tab.

`Rencana` contains its own sections: Ringkasan, Target, Anggaran, Tagihan, Utang, Event, and Simulasi. `Statistik` contains Ringkasan, Kategori, Tren, and Laporan.

### Foundations worth preserving

- A calm, warm finance-oriented system with Indonesian-first language, dark-theme support, safe-area helpers, reduced motion, and high-contrast rules in [globals.css](../src/app/globals.css).
- Four-tab ownership that keeps daily review, analysis, planning, and preferences distinct.
- Reusable sheets with focus trapping, Escape handling, initial focus, focus restoration, and body-scroll locking in [Sheet.jsx](../src/app/dashboard/_components/Sheet.jsx).
- Existing loading, empty, retry, quota, Undo, and confirmation patterns.
- Text summaries and legends accompanying statistical charts.
- Replay-safe bill and debt payment flows, serialized creation quotas, and fail-closed entitlement checks.
- Honest landing-page statements about Google Sheets ownership and no bank-account connection.

## Confirmed Financial and Trust Findings

### 1. The savings summary uses a broader value than its label implies

`netWorth` is calculated as starting balance plus income minus expense. The calculation does not read the `Tabungan` sheet, debt balances, or goal allocations ([dashboard route](../src/app/api/dashboard/route.js)). The starting-balance UI describes that figure as total wealth across bank accounts, e-wallets, and investments ([SetupSaldoAwal.jsx](../src/components/SetupSaldoAwal.jsx)).

The goals summary labels the same `netWorth` value **Total Tabungan** and describes it as the balance shown in Beranda ([GoalsSection.jsx](../src/components/GoalsSection.jsx)). This is a confirmed label/formula mismatch: total wealth is not necessarily savings available for goal allocation.

**Product decision required:** establish whether `Tabungan` rows are internal earmarks/transfers within existing wealth, or represent new external assets. That decision determines whether savings should change net worth, available cash, both, or neither.

Until the decision is made, avoid presenting the goal summary as accounting-certified available money.

### 2. Shared savings categories can double-count goal progress

Goal progress sums savings transactions by category ([goalUtils.js](../src/app/dashboard/_components/goalUtils.js)). When two active goals share a savings category, each goal receives the same transactions. The UI warns about a shared category, but it does not prevent or split the duplicated allocation ([GoalCard.jsx](../src/components/GoalCard.jsx)). The goals summary then adds all goal progress together.

Example: one Rp1.000.000 savings transaction in a category shared by two goals can appear as Rp1.000.000 progress for each goal and Rp2.000.000 total allocated.

**Required direction:** contributions need an explicit goal allocation or split. Legacy category-only savings should be shown as **unassigned savings** until allocated. Category can remain a reporting dimension.

### 3. Event spending includes income and savings

Event summaries add tagged transactions from income, expense, and savings tabs into the `spent` amount ([event route](../src/app/api/momental/route.js); [single-event route](../src/app/api/momental/[id]/route.js)). Quick Add exposes event tagging for all transaction types ([QuickAddSheet.jsx](../src/app/dashboard/_components/QuickAddSheet.jsx)).

An event-tagged income or savings row therefore increases displayed event spending. This is a confirmed domain defect.

**Required direction:** event detail should distinguish at least expense, inflow, savings/transfer, and net event impact. The initial event-spend total must count expense rows only.

### 4. Converting recurring expenses to bills can double-count forecast obligations

Recurring expense detection identifies historical patterns. A user can convert a pattern into a bill ([BillsSection.jsx](../src/components/BillsSection.jsx)). The forecast excludes prior transaction rows only when their IDs use the `billpay:<id>:` convention; it then adds scheduled active bills ([forecast.js](../src/lib/forecast.js)). Historic recurring entries that predate conversion do not have that ID and can remain in the variable-expense baseline while the new bill is added as a future commitment.

This is conditional on conversion, but the overlap is possible and should be fixed before expanding forecast features.

**Required direction:** persist a source fingerprint/reconciliation rule when a recurring candidate becomes a bill. Forecasts must exclude matched historic rows from the variable baseline, or clearly disclose the possible overlap.

### 5. Budget remaining is not the same as money remaining after bills

Budget detail intentionally shows unpaid bills separately and does not reduce daily budget pace ([BudgetDetailModal.jsx](../src/components/BudgetDetailModal.jsx)). This may be correct for category budgeting, but it can be misread as safe spending capacity.

**Required direction:** preserve budget remaining, but display a separately named value such as **Sisa setelah tagihan terjadwal** only after the canonical money model is defined.

### 6. Debt/receivable balances do not currently affect the net-worth headline

The dashboard aggregation reads only the three transaction tabs for net-worth accumulation. Outstanding debt and receivable records are not incorporated until a payment creates a ledger transaction. Debt payment writes also leave the account field blank, limiting account-level reconciliation ([debts route](../src/app/api/debts/route.js)).

**Product decision required:** decide whether the headline should show net worth, cash position, or both. If it remains net worth, liabilities and receivables require an explicit bridge; do not silently fold them into an opaque total.

### 7. A failed refresh can look like a successful synchronization

Dashboard refresh retains cached data after a failed request and records an error. The full-page error state is shown only when no data exists ([dashboard page](../src/app/dashboard/page.js)). `SyncStatus` derives its success wording from last successful time and browser online state, without receiving the refresh error ([SyncStatus.jsx](../src/app/dashboard/_components/SyncStatus.jsx)).

This can show **Tersinkron ke Google Sheets** while the latest refresh failed. In a finance product, that weakens trust in the figures being viewed.

**Required direction:** retain cached data but show a distinct stale/error state, for example: *Pembaruan gagal. Menampilkan data terakhir berhasil disinkronkan pukul 09.40.* Include a retry action and an accessible live announcement. Keep offline and failed-refresh states distinct.

### 8. Browser-local finance cache survives the current sign-out path

Dashboard data is stored in a user-scoped browser `localStorage` cache ([useDashboardCache.js](../src/app/dashboard/_components/useDashboardCache.js)). The normal sign-out path does not invoke cache invalidation ([dashboard page](../src/app/dashboard/page.js); [ProfileTab.jsx](../src/app/dashboard/ProfileTab.jsx)). The owner-scoped key reduces cross-account display risk, but financial data can remain on a shared device.

**Recommendation:** add a Profile action such as **Hapus data tersimpan di perangkat ini**, explain that it clears local cached data only, and clear the current-user cache on normal sign-out where practical.

## UI and UX Findings

### Information hierarchy

Beranda already has the right purpose: review current position and choose a next action. Statistik is intentionally broad; Rencana is the planning workspace. Keep this hierarchy and connect the existing surfaces rather than adding a fifth dashboard.

The clearest future separation is:

| Area | Primary question |
|---|---|
| Beranda | Apa yang perlu saya lakukan sekarang? |
| Statistik | Apa yang terjadi pada uang saya? |
| Rencana | Apa yang perlu saya siapkan berikutnya? |
| Profil | Bagaimana data dan pengalaman Artami saya diatur? |

### State, navigation, and context

Active dashboard tab, Rencana section, Statistik section, filters, comparison periods, and calendar month are component state. Browser refresh and Back/Forward do not preserve the user’s current context ([dashboard page](../src/app/dashboard/page.js); [StatsTab.jsx](../src/app/dashboard/StatsTab.jsx)).

**Recommendation:** incrementally introduce query parameters, for example:

```text
/dashboard?tab=stats&section=tren&month=Agustus&year=2026
/dashboard?tab=plan&section=budget
```

Restore the relevant section and move focus to its heading after navigation. Do not duplicate state separately inside each tab.

### Transaction entry discoverability

Quick Add is the primary ledger action but is primarily exposed by a floating action button. It is a sensible mobile pattern, yet less discoverable for desktop and keyboard use. Keep the mobile FAB; add a persistent **Tambah transaksi** action in a desktop header/content toolbar and in every relevant empty state.

Quick Add exposes income and expense modes, while `Tabungan` is handled through goal contribution flows. This may be intentional, but needs a product decision: if `Tabungan` is a first-class ledger movement, it should be visible as a third entry mode or its different treatment should be explained.

### Rencana and Statistik density

Rencana has seven local chapter controls and Statistik combines filters, modes, charts, comparison, forecast, calendar, insights, anomalies, and reports. The underlying content is valuable, but dense on narrow screens.

**UX hypotheses to validate visually:**

- Retain the current Rencana hierarchy, but consider a scrollable chapter rail or a **Lainnya** grouping for secondary planning sections on narrow phones.
- Keep Statistik sections progressive: Ringkasan for headline metrics, Kategori for ranked categories, Tren for comparisons/forecast/anomalies, and Laporan for recap/export.
- Add a compact sticky **Filter aktif** summary and a visible hint where charts horizontally scroll.
- Keep locked Pro features discoverable as labelled previews if conversion education is the goal; otherwise explicitly document the choice to hide them.

### Accessibility and interaction

The dashboard already includes important accessibility foundations, including modal focus handling, chart text summaries, reduced motion, and some 44px controls. Remaining source-level improvements include:

- Use actual buttons or full keyboard behavior for clickable cards such as event, Health Score, and forecast surfaces.
- Provide an accessible list/table alternative for chart drill-down; a clickable Recharts bar currently lacks an equivalent keyboard interaction path.
- Increase interactive boxes for calendar cells, close buttons, and compact card actions while keeping icons visually small.
- Add `aria-expanded` to date-range disclosure and `aria-pressed` to comparison toggles in Statistik.
- Add explicit `htmlFor`/IDs, field errors, and accessible remove labels for Event setup fields.
- Translate remaining English accessible labels such as `Close`, `View`, `Contribute`, and `Settle` into Indonesian.
- Add an initials/generated avatar fallback and a meaningful label for the profile trigger.

W3C’s web minimum target-size criterion is 24 CSS pixels in ordinary cases; Artami’s product target should remain 44px for touch comfort where layout permits. See [WCAG 2.2 target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### Loading, errors, and notifications

Home independently loads budgets, bills, and settings. A fallback action can appear while those sources are loading or after an error. Add compact skeleton and retry treatment to each independently loaded context rather than silently falling back.

The service worker currently handles lifecycle and notification clicks only ([sw.js](../public/sw.js)). Bill checks occur while the dashboard is open. Avoid UI language that implies offline transaction entry, background write queueing, or guaranteed closed-app reminders. A real background reminder system is a separate platform decision.

## Journey Findings

### First-use experience

Opening the dashboard triggers Google sign-in and provisions a Sheet for a new user. The user then arrives in the product without a compact explanation of what to do first.

**Approved replacement:** use the required guided onboarding in decision 14. New users must save a combined opening balance and first transaction, with progress stored per account. Google Sheet explanation, budget setup, and goal setup remain supporting or optional steps rather than blockers.

### Sheet ownership, recovery, and export

Profile explains that finance data lives in Google Sheets, but it does not currently provide a direct file link, connection status, last successful sync, structure check, reconnect path, or recovery guide. This is a missed opportunity because ownership is Artami’s core differentiator.

Add a **Google Sheets Anda** card with:

- connected-file name and connection state;
- last successful synchronization;
- **Buka di Google Sheets**;
- safe guidance for structure repair/reconnection;
- a plain-language backup/export explanation;
- clear deletion semantics: Artami profile data and payment proofs may be deleted, while the user-owned Google Sheet remains in Drive.

### Legacy owner connection

The restricted legacy Sheet picker is technically safe, but its language is implementation-oriented. Explain why the picker appears, how to identify the correct file, expected tabs, and what cannot be changed after selecting another stored Sheet.

### Repeated entry

Quick Add provides recent category suggestions and account reuse. Event templates and recurring-expense detection already exist, but **Ulangi transaksi** does not.

**Approved first version:** let users repeat an eligible manual income or expense through the existing review-before-save Quick Add flow. Named reusable templates remain deferred.

### Payments and upgrade

The QRIS flow already includes expiry, QR download, copied reference/amount, proof preview/upload, history, rejection reasons, and WhatsApp support. Strengthen confidence with a payment timeline, expected review SLA, and **Periksa status** action or bounded polling while a proof is pending. Dashboard payment banners currently load once.

### Mobile readiness

The app has a PWA manifest and a TWA/Bubblewrap path. The current repository does not contain a React Native/Expo application; that remains a plan documented in [play-store-react-native-plan.md](play-store-react-native-plan.md). Android installation, Play Store availability, native OAuth, and deployed behavior cannot be established from source inspection alone.

## Product Decisions Required Before Financial Changes

The list below preserves the original audit questions. Questions 1–7 are now resolved by [the approved decisions](#approved-decisions-from-the-first-discussion). Validate the approved financial rules against anonymized examples before changing formulas.

1. What does a `Tabungan` transaction represent: internal earmark/transfer, externally added asset, or both with explicit type?
2. Which headline values should Artami display: net worth, liquid money, available-to-spend amount, or a combination?
3. How should debt and receivables appear in the headline and account reconciliation?
4. Must a savings contribution be allocated to one goal, or can it be split across multiple goals?
5. Should unpaid scheduled bills reserve cash in planning, or remain separate from category budgets?
6. Should locked Pro sections stay visible as previews or be omitted from planning navigation?
7. Are bill reminders only in-app while open, or is dependable background notification a product requirement?

## Validation Needed Before Acting on This Audit

For finance changes, use an anonymized test Sheet containing:

- combined opening wealth, a later **Total saldo saat ini** checkpoint, and ordinary bank/e-wallet/cash transactions;
- savings contributions, including shared goal categories;
- a converted recurring bill and ordinary variable spending;
- debt and receivable records with payments from selected accounts;
- event-tagged income, expense, and savings rows;
- retry/duplicate and partial external-failure cases.

For UI changes, validate the rendered dashboard at mobile and desktop widths, keyboard-only navigation, screen-reader summaries for charts, browser Back/Forward behavior, refresh failure with cached data, and the selected dark/high-contrast themes.

## Product Direction

Artami should become easier to trust and easier to use every week without losing its calm, Indonesian-first, Google-Sheets-owned identity.

The product already has the required major feature areas. The next gains should come from making figures explainable, reducing repeated recording work, and turning existing insight/planning features into one clear next action.

The target experience is:

| Moment | User should understand | Artami should help them do |
|---|---|---|
| First use | Where their data lives and what to do first | Set starting balance and record a useful first entry |
| Daily check | What changed and what needs attention | Record a transaction, pay a bill, or review a warning |
| Weekly review | Whether spending and plans are on track | Resolve the most important budget, bill, or goal action |
| Planning | What money is committed and what remains flexible | Prepare for bills and fund goals with clear assumptions |

## Sequenced Roadmap

### P0 — Financial trust and data freshness

**Why first:** do not add more planning features while the meanings of savings, net worth, event spending, and forecast commitments are ambiguous or wrong.

#### 1. Define the canonical money model

Document and expose separate values for:

- **Kekayaan bersih** — assets less liabilities, with the precise inclusion rules shown.
- **Saldo uang saat ini** — the saved total across bank accounts, e-wallets, and cash, adjusted by later eligible cash movements.
- **Tabungan belum dialokasikan** — savings that have not been assigned to a goal.
- **Dialokasikan ke target** — money intentionally assigned to goals.
- **Komitmen tagihan** — scheduled upcoming bills shown separately from category budget limits.
- **Utang dan piutang** — included in a transparent net-worth bridge according to the agreed rule.

Each number needs an **Cara hitung** explanation and a path to the supporting transactions/assumptions.

For this version, **Saldo uang saat ini** starts from the user's single **Total saldo saat ini** entry rather than per-account balances. A generated checkpoint ID separates the saved total from later transactions without relying on the transaction date.

**Decision gate:** the `Tabungan` meaning is approved above as allocation of existing money. Define schema/migration details and regression fixtures against that rule before changing totals.

**Acceptance criteria:**

- The dashboard does not label net worth as total savings.
- Each financial headline has one documented formula and clear data sources.
- The same definition is reused by Beranda, Statistik, Rencana, reports, Health Score, forecast, What-If, and financial-independence surfaces where applicable.
- Historical/legacy rows have a safe fallback state instead of silent reclassification.

#### 2. Fix goal, event, bill, and debt semantics

| Topic | Required behavior |
|---|---|
| Goal contributions | One explicit goal per contribution; category-only legacy savings remain reserved and unassigned until resolved |
| Shared goal categories | Never count one savings row toward more than one goal |
| Event totals | Expense is spending; income, savings, and transfers are separate values |
| Recurring-to-bill conversion | Store a source link/fingerprint so forecast does not double-count historic recurring payments and future bills |
| Debt payment | Capture the account used for the payment and retain replay-safe behavior |
| Forecast and budget context | Keep budget room separate from committed bills; label any combined cash figure precisely |

**Focused verification:** normal calculation, shared-goal allocation, event-tagged income/savings, converted recurring bill, duplicate payment retry, account filtering, and partial Google Sheets failure.

#### 3. Add an honest stale-data state

Keep cached data visible when it is useful, but show when the most recent refresh failed. Distinguish:

- syncing;
- online and freshly synchronized;
- offline with a last-successful time;
- online but refresh failed, with retry;
- no data available, with full retry state.

**Acceptance criteria:** a user cannot read a stale cached dashboard as a newly successful sync.

### P1 — Make the existing workflow easier to complete

#### 4. Required guided first use

For new accounts, build the approved resumable guided flow around two required outcomes:

1. Save the combined opening balance, with `Rp0` accepted.
2. Save the first transaction using the balance-before-first-transaction rule.

Use field-level spotlight guidance and accessible instruction bubbles. Do not allow dismissal before both outcomes succeed. Offer the existing budget and goal workflows afterward as optional next steps. Existing users continue into the app and receive the gradual opening-balance review instead of being blocked.

#### 5. Google Sheets ownership and recovery hub

Add a Profile card with:

- connected file name and safe status;
- last successful sync and the shared retry/failure state;
- open-in-Google-Sheets action;
- structure/reconnection guidance;
- export and backup explanation;
- explicit distinction between deleting Artami account data and deleting the user-owned Sheet;
- logout behavior that clears the current user's cached financial data while retaining non-financial display preferences.

This reinforces Artami’s core promise: the user owns their ledger.

#### 6. Repeat an eligible transaction

Add **Ulangi transaksi** to eligible manually recorded income and expense rows. It opens the existing Quick Add sheet, copies the approved fields, defaults the date to today, omits the event tag, and requires review before saving.

Generated bill, debt, goal, and transfer records remain in their owning workflows. Named templates and automatic background ledger writes are outside this phase.

#### 7. URL-backed navigation state

Make relevant view context shareable and persistent:

```text
/dashboard?tab=stats&section=tren&month=Agustus&year=2026
/dashboard?tab=plan&section=budget
```

Preserve browser Back/Forward behavior and focus the destination heading after controlled section changes. Keep a single source of truth in dashboard routing rather than separate state models per tab.

An open sheet or modal is the first Back destination. Confirm before closing it when edits are unsaved. Keep the four main tabs and route both the mobile action and desktop **Tambah transaksi** action into the same Quick Add state.

### P2 — Turn current data into an understandable weekly decision

#### 8. Actionable **Yang perlu kamu cek**

Use the existing **Yang perlu kamu cek** surface directly below the approved Beranda hero. Reuse facts from budgets, bills, goals, events, anomalies, and forecast to create one concise review instead of adding a separate duplicate brief card:

> Ada 1 tagihan yang terlambat. Anggaran Jajan sudah mendekati batas bulan ini.

Each line must link to its underlying records or assumptions. The surface should not invent recommendations, present speculation as fact, or become a generic AI chat surface.

Show no more than two items, ordered by overdue bill, budget exceeded or near its warning threshold, goal off pace, and then anomaly. If no warning qualifies, show a compact **Tambah transaksi** prompt. Keep synchronization failures in their dedicated warning above the hero.

#### 9. Explainable smart features

For Health Score, forecasts, anomaly alerts, and What-If:

- show period/months of usable data;
- disclose included scheduled bills and routine/special treatment;
- explain excluded or incomplete data;
- state confidence/coverage in plain Indonesian;
- let users open the records behind a conclusion.

While one of these features is locked, place its compact non-personal preview inside the relevant existing section with one upgrade action. Do not calculate or reveal personalized results until entitlement is confirmed.

Prioritize interpretability over adding more model-like features.

#### 10. Progressive Statistik and Rencana UX

Keep the existing four main tabs. Improve scanning without changing their ownership:

- **Statistik:** headline metrics in Ringkasan; categories in Kategori; comparisons, forecast, and anomalies in Tren; exports in Laporan.
- **Rencana:** preserve existing sections, but validate a horizontal chapter rail or secondary grouping for narrow screens.
- show a persistent active-filter summary;
- make chart horizontal scrolling obvious;
- offer a keyboard-operable data list/table for chart drill-down;
- retain text chart summaries.

### P3 — Platform and background capabilities

This work needs a separate approved product/technical plan.

- Offline transaction queueing and conflict resolution.
- Reliable closed-app bill reminders/background scheduling, explicitly deferred from this version.
- Native React Native/Expo application work.
- App-store release validation, native OAuth, device QA, and privacy/deletion delivery requirements.

Do not imply these are provided by the current service worker or TWA path.

## Design Guardrails

- Keep the warm, calm, premium, Indonesian-first finance tone.
- Preserve the four main dashboard destinations unless a separate product decision changes them.
- Reuse shared sheets, confirmation flows, theme tokens, EmptyState, Skeleton, Toast, and accessible focus behavior.
- Keep target sizes comfortable for touch; use 44px interaction boxes where layout permits.
- Maintain reduced-motion behavior, safe-area padding, and accessible text alternatives for charts.
- Treat a financial action as complete only after success, failure, retry, and stale-data states have been designed.
- Do not add a bank-linking requirement, analytics vendor, or automatic recurring write merely to implement this roadmap.
- Keep manual selection and no-overwrite behavior for existing copy/import-style workflows.

## Explicit Deferrals

The following are not part of this roadmap unless separately approved:

- Linking loans to events and dedicated event financing or principal-repayment reporting; use ordinary event income, expenses, and savings allocations for now.

- AI chat assistant or automated financial advice.
- Direct bank-account linking.
- Separate investment accounts, manual valuations, holdings, market prices, gains, returns, valuation history, investment brokerage integration, or performance tracking.
- Dependable closed-app bill notifications and their server/native scheduling infrastructure.
- Household/shared ledgers.
- Automatic recurring ledger writes.
- Named reusable transaction templates.
- Linking an existing manually recorded expense to a bill (explicitly deferred during the first discussion).
- Broad visual replacement of the approved dashboard composition.

## Suggested Delivery Batches

| Batch | Scope | Risk | Prerequisite |
|---|---|---|---|
| A | Translate the approved money model into schema/migration rules and regression fixtures | High | Approved definitions above and anonymized Sheet examples |
| B | Goal/event/bill/debt formula corrections with focused tests | High | Batch A rules |
| C | Approved stale-sync financial-write restrictions; scope privacy/Sheets hub proposals separately | High | Failure recovery, in-flight writes, and safe re-enablement specification |
| D | Required guided onboarding, current-balance setup, legacy savings review, repeat transaction, four-tab entry actions, URL state, Profile Sheets status, and logout cache privacy | High for financial writes; Medium for UI/state | Approved interaction rules above and shared Quick Add |
| E | Actionable Yang perlu kamu cek, locked Pro previews, and explainable smart-feature metadata | Medium | Reliable values from B and the approved priority/content and preview rules |
| F | Mobile/platform background capabilities | High | Separate platform plan |

Every high-risk batch must include negative, retry, tenant-isolation where relevant, and external-failure checks. Do not treat a full test suite as a replacement for those focused cases.

## Detailed Implementation Plan After Financial Foundations

The user selected **financial foundations first**. The work below begins only after the canonical financial response, checkpoint model, allocation rules, and duplicate-safe write pipeline have passed their focused tests. These waves cover the remaining audit work; they do not reopen the approved money definitions.

### Program contract

**Outcome:** make Artami easier to start, navigate, understand, and trust while preserving the current four-tab product structure and calm visual language.

**Included:** shared synchronization feedback, Google Sheets recovery, onboarding, transaction-entry improvements, URL-backed navigation, the approved Beranda hierarchy, weekly actions, Statistik/Rencana simplification, smart-feature explanations, the payment-confidence plan after its SLA decision, and accessibility/responsive verification.

**Protected invariants:**

- Finance records stay in each user's Google Sheet; Supabase continues to hold account and product metadata only.
- All displayed balances come from the financial-foundation contract. UI components do not implement independent formulas.
- `Beranda`, `Statistik`, `Rencana`, and `Profil` remain the four main destinations.
- Mobile and desktop transaction entry share one Quick Add state and one financial-write pipeline.
- Cached data is owner-scoped, visibly dated, and never presented as freshly synchronized after a failed refresh.
- Existing users are not blocked by new-user onboarding or legacy review prompts.
- Locked Pro previews use static non-personal examples; administrative disablement uses an unavailable state.
- No user-facing copy uses the word **likuid**. Use **Dana yang bisa dipakai saat ini**, **Total saldo saat ini**, and **Bisa digunakan** according to context.

**Delivery rule:** use one integration owner. Parallel work is allowed only for disjoint files and settled contracts. Pairing work must not edit the same dashboard, Quick Add, Momental, or transaction files concurrently.

### Wave 1 — Shared synchronization, cache, and recovery state

**Risk:** High where it gates financial writes; Medium for presentation.

**Primary areas:** dashboard orchestration, `SyncStatus`, dashboard cache helpers, shared write controls, and Profile.

**Implement:**

- Introduce one client-visible state contract: `loading`, `fresh`, `fresh_empty`, `refreshing`, `offline`, `refresh_failed`, `schema_conflict`, `operation_unresolved`, and `no_data_error`.
- Derive one `financialWritesAllowed` value and disabled reason. Reuse it in Quick Add, bill payment, debt actions, savings actions, balance editing, transaction editing, deletion, and Undo.
- Keep `fresh_empty` write-enabled so a new user can save the opening balance and first transaction. Missing **Total saldo saat ini**, a provisional available amount, or an incomplete legacy savings review does not block otherwise healthy writes.
- Use `no_data_error` only when Artami cannot establish a fresh empty dataset or load a usable cache; that failure remains write-blocking until recovery.
- Keep cached figures visible during offline and refresh-failure states. Show the last successful synchronization time, a concise reason, and **Coba lagi**.
- Show **Memeriksa pembaruan…** without clearing the current figures during an automatic refresh.
- Refresh on initial opening, after a committed write, through manual refresh, and when the app regains visibility after more than five minutes.
- Preserve current-session form values while a save is being verified. Run one automatic verification; if unresolved, show **Status belum dapat dipastikan** and **Periksa lagi** without background polling.
- Clear the signed-out user's financial cache. Retain theme, sound, haptics, and non-financial display preferences.
- Prevent cached data from one account being rendered for another account, including during rapid logout/login transitions.

**Acceptance criteria:**

- A failed refresh never leaves a successful-sync label visible.
- Stale, offline, schema-conflict, and unresolved-operation states disable every financial mutation consistently.
- A healthy empty Sheet, provisional current-balance state, and pending legacy review keep their approved write access.
- Successful recovery refreshes dependent sections and re-enables writes without requiring a page reload.
- No-data failures use the full retry state; cached-data failures keep useful figures on screen.

**Focused checks:** cached refresh failure, healthy empty Sheet, no-data failure, provisional current balance, pending legacy review, offline/online transitions, return after five minutes, unresolved save, successful verification, account switch, logout/relogin, and cache corruption.

### Wave 2 — Google Sheets ownership and recovery hub

**Risk:** High for the **Total saldo saat ini** and reconnect write paths; Medium for the status and ownership UI.

**Primary areas:** Profile, connection/reconnect APIs, and the shared sync presentation from Wave 1.

**Implement:**

- Add a **Google Sheets Anda** card containing the connected file name, connection state, last successful synchronization, and **Buka di Google Sheets**.
- Reuse the same offline, refresh-failure, schema-conflict, and retry states shown on Beranda.
- Explain in plain Indonesian that the ledger remains in the user's Google Drive while Artami manages the connection and product metadata.
- Provide specific recovery copy for a missing tab, conflicting schema column, expired Google authorization, and legacy-sheet reconnect requirement.
- Explain backup/export ownership and distinguish clearing local cache, deleting the Artami account, and deleting the user-owned Sheet.
- Place the permanent **Total saldo saat ini** editor in this area, with its saved time and a link to the balance explanation.

**Acceptance criteria:**

- Users can identify and open the exact connected Sheet.
- Recovery actions explain what happened and what the next action will do.
- No action or copy implies that signing out or deleting the Artami account deletes the Google Sheet.
- A new login fetches fresh data before financial writes become available.

**Focused checks:** healthy connection, balance replay/concurrency/failure, missing authorization, missing Sheet, schema conflict, legacy reconnect, reconnect tenant isolation, open-file URL safety, local-cache clearing, and cross-account isolation.

### Wave 3 — Recurring-expense and bill reconciliation

**Risk:** High because it changes forecast inputs and Sheet-backed links.

**Primary areas:** recurring-expense detection, bill conversion, bill records, forecast calculation, and bill UI.

**Implement:**

- Persist a durable source fingerprint and matched historical transaction identity when a recurring candidate is converted into a bill.
- Exclude matched historical occurrences from the variable forecast baseline and include the scheduled bill once.
- Keep existing bill payments replay-safe through the financial operation ID.
- If matching is ambiguous, show the candidate as **Perlu ditinjau** and do not automatically remove history from the forecast baseline.
- Preserve the existing dismissal behavior and do not add manual expense-to-bill linking.
- Expose the reconciliation source in the bill detail and forecast explanation without showing implementation identifiers as product copy.

**Acceptance criteria:**

- A converted recurring expense contributes one future obligation to the forecast.
- Historical spending remains visible in reports and actual totals.
- Ambiguous matching never silently changes forecast inputs.
- Deleting or disabling the bill removes only its scheduled future contribution.

**Focused checks:** confident match, ambiguous match, dismissed candidate, converted bill with historical payments, repeated conversion, bill deletion/disablement, duplicate payment, and failed composite write.

### Wave 4 — Required guided first use

**Risk:** High for the opening-balance and first-transaction writes; Medium for the guided UI.

**Primary areas:** onboarding state, opening-balance setup, dashboard shell, and Quick Add.

**Implement:**

- Replace the dismissible opening-balance prompt with two required outcomes for new accounts:
  1. confirm the combined opening balance, accepting `Rp0`;
  2. save the first transaction.
- Store completion per account so refreshes and another device resume the correct step.
- Use a spotlight, arrow, or focused shape and a short instruction bubble attached to the active control.
- Keep the active input and primary action above the mobile keyboard. Move the spotlight after focus or layout changes rather than using fixed coordinates.
- Support keyboard order, screen-reader instructions, visible focus, and reduced motion.
- Preserve entered values after validation, synchronization, quota, schema, network, or uncertain-save errors.
- Prevent dismissal until both required outcomes commit. Budget and goal setup appear only as optional next steps.
- Existing users enter the dashboard normally and receive non-blocking prompts for **Total saldo saat ini** or legacy savings review.
- Add the approved legacy savings review list with individual selection, **Pilih semua**, selected total, and one-goal assignment or release actions.
- Show unknown usable-fund classification as **Perlu ditinjau** and never infer a goal from category.
- Before a grouped action, show confirmation and revalidate every selected row. If any row changed, apply nothing, reload the list, and ask the user to review the selection again.
- Preserve the original transaction fields; assignment changes allocation ownership once, while release removes the reservation without creating income or expense.

**Acceptance criteria:**

- A new user cannot bypass the required steps, including through Escape, backdrop, browser Back, refresh, or reopening the app.
- `Rp0` is stored as a confirmed value rather than mistaken for incomplete setup.
- The first transaction is counted once and uses the same safe operation pipeline as ordinary Quick Add.
- Existing users are never redirected into required onboarding.
- Legacy grouped assignment and release are all-or-nothing, preserve original transaction values, and never duplicate goal progress.

**Focused checks:** every interruption point, `Rp0`, successful and failed first transaction, another-device resume, mobile keyboard, screen reader, reduced motion, browser Back, existing-user entry, individual and select-all legacy review, unknown classification, changed-row abort, retry, and duplicate goal protection.

### Wave 5 — URL-backed navigation, modal history, and transaction entry

**Risk:** High for repeated transaction writes; Medium for navigation, history, and shared entry presentation.

**Primary areas:** dashboard shell, `StatsTab`, `PlanTab`, shared `Sheet`, Quick Add, and transaction row actions.

**Implement:**

- Make the main tab, Statistik section, Rencana section, month, year, account, date range, category, analysis mode, and comparison periods URL-backed when they materially affect the visible result.
- Parse and validate query parameters in one dashboard-owned adapter. Components receive normalized state and callbacks rather than maintaining competing copies.
- Use replace-style navigation for rapid filter changes and push-style navigation for destination changes that users expect Back to revisit.
- Make an open sheet or modal the first Back destination. If it contains unsaved edits, show a discard confirmation before closing.
- After controlled tab or section changes, focus the destination heading without stealing focus during ordinary filter updates.
- Keep the mobile FAB and add a persistent desktop **Tambah transaksi** action. Both open the same Quick Add instance.
- Add **Ulangi transaksi** to ordinary manual income and expense records. Copy description, category, amount, account, notes, and routine/special class; use today's date; omit event tags; require review.
- Use transaction movement metadata to hide repetition for bill, debt, goal-funded, transfer, and other system-generated rows.

**Acceptance criteria:**

- Refresh and authenticated deep links restore the same visible context.
- Back closes the top surface before moving through dashboard locations.
- Mobile FAB, desktop entry, empty-state entry, and repeated entry share validation, quota, stale-state, duplicate protection, and refresh behavior.
- A repeated record cannot submit until the review form has been displayed.

**Focused checks:** direct links, invalid parameters, Back/Forward, open and dirty sheets, focus restoration, mobile/desktop parity, eligible repetition, generated-record exclusion, quota limit, replay, concurrency, tenant isolation, external failure, and retry behavior.

### Wave 6 — Beranda hierarchy and weekly action surface

**Risk:** Medium; depends on canonical values, navigation links, and reconciled bill state.

**Primary area:** `HomeTab` plus a reusable balance-detail surface.

**Implement:**

- Use this hero order:
  1. **Kekayaan Bersih**, including monthly change;
  2. **Dana yang bisa dipakai saat ini**, including **Berdasarkan data terakhir** when provisional;
  3. current-month **Uang masuk**, **Uang keluar**, and **Arus kas bersih**.
- Keep all three layers visible without scrolling at 360 x 640 under normal text settings. Permit scrolling at larger accessibility text sizes rather than truncating labels or values.
- Add **Rincian saldo** with Saldo Tercatat, outstanding Utang/Piutang, goal reservations, unassigned savings, allocation shortfall, and unpaid bills shown as informational.
- Move the generic focus note out of the hero.
- Keep **Yang perlu kamu cek** directly below the hero and limit it to two deterministic items in this order: overdue bill, budget warning, goal behind pace, anomaly.
- Each item links to its exact evidence and destination state. Synchronization warnings stay above the hero and do not consume an action slot.
- When no supported warning qualifies, show a compact **Tambah transaksi** prompt.
- Keep the fuller cash-flow section lower on the page for comparisons and breakdowns.

**Acceptance criteria:**

- No headline labels net worth as savings or treats unpaid bills as already spent.
- Monthly cash flow stays visible without scrolling and uses the inclusive financial-foundation rules.
- Every action is traceable to records or approved deterministic thresholds; no speculative recommendation appears.
- Loading or failed dependent sections do not invent fallback advice.

**Focused checks:** each priority level, tie ordering, two-item limit, no-warning fallback, provisional balance, allocation shortfall, unpaid bill explanation, stale state, deep-link destination, 360 x 640 layout, and large text.

### Wave 7 — Statistik and Rencana progressive disclosure

**Risk:** Medium.

**Primary areas:** `StatsTab`, `PlanTab`, chart data alternatives, and shared section navigation.

**Implement in Statistik:**

- Preserve `Ringkasan`, `Kategori`, `Tren`, and `Laporan` ownership.
- Add a persistent readable **Filter aktif** summary covering period, account, category, date range, analysis mode, and comparison when enabled.
- Make inclusive actual totals and routine-only analytical values explicit wherever they appear together.
- Add `aria-expanded`, `aria-controls`, `aria-pressed`, tab-panel relationships, and complete selected states.
- Add keyboard-operable data lists or tables for cash flow, category, trend, and comparison charts. Pointer chart interactions may remain as shortcuts.
- Show **Geser untuk melihat semua bulan** only when chart content actually overflows.
- Increase calendar and compact controls to 44px hit areas without enlarging the visual icons unnecessarily.

**Implement in Rencana:**

- Preserve `Ringkasan`, `Target`, `Anggaran`, `Tagihan`, `Utang`, `Event`, and `Simulasi`.
- Prototype both navigation hypotheses for narrow screens: a horizontally scrollable labelled tablist and a **Lainnya** grouping for secondary sections. Recommend the tablist only if rendered mobile, keyboard, focus, discoverability, and overflow checks pass; record the selected pattern before implementation.
- Keep the overview brief ordered around budget status, bills, and goal progress. Keep simulations in their existing section.
- Distinguish entitlement-locked, administratively unavailable, loading, empty, and failed states.
- Focus and announce the new section after deliberate navigation.

**Acceptance criteria:**

- Users can identify exactly which data and analytical basis they are viewing.
- Every chart conclusion is available without pointer-only interaction.
- All planning sections remain discoverable and operable on narrow phones and with a keyboard under the selected, validated pattern.
- URL, visible selection, focus, and rendered content never drift apart.

**Focused checks:** filter combinations, query restoration, routine/actual copy, chart keyboard alternative, horizontal overflow, calendar controls, both Rencana navigation prototypes, locked/unavailable distinctions, dark mode, and large text.

### Wave 8 — Smart-feature explanations and Pro previews

**Risk:** Medium.

**Primary areas:** Health Score, forecast, anomaly, What-If, Financial Independence, Year-in-Review, and `LockedFeaturePreview`.

**Implement:**

- For unlocked features, show the data period, usable-data coverage, scheduled-bill treatment, routine/special treatment, excluded or unresolved data, and a path to supporting records.
- Express confidence as plain coverage language tied to known inputs. Do not present a model-style probability unless a real calibrated model exists.
- Keep locked previews compact and inside the relevant Statistik or Rencana section, using static non-personal examples.
- Use one upgrade action per local screen context and honor the Pro-registration availability state.
- Replace the preview in place after entitlement resolves. Use the simple unavailable message when an admin flag disables the feature.
- Keep Free workflows and available financial information unobstructed.

**Acceptance criteria:**

- Locked users never receive a personalized calculation through preview props, hidden markup, or background requests.
- Unlocked users can explain which records and assumptions produced the result.
- Upgrade messaging is not duplicated across the same screen and is hidden or changed appropriately when Pro registration is closed.

**Focused checks:** Free, Paid, Admin, registration closed, feature flag off, insufficient data, excluded data, evidence navigation, and absence of personal values in locked markup.

### Wave 9 — Payment confidence and pending-state refresh

**Risk:** Medium for UI; existing payment authorization and proof-storage contracts remain protected High-risk boundaries.

This audit recommendation needs one product decision before implementation: the review-time promise shown to users. Do not invent an SLA until operations can meet it.

**Recommended implementation after the SLA decision:**

- Show a compact timeline: **Menunggu pembayaran**, **Bukti diterima**, **Sedang ditinjau**, then **Disetujui** or **Ditolak**.
- Add **Periksa status** while proof is pending.
- Refresh pending status when the screen opens, when the app returns to the foreground, and after the manual action. Avoid continuous polling by default.
- Show the agreed review-time expectation and preserve WhatsApp support for exceptions.
- Keep rejection reason, resubmission, QR expiry, reference, amount, and proof preview behavior intact.

**Acceptance criteria:**

- The timeline reflects stored payment state and never implies approval before the admin decision.
- Manual refresh is bounded, accessible, and resilient to offline or server failure.
- No payment proof URL, admin detail, or sensitive storage path is exposed to another user.

**Focused checks:** every payment state, foreground refresh, offline retry, rejected resubmission, registration closed, cross-user access denial, and screen-reader announcement.

### Wave 10 — Final responsive and accessibility gate

**Risk:** Medium because changes span shared interaction surfaces.

**Verify and correct only affected behavior:**

- 360 x 640, 375px phone, large phone, tablet, desktop, and landscape layouts.
- Mobile keyboard and safe-area behavior; fixed navigation and FAB must not cover content.
- Keyboard-only navigation, modal focus trap/restoration, browser Back, visible focus, and skip/heading structure.
- Screen-reader names, descriptions, live status updates, chart alternatives, and Indonesian accessible labels.
- Light, dark, high text size, zoom, reduced motion, loading, empty, stale, error, locked, and unavailable states.
- 44px interaction areas for primary touch controls, while preserving compact visual icons.
- Semantic buttons for interactive cards, avatar fallback, contrast, and no page-level horizontal overflow.

**Completion gate:** after focused checks for each wave, run exactly one independent final diff review. Resolve task-caused blockers, then run the full test suite, one production build, and `git diff --check` once for the completed runtime milestone.

### Pairing boundary and overall implementation order

Pairing remains a separate event-scoped collaboration feature, not part of this audit implementation program. Its discovery can continue while financial foundations are built. Implementation order is:

1. Complete and verify financial foundations.
2. Finalize pairing permissions, ownership, contribution-versus-expense scope, revocation, and attribution in its own plan.
3. Build Waves 1–4. The pairing backend may proceed at the same time only when it owns disjoint API, migration, and test files.
4. Complete Wave 5 so pairing can reuse the stable navigation, modal-history, and transaction-entry contracts.
5. Implement pairing UI with exclusive ownership of shared Momental, Quick Add, and dashboard files.
6. Continue Waves 6–10 after pairing changes have been integrated or in disjoint files with one integration owner.

Pairing must share only the selected event. It must not expose Beranda, net worth, accounts, debts, bills, goals, unrelated transactions, or private notes. A pairing code alone does not grant access to another user's Google Sheet.

### Explicit decision gates still open

- Payment review SLA wording for Wave 9.
- Narrow-screen Rencana navigation pattern after the tablist-versus-**Lainnya** prototype check.
- Whether pairing participants may record contributions only or both contributions and event expenses.
- Pairing storage and authorization architecture, including invitation expiry and revocation.
- Dependable closed-app notifications, offline write queues, React Native/Expo, and any investment tracker remain separate future projects.

## Next Product Conversation

The financial definitions, checkpoint direction, verify-once behavior, legacy savings review, and implementation order are settled. Begin with the financial-foundation implementation plan, then use the post-foundation waves above.

The next unresolved product discussion in this roadmap is the payment review-time promise for Wave 9. Pairing decisions remain in their separate event-collaboration discussion and should be finalized before pairing code begins.

## Related Documents

- [System flow](Flow-system.md)
- [Commercialization plan](commercialization-plan.md)
- [Play Store React Native plan](play-store-react-native-plan.md)
