# Artoku Finance Dashboard — Commercialization Plan

**Date:** June 21, 2026
**Status:** Draft — Ready for Review

---

## Executive Summary

Artoku is a personal finance dashboard for Indonesian users built on Next.js + Google Sheets. It has a polished UI (bento grid, glassmorphism, smart insights), full CRUD for income/expense/savings, budgets, goals with celebrations, net worth tracking, and mobile-first UX. This document analyzes how to commercialize it as a SaaS product.

**Recommendation:** Freemium SaaS model with monthly/yearly subscription. Google Sheets stays as the free-tier "database" for user trust and data ownership; paid tiers unlock enhanced features.

---

## 1. Business Model Analysis

### 1.1 SaaS vs One-Time Payment

| Factor | SaaS (Subscription) | One-Time Payment |
|---|---|---|
| **Revenue predictability** | High — recurring MRR | Low — depends on new sales |
| **Indonesian market fit** | Growing — Gojek, Tokopedia normalized subscriptions | Traditional preference — users resist ongoing costs |
| **User data ownership** | Users keep Sheets (strong trust signal) | Same |
| **Update incentive** | Continuous value delivery justifies cost | Need new versions to drive re-purchases |
| **Churn risk** | Medium — must continuously prove value | Low after purchase, but low LTV |
| **Infrastructure cost** | Ongoing (hosting, auth, support) | One-time, then minimal |
| **Competitor alignment** | Matches Wallet, Money Lover, Finansialku | Uncommon for modern fintech apps |

**Verdict: SaaS (Freemium)** — The Indonesian market is increasingly subscription-literate. A freemium model lowers the barrier to entry while creating upgrade paths.

### 1.2 Pricing Strategy

**Three tiers:**

| Tier | Price (IDR/mo) | Price (USD/mo) | Target |
|---|---|---|---|
| **Gratis** | Free | Free | Students, casual trackers |
| **Pro** | Rp 49,000 | ~$3.00 | Serious budgeters, freelancers |
| **Premium** | Rp 99,000 | ~$6.00 | Families, power users, financial planners |

**Yearly discount:** 2 months free (Rp 490,000/yr for Pro, Rp 990,000/yr for Premium)

**Price rationale:**
- Rp 49,000 ≈ cost of 2 meals in Jakarta — low psychological barrier
- Competitors: Finansialku Rp 50,000/mo, Wallet by BudgetBakers $5.99/mo
- Google Sheets as backend = near-zero per-user infra cost → high margin

### 1.3 Revenue Projections

| Scenario | Users (Y1) | Conversion (5%) | MRR (IDR) | ARR (IDR) | ARR (USD) |
|---|---|---|---|---|---|
| Conservative | 2,000 | 100 | 7,400,000 | 88,800,000 | ~$5,400 |
| Moderate | 10,000 | 500 | 37,000,000 | 444,000,000 | ~$27,000 |
| Aggressive | 50,000 | 2,500 | 185,000,000 | 2,220,000,000 | ~$135,000 |

*Assumes 70% Pro, 30% Premium split. Conversion rate benchmarked at 3–7% for freemium fintech.*

### 1.4 Why SaaS Wins Here

1. **Google Sheets backend** = marginal cost per user is near-zero → recurring revenue with minimal COGS
2. **Continuous feature delivery** (budgets, goals, insights) justifies ongoing subscription
3. **Indonesian digital economy** is subscription-ready (Spotify, Netflix, Canva all growing)
4. **Data ownership** differentiator — users' data stays in their Google account

---

## 2. Target Market Analysis

### 2.1 Ideal Customer Profiles

| Segment | Demographics | Pain Points | Willingness to Pay |
|---|---|---|---|
| **Young Professionals** | Age 22–35, urban, IDR 5–15M/mo income | "Where did my salary go?" | Medium (Rp 49K is trivial) |
| **Freelancers/Gig Workers** | Age 25–40, irregular income | Variable cash flow tracking | High (need for tax prep) |
| **Small Business Owners** | Age 28–45, micro/SME | Separate personal vs business | High |
| **Students** | Age 18–24, allowance-based | First budgeting experience | Low (free tier capture) |
| **Families** | Age 30–50, dual income | Household budget coordination | Medium-High |

### 2.2 Market Size

