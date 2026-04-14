# Phase 00: Infrastructure & Repo Setup — ELM Marketing Engine

## 1. Context

You are setting up the infrastructure for a new AI marketing agent system for Eastern Landscape & Mason Supply. This system runs alongside (but separate from) the existing ELM web platform and the Host Hampton agent system on the same Hetzner VPS (5.161.88.134).

**What exists:**
- VPS at 5.161.88.134 with Docker, nginx, running ELM web (ports 3100/3101) and HH agent system
- Redis running as `hampton_redis` container (shared — you will use `elm:` key prefix)
- ELM web platform repo at `/opt/easternlm-web/` (GitHub: afintech510/easternLM)
- Supabase project `qnwevkgrhdrjqvvabcit` with existing ELM tables
- nginx reverse proxy handling `easternlm.com`, `staging.easternlm.com`, `*.hosthampton.com`

**What you are building:**
- A new GitHub repo `elm-marketing` with Docker Compose stack
- A feature branch `feature/marketing-ui` on the existing `easternLM` repo
- nginx configuration additions for `api.easternlm.com/marketing`
- Skeleton project structure for 5 agent services

**What you are NOT building:** Any agent code, database tables, or UI. Just scaffolding.

**Spec reference:** elm-marketing-engine-spec-v2.md, Sections 1.2, 1.3

---

## 2. Objective & Deliverables

When this phase is complete, the marketing engine repo exists with a working Docker Compose stack that starts 5 empty containers + connects to shared Redis. The nginx proxy routes marketing API traffic. The feature branch exists on the web platform repo.

---

## 3. Implementation Instructions

### Task 1: Create the elm-marketing repo structure

Create the following directory structure locally:

```
elm-marketing/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── CLAUDE.md
├── README.md
├── db/
│   └── migrations/          (empty — Phase 01 populates)
├── services/
│   ├── orchestrator/
│   │   ├── src/
│   │   │   └── index.ts     (minimal Express healthcheck server)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   ├── copy/
│   │   ├── src/
│   │   │   └── index.ts     (minimal: log "COPY agent ready" and wait)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   ├── image/
│   │   ├── src/
│   │   │   └── index.ts     (minimal: log "IMAGE agent ready" and wait)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   ├── soc/
│   │   ├── src/
│   │   │   └── index.ts     (minimal: log "SOC agent ready" and wait)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   └── intel/
│       ├── src/
│       │   └── index.ts     (minimal: log "INTEL agent ready" and wait)
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
└── nginx/
    └── marketing.conf       (server block snippet)
```

### Task 2: docker-compose.yml

Per spec Section 1.3. All services on a shared `elm_marketing_net` bridge network. Connect to existing `hampton_redis` via external network.

```yaml
services:
  orchestrator:
    build: ./services/orchestrator
    container_name: elm_orchestrator
    restart: unless-stopped
    mem_limit: 512m
    cpus: '0.75'
    ports:
      - "3200:3200"
    env_file: .env
    networks:
      - elm_marketing_net
      - hampton_net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3200/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  copy:
    build: ./services/copy
    container_name: elm_copy
    restart: unless-stopped
    mem_limit: 256m
    cpus: '0.5'
    env_file: .env
    networks:
      - elm_marketing_net
      - hampton_net

  image:
    build: ./services/image
    container_name: elm_image
    restart: unless-stopped
    mem_limit: 384m
    cpus: '0.5'
    env_file: .env
    networks:
      - elm_marketing_net
      - hampton_net

  soc:
    build: ./services/soc
    container_name: elm_soc
    restart: unless-stopped
    mem_limit: 256m
    cpus: '0.5'
    env_file: .env
    networks:
      - elm_marketing_net
      - hampton_net

  intel:
    build: ./services/intel
    container_name: elm_intel
    restart: unless-stopped
    mem_limit: 256m
    cpus: '0.5'
    env_file: .env
    networks:
      - elm_marketing_net
      - hampton_net

networks:
  elm_marketing_net:
    driver: bridge
  hampton_net:
    external: true
    name: hosthampton_default  # or whatever the HH compose network is named
```

Verify the HH network name with: `docker network ls | grep hampton`

### Task 3: .env.example

```env
# Anthropic
ANTHROPIC_API_KEY=

# Supabase (same as ELM web platform)
SUPABASE_URL=https://qnwevkgrhdrjqvvabcit.supabase.co
SUPABASE_SERVICE_KEY=

# Redis (shared with HH — use elm: prefix for all keys)
REDIS_URL=redis://hampton_redis:6379

# Meta Graph API (F-009, F-010)
META_ACCESS_TOKEN=
META_PAGE_ID=
META_IG_ACCOUNT_ID=

# Google (F-010, F-013)
GOOGLE_GBP_SERVICE_ACCOUNT_JSON=
GOOGLE_GA4_SERVICE_ACCOUNT_JSON=
GA4_PROPERTY_ID=

# RingCentral (F-014, alerts)
RINGCENTRAL_JWT_TOKEN=
RINGCENTRAL_SMS_FROM=+16318746244

# Admin auth
MARKETING_ADMIN_PASSWORD=

# App config
NODE_ENV=production
PORT=3200
```

### Task 4: CLAUDE.md for the marketing engine repo

