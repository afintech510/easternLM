# Platform State Report — 2026-03-22

## Executive Summary

37 commits in the last 48 hours across two authors (29 from afintech51/manual, 7 from Claude/PR, 1 merge). Major work: quote system overhaul, POS improvements, checkout optimization, deployment workflow setup. TypeScript compiles clean. No TODOs/FIXMEs left. All public pages returning 200. Both staging and production containers running.

---

## 1. Git History (Last 48 Hours)

### Commits by Author
| Author | Commits |
|--------|---------|
| afintech51 | 29 |
| Claude | 7 |
| afintech510 (merge) | 1 |

### Commit Log (newest first)
```
30b8c75 Quote -> Order: preserve all delivery details, add order creation on card payment
2a03a09 Fix delivery fee tax and address field persistence on refresh
b0401cb Quote: show full order details -- customer info, delivery date/time, fee
3bcf83b Fix: quote from cart correctly saves delivery address and method
5d176e6 POS: move column selector to edit banner; service lead -> FunnelPlus neon green
9f2d8ca Fix: save quote from cart (unauthenticated), persist customer info correctly
12029cf Fix: customer info persistence -- read directly from Zustand store
a768721 Checkout: reduce clicks, persist customer info, auto-proceed to payment
51b2e1d Deploy: prod container uses PROD_STRIPE_SECRET_KEY at runtime
2bcb4ba Deploy: fix production workflow to use inline SSH (match staging approach)
8228a7f Deploy: source all build args from VPS .env.local, not GitHub secrets
08e87a1 Quote page: fix Stripe PaymentElement + add BNPL (Klarna, Affirm, Afterpay)
48a37c5 Quote page: full redesign -- dark hero, embedded Stripe, delivery details
034174d POS: full-screen QuoteBuilder overlay replaces SaveQuoteModal
6f91b6f merge: lock button position -- keep working deploy workflow
d83a45f fix: hardcode VPS host/user -- were missing from secrets causing silent SSH failure
b059061 fix: proper SSH key setup step + keyscan + verbose for debugging
b0192cd fix: replace SCP action with direct SSH -- avoids ed25519 auth issue
039a524 Fix deploy workflows to match actual VPS setup
d0c038b Move POS lock/reorder button next to logo
e16b011 Fix POS grid column selector always showing 5, and save never finishing
820d1e4 Update CLAUDE.md with deployment architecture and go-live status
17a804d Separate staging (auto) and production (manual) deploy workflows
069feda fix: GH Actions workflow -- correct paths, container name, port, network, env vars
bb00da8 Merge: restore Quotes sidebar link, add Maintenance/Transactions stubs, GitHub Actions
3980939 fix: restore Quotes link to admin sidebar and add missing stub pages
effc876 Add GitHub Actions CI/CD workflow for staging deployment
cd50833 POS: kill internal notifs, fix receipts, customer delivery SMS
5c21a4f Floating cart: single number -- '20 yd' or '23 items', no badge bubble
```

### Files Changed (41 files, +3324 / -626 lines)
Major areas touched:
- `src/app/quote/[token]/page.tsx` — Complete rewrite (+1187 lines)
- `src/components/pos/quote-builder.tsx` — New file (+704 lines)
- `src/components/shop/bulk-materials-grid.tsx` — New file (+250 lines)
- `src/components/shop/product-image-gallery.tsx` — New file (+162 lines)
- `src/components/cart/cart-page-client.tsx` — Cart/quote flow fixes (+66 lines)
- `src/components/checkout/checkout-page-client.tsx` — Checkout optimization (+54 lines)
- `.github/workflows/` — New staging + production deploy workflows

---

## 2. Build & Code Quality

| Check | Status |
|-------|--------|
| TypeScript (`tsc --noEmit`) | PASS — zero errors |
| Stray console.logs | 1 (benign: checkout confirm office notification) |
| TODO/FIXME markers | 0 |
| Duplicate imports | 0 |

