# Artoku Finance Dashboard — Commercialization Plan

**Date:** June 27, 2026
**Status:** Active — Ready for Execution

---

## Executive Summary

Artoku is a personal finance dashboard for Indonesian users built on Next.js + Google Sheets. It has a polished UI (bento grid, glassmorphism, smart insights), full CRUD for income/expense/savings, budgets, goals with celebrations, net worth tracking, events/milestones (Momental), bill reminders, and mobile-first UX.

**Recommendation:** One-time payment model (Rp 49,000 lifetime). Users own their data in Google Sheets. No subscription, no recurring charges. Manual QRIS payment verification for MVP.

---

## 1. Business Model

### 1.1 One-Time Payment (NOT SaaS)

| Factor | One-Time Payment | Why It Wins |
|--------|-----------------|-------------|
| **Indonesian market fit** | Strong — "bayar sekali, pakai selamanya" | Indonesians hate subscriptions ("langganan") |
| **User psychology** | Ownership feeling, no anxiety | No fear of forgetting to cancel |
| **Competitive advantage** | 76% cheaper than Wallet's lifetime (Rp 209K) | Unique positioning in market |
| **Simplicity** | No billing management, no churn tracking | Easier for solo developer |
| **Word of mouth** | "Sekali bayar doang!" is viral | Organic growth multiplier |

### 1.2 Pricing

| Tier | Price | What They Get |
|------|-------|---------------|
| **Free** | Rp 0 | 75 transactions/month, 4 months history, 3 budgets, 1 goal, 3 insights/week, basic features |
| **Pro** | Rp 49,000 one-time | Unlimited everything, smart features, lifetime access |

**Price anchoring:**
- Rp 49,000 = less than 1 Starbucks coffee
- Rp 49,000 = 1 month of Netflix (but this is lifetime)
- Rp 49,000 = 76% cheaper than Wallet's lifetime (Rp 209K)
- Rp 49,000 = 97% cheaper than YNAB annual (Rp 1.7M)

### 1.3 Revenue Projections

| Scenario | Users (Y1) | Conversion (5%) | Revenue (IDR) | Revenue (USD) |
|----------|-----------|-----------------|---------------|---------------|
| Conservative | 2,000 | 100 | Rp 4,900,000 | ~$300 |
| Moderate | 10,000 | 500 | Rp 24,500,000 | ~$1,500 |
| Aggressive | 50,000 | 2,500 | Rp 122,500,000 | ~$7,500 |

**Break-even:** ~7 paying users covers Supabase Pro ($25/mo) + Vercel Pro ($20/mo)

### 1.4 Payment Flow (Manual QRIS)

```
User hits free limit
       ↓
App shows "Upgrade ke Pro — Rp 49.000"
       ↓
User scans QRIS / transfers to bank
       ↓
User uploads screenshot of payment proof
       ↓
Admin receives notification
       ↓
Admin verifies in bank app
       ↓
Admin clicks "Approve" in /admin dashboard
       ↓
User.tier = 'paid' → Instant unlock
```

**Future:** Automate with Xendit/Midtrans when volume justifies integration effort.

---

## 2. Target Market

### 2.1 Primary Audience

| Segment | Demographics | Pain Points |
|---------|-------------|-------------|
| **Young Professionals** | Age 25-35, urban, Rp 5-15M/mo | "Where did my salary go?" |
| **Freelancers** | Age 25-40, irregular income | Variable cash flow tracking |
| **Students** | Age 18-24, allowance-based | First budgeting experience |
| **Young Families** | Age 30-45, dual income | Household budget coordination |

### 2.2 Market Size

- **Indonesia population:** 285M (2026)
- **Smartphone users:** ~200M
- **Digital finance app users:** ~60M
- **Personal finance app TAM:** ~15M users
- **SOM (obtainable Y1-Y3):** 5,000-50,000 users

### 2.3 Competitive Landscape

| Competitor | Model | Price | Indonesian | Data Ownership | Weakness |
|------------|-------|-------|------------|----------------|----------|
| **Wallet (BudgetBakers)** | Freemium | Rp 209K lifetime | Partial | ❌ | Expensive, generic |
| **Money Lover** | Freemium | $4.99/mo | Partial | ❌ | Subscription, Western |
| **Pengelola Keuangan** | Free + ads | Free | Yes | ❌ | Ad-heavy, dated UI |
| **Finku** | Freemium | Unknown | Yes | ❌ | Data collection concerns |
| **Artoku** | One-time | Rp 49K lifetime | Yes | ✅ | New, unproven |

