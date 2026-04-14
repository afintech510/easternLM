# Statement of Work: ELM Marketing Engine
**Version:** 1.0
**Date:** 2026-04-04
**Prepared for:** Adam Lark, Eastern Landscape & Mason Supply
**Prepared by:** Claude (Spec Pipeline)

---

## 1. Executive Summary

Eastern Landscape & Mason Supply needs to establish and maintain a consistent social media presence, generate local SEO content, and run targeted marketing campaigns across Instagram, Facebook, and Google Business Profile — without hiring a marketing team or spending 15+ hours a week on manual content creation.

The ELM Marketing Engine is an AI agent system built on the Claude Agent SDK (TypeScript) that automates the full content lifecycle: intelligence gathering from local market signals → content generation (copy + visuals) → human approval → scheduled publishing → performance tracking. The system runs as persistent Docker containers on the existing Hetzner VPS alongside the ELM web platform, uses the same Supabase database (with namespaced marketing tables), and integrates with the Meta Graph API, Google Business Profile API, and existing RingCentral/Resend infrastructure.

The architecture is single-brand at launch (Eastern LM) with a `brand_id` column on all tables and brand config in agent memory, enabling MyGravelGuy to be added as a second brand by swapping configuration — no code changes. The Host Hampton agent system (7 agents, running in production for 6+ weeks) serves as the reference architecture for proven patterns.

---

## 2. Project Objectives

| ID | Objective | Success Metric | Priority |
|----|-----------|----------------|----------|
| O-001 | Eliminate manual social content creation | Owner spends ≤10 min/week on content approval (down from 0 — currently not posting) | MUST |
| O-002 | Establish consistent social posting cadence | 15-20 posts/week across IG, FB, and GBP within 30 days of launch | MUST |
| O-003 | Drive local SEO through social signals | GBP posts weekly for all active service towns; social posts link to town/product pages | MUST |
| O-004 | Monitor local competitive landscape | Weekly intelligence digest showing competitor content patterns and engagement trends | SHOULD |
| O-005 | Automate review solicitation | Post-delivery Google review requests sent automatically, 2x current review velocity | SHOULD |
| O-006 | Build reusable multi-brand architecture | Add MyGravelGuy as second brand within 1 day of configuration work, no code changes | MUST |
| O-007 | Run email/SMS marketing campaigns | Monthly promotional campaigns to segmented customer lists | COULD |
| O-008 | Manage paid social advertising | Meta Ads creation, optimization, and ROAS tracking | COULD |

---

## 3. Feature Set

### 3.1 Core Features — Phase 1: Launch

