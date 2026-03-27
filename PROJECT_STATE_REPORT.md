# Platform State Report — 2026-03-26

## Executive Summary

27 commits since last report (2026-03-22). Major work: quote system overhaul, RingCentral SMS migration, Stripe Terminal fix, delivery confirmation system, Playwright testing, receipt formatting. TypeScript compiles clean. 27/29 Playwright tests passing. Both staging and production containers running. VPS disk at 21%.

---

## 1. Git History (27 commits since 2026-03-22)

```
e3ef800 Fix terminal card reader: was treating initial status as declined
41a7e78 Features: delivery confirmation, QR codes, paylink SMS, CI tests, cron jobs
7bbac71 Fix test assertions: SMS from-number flexible, time window date-gated
05d0a24 Receipt fixes: bulk items say "cu yds of", full delivery info, day-of-week dates
1bcfb0e Phone order: switch from PaymentElement to CardElement (card-only, no Link)
5beb05e Fix phone order payment hang: card-only PI + timeout + cancel button
9f586cb Time windows: Morning 7-10, Midday 10-1, Afternoon 1-5; POS delivery validation
19c3f61 Fix: refund button visible on all transactions, phone order creates order
4d7ad98 SMS: try main line via ext 102, fallback; delivery ticket ZIP code
5dcefd9 Playwright tests for POS fixes + fix checkout bulk unit to cu. yard
d110814 POS + receipt fixes: phone auto-fill, dates, units, print sequence, tickets
b8593d2 Fix: use SMS-enabled RingCentral number
6072784 Add SMS health endpoint + RingCentral E2E tests
ae2704c Replace all inline Twilio SMS with unified sendSms
d65dadf POS: sign out, remove lead form, add refund, fix order history
fae9589 Header: increase logo size 20% on desktop
48b26bb Fix: include package-lock.json for Playwright dependency
7e189f5 Set up Playwright E2E testing with 4 test suites
5c26094 Fix: delivery time window flows end-to-end for web orders
548edf2 Dates show day of week, time window displayed, POS detail + print fixed
1338044 Fix admin order detail: show items, delivery, totals, print receipts
74dc3ca Quote confirmation email template
30ac3fd Fix: allow payment intent creation for accepted quotes
4821507 Quote page: replace emojis with Lucide icons
45eefdc Quote page: always show customer info
adf78ad Promo popup: only show on homepage
fcf9de4 Quote: print header, delivery/pickup on admin, SMS verification
```

---

## 2. Build & Code Quality

| Check | Status |
|-------|--------|
| TypeScript (`tsc --noEmit`) | PASS — zero errors |
| Playwright tests | 27 passed, 2 skipped (admin auth) |
| Stray console.logs | 1 (checkout confirm — benign) |
| TODO/FIXME markers | 0 |

---

## 3. System Status

### Public Website
| Page | Status |
|------|--------|
| `/` (Homepage) | WORKING |
| `/shop` | WORKING |
| `/cart` | WORKING — time window persists, address restores on refresh |
| `/checkout` | WORKING — time window flows through to order |
| `/services` | WORKING |
| `/calculator` | WORKING |
| `/delivery/[town]` | WORKING |
| `/contact` | WORKING |
| `/quote/[token]` | WORKING — navy/amber theme, SMS verify, embedded Stripe |
| `/delivery/confirm/[orderId]` | NEW — driver confirmation with camera |

### Quote System
| Component | Status |
|-----------|--------|
| `/api/quotes/quick` | WORKING — cart source bypass, delivery notes, tax on delivery |
| `/quote/[token]` page | WORKING — full redesign, SMS verify, accept + pay |
| `/api/quote/[token]/confirm-card` | WORKING — creates order from quote |
| `/api/quote/[token]/confirm-cod` | WORKING — all delivery details passed |
| `/api/quote/[token]/verify-sms` | WORKING — 6-digit code, 10min expiry |
| Quote confirmation email | WORKING — full template with all details |
| Admin quote detail | WORKING — delivery/pickup toggle, save |

### POS System
| Component | Status |
|-----------|--------|
| Product grid | WORKING |
| Cart panel | WORKING — delivery validation |
| Card terminal (S710) | FIXED — proper 2-min polling, cancel button |
| Phone order (card entry) | FIXED — CardElement, no Link, creates order |
| Phone order paylink SMS | NEW — sends quote link via SMS |
| Receipt printing | FIXED — cu yds, full delivery, day-of-week |
| Delivery ticket printing | FIXED — QR code, ZIP, no checkboxes |
| Refund modal | WORKING — all payment types |
| Customer order history | FIXED — queries both tables |
| Transactions tab | WORKING — refund button on all orders |