### 2.4 Unique Selling Points

1. **Data lives in YOUR Google Sheets** — No lock-in, full export, transparent
2. **One-time payment** — "Bayar sekali, pakai selamanya"
3. **Indonesian-first** — Categories (Sedekah, Kondangan, Jajan, Arisan), banks (BCA, BRI, Mandiri, OVO, DANA)
4. **Modern UI** — Glassmorphism, bento grid, mobile-optimized
5. **Smart Features** — Health Score, Cash Flow Forecast, Anomaly Alerts
6. **Privacy-first** — No bank linking, no data selling
7. **No ads** — Clean, focused experience

---

## 3. Feature Split: Free vs Paid

### 3.1 Free Tier

| Feature | Limit |
|---------|-------|
| Transactions | 75/month (no lifetime limit) |
| History | 4 months |
| Budgets | 3 |
| Goals | 1 |
| Smart Insights | 3/week |
| Custom categories | ✅ Unlimited |
| All bank accounts | ✅ All |
| Net Worth card | ✅ |
| KPI tiles | ✅ |
| Recent transactions | ✅ |
| Pie charts (current month) | ✅ |
| Monthly trend chart | ✅ |
| Basic filters (year, month) | ✅ |
| KPI drill-down | ✅ |
| Month comparison | ✅ |
| Calendar heatmap | ✅ |
| PDF report | ✅ (watermarked) |
| Google Sheets sync | ✅ |
| Edit/Delete transactions | ✅ |

### 3.2 Paid Tier (Rp 49,000 lifetime)

| Feature | Why It's Pro |
|---------|-------------|
| Unlimited transactions | Primary wall — hits at 75/month |
| Full history (all time) | Data gravity — 4 months free, rest is Pro |
| Unlimited budgets | After 3 budgets, want more |
| Unlimited goals | After 1 goal, want more |
| Financial Health Score | No competitor has this — emotional hook |
| Cash Flow Forecast | "Kapan gaji habis?" — anxiety-driven upgrade |
| Anomaly Alerts | "Pengeluaran Makan naik 40%" — actionable insight |
| What-If Simulator | Premium planning tool — feels "smart" |
| Full Smart Insights (daily) | Unlimited vs 3/week |
| PDF report (no watermark) | Professional need |
| Account filter | Power user feature |
| Date range filter | Power user feature |
| Top 5 category trend lines | Historical analysis |

### 3.3 Conversion Psychology

```
WEEK 1-2: User builds habit (adds 50+ transactions)
    ↓
WEEK 3: User hits 75 limit → "Upgrade untuk unlimited"
    ↓
WEEK 3: User sees Health Score teaser → curiosity activated
    ↓
WEEK 4: User wants to set more budgets → hit 3 budget limit
    ↓
PAYMENT MOMENT: "Rp 49.000 — kurang dari 2 nasi goreng"
    ↓
INSTANT UNLOCK: Health Score + Cash Flow + Anomaly Alerts
    ↓
POST-PURCHASE: "Worth it!" → tells friends → word of mouth
```

---

## 4. Features Overview

### 4.1 Core Features (All Users)

| Feature | Description |
|---------|-------------|
| **Transaction Tracking** | Income/expense/savings with categories, accounts, notes |
| **Budgets** | Per-category monthly limits with progress bars |
| **Goals** | Savings targets with progress rings and celebrations |
| **Net Worth** | Accumulated wealth tracking |
| **Smart Insights** | Auto-generated spending patterns |
| **Charts** | Pie, bar, trend, category breakdown |
| **Filters** | Year, month, account, category |
| **Custom Categories** | Users can create their own categories |
| **Multi-Account** | BCA, Mandiri, GoPay, OVO, DANA, etc. |

### 4.2 New Features

| Feature | Description | Free/Paid |
|---------|-------------|-----------|
| **Momental** | Event/milestone planning (Ramadan, weddings, holidays) with sub-category budgets | 1 event free, unlimited Pro |
| **Bills** | Bill reminders with auto-transaction creation | 3 bills free, unlimited Pro |
| **Settings** | Starting balance, preferences | All users |
| **Health Score** | Financial health scoring with breakdown | Pro only |
| **Cash Flow Forecast** | 3-month income/expense projection | Pro only |
| **Anomaly Alerts** | Spending spike detection | Pro only |
| **What-If Simulator** | Scenario planning | Pro only |

