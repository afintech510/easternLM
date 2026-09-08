---
allowed-tools: Read, Glob, Grep, Bash(ssh:*), Bash(curl:*), Bash(docker:*), Bash(nslookup:*), Bash(git:*)
description: Load project context, check infrastructure, and print a session briefing
---

# Open Session

Perform the following steps **in order**:

## Step 1 — Load Context Files

Read all of the following (in parallel for speed):
1. `SESSION_LOG.md` in the project root — full file, most recent entry first
2. Memory files at `C:\Users\alark\.claude\projects\c--Users-alark-projects-easternLM\memory\MEMORY.md` and all files it references
3. Any plan files in `C:\Users\alark\.claude\plans\` that reference easternLM

## Step 2 — Infrastructure Health Check

Run these checks in parallel:
1. VPS container status: `ssh hampton-vps "docker ps --filter name=easternlm-web --format '{{.Names}} {{.Status}} {{.Ports}}'"`
2. Homepage health: `ssh hampton-vps "curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/"`
3. Supabase health: `ssh hampton-vps "curl -s http://localhost:3100/api/health/supabase"`
4. Git status: `git status -u` and `git log --oneline -5`

If Supabase is down (INACTIVE/paused), restore it:
```
curl -s -X POST -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.supabase.com/v1/projects/qnwevkgrhdrjqvvabcit/restore"
```

## Step 3 — Output a Session Briefing

Print exactly this format:

---

### Session Briefing — EasternLM

**Last Session:** Session [N] on [date]
**State:** [2-3 sentence project state from last session log]

**Known Issues / Blockers from Last Session:**
- [bullets from last Known Issues section]

**Infrastructure Status:**
- VPS Container: [status]
- Homepage: [HTTP code]
- Supabase: [connected/disconnected]
- Git: [clean/dirty, branch]

**Priority TODO (in order):**
1. [top priority]
2. [second priority]
3. [third priority]

**Key Context:**
- VPS: `hampton-vps` (root@5.161.88.134) — Docker on port 3100
- Staging: http://staging.easternlm.com
- Supabase: project `qnwevkgrhdrjqvvabcit` (free tier, auto-pauses)
- Admin: adam@easternBuilding.supply / Stone110!
- Git remote: `vps` → `hampton-vps:/opt/repos/easternlm-web.git`

**Last Files Changed:**
- [list from last session log]

---

## Step 4 — Confirm Understanding

End with exactly:

> I've reviewed the session log, memory, and infrastructure. What would you like to work on first, or should I start on priority #1?