- **Indonesia population:** 278M (2026)
- **Smartphone users:** ~200M
- **Digital finance app users:** ~60M (OJK data, 2025)
- **Personal finance app TAM:** ~15M users (active budgeters)
- **SAM (reachable):** ~3M (Google Sheets users + urban professionals)
- **SOM (obtainable Y1–Y3):** 5,000–50,000 users

### 2.3 Competitive Landscape

| Competitor | Model | Price | Sheets Integration | Indonesian | Weakness |
|---|---|---|---|---|---|
| **Wallet by BudgetBakers** | Freemium | $5.99/mo | No | Partial (IDR) | No data ownership, generic |
| **Finansialku** | Freemium | Rp 50,000/mo | No | Yes | Cluttered UI, advisor-centric |
| **Money Lover** | Freemium | $4.99/mo | No | Partial | Overwhelming features |
| **YNAB** | Subscription | $14.99/mo | No | No (USD-centric) | Expensive, US-focused |
| **Catatan Keuangan** (apps) | Free/Ads | Ad-supported | No | Yes | Basic, no insights |
| **Spreadsheet (manual)** | Free | Free | — | Yes | No automation, no insights |

### 2.4 Unique Selling Propositions

1. **Data lives in YOUR Google Sheets** — No lock-in, full export, transparent
2. **Indonesian-first** — Categories (Sedekah, Kondangan, Jajan), banks (BCA, BRI, Mandiri, OVO, DANA), Bahasa UI
3. **Smart Insights** — Auto-generated spending patterns, anomaly detection, tips
4. **Goal Celebrations** — Gamified savings with confetti + haptics on milestones
5. **Net Worth Tracking** — Holistic view beyond just expenses
6. **Mobile-first PWA** — Pull-to-refresh, haptics, bottom sheets, native feel
7. **Privacy-first** — No bank account linking required, no third-party data sharing

---

## 3. Go-to-Market Strategy

### 3.1 Launch Phases

| Phase | Timeline | Goal | Actions |
|---|---|---|---|
| **Beta** | Weeks 1–4 | 500 users, feedback | Invite-only via Indonesian finance communities, free for all beta users |
| **Public Launch** | Weeks 5–8 | 2,000 users | Product Hunt (Indonesia), social media push, freemium goes live |
| **Growth** | Months 3–6 | 10,000 users | Content marketing, influencer partnerships, referral program |
| **Scale** | Months 6–12 | 50,000 users | Paid ads, enterprise/team features, Android app |

### 3.2 Marketing Channels (Indonesian Market)

