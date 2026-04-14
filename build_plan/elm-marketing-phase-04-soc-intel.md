# Phase 04: SOC + INTEL Agents — ELM Marketing Engine

## 1. Context

Phase 03 complete. COPY generates weekly calendars and captions. IMAGE formats photos. Content sits in `mktg_content_library` with `pending_approval` status. Nothing publishes yet — no one monitors analytics or competitors.

**What you are building:**
- **SOC** — Social publishing agent: publishes approved content to IG/FB/GBP, monitors reviews, drafts responses, fetches post engagement, handles review solicitation
- **INTEL** — Analytics/monitoring agent: pulls GA4 metrics, monitors competitor accounts, generates weekly reports + competitor digests

**Spec reference:** Sections 4.2 (agent pattern), 5.1 (Meta Graph API), 5.2 (GBP API), 5.3 (GA4), 5.6 (RingCentral)

---

## 2. Objective & Deliverables

When complete: approved content publishes to IG/FB/GBP (or queues in draft-only mode), engagement metrics are fetched 24hrs post-publish, new Google reviews trigger response drafts, INTEL produces weekly analytics and competitor reports.

---

## 3. Implementation Instructions

### SOC Agent

#### Task 1: BullMQ worker consuming `elm:queue:soc`
Same pattern as COPY. Concurrency: 1. Rate limiter: `{ max: 10, duration: 60000 }`.

#### Task 2: Meta Graph API client
In `services/soc/src/meta.ts`:
- `publishToInstagram(content, imageUrl, accessToken)` — Container + publish two-step flow
- `publishToFacebook(content, imageUrl, accessToken)` — Page post with photo
- `fetchPostEngagement(postId, accessToken)` — Returns {likes, comments, shares, reach, impressions}
- Token loaded from env var `META_ACCESS_TOKEN` (never from DB — S-001)
- **Idempotency (S-009):** Before publishing, query `mktg_social_posts` for existing `idempotency_key`. If `platform_post_id` already set, skip.
- **Publish mode gate (S-004):** Check `mktg_brands.publish_mode`. If `draft_only`, save post record with status `approved` but do NOT call API. Log "Draft-only mode — skipping publish."
- **Rate limiting (S-020):** Wrap all API calls in a per-provider client with exponential backoff + jitter. Circuit breaker: 5 consecutive failures → pause 15 min → retry.
- **Error handling:** On failure, set `mktg_social_posts.status = 'failed'`, set `error` column. Retry once after 5 min via BullMQ. On second failure, alert orchestrator.

#### Task 3: GBP API client
In `services/soc/src/gbp.ts`:
- `publishToGBP(content, imageUrl, ctaUrl, serviceAccountJson)` — Create LocalPost via Business Profile API
- Service account JSON from env var `GOOGLE_GBP_SERVICE_ACCOUNT_JSON` (S-012)
- CTA URL: link to relevant `/delivery/[town]` page based on content metadata
- Same idempotency, publish mode, and error handling patterns as Meta

#### Task 4: Review monitoring
In `services/soc/src/reviews.ts`:
- `checkNewReviews(brandId)` — Called by daily 6 AM cron
- For Phase 1: poll Google Business Profile reviews via API (or manual import if API not ready)
- New reviews → insert into `mktg_reviews` with sentiment analysis
- Dispatch `write_review_response` task to COPY queue
- **Review solicitation (S-005):** When `delivery_completed` webhook fires, orchestrator creates a task. SOC sends review request SMS via RingCentral 2 hours later. Check `solicitation_sent` flag before sending. Uses marketing number (631-366-8524).

#### Task 5: Engagement metrics fetcher
- `fetchEngagement(brandId)` — Called by daily 8 PM cron
- Query `mktg_social_posts` WHERE `published_at > now() - interval '48 hours'` AND `engagement_fetched_at IS NULL`
- For each: call Meta/GBP API to get engagement, update `engagement` JSONB and `engagement_fetched_at`

#### Task 6: RingCentral SMS client
In `services/soc/src/ringcentral.ts`:
- `sendSMS(to, message, fromNumber)` — Send via RingCentral REST API
- JWT auth from `RINGCENTRAL_JWT_TOKEN` env var
- Used for: review solicitation (F-014) and admin alerts (S-019)
- Retry 2x with backoff; log failure but don't block workflow

#### Task 7: Task handler dispatch
```typescript
switch (task.task_type) {
  case "publish_scheduled_posts": await publishScheduled(task);
  case "check_new_reviews": await checkNewReviews(task.brand_id);
  case "fetch_post_engagement": await fetchEngagement(task.brand_id);
  case "send_review_solicitation": await sendReviewSolicitation(task);
}
```

