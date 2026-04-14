# Phase 01: Database Schema & Brand Bootstrap — ELM Marketing Engine

## 1. Context

Phase 00 is complete. The `elm-marketing` repo exists with 5 running Docker containers connected to shared Redis and Supabase. No agent logic exists yet — containers are stubs.

**What exists:**
- `elm-marketing` repo with Docker Compose at `/opt/elm-marketing/`
- 5 containers running: orchestrator (healthcheck), copy, image, soc, intel
- Shared Redis via `hampton_net` with `elm:` prefix
- Supabase project with existing ELM tables (products, orders, contacts, etc.)

**What you are building:**
- 9 custom enums, 12 tables, indexes, RLS policies, and seed data for the marketing engine
- Migration files in `db/migrations/`
- Brand memory bootstrap with full Eastern LM context
- Device token table for photo capture auth

**What you are NOT building:** Agent code, API endpoints, or UI. Schema and data only.

**Spec reference:** elm-marketing-engine-spec-v2.md, Section 2 (entire section)

---

## 2. Objective & Deliverables

When this phase is complete, all `mktg_*` tables exist in the live Supabase database with RLS deny-all policies, the Eastern LM brand row is seeded with voice rules and content pillars, and agent memory is bootstrapped with product catalog, services, towns, and competitor account seeds.

---

## 3. Implementation Instructions

### Task 1: Create migration file `db/migrations/001_enums.sql`

Create ALL enums from spec Section 2.2:
- `mktg_content_status` (8 values)
- `mktg_publish_mode` (2 values: draft_only, live)
- `mktg_content_pillar` (7 values)
- `mktg_platform` (7 values — Phase 1 only, NO blog/email/sms)
- `mktg_task_status` (5 values)
- `mktg_task_priority` (4 values)
- `mktg_agent_name` (8 values including future outbound/list/paid)
- `mktg_asset_type` (6 values)
- `mktg_review_platform` (3 values)
- `mktg_review_response_status` (4 values)
- `mktg_competitor_type` (4 values)
- `mktg_calendar_status` (4 values)
- `mktg_auth_role` (3 values: owner, approver, uploader)

### Task 2: Create migration file `db/migrations/002_tables.sql`

Create ALL tables from spec Section 2.3, in FK dependency order:

1. `mktg_brands` — with `publish_mode` column defaulting to `'draft_only'`
2. `mktg_agent_memory` — UNIQUE(brand_id, namespace, key)
3. `mktg_device_tokens` — for photo capture auth
4. `mktg_agent_tasks` — with `retry_count`, `token_usage` columns
5. `mktg_content_calendar` — UNIQUE(brand_id, week_start), `rotation_warning` boolean
6. `mktg_content_library` — FK to calendar, status enum
7. `mktg_social_posts` — with `idempotency_key` UNIQUE constraint
8. `mktg_image_assets` — GIN index on tags
9. `mktg_reviews` — with `order_id`, `solicitation_sent` columns
10. `mktg_competitor_accounts`
11. `mktg_competitor_snapshots` — UNIQUE(account_id, snapshot_date)
12. `mktg_analytics_snapshots`

**Every table must have:**
- `id uuid PK DEFAULT gen_random_uuid()`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- Appropriate `ON DELETE CASCADE` (calendar/task children) or `ON DELETE RESTRICT` (brand_id FKs)

**Required indexes (spec Section 2.3 + S-022):**
- `mktg_agent_tasks`: `(status, priority)`, `(brand_id, assigned_agent, status)`
- `mktg_content_library`: `(brand_id, status, created_at DESC)`, `(calendar_id)`
- `mktg_social_posts`: `(scheduled_for, status)`, `(brand_id, platform, published_at DESC)`
- `mktg_image_assets`: `(brand_id, asset_type)`, GIN on `(tags)`
- `mktg_content_calendar`: implicit from UNIQUE
- `mktg_reviews`: `(brand_id, response_status)`
- `mktg_analytics_snapshots`: `(brand_id, snapshot_type, period_start)`

### Task 3: Create migration file `db/migrations/003_triggers.sql`

Create an `updated_at` auto-update trigger function and apply it to ALL `mktg_*` tables:

```sql
CREATE OR REPLACE FUNCTION mktg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to each table:
CREATE TRIGGER set_updated_at BEFORE UPDATE ON mktg_brands
  FOR EACH ROW EXECUTE FUNCTION mktg_set_updated_at();
-- ... repeat for all 12 tables
```

### Task 4: Create migration file `db/migrations/004_rls.sql`

Enable RLS on all `mktg_*` tables with deny-all for anon and authenticated roles:

