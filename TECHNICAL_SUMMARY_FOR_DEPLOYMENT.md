# OpenClaw Token Economy - Technical Summary for Deployment

**Date:** 2026-02-12  
**Effort:** ~20 hours (analysis + implementation)  
**Goal:** Reduce OpenClaw token costs by 60-80% ($60-105/month savings)  
**Status:** Code complete, Docker build in progress

---

## Problem Statement

OpenClaw instance is burning $3-5/day (~$90-150/month) in LLM token costs due to:
1. **Heartbeat polling** - Calls LLM every 30 minutes even when HEARTBEAT.md is empty (~50% of usage)
2. **No model routing** - Always uses expensive model (Sonnet) for everything
3. **Unbounded context** - Loads all context files, can exceed 20k tokens

---

## Solution Implemented

Created a custom OpenClaw build with 3 new hooks for token optimization:

### 1. Heartbeat Optimization (Zero-Token Heartbeats)
**File:** `src/cron/isolated-agent/run.ts` (~20 lines added)

**What it does:**
- Checks if `HEARTBEAT.md` is empty BEFORE calling LLM
- Skips LLM call entirely if empty → 0 tokens
- Expected impact: 100% heartbeat elimination (~50% of current usage)

**Code change:**
```typescript
// Before LLM call, check if HEARTBEAT.md is empty
const heartbeatPath = path.join(workspaceDir, 'HEARTBEAT.md');
if (fs.existsSync(heartbeatPath)) {
  const content = fs.readFileSync(heartbeatPath, 'utf-8').trim();
  if (!content || content.startsWith('#')) {
    // Empty or only comments - skip LLM call
    return { skipped: true, reason: 'HEARTBEAT.md empty' };
  }
}
```

### 2. Model Routing Hook
**File:** `src/agents/pi-embedded-runner/run.ts` (~30 lines added)

**What it does:**
- Adds `before_model_select` hook before model resolution
- Allows plugins to override model based on task complexity
- Cheap-first strategy: gpt-4o → sonnet → opus

**Code change:**
```typescript
// Allow plugins to override model selection
const hookResult = await runHook('before_model_select', {
  trigger: params.trigger,
  messages: params.messages,
  suggestedModel: resolvedModel
});

if (hookResult?.model) {
  resolvedModel = hookResult.model;
}
```

### 3. Context Bundling Hook
**File:** `src/agents/bootstrap-files.ts` (~25 lines added)

**What it does:**
- Adds `before_context_build` hook before context bundle creation
- Allows plugins to filter/truncate context
- Hard cap at 10,000 tokens

**Code change:**
```typescript
// Allow plugins to modify context bundle
const hookResult = await runHook('before_context_build', {
  files: filesMap,
  maxTokens: 10000
});

if (hookResult?.files) {
  filesMap = hookResult.files;
}
```

### 4. Hook Infrastructure
**Files:** 
- `src/plugins/types.ts` (~50 lines) - TypeScript definitions
- `src/plugins/hooks.ts` (~40 lines) - Hook runner implementation

**What it does:**
- Defines hook types and interfaces
- Provides `runHook()` function for executing plugin hooks
- Ensures type safety across hook system

---

## Plugins Created

Two plugins leverage the new hooks:

### 1. Model Routing Plugin
**File:** `plugins/model-routing-plugin.js` (6.4 KB)

**Configuration:**
```json
{
  "defaultModel": "gpt-4o",
  "escalationModel": "anthropic/claude-sonnet-4-5",
  "complexModel": "anthropic/claude-opus-4-5",
  "costThreshold": 0.01,
  "complexityThreshold": 0.7
}
```

**Logic:**
- Analyzes message for complexity (length, code blocks, special chars)
- Routes to cheap model (gpt-4o) for simple queries
- Escalates to Sonnet/Opus for complex tasks

### 2. Context Bundling Plugin
**File:** `plugins/context-bundling-plugin.js` (5.8 KB)

