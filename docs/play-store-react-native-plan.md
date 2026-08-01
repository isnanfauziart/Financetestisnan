# Artami React Native/Expo Play Store Release Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Release Artami as an Android React Native/Expo application on Google Play while preserving the existing Next.js backend, Supabase user system, per-user Google Sheets, and approved narrow OAuth scope.

**Architecture:** The mobile client lives in a separate `mobile/` directory and calls the existing Next.js API routes. Native Google OAuth exchanges an authorization code on the server, while the server owns Google Sheets access tokens and user provisioning. Expo EAS builds the signed Android App Bundle; the existing TWA is excluded from this release path.

**Tech Stack:** React Native, Expo, Expo Router, NativeWind, Expo SecureStore, native Google OAuth, Next.js 14 API routes, NextAuth-compatible server authentication, Supabase, Google Sheets API, Google Play Billing/alternative billing APIs, EAS Build, and Google Play Console.

## Global Constraints

- Android-first React Native/Expo release; do not use the existing TWA as the release artifact.
- Preserve package ID `com.artami.app`.
- Keep Google Sheets access limited to `https://www.googleapis.com/auth/drive.file` plus `openid email profile`.
- Never request `https://www.googleapis.com/auth/spreadsheets`.
- Never ship `GOOGLE_CLIENT_SECRET`, Supabase service-role keys, Google refresh tokens, or Play service-account private keys in the mobile bundle.
- Keep Google Sheets and Supabase as the backend source of truth; do not duplicate financial data locally as a second database.
- Mobile code belongs in `mobile/`; server-only modules remain under `src/` and must not be imported into Metro bundles.
- Premium digital functionality requires compliant Google Play billing or an approved Indonesia alternative-billing program.
- Use Expo development builds for native modules; Expo Go is insufficient for billing and other custom native integrations.
- Complete commercialization Phases 2–5 before production submission.

---

## 1. Current status and release decisions

- [ ] Confirm the latest Google email and Google Auth Platform both show OAuth verification as **Approved**.
- [ ] Keep the approved web OAuth consent screen and production publishing status.
- [ ] Confirm the production app still requests only `drive.file` for Sheets.
- [ ] Treat OAuth approval as separate from Android and Google Play review.
- [ ] Use React Native/Expo as the first mobile release; the existing TWA is not the release artifact.
- [ ] Use the existing Next.js/Vercel backend and Supabase database.
- [ ] Preserve per-user Google Sheet provisioning and owner-only legacy spreadsheet connection.
- [ ] Use `com.artami.app` for the Expo Android application.
- [ ] Register for the Indonesia alternative-billing program before exposing QRIS premium purchase in the app.
- [ ] Decide whether the current Play developer account is personal or organization. Use an organization account for the commercial finance business when eligible; if the account is personal and newly created, plan for the closed-testing requirement.

Reference project documents:

- `AGENTS.md`
- `docs/commercialization-plan.md`
- `docs/commercialization-prompts.md`
- `docs/Flow-system.md`

## 2. Release blockers

The production release is blocked until every item below is checked:

- [x] Commercialization Phase 2 (payments/admin) is complete — QRIS proof upload, private storage, admin approval/rejection, entitlement activation, and production verification completed.
- [x] Commercialization Phase 3 (server-side feature gating) is complete.
- [x] Commercialization Phase 4 (hardening) is complete — implementation, migration, automated verification, and live admin acceptance checks passed.
- [ ] Revamp the web UI/UX baseline before porting the product to React Native.
- [ ] Migrate the canonical production domain from `ultah.biz.id` to `artami.web.id`, then retire the old domain from serving Artami; keep its registration only if needed to prevent reuse.
- [ ] Commercialization Phase 5 (testing and verification) is complete on `artami.web.id`.
- [ ] Native Google authentication works on a physical Android device.
- [ ] Mobile bearer-token authentication works for every protected API route.
- [ ] New users receive isolated Artami-created spreadsheets.
- [ ] The owner-only legacy spreadsheet picker works.
- [ ] Account deletion works in-app and through a public web route.
- [ ] Privacy policy and Data Safety declarations match the actual app, SDKs, backend, and payment flow.
- [ ] Alternative-billing enrollment is accepted and configured.
- [ ] Play reviewer credentials and instructions are ready.
- [ ] EAS production signing credentials are backed up securely.
- [ ] A production EAS build generates an Android App Bundle (`.aab`).
- [ ] Package ID, signing fingerprints, Google OAuth clients, and Play Console configuration match.
- [ ] The Play Console policy dashboard has no unresolved blocking warnings.

## 3. Backend mobile-auth foundation

### Files and responsibilities