| ID | Feature | Description | User Story | Acceptance Criteria |
|----|---------|-------------|------------|---------------------|
| F-001 | Orchestrator agent | Central brain that classifies owner commands, routes tasks to specialist agents, enforces brand rules, manages approval gates | As the owner, I want to give a high-level instruction and have the system break it into agent tasks | Owner sends "plan next week's content" → orchestrator creates tasks for COPY, IMAGE, SOC |
| F-002 | Brand memory system | Persistent key-value store with namespaced brand context: voice rules, content pillars, product catalog, hashtag sets, platform accounts, posting schedule | As the system, I need brand context loaded into every agent's system prompt | Each agent's Claude call includes ELM-specific voice rules, product names, and content restrictions |
| F-003 | Multi-brand architecture | `brand_id` column on all marketing tables, brand config in agent_memory, orchestrator routes tasks with brand context | As the owner, I want to add MyGravelGuy later without code changes | Create a new brand row + memory bootstrap → agents generate MGG-branded content |
| F-004 | Social media copy generation | COPY agent generates platform-specific captions (IG, FB, GBP) following 7 content pillars with brand voice rules | As the owner, I want professional social posts written in my brand's voice | Generated captions use "per cu. yard" not "/yd", "family-owned" not "est. 19XX", correct product names |
| F-005 | Product & project imagery | IMAGE agent formats uploaded yard photos for each platform spec (1080x1080 IG feed, 1080x1920 stories, 1200x630 FB/GBP), applies branding overlay | As the owner, I want my raw photos turned into platform-ready social posts | Upload a photo → IMAGE returns 3 platform-formatted versions with ELM watermark |
| F-006 | Photo ingestion pipeline | Simple upload flow for yard staff to submit photos tagged by type (product, delivery, project, behind-the-scenes) to a Supabase Storage bucket | As a yard worker, I want to snap a photo and tag it in under 30 seconds | Photo uploaded via `/yard/capture` PWA → appears in IMAGE agent's input queue within 1 minute |
| F-007 | Weekly content calendar | Orchestrator generates a 7-day content plan distributed across content pillars with seasonal awareness, assigns to COPY + IMAGE | As the owner, I want next week's content planned automatically every Monday | Monday 6 AM → orchestrator creates calendar → COPY + IMAGE produce all posts → queue for approval by Monday noon |
| F-008 | Content pillar rotation | Programmatic enforcement of content distribution: max 2 posts of same pillar/week, at least 1 of each pillar per 2-week cycle | As the brand, I need content variety so the feed doesn't feel repetitive | Pillar distribution tracked in DB; orchestrator rejects calendar drafts that violate rotation rules |
| F-009 | Auto-publish to Instagram & Facebook | SOC agent publishes approved content via Meta Graph API on schedule | As the owner, I want approved posts to go live without me clicking "publish" | Approved post → SOC calls Meta Graph API → post appears on IG/FB → `social_posts` row updated with post ID |
| F-010 | Google Business Profile posts | SOC agent publishes weekly GBP updates tied to town pages for local SEO signal | As the business, I want GBP posts that link to my town delivery pages | Weekly GBP post created → links to relevant `/delivery/[town]` page → visible in Google Maps listing |
| F-011 | Review response drafts | SOC agent monitors Google/Yelp reviews, drafts professional responses for approval | As the owner, I want review responses written for me so I just approve and post | New Google review detected → SOC drafts response → appears in approval queue → owner approves → response posted |
| F-012 | Competitor & local account monitoring | INTEL agent tracks engagement patterns on configurable list of local landscaper/competitor accounts | As the owner, I want to know what content is working for my competitors | INTEL produces weekly digest: "Before/after posts got 4x engagement this week; time-lapse reels trending in landscaping accounts" |
| F-013 | Analytics & performance reporting | INTEL agent pulls GA4 metrics + social engagement data, generates weekly performance summary | As the owner, I want a weekly report showing what content performed and what to adjust | Friday 4 PM → INTEL generates report: top posts, engagement rates, website traffic from social, GBP views |
| F-014 | Automated review solicitation | Post-delivery Google review request via SMS, coordinated with existing ELM web platform cron | As the business, I want every delivery customer asked for a Google review | Delivery marked complete → review request SMS sent 2 hours later via RingCentral → not duplicated by web platform cron |
| F-015 | Content approval dashboard | "Marketing" tab in ELM admin showing content queue, approve/edit/reject workflow, content calendar, and analytics summary | As the owner, I want to review and approve all content in the same admin I already use | `/admin` Marketing tab → shows pending posts with preview → approve/edit/reject buttons → approved posts move to scheduled |
| F-016 | Scheduled automation | Cron-driven task generation: daily content generation, weekly calendar planning, weekly analytics, posting schedule | As the system, I need automated triggers for recurring tasks | Crons fire at configured times → orchestrator creates tasks → agents execute → output queued |

### 3.2 Enhancement Features — Phase 2