Create CLAUDE.md with:
- Project identity: ELM Marketing Engine — AI agent system for social media automation
- Stack: Claude Agent SDK (TypeScript), BullMQ, Express, Supabase, Docker
- Architecture: Orchestrator dispatches to specialist agents (COPY, IMAGE, SOC, INTEL) via BullMQ queues
- Redis prefix: `elm:` — NEVER use unprefixed keys (shared with Host Hampton)
- Database: `mktg_*` prefixed tables in existing Supabase project
- Brand rules: "per cu. yard" not "/yd", "family-owned" not "est. XX", "Add to Order" not "Add to Cart", mulch is double ground
- Spec reference: elm-marketing-engine-spec-v2.md
- Key constraint: All third-party tokens in .env only, NEVER in database rows

### Task 5: Each agent's minimal Dockerfile

All agents share the same Dockerfile pattern:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
USER node
CMD ["node", "dist/index.js"]
```

The orchestrator's Dockerfile adds `EXPOSE 3200` and the healthcheck.

### Task 6: Each agent's package.json

Shared dependencies across all agents: `@anthropic-ai/claude-agent-sdk`, `@supabase/supabase-js`, `bullmq`, `ioredis`. Orchestrator additionally gets: `express`, `cors`, `ws`, `node-cron`, `uuid`, `zod`. IMAGE additionally gets: `sharp`.

Pin `@anthropic-ai/claude-agent-sdk` to `0.2.71`.

TypeScript: `"target": "ES2022"`, `"module": "NodeNext"`, `"outDir": "dist"`.

### Task 7: Orchestrator healthcheck stub

`services/orchestrator/src/index.ts`:
```typescript
import express from "express";
const app = express();
app.get("/health", (req, res) => res.json({ status: "ok", agents: 0, phase: "setup" }));
app.listen(3200, () => console.log("ELM Marketing Orchestrator listening on 3200"));
```

### Task 8: nginx configuration addition

Create `nginx/marketing.conf` as a snippet to include in the VPS nginx config:

```nginx
# ELM Marketing Engine API
location /marketing/ {
    proxy_pass http://elm_orchestrator:3200/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
}
```

Add this to the existing `api.easternlm.com` server block (or create it if it doesn't exist, proxying under the `easternlm.com` server block as a location).

### Task 9: Feature branch on easternLM repo

```bash
cd /path/to/easternLM
git checkout main
git pull
git checkout -b feature/marketing-ui
git push -u origin feature/marketing-ui
```

No code changes on this branch yet — that's Phase 05.

### Task 10: Deploy and verify on VPS

```bash
# On VPS
cd /opt
git clone <elm-marketing-repo-url> elm-marketing
cd elm-marketing
cp .env.example .env
# Fill in .env with actual values

# Build and start
docker compose build
docker compose up -d

# Verify
docker ps | grep elm_
curl http://localhost:3200/health
# Should return: {"status":"ok","agents":0,"phase":"setup"}

# Add nginx config
# Include the marketing.conf snippet in the appropriate server block
nginx -t && systemctl reload nginx

# Verify external access
curl https://easternlm.com/marketing/health
# or curl https://api.easternlm.com/marketing/health depending on routing
```

---

## 4. Acceptance Criteria

- [ ] `elm-marketing` repo exists on GitHub with all directories and files listed above
- [ ] `docker compose up -d` starts 5 containers (orchestrator + 4 agents), all healthy
- [ ] `curl http://localhost:3200/health` returns `{"status":"ok"}`
- [ ] All agent containers log their "ready" message and stay running
- [ ] Redis connection works: orchestrator can `PING` redis via `elm:` prefixed test key
- [ ] nginx routes `/marketing/health` to the orchestrator correctly
- [ ] `feature/marketing-ui` branch exists on the `easternLM` repo
- [ ] `.env.example` contains all required keys
- [ ] `CLAUDE.md` contains project identity, stack, brand rules, and spec reference
- [ ] No changes made to `main` branch of `easternLM` repo
- [ ] No changes made to Host Hampton containers or configuration

---

## 5. Constraints

**Hard boundaries:**
- Do NOT modify any existing nginx server blocks — ADD to them only
- Do NOT modify Host Hampton containers or Redis configuration
- Do NOT create database tables (that's Phase 01)
- Do NOT write agent logic (that's Phases 02-04)
- All containers must have explicit `mem_limit` and `cpus` per spec Section 1.3
- Redis key prefix `elm:` is mandatory — test with a SET/GET cycle

**Soft boundaries:**
- Docker Compose network name may need adjustment based on actual HH network name
- Port 3200 can be changed if there's a conflict, but update all references

---

## 6. Completion Protocol

When done, produce this report:

```
## Phase 00 Completion Report

### Files Created
[list every file with path]

### Acceptance Criteria Results
[pass/fail for each criterion]

### Docker Status
[output of `docker ps | grep elm_`]

### Redis Connectivity
[output of test SET/GET with elm: prefix]

### nginx Test
[output of `nginx -t` and health check curl]

### Warnings for Phase 01
[any issues discovered that affect the next phase]
```

---

## 7. Execution

**Recommended:** `claude --max-turns 25`
**Resume:** `claude --continue` if interrupted
**Progress file:** Write `PHASE-00-PROGRESS.md` at repo root with current status
