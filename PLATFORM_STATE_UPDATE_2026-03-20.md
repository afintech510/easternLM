# Platform State Update — March 20, 2026

**Period:** March 18–20, 2026 (40 commits, 86 files changed, +7,841 / -1,221 lines)

---

## Infrastructure Changes

### Dual Container Deployment
- **Production:** `easternlm-prod` (port 3100) — Stripe **LIVE** keys, frozen image (`:prod` tag)
- **Staging:** `easternlm-staging` (port 3101) — Stripe **TEST** keys, latest code (`:latest` tag)
- Nginx routes `easternlm.com` → prod, `staging.easternlm.com` → staging
- Deploy flow: build → tag `:latest` → staging auto-gets it. Production only updates when explicitly tagged `:prod`

### DNS & SSL
- **Cloudflare** origin cert installed (`/etc/cloudflare/easternlm.com.pem`)
- `easternlm.com` + `www.easternlm.com` → Cloudflare → VPS (nginx)
- `www` redirects to non-www
- Cloudflare real IP headers configured (all CF IP ranges)
- Nginx `proxy_buffering off` + 16k buffer for Supabase auth cookies

### Cron Jobs (configured, running on staging)
| Cron | Schedule | Status |
|------|----------|--------|
| Follow-ups | Every 5 min | Running |
| Campaigns | Every 1 min | Running |
| Delivery notifications | Every 2 min | Running |
| Morning briefing | 6 AM ET daily | Running |
| Google reviews refresh | 3 AM ET daily | Running |
| Keepalive | Every 5 min | Running |

### Stripe
- **Production:** `sk_live_51R2Wvp...` — real charges
- **Staging:** `sk_test_51T5v8S...` — test mode
- Live webhook: `https://easternlm.com/api/webhooks/stripe` with `whsec_BuPcxp...`
- S710 card reader registered: `tmr_GblHvgBsGzJWnd` (POS_Office, online, IP 192.168.1.53)
- POS auto-detects real reader on startup, falls back to simulated in test mode

### RingCentral Integration (NEW)
- Webhook: `https://easternlm.com/api/webhooks/ringcentral`
- Subscription ID: `11e76f09-b79d-4c05-a6a9-d9ba93a90767` (Active, expires weekly — needs renewal cron)
- Events: presence (incoming calls) + SMS (incoming texts)
- Phone numbers connected: 631-874-6244, 631-366-8524, 631-395-1661
- **Incoming calls:** webhook fires → customer lookup → insert `incoming_calls` → Supabase Realtime → POS popup
- **Incoming SMS:** webhook fires → auto-create service lead → auto-reply via RingCentral API → POS popup
- **Known issue:** RC subscription expires every 7 days — needs a cron to auto-renew

### Google OAuth
- **Enabled** in Supabase (client_id: `463468274...`)
- Google Cloud Console redirect URI: `https://qnwevkgrhdrjqvvabcit.supabase.co/auth/v1/callback`
- Auth callback at `/auth/callback` handles code exchange + role routing
- Admin emails auto-granted admin role: adam@easternbuilding.supply, ronnie@easternbuilding.supply
- **Status:** Enabled but untested since nginx buffer fix. Needs manual test.

### Twilio / SMS
- Credentials configured in both containers
- **10DLC:** NOT approved yet. SMS sends to Twilio successfully but carriers block delivery to customer phones
- Privacy policy + Terms updated with exact Twilio-required 10DLC language
- SMS works for internal notifications (to yard phone 631-874-6244)

---

## New Database Tables (since March 18)

| Table | Rows | Purpose |
|-------|------|---------|
| `contractors` | 0 | Contractor roster for lead assignment |
| `incoming_calls` | 0 | RingCentral call/SMS events for POS popup |
| `lead_activity` | 2 | Activity timeline for service leads |
| `project_activity` | 0 | Activity timeline for projects |

### Modified Tables