---

## 3. System Status

### Public Website
| Page | Status | Notes |
|------|--------|-------|
| `/` (Homepage) | WORKING | 200 |
| `/shop` | WORKING | 200 |
| `/cart` | CHANGED | Zustand hydration fix, address persistence, save-quote flow |
| `/checkout` | CHANGED | Auto-proceed to payment, customer info persistence |
| `/services` | WORKING | 200 |
| `/calculator` | WORKING | 200 |
| `/delivery/[town]` | WORKING | 200 |
| `/contact` | WORKING | 200 |
| `/quote/[token]` | CHANGED | Full redesign: dark hero, embedded Stripe, delivery details, BNPL |
| `/admin` | WORKING | 307 redirect (auth) |

### Quote System
| Component | Status | Notes |
|-----------|--------|-------|
| `/api/quotes/quick` (POST) | CHANGED | Cart source bypass (no auth), delivery notes/constraints, tax on delivery |
| `/quote/[token]` page | CHANGED | Full redesign with embedded Stripe, COD option, signature |
| `/api/quote/[token]/confirm-card` | NEW | Creates order from quote on card payment |
| `/api/quote/[token]/confirm-cod` | CHANGED | Now passes all delivery details to order |
| `/api/quote/[token]/payment-intent` | WORKING | Creates Stripe PaymentIntent |
| `/api/quote/[token]/accept` | WORKING | Signature + accept flow |
| `/api/quote/[token]/decline` | WORKING | Decline with reason |
| Email template (Resend) | WORKING | Navy heading, amber CTA button |
| SMS template (Twilio) | WORKING | Quote link sent |
| Short URLs (`/q/[code]`) | WORKING | Redirect to full quote URL |

### POS System (`/yard/register`)
| Component | Status | Notes |
|-----------|--------|-------|
| Product grid | CHANGED | Column selector moved to edit banner, FunnelPlus icon for leads |
| QuoteBuilder overlay | NEW | Full-screen overlay replaces old SaveQuoteModal |
| Cart panel | WORKING | Unchanged |
| Checkout overlay | WORKING | Minor tweaks |
| Receipt printing | WORKING | Fixed in cd50833 |
| Customer lookup | WORKING | CallerID popup unchanged |
| Phone orders | WORKING | Unchanged |
| Held orders | WORKING | Unchanged |

### Cart & Checkout
| Component | Status | Notes |
|-----------|--------|-------|
| Cart page | CHANGED | Address persistence fix, delivery notes sent to quote, SMS opt-in |
| Checkout page | CHANGED | Auto-proceed to payment, removed email deals checkbox |
| Zustand store | CHANGED | `smsOptIn` added to CustomerInfo type |
| Floating cart | CHANGED | Single number display (qty or yards) |

### Admin Dashboard
| Page | Status |
|------|--------|
| `/admin` | WORKING |
| `/admin/customers` | WORKING |
| `/admin/quotes` | WORKING |
| `/admin/leads` | WORKING |
| `/admin/pipeline` | WORKING |
| `/admin/operations` | WORKING |

### Lead Management
| Component | Status |
|-----------|--------|
| `/admin/leads` | WORKING |
| `/admin/pipeline` | WORKING |
| Service lead API | WORKING |
| Lead activity tracking | WORKING |

### Deployment
| Component | Status | Notes |
|-----------|--------|-------|
| GitHub Actions (staging) | NEW | Auto-deploys on push to `main` |
| GitHub Actions (production) | NEW | Manual trigger with confirmation |
| VPS git mirror | WORKING | `vps` remote still functional |

---

## 4. Database State

### Row Counts
| Table | Count |
|-------|-------|
| customers | 2,680 |
| delivery_assignments | 11 |
| follow_ups | 128 |
| held_orders | 0 |
| order_items | 111 |
| orders | 51 |
| products | 322 |
| quotes | 33 |
| service_leads | 6 |