**Primary:**
- **Twitter/X Indonesian fintech community** (#Finansial, #InvestingID)
- **Instagram Reels/TikTok** — Short finance tips using app screenshots
- **YouTube** — "Cara budget gaji Rp 5 juta" tutorials featuring the app
- **Reddit r/indonesia** and **Kaskus** finance forums

**Secondary:**
- **Product Hunt Indonesia** community
- **Telegram groups** — Indonesian personal finance communities
- **Blog/SEO** — "Aplikasi keuangan terbaik 2026", "cara budget Google Sheets"
- **WhatsApp broadcast** — Beta user referral chains

**Paid (post-traction):**
- **Instagram/Facebook ads** — Target: 22–40, urban, interests in finance/investing
- **Google Ads** — "aplikasi keuangan pribadi", "catatan keuangan harian"

### 3.3 Customer Acquisition Strategy

1. **Free tier is genuinely useful** — Full transaction tracking, basic charts, 3 months history
2. **Referral program** — Give 1 month Pro free for each referral who subscribes
3. **Content marketing** — Indonesian-language finance tips with app as the tool
4. **Community building** — Telegram/Discord for power users, feature requests
5. **Influencer partnerships** — Indonesian finance YouTubers (e.g., Achmad Zaky, Prita Ghozie tier)

### 3.4 Retention & Growth Tactics

- **Weekly email digest** — "Minggu ini kamu hemat Rp 200K dari minggu lalu"
- **Monthly report PDF** — Exportable, shareable (social proof)
- **Streak mechanics** — "Kamu sudah catat 30 hari berturut-turut!"
- **Goal celebrations** — Already built, drives emotional engagement
- **Seasonal challenges** — "Tantangan 30 hari tanpa jajan" with community leaderboard
- **Push notifications** — Bill reminders, budget warnings, goal milestones

---

## 4. Legal & Compliance

### 4.1 Indonesian PDP Law (UU PDP — UU No. 27/2022)

**Effective since October 2024. Requirements:**

| Requirement | Action Needed |
|---|---|
| **Lawful basis for processing** | User consent (explicit opt-in at registration) |
| **Data minimization** | Only collect what's needed (already good — no bank linking) |
| **Purpose limitation** | Clear ToS on data use (dashboard display only) |
| **Data subject rights** | Implement: access, correction, deletion, portability |
| **Data breach notification** | Must notify users + Kominfo within 72 hours of breach |
| **Cross-border transfer** | Google Sheets data = Google's servers (US). Disclose in privacy policy |
| **DPO appointment** | Required if processing >50,000 users' data |
| **Registration with Kominfo** | Register as PSE (Penyelenggara Sistem Elektronik) at pse.kominfo.go.id |

### 4.2 Financial Data Regulations

- **OJK (Otoritas Jasa Keuangan):** This app is NOT a financial product — it's a personal record-keeping tool. No OJK license needed.
- **No bank integration** = No PJK (Penyelenggara Jasa Keuangan) classification
- **No investment advice** = No financial advisor license required
- **Tax implications:** If charging subscriptions, must register as PKP (Pengusaha Kena Pajak) if revenue > Rp 4.8B/year. Below that, use PPH Final UMKM (0.5% of revenue).

### 4.3 Required Legal Documents

1. **Terms of Service** (Syarat & Ketentuan)
   - Service description, acceptable use, liability limitations
   - Google Sheets API usage subject to Google's ToS
   - Refund policy (pro-rata for annual subscriptions)

2. **Privacy Policy** (Kebijakan Privasi)
   - PDP Law compliant (Bahasa Indonesia)
   - Data collected: name, email (from Google OAuth), financial data entered by user
   - Data storage: Google Sheets (user's account), Vercel (server logs)
   - Third-party sharing: none (strong selling point)
   - Cookie policy for NextAuth session

3. **Cookie Consent Banner**
   - Required under PDP Law
   - NextAuth session cookie = strictly necessary (no consent needed)
   - Analytics cookies = consent required

### 4.4 Business Registration

| Requirement | Details |
|---|---|
| **Business entity** | PT (Perseroan Terbatas) or CV — PT recommended for SaaS |
| **NIB (Nomor Induk Berusaha)** | Register via OSS (Online Single Submission) |
| **Domain** | .id domain recommended for SEO + trust |
| **PSE Registration** | Kominfo PSE registration (mandatory for web services) |
| **Trademark** | Register "Artoku" at DJKI (Direktorat Jenderal Kekayaan Intelektual) |

---

## 5. Technical Requirements for Commercial Launch

### 5.1 Infrastructure

| Component | Current | Commercial Need |
|---|---|---|
| **Hosting** | Vercel (free/hobby) | Vercel Pro ($20/mo) — custom domain, analytics, team |
| **Auth** | NextAuth + Google OAuth | Same — add rate limiting, brute-force protection |
| **Database** | Google Sheets | Acceptable for free tier. Paid tiers: consider Supabase/PlanetScale for speed |
| **CDN** | Vercel Edge | Sufficient |
| **Monitoring** | None | Add Sentry (error tracking), Plausible/Umami (analytics) |
| **Email** | None | Resend or Postmark for transactional emails (welcome, receipts, digests) |

### 5.2 Security Hardening (Priority Order)

| # | Requirement | Current State | Action |
|---|---|---|---|
| 1 | **Rate limiting** | None | Add Upstash Redis rate limiter on all API routes (100 req/min/user) |
| 2 | **Input validation** | Basic | Add Zod schemas for all API inputs |
| 3 | **CSRF protection** | NextAuth handles | Verify SameSite cookies, add CSRF tokens for mutations |
| 4 | **Content Security Policy** | Missing | Add CSP headers in `next.config.js` |
| 5 | **Dependency audit** | Manual | Add `npm audit` to CI, Dependabot alerts |
| 6 | **Secrets management** | .env.local | Move to Vercel Environment Variables (encrypted) |
| 7 | **Google API scoping** | Full Sheets access | Scope to specific spreadsheet only (limit blast radius) |
| 8 | **Logging & audit trail** | None | Add structured logging (pino) for all mutations |

### 5.3 Performance & Scalability

**Current architecture handles ~1,000 concurrent users on Vercel free tier.**

| Bottleneck | Mitigation |
|---|---|
| Google Sheets API rate limit (300 req/min) | Cache dashboard data in Vercel KV/Redis (5-min TTL) |
| Cold start on serverless | Use Vercel Edge Functions for read routes |
| Bundle size (143 KB dashboard) | Already optimized. Monitor with `@next/bundle-analyzer` |
| No offline support | Add service worker for PWA offline mode (read cached data) |

### 5.4 Support & Maintenance

- **Help center** — Notion-based FAQ (low cost, easy to maintain)
- **In-app feedback** — "Report a bug" button → GitHub Issues or Canny
- **Email support** — support@artoku.id (use Freshdesk free tier)
- **Status page** — Vercel status + Instatus free tier
- **Maintenance window** — Communicate via in-app banner + email

---

## 6. Monetization Features

### 6.1 Free vs Paid Split

| Feature | Gratis | Pro (Rp 49K) | Premium (Rp 99K) |
|---|---|---|---|
| Transaction tracking | ✅ Unlimited | ✅ | ✅ |
| Categories & banks | ✅ All | ✅ | ✅ |
| Basic charts (pie, bar) | ✅ | ✅ | ✅ |
| Net worth card | ✅ | ✅ | ✅ |
| History | 3 months | ✅ All time | ✅ All time |
| Budgets | 3 categories | ✅ Unlimited | ✅ Unlimited |
| Goals | 1 goal | ✅ 10 goals | ✅ Unlimited |
| Smart Insights | ❌ | ✅ | ✅ |
| Trend & comparison charts | ❌ | ✅ | ✅ |
| Monthly report PDF | ❌ | ✅ | ✅ |
| Cash flow forecast | ❌ | ✅ | ✅ |
| Multi-sheet support | ❌ | ❌ | ✅ (family/business) |
| Export to CSV/Excel | ❌ | ✅ | ✅ |
| Priority support | ❌ | ❌ | ✅ |
| Custom categories | ❌ | ❌ | ✅ |
| Recurring transactions | ❌ | ❌ | ✅ |
| Ad-free | ✅ | ✅ | ✅ |

### 6.2 Payment Gateway Integration

| Gateway | Fee | Settlement | Best For |
|---|---|---|---|
| **Midtrans** | 2.9% + Rp 2,000 | T+2 | Card + e-wallet (GoPay, OVO, DANA, ShopeePay) |
| **Xendit** | 2.9% + Rp 2,000 | T+1 | Virtual accounts (BCA, BRI, Mandiri) |
| **Tripay** | 0.7–1.5% | T+1 | Low-cost option, QRIS support |

**Recommendation: Xendit** — Best Indonesian coverage, good API docs, supports recurring billing, virtual accounts for unbanked users, QRIS.

### 6.3 Freemium Mechanics

- **Trial:** 14-day free Pro trial on signup (no credit card required)
- **Trial conversion hook:** Day 12 email — "Your Smart Insights data will disappear in 2 days"
- **Grace period:** 7-day read-only after subscription expires (can view, can't add)
- **Annual upsell:** Show "Save Rp 198,000" banner on monthly subscribers
- **Reactivation:** 50% off first month for churned users (30-day post-churn email)

### 6.4 Upsell Opportunities

1. **Family plan** — Rp 149,000/mo for 5 members, shared budget view
2. **Business tier** — Rp 249,000/mo, multi-sheet, expense approval flow
3. **Financial coaching add-on** — Rp 99,000/mo, 1 video call/month with certified planner
4. **Premium themes** — Rp 29,000 one-time (dark mode variants, custom colors)
5. **API access** — Rp 199,000/mo for developers who want to build on the platform

---

## 7. Risk Analysis

### 7.1 Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| **Google Sheets API rate limits** at scale | High | Medium | Implement Redis caching layer, batch reads, optimistic UI |
| **Google API deprecation** or ToS change | High | Low | Abstract Sheets layer (`src/lib/sheets.js`), keep migration path to Supabase |
| **Vercel free tier limits** (100GB bandwidth) | Medium | Medium | Upgrade to Pro ($20/mo) when approaching 50% |
| **NextAuth security vulnerability** | High | Low | Pin versions, subscribe to security advisories, have fallback auth |
| **Google OAuth scope too broad** | Medium | Medium | Scope down to single spreadsheet permission |
| **No automated backups** | High | Medium | Implement weekly Sheets export to Google Drive |

### 7.2 Business Risks

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| **Low conversion rate** (<2%) | High | Medium | Improve free-to-paid funnel, A/B test pricing, add more Pro-only features |
| **Competitor launches similar Sheets-based app** | Medium | Low | Move fast, build community moat, add unique features (insights, celebrations) |
| **Google Sheets becomes paid** | High | Low | Have Supabase migration plan ready, abstract data layer |
| **Indonesian market price sensitivity** | Medium | Medium | Keep free tier generous, offer yearly discount, virtual account payments |
| **Regulatory changes** (PDP enforcement) | Medium | Medium | Stay compliant, legal counsel on retainer |
| **Single developer bus factor** | High | Medium | Document everything, automate tests, consider co-founder/hire |

### 7.3 Mitigation Priority Matrix

```
URGENT + IMPORTANT:
├── Rate limiting on API routes (Week 1)
├── PDP Law compliance + PSE registration (Week 2)
├── Redis caching for Sheets API (Week 3)
└── Security headers + CSP (Week 1)

IMPORTANT + NOT URGENT:
├── Supabase migration path (Month 2)
├── Automated backups (Month 2)
├── Legal documents (ToS, Privacy Policy) (Month 1)
└── Business registration (PT) (Month 2)

NICE TO HAVE:
├── Dark mode themes (revenue opportunity)
├── Multi-language support (expansion)
├── API access tier (developer market)
└── Financial coaching partnerships
```

---

## 8. Implementation Roadmap

### Phase 0: Pre-Launch (Weeks 1–4)
- [ ] Security hardening (rate limiting, CSP, input validation)
- [ ] Legal documents (ToS, Privacy Policy in Bahasa Indonesia)
- [ ] PSE registration with Kominfo
- [ ] Set up Xendit account + test payment flow
- [ ] Add subscription state management (user table in Supabase or Firebase)
- [ ] Implement feature gating (free vs Pro vs Premium)
- [ ] Set up Sentry + analytics (Plausible/Umami)
- [ ] Create landing page (artoku.id)
- [ ] Beta invite system

### Phase 1: Beta Launch (Weeks 5–8)
- [ ] Invite 500 users from finance communities
- [ ] Collect feedback (in-app survey + Telegram group)
- [ ] Iterate on pricing, features, UX
- [ ] Set up email transactional system (Resend)
- [ ] Implement 14-day trial flow

### Phase 2: Public Launch (Weeks 9–12)
- [ ] Product Hunt launch
- [ ] Social media campaign
- [ ] Influencer outreach
- [ ] Enable paid subscriptions
- [ ] Referral program launch

### Phase 3: Growth (Months 4–6)
- [ ] Content marketing (blog, YouTube)
- [ ] Android app (Phase 2 from roadmap)
- [ ] Family plan
- [ ] Monthly report PDF
- [ ] Community building (Telegram/Discord)

### Phase 4: Scale (Months 7–12)
- [ ] Paid advertising (Instagram, Google)
- [ ] Business tier
- [ ] API access
- [ ] Evaluate Supabase migration for paid tiers
- [ ] Hire first support agent

---

## 9. Key Metrics to Track

| Metric | Target (Y1) | Tool |
|---|---|---|
| Monthly Active Users (MAU) | 10,000 | Plausible/Umami |
| Free-to-Pro conversion | 5% | Custom dashboard |
| Monthly churn rate | <5% | Custom dashboard |
| Net Promoter Score (NPS) | >40 | In-app survey |
| Customer Acquisition Cost (CAC) | <Rp 50,000 | Marketing analytics |
| Lifetime Value (LTV) | >Rp 500,000 | Revenue tracking |
| LTV:CAC ratio | >10:1 | Derived |
| API uptime | 99.5% | Vercel + Instatus |

---

## 10. Decision Summary

| Decision | Recommendation |
|---|---|
| Business model | Freemium SaaS |
| Price point | Rp 49K / 99K per month |
| Payment gateway | Xendit |
| Hosting | Vercel Pro |
| Data backend | Google Sheets (free tier), Supabase (paid tier, future) |
| Legal entity | PT (Perseroan Terbatas) |
| Launch strategy | Beta → Public → Growth → Scale |
| Android app | Phase 2 (after web traction) |
| Primary differentiator | Data ownership (Google Sheets) + Indonesian-first UX |

---

*This plan is a living document. Update as market conditions, user feedback, and technical constraints evolve.*