- Create `src/app/api/mobile/auth/google/route.js` for native authorization-code exchange.
- Create or extend a server-side token utility for short-lived Artami access tokens and refresh handling.
- Modify `src/lib/apiAuth.js` so `getAuthContext(request)` supports both browser cookies and `Authorization: Bearer <artami-token>`.
- Extend the Supabase user schema with encrypted Google refresh-token storage only if the existing deployment has no secure token column.
- Create `src/app/api/mobile/auth/refresh/route.js` if access-token renewal is not handled by the existing token utility.
- Create `src/app/api/mobile/account/route.js` for authenticated account deletion.
- Reuse `src/lib/user.js`, `src/lib/sheetManager.js`, `src/lib/legacySheet.js`, and existing API route authorization.

### Required behavior

- The native app sends a Google authorization code, not a Google client secret.
- The server exchanges the code with Google using the existing web client and secret.
- The server verifies the Google identity and calls `getOrCreateUser()`.
- The server provisions an Artami spreadsheet for normal users.
- The server returns an Artami session token without returning Google refresh tokens.
- The mobile client stores the Artami token with `expo-secure-store`.
- Expired mobile sessions refresh or require sign-in again without silently losing data.
- Every protected route continues to enforce the authenticated Supabase user and that user’s spreadsheet ID.
- Google access tokens are refreshed server-side before Sheets calls when necessary.

### Acceptance checks

- [ ] A fresh Google account can sign in from a development build.
- [ ] Restarting the app restores the Artami session.
- [ ] Expired sessions refresh or display a clear sign-in state.
- [ ] A bearer request cannot access another user’s sheet.
- [ ] Google and Supabase secrets do not appear in the mobile bundle.

## 4. Expo project foundation

Create the mobile application in this structure:

```text
mobile/
  app/
    _layout.js
    index.js
    sign-in.js
    (app)/
      _layout.js
      home.js
      stats.js
      wallet.js
      plan.js
      profile.js
  components/
  lib/
    api.js
    auth.js
    session.js
    google.js
  assets/
  app.json
  eas.json
  metro.config.js
  package.json
```

Configure:

- Expo Router protected routes.
- NativeWind styling using the existing Artami visual tokens.
- `expo-secure-store` for the Artami session.
- Expo Linking/deep links for OAuth and picker callbacks.
- Native Google OAuth or Expo AuthSession using the approved scopes.
- Development, preview, and production EAS profiles.
- Metro resolution for safe, pure helpers from `src/lib/*.js`.

Do not import these server-only modules into `mobile/`:

- `googleapis`
- `supabaseAdmin`
- `next-auth` server configuration
- Next.js route handlers
- Any service-role or OAuth-secret module