### Admin Dashboard
| Page | Status |
|------|--------|
| `/admin/operations` | WORKING — items, delivery, totals, print buttons |
| `/admin/customers` | WORKING |
| `/admin/quotes` | WORKING — delivery/pickup editor |
| `/admin/leads` | WORKING |
| `/admin/products` | WORKING — validation errors shown |

### SMS Provider
| Component | Status |
|-----------|--------|
| RingCentral (primary) | CONFIGURED — JWT auth, token caching |
| Twilio (fallback) | CONFIGURED — auto-fallback |
| From number | +16318746244 (falls back to +13153625323) |
| Health endpoint | `/api/health/sms` — reports provider status |

---

## 4. Database State

### Row Counts
| Table | Count |
|-------|-------|
| customers | 2,684 |
| orders | 75 |
| order_items | 148 |
| quotes | 47 |
| service_leads | 10 |
| products | 322 |
| delivery_assignments | 3 |
| follow_ups | 208 |
| held_orders | 0 |
| contractors | 1 |

### Schema Changes (since 2026-03-22)
**`orders` — new columns:**
- `delivery_date` (text)
- `delivery_time_window` (text)
- `delivery_notes` (text)
- `source` (text, default 'web')
- `quote_id` (uuid, FK to quotes)
- `customer_address` (text)

**`quotes` — new columns:**
- `delivery_date`, `delivery_time_window`, `delivery_notes` (text)
- `access_constraints`, `route_info` (jsonb)
- `acceptance_metadata` (jsonb) — stores typed name, IP, SMS verification

**`order_items` — bulk items fixed:**
- Backfilled `unit` from "unit" to "cu. yard" for delivery_type=bulk

---

## 5. Infrastructure

### Docker Containers
| Container | Status | Ports |
|-----------|--------|-------|
| easternlm-prod | Up 32hrs | 3100→3000 |
| easternlm-staging | Up 32hrs | 3101→3000 |
| hampton_nginx | Up 8 days | 80, 443 |

### VPS Disk: **21% used** (58GB free) — cleaned from 85%

### Environment Variables (all present)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, GOOGLE_MAPS_API_KEY, STRIPE_SECRET_KEY (test), PROD_STRIPE_SECRET_KEY (live), NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (test), PROD_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (live), STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, ANTHROPIC_API_KEY, RINGCENTRAL_JWT

### Cron Jobs
| Job | Schedule | Endpoint |
|-----|----------|----------|
| RingCentral renewal | Daily 2 AM | `/api/cron/ringcentral-renew` |
| Supabase keepalive | Every 6 hours | `/api/health` |
| Follow-up sequences | Every 30 min | `/api/cron/follow-ups` |

---

## 6. Playwright Test Results

**27 passed, 0 failed, 2 skipped**

| Suite | Tests | Status |
|-------|-------|--------|
| Cart to Checkout | 4 | All pass |
| Order Data Integrity | 2 | All pass |
| Admin Orders | 3 | 1 pass, 2 skip (auth) |
| Mobile Usability | 7 | All pass |
| RingCentral SMS | 6 | All pass |
| POS Fixes March | 4 | All pass |
| Data Integrity | 3 | All pass |

Tests run in CI after staging deploy (continue-on-error).

---

## 7. Known Bugs & Issues

1. **RingCentral main line SMS** — +16318746244 on ext 102, JWT is for ext 101. Falls back to +13153625323. Fix: assign number to ext 101 in RC admin portal.
2. **Resend sending domain** — send.easternlm.com not verified in Resend dashboard.
3. **Product images** — WooCommerce server down, using placeholder fallbacks.
4. **Supabase migration history** — out of sync, DDL runs via Management API.
5. **Stripe Terminal** — timeout fix deployed, needs live testing with real card.

---

## 8. New Files Since Last Report

```
src/lib/sms.ts                                    — Unified SMS sender (RC + Twilio)
src/lib/format-date.ts                            — Shared date/time/phone formatters
src/lib/email/quote-confirmation.ts               — Quote confirmation email template
src/app/delivery/confirm/[orderId]/page.tsx        — Driver delivery confirmation page
src/app/api/delivery/confirm/[orderId]/route.ts    — Delivery confirmation API
src/app/api/delivery/confirm/upload-photo/route.ts — Photo upload for delivery
src/app/api/health/sms/route.ts                    — SMS provider health check
src/app/api/quote/[token]/verify-sms/route.ts      — SMS code verification
src/app/api/quote/[token]/confirm-card/route.ts    — Card payment order creation
src/app/api/admin/quotes/[id]/send-confirmation/route.ts — Manual confirmation email
src/app/api/pos/terminal/cancel-intent/route.ts    — Cancel PaymentIntent
playwright.config.ts                               — Playwright E2E config
tests/e2e/*.spec.ts                                — 7 test suites
tests/helpers/db-helpers.ts                        — Database test helpers
```
