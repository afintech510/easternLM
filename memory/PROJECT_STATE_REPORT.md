# Eastern Landscape & Mason Supply — Complete Project State Report

**Generated:** 2026-03-18
**Purpose:** Full handoff document for strategy session. Contains complete database schema, route map, implementation status, and architectural notes.

---

## 1. BUSINESS CONTEXT

Eastern LM is a family-owned landscape and masonry supply yard in Center Moriches, NY (110 Frowein Road, 11934). Sells bulk materials (mulch, topsoil, gravel, stone, sand) and provides full-service installation. Customers are Suffolk County contractors and homeowners.

**Tech Stack:** Next.js 16 (App Router) + Supabase (PostgreSQL) + Stripe (test mode) + Resend (email) + Twilio (SMS) + Zustand (cart) + shadcn/ui + Tailwind CSS v4 + Docker on Hetzner VPS.

**Staging:** https://staging.easternlm.com
**GitHub:** github.com/afintech510/easternLM (private)
**Supabase Project:** qnwevkgrhdrjqvvabcit

---

## 2. DATABASE SCHEMA (Full Dump)

### Data Volume
| Table | Rows | Notes |
|-------|------|-------|
| customers | 2,677 | WooCommerce import (Apr 2023 - Mar 2026) |
| order_history | 14,681 | WooCommerce legacy orders (read-only archive) |
| orders | 14 | New system orders (web + POS + sample) |
| order_items | 27 | Line items for new orders |
| products | 311 | 286 active, imported from WooCommerce |
| categories | 21 | Including new "Base" category |
| quotes | 2 | AI-generated quotes |
| projects | 0 | Just created, not yet used |
| service_leads | 0 | Schema built, no real leads yet |
| suppliers | 1 | One supplier entered |
| supplier_invoices | 2 | Test invoices with OCR |
| town_pages | 65 | SEO delivery pages |
| product_town_pages | 390 | SEO product+town combo pages |
| trucks | 3 | Small Dump, Medium Dump, Tri-Axle |
| campaigns | 0 | Schema built, not yet used |
| follow_ups | 0 | Schema built, templates exist but unused |
| follow_up_templates | 3 | Templates created but never fired |
| statements | 0 | Charge account statements (schema only) |
| accounts | 1 | Admin account (adam@easternbuilding.supply) |
| saved_carts | 0 | Just built |
| gallery_projects | 12 | Photo gallery entries |
| delivery_assignments | 0 | Dispatch board (no real assignments yet) |
| inventory_adjustments | 0 | Just built |

### Tables & Schemas

#### accounts (Staff/Admin users — separate from customers)
- id (uuid PK), full_name, company_name, phone, role (text, default 'customer'), is_pro_member (bool), created_at, updated_at
- sms_opt_in (bool), sms_consent_at, pos_pin_hash (text), is_active (bool, default true)
- **Role constraint:** CHECK (role IN ('admin', 'staff', 'pos', 'customer'))
- **Note:** `id` links to Supabase Auth user ID for Google login. PIN-only accounts use synthetic UUIDs.

#### customers (Customer database — 2,677 records)
- id (uuid PK), email, phone, first_name, last_name, company_name
- address, city, state (default 'NY'), zip
- source (text, default 'wc_import'), tags (text[]), notes
- total_orders (int), total_spent_cents (int), first_order_at, last_order_at
- opted_in_email (bool), opted_in_sms (bool)
- tax_exempt (bool), tax_exempt_certificate (text)
- **Charge account fields:** is_charge_account (bool), charge_account_name, credit_limit_cents, payment_terms (default 'Net 30'), billing_email, billing_address, current_balance_cents (int, default 0), last_statement_date
- **Tags used:** repeat, high-value, contractor, mulch-buyer, gravel-buyer, mason-buyer (auto-assigned by import script)

