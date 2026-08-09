# Artami Netlify Migration Guide

This guide migrates Artami from Vercel to Netlify Free and changes the canonical production URL from `ultah.biz.id` to `artami.web.id`.

## Target State

| Item | Final value |
| --- | --- |
| Hosting | Netlify Free |
| Deployment source | GitHub `main` branch |
| Canonical URL | `https://artami.web.id` |
| `www` behavior | Redirect to the apex domain |
| Old domain | Permanent redirect to the new domain |
| DNS provider | Netlify DNS |
| Vercel | Retained during rollback, then retired |
| Android release | Future React Native app |

Netlify Free is suitable for an initial launch around 100 users if usage is monitored. Netlify measures deploys, bandwidth, requests, and function compute rather than registered-user count. One hundred registered users is not itself a Netlify capacity limit.

## Phase 0: Prepare Access

Confirm access to these accounts:

| Service | Required access |
| --- | --- |
| GitHub | Repository administration |
| Vercel | Existing project settings and environment variables |
| Netlify | Account that can import GitHub repositories |
| IDwebhost | Nameserver management for `artami.web.id` |
| Google Cloud | OAuth client, consent screen, and API key |
| Supabase | Project dashboard for acceptance testing |

1. Do not delete or modify the Vercel deployment yet.
2. Keep the current Vercel app available throughout the new-domain setup.
3. Do not paste secrets into chat, documentation, GitHub, or source code.
4. Preserve the existing values of `NEXTAUTH_SECRET`, Google credentials, and Supabase credentials. This migration does not require rotating them.
5. Use the Vercel production configuration or secure credential records as the source of truth. The local `.env.local` is incomplete.
6. Stage only migration-specific files. Do not use `git add .` because the repository may contain unrelated worktree changes.

## Phase 1: Repository Changes

The following changes are already included by this migration:

| File | Change |
| --- | --- |
| `netlify.toml` | Redirects HTTP and HTTPS requests from both old-domain hostnames to the new canonical domain |
| `twa-manifest.json` | Uses `artami.web.id` for the TWA host, manifest, and icons |
| `scripts/generate-twa.js` | Generates TWA configuration for `artami.web.id` |
| `scripts/create-android-project.js` | Generates Android host, launch URL, and network domain for `artami.web.id` |
| `android/app/src/main/AndroidManifest.xml` | Uses the new Android app-link host and launch URL |
| `android/app/src/main/java/com/artami/app/MainActivity.java` | Launches the new domain |
| `android/app/src/main/res/xml/network_security_config.xml` | Uses the new domain |

The committed redirect configuration is:

```toml
[[redirects]]
  from = "http://ultah.biz.id/*"
  to = "https://artami.web.id/:splat"
  status = 301
  force = true

[[redirects]]
  from = "https://ultah.biz.id/*"
  to = "https://artami.web.id/:splat"
  status = 301
  force = true

[[redirects]]
  from = "http://www.ultah.biz.id/*"
  to = "https://artami.web.id/:splat"
  status = 301
  force = true

[[redirects]]
  from = "https://www.ultah.biz.id/*"
  to = "https://artami.web.id/:splat"
  status = 301
  force = true
```

These redirects do not affect `artami.web.id`. They only work after the old domains are attached to the Netlify site and their DNS points to Netlify.

### Verify Repository References

Run:

```powershell
rg -n "ultah\.biz\.id" --glob "!android/app/build/**"
```

Remaining old-domain references should be limited to redirect rules, historical documentation, or migration notes. Do not globally replace historical references such as the motion-graphics privacy warning.

Do not edit generated files under `android/app/build/`. Do not run the TWA generator in a dirty worktree unless you are prepared to review all generated output.

### Android/TWA Notes

`public/manifest.json` uses relative URLs and does not require a domain edit.

`public/.well-known/assetlinks.json` already exists. After the new domain is live, verify it is available at:

```text
https://artami.web.id/.well-known/assetlinks.json
```

The fingerprint in that file must match the signing certificate used by any TWA build. The planned React Native Play Store app is a separate release and does not require a TWA rebuild, but it must use `https://artami.web.id` for its production API/web URL.

The current `network_security_config.xml` source file is updated for consistency. Check whether the Android application manifest wires it through `android:networkSecurityConfig` before relying on it as an active runtime setting.

