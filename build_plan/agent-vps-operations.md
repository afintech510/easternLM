# VPS Operations Guide — Agent Reference

This document gives a Claude Code agent (or any automation agent) everything needed to SSH into the Hetzner VPS, run commands, manage Docker containers, and deploy code across all projects.

---

## SSH Access

| Field | Value |
|-------|-------|
| **Host** | `5.161.88.134` |
| **User** | `root` |
| **SSH Key** | `~/.ssh/id_ed25519_headless` |
| **SSH Alias** | `hampton-vps` (configured in `~/.ssh/config`) |
| **Port** | 22 (default) |

### Connect
```bash
ssh hampton-vps
# OR explicitly:
ssh -i ~/.ssh/id_ed25519_headless root@5.161.88.134
```

### Run a remote command
```bash
ssh hampton-vps 'docker ps'
ssh hampton-vps 'cd /opt/easternlm-web && git log --oneline -5'
```

---

## Server Specs

| Spec | Value |
|------|-------|
| **Provider** | Hetzner Cloud |
| **Plan** | CX32 (4 vCPU / 4GB RAM / 80GB disk) |
| **OS** | Ubuntu 24.04 (kernel 6.8.0) |
| **IP** | 5.161.88.134 |
| **Docker** | 29.2.1 + Compose v5.0.2 |
| **Git** | 2.43.0 |
| **Python** | 3.12.3 |
| **Node** | Not installed on host (only inside Docker containers) |

---

## Directory Layout

```
/opt/
├── easternlm-web/          EasternLM web platform (Next.js 16)
│   ├── .env.local           All env vars (Supabase, Stripe, etc.)
│   ├── src/                 Source code
│   └── Dockerfile           Builds into easternlm-staging / easternlm-prod
│
├── elm-marketing/           ELM Marketing Engine (5 agents)
│   ├── .env                 API keys (Anthropic, Supabase, RingCentral)
│   ├── docker-compose.yml   5 services: orchestrator, copy, image, soc, intel
│   └── services/            Agent source code
│
├── hosthampton/             Host Hampton agent system (7 agents)
│   ├── .env                 API keys
│   ├── docker-compose.yml   All services + nginx + redis
│   ├── nginx/nginx.conf     Master nginx config (all domains)
│   └── services/            Agent source code
│
├── mygravelguy/             MyGravelGuy website
├── happyhome/               HappyHome website
└── repos/                   Misc
```

---

## Docker Architecture

### Networks
| Network | Purpose |
|---------|---------|
| `hosthampton_hampton_net` | Shared by all projects. Nginx, Redis, and all containers connect here. |
| `elm-marketing_elm_marketing_net` | Internal network for ELM marketing agents |
| `happyhome_happyhome_net` | HappyHome internal network |

### Shared Services
| Container | Network | Purpose |
|-----------|---------|---------|
| `hampton_redis` | `hosthampton_hampton_net` | Redis 7 — shared task queue + caching. ELM uses `elm:` prefix, Hampton uses `hampton:` prefix. |
| `hampton_nginx` | `hosthampton_hampton_net` | Nginx reverse proxy — routes ALL domains. Config at `/opt/hosthampton/nginx/nginx.conf` |

### All Running Containers

| Container | Project | Port | Description |
|-----------|---------|------|-------------|
| `hampton_nginx` | shared | 80, 443 | Reverse proxy for all domains |
| `hampton_redis` | shared | 6379 (internal) | Redis task queue + cache |
| `easternlm-prod` | easternlm | 3100→3000 | Production: easternlm.com |
| `easternlm-staging` | easternlm | 3101→3000 | Staging: staging.easternlm.com |
| `elm_orchestrator` | elm-marketing | 3200→3200 | Marketing engine orchestrator |
| `elm_copy` | elm-marketing | — | Content generation agent |
| `elm_image` | elm-marketing | — | Image formatting agent |
| `elm_soc` | elm-marketing | — | Social publishing agent |
| `elm_intel` | elm-marketing | — | Analytics agent |
| `hampton_orchestrator` | hosthampton | 3000 (internal) | Host Hampton orchestrator |
| `hampton_soc` | hosthampton | — | Hampton social agent |
| `hampton_copy` | hosthampton | — | Hampton content agent |
| `hampton_image` | hosthampton | — | Hampton image agent |
| `hampton_intel` | hosthampton | — | Hampton analytics agent |
| `hampton_list` | hosthampton | — | Hampton CRM agent |
| `hampton_outbound` | hosthampton | — | Hampton email/SMS agent |
| `hampton_frontend` | hosthampton | 80 (internal) | Hampton dashboard |
| `hampton_website` | hosthampton | 3002 (internal) | Hampton Next.js site |
| `mygravelguy` | mygravelguy | 80 (internal) | MyGravelGuy website |
| `happyhome_app` | happyhome | 3001→3000 | HappyHome app |
| `happyhome_nginx` | happyhome | 8080, 8443 | HappyHome nginx |

