# Eastern LM — Go-Live Checklist

Last updated: 2026-03-14 (audit pass 2)

## Environment Variables

| Variable | Purpose | .env.local | Container | Status |
|----------|---------|:----------:|:---------:|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (build-time) | Set | Set | READY |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (build-time) | Set | Set | READY |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin DB operations (runtime) | Set | Set | READY |
| `GOOGLE_MAPS_API_KEY` | Distance Matrix + Places (runtime) | Set | Set | READY |
| `NEXT_PUBLIC_SITE_URL` | Base URL for metadata/redirects (build-time) | Set (`https://www.easternlm.com`) | Set (`www.easternLM.com`) | NEEDS FIX in container — add `https://` prefix |
| `STRIPE_SECRET_KEY` | Stripe payments (runtime) | `sk_test_...` | `sk_test_...` | NEEDS SWAP to `sk_live_...` for production |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | NOT SET | NOT SET | BLOCKING — must configure |
| `RESEND_API_KEY` | Email service (runtime) | NOT SET | NOT SET | BLOCKING — must configure |
| `RESEND_FROM_EMAIL` | Sender address (runtime) | NOT SET | NOT SET | BLOCKING — must configure |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe (build-time) | NOT SET | NOT SET | CHECK — verify if needed by checkout client |

## Stripe Configuration

- [x] No hardcoded API keys in source code
- [x] `STRIPE_SECRET_KEY` read from env in checkout + webhook routes
- [x] `STRIPE_WEBHOOK_SECRET` read from env, returns 500 if missing
- [x] Webhook verifies `stripe-signature` header, returns 400 if missing
- [x] Webhook uses `constructEvent()` for signature validation
- [x] Idempotent order creation — checks `stripe_checkout_session_id` before insert
- [x] Handles duplicate insert race condition (catches Postgres 23505 unique violation)
- [x] Handles `checkout.session.completed` event
- [x] Handles `checkout.session.expired` event (marks order as expired)
- [x] Server-side total verification — rejects if client/server totals differ by >$1
- [ ] **Switch `STRIPE_SECRET_KEY` from test to live key**
- [ ] **Register webhook endpoint in Stripe Dashboard** (`https://www.easternlm.com/api/webhooks/stripe`)
- [ ] **Set `STRIPE_WEBHOOK_SECRET`** from Stripe Dashboard webhook signing secret
- [ ] **Enable events**: `checkout.session.completed`, `checkout.session.expired`

## Email (Resend)

