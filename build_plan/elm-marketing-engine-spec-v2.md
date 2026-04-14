# Master Architecture Specification: ELM Marketing Engine
**Version:** 2
**SOW Reference:** elm-marketing-engine-sow.md
**Date:** 2026-04-04
**Status:** LOCKED
**Review Cycle:** 1 — Gemini 3.1 Pro, Grok 4, Perplexity — 25/25 findings approved

---

## 1. System Architecture Overview

### 1.1 Architecture Diagram

```mermaid
graph TB
    subgraph "Admin UI (existing ELM web platform)"
        ADMIN["/admin Marketing Tab"]
        CAPTURE["/yard/capture PWA<br/>Upload-only device tokens"]
    end

    subgraph "Orchestration Layer"
        ORCH["ORCHESTRATOR<br/>Claude Agent SDK<br/>Express + WebSocket"]
        BULLMQ["BullMQ Queues<br/>(Redis-backed, durable)"]
        CRON["node-cron<br/>Brand-scoped tasks"]
    end

    subgraph "Specialist Agents"
        COPY["COPY Agent<br/>Content Writer"]
        IMAGE["IMAGE Agent<br/>Visual Pipeline"]
        SOC["SOC Agent<br/>Social Publisher"]
        INTEL["INTEL Agent<br/>Analytics + Monitoring"]
    end

    subgraph "Data Layer (existing Supabase)"
        DB[("PostgreSQL<br/>mktg_* tables<br/>RLS deny-all on anon")]
        STORAGE[("Supabase Storage<br/>marketing-assets")]
        VAULT[("Encrypted Env / Vault<br/>API tokens")]
    end

    subgraph "External APIs"
        META["Meta Graph API<br/>IG + FB"]
        GBP["Google Business<br/>Profile API"]
        GA4["Google Analytics 4"]
        CLAUDE["Anthropic API<br/>Claude Sonnet 4.6"]
        RC["RingCentral SMS"]
    end

    ADMIN -->|approve/reject/command| ORCH
    CAPTURE -->|upload photos (scoped token)| STORAGE
    CRON -->|per-brand task creation| ORCH
    ORCH -->|enqueue durable jobs| BULLMQ
    BULLMQ -->|consume + ack| COPY
    BULLMQ -->|consume + ack| IMAGE
    BULLMQ -->|consume + ack| SOC
    BULLMQ -->|consume + ack| INTEL
    SOC -->|publish (idempotent)| META
    SOC -->|publish (idempotent)| GBP
    SOC -->|token from| VAULT
    INTEL -->|fetch metrics| GA4
    ORCH -->|prompt guard → classify| CLAUDE
    COPY -->|generate| CLAUDE
    IMAGE -->|generate| CLAUDE
    SOC -->|generate| CLAUDE
    INTEL -->|generate| CLAUDE
```

### 1.2 Technology Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Agent Runtime | Claude Agent SDK | 0.2.71 (TypeScript) | Anthropic's official agent framework; pin version in package.json |
| Agent Model | Claude Sonnet 4.6 | claude-sonnet-4-6 | Cost-effective; Opus reserved for escalation only |
| Task Queue | **BullMQ** | 5.x | Durable Redis-backed queues with ack, retry, dead-letter; replaces raw pub/sub (S-002) |
| Orchestrator HTTP | Express.js | 5.x | Lightweight HTTP + WebSocket |
| Real-time | WebSocket (ws) | 8.x | Push to admin dashboard |
| Scheduling | node-cron | 3.x | In-process; loops over active brands per job (S-014) |
| Database | Supabase PostgreSQL | 15 | Existing ELM project; `mktg_` prefix; RLS deny-all on anon (S-007) |
| File Storage | Supabase Storage | — | `marketing-assets` bucket |
| Secrets | Encrypted env vars | — | All third-party tokens in `.env` only; never in DB rows (S-001) |
| Admin UI | Next.js 16 (existing) | 16 | New Marketing tab in `/admin` |
| Container Runtime | Docker Compose | — | `/opt/elm-marketing/`; explicit mem_limit per container (S-010) |

### 1.3 Deployment Topology

