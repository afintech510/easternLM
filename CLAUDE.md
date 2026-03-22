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

- **VPS:** Hetzner (5.161.88.134), Docker, nginx, Let's Encrypt SSL
- **GitHub:** github.com/afintech510/easternLM (private)
- **Supabase:** Project ref `qnwevkgrhdrjqvvabcit`, ACTIVE
- **Resend:** API key configured, from: orders@easternlm.com
- **DNS:** staging.easternlm.com → VPS. Production domain not yet pointed.

## Deployment

Two separate GitHub Actions workflows in `.github/workflows/`:

### Staging (`deploy-staging.yml`)
- **Trigger:** Auto-deploys on push to `main` (also manual via workflow_dispatch)
- **URL:** https://staging.easternlm.com
- **Container:** `easternlm-web` on port **3100**→3000
- **Deploy path:** `/opt/easternlm`
- **Stripe:** Test keys (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)

### Production (`deploy-production.yml`)
- **Trigger:** Manual only (Actions → "Deploy to Production" → type `deploy-production` to confirm)
- **URL:** https://easternlm.com
- **Container:** `easternlm-web-prod` on port **3101**→3000
- **Deploy path:** `/opt/easternlm-prod`
- **Stripe:** Live keys (`PROD_STRIPE_SECRET_KEY`, `PROD_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `PROD_STRIPE_WEBHOOK_SECRET`)

### GitHub Secrets Required
Shared: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_MAPS_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
Staging only: `STRIPE_SECRET_KEY` (test), `STRIPE_WEBHOOK_SECRET` (test), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test)
Production only: `PROD_STRIPE_SECRET_KEY` (live), `PROD_STRIPE_WEBHOOK_SECRET` (live), `PROD_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (live)

## Environment Variables

All in `.env.local` (gitignored) and container env:
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN
- STRIPE_SECRET_KEY (test), STRIPE_WEBHOOK_SECRET
- GOOGLE_MAPS_API_KEY
- RESEND_API_KEY, RESEND_FROM_EMAIL
- NEXT_PUBLIC_SITE_URL (`NEXT_PUBLIC_` prefix = exposed to browser, required by Next.js for client-side vars)

## Go-Live Blockers

1. ~~Switch STRIPE_SECRET_KEY from test to live~~ ✅ PROD secrets set in GitHub
2. Point DNS (easternlm.com + www) to VPS IP
3. Add nginx server block routing easternlm.com → port 3101
4. Verify Resend sending domain (send.easternlm.com)
5. Replace placeholder product images with real photography
