# Phase 03: COPY + IMAGE Agents — ELM Marketing Engine

## 1. Context

Phase 02 complete. Orchestrator is live with BullMQ dispatch, cron scheduling, intent classification, approval gates, and REST API. It dispatches tasks to `elm:queue:copy` and `elm:queue:image` — but nothing consumes them yet.

**What exists:** Full orchestrator with API, BullMQ queues, brand context loader, pillar rotation, token budget tracking.

**What you are building:** Two specialist agents that consume tasks from BullMQ, generate content via Claude Agent SDK, and persist results to Supabase.
- **COPY** — Generates platform-specific social captions, weekly content calendars
- **IMAGE** — Formats uploaded photos for each platform spec using Sharp

**What you are NOT building:** SOC (publishing), INTEL (analytics), admin UI, or external API calls.

**Spec reference:** Sections 4.1, 4.2 (BullMQ agent pattern), 2.3 (content_library, image_assets tables)

---

## 2. Objective & Deliverables

When this phase is complete: orchestrator dispatches a "generate weekly calendar" task → COPY generates 15+ captions across 7 pillars for 3 platforms → IMAGE formats any linked photos into platform-optimized versions → all content appears in `mktg_content_library` with status `pending_approval` → orchestrator broadcasts `content_ready` via WebSocket.

---

## 3. Implementation Instructions

### COPY Agent

#### Task 1: BullMQ worker setup

In `services/copy/src/index.ts`, replace the stub with a BullMQ `Worker`:
- Worker name: `elm:queue:copy`
- Concurrency: 1 (one task at a time)
- Rate limiter: `{ max: 5, duration: 60000 }` (max 5 jobs per minute)
- Connection: `REDIS_URL` env var

Follow the canonical pattern from spec Section 4.2 exactly — including budget check before Claude call, token usage tracking, and error handling.

#### Task 2: System prompt builder

In `services/copy/src/prompts.ts`:
- `buildSystemPrompt(brand: BrandContext): string` — Builds the COPY agent's identity:
  - "You are COPY, the content writer for [brand.name]."
  - Inject voice rules (always/never lists)
  - Inject content pillar descriptions
  - Inject product catalog summary (bulk materials with names)
  - Inject negative examples (last 5 rejections) per S-013
  - Platform-specific instructions (IG: 2200 char max, 30 hashtags max; FB: no hashtag limit; GBP: 1500 chars, include CTA link)
  - "NEVER mention founding year or time-in-business. ALWAYS say 'family-owned'."
  - "NEVER use '/yd' — ALWAYS use 'per cu. yard'."
  - "Mulch is DOUBLE GROUND, not triple ground."

#### Task 3: Task handlers

In `services/copy/src/handlers.ts`:

**`generate_weekly_calendar`:**
- Input: `{ brand_id, week_start }`
- Load brand context + posting schedule + pillar weights
- Prompt Claude to generate a 7-day content plan: for each day, specify platform, pillar, topic, suggested image tags
- Validate pillar rotation (call orchestrator's validation logic or inline it)
- If rotation fails after 3 retries: save with `rotation_warning = true`
- Save to `mktg_content_calendar` table
- Then: for each planned post, create a `write_caption` subtask back to own queue

**`write_caption`:**
- Input: `{ brand_id, platform, pillar, topic, image_tags, calendar_id }`
- Load brand context + negative examples
- Prompt Claude to write one caption for the specified platform + pillar + topic
- Include in prompt: "Write for [platform]. Topic: [topic]. Pillar: [pillar]. Use brand voice. Include relevant hashtags. If this is for GBP, include a CTA link to the relevant town delivery page."
- Save to `mktg_content_library` with status `pending_approval`, linked to `calendar_id`
- After save, dispatch `format_images` task to IMAGE queue if `image_tags` are provided

**`write_review_response`:**
- Input: `{ brand_id, review_id }`
- Load the review from `mktg_reviews` + brand context
- Prompt Claude: "Write a professional, grateful response to this [rating]-star review. Brand voice: [rules]. Keep under 500 characters."
- Save response draft to `mktg_reviews.response_draft`, set `response_status = 'pending'`

#### Task 4: Claude Agent SDK integration

Use the SDK's `query()` function for all Claude calls:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const event of query({
  prompt: taskPrompt,
  options: {
    model: "sonnet",
    systemPrompt: buildSystemPrompt(brand),
    maxTurns: 5,  // Content generation is single-turn; keep low
  }
})) {
  if (event.type === "result") {
    return event.content;
  }
}
```

Track token usage from event metadata and report back to orchestrator via Redis: `INCRBY elm:budget:YYYY-MM-DD:copy [cost_cents]`

#### Task 5: Error handling and completion

- On success: update `mktg_agent_tasks` status to `completed`, set `output` JSONB, set `token_usage`
- On failure after 3 retries: update status to `failed`, set `error` message
- Publish completion to Redis: `elm:task_complete` with `{ task_id, agent: "copy", status }`
- BullMQ handles retry automatically via job options

---

### IMAGE Agent

#### Task 6: BullMQ worker setup

In `services/image/src/index.ts`:
- Worker name: `elm:queue:image`
- Concurrency: 1
- Rate limiter: `{ max: 3, duration: 60000 }` (Sharp is CPU-intensive)

#### Task 7: Image formatting pipeline

In `services/image/src/formatter.ts`:
- Use `sharp` for all image operations
- Input: raw photo from Supabase Storage (`marketing-assets` bucket)
- Outputs (3 formatted versions per raw upload):
  - `formatted_instagram`: 1080x1080 center-crop, slight brightness boost, ELM watermark bottom-right
  - `formatted_facebook`: 1200x630 center-crop
  - `formatted_gbp`: 1200x900 center-crop
- Watermark: simple text overlay "Eastern LM" in semi-transparent white, positioned bottom-right
- Save all formatted versions to Supabase Storage with paths like `formatted/instagram/[original_id].jpg`
- Create `mktg_image_assets` rows for each formatted version, linked to `original_asset_id`

#### Task 8: Task handlers

In `services/image/src/handlers.ts`:

**`format_images`:**
- Input: `{ brand_id, content_id, image_tags, platform }`
- Query `mktg_image_assets` for recent raw uploads matching `image_tags` (GIN index search)
- If no matching uploads: log warning, skip formatting (content publishes as text-only)
- For each matching raw image: run formatting pipeline for the target platform
- Update `mktg_content_library.image_asset_ids` with the formatted asset IDs

**`format_single`:**
- Input: `{ brand_id, asset_id, platforms[] }`
- Format one specific uploaded photo for specified platforms
- Used when a new photo is uploaded via `/yard/capture` PWA

#### Task 9: Claude SDK for image prompt optimization (optional, used in Phase 2 for AI generation)

For Phase 1, IMAGE only does Sharp formatting — no AI image generation. But structure the agent to accept future `generate_ai_image` task type that would use Replicate. Leave a stub:
```typescript
case "generate_ai_image":
  // Phase 2: Replicate FLUX integration
  throw new Error("AI image generation not available until Phase 2");