Expo Router supports protected routes and deep linking, and SecureStore is intended for encrypted mobile token storage. [Expo authentication](https://docs.expo.dev/guides/authentication/), [Expo Router authentication](https://docs.expo.dev/router/advanced/authentication/)

## 5. Feature-port sequence

Implement each feature only after its API contract and mobile acceptance test are defined.

### 5.1 Authentication and session restoration

- API: `/api/mobile/auth/google`, `/api/mobile/auth/refresh`.
- Add sign-in, loading, failure, retry, sign-out, and session-restoration states.
- Test a fresh user, an existing user, token expiry, and sign-out.

### 5.2 Home dashboard

- API: `/api/dashboard`.
- Port net worth, income, expense, savings, recent transactions, insights, budgets, goals, and bills summary.
- Include loading skeletons, empty states, retry, and pull-to-refresh.
- Test slow network, empty sheets, malformed values, and two-user isolation.

### 5.3 Statistics

- Reuse pure filtering and aggregation helpers from `src/lib`.
- Port charts, month/year filters, account filters, category drill-down, and comparisons.
- Test no data, one transaction, multiple accounts, and broken formula values.

### 5.4 Wallet and transactions

- APIs: `/api/transaction`, `/api/transaction/[id]`.
- Port income, expense, savings, edit, delete, quick-add, validation, and undo flows.
- Preserve Indonesian Rupiah formatting and all existing validation rules.
- Test duplicate taps, network failure during mutation, and retry without duplicate rows.

### 5.5 Budgets

- API: `/api/budgets`.
- Port setup, edit, delete, progress, category suggestions, and account filtering.
- Test monthly composite keys and account-less budgets.

### 5.6 Goals

- API: `/api/goals` and `/api/transaction` for contributions.
- Port progress rings, contribution flow, completion celebration, and completed-goal state.
- Test contribution, edit/delete rollback, zero contribution, and 100% crossing.

### 5.7 Bills

- APIs: `/api/bills`, `/api/bills/[id]`, `/api/bills/pay`, `/api/bills/summary`.
- Port bill CRUD, payment flow, auto-transaction behavior, overdue status, and reminders.
- Test duplicate payment, inactive bill, overdue bill, and transaction failure.

### 5.8 Profile and settings

- APIs: `/api/settings`, `/api/me`, payment APIs, and account deletion endpoint.
- Port tier state, preferences, privacy policy, terms, support, spreadsheet status, sign-out, and account deletion.

## 6. Google Cloud setup guide

Complete this after the mobile app has a fixed package ID and before production EAS signing:

1. Open the existing Google Cloud project.
2. Keep the approved OAuth consent screen.
3. Confirm publishing status is production.
4. Confirm `drive.file` is the only Sheets-related scope.
5. Do not add `spreadsheets` scope.
6. Create an Android OAuth client.
7. Enter package name `com.artami.app`.
8. Add the SHA fingerprints from the EAS Android signing credential.
9. Keep the existing web OAuth client for server-side authorization-code exchange.
10. Enable Google Sheets API, Google Drive API, and Picker-related APIs used by the hosted owner picker.
11. Keep the Picker browser API key restricted to the production web domain and local development origin.
12. Confirm production web origins and redirect URLs.
13. Sign in with a new Google account from the Android development build.
14. Confirm the OAuth consent screen still shows the approved narrow scope.

## 7. Owner legacy spreadsheet connection

The native app cannot rely on the existing JavaScript Picker component directly inside React Native.

Implement a hosted web picker route:

- Route: `/legacy-sheet-picker`.
- Loads Google Identity Services and Google Picker in the browser.
- Uses `drive.file` only.
- Allows only `LEGACY_SHEET_OWNER_EMAIL` to complete the connection.
- Sends the selected spreadsheet ID to the backend.
- Redirects back to the app using a signed Expo deep link.
- Rejects non-owner accounts and invalid spreadsheet IDs.

Acceptance tests:

- [ ] Owner can connect the existing private spreadsheet.
- [ ] Normal users cannot connect it.
- [ ] The selected spreadsheet is stored only for the owner.
- [ ] The owner’s existing spreadsheet is never deleted by normal account deletion.

## 8. Indonesia alternative billing

Complete Play enrollment before exposing QRIS premium purchase:

1. Register Artami for the applicable Indonesia alternative-billing program.
2. Complete the required Play Console onboarding and payment profile.
3. Create the one-time lifetime product, for example `artami_lifetime`.
4. Configure QRIS as the alternative payment option.
5. Integrate native Play Billing APIs through an Expo development build.
6. Display Google’s billing-choice experience.
7. Handle Google Play Billing selection.
8. Handle QRIS selection.
9. Receive and persist the external transaction token.
10. Open the dedicated `/upgrade` QRIS checkout with a `Simpan QR` action; do not show QRIS inline below an upgrade CTA.
11. Store the payment attempt and proof.
12. Allow the admin approval workflow to approve or reject the payment.
13. Grant the paid tier only after verified approval.
14. Report completed external transactions to Google Play within the required period.
15. Handle refunds, rejected payments, duplicate tokens, cancellations, and revoked entitlements.

If the selected Expo library does not expose the current alternative-billing APIs, use an Expo config plugin and native Android module. Do not silently replace the required Google billing flow with an unregistered QRIS link.

Google’s billing documentation requires alternative-billing API integration and backend reporting of external transactions. [Alternative billing API](https://developer.android.com/google/play/billing/alternative), [Alternative billing integration](https://developer.android.com/google/play/billing/alternative/alternative-billing-with-user-choice-in-app), [Billing backend](https://developer.android.com/google/play/billing/backend)

## 9. Privacy and account deletion

Implement both paths:

- Public web route: `/account-deletion`.
- Native route: Profile → Account → Hapus akun.

Required behavior:

- Show what will be deleted.
- Require explicit confirmation.
- Re-authenticate the user.
- Delete Supabase user-related records.
- Delete app-created Google Sheets.
- Unlink, rather than delete, the owner’s pre-existing private spreadsheet.
- Revoke Google credentials where supported.
- Sign the user out on completion.
- Display support contact and retention exceptions.
- Return a durable deletion-request confirmation.

Update `/privacy` to describe Google OAuth, Google Sheets, Supabase, payment processing, QRIS proof handling, data retention, third-party SDKs, and account deletion.

Google requires account deletion both inside the app and through a web-accessible route when users can create accounts. [Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)

## 10. React Native testing checklist

### Authentication

- [ ] New Google user.
- [ ] Existing Google user.
- [ ] Owner legacy spreadsheet.
- [ ] Non-owner legacy connection rejection.
- [ ] Token expiration and refresh.
- [ ] App restart and session restoration.
- [ ] Sign-out.

### Data and features

- [ ] Two-user data isolation.
- [ ] Empty spreadsheet.
- [ ] Malformed or formula-error values.
- [ ] Transaction CRUD.
- [ ] Budgets.
- [ ] Goals.
- [ ] Bills.
- [ ] Settings.
- [ ] Account deletion.

### Android behavior

- [ ] Android back button.
- [ ] Deep links.
- [ ] Slow network.
- [ ] No network.
- [ ] Background/resume.
- [ ] App restart.
- [ ] Keyboard and formatted currency input.
- [ ] Small screen and large screen layouts.
- [ ] Android 10, 13, 15, and 16 devices or emulators.

### Payments

- [ ] Google Play Billing selection.
- [ ] QRIS selection.
- [ ] Pending payment.
- [ ] Approved payment.
- [ ] Rejected payment.
- [ ] Duplicate transaction token.
- [ ] Refund.
- [ ] Entitlement restoration after reinstall.

## 11. EAS build and signing guide

1. Install EAS CLI.
2. Authenticate with the Expo account.
3. Configure `mobile/app.json`.
4. Set package ID to `com.artami.app`.
5. Configure development, preview, and production profiles in `mobile/eas.json`.
6. Configure the deep-link scheme.
7. Generate or reuse Android signing credentials.
8. Back up the upload key and credentials securely.
9. Build an internal APK.
10. Install it on physical Android devices.
11. Run the complete device and payment checklist.
12. Build the production AAB.
13. Verify the final package name and version code.
14. Upload the first AAB manually to Play Console.
15. Enroll in Play App Signing.
16. Copy the final Play app-signing SHA fingerprints into Google Cloud.
17. Re-test Google OAuth with the Play-signed build.

EAS produces Android App Bundles for Play Store distribution, and the first Play upload must be manual before automated submission is used. [Expo EAS Build](https://docs.expo.dev/build/setup/), [Expo submission](https://docs.expo.dev/deploy/submit-to-app-stores/)

## 12. Play Console field-by-field guide

Enter the following values unless the Play Console requires a different current field:

- App name: `Artami`.
- Package name: `com.artami.app`.
- Default language: Bahasa Indonesia.
- Category: Finance.
- Distribution: Indonesia first.
- Privacy policy: production HTTPS URL for `/privacy`.
- Account deletion: production HTTPS URL for `/account-deletion`.
- Support email: maintained Artami support address.
- App access: stable Google test account and English review instructions.
- Data Safety: describe all data collected, shared, stored, and deleted.
- Financial features declaration: answer based on the actual tracking, budgeting, and payment features.
- Content rating: complete the questionnaire honestly.
- Target audience: complete based on the intended Indonesian audience.
- Ads declaration: declare no ads only if the shipped app contains no ads or ad SDK.
- Alternative billing: configure only after program enrollment.
- Store listing: Indonesian icon, screenshots, feature graphic, short description, full description, and support details.
- Release notes: describe the first public Artami release without promising unavailable features.

## 13. Testing-track release process

1. Upload an internal-testing build.
2. Fix crashes, OAuth failures, Sheets failures, and payment failures.
3. Create the closed-testing release.
4. Recruit testers with compatible Android devices.
5. Keep testers opted in for the required duration.
6. Apply for production access when eligible.
7. Upload the production AAB.
8. Review the pre-launch report.
9. Resolve policy warnings and broken reviewer flows.
10. Submit for production review.
11. Start with a staged rollout.
12. Monitor crashes, ANRs, OAuth failures, Sheets failures, payment failures, and account-deletion requests.
13. Increase rollout only after production telemetry is stable.

For newly created personal developer accounts, Google currently requires at least 12 closed-testers opted in continuously for 14 days before production access. [Testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)

## 14. Final acceptance checklist

- [ ] OAuth remains Approved.
- [ ] Only `drive.file` is requested.
- [ ] Native Google OAuth works.
- [ ] API bearer sessions work.
- [ ] User spreadsheet isolation works.
- [ ] Owner-only legacy connection works.
- [ ] Account deletion works in-app.
- [ ] Account deletion works from the public web route.
- [ ] Privacy policy is accurate.
- [ ] Data Safety answers are accurate.
- [ ] Alternative billing is enrolled.
- [ ] QRIS transactions are reported correctly.
- [ ] Paid entitlements are granted only after verification.
- [ ] EAS production AAB builds successfully.
- [ ] Signing keys are backed up.
- [ ] OAuth fingerprints match the final Play signing key.
- [ ] Reviewer credentials work.
- [ ] Closed testing is complete when required.
- [ ] Play Console has no unresolved policy blockers.

## Execution boundary

This document is the documentation-only milestone. The next milestones are:

1. Backend mobile-auth foundation.
2. Expo project foundation.
3. Feature port.
4. Account deletion and privacy compliance.
5. Alternative billing.
6. EAS build and device testing.
7. Play Console release.

No application code, Expo project, database migration, or Google Cloud configuration is changed by creating this plan.