**Configuration:**
```json
{
  "maxTokens": 10000,
  "priorityOrder": ["SOUL.md", "USER.md", "AGENTS.md", "memory/"],
  "truncateStrategy": "oldest-first"
}
```

**Logic:**
- Enforces 10k token hard cap
- Prioritizes critical files (SOUL.md, USER.md first)
- Truncates oldest messages if over limit

---

## Build Process

### Files Modified (165 lines total across 5 files)
1. `src/plugins/types.ts` - Hook type definitions
2. `src/plugins/hooks.ts` - Hook runners
3. `src/agents/pi-embedded-runner/run.ts` - Model routing integration
4. `src/agents/bootstrap-files.ts` - Context bundling integration
5. `src/cron/isolated-agent/run.ts` - Heartbeat optimization

### Build Status
- ✅ Dependencies installed (pnpm install, 1002 packages)
- ✅ TypeScript compiled successfully
- ✅ Declarations generated
- ❌ Docker build failing on `node-llama-cpp` postinstall

---

## Current Issue: Docker Build Failure

### Error
```
[node-llama-cpp] Failed to build llama.cpp with no GPU support. Error: cmake not found
ELIFECYCLE Command failed with exit code 1.
```

### Root Cause
- `node-llama-cpp` package tries to compile llama.cpp during `pnpm install`
- Fails in Alpine Linux (missing glibc, cmake issues)
- **Not needed** - user only uses cloud LLMs (Anthropic, OpenAI, Google)

### Fix Applied
Modified `Dockerfile.custom` to skip postinstall scripts:

```dockerfile
# Skip postinstall scripts to avoid node-llama-cpp build failures
RUN npm install -g pnpm@10.23.0 && \
    pnpm install --frozen-lockfile --ignore-scripts
```

### Files Involved
- **Dockerfile:** `/home/pedro/openclaw/workspace/projects/openclaw/Dockerfile.custom`
- **Source code:** `/home/pedro/openclaw/workspace/projects/openclaw/src/`
- **Plugins:** `/home/pedro/openclaw/workspace/plugins/`

---

## Deployment Architecture

### Side-by-Side Deployment (Current Plan)
```
┌─────────────────────────────────────────────────┐
│ Host Machine (clawdbot)                         │
│                                                  │
│  ┌──────────────────────┐  ┌─────────────────┐ │
│  │ Current OpenClaw     │  │ Custom OpenClaw │ │
│  │ Port: 3333           │  │ Port: 3334      │ │
│  │ Image: official      │  │ Image: custom   │ │
│  │ No optimization      │  │ With hooks      │ │
│  └──────────────────────┘  └─────────────────┘ │
│           │                         │           │
│           └─────────┬───────────────┘           │
│                     │                           │
│          ┌──────────▼──────────┐                │
│          │ Shared Workspace    │                │
│          │ /home/pedro/        │                │
│          │   openclaw/workspace│                │
│          │ - SOUL.md           │                │
│          │ - USER.md           │                │
│          │ - AGENTS.md         │                │
│          │ - plugins/          │                │
│          │ - projects/         │                │
│          └─────────────────────┘                │
└─────────────────────────────────────────────────┘
```

### Volume Mounts (Both Containers)
```yaml
volumes:
  - /home/pedro/openclaw/workspace:/home/node/.openclaw/workspace:rw
  - /home/pedro/openclaw/config:/home/node/.openclaw/config:rw
  - /home/pedro/openclaw/data:/home/node/.openclaw/data:rw
```

**Important:** Both containers share the same workspace. Changes are visible to both.

---

## Next Steps to Complete Deployment

### Step 1: Copy Fixed Dockerfile (From Container to Host)
```bash
docker cp openclaw-gateway:/home/node/.openclaw/workspace/projects/openclaw/Dockerfile.custom \
  /home/pedro/openclaw/workspace/projects/openclaw/
```

### Step 2: Build Docker Image
```bash
cd /home/pedro/openclaw/workspace/projects/openclaw
docker build -f Dockerfile.custom -t openclaw-custom:token-economy .
```

