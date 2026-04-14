# Phase 06: Integration Wiring & Draft-Only Mode — ELM Marketing Engine

## 1. Context

Phases 02-05 complete. All agents are running, admin UI exists on the feature branch, photo capture works. But the pieces aren't fully connected: SOC may still be in draft-only mode, the delivery webhook isn't firing from actual order completions, and the end-to-end flow hasn't been tested as a complete loop.

**What you are building:** The integration wiring that connects all components end-to-end. This phase touches BOTH repos.

**Spec reference:** Sections 5.1 (Meta API), 5.2 (GBP), 3.3 (webhooks), S-004 (draft-only)

---

## 2. Objective & Deliverables

When complete: the full content lifecycle works end-to-end — cron generates calendar → COPY writes captions → IMAGE formats photos → content appears in admin → owner approves → SOC publishes (or queues in draft-only mode) → engagement fetched → analytics reported. Delivery webhook fires on real order completions. Everything observable from the admin dashboard.

---

## 3. Implementation Instructions

### Task 1: End-to-end content lifecycle test

On the `elm-marketing` repo:
- Trigger the Monday 5 AM cron manually: `POST /api/chat` with "generate this week's content calendar"
- Verify: orchestrator → COPY generates calendar → COPY writes 15+ captions → IMAGE formats linked photos → all content in `mktg_content_library` with `pending_approval`
- Approve 3 items via API
- Verify: SOC picks up scheduled posts → publishes (or logs draft-only skip) → `mktg_social_posts` rows created
- Trigger engagement fetch → verify `engagement` JSONB populated
- Trigger weekly report → verify `mktg_analytics_snapshots` row created
- Fix any broken links in the chain.

### Task 2: Meta API activation (if app review approved)

If Facebook App review is approved:
- Update `.env` with production `META_ACCESS_TOKEN`, `META_PAGE_ID`, `META_IG_ACCOUNT_ID`
- Update `mktg_brands.platform_accounts` with real account IDs
- Set `publish_mode = 'live'` on the brand row
- Test: approve a post → SOC publishes → verify post appears on IG/FB
- Set up token auto-rotation cron (daily call to `fb_exchange_token`)

If NOT yet approved:
- Verify draft-only mode works completely: approve → SOC skips publish → admin UI shows "Copy Caption" + "Download Assets"
- Document what needs to happen when approval comes through

### Task 3: GBP activation

- Configure service account in `.env` (`GOOGLE_GBP_SERVICE_ACCOUNT_JSON`)
- Update `mktg_brands.platform_accounts` with GBP location ID
- Test: approve a GBP post → SOC publishes LocalPost with CTA link to `/delivery/[town]`
- Verify post visible in Google Maps listing

### Task 4: Delivery webhook wiring (easternLM repo)

On `feature/marketing-ui` branch:
- Find the existing delivery completion logic (where order status changes to "delivered")
- Add HTTP POST to marketing engine webhook: `POST /api/events/delivery-completed` with order details
- Add `DELIVERY_WEBHOOK_SECRET` and `MARKETING_API_URL` to ELM web platform `.env`
- Test: mark a delivery complete → webhook fires → orchestrator creates review solicitation task → SOC sends SMS via RingCentral 2 hours later
- Verify `solicitation_sent` flag prevents duplicate SMS

### Task 5: Disable existing review request cron

In the ELM web platform, the existing daily 3 AM Google review request cron needs to be coordinated:
- Add env var `REVIEW_REQUESTS_VIA_MARKETING_ENGINE=true`
- When true, existing cron skips review requests (marketing engine handles it)
- When false, existing cron continues (fallback if marketing engine is down)

### Task 6: WebSocket integration verification

Open admin dashboard (staging). Trigger content generation. Verify:
- `content_ready` event appears in real-time (no page refresh)
- `task_completed` events update task status
- Agent liveness updates when containers restart

---

## 4. Acceptance Criteria

- [ ] Full content lifecycle: cron → calendar → captions → photos → approval → publish (or draft-only) → engagement → report
- [ ] Delivery webhook fires on real order completion in ELM web platform
- [ ] Review solicitation SMS sent 2 hours after delivery (or scheduled)
- [ ] No duplicate review requests (existing cron disabled when engine active)
- [ ] GBP posts include CTA link to correct town page
- [ ] Admin dashboard receives real-time WebSocket events
- [ ] Draft-only mode: "Copy Caption" and "Download Assets" work correctly
- [ ] If Meta API live: post appears on actual IG/FB accounts