#### orders (14 rows — web, POS, phone, quote-converted)
- id (uuid PK), stripe_checkout_session_id, account_id (FK accounts), customer_id (FK customers)
- customer_name (NOT NULL), customer_email (NOT NULL), customer_phone
- status: CHECK IN ('pending', 'paid', 'processing', 'scheduled', 'delivered', 'cancelled')
- source (text, default 'web') — values: 'web', 'pos', 'phone', 'quote'
- payment_method: CHECK IN ('card_online', 'card_terminal', 'cash', 'check', 'account', 'cod')
- delivery_method (NOT NULL), delivery_address, delivery_zip, combine_loads (bool)
- materials_subtotal_cents, delivery_total_cents, tax_cents, cc_surcharge_cents, grand_total_cents (all NOT NULL int)
- distance_meters, duration_seconds, first_load_fee_cents, additional_load_fee_cents
- total_loads (int), total_delivery_days (int), access_constraints (jsonb), delivery_schedule (jsonb)
- metadata (jsonb), placed_at, created_at, updated_at
- pos_staff_id (FK accounts), pos_register_id, sms_opt_in, sms_consent_at
- tax_exempt, tax_exempt_certificate, discount_type, discount_value, discount_reason, discount_amount_cents
- license_photo_url (text)

#### order_items (27 rows)
- id (uuid PK), order_id (FK orders, NOT NULL), product_id (FK products, nullable)
- product_name (NOT NULL), product_slug, quantity (numeric), unit (text), unit_price_cents (int), line_subtotal_cents (int)
- delivery_type, material_class, load_number, delivery_day, notes

#### order_history (14,681 rows — legacy WooCommerce archive)
- id (uuid PK), wc_order_id (int), customer_id (FK customers)
- order_date, status, payment_method, order_total_cents, delivery_address/city/zip, delivery_notes
- items (jsonb), raw_notes

#### products (311 rows)
- id (uuid PK), name, slug (unique), category_id (FK categories)
- delivery_type: CHECK IN ('bulk', 'non-bulk')
- material_class: CHECK IN ('mulch', 'default')
- price_per_unit_cents (int, NOT NULL) — YARD/POS price
- web_price_per_unit_cents (int, nullable) — Web price (15% markup, null = use yard price)
- unit, unit_display, min_qty, max_qty, step_qty (all numeric)
- description, images (text[]), recommended_uses (text[]), pairs_well_with (text[])
- is_taxable, is_active, sort_order
- visible_web (bool, default true), visible_pos (bool, default true)
- wc_id (int), price_note
- track_inventory (bool, default false), stock_qty (numeric), low_stock_threshold (numeric), stock_unit (text)

#### categories (21 rows)
- id (uuid PK), name, slug (unique), sort_order, image, is_active

#### quotes (2 rows)
- id (uuid PK), public_token (uuid, unique), quote_number (QT-YYYY-NNNN format)
- customer_id (FK customers), customer_name, customer_phone, customer_email, customer_address
- title, description, line_items (jsonb), subtotal_cents, tax_cents, total_cents
- deposit_required_cents, deposit_paid_cents, valid_until, estimated_timeline, terms, internal_notes
- status: CHECK IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted')
- sent_at, sent_via (text[]), viewed_at, accepted_at, customer_signature_url
- declined_at, decline_reason, deposit_stripe_payment_id, deposit_paid_at
- converted_order_id (FK orders), ai_prompt, ai_generated (bool)
- photo_urls (text[]), created_by, created_at, updated_at

#### projects (0 rows — just created)
- id (uuid PK), title, description
- status: CHECK IN ('active', 'scheduled', 'in_progress', 'completed', 'on_hold', 'cancelled')
- customer_name, customer_phone, customer_email, address
- quote_id (FK quotes), order_id (FK orders)
- estimated_start, estimated_end, actual_start, actual_end
- notes, created_by, created_at, updated_at

#### service_leads (0 rows — schema built, no real data)
- Has full status pipeline: new -> contacted -> quoted -> scheduled -> completed/lost
- Links to customer_id, has photo_urls, service_type, address fields
- Multi-step form exists on service pages

#### suppliers / supplier_products / supplier_invoices / supplier_price_history
- Full supplier management with product catalog, cost tracking, invoice OCR pipeline
- OCR uses Claude Sonnet 4.6 vision to extract invoice data
- Price changes logged to history table

#### statements (charge account monthly statements)
- Full schema with public_token for payment links
- period_start/end, charges/payments/balance tracking
- Stripe integration for online payment

