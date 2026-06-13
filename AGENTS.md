# AGENTS.md — Eastern Landscape & Mason Supply (easternlm-web)

Operator/interaction guide for working on and running this project. For deep business rules
(delivery fee formula, order rules, design system, Google Ads/Merchant API rules, SMS routing),
see **CLAUDE.md** — this file does not duplicate them.

## 1. Purpose

Next.js e-commerce + service-lead + POS platform for Eastern Landscape & Mason Supply, a bulk
material supply yard in Center Moriches, NY.

## 2. What this is

Storefront (shop, calculator, delivery-fee quoting, guest checkout), service-lead intake, an
internal admin/POS, programmatic SEO town pages, and a Google Ads/Merchant marketing agent.
Single Next.js app backed by Supabase; Stripe for payments; Resend for email; RingCentral/Twilio
for SMS.

## 3. Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Supabase (Postgres + Auth + Storage + RLS), project ref `qnwevkgrhdrjqvvabcit`
- Stripe Checkout, Resend email, RingCentral (primary) / Twilio (fallback) SMS
- Anthropic SDK (AI quote/copy), Google Ads API v21+ / Google Merchant API v1
- Tailwind CSS v4 + shadcn/ui + Radix, Zustand cart store
- Tests: Jest (unit) + Playwright (e2e); ESLint
- Deploy target: Docker on a Hetzner VPS behind nginx + Cloudflare

## 4. Where it runs

Fleet: one Hetzner VPS, IP `5.161.88.134`, SSH alias `hampton-vps` (user `root`, key
`~/.ssh/id_ed25519_headless`), Cloudflare in front. Each project lives at `/opt/<name>`. A shared
nginx proxy container `hampton_nginx` (owned by host-hampton-ops at `/opt/hosthampton`) terminates
TLS and routes domains to per-project containers.

- App dir on VPS: `/opt/easternlm-web`
- Docker network (shared): `hosthampton_hampton_net`
- GitHub: `github.com/afintech510/easternLM` (private)

| Env | Domain | Container | Host→container port | Docker image | Stripe |
|-----|--------|-----------|---------------------|--------------|--------|
| Staging | `staging.easternlm.com` | `easternlm-staging` | `3101`→`3000` | `easternlm-web:latest` | **LIVE** (POS takes real payments) |
| Production | `easternlm.com` | `easternlm-prod` | `3100`→`3000` | `easternlm-web-prod:latest` | LIVE |

Notes:
- Containers listen on `3000` internally (Dockerfile `EXPOSE 3000`, `PORT=3000`); nginx/Cloudflare
  reach them via the host ports above.
- Production DNS may not be pointed yet — confirm before assuming `easternlm.com` is live.
- Staging deliberately runs LIVE Stripe keys; treat staging payment flows as real.

## 5. Run locally

```bash
npm install
npm run dev            # http://localhost:3000 (next dev, Turbopack)
npm run build          # production build
npm run lint           # eslint
npm test               # jest unit tests (runInBand) — delivery fee math, etc.
npm run test:e2e       # playwright e2e (29 tests / 7 suites)
```

Env: copy your secrets into `.env.local` (the README references `.env.example`, but that template
is not committed — populate the variable NAMES listed in section 8). Verify Supabase wiring at
`GET /api/health/supabase` (expects `ok: true`).

## 6. Deploy (GitHub Actions)

Both workflows live in `.github/workflows/`. Neither uses SCP — code reaches the VPS via
`git fetch` + `git reset --hard FETCH_HEAD` against `main`, then the image is built ON the VPS and
the container is swapped. Build-time env is loaded by sourcing `/opt/easternlm-web/.env.local`.

**Important:** every `NEXT_PUBLIC_*` value is baked into the client bundle at build time, so it must
be passed to `docker build` as a `--build-arg` (the workflows do this for the Supabase URL/anon key
and the publishable Stripe key). Setting them only at `docker run` time is not enough.

### Staging — `deploy-staging.yml` (auto)
- Trigger: push to `main` (also `workflow_dispatch`)
- SSH → pull → `docker build` (with `--build-arg`s) → swap `easternlm-staging` on `3101` →
  health check (`curl http://localhost:3101`) → `docker image prune`