**`service_leads`** — 19 new columns added:
- `lead_number`, `source`, `source_detail`, `assigned_contractors`, `assigned_at`
- `priority`, `estimated_value_cents`, `property_type`
- `site_visit_date`, `site_visit_notes`, `site_photos`
- `quote_id` (FK→quotes), `project_id` (FK→projects)
- `conversion_date`, `lost_reason`, `lost_competitor`
- `next_follow_up`, `follow_up_count`, `last_contacted_at`

**`delivery_assignments`** — 6 Phase 8 AI columns added:
- `suggested_route_order` (int, nullable)
- `backhaul_supplier_id` (uuid FK→suppliers, nullable)
- `backhaul_material`, `backhaul_yards`
- `auto_scheduled` (boolean, default false)
- `optimization_notes`

**`orders`** — expanded:
- `refunds` jsonb column added
- `payments` jsonb column (for split payments)
- Status constraint expanded: added `ready`, `picked_up`, `refunded`, `partially_refunded`
- Payment method constraint: added `split`, `paylink`, `pending`

**`quotes`** — expanded:
- `type` (material/service), `cc_surcharge_cents`, `delivery_address`
- `delivery_fee_cents`, `delivery_loads`, `source` (pos/admin/web)

**`products`** — expanded:
- `barcode`, `sku` columns added (indexed)
- All 126 WC image URLs migrated to Supabase Storage (`product-images` bucket)

**`suppliers`** — expanded:
- `pricelist_effective_date`, `pricelist_documents` columns

---

## POS Interface (/yard/register) — CURRENT STATE

### Layout
- **Dark theme** (zinc-950) — permanent, theme selector removed
- **Fixed three-panel layout:** left (products) | middle (tabs) | right (cart)
- **No site header/footer** — completely isolated `/yard/*` layout
- Browser tab title: "POS — ELM"
- Company logo in top-left of product grid
- Neon green POS icon in admin sidebar (opens POS in new tab)

### Product Tiles (fully rebuilt)
- **Name parsing:** splits product name into material (large font) + size spec
- Layout: image → material name → size | price row → bulk presets → qty controls
- Images: all migrated to Supabase Storage, showing correctly
- Red circle remove button (top-left) when item is in cart
- Green qty badge (top-right) when in cart
- Bulk presets: +3, +5, +10, +15, +20
- `−` / qty input / `+` row
- Categories wrap to multiple rows (no horizontal scroll)
- Thin orange scrollbars

### Header Bar Icons
1. **Company logo** (links to /yard/register)
2. **Search bar** (full product search)
3. **Calculator icon** (amber) — opens Material Calculator modal
4. **New Lead icon** (neon green) — opens New Service Lead modal

### Material Calculator Modal
- Multiple measurement areas (rectangle + circle shapes)
- Compaction slider 0–10%
- Product search (bulk materials only)
- Shows total sq ft, cubic yards, rounded order qty, cost
- "Add to Cart" button

### New Service Lead Modal
- Name, phone, email, address fields (pre-filled from POS customer)
- Google Maps satellite + street view links (open new tab)
- 11 service type buttons
- Timeline dropdown, priority selector
- Assign to Adam/Ronnie
- "Notify contractors via SMS" checkbox
- POSTs to `/api/admin/leads`

### Middle Column Tabs
- **Delivery** (default) — customer search, Google Maps embed, address autocomplete, route info, delivery fee with +/- buttons ($5 increments), access constraints checkboxes (Low Wires, Narrow Driveway, Soft Ground, Gated, Steep Approach, Backyard), delivery date/time/notes
- **Customer** — search + select, order history, edit customer, tags, tax exempt toggle
- **Transactions** — order history, date filter, click to view detail
- Calculator tab removed (replaced by modal)

### Delivery Tab Behaviors
- Customer search above map: search by name, phone, or address
- Selecting customer auto-fills all fields + fetches order history on Customer tab
- Address entry auto-calculates delivery fee (calls `/api/delivery/distance`)
- Address entry auto-flips Pickup → Delivery mode
- Access constraints passed to order payload
- Fee override: centered layout with large +/- buttons, "Set FREE" link