- [x] Uses env vars (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`), never hardcoded
- [x] Graceful fallback if env vars missing (returns `{ sent: false }`)
- [x] Error handling with try/catch on `resend.emails.send()`
- [x] Template includes: order ID, status, customer name, items table, fees breakdown, delivery schedule, access constraints, delivery/pickup address
- [x] HTML-escaped user input (`escapeHtml()` on all dynamic values)
- [x] Tracks `emailSentAt` in order metadata to prevent duplicate sends
- [ ] **Set `RESEND_API_KEY`** in .env.local and container
- [ ] **Set `RESEND_FROM_EMAIL`** (e.g., `orders@easternlm.com`)
- [ ] **Verify sending domain** in Resend dashboard
- [ ] **Send test email** to confirm delivery

## URL / Redirect Configuration

- [x] `success_url` and `cancel_url` use `NEXT_PUBLIC_SITE_URL` with `localhost:3000` fallback
- [x] Sitemap, robots.txt, layout metadata all derive from `NEXT_PUBLIC_SITE_URL`
- [x] Fixed `NEXT_PUBLIC_SITE_URL` to include `https://` prefix in .env.local
- [ ] **Fix `NEXT_PUBLIC_SITE_URL` in container** — currently `www.easternLM.com` (missing `https://`)
- [ ] **Verify sitemap.xml** renders correct production URLs after fix
- [ ] **Verify robots.txt** renders correct production URLs after fix

## DNS / SSL

- [x] Nginx server blocks configured for `easternlm.com`, `www.easternlm.com`, `staging.easternlm.com`
- [x] Let's Encrypt SSL certs provisioned at `/etc/letsencrypt/live/staging.easternlm.com/`
- [ ] **Point DNS A record** for `easternlm.com` and `www.easternlm.com` to VPS IP `5.161.88.134`
- [ ] **Provision production SSL cert** (or update nginx to use production cert path)
- [ ] **Verify cert auto-renewal** (certbot not confirmed installed on host)

## Security / Cleanup

- [x] Removed `/api/admin/debug` endpoint
- [x] Removed middleware `console.log` statements (3 lines)
- [x] RLS policies enforce DB-level access control
- [x] Admin routes protected by middleware (role check)
- [x] Server-side admin login with cookie-based auth
- [x] `.env.local` covered by `.gitignore` (`.env*` pattern on line 34) — verified 2026-03-14
- [ ] **Remove `SUPABASE_ACCESS_TOKEN`** from .env.local if not needed at runtime (Management API only)
- [ ] **Rotate Stripe keys** if `.env.local` was ever committed to git (contains live key `STRIPE_SECRET_KEY_live`)
- [x] No `console.log` in middleware.ts — clean
- [x] Admin login route has info-level auth logging (acceptable for monitoring)
- [x] Error-level logging only in email, contact, and places routes (appropriate)

## Infrastructure

- [x] VPS container running on port 3100 → 3000
- [x] Nginx proxying with SSL
- [x] GitHub + VPS dual-remote git workflow
- [x] VPS disk at 8% usage
- [ ] **Supabase auto-pause** — free tier pauses after inactivity; upgrade or add keep-alive cron
- [ ] **Optimize Docker image** — currently 1.27GB (should use Next.js standalone output)
- [ ] **Set up monitoring** — uptime check on production URL

## Content

- [ ] **Replace placeholder product images** with real photography
- [ ] **Update product catalog** with real prices from product-marketing-context.md
- [ ] **Replace gallery placeholder photos** with real before/after shots
- [ ] **Review all page metadata** (titles, descriptions) for production

## Customer Database (imported 2026-03-14)

- [x] Imported 14,681 WooCommerce orders from 3 CSV files (Apr 2023 - Mar 2026)
- [x] Created 2,685 unique customer records (deduplicated by phone/email)
- [x] 2,549 customers with phone numbers (SMS-ready)
- [x] 408 customers with email addresses
- [x] Auto-tagged: 447 repeat, 446 high-value, 934 mulch-buyer, 1157 gravel-buyer
- [x] Customer search API at `/api/admin/customers/search?q=...` (phone, name, address)
- [x] Town demand report: 22 towns with 10+ orders (SEO page priority)
- [ ] **Review extraction quality report** — 1,368 unparsed notes may contain customer data
- [ ] **Geocode 213 addresses missing town/zip** using Google Maps API

## 301 Redirects (old domains → easternlm.com)

### Middleware redirects (in src/middleware.ts — active now):
- [x] /driveways → /services/driveways
- [x] /landscaping → /services/landscaping
- [x] /masonry → /services/masonry
- [x] /property-maintenance → /services/property-maintenance
- [x] /product/{slug} → /shop/{slug} (WooCommerce product URLs)
- [x] /product-category/{slug} → /shop?category={slug}
- [x] /my-account → /account/orders
- [x] Trailing slash handling (/shop/ → /shop, /cart/ → /cart, etc.)

### Nginx redirects (in nginx/easternbuilding-supply-redirects.conf — NOT YET ACTIVE):
- [ ] **Point easternbuilding.supply DNS to VPS** (5.161.88.134)
- [ ] **Provision SSL cert**: `certbot certonly --nginx -d easternbuilding.supply -d www.easternbuilding.supply`
- [ ] **Add nginx config** to VPS: copy `nginx/easternbuilding-supply-redirects.conf` to nginx config
- [ ] **Reload nginx**: `nginx -t && nginx -s reload`
- [ ] **Keep WP admin accessible** until Phase 6 custom POS is live
- [ ] **After Phase 6**: remove WP admin exception, redirect everything

### Post-redirect verification:
- [ ] Submit updated sitemap to Google Search Console
- [ ] Monitor Search Console for crawl errors for 4 weeks
- [ ] Keep 301s in place permanently (do not remove)

## Pre-Deploy Verification

- [ ] Run `npx next build` locally with production env vars
- [ ] Test full checkout flow with Stripe test mode
- [ ] Test webhook delivery with Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
- [ ] Verify order appears in admin dashboard after checkout
- [ ] Verify confirmation email received
- [ ] Test on mobile (cart → checkout → confirmation)
- [ ] Verify all 65 town pages render correctly
- [ ] Verify sitemap.xml has correct production URLs (631+ pages)
- [ ] Verify /materials hub page loads with all product-town links

## Google Search Console Setup

1. Go to https://search.google.com/search-console
2. Add property: `https://easternlm.com` (URL prefix)
3. Verify ownership via DNS TXT record or HTML file upload
4. Submit sitemap: `https://easternlm.com/sitemap.xml`
5. Request indexing for these high-priority pages first:
   - / (homepage)
   - /shop
   - /materials (hub page)
   - /services/driveways, /services/landscaping, /services/masonry
   - /delivery/manorville, /delivery/shirley, /delivery/westhampton-beach
   - /materials/mulch-delivery-shirley
   - /materials/gravel-delivery-manorville
   - /blog/how-much-mulch-do-i-need
   - /calculator
6. Monitor "Coverage" report weekly for crawl errors
7. Check "Core Web Vitals" after 1 week of data
8. Set up email alerts for critical coverage issues