- Uses LIVE Stripe (`PROD_STRIPE_SECRET_KEY` / `PROD_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
  falling back to the non-prod vars if unset)
- After deploy, runs Playwright (`--project=desktop`) against `https://staging.easternlm.com`
  (`continue-on-error: true`, so a test failure does not fail the deploy)

### Production — `deploy-production.yml` (manual)
- Trigger: `workflow_dispatch` only; requires input `confirm` typed exactly as `deploy-production`
  (the job has an `if:` guard on that value)
- Safety: aborts if `PROD_STRIPE_SECRET_KEY`/`PROD_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are missing,
  and refuses to deploy if either contains `sk_test` / `pk_test`
- SSH → pull → `docker build` image `easternlm-web-prod` (with `--build-arg`s) → swap
  `easternlm-prod` on `3100` → health check (`curl http://localhost:3100`) → prune
- No Playwright/e2e step in the production workflow

## 7. Database

- Supabase project ref: `qnwevkgrhdrjqvvabcit` (URL `https://qnwevkgrhdrjqvvabcit.supabase.co`)
- Migrations: `supabase/migrations/*.sql` (timestamp-prefixed). Seeds: `supabase/seed*.sql`.
- Applying SQL: `supabase db push` is known to FAIL here (remote migration history is out of sync).
  SQL is applied directly via the **Supabase Management API** from TypeScript helper scripts, e.g.
  `npx tsx scripts/apply-seed.ts` (POSTs to
  `https://api.supabase.com/v1/projects/qnwevkgrhdrjqvvabcit/database/query`, reading
  `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ACCESS_TOKEN` from `.env.local`). There is no
  `scripts/apply_remote_sql.py`. Other apply/import scripts: `apply-restructure.ts`, `apply-seed.ts`,
  `migrate-wc-products.ts`, `import-wc-orders.ts`.
- Type generation: `npm run supabase:types`; status: `npm run supabase:status`.
- Key tables (init schema): `products`, `categories`, `orders`, `order_items`, `accounts`,
  `truck_types`, `site_settings`, `delivery_fee_cache`, `gallery_projects`. Later migrations add
  `customers`/order history, `service_leads`, quotes, suppliers, POS/dispatch, SMS, and the
  `mktg_google_*` marketing-agent tables (+ `mktg_agent_actions` audit). See CLAUDE.md for catalog
  and business semantics.

## 8. Environment & secrets

Never print secret values. App secrets live ONLY in `/opt/easternlm-web/.env.local` on the VPS
(gitignored locally; not committed). Required variable NAMES:

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `GOOGLE_MAPS_API_KEY`, `STRIPE_SECRET_KEY`,
`PROD_STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`PROD_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`,
`RINGCENTRAL_JWT`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`,
`CRON_SECRET_KEY`. Marketing agent also uses `MKTG_ENCRYPTION_KEY` (see CLAUDE.md).

GitHub repo secrets used by CI (the only secrets the workflows reference): `VPS_SSH_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (the last two are used by the staging
Playwright step), plus the auto-provided `GITHUB_TOKEN`. The VPS host (`5.161.88.134`) and user
(`root`) are hardcoded in the workflow env, not stored as secrets.

## 9. Cron / scheduled jobs

Scheduled work is exposed as HTTP endpoints under `src/app/api/cron/*`, each gated by a key checked
against `CRON_SECRET_KEY`. They are invoked externally (VPS crontab calling the staging/prod URL).
Endpoints include: `follow-ups`, `campaigns`, `delivery-notify`, `book-now-expiring`,
`missed-call-check`, `morning-briefing`, `refresh-reviews`, `ringcentral-renew`, `ringsense-fetch`,
`sync-sms`. Plus a Supabase keepalive (`/api/health` family). Representative schedule (per
PROJECT_STATE_REPORT.md): RingCentral renewal daily ~2 AM, follow-ups every ~30 min, keepalive
every few hours. Confirm the live `crontab -l` on the VPS for the authoritative schedule.

## 10. Day-to-day cheat sheet

```bash
# SSH in
ssh hampton-vps

# Watch a container / get logs
ssh hampton-vps 'docker ps --filter name=easternlm'
ssh hampton-vps 'docker logs --tail 50 easternlm-staging'

# Deploy staging = just push to main (auto). Re-run manually:
#   GitHub → Actions → "Deploy to Staging" → Run workflow
# Deploy production:
#   GitHub → Actions → "Deploy to Production" → Run workflow → type: deploy-production

# Health check from the VPS
ssh hampton-vps 'curl -sf http://localhost:3101 >/dev/null && echo staging-ok'
ssh hampton-vps 'curl -sf http://localhost:3100 >/dev/null && echo prod-ok'

# Apply seed/SQL to remote Supabase (Management API, not db push)
npx tsx scripts/apply-seed.ts

# Tests before pushing
npm test && npm run test:e2e
```

## 11. Key files

- `CLAUDE.md` — business rules, conventions, delivery formula, design system, Google Ads/Merchant
  rules, SMS routing. Read this for "why/what", not just "how".
- `.github/workflows/deploy-staging.yml`, `.github/workflows/deploy-production.yml` — deploy logic.
- `Dockerfile` — multi-stage build; declares the `--build-arg` ARGs (incl. `NEXT_PUBLIC_*`).
- `next.config.ts` — image remote patterns (Supabase host, easternbuilding.supply), security headers.
- `supabase/migrations/`, `supabase/seed*.sql`, `supabase/config.toml`.
- `scripts/` — data import / SQL apply / catalog tooling (TypeScript, run with `npx tsx`).
- `tools/elm-print-server/` — local WebSocket bridge to the Sunmi NT311 thermal printer (runs on the
  POS desktop, `ws://localhost:9111` → printer TCP `:9100`); not deployed to the VPS.
- `README.md` — minimal local-dev quickstart.

## 12. Gotchas / operational rules

- **Staging runs LIVE Stripe keys.** POS on staging processes real charges — do not "test" payments
  there carelessly.
- **`NEXT_PUBLIC_*` must be `--build-arg`.** Changing one requires a rebuild, not just a container
  restart, or the browser bundle keeps the old value.
- **Deploys reset the VPS checkout** (`git reset --hard FETCH_HEAD`). Never leave uncommitted local
  edits in `/opt/easternlm-web`; they will be discarded on the next deploy.
- **`supabase db push` does not work here** — remote migration history is out of sync. Use the
  Management API scripts (e.g. `npx tsx scripts/apply-seed.ts`).
- **Secrets stay in `/opt/easternlm-web/.env.local` on the VPS.** Don't commit them, don't echo
  their values, don't move app secrets into GitHub secrets (CI only needs the few in section 8).
- **Production is manual + confirmation-gated** and refuses test Stripe keys — don't try to bypass
  the `deploy-production` confirm input or the `sk_test`/`pk_test` guard.
- **Shared infra:** the network `hosthampton_hampton_net` and `hampton_nginx` proxy are shared
  across fleet projects (owned by host-hampton-ops). Don't rename/remove them or other sites break.
- **Production DNS may not be pointed yet** — verify before assuming `easternlm.com` serves traffic.