#### delivery_assignments (dispatch board)
- order_id (FK), delivery_date, time_slot, truck_type, truck_id, driver_name
- material_summary, destination_address, distance/drive info
- status: scheduled -> loading -> departed -> arrived -> delivered -> issue

#### saved_carts (save for later / abandoned cart)
- token (uuid, unique), items (jsonb), customer info
- status: active -> restored -> converted -> expired
- expires_at (30 days from creation)

#### campaigns / campaign_sends (marketing automation)
- Full campaign system with audience_filter, multi-channel (sms/email)
- Status: draft -> approved -> sending -> completed
- Tracking: sent, delivered, failed, clicked, opted_out

#### follow_ups / follow_up_templates
- Trigger-based follow-up system (e.g., after order delivered)
- Templates with delay_minutes, send windows, cooldown
- 3 templates exist but have never been executed

---

## 3. FOREIGN KEY RELATIONSHIPS

```
accounts.id -> Supabase Auth (implicit)
campaign_sends.campaign_id -> campaigns.id
campaign_sends.customer_id -> customers.id
delivery_assignments.order_id -> orders.id
delivery_assignments.assigned_by -> accounts.id
follow_ups.order_id -> orders.id
follow_ups.customer_id -> customers.id
held_orders.staff_id -> accounts.id
held_orders.customer_id -> customers.id
inventory_adjustments.product_id -> products.id
order_history.customer_id -> customers.id
order_items.order_id -> orders.id
order_items.product_id -> products.id
orders.account_id -> accounts.id
orders.customer_id -> customers.id
orders.pos_staff_id -> accounts.id
products.category_id -> categories.id
projects.quote_id -> quotes.id
projects.order_id -> orders.id
quotes.customer_id -> customers.id
quotes.converted_order_id -> orders.id
service_leads.customer_id -> customers.id
statements.customer_id -> customers.id
supplier_invoices.supplier_id -> suppliers.id
supplier_price_history.supplier_product_id -> supplier_products.id
supplier_products.supplier_id -> suppliers.id
supplier_products.product_id -> products.id
```

---

## 4. ROUTE MAP (173 routes)

### Public Website (Customer-Facing)
```
/                          Homepage (8 sections)
/shop                      Product catalog with category grid + filters
/shop/[slug]               Product detail (qty presets, delivery calculator, add to cart)
/cart                       Cart with delivery calc, flatbed options, save for later
/checkout                   Stripe checkout
/checkout/success           Order confirmation
/delivery                   Suffolk County delivery page (65 town links)
/delivery/[town]            Town-specific delivery SEO page (65 pages)
/services                   Services overview
/services/[slug]            Service detail (driveways, landscaping, masonry, maintenance)
/services/[slug]/[town]     Service+town SEO combo pages
/materials                  Materials hub
/materials/[slug]           Product+town SEO pages (390 pages)
/calculator                 Calculator hub (7 calculators)
/calculator/mulch|topsoil|driveway|fill|sand|rca|shed-base
/blog                       Blog listing
/blog/[slug]                Blog post (MDX)
/blog/materials-guide       Static guide page
/contact                    Contact form + yard info
/about                      About page
/gallery                    Photo gallery
/privacy-policy             Legal
/terms                      Terms of service
/quote/[token]              Public quote view + sign + pay deposit
/pay/[token]                Public statement payment page
/unsubscribe                SMS/email opt-out
```

### POS / Yard (Staff-Authenticated)
```
/yard/register              POS register (auth gate -> /pos/page.tsx)
/yard/login                 PIN + Google login for yard staff
/yard/scan                  Mobile document scanner (camera + OCR upload)
/yard/unauthorized          Access denied page
/pos/page.tsx               Full POS register (product search, cart, payments)
/pos/login                  Legacy POS login (redirects to /yard/login)
/pos/close                  End-of-day cash count
/pos/held                   Held orders
/pos/orders                 POS order history
/pos/settings               POS settings
```