| ID | Feature | Description | Dependency | Deferred Until |
|----|---------|-------------|------------|----------------|
| F-020 | Email marketing campaigns | OUTBOUND agent drafts and sends promotional email campaigns via Resend/Brevo to segmented lists | Requires F-022 (CRM segments) | Phase 2 |
| F-021 | SMS promotional blasts | OUTBOUND agent sends promotional SMS via RingCentral marketing number (631-366-8524) | Requires F-022 | Phase 2 |
| F-022 | CRM segmentation | LIST agent builds audience segments from ELM customer data: contractor vs homeowner, by town, by product interest, by recency | Requires existing contacts table | Phase 2 |
| F-023 | Blog & SEO content | COPY agent generates materials guides, seasonal tips, town-specific articles | Requires F-004 | Phase 2 |
| F-024 | AI-generated visuals | IMAGE agent generates lifestyle/scene imagery via Replicate FLUX when no photos available | Requires F-005 | Phase 2 |
| F-025 | Comment & DM monitoring | SOC agent scans social comments and DMs, flags questions, drafts replies | Requires F-009 (Meta API) | Phase 2 |
| F-026 | Nextdoor posting | SOC agent posts community-style content to Nextdoor for hyperlocal reach | Requires F-004 | Phase 2 |
| F-027 | Seasonal demand signals | INTEL detects spring mulch rush, fall cleanup patterns, weather-driven demand from search/social data | Requires F-012 | Phase 2 |
| F-028 | Lead nurture sequences | OUTBOUND sends follow-up sequences after quotes, re-engagement for dormant customers | Requires F-022 | Phase 2 |

### 3.3 Enhancement Features — Phase 3

| ID | Feature | Description | Dependency | Deferred Until |
|----|---------|-------------|------------|----------------|
| F-030 | Meta Ads management | PAID agent creates/optimizes FB/IG ads targeting homeowners within 25 miles | Requires F-013 (2-3 months of organic data) | Phase 3 |
| F-031 | Ad performance tracking | INTEL tracks Meta/Google Ads ROAS, CPC, conversion metrics | Requires F-030 | Phase 3 |
| F-032 | Short-form video scripts | COPY generates Reel/TikTok scripts for time-lapse delivery, yard tours, how-tos | Requires F-004 | Phase 3 |

### 3.4 Explicitly Out of Scope

- TikTok account management or publishing (no API available for small business accounts)
- YouTube channel management
- Website content changes (managed by ELM web platform, not marketing engine)
- POS integration or order processing
- Automated ad budget increases without explicit human approval
- Customer support chatbot or DM auto-reply (drafts only, human sends)
- Influencer outreach or partnership management
- Print marketing or physical mailer generation
- Migration of Host Hampton agent system to Claude Agent SDK (HH stays as-is)

---

## 4. Users & Personas

### Persona: Adam (Owner / Primary Approver)
- **Role:** Business owner, final decision maker on all published content
- **Goal:** Maintain active social presence with minimal time investment
- **Technical Comfort:** High — builds and operates the ELM web platform
- **Key Workflows:** Review weekly content batch (Mon morning, 10 min) → approve/edit/reject → check weekly analytics (Fri, 5 min) → occasionally override content calendar with timely posts ("we just got a new shipment of bluestone, post about it today")
- **Pain Points:** No time to create social content; knows it's hurting the business but can't dedicate 10+ hours/week to it

### Persona: Ronnie (Partner / Secondary Approver)
- **Role:** Operations partner, can approve content when Adam is unavailable
- **Goal:** Ensure content is accurate (correct products, pricing, availability)
- **Technical Comfort:** Medium
- **Key Workflows:** Backup approval when Adam is in the field; flags inaccurate product info
- **Pain Points:** Product details change (availability, pricing) and content needs to stay current

### Persona: Yard Staff (Photo Contributors)
- **Role:** Drivers, counter staff who capture yard/delivery photos
- **Goal:** Drop a photo in under 30 seconds and get back to work
- **Technical Comfort:** Low — phone-only, no laptop
- **Key Workflows:** Take photo → open capture page → tap category → upload → done
- **Pain Points:** Any process with more than 3 taps won't get used

---

## 5. Competitive & Design References