---

## Domain Routing (nginx)

All traffic flows through `hampton_nginx`. Config file: `/opt/hosthampton/nginx/nginx.conf`

| Domain | Upstream | Container | Port |
|--------|----------|-----------|------|
| `easternlm.com` | `easternlm_prod` | easternlm-prod | 3000 |
| `staging.easternlm.com` | `easternlm_staging` | easternlm-staging | 3000 |
| `easternlm.com/marketing/*` | `elm_orchestrator` | elm_orchestrator | 3200 |
| `staging.easternlm.com/marketing/*` | `elm_orchestrator` | elm_orchestrator | 3200 |
| `api.hosthampton.com` | `hampton` | hampton_orchestrator | 3000 |
| `app.hosthampton.com` | `frontend` | hampton_frontend | 80 |
| `mygravelguy.com` | `mygravelguy_upstream` | mygravelguy | 80 |

---

## Deployment Procedures

### EasternLM (Staging — auto-deploys on push to `main`)

```bash
# Automatic via GitHub Actions on push to main
# OR manually:
ssh hampton-vps 'cd /opt/easternlm-web && git pull && \
  eval $(grep -v "^#" .env.local | sed "s/^/export /") && \
  docker build \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    --build-arg SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
    --build-arg STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
    --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" \
    -t easternlm-web:latest . && \
  docker stop easternlm-staging && docker rm easternlm-staging && \
  docker run -d --name easternlm-staging \
    --network hosthampton_hampton_net \
    -p 3101:3000 --env-file /opt/easternlm-web/.env.local \
    easternlm-web:latest'
```

### EasternLM (Production — manual trigger only)

```bash
# Via GitHub Actions: Actions → "Deploy to Production" → type "deploy-production"
gh workflow run "Deploy to Production (easternlm.com)" --repo afintech510/easternLM -f confirm=deploy-production
```

### ELM Marketing Engine

```bash
ssh hampton-vps 'cd /opt/elm-marketing && git pull && docker compose up --build -d'
```

### Host Hampton

```bash
ssh hampton-vps 'cd /opt/hosthampton && git pull && docker compose up --build -d'
```

---

## Common Operations

### View container logs
```bash
ssh hampton-vps 'docker logs easternlm-prod --tail 50'
ssh hampton-vps 'docker logs elm_orchestrator --tail 50'
ssh hampton-vps 'docker logs hampton_nginx --tail 50'
```

### Restart a container
```bash
ssh hampton-vps 'docker restart easternlm-staging'
ssh hampton-vps 'docker restart elm_orchestrator'
```

### Rebuild and restart a single service (elm-marketing)
```bash
ssh hampton-vps 'cd /opt/elm-marketing && docker compose up --build -d orchestrator'
```

### Check container health
```bash
ssh hampton-vps 'docker ps --format "table {{.Names}}\t{{.Status}}"'
```

### Redis CLI
```bash
ssh hampton-vps 'docker exec hampton_redis redis-cli INFO memory'
ssh hampton-vps 'docker exec hampton_redis redis-cli KEYS "elm:*"'
ssh hampton-vps 'docker exec hampton_redis redis-cli KEYS "hampton:*"'
```

### Run SQL against Supabase (EasternLM project)
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/qnwevkgrhdrjqvvabcit/database/query" \
  -H "Authorization: Bearer REDACTED_SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT count(*) FROM orders"}'