```
Hetzner VPS (5.161.88.134) — CX32: 4 vCPU / 8GB RAM
├── /opt/hosthampton/           ← HH stack (unchanged)
├── /opt/easternlm-web/         ← ELM web platform (unchanged)
├── /opt/elm-marketing/          ← Marketing Engine
│   ├── docker-compose.yml
│   ├── .env                    (all API tokens here, NOT in DB)
│   ├── db/migrations/          (numbered SQL, tested locally first)
│   └── services/
│       ├── orchestrator/       (port 3200, mem_limit: 512m, cpus: 0.75)
│       ├── copy/               (mem_limit: 256m, cpus: 0.5)
│       ├── image/              (mem_limit: 384m, cpus: 0.5 — Sharp needs more)
│       ├── soc/                (mem_limit: 256m, cpus: 0.5)
│       └── intel/              (mem_limit: 256m, cpus: 0.5)
└── nginx — add api.easternlm.com/marketing → orchestrator:3200
```

**Docker Compose resource controls (S-010):**
All containers: `restart: unless-stopped`. Total memory budget: ~1.7GB allocated (well within 2GB headroom). Orchestrator gets extra for BullMQ management + Sharp spikes queued to off-peak.

**Redis configuration (S-002):**
Shared `hampton_redis` instance. Added: `maxmemory 512mb`, `maxmemory-policy allkeys-lru`. ELM keys prefixed `elm:`. BullMQ queues: `elm:queue:copy`, `elm:queue:image`, `elm:queue:soc`, `elm:queue:intel`.

---

## 2. Database Schema

### 2.1 Schema Strategy

All marketing tables in `public` schema with `mktg_` prefix. All tables have `updated_at timestamptz DEFAULT now()` with auto-update trigger (S-015). RLS enabled on all `mktg_*` tables with deny-all policy for anon/authenticated roles; service role key bypasses (S-007).

**Migration discipline (S-007):** Numbered SQL files in `db/migrations/`. All migrations tested against local Supabase clone before VPS deploy. Nightly `pg_dump` of `mktg_*` tables to Cloudflare R2 via cron.

### 2.2 Custom Enums

```sql
CREATE TYPE mktg_content_status AS ENUM (
  'draft', 'pending_approval', 'approved', 'rejected',
  'scheduled', 'published', 'archived', 'failed'
);

CREATE TYPE mktg_publish_mode AS ENUM ('draft_only', 'live');  -- S-004

CREATE TYPE mktg_content_pillar AS ENUM (
  'product_showcase', 'delivery_action', 'seasonal_tips',
  'before_after', 'local_community', 'promotions', 'behind_scenes'
);

-- Phase 1 platforms only; Phase 2 adds 'email', 'sms', 'blog' via ALTER TYPE
CREATE TYPE mktg_platform AS ENUM (
  'instagram_feed', 'instagram_story', 'instagram_reel',
  'facebook_page', 'facebook_story',
  'google_business_profile', 'nextdoor'
);  -- S-025: Phase 2 values removed from v1

CREATE TYPE mktg_task_status AS ENUM (
  'pending', 'in_progress', 'completed', 'failed', 'cancelled'
);

CREATE TYPE mktg_task_priority AS ENUM ('urgent', 'high', 'normal', 'low');

CREATE TYPE mktg_agent_name AS ENUM (
  'orchestrator', 'copy', 'image', 'soc', 'intel',
  'outbound', 'list', 'paid'
);

CREATE TYPE mktg_asset_type AS ENUM (
  'raw_upload', 'formatted_instagram', 'formatted_facebook',
  'formatted_gbp', 'formatted_story', 'ai_generated'
);

CREATE TYPE mktg_review_platform AS ENUM ('google', 'yelp', 'facebook');  -- S-016

CREATE TYPE mktg_review_response_status AS ENUM (
  'pending', 'approved', 'posted', 'skipped'
);  -- S-016

CREATE TYPE mktg_competitor_type AS ENUM (
  'competitor', 'local_landscaper', 'lifestyle', 'community'
);  -- S-016

CREATE TYPE mktg_calendar_status AS ENUM (
  'draft', 'approved', 'in_progress', 'completed'
);  -- S-016

CREATE TYPE mktg_auth_role AS ENUM ('owner', 'approver', 'uploader');  -- S-003
```

### 2.3 Table Definitions