| Reference | What to Emulate | What to Avoid |
|-----------|-----------------|---------------|
| Host Hampton agent system (internal) | Agent roles, Redis dispatch, approval gates, brand memory bootstrap, Docker topology | Hand-rolled agent loops — use Claude Agent SDK instead |
| Eclincher | Combined social management + local SEO in one platform | Enterprise pricing and complexity |
| Postbae | No-prompt autonomous visual content generation | Generic "AI look" imagery — ELM needs real yard photos |
| Local landscaper Instagram accounts | Before/after content format, seasonal timing, hashtag strategy | Inconsistency — most post 3x then go dark for months |

---

## 6. Technical Constraints & Existing Infrastructure

### Existing Stack (ELM Web Platform)
- **Framework:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, shadcn/ui
- **Database:** Supabase PostgreSQL (project `qnwevkgrhdrjqvvabcit`)
- **Hosting:** Hetzner VPS (5.161.88.134), Docker + nginx
- **SMS:** RingCentral (primary: 631-874-6244, marketing: 631-366-8524)
- **Email:** Resend (transactional), ImprovMX (forwarding)
- **Payments:** Stripe (not relevant to marketing engine)
- **Analytics:** GA4 (NEXT_PUBLIC_GA_ID configured)

### Build Target
- **Framework:** Claude Agent SDK v0.2.71 (TypeScript, `@anthropic-ai/claude-agent-sdk`)
- **Model:** Claude Sonnet 4.6 for all agents; Opus 4.6 only if Sonnet proves insufficient for orchestrator intent classification
- **Inter-agent communication:** Redis pub/sub (share existing HH Redis instance with `elm:` key prefix)
- **Database:** Same Supabase project, marketing tables prefixed `mktg_` or in separate `marketing` schema
- **Image storage:** Supabase Storage (new `marketing-assets` bucket)
- **Publishing APIs:** Meta Graph API (IG + FB), Google Business Profile API, Google My Business API
- **Container runtime:** Docker Compose at `/opt/elm-marketing/`

### Constraints
- Must run on existing Hetzner VPS without impacting ELM web platform or HH agent system performance
- Total additional memory budget: ~2GB (VPS has headroom based on HH audit showing CX32 with 8GB)
- Claude API costs must stay under $200/month at steady state (estimated 5-7 agent calls/day at Sonnet pricing)
- Meta API app review must be initiated immediately as it takes 2-6 weeks
- No paid third-party SaaS for social management — this replaces those tools

---

## 7. Assets & Materials

| Asset | Status | Location/Notes |
|-------|--------|----------------|
| Brand voice rules | Available | Documented in project memory (units, naming, restrictions) |
| Product catalog | Available | Supabase `products` table (16 bulk, 270+ non-bulk) |
| Town data | Available | Supabase `town_pages` table (65 Suffolk County towns) |
| Gallery projects | Available | Supabase `gallery_projects` with town tags |
| Product/yard photos | Available | Existing photo album (needs upload to Supabase Storage) |
| Content pillar definitions | Available | 7 pillars defined in advisory session |
| Facebook Business Page | Available | Set up and ready |
| Instagram Business Account | Available | Set up and ready |
| Google Business Profile | Available | Active listing |
| GA4 property | Available | Configured on ELM web platform |
| HH agent system reference code | Available | 7 agent `index.ts` files + orchestrator + training docs |

---

## 8. Delivery Phases & Timeline

### Phase 1: Content Production & Publishing Engine — Weeks 1-4

**Deliverables:**
- ORCHESTRATOR agent with intent classification, task dispatch, approval gates, cron scheduler (F-001, F-007, F-008, F-016)
- COPY agent for social media captions across 7 content pillars (F-004)
- IMAGE agent for photo formatting and platform optimization (F-005)
- SOC agent for Meta Graph API publishing + GBP posting + review response drafts (F-009, F-010, F-011)
- INTEL agent for competitor monitoring + analytics reporting (F-012, F-013)
- Brand memory bootstrap with full ELM context (F-002)
- Multi-brand database schema with `brand_id` on all tables (F-003)
- Photo capture PWA at `/yard/capture` (F-006)
- Marketing tab in ELM admin dashboard (F-015)
- Review solicitation coordination with existing web platform cron (F-014)
- Docker Compose stack at `/opt/elm-marketing/` with Redis + 5 agent containers