```

### Nginx config test + reload
```bash
ssh hampton-vps 'docker exec hampton_nginx nginx -t && docker exec hampton_nginx nginx -s reload'
```

### Check disk / memory
```bash
ssh hampton-vps 'df -h / && free -h'
ssh hampton-vps 'docker stats --no-stream'
```

---

## GitHub Repos

| Repo | Visibility | Branch | Auto-deploy |
|------|-----------|--------|-------------|
| `afintech510/easternLM` | Private | `main` | Staging on push, production manual |
| `afintech510/elm-marketing` | Private | `main` | Manual (docker compose on VPS) |
| `afintech510/host-hampton-ops` | Private | `main` | Manual (docker compose on VPS) |

### Push to GitHub (HTTPS — SSH keys not configured for GitHub on this machine)
```bash
cd /c/Users/alark/projects/easternLM && git push origin main
cd /c/Users/alark/projects/elm-marketing && git push origin main
```

---

## Cron Jobs (VPS root crontab)

| Schedule | Command | Purpose |
|----------|---------|---------|
| `*/15 * * * *` | `curl supabase.co/functions/v1/process-abandoned-carts` | MyGravelGuy abandoned cart emails |
| `0 2 * * *` | `curl easternlm.com/api/cron/ringcentral-renew` | ELM RingCentral subscription renewal |
| `0 */6 * * *` | `curl easternlm.com/api/health` | ELM Supabase keepalive |
| `*/30 * * * *` | `curl easternlm.com/api/cron/follow-ups` | ELM follow-up sequence processing |
| `*/5 * * * *` | `curl localhost:3100/api/cron/sync-sms` | ELM SMS sync (RingCentral → DB) |

### Reminder digest (cron-job.org, not VPS crontab)
The twice-daily reminder digest to Adam & Ronnie runs on cron-job.org (same account as the other
ELM external crons), targeting the prod domain:

| Job ID | Schedule (America/New_York) | URL |
|--------|------------------------------|-----|
| 8113921 | Weekdays 08:30 | `https://easternlm.com/api/cron/reminders?key=<CRON_SECRET_KEY>` |
| 8113922 | Weekdays 16:00 | `https://easternlm.com/api/cron/reminders?key=<CRON_SECRET_KEY>` |

Timezone is set per-job in cron-job.org (America/New_York), so times are ET regardless of the VPS
clock. `CRON_SECRET_KEY` lives in `/opt/easternlm-web/.env.local` (`elm-cron-c00fe2d2038137bb` in prod).

ELM Marketing Engine crons are handled internally by `node-cron` inside `elm_orchestrator` (not VPS crontab).

---

## SSL Certificates

| Domain | Type | Location |
|--------|------|----------|
| `*.hosthampton.com` | Cloudflare Origin | `/etc/ssl/hosthampton/origin.pem` + `.key` |
| `*.easternlm.com` | Cloudflare Origin | `/etc/cloudflare/easternlm.com.pem` + `.key` |

Both are Cloudflare origin certs (valid 15 years). Traffic goes: User → Cloudflare (edge SSL) → VPS (origin SSL).

---

## Environment Variables

### EasternLM (`/opt/easternlm-web/.env.local`)
Supabase, Stripe (test + prod keys), Google Maps, Resend, RingCentral, Anthropic, Twilio, marketing engine config. `NEXT_PUBLIC_` vars must be passed as `--build-arg` during Docker build.

### ELM Marketing (`/opt/elm-marketing/.env`)
Anthropic, Supabase (ELM project), Redis URL, RingCentral, Meta API (empty until app review), marketing admin password, delivery webhook secret, daily token budget.

### Host Hampton (`/opt/hosthampton/.env`)
Anthropic, Supabase (Hampton project), Meta API, Google APIs, Mailchimp, Twilio, Resend, Stripe, owner phone.

**NEVER commit `.env` files. NEVER log API keys. All secrets stay on the VPS only.**

---

## Safety Rules

1. **Always `git pull` before `docker compose up --build`** — never build stale code
2. **Never force-push to main** on any repo
3. **Test on staging first** — `staging.easternlm.com` before `easternlm.com`
4. **Back up nginx config** before editing: `cp nginx.conf nginx.conf.bak_$(date +%s)`
5. **Never restart `hampton_redis`** without warning — it serves all projects
6. **Disk is 83% full** — clean old Docker images periodically: `docker image prune -f`
7. **Production deploy is manual only** — requires explicit workflow dispatch with confirmation
8. **All containers have `restart: unless-stopped`** — they auto-recover from crashes