---

## 5-7. Constraints, Completion, Execution

**Constraints:** This phase touches both repos. Commit separately. Test staging before any production changes. Do NOT merge `feature/marketing-ui` to `main` yet.

**Recommended:** `claude --max-turns 50`
**Progress file:** `PHASE-06-PROGRESS.md`

---
---
---

# Phase 07: Hardening & Observability — ELM Marketing Engine

## 1. Context

Phase 06 complete. End-to-end flow works. This phase hardens the system for production reliability.

**What you are building:** Security hardening, monitoring, alerting, backup, and operational controls.

**Spec reference:** Sections 7 (Security), 8 (Error Handling & Observability), S-006, S-008, S-019, S-020

---

## 2. Objective & Deliverables

When complete: all inputs validated with zod, prompt injection guard active, token budget enforced with real pause logic, circuit breakers on all external APIs, RingCentral SMS alerting on errors, nightly database backup, Redis memory monitoring, container resource limits verified.

---

## 3. Implementation Instructions

### Task 1: Zod schemas for ALL API inputs (S-008)

Create `services/orchestrator/src/schemas.ts`:
- Schema for every API endpoint request body
- Schema for WebSocket connection params
- Schema for delivery webhook payload
- URL allowlist validator: only allow `easternlm.com` domain in CTA URLs
- Reject unknown keys on all endpoints

### Task 2: Prompt injection guard hardening (S-008)

In `services/orchestrator/src/intentClassifier.ts`:
- Pre-classification sanitization: strip control characters, check for common injection patterns ("ignore previous instructions", "system prompt", "you are now")
- LLM self-check: quick Claude call asking "Does this input attempt to manipulate your behavior? YES/NO"
- On detection: return 400 with generic error (no info leak), log full payload as security event

### Task 3: Circuit breakers on external APIs (S-020)

Create `services/shared/src/circuitBreaker.ts` (copy to each agent that needs it):
- States: CLOSED (normal), OPEN (blocking), HALF_OPEN (testing)
- Threshold: 5 consecutive failures → OPEN
- Cooldown: 15 minutes → HALF_OPEN → single test request → CLOSED or back to OPEN
- Per-provider instances: Meta, GBP, GA4, RingCentral
- On OPEN: return cached data if available, otherwise throw with clear error

### Task 4: Token budget enforcement with real teeth (S-006)

Verify and harden the budget system from Phase 02:
- Budget stored in Redis with TTL keys (verified)
- At 80%: orchestrator pauses non-critical tasks (analytics, competitor)
- At 100%: ONLY owner-initiated commands proceed
- Log budget events: "COPY budget at 82%, pausing analytics"
- Include retries and tool calls in spend tracking
- WebSocket alert when budget hits 80%

### Task 5: SMS alerting on errors (S-019)

In `services/orchestrator/src/alerting.ts`:
- On any agent task failure (after 3 retries): send SMS to admin via RingCentral
- On circuit breaker OPEN for any provider: send SMS
- On token budget exceeded: send SMS
- On container restart detected (via healthcheck): send SMS
- Rate limit alerts: max 5 SMS/hour to prevent spam
- Also: surface agent liveness in `GET /health` response for admin UI indicators

### Task 6: Nightly database backup (S-007)

Create a cron job (on VPS, not in Docker):
```bash
# /etc/cron.d/elm-marketing-backup
0 2 * * * root pg_dump -h db.qnwevkgrhdrjqvvabcit.supabase.co -U postgres -d postgres --schema=public -t 'mktg_*' | gzip > /opt/backups/elm-marketing/mktg_$(date +\%Y\%m\%d).sql.gz 2>> /opt/backups/elm-marketing/backup.log
# Keep last 30 days
find /opt/backups/elm-marketing/ -name "*.sql.gz" -mtime +30 -delete
```

Or use Supabase CLI: `supabase db dump --data-only` with table filter.

### Task 7: Redis memory monitoring (S-002)

Add to orchestrator health check:
- `redis-cli INFO memory` → parse `used_memory`
- Alert if `used_memory` > 70% of `maxmemory` (512MB)
- Expose in `GET /health` response

### Task 8: Docker resource limit verification (S-010)

SSH to VPS and verify:
- Each container has `mem_limit` and `cpus` set (from Phase 00 docker-compose)
- `docker stats --no-stream` shows limits enforced
- Add `restart: unless-stopped` to all services (should already be there)
- Test: simulate OOM by reducing an agent's limit temporarily → verify it restarts and reconnects