---

### INTEL Agent

#### Task 8: BullMQ worker consuming `elm:queue:intel`
Concurrency: 1. Rate limiter: `{ max: 5, duration: 60000 }`.

#### Task 9: GA4 client
In `services/intel/src/ga4.ts`:
- Use `googleapis` library with service account auth
- `fetchWeeklyMetrics(propertyId, startDate, endDate)` — sessions, users, page views, top pages, traffic sources, social referrals
- Service account JSON from env var `GOOGLE_GA4_SERVICE_ACCOUNT_JSON`
- Same circuit breaker pattern (S-020)

#### Task 10: Competitor monitoring
In `services/intel/src/competitors.ts`:
- `monitorCompetitors(brandId)` — Load active accounts from `mktg_competitor_accounts`
- For Phase 1: use public profile data accessible without API (follower counts, recent post counts, content themes). Note: Instagram Graph API for competitor data requires their consent — so this is public-data scraping via web or manual import.
- Store snapshots in `mktg_competitor_snapshots` (S-017)
- Use Claude to analyze patterns: "Based on these competitor posts, what content types, hooks, and seasonal themes are performing well?"

#### Task 11: Weekly analytics report
- `generateWeeklyReport(brandId)` — Called by Friday 4 PM cron
- Fetch: GA4 metrics, social post engagement from `mktg_social_posts`, competitor snapshots
- Prompt Claude: "Generate a weekly marketing performance report for [brand]. Include: top performing posts, engagement trends, website traffic from social, competitor insights, recommendations for next week."
- Save to `mktg_analytics_snapshots` with `snapshot_type = 'weekly_report'`

#### Task 12: Competitor digest
- `generateCompetitorDigest(brandId)` — Can be weekly or on-demand
- Summarize competitor activity: "Before/after posts got 4x engagement this week. Time-lapse reels trending. [Competitor X] posted 3x more than usual about spring mulch."
- Save to `mktg_analytics_snapshots` with `snapshot_type = 'competitor_digest'`

---

## 4. Acceptance Criteria

- [ ] SOC publishes an approved post to each platform (or logs draft-only skip if `publish_mode = 'draft_only'`)
- [ ] `mktg_social_posts` row created with `platform_post_id` set (or null in draft mode)
- [ ] Idempotency: re-running publish for same content+platform+time does NOT create duplicate post
- [ ] Engagement metrics fetched and stored in `mktg_social_posts.engagement` JSONB
- [ ] New review inserted into `mktg_reviews` → `write_review_response` dispatched to COPY
- [ ] Review solicitation SMS sent via RingCentral after delivery webhook, with `solicitation_sent` flag preventing duplicate
- [ ] INTEL produces weekly analytics report with GA4 data saved to `mktg_analytics_snapshots`
- [ ] INTEL produces competitor digest with snapshot data saved to `mktg_competitor_snapshots`
- [ ] Circuit breaker: 5 consecutive Meta API failures → 15 min pause logged
- [ ] All token usage tracked and reported to orchestrator budget

---

## 5. Constraints

- Do NOT implement AI image generation (Replicate) — Phase 2
- Do NOT implement email/SMS campaigns (OUTBOUND agent) — Phase 2
- Meta Graph API calls require app review approval. If not yet approved, SOC MUST operate in draft-only mode — log "Meta API not available" and save posts with status `approved`.
- Competitor monitoring is limited to publicly available data — do NOT use any authenticated API endpoints to access competitor private data
- All external API tokens from env vars only, NEVER from database

---

## 6. Completion Protocol

```
## Phase 04 Completion Report

### SOC Agent
- Meta publish: [pass/fail/draft-only]
- GBP publish: [pass/fail/draft-only]
- Idempotency: [verified/not verified]
- Review monitoring: [pass/fail]
- Review solicitation SMS: [pass/fail]
- Engagement fetch: [pass/fail]
- Circuit breaker: [tested/not tested]

### INTEL Agent
- GA4 metrics: [pass/fail]
- Competitor monitoring: [pass/fail — X accounts, X snapshots]
- Weekly report: [pass/fail — sample summary]
- Competitor digest: [pass/fail — sample digest]

### Warnings for Phase 05
[any issues]
```

---

## 7. Execution

**Recommended:** `claude --max-turns 75`
**Progress file:** `PHASE-04-PROGRESS.md`