## Phase 2: Create the Netlify Project

1. Open [Netlify](https://app.netlify.com/).
2. Select **Add new project**.
3. Select **Import an existing project**.
4. Select **GitHub**.
5. Authorize Netlify to access the GitHub account.
6. Select repository `isnanfauziart/Financetestisnan`.
7. Set the production branch to `main`.
8. Keep the base directory empty.
9. Use this build command:

```text
npm run build
```

10. Let Netlify detect the Next.js runtime and publish configuration.
11. Do not configure `out` as a publish directory.
12. Do not enable static export or `next export`.
13. Do not install `@netlify/plugin-nextjs`; modern Netlify Next.js deployments use the maintained OpenNext adapter automatically.
14. Choose a recognizable temporary site name such as `artami-finance` if Netlify asks for one.

The generated `*.netlify.app` URL is a deployment URL, not the canonical production URL.

## Phase 3: Configure Netlify Environment Variables

Open:

**Netlify project -> Project configuration -> Environment variables**

Add all 11 required production variables without surrounding quotes:

| Variable | Source/value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Existing Google Web OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Existing Google OAuth client secret |
| `NEXTAUTH_URL` | `https://artami.web.id` |
| `NEXTAUTH_SECRET` | Existing value, unchanged |
| `LEGACY_SHEET_OWNER_EMAIL` | Existing authorized owner email |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same value as `GOOGLE_CLIENT_ID` |
| `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY` | Existing Google Picker browser key |
| `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER` | Existing Google Cloud project number |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Existing Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Existing server-side service-role key |

### Copy Values From Vercel

1. Open the existing Vercel project.
2. Navigate to **Settings -> Environment Variables**.
3. Select the **Production** value for each required variable.
4. Transfer each value directly to Netlify.
5. If Vercel does not reveal a secret, retrieve it from the original secure record or rotate that one credential deliberately.
6. Do not regenerate `NEXTAUTH_SECRET`; changing it invalidates existing encrypted sessions.
7. Do not add `SPREADSHEET_ID`. It is an obsolete single-user variable and is not required by the per-user runtime.

Treat these variables as server secrets:

```text
GOOGLE_CLIENT_SECRET
NEXTAUTH_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

The `NEXT_PUBLIC_*` variables are intentionally browser-visible and must not contain secret credentials.

Set the variables for the Netlify **Production** context and enable both **Builds** and **Functions/Runtime** scopes. `next.config.js` checks these values during the production build, and API routes need the server-side values at runtime. Do not copy production secrets into deploy previews unless separate preview credentials are configured.

Optional after the first successful deployment:

```text
NETLIFY_NEXT_SKEW_PROTECTION=true
```

This is not required for the migration.

## Phase 4: Deploy and Validate Netlify Runtime

1. Trigger a production deployment from the `main` branch.
2. Open **Deploys** and inspect the build log.
3. If the build reports missing variables, add the exact named variables and redeploy.
4. Confirm Netlify recognizes the project as Next.js.
5. Open the generated `*.netlify.app` URL.
6. Confirm the landing page loads.
7. Open the health endpoint:

```text
https://<generated-netlify-url>/api/health
```

Expected status: `200`.

Expected response shape:

```json
{
  "ok": true,
  "configured": true,
  "missing": [],
  "presentCount": 11,
  "requiredCount": 11
}
```

8. Confirm `/privacy`, `/terms`, `/manifest.json`, icons, CSS, and JavaScript load on the generated Netlify URL.
9. Google authentication is not expected to work through the generated URL while `NEXTAUTH_URL` points to the final domain. Test authentication after the custom domain is active.
10. Do not proceed to DNS until the build and health endpoint pass.

## Phase 5: Configure Google OAuth and Picker

### Google OAuth Web Client

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Select the existing Artami Google Cloud project.
3. Open **Google Auth Platform -> Clients**.
4. If the old interface appears, use **APIs & Services -> Credentials**.
5. Open the existing OAuth 2.0 **Web application** client matching `GOOGLE_CLIENT_ID`.
6. Under **Authorized JavaScript origins**, add exactly:

```text
https://artami.web.id
```

7. Under **Authorized redirect URIs**, add exactly:

```text
https://artami.web.id/api/auth/callback/google
```

8. Keep existing localhost entries required for development.
9. Keep old-domain entries until the new domain passes authentication tests.
10. Save the OAuth client.

The callback URI must match exactly. Do not add a trailing slash.

### Google Auth Platform Branding

In **Google Auth Platform -> Branding**:

1. Add `artami.web.id` under authorized domains.
2. Set the application homepage to:

```text
https://artami.web.id
```

3. Set the privacy policy URL to:

```text
https://artami.web.id/privacy
```

4. Set the terms URL to:

```text
https://artami.web.id/terms
```

5. Update support and developer links that still use the old domain.
6. If Google requires OAuth re-verification after the domain change, complete it before Play Store launch.

### Google Picker API Key

1. Open **APIs & Services -> Credentials**.
2. Open the API key matching `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`.
3. Keep **Application restrictions -> Websites / HTTP referrers**.
4. Add:

```text
https://artami.web.id/*
```

5. Keep localhost restrictions required for development.
6. Keep the old-domain referrer until cutover is complete.
7. Save the API key.

Do not change the OAuth scope, Google Cloud project number, Drive API, or Picker API enablement.

## Phase 6: Add `artami.web.id` to Netlify

1. Open the Netlify project.
2. Navigate to **Domain management**.
3. Select **Add a domain**.
4. Select **Add a domain you already own**.
5. Enter:

```text
artami.web.id
```

6. Confirm the domain.
7. Set `artami.web.id` as the primary domain.
8. Confirm Netlify adds `www.artami.web.id` as an alternative domain.
9. Confirm the `www` domain redirects to the apex domain.
10. Select **Set up Netlify DNS**.
11. Copy all four nameservers Netlify displays.

Do not hard-code example nameservers from documentation. Use the four nameservers shown for this Netlify DNS zone.

## Phase 7: Change Nameservers in IDwebhost

The IDwebhost screenshot shows a **Nameserver** menu and a separate **Buat Nameserver** menu. Use **Nameserver**. Do not use **Buat Nameserver**, which creates child/glue nameservers.

1. Open the IDwebhost domain-management page for `artami.web.id`.
2. Select **Nameserver**.
3. Check whether IDwebhost shows DNSSEC or a DS record. If a DS record is present, disable DNSSEC or remove the DS record before changing nameservers. The current public registration is unsigned, but verify the current dashboard state before cutover.
4. Remove the existing nameservers:

```text
ns1.idwebhost.id
ns2.idwebhost.id
```

5. Enter all four nameservers supplied by Netlify.
6. Save the nameserver changes.
7. Do not add Netlify A or CNAME records in IDwebhost after delegation. Netlify DNS is now authoritative.
8. Wait for propagation. It may take several hours and, in some cases, up to 24 hours.

### Verify Nameservers

Run:

```powershell
Resolve-DnsName -Name "artami.web.id" -Type NS
```

The result should contain the four Netlify nameservers.

Then run:

```powershell
Resolve-DnsName -Name "artami.web.id" -Type A
Resolve-DnsName -Name "www.artami.web.id" -Type CNAME
```

The current `SERVFAIL` condition must disappear before continuing.

## Phase 8: Enable HTTPS

1. Open **Netlify -> Domain management -> HTTPS**.
2. Wait for the Netlify-managed Let's Encrypt certificate.
3. Confirm the certificate covers:

```text
artami.web.id
www.artami.web.id
```

4. Open `https://artami.web.id` in a private browser window.
5. Confirm there is no certificate warning.
6. Open `https://www.artami.web.id`.
7. Confirm it redirects to `https://artami.web.id`.

Do not test Google login until HTTPS is active.

## Phase 9: Verify the Domain in Google

1. Open [Google Search Console](https://search.google.com/search-console).
2. Add a Domain property for `artami.web.id`.
3. Google will provide a TXT verification record.
4. Open **Netlify team dashboard -> DNS -> artami.web.id**.
5. Add the TXT record supplied by Google.
6. Return to Search Console and select **Verify**.

## Phase 10: Production Acceptance Tests

Use a private browser window so old-domain cookies do not hide authentication problems.

### Public Pages

Verify these URLs:

```text
https://artami.web.id
https://artami.web.id/privacy
https://artami.web.id/terms
https://artami.web.id/manifest.json
https://artami.web.id/icons/icon-512.png
https://artami.web.id/.well-known/assetlinks.json
https://artami.web.id/api/health
```

### Health Endpoint

Confirm `/api/health` returns status `200` and reports:

```json
{
  "ok": true,
  "configured": true,
  "missing": [],
  "presentCount": 11,
  "requiredCount": 11
}
```

### Google Authentication

1. Select Google sign-in.
2. Confirm Google shows the expected Artami OAuth consent screen.
3. Confirm the callback uses:

```text
https://artami.web.id/api/auth/callback/google
```

4. Confirm there is no `redirect_uri_mismatch` error.
5. Confirm the user reaches `/dashboard`.
6. Confirm sign-out and sign-in work again.

### Google Sheets

Using a safe test user:

1. Load the dashboard.
2. Read existing transactions.
3. Create one test transaction.
4. Edit the transaction.
5. Delete the transaction.
6. Confirm the correct Google Sheet changed.
7. Confirm another user cannot access that Sheet.
8. Confirm a new user receives an isolated Artami-created spreadsheet.

### Legacy Owner Picker

Using the account matching `LEGACY_SHEET_OWNER_EMAIL`:

1. Open the legacy spreadsheet connection flow.
2. Confirm Google Picker loads without an API-key referrer error.
3. Confirm the private spreadsheet can be selected.
4. Confirm normal users cannot access the owner-only flow.

### Supabase and Payments

1. Open `/api/me` while authenticated.
2. Confirm tier and usage data load.
3. Submit a payment-proof test only if a safe test account is available.
4. Confirm the proof is stored in private Supabase Storage.
5. Confirm the admin dashboard can review it.
6. Remove or reject the test payment record afterward.

### Security and Behavior

Verify:

- Security headers remain present.
- API rate limiting returns `429` when intentionally exceeded.
- `/admin` rejects non-admin users.
- Disabled feature flags remain enforced.
- APK download still works.
- Free and paid limits remain unchanged.
- Google and Supabase secrets do not appear in browser source or logs.
- If a TWA release is still supported, confirm `assetlinks.json` and the Android host configuration match the signing certificate and `artami.web.id`.

### Go/No-Go Gate

Do not move the old domain until every item passes:

| Check | Required result |
| --- | --- |
| Netlify build | Passed |
| `/api/health` | `200`, 11/11 variables |
| Apex HTTPS | Valid |
| `www` redirect | Correct |
| Google sign-in | Passed |
| Sheet read/write | Passed |
| User isolation | Passed |
| Picker | Passed |
| Supabase/admin | Passed |
| Security headers | Present |

## Phase 11: Move the Old Domain to Netlify

Do this only after the new domain passes the acceptance gate.

1. Confirm the `netlify.toml` redirects are deployed.
2. In Netlify **Domain management**, add `ultah.biz.id` as a domain alias.
3. Add `www.ultah.biz.id` as a domain alias if Netlify does not add it automatically.
4. Configure the old domain to point to Netlify.
5. If Netlify offers DNS setup for the old domain, use the nameservers it provides.
6. Wait for DNS propagation and certificate issuance.
7. Test:

```text
http://ultah.biz.id
http://www.ultah.biz.id
http://ultah.biz.id/dashboard?source=legacy
http://www.ultah.biz.id/dashboard?source=legacy
https://ultah.biz.id
https://www.ultah.biz.id
https://www.ultah.biz.id/dashboard
https://www.ultah.biz.id/privacy
```

8. Confirm every HTTP and HTTPS request returns one permanent `301` redirect to the equivalent path on `artami.web.id`.
9. Confirm query strings remain present after redirect. For example:

```powershell
curl.exe -sSIL "http://www.ultah.biz.id/dashboard?source=legacy"
```

The response should contain a `301` status and a `Location` header pointing to `https://artami.web.id/dashboard?source=legacy`.

Expected result:

```text
https://www.ultah.biz.id/dashboard
-> https://artami.web.id/dashboard
```

Keep the old domain registered to prevent reuse, even after it stops serving the app directly.

## Phase 12: Remove Old Google Configuration

After the old-domain redirects work:

1. Open the Google Web OAuth client.
2. Remove JavaScript origins containing `ultah.biz.id`.
3. Remove callback URIs containing `ultah.biz.id`.
4. Open the Google Picker API key.
5. Remove old-domain HTTP-referrer restrictions.
6. If still present, remove `financedashv1.vercel.app` origins, callback URIs, and Picker referrers from Google configuration.
7. Keep the new production domain and required localhost entries.

Users will be signed out during the domain transition because browser cookies do not transfer between domains. Their Google Sheets and Supabase data remain unchanged.

## Phase 13: Retire Vercel

Keep Vercel available as rollback for approximately seven days after the new domain launches.

Before deleting or disconnecting the Vercel project, check for previously released TWA builds that still launch `https://financedashv1.vercel.app/dashboard`. Those installed apps do not follow the new `ultah.biz.id` redirect. Keep the Vercel project/default hostname serving the app, or maintain a Vercel redirect deployment, until the old TWA is no longer supported and an updated app release uses `artami.web.id`.

After the rollback window:

1. Open the Vercel project.
2. Navigate to **Settings -> Domains**.
3. Remove `ultah.biz.id` and `www.ultah.biz.id`.
4. Navigate to **Settings -> Git**.
5. Disconnect the GitHub repository to prevent future Vercel deployments.
6. Confirm production traffic no longer reaches Vercel.
7. Delete the Vercel project only after the old TWA compatibility requirement is cleared and rollback is no longer needed.

Do not revoke Google or Supabase credentials. Netlify uses the same credentials.

## Phase 14: Search and Play Store Updates

1. Verify both old and new domains in Google Search Console.
2. Use Search Console's Change of Address tool if available for the old property.
3. Keep old-to-new permanent redirects active.
4. Update external links, social profiles, support messages, QR codes, and promotional material.
5. Configure the future React Native app to use:

```text
https://artami.web.id
```

6. Do not ship a React Native build containing `ultah.biz.id`.

## Phase 15: Monitor Netlify Free Usage

Open:

**Netlify team dashboard -> Usage & billing**

The current Free allowance is 300 credits per month. Current listed usage costs are:

| Usage | Credits |
| --- | ---: |
| One production deploy | 15 |
| 1 GB bandwidth | 20 |
| 10,000 web requests | 2 |
| 1 GB-hour compute | 10 |

Example usage is not a guarantee, but illustrates why deployment frequency matters:

| Example usage | Credits |
| --- | ---: |
| Four production deploys | 60 |
| 5 GB bandwidth | 100 |
| 100,000 requests | 20 |
| 10 GB-hours function compute | 100 |
| Total | 280 |

Use these operating rules:

1. Test locally before pushing to `main`; every production deployment consumes credits.
2. Check usage weekly during the first month.
3. Check usage daily after Play Store launch.
4. Investigate slow Google Sheets requests in function logs.
5. Consider upgrading before exhaustion if usage reaches 70-80% early in the month.
6. Treat Free as an initial validation plan, not a guaranteed permanent production budget.

## Rollback Plan

### Before New DNS

The existing Vercel deployment remains unaffected. No rollback is needed.

### After New Domain Activation

If `artami.web.id` fails acceptance:

1. Keep users on the existing `ultah.biz.id` Vercel deployment.
2. Leave the new domain on Netlify while correcting the configuration.
3. Do not move the old domain until the new domain passes.

### After Old-Domain Migration

If the redirect or Netlify runtime fails:

1. Reattach the old domain to Vercel if it was removed.
2. Restore the old domain's previous Vercel DNS configuration.
3. Wait for DNS propagation.
4. Keep the new domain isolated while fixing Netlify.
5. Do not delete the Vercel project during the rollback window.

No database rollback is required because Google Sheets and Supabase data are not migrated.

## Completion Criteria

The migration is complete when:

- `artami.web.id` is the canonical HTTPS URL.
- `www.artami.web.id` redirects to the apex domain.
- Google OAuth works on the new domain.
- Google Picker works on the new domain.
- `/api/health` reports all 11 variables.
- Google Sheets data remains isolated and writable.
- Supabase payment and admin flows pass.
- Both old-domain variants permanently redirect.
- Vercel receives no production traffic.
- Netlify usage monitoring is active.
- Repository and Play Store documentation identify `artami.web.id` as production.