**Expected time:** 5-10 minutes  
**Expected size:** ~500-800 MB

### Step 3: Deploy Custom OpenClaw
```bash
cd /home/pedro/openclaw/workspace/projects/openclaw
docker compose -f docker-compose.custom.yml up -d
```

### Step 4: Install Plugins
```bash
docker exec openclaw-custom node /app/dist/cli.js plugins install \
  /home/node/.openclaw/workspace/plugins/model-routing-plugin.js

docker exec openclaw-custom node /app/dist/cli.js plugins install \
  /home/node/.openclaw/workspace/plugins/context-bundling-plugin.js
```

### Step 5: Verify Deployment
```bash
# Check container status
docker ps | grep openclaw

# Check logs
docker logs openclaw-custom --tail 50

# Verify plugins loaded
docker exec openclaw-custom node /app/dist/cli.js plugins list
```

---

## Expected Results

### Immediate (Within 1 hour)
- Custom OpenClaw running on port 3334
- Plugins loaded and hooks registered
- Heartbeat skips LLM when `HEARTBEAT.md` empty

### Within 24-48 hours
- Token usage drops 60-80%
- Cost drops from $3-5/day to $1-1.50/day
- Model routing verified (cheap model for simple queries)
- Context capping verified (max 10k tokens)

---

## Rollback Plan

If deployment fails or causes issues:

```bash
# Stop custom OpenClaw
cd /home/pedro/openclaw/workspace/projects/openclaw
docker compose -f docker-compose.custom.yml down

# Current OpenClaw on port 3333 remains unaffected
# All data is safe (volumes are mounted, not copied)
```

---

## Technical Context

### Environment
- **Host:** Ubuntu/Debian Linux (clawdbot)
- **Docker:** Version 20.10+ (compose v2)
- **Current OpenClaw:** Running in `openclaw-gateway` container
- **Node version:** 22.x
- **Package manager:** pnpm 10.23.0

### Repository Links
- **Fork:** https://github.com/pfaria32/openclaw
- **Plugin repo:** https://github.com/pfaria32/open_claw_token_economy
- **Official issue:** https://github.com/openclaw/openclaw/issues/14779

### Key Directories
- **Fork source:** `/home/pedro/openclaw/workspace/projects/openclaw/`
- **Plugins:** `/home/pedro/openclaw/workspace/plugins/`
- **Deployment scripts:** `/home/pedro/openclaw/workspace/projects/token-economy/`
- **Shared workspace:** `/home/pedro/openclaw/workspace/`

---

## Questions for Deployment Help

1. **Docker build issue:** How to handle `node-llama-cpp` postinstall failure in Alpine?
   - Current fix: `--ignore-scripts` flag
   - Alternative: Different base image? Conditional install?

2. **Testing:** How to verify hooks are firing correctly?
   - Check logs for hook execution?
   - Add debug logging?

3. **Production deployment:** Best practice for switching from current to custom?
   - Keep side-by-side permanently?
   - Gradual migration strategy?

---

## Success Metrics

- [ ] Docker build completes successfully
- [ ] Container starts without errors
- [ ] Plugins load and register hooks
- [ ] Heartbeat logs show "skipping LLM call" when HEARTBEAT.md empty
- [ ] Token usage drops 60-80% within 48 hours
- [ ] Daily cost drops to $1-1.50

---

## Contact / Questions

- All documentation in: `/home/pedro/openclaw/workspace/projects/token-economy/`
- Key files:
  - `DEPLOYMENT_GUIDE.md` - Comprehensive testing guide
  - `HOST_DEPLOYMENT_STEPS.md` - Step-by-step manual
  - `DIY_FORK_IMPLEMENTATION.md` - Code implementation details
  - `PROJECT_CONTEXT.md` - Full project timeline

---

**Created:** 2026-02-12 17:49 UTC  
**Status:** Awaiting Docker build completion  
**Blocker:** node-llama-cpp postinstall failure in Alpine Linux