#### `mktg_brands`
**Implements:** F-002, F-003, S-001, S-004

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | uuid | PK | gen_random_uuid() | |
| slug | text | UNIQUE NOT NULL | | 'eastern-lm', 'my-gravel-guy' |
| name | text | NOT NULL | | Display name |
| voice_rules | jsonb | NOT NULL | '{}' | Brand voice constraints |
| content_pillars | jsonb | NOT NULL | '[]' | Pillar configs with weights |
| platform_accounts | jsonb | NOT NULL | '{}' | **Opaque account IDs only** — no tokens (S-001) |
| publish_mode | mktg_publish_mode | NOT NULL | 'draft_only' | Gates SOC publishing (S-004) |
| hashtag_sets | jsonb | NOT NULL | '{}' | Per-platform hashtag groups |
| posting_schedule | jsonb | NOT NULL | '{}' | Per-platform day/time schedule |
| geo_target | jsonb | | | Service area definition |
| is_active | boolean | NOT NULL | true | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**ON DELETE:** RESTRICT (prevent accidental brand deletion) — S-024

#### `mktg_agent_memory`
**Implements:** F-002, S-013

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | uuid | PK | gen_random_uuid() | |
| brand_id | uuid | FK mktg_brands ON DELETE RESTRICT NOT NULL | | |
| namespace | text | NOT NULL | | 'brand', 'services', 'competitors', 'negative_examples' (S-013) |
| key | text | NOT NULL | | Memory key |
| value | jsonb | NOT NULL | | |
| version | integer | NOT NULL | 1 | |
| updated_by | mktg_agent_name | | | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Unique:** `(brand_id, namespace, key)`

#### `mktg_agent_tasks`
**Implements:** F-001, F-016, S-006

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | uuid | PK | gen_random_uuid() | |
| brand_id | uuid | FK mktg_brands NOT NULL | | |
| assigned_agent | mktg_agent_name | NOT NULL | | |
| task_type | text | NOT NULL | | |
| status | mktg_task_status | NOT NULL | 'pending' | |
| priority | mktg_task_priority | NOT NULL | 'normal' | |
| input | jsonb | NOT NULL | '{}' | |
| output | jsonb | | | |
| parent_task_id | uuid | FK mktg_agent_tasks ON DELETE CASCADE | | |
| depends_on | uuid[] | | | |
| started_at | timestamptz | | | |
| completed_at | timestamptz | | | |
| error | text | | | |
| retry_count | integer | NOT NULL | 0 | S-006 |
| token_usage | jsonb | | | {input_tokens, output_tokens, cost_cents, includes_retries} (S-006) |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Indexes:** `(status, priority)`, `(brand_id, assigned_agent, status)`

#### `mktg_content_library`
**Implements:** F-004, F-007, S-015, S-021

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | uuid | PK | gen_random_uuid() | |
| brand_id | uuid | FK mktg_brands ON DELETE RESTRICT NOT NULL | | |
| content_type | text | NOT NULL | | 'social_caption', 'review_response' |
| pillar | mktg_content_pillar | | | |
| platform | mktg_platform | NOT NULL | | |
| title | text | | | |
| body | text | NOT NULL | | |
| hashtags | text[] | | | |
| cta_url | text | | | Validated against allowlist (S-008) |
| status | mktg_content_status | NOT NULL | 'draft' | |
| approved_by | text | | | |
| approved_at | timestamptz | | | |
| rejected_reason | text | | | Fed back to agent memory (S-013) |
| calendar_id | uuid | FK mktg_content_calendar ON DELETE CASCADE | | |
| task_id | uuid | FK mktg_agent_tasks | | |
| image_asset_ids | uuid[] | | | |
| metadata | jsonb | | '{}' | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Indexes:** `(brand_id, status, created_at DESC)` (S-022), `(calendar_id)`
**Auto-archive:** Cron moves `pending_approval` older than 14 days to `archived` (S-021)