**Milestone Criteria:** Owner reviews and approves a full week of auto-generated content from the admin dashboard; SOC successfully publishes to IG, FB, and GBP via API; INTEL delivers first weekly competitor digest and analytics report.

### Phase 2: Outreach & Segmentation — Weeks 5-7

**Deliverables:**
- OUTBOUND agent for email/SMS campaigns (F-020, F-021)
- LIST agent for CRM segmentation (F-022)
- Blog/SEO content generation (F-023)
- AI image generation via Replicate (F-024)
- Comment/DM monitoring (F-025)
- Seasonal demand detection (F-027)
- Lead nurture sequences (F-028)

**Milestone Criteria:** First segmented email campaign sent to contractor list; LIST produces 5+ audience segments from existing customer data; OUTBOUND sends SMS promo to homeowner segment.

### Phase 3: Paid Advertising — Weeks 8-10

**Deliverables:**
- PAID agent for Meta Ads management (F-030)
- Ad performance tracking in INTEL (F-031)
- Video script generation (F-032)

**Milestone Criteria:** PAID creates and launches a Meta ad campaign targeting homeowners within 25 miles; INTEL reports ROAS after 2-week run; owner approves ad spend via dashboard.

---

## 9. Assumptions & Dependencies

- Meta API app review approval is obtained within 4 weeks of submission (F-009, F-010 blocked until approved)
- GBP API access is granted (requires Google Cloud project with Business Profile API enabled)
- Existing photo album is uploaded to Supabase Storage before Phase 1 launch
- Claude API pricing remains stable at current Sonnet 4.6 rates (~$3/M input, $15/M output tokens)
- VPS has sufficient CPU/memory headroom for 5-8 additional Docker containers
- Redis instance shared with HH continues to perform under combined load
- Owner commits to 10 min/week approval cadence — system degrades if approval queue backs up
- ELM web platform's review request cron (daily 3 AM) is disabled or coordinated once F-014 goes live
- Facebook Business Page and Instagram Business Account are linked via Meta Business Suite

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Meta API app review rejected or delayed | Medium | High — SOC can't auto-publish | Start app review immediately; SOC operates in draft-only mode with manual copy/paste publishing as fallback |
| Claude Agent SDK breaking changes (v0.x) | Medium | Medium — agent code may need updates | Pin SDK version in package.json; monitor Anthropic changelog; keep agent logic decoupled from SDK internals |
| Photo pipeline goes unused (staff don't upload) | High | Medium — content becomes copy-only | Make capture PWA dead-simple (3 taps); seed initial library from existing album; IMAGE agent can use stock/AI imagery as backup |
| API cost overrun from agent token usage | Low | Medium — monthly bill exceeds $200 | Use Sonnet not Opus; implement token budgets per agent per day; orchestrator tracks cumulative spend |
| Redis contention with HH agent system | Low | Low — both systems are low-throughput | Use `elm:` key prefix for full namespace isolation; monitor with `redis-cli info` |
| Content quality drift (agents produce generic/repetitive posts) | Medium | Medium — hurts brand perception | Pillar rotation enforcement; monthly brand memory refresh; owner feedback loop via reject + edit |
| GBP API rate limiting | Low | Low — only 1 post/week | Batch GBP posts during off-peak; implement retry with exponential backoff |
| VPS resource exhaustion | Low | High — affects production web platform | Monitor with `docker stats`; set memory limits per container (256MB per agent); alert at 80% VPS memory |

---

## 11. Sign-Off

By confirming this SOW, the stakeholder agrees that the scope, features, and phases described above accurately represent the intended project.

- [ ] **SOW Confirmed** — Adam Lark — [Date]