### 4.3 Google Sheets Structure

| Tab | Purpose | Columns |
|-----|---------|---------|
| Pemasukan | Income transactions | A-M |
| Pengeluaran | Expense transactions | A-M |
| Tabungan | Savings transactions | A-M |
| Budgets | Monthly budget limits | A-F |
| Goals | Savings targets | A-H |
| Utang | Debts | A-I |
| Momental | Events/milestones | A-K |
| EventBudgets | Event sub-categories | A-F |
| Tagihan | Bill reminders | A-M |
| Settings | User preferences | A-B |

---

## 5. Go-to-Market Strategy

### 5.1 Launch Phases

| Phase | Timeline | Goal | Actions |
|-------|----------|------|---------|
| **Beta** | Weeks 1-4 | 500 users, feedback | Invite-only via finance communities |
| **Public Launch** | Weeks 5-8 | 2,000 users | Social media push, landing page live |
| **Growth** | Months 3-6 | 10,000 users | Content marketing, influencer partnerships |
| **Scale** | Months 6-12 | 50,000 users | Paid ads, Android app |

### 5.2 Marketing Channels

**Primary (Organic):**
- **TikTok** — #FinTokIndonesia, short finance tips, relatable skits
- **Instagram Reels** — Visual demos, before/after screenshots
- **YouTube Shorts** — Tutorials, "cara pakai" content
- **X (Twitter)** — Tech-savvy early adopters, product launches

**Secondary:**
- **WhatsApp** — Referral links, community groups
- **Reddit r/indonesia** — Finance community
- **Kaskus** — Finance forums
- **Blog/SEO** — "Aplikasi keuangan tanpa langganan"

**Paid (post-traction):**
- **Instagram/Facebook ads** — Target: 25-40, urban
- **Google Ads** — "aplikasi keuangan pribadi"

### 5.3 Key Messages (Bahasa Indonesia)

1. "Bayar sekali, pakai selamanya" — Anti-subscription
2. "Data milik kamu, bukan milik aplikasi" — Data ownership
3. "Bukan aplikasi barat yang diterjemahkan" — Indonesian-first
4. "Rp 49.000 = kurang dari 2 kopi Starbucks" — Price anchoring
5. "Tanpa iklan, tanpa data dijual" — Privacy/trust
6. "Kategori Indonesia: Sedekah, Kondangan, Jajan" — Cultural relevance

### 5.4 Seasonal Campaigns

| Season | Timing | Message |
|--------|--------|---------|
| **Ramadan/Eid** | Mar-Apr | "Siapkan keuangan Lebaran" |
| **Tax Season** | Jan-Apr | "Laporan pajak dalam 1 klik" |
| **New Year** | Jan | "Resolusi keuangan 2027" |
| **Back to School** | Jul | "Budget sekolah anak" |
| **Harbolnas** | Dec | "Cek budget sebelum belanja" |

---

## 6. Legal & Compliance

### 6.1 Indonesian PDP Law (UU PDP)

| Requirement | Action |
|-------------|--------|
| Lawful basis | User consent via Google OAuth |
| Data minimization | Only collect what's needed (no bank linking) |
| Purpose limitation | Dashboard display only |
| Data subject rights | Implement account deletion |
| Cross-border transfer | Disclose Google Sheets = US servers |
| PSE Registration | Register at pse.kominfo.go.id |

### 6.2 Business Registration

| Requirement | Details |
|-------------|---------|
| Business entity | CV or PT (PT recommended) |
| NIB | Register via OSS |
| Domain | .id domain for SEO + trust |
| PSE Registration | Kominfo (mandatory) |
| Trademark | Register "Artoku" at DJKI |

### 6.3 Required Documents

1. **Terms of Service** (Syarat & Ketentuan) — Bahasa Indonesia
2. **Privacy Policy** (Kebijakan Privasi) — PDP compliant
3. **Cookie Consent** — NextAuth session = strictly necessary

---

## 7. Technical Architecture

### 7.1 Current Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Auth | NextAuth v4 + Google OAuth |
| Database | Google Sheets (user-owned) |
| Metadata | Supabase (users, payments, usage) |
| Hosting | Vercel |
| Charts | Recharts |

### 7.2 Infrastructure Costs