### All Tables (41 total)
accounts, audience_segments, calculator_events, campaign_sends, campaigns, categories, contractors, customers, delivery_assignments, delivery_fee_cache, follow_up_templates, follow_ups, gallery_projects, google_reviews_cache, held_orders, incoming_calls, inventory_adjustments, lead_activity, order_history, order_items, orders, pos_daily_reports, product_town_pages, products, project_activity, projects, quotes, saved_carts, service_leads, service_town_pages, site_settings, sms_consent_log, statements, supplier_invoices, supplier_price_history, supplier_products, suppliers, town_pages, truck_types, trucks, upsells

### Schema Changes (Last 48h)

**`quotes` table — new columns:**
- `delivery_date` (text)
- `delivery_time_window` (text)
- `delivery_notes` (text)
- `access_constraints` (jsonb)
- `route_info` (jsonb)

**`orders` table — new columns:**
- `delivery_date` (text)
- `delivery_time_window` (text)
- `delivery_notes` (text)
- `source` (text, default 'web')
- `quote_id` (uuid, FK to quotes)
- `customer_address` (text)

---

## 5. Infrastructure

### Docker Containers
| Container | Status | Ports |
|-----------|--------|-------|
| easternlm-staging | Up ~1hr | 3101->3000 |
| easternlm-prod | Up ~3hrs | 3100->3000 |
| hampton_nginx | Up 3 days | 80, 443 |
| + 10 other Hampton/HappyHome containers | Running | Various |

### VPS Disk
**85% used (61GB/75GB)** — needs cleanup again. Run `docker image prune -a` and `docker builder prune`.

### Environment Variables (all present)
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN
- GOOGLE_MAPS_API_KEY
- STRIPE_SECRET_KEY (test), PROD_STRIPE_SECRET_KEY (live)
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (test), PROD_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (live)
- STRIPE_WEBHOOK_SECRET
- RESEND_API_KEY, RESEND_FROM_EMAIL
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

---

## 6. Known Bugs & Issues

1. **VPS disk at 85%** — Docker build cache accumulating. Needs `docker system prune`.
2. **Quote card payment order creation** — Was completely missing (fixed this session: `confirm-card` endpoint). Before this fix, card-paid quotes never created an order record.
3. **Delivery fee not taxed on quotes** — NY state requires tax on delivery. Fixed this session in `quotes/quick/route.ts`.
4. **Address field blank on cart refresh** — Zustand hydration timing. Fixed this session with `useEffect` sync.
5. **Supabase migration history out of sync** — `supabase db push` fails due to mismatched remote migration versions. Migrations run directly via Management API instead.
6. **Product images** — WooCommerce server (easternbuilding.supply) still down. Fallback placeholders in use.
7. **Resend sending domain** — `send.easternlm.com` not yet verified in Resend dashboard.

---

## 7. Color Theme Issue

The quote page (`/quote/[token]`) uses a **green theme** (`#1a2e0a`, `bg-green-700`, etc.) which does NOT match the site's **navy blue + warm amber** theme:
- Site primary: `oklch(0.28 0.07 230)` = **#002e44** (deep navy)
- Site accent: `oklch(0.68 0.16 70)` = **#d58300** (warm amber)
- Quote page currently: `#1a2e0a` / `#2d4a15` / `bg-green-700` (forest green)

**Needs update** — Part 2 of this session.

---

## 8. Deployment Workflow

- **Staging**: Push to `origin main` triggers GitHub Actions auto-deploy
- **Production**: Manual only via GitHub Actions workflow_dispatch (type "deploy-production" to confirm)
- **VPS remote** (`vps`): Still works for direct push but redundant for staging
- Both workflows: SSH into VPS, git fetch + reset, build Docker image on VPS, swap container
- Production uses `PROD_STRIPE_*` env vars for live Stripe account
