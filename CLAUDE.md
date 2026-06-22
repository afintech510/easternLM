# Eastern Landscape & Mason Supply — Project Instructions

## Business Context

Eastern LM is a family-owned landscape and masonry supply yard in Center Moriches, NY (110 Frowein Road, 11934). We sell bulk materials (mulch, topsoil, gravel, stone, sand) and provide full-service installation (landscaping, masonry, driveways, maintenance). Customers are Suffolk County contractors checking prices on phones at job sites, and homeowners planning weekend projects.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Payments:** Stripe Checkout (test mode, webhook handler at /api/webhooks/stripe)
- **Email:** Resend (order confirmations, lead notifications)
- **State:** Zustand (cart store with persistence)
- **UI:** shadcn/ui + Radix UI + Tailwind CSS v4
- **Fonts:** Bree Serif (display), Public Sans (body)
- **Analytics:** Vercel Analytics
- **Hosting:** Hetzner VPS (Docker, nginx, Let's Encrypt SSL)

## Conventions

- Pricing always in cents (integer) — display with formatUsd helper
- Server Components by default, "use client" only when needed
- Supabase admin client via `getSupabaseAdminClient()` (service role key)
- Admin routes protected by middleware + requireAdmin() check
- File organization: `src/app/` routes, `src/components/` UI, `src/lib/` logic, `src/config/` constants

## Delivery Fee Formula

```
roundTripMiles = oneWayMiles × 2
roundTripMinutes = (oneWayDurationSeconds × 2 + dumpBufferMinutes × 60) / 60
fuelCost = (roundTripMiles / 6 MPG) × $5.00/gal diesel
laborCost = (roundTripMinutes / 60) × $32.00/hr
rawCost = fuelCost + laborCost
withProfit = rawCost × 2.0 (profit multiplier)
fee = max(ceil_to_nearest_$5(withProfit), $25.00 minimum)
additionalLoad = ceil_to_nearest_$5(firstLoad × 0.75)
```

Settings in `site_settings` table (admin-editable). 24 tests in `delivery.test.ts`.

## Truck Fleet

- Small Dump: 5yd default / 7yd mulch
- Medium Dump: 10yd both
- Tri-Axle: 20yd both

## Order Rules

- Multi-load: first load full price, additional loads 75%
- Minimum order: $125 for delivery outside 5-mile local radius
- Tax: 8.75% (Suffolk County)
- CC surcharge: 3% (disclosed per NY State law)
- Same-day cutoff: 11 AM weekdays

## Product Catalog

- 286 active products across 20 categories (source: WooCommerce import)
- 33 bulk products (sold per cubic yard) with descriptions, recommended uses, cross-sells
- Images from easternbuilding.supply (WC server is down — ProductImage component has fallback)
- Product data in Supabase `products` table, imported via `scripts/migrate-wc-products.ts`

## Customer Database

- 14,681 WooCommerce orders imported (Apr 2023 – Mar 2026)
- 2,677 unique customers (deduplicated by phone → email)
- 2,549 with phone numbers (SMS-ready), 408 with email
- Auto-tagged: repeat, high-value, contractor, mulch-buyer, gravel-buyer, mason-buyer, etc.
- Import script: `scripts/import-wc-orders.ts`
- Search API: GET /api/admin/customers/search?q=phone|name|address

## Service Lead System

- `service_leads` table with status pipeline: new → contacted → quoted → scheduled → completed/lost
- Multi-step ServiceQuoteForm (step 1: service type visual buttons, step 2: details, step 3: contact)
- Auto-links to existing customers by phone number
- Notification email sent to yard on new lead
- Admin page at /admin/leads with filters and status management
- Service pages have "double conversion" layout: "We'll Do It" (quote form) | "Do It Yourself" (shop)

## Design System (design-system/MASTER.md)

- Primary: deep navy-teal from logo (oklch hue 230)
- Accent: warm amber/gold (oklch hue 70) — CTAs, prices
- Backgrounds: warm sandy off-whites (oklch hue 75)
- Border radius: 0.625rem (10px) — not bubbly
- No purple, neon, glassmorphism, or thin fonts

## Key Pages

- `/` — Homepage (8 sections: hero, trust bar, categories, services, calculator, reviews, delivery, CTA)
- `/shop` — Product catalog (sidebar filters, search, mobile category tabs)
- `/shop/[slug]` — Product detail (image, price, calculator, delivery check, cross-sells)
- `/services/[slug]` — Service pages (driveways, landscaping, masonry, maintenance)
- `/delivery/[town]` — 25 town SEO pages with delivery fees, maps, FAQs
- `/calculator` — 3-step guided calculator (project type → dimensions → material → price)
- `/cart` — Cart with sticky mobile bottom bar
- `/checkout` — Guest checkout → Stripe redirect
- `/admin` — Dashboard with stats, recent orders, new leads
- `/admin/leads` — Service lead management
- `/admin/customers` — Customer search with order history
- `/privacy-policy`, `/terms` — Legal pages
- `/blog` — MDX blog with 4 posts

## Infrastructure

- **VPS:** Hetzner (5.161.88.134), SSH alias `hampton-vps` (root@5.161.88.134)
- **App directory on VPS:** `/opt/easternlm-web`
- **Docker network:** `hosthampton_hampton_net`
- **GitHub:** github.com/afintech510/easternLM (private)
- **Supabase:** Project ref `qnwevkgrhdrjqvvabcit`, ACTIVE
- **Resend:** API key configured, from: orders@easternlm.com
- **DNS:** staging.easternlm.com → VPS. Production domain not yet pointed.

## Deployment

Two GitHub Actions workflows in `.github/workflows/`. Both SSH into the VPS, `git pull` in `/opt/easternlm-web`, build Docker image on the VPS, and restart the container. No SCP — code lives on VPS via git. Env vars read from `/opt/easternlm-web/.env.local` on the VPS.

### Staging (`deploy-staging.yml`)
- **Trigger:** Auto-deploys on push to `main` (also manual via workflow_dispatch)
- **URL:** https://staging.easternlm.com
- **Container:** `easternlm-staging` on port **3101**→3000
- **Network:** `hosthampton_hampton_net`

### Production (`deploy-production.yml`)
- **Trigger:** Manual only (Actions → "Deploy to Production" → type `deploy-production` to confirm)
- **URL:** https://easternlm.com
- **Container:** `easternlm-prod` on port **3100**→3000
- **Network:** `hosthampton_hampton_net`
- **Stripe:** Uses `PROD_STRIPE_*` vars from `.env.local`

### GitHub Secrets Required
`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT` — that's it. All app env vars live in `.env.local` on the VPS.

### Manual deploy command (staging)
```bash
ssh hampton-vps 'cd /opt/easternlm-web && git pull && eval $(grep -v "^#" .env.local | sed "s/^/export /") && docker build --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" --build-arg SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" --build-arg STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" -t easternlm-web:latest . && docker stop easternlm-staging && docker rm easternlm-staging && docker run -d --name easternlm-staging --network hosthampton_hampton_net -p 3101:3000 --env-file /opt/easternlm-web/.env.local easternlm-web:latest'
```

## Environment Variables

All in `/opt/easternlm-web/.env.local` on VPS (gitignored locally):
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN
- STRIPE_SECRET_KEY (test), PROD_STRIPE_SECRET_KEY (live), STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (test), PROD_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (live)
- GOOGLE_MAPS_API_KEY
- RESEND_API_KEY, RESEND_FROM_EMAIL
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
- RINGCENTRAL_JWT (for RingCentral SMS — primary SMS provider)
- ANTHROPIC_API_KEY (for AI quote generation)
- NEXT_PUBLIC_SITE_URL
- `NEXT_PUBLIC_` prefix = exposed to browser (Next.js bakes these into the JS bundle at build time, so they must be passed as `--build-arg`)

## SMS

- **Primary:** RingCentral via `src/lib/sms.ts` — `sendSms(to, body, from?)`
- **Fallback:** Twilio (when RINGCENTRAL_JWT not set)
- **Default from:** +16318746244 (falls back to +13153625323)
- All outbound SMS uses the unified `sendSms()` function — no inline Twilio calls

## Testing

- **Playwright E2E:** `npm run test:e2e` — 29 tests across 7 suites
- **Unit tests:** `npm test` — Jest (delivery fee calculations)
- **CI:** Playwright runs after staging deploy in GitHub Actions

## Cron Jobs (VPS)

- RingCentral subscription renewal: daily 2 AM
- Supabase keepalive: every 6 hours
- Follow-up sequences: every 30 minutes
- SMS sync: every 5 minutes
- Charge-account balance reconciliation: daily 3:15 AM (auto-fixes drift)

## Charge-Account Balance Integrity

`customers.current_balance_cents` is a denormalized counter mutated by four code paths:
[pos/checkout/route.ts:173](src/app/api/pos/checkout/route.ts) (+grand_total),
[pos/refund/route.ts:63](src/app/api/pos/refund/route.ts) (-refund),
[admin/accounts/mark-paid/route.ts:78](src/app/api/admin/accounts/mark-paid/route.ts) (-paid),
[admin/statements/[id]/route.ts:78](src/app/api/admin/statements/[id]/route.ts) (-statement).

Any direct PATCH/INSERT into `orders` (legacy WC backfill, manual data fixes, etc.)
**bypasses the increment** and creates drift. The truth is always: `sum(unpaid grand_total) - sum(refund credits on those unpaid orders)`.

To audit / fix:

```bash
# Audit only
SUPABASE_SERVICE_ROLE_KEY=... python scripts/reconcile-charge-balances.py

# Audit + auto-fix all drifted accounts
SUPABASE_SERVICE_ROLE_KEY=... python scripts/reconcile-charge-balances.py --fix

# Single customer
... python scripts/reconcile-charge-balances.py --fix --customer <uuid>
```

The nightly cron runs `--fix` automatically. Log: `/var/log/charge-balance-reconcile.log` on VPS.

## Go-Live Blockers

1. ~~Switch STRIPE_SECRET_KEY from test to live~~ ✅ PROD secrets set in `.env.local`
2. Point DNS (easternlm.com + www) to VPS IP
3. Add nginx server block routing easternlm.com → port 3100
4. Verify Resend sending domain (easternlm.com)
5. Replace placeholder product images with real photography

## Google Ads / Merchant API — hard rules

- Use Merchant API v1 only. Content API for Shopping is deprecated and sunsets Aug 18, 2026.
  Forbidden packages: `googleapis/content`, `@google-cloud/shopping-content`.
  Required packages: `@google-shopping/accounts`, `@google-shopping/products`, `@google-shopping/inventories`.
- Use Google Ads API v21+ via `google-ads-api` npm package.
- Path B: No MCC. `login_customer_id` always `undefined` in client constructors.
- `GOOGLE_ADS_CUSTOMER_ID=5409526270`, `GMC_MERCHANT_ID=5578269156`, `ELM_STORE_CODE=ELM-FROWEIN-01`.
- Refresh tokens: AES-256-GCM via `MKTG_ENCRYPTION_KEY`. Never log decrypted tokens.
- Every mutation writes to `mktg_agent_actions` audit table (once Phase 01 creates it).
- All `mktg_google_*` tables carry `brand_id`. Never hard-code `'eastern-lm'`.
- `publish_mode` default is `'suggest'`. `auto` requires explicit unlock; `read_only` blocks writes.
- ELM copy rules in feeds: "per cu. yard" (never "/yd"), "Locally sourced" badge (never "Responsibly sourced"), no founding-year claims, mulch = double ground.