### Payment Methods
| Method | Status | Notes |
|--------|--------|-------|
| Card (Stripe Terminal) | **Working** | S710 auto-detected, simulated fallback in test mode |
| Cash | **Working** | Tendered/change dialog |
| COD | **Working** | Confirmation dialog, order marked 'confirmed' |
| Charge Account | **Working** | Balance check, confirmation dialog |
| Split Payment | **Built** | UI + API, untested with real S710 |
| Phone Order (card entry) | **Not built** | Planned, needs Stripe Elements |

### Receipt Printing
- `ReceiptPrinter` class with WebUSB ESC/POS support
- HTML fallback via iframe + window.print()
- **Delivery orders print TWO documents:** customer receipt (cut) → driver delivery ticket (cut)
- Driver ticket includes: customer name/phone, address, materials, access warnings, COD amount, delivery date/time
- Cash drawer kick via ESC/POS DK command
- **Not yet tested with physical NT-8360 printer** (WebUSB connect flow exists)

### Other POS Features
| Feature | Status |
|---------|--------|
| Hold Order | **Working** — saves to `held_orders`, resume loads back to cart |
| Quote button | **Working** — opens Quick Quote modal (cart items → SMS) |
| Customer lookup + save | **Working** — debounced phone lookup, auto-create on checkout |
| Barcode scanner (QD2430) | **Built** — search field auto-focuses, matches by barcode/SKU |
| End-of-day report | **Built** — `/pos/close` page |
| Offline mode | **Built** — service worker caches products |
| RingCentral caller ID | **Working** — popup on incoming call with customer info + "Add to Order" |

---

## Quote System — CURRENT STATE

### Creation Paths
1. **Admin Quick Quote** (sidebar button) — AI-generated from text prompt
2. **Admin /admin/quotes/new** — full AI quote creation page
3. **POS Quote button** — cart items → quick material quote modal → SMS
4. **Quick Quote API** (`/api/quotes/quick`) — no AI, formats cart items directly

### Quote Flow
- AI quotes use Claude Sonnet 4.6 via `/api/admin/quotes/generate`
- Material quotes skip AI entirely (sub-200ms)
- Quote saved with `public_token` (UUID) for shareable link
- Quote numbers: QT-YYYY-NNNN (auto-incrementing)

### Send Methods
- **SMS** via Twilio — blocked by 10DLC (carriers drop messages to customer phones)
- **Email** via Resend — working, sends from `orders@send.easternlm.com`
- Both can be sent simultaneously

### Customer Quote Page (/quote/[token])
- Branded public page (navy header, logo)
- Line items with totals
- Signature pad (canvas, touch-friendly)
- Accept → sign → pay deposit via Stripe
- Decline → reason selection
- **Status:** Built, functional for viewing. Stripe deposit checkout works.

### Follow-Up Sequence
- CX-3 follow-up system built
- Templates in `follow_up_templates` table (3 templates)
- Cron runs every 5 minutes
- **Actual delivery blocked by 10DLC** — follow-ups queue but SMS doesn't reach customers

---

## Lead Management — CURRENT STATE

### Schema
- `service_leads` table fully extended (39 columns)
- `lead_activity` table for timeline
- `contractors` table for contractor roster (0 rows — none added yet)
- `incoming_calls` table for RingCentral events

### Admin Lead Board (/admin/leads)
- **Kanban view** with drag-and-drop between status columns
- Columns: New, Assigned, Contacted, Site Visit, Quoted, Won, Lost
- Cards show: lead number, customer name, service type, town, priority, assigned to
- Click card → detail slide-over with full info + activity timeline
- Quick actions: Log Call, Send SMS, Create Quote, Reassign, Schedule Visit, Mark Won/Lost
- **Status:** Built, deployed, working on staging

### Lead Creation Paths
| Source | Status |
|--------|--------|
| Website form (/services/[slug]) | **Working** — existing form POSTs to `/api/leads` |
| POS New Lead modal | **Working** — neon green icon in search bar |
| Incoming SMS (RingCentral) | **Working** — auto-creates lead from inbound text |
| Admin dashboard | **Working** — /admin/leads has create button |
| Phone call (manual) | Via POS New Lead modal |