```sql
ALTER TABLE mktg_brands ENABLE ROW LEVEL SECURITY;
-- No policies = deny all for non-service-role access
-- Repeat for all 12 tables
```

The service role key (used by agents) bypasses RLS automatically.

### Task 5: Create migration file `db/migrations/005_seed_brand.sql`

Seed the Eastern LM brand row. Reference spec Section 2.4 for the full voice_rules and content_pillars JSONB. Key values from project knowledge:

```sql
INSERT INTO mktg_brands (slug, name, publish_mode, voice_rules, content_pillars, platform_accounts, hashtag_sets, posting_schedule, geo_target, is_active)
VALUES (
  'eastern-lm',
  'Eastern Landscape & Mason Supply',
  'draft_only',
  '{
    "always": ["family-owned", "per cu. yard", "cu yds", "Add to Order", "double ground", "Locally sourced"],
    "never": ["/yd", "cart", "Add to Cart", "established in", "founding year", "triple ground standard", "responsibly sourced", "BNPL surcharge"],
    "tone": "Professional but approachable. Knowledgeable about materials. Local pride. Suffolk County community voice.",
    "location": "110 Frowein Road, Center Moriches, NY 11934. Serving Suffolk County from Patchogue to Southampton.",
    "phone": "(631) 874-6244",
    "mulch_note": "Mulch is double ground standard. Triple ground (black and natural only) available by request, 20-yard minimum — never listed as standard."
  }'::jsonb,
  '[
    {"slug": "product_showcase", "name": "Material of the Week", "weight": 2, "description": "Feature one product with use cases, pricing context, project ideas"},
    {"slug": "delivery_action", "name": "Delivery in Action", "weight": 2, "description": "Truck shots, driver POV, just delivered X yards to [town]"},
    {"slug": "seasonal_tips", "name": "Seasonal Tips", "weight": 2, "description": "Spring mulch prep, fall driveway grading, when to order fill"},
    {"slug": "before_after", "name": "Before/After Transformations", "weight": 2, "description": "Customer project transformations using our materials"},
    {"slug": "local_community", "name": "Suffolk County Community", "weight": 1, "description": "Local events, partnerships with landscapers, community features"},
    {"slug": "promotions", "name": "Deals & Availability", "weight": 1, "description": "Multi-load discounts, same-day delivery, new stock arrivals"},
    {"slug": "behind_scenes", "name": "Behind the Scenes", "weight": 1, "description": "Yard operations, truck maintenance, loading process, new stock"}
  ]'::jsonb,
  '{"instagram": {"account_id": ""}, "facebook": {"page_id": ""}, "gbp": {"location_id": ""}}'::jsonb,
  '{
    "instagram": ["#LongIslandLandscaping", "#SuffolkCounty", "#BulkMaterials", "#LandscapeSupply", "#CenterMoriches", "#Mulch", "#Gravel", "#Topsoil", "#MasonSupply", "#DeliveryDay"],
    "facebook": ["#EasternLM", "#LandscapeSupply", "#SuffolkCountyNY", "#BulkDelivery"],
    "gbp": []
  }'::jsonb,
  '{
    "instagram_feed": {"days": ["mon","wed","fri"], "times": ["10:00","14:00"]},
    "facebook_page": {"days": ["tue","thu"], "times": ["09:00","12:00"]},
    "google_business_profile": {"days": ["mon"], "times": ["08:00"]}
  }'::jsonb,
  '{"center": "Center Moriches, NY", "radius_miles": 35, "towns": "Patchogue to Southampton"}'::jsonb,
  true
);
```

### Task 6: Create migration file `db/migrations/006_seed_memory.sql`

Seed `mktg_agent_memory` with the Eastern LM brand context. Get the `brand_id` via subquery `(SELECT id FROM mktg_brands WHERE slug = 'eastern-lm')`.

**Required memory entries:**

Namespace `brand`:
- Key `voice_rules` — Full voice document (expand from the brand row for agent prompt injection)
- Key `products_bulk` — 16 bulk materials: Screened Topsoil, 50/50 Premium Compost, Ultimate Jet Black Mulch, Natural LI Mulch, Hamptons Chocolate Brown, Red Mulch, RCA #1, RCA #2, LI Pea Gravel 3/8", LI Natural Gravel 3/4", Crushed Bluestone, Crushed Whitestone, Pocono River Rock, Crushed Burgundy, LI Concrete Sand, LI Screened Mason Sand
- Key `products_popular_nonbulk` — Top 10 non-bulk products from the catalog
- Key `services` — Landscaping, Masonry, Driveway Installation, Property Maintenance
- Key `delivery` — Same-day cutoff 11 AM, truck fleet (Small Dump, Medium Dump, Tri-Axle), delivery area, fee formula context
- Key `business_hours` — Mon-Sat hours, seasonal adjustments

