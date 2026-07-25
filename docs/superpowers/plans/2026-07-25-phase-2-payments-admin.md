# Phase 2 Payments + Admin Implementation Plan

**Goal:** Ship the approved QRIS-only lifetime-Pro payment flow, private proof storage, and manual admin verification.

**Architecture:** Keep payment state in Supabase and financial data in each user's Google Sheet. All payment mutations use server-side Next.js routes with NextAuth identity and the Supabase service role. Store only private Storage object paths; issue short-lived signed URLs on explicit proof requests.

**Tech:** Next.js App Router, React, JavaScript, Supabase Postgres/Storage, Vitest.

## Tasks

1. Add a forward-only Supabase migration for the complete payment lifecycle, audit fields, one-active-payment constraint, private proof bucket, admin seed, and account-restoration fields.
2. Add tested payment-domain helpers for references, expiry/grace rules, validation, WhatsApp messages, and safe public serialization.
3. Add authenticated user APIs for listing/creating/cancelling payments, uploading proof idempotently, and opening an owned proof through a five-minute signed URL.
4. Add admin authorization and APIs for paginated review/history, approve/reject/revoke/correct actions, Pro restoration, and signed proof access.
5. Add `/upgrade` with the fixed Rp40.000 QRIS checkout, countdown, save/copy actions, proof form, active-state handling, support links, and payment history.
6. Add `/admin` with pending review, search/history pagination, accessible confirmations, manual refresh, and 30-second polling.
7. Add persistent dismissible payment-status banners to `/dashboard` and `/upgrade`; update account deletion behavior to retain email/payment audit while removing profile and proof data.
8. Copy the approved merchant QRIS into the app, update Phase 2 documentation/progress, run focused tests and a production build, then perform a security review.