#### `mktg_social_posts`
**Implements:** F-009, F-010, S-009

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | uuid | PK | gen_random_uuid() | |
| brand_id | uuid | FK mktg_brands NOT NULL | | |
| content_id | uuid | FK mktg_content_library NOT NULL | | |
| platform | mktg_platform | NOT NULL | | |
| idempotency_key | text | UNIQUE NOT NULL | | Hash of (content_id, platform, scheduled_for) — S-009 |
| platform_post_id | text | | | |
| published_at | timestamptz | | | |
| scheduled_for | timestamptz | | | |
| status | mktg_content_status | NOT NULL | 'scheduled' | |
| engagement | jsonb | | '{}' | |
| engagement_fetched_at | timestamptz | | | |
| error | text | | | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Indexes:** `(scheduled_for, status)`, `(brand_id, platform, published_at DESC)` (S-022)
**Idempotency (S-009):** Before publish, check `idempotency_key` exists with `platform_post_id` set. If yes, skip.

#### `mktg_image_assets`
**Implements:** F-005, F-006

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | uuid | PK | gen_random_uuid() | |
| brand_id | uuid | FK mktg_brands NOT NULL | | |
| asset_type | mktg_asset_type | NOT NULL | | |
| storage_path | text | NOT NULL | | |
| public_url | text | | | |
| original_asset_id | uuid | FK mktg_image_assets | | |
| width | integer | | | |
| height | integer | | | |
| file_size_bytes | integer | | | |
| mime_type | text | | | |
| tags | text[] | | '{}' | |
| uploaded_by | text | | | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Indexes:** `(brand_id, asset_type)`, GIN on `(tags)`

#### `mktg_content_calendar`
**Implements:** F-007, F-008

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | uuid | PK | gen_random_uuid() | |
| brand_id | uuid | FK mktg_brands NOT NULL | | |
| week_start | date | NOT NULL | | |
| plan | jsonb | NOT NULL | | |
| pillar_counts | jsonb | NOT NULL | '{}' | |
| status | mktg_calendar_status | NOT NULL | 'draft' | S-016: proper enum |
| rotation_warning | boolean | NOT NULL | false | S-018: set if pillar rules failed after 3 retries |
| generated_by_task_id | uuid | FK mktg_agent_tasks | | |
| approved_by | text | | | |
| approved_at | timestamptz | | | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Unique:** `(brand_id, week_start)` — S-022 index

#### `mktg_reviews`
**Implements:** F-011, F-014

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | uuid | PK | gen_random_uuid() | |
| brand_id | uuid | FK mktg_brands NOT NULL | | |
| platform | mktg_review_platform | NOT NULL | | S-016: enum |
| platform_review_id | text | | | |
| author_name | text | | | |
| rating | integer | CHECK (rating BETWEEN 1 AND 5) | | |
| review_text | text | | | |
| review_date | timestamptz | | | |
| response_draft | text | | | |
| response_status | mktg_review_response_status | NOT NULL | 'pending' | S-016: enum |
| response_posted_at | timestamptz | | | |
| sentiment | text | | | |
| order_id | uuid | | | FK to orders table for solicitation tracking (S-005) |
| solicitation_sent | boolean | NOT NULL | false | Prevents duplicate SMS (S-005) |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

#### `mktg_competitor_accounts`
**Implements:** F-012

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | uuid | PK | gen_random_uuid() | |
| brand_id | uuid | FK mktg_brands NOT NULL | | |
| platform | text | NOT NULL | | 'instagram', 'facebook' |
| account_handle | text | NOT NULL | | |
| account_type | mktg_competitor_type | NOT NULL | | S-016: enum |
| notes | text | | | |
| is_active | boolean | NOT NULL | true | |
| created_at | timestamptz | NOT NULL | now() | |

#### `mktg_competitor_snapshots` — NEW (S-017)
**Implements:** F-012

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | uuid | PK | gen_random_uuid() | |
| account_id | uuid | FK mktg_competitor_accounts NOT NULL | | |
| snapshot_date | date | NOT NULL | | |
| follower_count | integer | | | |
| avg_engagement | numeric(5,2) | | | |
| top_content_types | jsonb | | | |
| data | jsonb | | '{}' | Full snapshot payload |
| created_at | timestamptz | NOT NULL | now() | |

**Unique:** `(account_id, snapshot_date)`

#### `mktg_analytics_snapshots`
**Implements:** F-013

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | uuid | PK | gen_random_uuid() | |
| brand_id | uuid | FK mktg_brands NOT NULL | | |
| snapshot_type | text | NOT NULL | | |
| period_start | date | NOT NULL | | |
| period_end | date | NOT NULL | | |
| data | jsonb | NOT NULL | | |
| summary | text | | | |
| task_id | uuid | FK mktg_agent_tasks | | |
| created_at | timestamptz | NOT NULL | now() | |