### Contractor Notification
- `contractors` table exists but **no contractors added yet**
- SMS notification code built — sends lead details to matching contractors
- "Notify contractors via SMS" checkbox in POS lead modal
- **Not functional until contractors are added to the system**

### Mobile /field Interface
- **Not built yet** — planned for LEAD-2 prompt

---

## Customer Flow — CURRENT STATE

### Web Checkout → Customer Linking
- **Working** — Stripe webhook handler calls `ensureCustomerLinked()`
- Finds existing customer by phone (primary) or email (secondary)
- Creates new customer if no match
- Links `customer_id` on the order
- Updates customer stats (total_orders, total_spent_cents, last_order_at)

### POS → Customer Linking
- **Working** — `/api/pos/checkout` creates/links customers
- Phone lookup on delivery tab auto-attaches customer
- Customer saved on checkout if not already in DB

### Customer Tags
- Auto-computed: `repeat`, `high-value` (>$1000)
- Product-based tags from order items: `mulch-buyer`, `gravel-buyer`, `mason-buyer`
- WC import tags preserved from original 14,681 order history

### Customer Types
- `customer_type` column: **NOT added yet** (planned: homeowner/contractor/business/service_lead)

---

## Admin Dashboard — CURRENT STATE

### Sidebar (rebuilt)
- **4 collapsible sections:** Sales, Operations, Catalog, Finance
- Real-time badge counts on Orders, Follow-Ups, Invoices
- Quick Quote button at top
- Neon green POS icon (opens /yard/register in new tab)
- Settings + Sign Out pinned at bottom

**Sales:** Dashboard, Customers, Quotes, Campaigns, Leads, Contractors, Follow-Ups, Gallery
**Operations:** Orders, Dispatch, Projects, Maintenance
**Catalog:** Products, Bulk Editor, Inventory
**Finance:** Invoices, Charge Accounts, Statements, Upload (OCR), Scan (Mobile), Suppliers, Transactions

### Settings Page (consolidated tabs)
| Tab | Status |
|-----|--------|
| General | **Working** — SettingsForm (all delivery/fee settings) |
| Trucks | **Working** — TruckList (moved from /admin/trucks) |
| Fee Cache | **Working** — CacheList (moved from /admin/cache) |
| Staff | **Working** — create PIN accounts, reset PINs, activate/deactivate |
| Marketing | Stub — "coming soon" |
| Operations | Stub — "coming soon" |

### Page Status
| Page | Status |
|------|--------|
| /admin (Dashboard) | **Working** — stats, recent orders, leads, quick actions |
| /admin/customers | **Working** — search, order history |
| /admin/quotes | **Working** — list, create, edit, send |
| /admin/quotes/[id] | **Working** — full editor, send SMS/email |
| /admin/leads | **Working** — kanban board |
| /admin/operations | **Working** — orders list with filters |
| /admin/operations/dispatch | **Working** — dispatch board with truck columns |
| /admin/products | **Working** — product list |
| /admin/products/bulk | **Working** — bulk editor |
| /admin/inventory | **Working** — stock tracking |
| /admin/suppliers | **Working** — supplier list with price lists |
| /admin/suppliers/[id] | **Working** — products, invoices, price list tabs |
| /admin/invoices | **Working** — invoice dashboard |
| /admin/invoices/upload | **Working** — document scanner upload |
| /admin/settings | **Working** — tabbed interface |
| /admin/accounts | **Working** — charge account list |
| /admin/statements | **Working** — statement list |
| /admin/projects | **Working** — project list (0 projects) |
| /admin/contractors | **Built** — empty (no contractors added) |
| /admin/campaigns | **Built** — campaign list (0 campaigns) |
| /admin/follow-ups | **Built** — follow-up list (0 sent — 10DLC blocks delivery) |
| /admin/gallery | **Working** — 12 gallery projects |
| /admin/maintenance | **404** — page not built |
| /admin/transactions | **404** — page not built |

---

## Supplier System — CURRENT STATE

