---
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git:*), Bash(ssh:*), Bash(curl:*)
description: Summarize session work, update SESSION_LOG.md, and generate next-session opening prompt
---

# Save Session

Perform the following steps **in order**:

## Step 1 — Review This Session

Scan and summarize:
- All files created, modified, or deleted this session
- All commands run and their outcomes (success / failure / partial)
- Architectural or logic decisions made
- Blockers encountered and how (or whether) they were resolved
- Any unfinished work or known issues
- Infrastructure changes (deployments, container restarts, DB changes)

## Step 2 — Update SESSION_LOG.md

Read `SESSION_LOG.md` in the project root (create it if it doesn't exist).
Append a new session entry in this format:

```md
## Session [N] — [Date]

### What Was Accomplished
- [bullet list of completed work]

### Decisions Made
- [architectural, naming, logic decisions — and WHY]

### Known Issues / Blockers
- [anything broken, incomplete, or unclear]

### Infrastructure State
- VPS Container: [status]
- Supabase: [status]
- Last deploy: [commit hash and what changed]

### Current Project State
[2-3 sentence snapshot of where things stand]

### Updated Priority TODO (in order)
1. [Most urgent next tasks]
2. [What's next in the overall plan]

### Files Changed This Session
- [list key files and what changed]
```

Increment session number N based on the number of existing entries in SESSION_LOG.md.
Use today's date from the system.

## Step 3 — Update Project Memory

Read the project memory file at `C:\Users\alark\.claude\projects\c--Users-alark-projects-easternLM\memory\project_status.md`.
Update it to reflect:
- Any newly completed features (move from "Still Needing Work" to "Features Implemented")
- Any new issues discovered
- Any infrastructure changes
- Updated deployment state

## Step 4 — Output a Closing Summary

Print exactly this format (fill in the brackets):

> Session [N] closed. SESSION_LOG.md updated.
> State: [one sentence on where things stand]
> Next priority: [top 1-2 tasks for next session]

## Step 5 — Generate and Print the Opening Prompt

Generate the opening prompt for the next session. Print it inside a clearly labeled markdown code block so it can be copied and pasted directly into the next Claude Code session.

The opening prompt must:
1. Reference SESSION_LOG.md and the most recent entry
2. List the top 2-3 priority tasks
3. Remind the agent to read memory files
4. Be self-contained — no assumed context

Format:
````
```
[Opening prompt here — self-contained, copy-paste ready]
```
````