#### `mktg_device_tokens` — NEW (S-003)
**Implements:** F-006

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | uuid | PK | gen_random_uuid() | |
| token_hash | text | UNIQUE NOT NULL | | bcrypt hash of device token |
| label | text | NOT NULL | | 'Adam iPhone', 'Yard Tablet' |
| role | mktg_auth_role | NOT NULL | 'uploader' | |
| brand_id | uuid | FK mktg_brands NOT NULL | | |
| is_active | boolean | NOT NULL | true | |
| last_used_at | timestamptz | | | |
| created_at | timestamptz | NOT NULL | now() | |

---

## 3. API Design

### 3.1 Conventions
- **Base URL:** `https://api.easternlm.com/marketing`
- **Auth:** Role-scoped Bearer tokens (S-003): owner token, approver token, upload-only device token
- **Input validation:** All payloads validated with zod schemas; reject unknown keys (S-008)
- **Prompt guard:** `/api/chat` runs sanitization + LLM self-check before intent classification (S-008)

### 3.2 Orchestrator Endpoints

All endpoints from v1 retained. **Additions:**

#### `POST /api/chat` — Updated (S-008)
Added: zod schema validation (length <2000, no control chars). Prompt injection guard: sanitize → LLM self-check → classify intent. Reject + log security event on detection.

#### `POST /api/content/:id/approve` — Updated (S-004)
Added: gates on `mktg_brands.publish_mode`. If `draft_only`, status moves to `approved` but NOT `scheduled`. Shows info message.

#### Admin draft-only controls — NEW (S-004)
- `GET /api/content/:id/download-assets` — Returns zip of formatted images
- `POST /api/content/:id/copy-caption` — Returns plain text for clipboard
- `POST /api/content/:id/mark-published-manually` — Sets status to `published` with `platform_post_id = 'manual'`

### 3.3 Webhook Handlers — NEW (S-005)

#### `POST /api/events/delivery-completed`
**Purpose:** ELM web platform calls when delivery is marked complete
**Auth:** Shared secret in `X-Webhook-Secret` header
```json
// Request
{ "order_id": "uuid", "customer_phone": "+16315551234", "customer_name": "John", "brand_id": "uuid" }
```
**Processing:** Orchestrator schedules OUTBOUND task (Phase 2) or SOC review solicitation task for 2 hours post-delivery. Sets `solicitation_sent = true` on `mktg_reviews` row. Checks flag before sending to prevent duplicates.

---

## 4. Component Architecture

### 4.1 Agent Service Structure

Same structure as v1. **Phase 2 stubs added (S-023):**

```
services/
├── orchestrator/     ← Phase 1A (Express + BullMQ + cron)
├── copy/             ← Phase 1B (content generation)
├── image/            ← Phase 1B (photo formatting via Sharp)
├── soc/              ← Phase 1C (Meta Graph API + GBP + reviews)
├── intel/            ← Phase 1C (GA4 + competitor monitoring)
├── outbound/         ← Phase 2 stub: Resend email + RingCentral SMS campaigns
└── list/             ← Phase 2 stub: CRM segmentation from contacts/orders tables
```

### 4.2 BullMQ Agent Pattern — Updated (S-002)

Replaces Redis pub/sub with durable queues:

```typescript
import { Worker, Queue } from "bullmq";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";  // S-025: proper schemas

const connection = { host: "hampton_redis", port: 6379 };
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Define task input schema (S-025)
const CaptionTaskSchema = z.object({
  brand_id: z.string().uuid(),
  platform: z.enum(["instagram_feed", "facebook_page", "google_business_profile"]),
  pillar: z.enum(["product_showcase", "delivery_action", "seasonal_tips",
    "before_after", "local_community", "promotions", "behind_scenes"]),
  topic: z.string().max(500),
  image_asset_ids: z.array(z.string().uuid()).optional(),
});

// BullMQ worker with acknowledgment and retry
const worker = new Worker("elm:queue:copy", async (job) => {
  const task = CaptionTaskSchema.parse(job.data);
  const brand = await loadBrandContext(task.brand_id);
  const negativeExamples = await loadNegativeExamples(task.brand_id); // S-013

  // Check token budget before execution (S-006)
  const budgetKey = `elm:budget:${new Date().toISOString().slice(0,10)}:copy`;
  const spent = parseInt(await redis.get(budgetKey) || "0");
  if (spent > DAILY_BUDGET_CENTS * 0.8) {
    throw new Error("TOKEN_BUDGET_80_PERCENT");
  }

  for await (const event of query({
    prompt: buildTaskPrompt(task, brand, negativeExamples),
    options: {
      model: "sonnet",
      systemPrompt: buildSystemPrompt("copy", brand),
      maxTurns: 10,
    }
  })) {
    if (event.type === "result") {
      await supabase.from("mktg_content_library").insert({
        brand_id: task.brand_id,
        body: event.content,
        platform: task.platform,
        pillar: task.pillar,
        status: "pending_approval",
        task_id: job.id,
      });

      // Track token usage (S-006)
      const cost = calculateCost(event.usage);
      await redis.incrby(budgetKey, cost);
      await redis.expire(budgetKey, 86400);
    }
  }
}, {
  connection,
  concurrency: 1,
  limiter: { max: 5, duration: 60000 },  // S-020: rate limiting
});

// Dead letter handling (S-002)
worker.on("failed", async (job, err) => {
  if (job.attemptsMade >= 3) {
    await supabase.from("mktg_agent_tasks").update({
      status: "failed", error: err.message
    }).eq("id", job.id);
  }
});
```

### 4.3 Orchestrator Architecture — Updated

**Cron Schedule (S-014: brand-scoped):**
All crons loop over active brands:
```typescript
cron.schedule("0 5 * * 1", async () => { // Mon 5 AM
  const brands = await getActiveBrands();
  for (const brand of brands) {
    await calendarQueue.add("generate_weekly_calendar", { brand_id: brand.id });
  }
});
```

| Time | Task | Agent(s) |
|------|------|----------|
| Mon 5:00 AM | Generate weekly content calendar (per brand) | ORCH → COPY, IMAGE |
| Daily 6:00 AM | Check new reviews (per brand) | SOC |
| Daily 7:00/10:00/14:00 | Publish scheduled posts (per brand, if publish_mode=live) | SOC |
| Fri 4:00 PM | Weekly analytics + competitor digest (per brand) | INTEL |
| Daily 8:00 PM | Fetch post engagement metrics (per brand) | SOC |
| Daily 11:00 PM | Auto-archive pending content >14 days (S-021) | ORCH |
| Daily midnight | Token expiry check → Resend email + admin banner if <7 days (S-001) | ORCH |

**Pillar rotation (S-018):** Max 3 retries. On failure, set `rotation_warning = true` on calendar and alert owner via WebSocket.

**Token budget (S-006):** Orchestrator checks Redis budget key before dispatching any task. At 80% daily cap, non-critical tasks (analytics, competitor monitoring) are delayed. At 100%, only owner-initiated commands proceed.

**Rejection feedback (S-013):** On content rejection, orchestrator appends `{body, rejected_reason, platform, pillar}` to `mktg_agent_memory` namespace `negative_examples` for the brand. COPY system prompt includes last 5 negative examples.

### 4.4 Admin UI: Marketing Tab — Updated

**Sub-sections (S-011: empty/loading/error states specified per section):**

1. **Dashboard** — Skeleton loaders during fetch. Empty state: "No content generated yet — the first batch will arrive Monday 6 AM." Error state: retry button + RingCentral SMS alert if orchestrator unreachable.
2. **Content Queue** — Max 20 items per view (S-021). Bulk approve with confirmation modal. Per-item: Approve / Edit (preserves diff history) / Reject (reason required). **Draft-only mode (S-004):** "Copy Caption" + "Download Assets" + "Mark Published Manually" buttons. Persistent banner: "Auto-publishing paused — Meta API review pending."
3. **Calendar** — Weekly grid. Rotation warning badge if `rotation_warning` is true.
4. **Analytics** — Latest INTEL report. Summary-only for competitor digest (S-021).
5. **Reviews** — Pending responses with approve/edit/skip.
6. **Settings** — Brand config, competitor accounts, posting schedule. Agent liveness indicators (S-019). Token expiry warning banner (S-001). "Connect Google Account" if GBP service account not configured.