### Admin Panel
```
/admin                      Dashboard
/admin/login                Email/password + Google login
/admin/operations           Orders dashboard (date filters, status, search)
/admin/operations/dispatch  Dispatch board (day + weekly view, truck kanban)
/admin/operations/briefing  Morning briefing
/admin/customers            Customer search + detail
/admin/quotes               Quote list + AI generation
/admin/quotes/new           New quote (AI prompt)
/admin/quotes/[id]          Quote editor (line items, photos, send, convert)
/admin/campaigns            Marketing campaigns
/admin/campaigns/[id]       Campaign detail
/admin/campaigns/new        New campaign
/admin/follow-ups           Follow-up queue
/admin/gallery              Gallery management
/admin/leads                Service lead pipeline
/admin/products             Product list (click-to-edit, expand/collapse)
/admin/products/bulk        Bulk editor (inline cells, multi-select actions)
/admin/inventory            Inventory tracking (stock levels, adjustments)
/admin/invoices             Supplier invoice dashboard
/admin/invoices/[id]        Invoice review + OCR extraction
/admin/invoices/upload      Standalone invoice upload
/admin/accounts             Charge account management
/admin/statements           Statement list
/admin/statements/[id]      Statement detail + send
/admin/suppliers            Supplier list
/admin/suppliers/[id]       Supplier detail + products + invoices
/admin/projects             Project management (from quotes)
/admin/settings             Tabbed: General | Trucks | Fee Cache | Staff
/admin/orders               Legacy orders page
/admin/orders/[id]          Legacy order detail
```

### API Routes (120+)
```
/api/checkout               Web checkout -> Stripe session
/api/pos/checkout            POS order creation (card/cash/cod/account)
/api/pos/products            POS product catalog (visible_pos=true)
/api/pos/paylink             Create Stripe payment link, send via SMS/email
/api/pos/license-photo       Upload license photo for fraud prevention
/api/pos/held                Save/restore held orders
/api/pos/orders              POS order history
/api/pos/transactions        Transaction search
/api/pos/close-day           End-of-day report
/api/pos/terminal/*          Stripe Terminal integration (4 routes)
/api/delivery/config         Delivery pricing config
/api/delivery/distance       Calculate delivery fee by address
/api/cart/save               Save cart for later (email/SMS link)
/api/cart/restore            Restore saved cart by token
/api/webhooks/stripe         Stripe webhook (orders, quote deposits, statement payments)
/api/webhooks/twilio         Twilio SMS webhook (STOP opt-out)
/api/leads                   Public service lead submission
/api/contact                 Contact form submission
/api/quote/[token]           Public quote view (auto-marks "viewed")
/api/quote/[token]/accept    Accept quote with signature
/api/quote/[token]/decline   Decline quote
/api/quote/[token]/deposit   Create Stripe deposit session
/api/pay/[token]             Public statement view
/api/pay/[token]/checkout    Statement Stripe payment
/api/admin/quotes/generate   AI quote generation (Claude Sonnet 4.6)
/api/admin/invoices/extract  AI invoice OCR (Claude Sonnet 4.6 vision)
/api/yard/scan/upload        Mobile doc scanner upload
/api/yard/login/pin          PIN authentication
/api/cron/*                  5 cron endpoints (campaigns, follow-ups, delivery-notify, morning-briefing, refresh-reviews)
/api/health/*                4 health check endpoints
/auth/callback               Google OAuth callback (auto-provisions admin emails)
```

---

## 5. ORDER FLOW AUDIT

### Web Checkout Flow
1. Customer adds items to cart (Zustand store, localStorage persistence)
2. Cart page: delivery address -> auto-calculate fee, flatbed options, min order check
3. Checkout: customer info (name, email, phone) + SMS/email opt-in
4. POST /api/checkout: validates, creates Stripe Checkout session + pre-creates orders row (status: pending) + order_items
5. Stripe redirect -> customer pays
6. Stripe webhook (checkout.session.completed): marks order "paid", sends confirmation email via Resend
7. Customer_id is NOT linked at web checkout (orders.customer_id is nullable)

### POS Checkout Flow
1. Staff searches products, adds to cart with qty
2. Customer lookup by phone/name (optional)
3. Payment: CARD (Stripe Terminal), CASH (cash dialog), COD, ACCOUNT (charge account)
4. POST /api/pos/checkout: creates order directly (no Stripe session for cash/cod)
5. Card payments use Stripe Terminal API (connection-token -> create-payment-intent -> process)
6. Charge account: increments customer.current_balance_cents
7. customer_id IS linked when customer selected in POS