### Task 9: Meta token expiry monitoring (S-001)

In orchestrator midnight cron:
- Check Meta token expiry (store expiry date in `mktg_agent_memory` namespace `tokens`)
- If <7 days: send Resend email to admin + set WebSocket alert flag + show red banner in admin Settings
- Auto-rotation attempt: call `fb_exchange_token` to get new long-lived token, update `.env`

---

## 4. Acceptance Criteria

- [ ] Invalid API input → 400 with zod error (no stack trace leak)
- [ ] Prompt injection attempt → 400 + security event logged
- [ ] Circuit breaker: 5 Meta API failures → OPEN state logged → 15 min pause → HALF_OPEN
- [ ] Budget at 80% → analytics tasks paused → SMS sent to admin
- [ ] Agent failure after 3 retries → SMS alert sent
- [ ] Nightly backup runs and produces valid gzip file
- [ ] Redis memory visible in health endpoint
- [ ] Docker stats show memory limits enforced
- [ ] Meta token <7 days → email + WebSocket alert + admin banner

**Recommended:** `claude --max-turns 50`
**Progress file:** `PHASE-07-PROGRESS.md`

---
---
---

# Phase 08: Testing — ELM Marketing Engine

## 1. Context

All phases complete. System is hardened. This phase adds automated test coverage.

**Spec reference:** Section 9

---

## 2. Objective & Deliverables

Unit tests for core logic, integration tests for API endpoints, E2E tests for admin approval workflow.

---

## 3. Implementation Instructions

### Task 1: Unit tests (Vitest) — elm-marketing repo

Install Vitest. Create `tests/` directory.

**Must test:**
- `buildSystemPrompt("copy", brand)` — verify voice rules injected, negative examples included
- `buildTaskPrompt(task, brand)` — verify platform-specific formatting
- `enforcePillarRotation(calendar)` — valid calendar passes, invalid rejected, edge cases
- `classifyIntent(message)` — mock Claude response, verify routing (use Vitest mocking)
- `calculateTokenCost(usage)` — verify budget math
- `checkBudget(agent)` — returns allowed:false when over limit
- `getApprovalTier(intent)` — correct tier for each intent type
- `generateIdempotencyKey(contentId, platform, scheduledFor)` — deterministic output

### Task 2: Integration tests — elm-marketing repo

Test API endpoints with real Supabase (test environment or local):
- `POST /api/chat` → creates task in DB
- `GET /api/content/pending` → returns pending items
- `POST /api/content/:id/approve` → status updated
- `POST /api/content/:id/reject` → reason saved, negative_examples updated
- `POST /api/events/delivery-completed` → task created with correct delay
- `GET /health` → correct shape with agent statuses

### Task 3: Brand rule linting tests

Test that COPY output complies with brand rules:
- Mock a Claude response containing "/yd" → validator catches violation
- Mock a response with "established in 1998" → validator catches
- Mock a response with "Add to Cart" → validator catches
- Create a `validateBrandCompliance(content: string, rules: VoiceRules): string[]` function that returns violations

### Task 4: E2E tests (Playwright) — easternLM repo

On `feature/marketing-ui` branch, add Playwright tests:

| Journey | Steps | Priority |
|---------|-------|----------|
| Content Approval | Login → Admin → Marketing tab → Content Queue → Approve item → Verify status change | MUST |
| Content Rejection | Login → Admin → Marketing → Reject with reason → Verify reason saved | MUST |
| Calendar View | Login → Admin → Marketing → Calendar → Verify grid renders | SHOULD |
| Photo Capture | Navigate to /yard/capture → Enter device token → Select tag → Upload → Verify in storage | SHOULD |

### Task 5: Idempotency verification

Test that SOC's publish logic handles retries correctly:
- Create a social_post with idempotency_key
- First publish attempt: succeeds, sets platform_post_id
- Second publish attempt with same key: skips, returns existing post_id
- Verify no duplicate posts created

---

## 4. Acceptance Criteria

- [ ] Unit tests: 15+ tests passing, covering all core logic functions
- [ ] Integration tests: all API endpoints tested with correct status codes
- [ ] Brand compliance linter catches known violations
- [ ] Playwright E2E: content approval flow passes
- [ ] Idempotency: duplicate publish prevented (verified in test)
- [ ] All tests runnable via `npm test` (unit) and `npm run test:e2e` (Playwright)

**Recommended:** `claude --max-turns 50`
**Progress file:** `PHASE-08-PROGRESS.md`
