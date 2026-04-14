# Phase 05: Admin Marketing Tab + Photo Capture PWA — ELM Marketing Engine

## 1. Context

**THIS PHASE RUNS ON THE `easternLM` REPO, branch `feature/marketing-ui`.** Not the `elm-marketing` repo. The orchestrator API (Phase 02) must be running for the dashboard to function.

Phase 02's orchestrator exposes REST endpoints and WebSocket at `api.easternlm.com/marketing`. This phase builds the frontend that consumes those endpoints.

**What you are building:**
- `MarketingTab.tsx` in the existing `/admin` dashboard (6 sub-sections)
- `/yard/capture` PWA route for photo uploads with device-token auth and offline support
- Delivery-completed webhook route at `/api/events/delivery-completed` (cross-repo bridge)

**Spec reference:** Sections 4.4, 4.5, 3.3

## Skills Reference
Before building UI components, `view /mnt/skills/public/frontend-design/SKILL.md` and follow its design principles. Use the existing ELM admin patterns (shadcn/ui, Tailwind CSS v4) for consistency with other admin tabs.

---

## 2. Objective & Deliverables

When complete: Adam opens `/admin`, sees a "Marketing" tab. Content queue shows pending posts with previews. Approve/edit/reject buttons work. Calendar shows weekly plan. Analytics shows latest report. Reviews shows pending responses. Settings panel manages brand config. Photo capture works on mobile with offline support.

---

## 3. Implementation Instructions

### Task 1: MarketingTab.tsx shell

Add to `src/app/admin/MarketingTab.tsx`:
- Sub-tab navigation: Dashboard, Content Queue, Calendar, Analytics, Reviews, Settings
- API client that fetches from orchestrator at `MARKETING_API_URL` env var (e.g. `https://api.easternlm.com/marketing` or `http://localhost:3200` for dev)
- WebSocket connection for real-time updates (connect on tab mount, disconnect on unmount)
- Auth: pass `MARKETING_ADMIN_PASSWORD` as Bearer token in all API calls

Add "Marketing" to the admin tab list in `page.tsx` alongside existing tabs (Events, Orders, Contacts, etc.).

### Task 2: Dashboard sub-tab
- 4 metric cards: Posts This Week, Pending Approval, Total Engagement, Content Generated
- Fetch from `GET /api/health` and `GET /api/analytics/summary`
- **Empty state (S-011):** "No content generated yet — the first batch will arrive Monday at 6 AM. Make sure to upload some yard photos first!"
- **Error state:** Retry button + "Marketing engine unreachable" banner
- Skeleton loaders during fetch

### Task 3: Content Queue sub-tab
- List of `pending_approval` content from `GET /api/content/pending`
- Each item shows: platform badge, pillar tag, caption preview (truncated), image thumbnails, scheduled date
- Actions per item: Approve (green), Edit (blue), Reject (red with reason modal)
- **Bulk approve:** Select multiple → confirmation modal → batch approve
- **Draft-only mode (S-004):** When `publish_mode = 'draft_only'`, show persistent amber banner: "Auto-publishing paused — Meta API review pending. Approved content must be published manually."
- Draft-only actions: "Copy Caption" (copies to clipboard), "Download Assets" (fetches images), "Mark Published Manually"
- **Queue budget (S-021):** Show max 20 items. "Showing 20 of [total]" with pagination. Auto-archived items hidden by default.
- Optimistic UI: approve button immediately shows checkmark, reverts if API fails

### Task 4: Calendar sub-tab
- Weekly grid view: rows = days (Mon-Sun), columns = platforms (IG, FB, GBP)
- Each cell shows: pillar color dot + topic snippet
- Current week loaded from `GET /api/calendar/current`
- `rotation_warning` badge if calendar failed pillar rotation (S-018)
- **Empty state:** "No calendar generated yet. The first one generates automatically Monday at 5 AM."

### Task 5: Analytics sub-tab
- Latest weekly report from `GET /api/analytics/summary`
- Sections: Top Posts (by engagement), Traffic from Social, Engagement Trends
- Competitor digest: summary-only per S-021 (collapsible "See full digest" for detail)
- **Empty state:** "First analytics report generates Friday at 4 PM."

### Task 6: Reviews sub-tab
- Pending review responses from `GET /api/reviews/pending`
- Each shows: star rating, reviewer name, review snippet, AI-drafted response
- Actions: Approve Response, Edit Response (inline edit), Skip
- **Empty state:** "No reviews awaiting response."