| Item | Free Tier | Paid Tier |
|------|-----------|-----------|
| Vercel | $0 (free) | $20/mo (Pro) |
| Supabase | $0 (free) | $25/mo (Pro) |
| Domain | ~$10/yr | ~$10/yr |
| **Total** | **~$0** | **~$55/mo** |

### 7.3 Security (Phase 0 — Done)

- ✅ Security headers (X-Frame-Options, HSTS, etc.)
- ✅ Token not exposed to client
- ✅ Input validation on all mutations
- ✅ Generic error messages
- ✅ Tab whitelist for Sheets injection prevention

### 7.4 Multi-Tenancy (Phase 1 — Planned)

- Each user gets their own Google Sheet
- Supabase stores user metadata + spreadsheet_id
- All API routes use per-user spreadsheetId
- RLS policies enforce data isolation

---

## 8. Risk Analysis

### 8.1 Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Google Sheets API rate limits | High | Cache dashboard data, batch reads |
| Google API deprecation | Medium | Abstract Sheets layer, migration path ready |
| Vercel free tier limits | Medium | Upgrade to Pro when needed |
| OAuth token compromise | High | Token server-side only (Phase 0 done) |

### 8.2 Business Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Low conversion (<2%) | High | Improve free-to-paid funnel, A/B test |
| Competitor copies features | Medium | Move fast, build community moat |
| Manual payment doesn't scale | Medium | Automate with Xendit when volume justifies |
| Single developer bus factor | High | Document everything, automate tests |

---

## 9. Implementation Roadmap

### Phase 0: Security Fixes ✅ DONE
- [x] Security headers in next.config.js
- [x] Token not exposed to client session
- [x] Input validation on transactions
- [x] Generic error messages
- [x] Tab whitelist

### Phase 1: Supabase + Multi-Tenancy (Next)
- [ ] Set up Supabase project
- [ ] Create database schema (users, payments, usage, feature_flags, admins)
- [ ] Create Supabase client helpers
- [ ] Create sheet manager (all 10 tabs)
- [ ] Create user helper + auth context
- [ ] Update all 15 API routes for multi-tenancy
- [ ] Add drive.file OAuth scope
- [ ] Publish OAuth to production
- [ ] Create migration script

### Phase 2: Payments + Admin
- [ ] Create payment API (upload proof)
- [ ] Create admin API (approve/reject)
- [ ] Create admin dashboard page
- [ ] Set up Supabase Storage for proofs
- [ ] Seed admin user

### Phase 3: Feature Gating
- [ ] Create feature gate helper
- [ ] Gate transactions (75/month)
- [ ] Gate budgets (3 max)
- [ ] Gate goals (1 max)
- [ ] Gate insights (3/week)
- [ ] Gate smart features (Pro only)
- [ ] Gate momental (1 free)
- [ ] Gate bills (3 free)
- [ ] Create /api/me endpoint

### Phase 4: Polish + Hardening
- [ ] Add rate limiting
- [ ] Add input validation (all routes)
- [ ] Add health check endpoint
- [ ] Add feature flags
- [ ] Add environment validation
- [ ] Remove unused googleapis package

### Phase 5: Testing + Verification
- [ ] API route tests
- [ ] Data isolation tests
- [ ] Rate limiting tests
- [ ] Validation tests
- [ ] Security headers tests
- [ ] Manual verification checklist

---

## 10. Key Metrics

| Metric | Target (Y1) |
|--------|-------------|
| Monthly Active Users | 10,000 |
| Free-to-Paid conversion | 3-5% |
| User Acquisition Cost | <Rp 10,000 |
| NPS | >40 |
| App uptime | 99.5% |

---

## 11. Decision Log

| Decision | Choice | Date |
|----------|--------|------|
| Business model | One-time payment (NOT SaaS) | June 2026 |
| Price | Rp 49,000 lifetime | June 2026 |
| Free tier | 75 txn/month, 4 months, 3 budgets, 1 goal | June 2026 |
| Payment | Manual QRIS → admin approves | June 2026 |
| Trial | No trial | June 2026 |
| Database | Google Sheets (user-owned) + Supabase (metadata) | June 2026 |
| Market | Indonesia only | June 2026 |
| Mobile | Web-first, React Native later | June 2026 |
| Custom categories | Free for all users | June 2026 |
| PDF reports | Free (watermarked), Pro (no watermark) | June 2026 |
| Month comparison | Free | June 2026 |
| Calendar heatmap | Free | June 2026 |

---

*This plan is a living document. Update as market conditions, user feedback, and technical constraints evolve.*