### Suppliers (4 total)
1. Premium Mulch & Materials Inc. (test supplier)
2. East Coast Mines & Materials — 22 products (sand, gravel, bluestone, topsoil, compost)
3. CMM Sitework Inc — 9 products (mulch, topsoil, RCA, sand — dual pricing pickup/delivered)
4. Chief Bricks LLC — 43 products (belgian blocks, cobblestones, bricks, granite steps, treads, patterns)

### Supplier Products: 74 total
- Price list view on supplier detail page
- Product linking (FK to `products` table) — UI dropdown built but **no products linked yet**
- Invoice OCR: Anthropic Claude vision extraction working
- Price history tracking on confirm

---

## Known Bugs & Issues

### Critical
1. **SMS to customers blocked** — 10DLC not approved. Twilio accepts messages but carriers drop them. Affects: quotes, follow-ups, order notifications, lead auto-reply. Internal SMS (to yard phone) works.
2. **RingCentral subscription expires weekly** — needs cron to auto-renew (currently manual)

### Functional Issues
3. **Google OAuth untested** — enabled in Supabase but not confirmed working after nginx buffer fix
4. **Admin /admin/maintenance** — 404, page not built
5. **Admin /admin/transactions** — 404, page not built
6. **Receipt printer** — WebUSB code built but untested with physical NT-8360
7. **Split payments** — UI and API built but untested with real Stripe Terminal
8. **Phone order card entry** — not built (needs Stripe Elements)
9. **Supplier → product linking** — dropdown exists but no products actually linked
10. **Customer type field** — not added to schema yet (homeowner/contractor/business)
11. **Google reviews on homepage** — may still be broken (was fixed but not re-verified)

### UI/UX Issues
12. **Mobile /field interface** — not built yet
13. **No contractors in system** — contractor notification code ready but no data
14. **POS product name parsing** — works for most products but may mismatch on unusual names
15. **Flatbed delivery removed from cart** — code still has dead variables (flatbedDelivery=false, no UI)

### Data
16. **0 projects** — project system built but no quotes have been converted to orders→projects
17. **0 campaigns** — campaign system built, no campaigns created
18. **0 follow-ups sent** — follow-up engine runs but 10DLC blocks delivery
19. **0 incoming_calls logged** — RingCentral webhook registered but call detection needs testing

---

## File Structure — New Files Since March 18

```
NEW API ROUTES:
src/app/api/admin/badges/route.ts
src/app/api/admin/staff/route.ts
src/app/api/admin/staff/[id]/route.ts
src/app/api/pos/customers/search/route.ts
src/app/api/webhooks/ringcentral/route.ts
src/app/api/yard/login/pin/route.ts

NEW COMPONENTS:
src/components/pos/caller-id-popup.tsx        — RingCentral incoming call/SMS popup
src/components/pos/material-calculator.tsx     — Multi-area calculator modal
src/components/pos/new-lead-modal.tsx          — Service lead creation from POS
src/components/pos/product-grid.tsx            — Rebuilt product tile grid
src/components/pos/checkout/checkout-overlay.tsx
src/components/pos/checkout/split-payment-panel.tsx
src/components/pos/refund/refund-modal.tsx
src/components/admin/settings/settings-tabs.tsx
src/components/admin/settings/staff-tab.tsx

NEW PAGES:
src/app/admin/contractors/page.tsx
src/app/admin/inventory/page.tsx
src/app/admin/projects/page.tsx
src/app/yard/login/page.tsx
src/app/yard/register/page.tsx
src/app/yard/scan/page.tsx

SCRIPTS:
scripts/ringcentral-setup.ts
```

---

## Row Counts (as of March 20, 2026)

| Table | Count | Change |
|-------|-------|--------|
| customers | 2,677 | — |
| order_history (WC) | 14,681 | — |
| orders (new) | 18 | +4 |
| order_items | 32 | +5 |
| products | 311 | — |
| categories | 21 | — |
| quotes | 13 | +11 |
| service_leads | 1 | +1 |
| suppliers | 4 | +3 |
| supplier_products | 74 | +74 |
| delivery_assignments | 2 | +2 |
| lead_activity | 2 | +2 |
| town_pages | 65 | — |
| accounts | 1 | — |
| trucks | 3 | — |
| gallery_projects | 12 | — |