### Task 7: Settings sub-tab
- Brand config display (read from orchestrator or direct Supabase query)
- Competitor account management: add/remove/toggle active
- Posting schedule editor: per-platform day/time grid
- Content pillar weight sliders
- **Agent liveness indicators (S-019):** Show green/amber/red dot per agent from `GET /health`
- **Token expiry warning (S-001):** If Meta token expires within 7 days, show red banner
- **Device token management:** Generate new upload tokens, list active tokens, revoke tokens
- **First-run checklist (S-011):** On first visit, show bootstrap checklist: brand memory loaded ✓/✗, API connectivity ✓/✗, storage bucket ✓/✗, photos uploaded ✓/✗. Block dashboard until critical items pass.

### Task 8: Photo Capture PWA at `/yard/capture`

New route in the ELM web platform (NOT in the marketing engine repo):

`src/app/yard/capture/page.tsx`:
- Full-viewport mobile layout, zero scrolling
- Camera input: `<input type="file" accept="image/*" capture="environment">`
- Tag selector: 4 large tap buttons — Product, Delivery, Project, Behind Scenes
- Optional: product name dropdown (fetch from existing `products` table)
- Upload button → POST to Supabase Storage `marketing-assets` bucket
- **Auth (S-003):** Device token validation, NOT admin password. On first visit: prompt for device token. Store in localStorage. Token validated against `mktg_device_tokens` table — grants only storage upload permission.
- **Offline support (S-011):** Register Service Worker with Workbox. If offline when submit tapped: cache photo + metadata in IndexedDB. Show "Saved — will upload when connected." Background Sync auto-retries when online. Visual indicator for pending uploads.
- After successful upload: dispatch `format_single` task to IMAGE queue via orchestrator API call
- Success screen: "Photo uploaded! It will appear in next week's content." + "Take Another" button

### Task 9: Delivery webhook bridge

`src/app/api/events/delivery-completed/route.ts`:
- `POST` handler
- Validates `X-Webhook-Secret` header against `DELIVERY_WEBHOOK_SECRET` env var
- Accepts: `{ order_id, customer_phone, customer_name, brand_id }`
- Forwards to marketing engine orchestrator: `POST MARKETING_API_URL/api/events/delivery-completed`
- This is the bridge that connects the existing ELM order completion flow to the marketing engine's review solicitation

Also: add a hook in the existing delivery confirmation flow (wherever orders are marked as delivered) to call this webhook. Look for the delivery status update logic and add an HTTP POST.

---

## 4. Acceptance Criteria

- [ ] "Marketing" tab appears in `/admin` navigation
- [ ] Content Queue shows pending items fetched from orchestrator API
- [ ] Approve → item status updates to `approved`/`scheduled` (depending on publish_mode)
- [ ] Reject → modal prompts for reason → status updates to `rejected`
- [ ] Edit → inline edit → saves updated content
- [ ] Draft-only banner shows when `publish_mode = 'draft_only'`
- [ ] "Copy Caption" copies text to clipboard
- [ ] "Download Assets" downloads formatted images
- [ ] Calendar displays weekly grid with pillar colors
- [ ] Analytics renders latest report (or empty state if none)
- [ ] Reviews shows pending responses with approve/edit/skip
- [ ] Settings shows agent liveness indicators
- [ ] Photo capture works on mobile: camera opens, tag selected, uploads to Supabase Storage
- [ ] Device token auth: invalid token → rejected, valid token → upload succeeds
- [ ] Offline: photo cached in IndexedDB → syncs when online
- [ ] Delivery webhook: POST with valid secret → forwards to marketing engine → 200
- [ ] WebSocket: real-time update appears when new content is ready
- [ ] No changes to `main` branch — all work on `feature/marketing-ui`

---

## 5. Constraints

- This phase runs on `easternLM` repo, branch `feature/marketing-ui` ONLY
- Match existing admin tab patterns (same component structure, same auth, same styling)
- Do NOT install new UI libraries — use existing shadcn/ui + Tailwind
- Do NOT modify existing admin tabs (Events, Orders, Contacts, etc.)
- The marketing engine must be running (Phase 02+) for the dashboard to function
- Photo capture PWA must work on iOS Safari and Android Chrome

---

## 6. Completion Protocol

```
## Phase 05 Completion Report

### Files Created on feature/marketing-ui branch
[list]

### Admin Tab Verification
- Tab visible: [yes/no]
- Content Queue: [functional/broken — screenshot]
- Calendar: [functional/broken]
- Analytics: [functional/broken]
- Reviews: [functional/broken]
- Settings: [functional/broken]

### Photo Capture PWA
- Mobile camera: [tested on iOS/Android]
- Upload: [success — file in Supabase Storage]
- Device token auth: [working/not working]
- Offline: [cached/synced]

### Delivery Webhook
- POST test: [200/error]
- Forward to orchestrator: [success/fail]

### Warnings for Phase 06
[any issues]
```

---

## 7. Execution

**Recommended:** `claude --max-turns 75`
**Repo:** `easternLM` on branch `feature/marketing-ui`
**Progress file:** `PHASE-05-PROGRESS.md`