**First-run experience (S-011):** Bootstrap checklist on first visit: verify brand memory loaded, API connectivity (Claude, Meta if live, GA4), storage bucket exists, at least 5 photos uploaded. Block main dashboard until critical dependencies satisfied.

### 4.5 Photo Capture PWA — Updated (S-003)

**Auth:** Upload-only device token (NOT admin password). Token generated in admin Settings panel, stored in `mktg_device_tokens`. Grants only POST to `marketing-assets` storage bucket.

**Offline support (S-011):** Service Worker with Workbox. IndexedDB caches photo + metadata if offline. Background Sync auto-retries upload when `navigator.onLine` returns true. Visual indicator: "Saved — will upload when connected."

---

## 5. Integration Requirements

### 5.1 Meta Graph API — Updated (S-001, S-004, S-009, S-020)

- **Token storage:** `.env` only via `META_ACCESS_TOKEN`. Never in database. SOC reads at execution time.
- **Token rotation (S-001):** Daily cron calls `fb_exchange_token` to rotate. 7-day expiry warning via Resend + admin banner.
- **Publish mode (S-004):** SOC checks `mktg_brands.publish_mode` before any API call. If `draft_only`, content saved with `status='approved'` but not published.
- **Idempotency (S-009):** Before POST, check `mktg_social_posts.idempotency_key`. If `platform_post_id` exists, skip.
- **Rate limiting (S-020):** Per-provider BullMQ queue with `limiter: { max: 50, duration: 3600000 }`. Exponential backoff with jitter on 429 responses. Circuit breaker: 5 consecutive failures → pause 15 min.

### 5.2 Google Business Profile API — Updated (S-012)

- **Auth:** Service account (not user OAuth). JSON key in `GOOGLE_GBP_SERVICE_ACCOUNT_JSON` env var.
- **Rate limiting (S-020):** Same pattern as Meta. 10 QPM cap in BullMQ limiter.

### 5.3 Google Analytics 4 — Unchanged

Service account auth. `GOOGLE_GA4_SERVICE_ACCOUNT_JSON` env var.

### 5.4 Anthropic API (Claude) — Unchanged

`ANTHROPIC_API_KEY` env var. Sonnet 4.6. Budget: $30-60/month estimated.

### 5.5 Redis / BullMQ — Updated (S-002)

- **Queues:** `elm:queue:copy`, `elm:queue:image`, `elm:queue:soc`, `elm:queue:intel`
- **Budget keys:** `elm:budget:YYYY-MM-DD:agent` with 24hr TTL
- **Config:** `maxmemory 512mb`, `maxmemory-policy allkeys-lru`
- **Message schema (S-002):** Versioned envelopes with `{version: 1, brand_id, task_type, payload}`. Schema validated on consume. Dead-letter queue for deserialization failures.

### 5.6 RingCentral — NEW (S-012)

- **Purpose:** SMS alerts to admin (errors, token expiry, queue notifications) + review solicitation (F-014)
- **Auth:** JWT via existing `RINGCENTRAL_JWT_TOKEN` env var (shared with ELM web platform)
- **Endpoint:** `/restapi/v1.0/account/~/extension/~/sms`
- **From numbers:** 631-874-6244 (transactional), 631-366-8524 (marketing)
- **Rate limits:** 50 SMS/min (ample)
- **Failure handling:** Retry 2x with backoff; log failure but don't block workflow

---

## 6-10. Build Phases, Security, Error Handling, Testing, Traceability

All sections from v1 retained with the following updates incorporated inline:
- Phase 1A includes BullMQ setup, migration tooling, RLS policies, device token table
- Phase 1B includes pillar retry limits, offline PWA, first-run bootstrap
- Phase 1C includes idempotency keys, draft-only mode, circuit breakers, delivery webhook
- Phase 1D includes empty states, bulk action modals, auto-archive, approval queue budget
- Security section updated with role-scoped auth, prompt guards, zod validation
- Error handling adds agent liveness states, dead-letter queues, SMS alerting
- Testing adds brand rule linting tests, idempotency verification, budget enforcement tests
- Traceability matrix updated with all new tables and endpoints

---

*Specification v2 — LOCKED. Ready for build-prompter handoff.*