```

---

## 4. Acceptance Criteria

- [ ] Orchestrator dispatches `generate_weekly_calendar` → COPY consumes from BullMQ and generates a calendar with 15+ entries
- [ ] Calendar saved to `mktg_content_calendar` with correct `pillar_counts`
- [ ] COPY auto-dispatches `write_caption` for each calendar entry
- [ ] Each caption saved to `mktg_content_library` with correct `platform`, `pillar`, `status = 'pending_approval'`
- [ ] Brand voice rules enforced: captions never use "/yd", always use "per cu. yard"
- [ ] Negative examples included in system prompt (verify with a test rejection → regeneration)
- [ ] IMAGE formats a raw uploaded photo into 3 platform versions (IG 1080x1080, FB 1200x630, GBP 1200x900)
- [ ] Formatted images saved to Supabase Storage with correct paths
- [ ] `mktg_image_assets` rows created with correct `asset_type` and `original_asset_id` FK
- [ ] Content library rows updated with `image_asset_ids` linking to formatted assets
- [ ] Token usage tracked: `redis-cli GET elm:budget:YYYY-MM-DD:copy` returns non-zero value
- [ ] Failed tasks retry 3 times then mark as `failed` in `mktg_agent_tasks`
- [ ] `elm:task_complete` messages published on Redis for every completed task

---

## 5. Constraints

- COPY generates content but does NOT publish — that's SOC (Phase 04)
- IMAGE formats existing photos but does NOT generate AI images — that's Phase 2
- All content starts as `pending_approval` — NEVER auto-approve
- Token budget: if COPY hits 80% daily budget, complete current task but skip remaining caption tasks
- Image processing: if Sharp takes >30 seconds per image, log warning (may need to reduce resolution)
- Do NOT call any external API except Anthropic (via Claude Agent SDK)

---

## 6. Completion Protocol

```
## Phase 03 Completion Report

### Files Created/Modified
[list]

### COPY Agent Tests
- Calendar generation: [pass/fail] — [X] posts generated
- Caption quality: [sample caption with brand rule compliance check]
- Pillar distribution: [pillar counts from generated calendar]
- Rejection feedback: [verified negative examples appear in prompt]

### IMAGE Agent Tests
- Format pipeline: [pass/fail] — [X] versions created from 1 upload
- File sizes: [original vs formatted for each platform]
- Watermark: [present/absent]
- Storage paths: [sample paths]

### Token Usage
- COPY daily spend: [X] cents for calendar + [N] captions
- Projected monthly: [estimate]

### Warnings for Phase 04
[any issues]
```

---

## 7. Execution

**Recommended:** `claude --max-turns 75`
**Resume:** `claude --continue`
**Progress file:** `PHASE-03-PROGRESS.md`