Namespace `content`:
- Key `pillar_rules` — Max 2 posts same pillar/week, min 1 each pillar per 2 weeks
- Key `platform_specs` — IG feed: 1080x1080, IG story: 1080x1920, FB: 1200x630, GBP: 1200x900
- Key `caption_guidelines` — Platform-specific length limits, hashtag counts, CTA patterns
- Key `negative_examples` — Empty array initially (populated by rejection feedback loop)

Namespace `geography`:
- Key `towns_tier_a` — Top 10 towns: Center Moriches, Shirley, Mastic, East Moriches, Moriches, Eastport, Patchogue, Bellport, Manorville, Brookhaven
- Key `towns_tier_b` — Remaining towns from the 65-town dataset
- Key `gallery_projects` — Summary of gallery projects by town (pull from existing `gallery_projects` table)

Namespace `competitors`:
- Key `seed_accounts` — Initial list of 10-15 Instagram/Facebook accounts to monitor

### Task 7: Seed competitor accounts

Insert 10-15 rows into `mktg_competitor_accounts` with the brand_id. Include a mix of:
- 3-4 competitor supply yards (search for Long Island landscape supply Instagram accounts)
- 3-4 local landscaper accounts (customers who post their work)
- 2-3 Hamptons lifestyle/home accounts
- 1-2 Suffolk County community pages

Use placeholder handles — Adam will verify and update them.

### Task 8: Create Supabase Storage bucket

Via Supabase dashboard or API, create a `marketing-assets` bucket with:
- Public access disabled (assets served via signed URLs)
- Max file size: 10MB
- Allowed mime types: `image/jpeg`, `image/png`, `image/webp`, `image/heic`

### Task 9: Test migrations locally

```bash
# If Supabase CLI is available:
supabase db reset  # runs migrations against local
supabase db diff   # verify schema matches expected

# If not, test manually:
# Connect to Supabase SQL editor
# Run each migration file in order
# Verify tables, enums, indexes, RLS, and seed data
```

### Task 10: Deploy to production Supabase

Run all migration files against the live Supabase project `qnwevkgrhdrjqvvabcit` in order. Verify:
- All 12 `mktg_*` tables exist
- All enums exist
- RLS is enabled on all tables
- Brand row exists with correct data
- Agent memory has all required keys
- Competitor accounts are seeded
- Storage bucket exists
- Existing ELM tables (products, orders, contacts) are UNMODIFIED

---

## 4. Acceptance Criteria

- [ ] 6 migration files exist in `db/migrations/` and are numbered in order
- [ ] All 13 enums created (verify: `SELECT typname FROM pg_type WHERE typtype = 'e' AND typname LIKE 'mktg_%'`)
- [ ] All 12 tables created (verify: `SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'mktg_%'`)
- [ ] RLS enabled on all 12 tables (verify: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'mktg_%'`)
- [ ] updated_at triggers on all 12 tables (verify: UPDATE a row, check updated_at changed)
- [ ] `mktg_brands` has 1 row with slug 'eastern-lm' and publish_mode 'draft_only'
- [ ] `mktg_agent_memory` has 10+ rows across brand/content/geography/competitors namespaces
- [ ] `mktg_competitor_accounts` has 10+ rows
- [ ] `marketing-assets` storage bucket exists
- [ ] Existing ELM tables are unchanged (spot check: products count, orders count)
- [ ] All FKs reference correct tables with correct ON DELETE behavior
- [ ] Composite indexes exist on content_library, social_posts, agent_tasks

---

## 5. Constraints

- Do NOT modify any existing ELM tables (products, orders, contacts, etc.)
- Do NOT disable RLS on any existing tables
- All migrations must be idempotent where possible (use IF NOT EXISTS)
- Brand platform_accounts must contain ONLY opaque IDs, NEVER tokens (S-001)
- Run migrations during off-peak hours if possible (tables are new so lock risk is minimal, but be cautious)

---

## 6. Completion Protocol

```
## Phase 01 Completion Report

### Migration Files Created
[list each file]

### Database Verification
- Tables created: [count] / 12
- Enums created: [count] / 13
- RLS enabled: [count] / 12
- Triggers active: [count] / 12

### Seed Data
- Brand rows: [count]
- Agent memory entries: [count]
- Competitor accounts: [count]

### Storage
- marketing-assets bucket: [created/verified]

### Existing Data Integrity
- Products count: [same as before]
- Orders count: [same as before]

### Warnings for Phase 02
[any issues]
```

---

## 7. Execution

**Recommended:** `claude --max-turns 50`
**Resume:** `claude --continue`
**Progress file:** `PHASE-01-PROGRESS.md`