### Phone Orders
- Source = 'phone' in orders table
- Created via POS (staff enters phone order through POS register)
- No separate phone order interface

### Quote -> Order Flow
1. Admin creates quote (AI-generated or manual) at /admin/quotes/new
2. Send to customer via SMS/email
3. Customer views at /quote/[token], signs with signature pad
4. If deposit required: redirect to Stripe Checkout
5. Admin clicks "Convert to Order" -> creates order + order_items + project
6. Status: draft -> sent -> viewed -> accepted -> converted

### Held Orders
- POS-only feature, stored in held_orders table
- Staff can hold an in-progress sale, then restore it later
- Auto-expires after 4 hours (checked on GET)
- Working in POS UI

---

## 6. CUSTOMER CREATION PATHS

### Path 1: WooCommerce Import (bulk, historical)
- Script: `scripts/import-wc-orders.ts`
- Deduplication by phone -> email
- Auto-tags: repeat, high-value, contractor, mulch-buyer, gravel-buyer, mason-buyer
- Result: 2,677 customers, 14,681 order_history records

### Path 2: Web Checkout
- `/api/checkout` creates order with customer_name, customer_email, customer_phone
- **Does NOT create or link a customer record** (orders.customer_id = null)
- Customer data is on the order row only

### Path 3: POS Register
- Staff can search existing customers by phone/name
- POST /api/pos/checkout includes customer_id if selected
- Can create new customer inline in POS UI
- Links order to customer_id

### Path 4: Service Lead Form
- POST /api/leads creates service_leads record
- Auto-links to existing customer by phone number match
- Creates customers record if none found (source: 'service_lead')

### Path 5: Admin Manual
- /admin/customers page + /api/admin/customers POST
- Full form with all fields

### Path 6: Quote
- Quotes have customer_name/phone/email/address
- Can link to customer_id (optional)
- On conversion to order, customer info copied to order

### PROBLEM: Web checkout doesn't create/link customers
This means web orders are disconnected from the customer database. A customer who orders online won't show up in customer search, won't get tagged, won't get follow-ups. This is the biggest data integrity gap.

---

## 7. POS CURRENT STATE

### Route Structure
- `/yard/register` -> server auth gate -> renders `/pos/page.tsx`
- `/yard/login` -> PIN numpad + Google OAuth
- `/yard/scan` -> mobile document scanner

### POS Features (All Working)
- Product catalog search by category
- Line items with quantity adjusters + price override
- Customer lookup (search by phone, name, address)
- Delivery fee calculator (address input, Google Maps distance)
- Tax exempt toggle
- Manual discount (%, $, or fixed)
- Payment methods: Card (Stripe Terminal), Cash (with change calc), COD, Charge Account
- Receipt printing (thermal printer integration via ReceiptPrinter class)
- Held orders (save/restore in-progress sales)
- Transaction history (date range, customer, search)
- Customer order history
- End-of-day cash count
- Theme switcher (site/light/medium/dark)
- **NEW:** Send Paylink (Stripe payment link via SMS/email)
- **NEW:** License Photo upload (camera capture for fraud prevention)

### POS Payment Flow
- **Card:** Stripe Terminal API -> simulated reader in dev, real reader in prod
- **Cash:** Cash dialog with tendered amount, shows change due
- **COD:** Creates order with status "paid", payment_method "cod"
- **Account:** Increments customer.current_balance_cents, creates order with payment_method "account"

### What's NOT in POS
- No quote creation from POS
- No delivery scheduling from POS
- No inventory deduction on sale

---

## 8. FOLLOW-UP / MARKETING STATE

### Follow-Up System
- **Schema:** Complete (follow_ups, follow_up_templates tables)
- **Templates:** 3 exist (review request, reorder reminder, season prep)
- **Engine:** `src/lib/follow-ups/engine.ts` — processes pending follow-ups
- **Cron:** `/api/cron/follow-ups` endpoint exists
- **Status:** NEVER EXECUTED. No cron job configured. Templates never fired.

### Campaign System
- **Schema:** Complete (campaigns, campaign_sends, audience_segments)
- **Admin UI:** Full campaign editor at /admin/campaigns
- **Engine:** `src/lib/marketing/campaigns.ts`
- **Cron:** `/api/cron/campaigns` endpoint exists
- **Status:** ZERO campaigns created. Never used.

### SMS (Twilio)
- **Configured and working** — tested successfully (SID: AC9f18bdbc...)
- **Used in:** quote sending, statement sending, saved cart links, POS paylinks, staff notifications
- **NOT used in:** customer order confirmations, follow-ups, campaigns (all schema-only)
- **Webhook:** `/api/webhooks/twilio` handles STOP opt-out

### Email (Resend)
- **Configured and working** — from: orders@send.easternlm.com
- **Used in:** order confirmation (web only), quote sending, statement sending, contact form, lead notifications, saved cart links
- **NOT used in:** follow-ups, campaigns (schema-only)

---

## 9. FEATURE STATUS TABLE

| Feature | Status | Notes |
|---------|--------|-------|
| **PUBLIC WEBSITE** | | |
| Homepage | Built | 8 sections, CRO-optimized |
| Shop catalog | Built | Category icons, qty presets, dual pricing |
| Product detail | Built | Qty presets, auto delivery fee, calculator |
| Cart | Built | Flatbed options, min order fee, save for later |
| Checkout (Stripe) | Built | Web checkout works, test mode |
| Delivery pages | Built | 65 town pages + 390 product/town SEO pages |
| Service pages | Built | 4 services + town variants |
| Calculator | Built | 7 calculators (mulch, topsoil, driveway, etc.) |
| Blog | Built | 4 MDX posts |
| Contact form | Built | Sends email notification |
| **POS REGISTER** | | |
| Product search + cart | Built | Category tabs, search, qty adjust |
| Customer lookup | Built | Phone/name search, inline create |
| Card payment (Terminal) | Built | Stripe Terminal integration |
| Cash payment | Built | Tendered/change dialog |
| COD payment | Built | Creates order as paid |
| Charge account | Built | Balance tracking, credit limit check |
| Receipt printing | Built | Thermal printer support |
| Held orders | Built | Save/restore, 4hr expiry |
| Transaction history | Built | Date range, search, refunds |
| Send Paylink | Built | Stripe link via SMS/email |
| License photo | Built | Camera capture for fraud |
| **ADMIN PANEL** | | |
| Dashboard | Built | Stats, recent orders, leads |
| Operations/Orders | Built | FIXED: was broken (bad columns), now works |
| Dispatch board | Built | Day view (truck kanban) + weekly view |
| Customer management | Built | Search, detail, order history, tags |
| Quote system | Built | AI generation, send SMS/email, sign, deposit, convert to order |
| Projects | Built (new) | Created from quotes, links to orders |
| Products editor | Built | Click-to-edit, expand/collapse, dual pricing |
| Bulk editor | Built | Inline editing, bulk actions |
| Inventory tracking | Built (new) | Stock levels, adjustments, low-stock alerts |
| Service leads | Schema + UI | Pipeline UI exists, no real leads |
| Supplier management | Built | Products, invoices, OCR |
| Invoice OCR | Built | Claude vision extraction, review/confirm |
| Mobile scanner | Built (new) | Camera with corner guides, step-by-step review |
| Charge accounts | Built | POS integration, statements schema |
| Statements | Schema + UI | Send/pay flow built, never used |
| Settings | Built | Tabbed: General, Trucks, Cache, Staff |
| Gallery management | Built | Upload, organize, town tags |
| **MARKETING** | | |
| Campaign system | Schema + UI | Never used, 0 campaigns |
| Follow-up system | Schema + engine | Never executed, 3 templates |
| SMS sending | Working | Used for quotes/statements/carts |
| Email sending | Working | Used for orders/quotes/statements |
| Google review redirect | Built | /api/review/redirect |
| **INFRASTRUCTURE** | | |
| Google OAuth | Built but disabled | Nginx buffer issue (fixed), provider disabled |
| PIN login (yard) | Built | bcrypt-hashed PINs, session cookies |
| Role-based access | Built | admin/staff/pos roles, middleware enforcement |
| Supabase RLS | Configured | Admin-only policies on most tables |
| Health checks | Built | 4 endpoints, keepalive |
| Docker deployment | Working | Build + push + restart on VPS |
| SSL (Let's Encrypt) | Working | staging.easternlm.com |
| DNS | Pending | Production domain not yet pointed |

---

## 10. PAIN POINTS & ARCHITECTURAL ISSUES

### Critical: Web orders don't create/link customers
- `/api/checkout` puts customer_name/email/phone on the order row but never creates or links a `customers` record
- This means: no customer tags, no follow-up eligibility, no order history aggregation, no repeat customer tracking
- POS does this correctly; web does not
- **Fix needed:** Create/upsert customer on web checkout, link customer_id

### Critical: Dual orders tables
- `order_history` (14,681 rows) = WooCommerce legacy, read-only
- `orders` (14 rows) = new system
- Customer stats (total_orders, total_spent_cents) are from WC import only
- New orders don't update customer stats
- **Fix needed:** Either merge or ensure new orders update customer aggregates

### Medium: Follow-ups/campaigns never execute
- Tables, templates, and engine code all exist
- No cron job configured on VPS
- Cron endpoints exist but are never called
- **Fix needed:** Set up cron-job.org or VPS cron to hit the endpoints

### Medium: Inventory not deducted on sale
- Inventory tracking exists (stock_qty, adjustments) but:
  - POS checkout doesn't deduct stock
  - Web checkout doesn't deduct stock
  - Only manual adjustments via admin UI
- **Fix needed:** Hook into order creation to auto-deduct

### Medium: Google OAuth disabled
- Nginx proxy_buffer_size issue was fixed (128k)
- But Google provider disabled in Supabase config
- **Fix needed:** Re-enable Google provider, test auth flow

### Low: Service leads table empty
- Full schema and UI exist (/admin/leads, service quote form on all service pages)
- Form submits to /api/leads but no real traffic yet
- Auto-links to customers by phone
- Status: working but unused

### Low: Orphaned routes
- `/admin/orders` and `/admin/orders/[id]` — legacy order pages that duplicate `/admin/operations`
- `/pos/login` — legacy, should redirect to `/yard/login`
- `/pos/held`, `/pos/orders`, `/pos/settings`, `/pos/close` — old POS routes, may conflict with `/yard/*`

### Low: TypeScript type gaps
- Supabase generated types don't include columns added by migrations after initial generation
- Workaround: `as any` casts throughout catalog.ts, operations API, etc.
- **Fix needed:** Regenerate types or maintain a separate types file

### Code Quality Notes
- No automated tests running (delivery.test.ts exists with 24 tests but not in CI)
- No CI/CD pipeline — manual git push + docker build on VPS
- `.env.local` has all secrets; container gets them via `-e` flags
- Docker warnings about secrets in build args (ARG/ENV for service role key)

---

## 11. ENVIRONMENT VARIABLES

| Variable | Status | Used By |
|----------|--------|---------|
| NEXT_PUBLIC_SUPABASE_URL | Set | All Supabase calls |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Set | Client-side Supabase |
| SUPABASE_SERVICE_ROLE_KEY | Set | Admin operations |
| STRIPE_SECRET_KEY | Set (test) | Checkout, paylinks |
| STRIPE_WEBHOOK_SECRET | Set | Webhook verification |
| GOOGLE_MAPS_API_KEY | Set | Delivery distance calc |
| RESEND_API_KEY | Set | Email sending |
| RESEND_FROM_EMAIL | Set | orders@send.easternlm.com |
| TWILIO_ACCOUNT_SID | Set | SMS sending |
| TWILIO_AUTH_TOKEN | Set | SMS sending |
| TWILIO_PHONE_NUMBER | Set | +16314003301 |
| ANTHROPIC_API_KEY | Set (real) | Invoice OCR, quote generation |
| NEXT_PUBLIC_SITE_URL | Set | https://www.easternlm.com |

---

## 12. GO-LIVE BLOCKERS

1. Switch STRIPE_SECRET_KEY from test to live
2. Point DNS (easternlm.com + www) to VPS IP 5.161.88.134
3. Verify Resend sending domain (send.easternlm.com)
4. Fix web checkout to create/link customer records
5. Set up cron jobs for follow-ups, campaigns, keepalive
6. Re-enable Google OAuth (optional but wanted)
7. Replace placeholder product images with real photography
