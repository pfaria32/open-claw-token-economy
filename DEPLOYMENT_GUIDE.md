# DIY Fork Deployment Guide

## Pre-Deployment Checklist

- [x] Code changes completed (~165 lines across 5 files)
- [x] Build completed successfully (pnpm build)
- [x] TypeScript declarations generated
- [ ] Docker image built
- [ ] Custom OpenClaw deployed
- [ ] Plugins installed
- [ ] End-to-end testing complete

## Step 1: Build Docker Image

```bash
cd /home/node/.openclaw/workspace/projects/openclaw

# Build the custom image
docker build -f Dockerfile.custom -t openclaw-custom:token-economy .
```

**Expected time:** 5-10 minutes  
**Expected size:** ~500-800 MB

## Step 2: Prepare Configuration

The custom OpenClaw needs the plugins to be installed in the workspace:

```bash
cd /home/node/.openclaw/workspace

# Copy plugins from token-economy project
mkdir -p plugins
cp -r projects/token-economy/plugins/model-routing-plugin.js plugins/
cp -r projects/token-economy/plugins/context-bundling-plugin.js plugins/

# Verify plugins are in place
ls -la plugins/
```

## Step 3: Stop Existing OpenClaw (Optional)

**Warning:** This will stop your current OpenClaw instance. Only do this if you're ready to switch to the custom build.

```bash
cd /home/pedro/openclaw
docker compose down
```

## Step 4: Deploy Custom OpenClaw

**Option A: Side-by-side deployment (Recommended for testing)**

```bash
cd /home/node/.openclaw/workspace/projects/openclaw

# Deploy on port 3334 (parallel to existing)
docker compose -f docker-compose.custom.yml up -d

# Watch logs
docker compose -f docker-compose.custom.yml logs -f
```

**Option B: Replace existing deployment**

```bash
# Stop existing
cd /home/pedro/openclaw
docker compose down

# Start custom
cd /home/node/.openclaw/workspace/projects/openclaw
docker compose -f docker-compose.custom.yml up -d
```

## Step 5: Install Plugins

Once the custom OpenClaw is running, install the plugins:

```bash
# Connect to the custom container
docker exec -it openclaw-custom sh

# Navigate to CLI
cd /app

# Install model routing plugin
node dist/cli.js plugins install /home/node/.openclaw/workspace/plugins/model-routing-plugin.js

# Install context bundling plugin
node dist/cli.js plugins install /home/node/.openclaw/workspace/plugins/context-bundling-plugin.js

# Verify plugins are loaded
node dist/cli.js plugins list

# Exit container
exit
```

## Step 6: Configure Plugins

Add plugin configuration to your OpenClaw config:

```json
{
  "plugins": {
    "model-routing": {
      "enabled": true,
      "config": {
        "defaultModel": "gpt-4o",
        "escalationModel": "anthropic/claude-sonnet-4-5",
        "complexModel": "anthropic/claude-opus-4-5",
        "costThreshold": 0.01,
        "complexityThreshold": 0.7
      }
    },
    "context-bundling": {
      "enabled": true,
      "config": {
        "maxTokens": 10000,
        "priorityOrder": ["SOUL.md", "USER.md", "AGENTS.md", "memory/"],
        "truncateStrategy": "oldest-first"
      }
    }
  }
}
```

Apply the configuration:

```bash
# From host
docker exec openclaw-custom node /app/dist/cli.js config patch config-patch.json

# Or via OpenClaw CLI from inside container
docker exec -it openclaw-custom sh
node dist/cli.js config patch /home/node/.openclaw/workspace/config-patch.json
exit
```

## Step 7: Test End-to-End

### Test 1: Heartbeat Zero-Token Skip

```bash
# Ensure HEARTBEAT.md is empty
echo "" > /home/node/.openclaw/workspace/HEARTBEAT.md

# Wait for next heartbeat (max 30 minutes)
# Watch logs for: "Heartbeat: HEARTBEAT.md empty or missing, skipping LLM call"

docker compose -f docker-compose.custom.yml logs -f | grep -i heartbeat
```

**Expected:** No LLM calls, zero tokens burned

### Test 2: Model Routing (Cheap-First)

```bash
# Send a simple query via Telegram
# "What's 2+2?"

# Check logs for model selection
docker compose -f docker-compose.custom.yml logs -f | grep -i "model.*select"
```

**Expected:** gpt-4o selected (cheap model for simple task)

### Test 3: Model Escalation (Complex Task)

```bash
# Send a complex query
# "Analyze the security implications of the OpenClaw Shield project and suggest 3 architectural improvements."

# Check logs for escalation
docker compose -f docker-compose.custom.yml logs -f | grep -i "escalat"
```

**Expected:** Escalation to Sonnet or Opus based on complexity

### Test 4: Context Bundling (Size Limit)

```bash
# Check context size before and after bundling
# Look for log entries showing token counts

docker compose -f docker-compose.custom.yml logs -f | grep -i "context.*token"
```

**Expected:** Context capped at ~10,000 tokens

## Step 8: Verify Token Savings

```bash
# Check token audit log (from token-economy project)
cd /home/node/.openclaw/workspace/projects/token-economy

# If token auditor is running, check logs
tail -f logs/token-usage.jsonl

# Run daily audit report
node scripts/daily-audit-report.js
```

**Expected metrics:**
- Heartbeat tokens: 0
- Average tokens per request: ~50% reduction
- Cost per day: $1-1.50 (down from $3-5)

## Troubleshooting

### Build Fails

```bash
# Check build logs
docker build -f Dockerfile.custom -t openclaw-custom:token-economy . 2>&1 | tee build.log

# Common issues:
# - Missing dependencies: Check package.json
# - TypeScript errors: Run pnpm build locally first
# - Node version mismatch: Ensure node:22-alpine
```

### Plugins Not Loading

```bash
# Check plugin format
node -c /home/node/.openclaw/workspace/plugins/model-routing-plugin.js

# Check OpenClaw plugin system
docker exec openclaw-custom node /app/dist/cli.js plugins list

# Enable debug logging
# Add to config: "logLevel": "debug"
```

### Hooks Not Firing

```bash
# Check hook registration
docker exec openclaw-custom node /app/dist/cli.js hooks list

# Check logs for hook calls
docker compose -f docker-compose.custom.yml logs -f | grep -i "hook"

# Verify hook types in src/plugins/types.ts match plugin exports
```

### High Token Usage

```bash
# Check if heartbeat is actually skipping LLM
grep "Heartbeat" logs/*.log

# Check model routing decisions
grep "model.*select" logs/*.log

# Check context bundling
grep "context.*bundl" logs/*.log
```

## Rollback Procedure

If something goes wrong:

```bash
# Stop custom OpenClaw
cd /home/node/.openclaw/workspace/projects/openclaw
docker compose -f docker-compose.custom.yml down

# Restart original OpenClaw
cd /home/pedro/openclaw
docker compose up -d

# Your data is safe (workspace, config, data dirs are mounted, not copied)
```

## Success Criteria

- [ ] Custom OpenClaw starts without errors
- [ ] Plugins load successfully
- [ ] Heartbeat skips LLM when HEARTBEAT.md is empty
- [ ] Simple queries route to cheap model (gpt-4o)
- [ ] Complex queries escalate to Sonnet/Opus
- [ ] Context stays under 10,000 tokens
- [ ] Daily token usage drops by 60-80%
- [ ] Cost drops to $1-1.50/day

## Maintenance

### Daily
- Monitor token usage logs
- Check for errors in OpenClaw logs

### Weekly
- Review cost reports
- Adjust model routing thresholds if needed
- Update plugins if behavior needs tuning

### When Official Hooks Merge
- Monitor openclaw/openclaw issue #14779
- When hooks are released:
  1. Stop custom OpenClaw
  2. Pull official OpenClaw with hooks
  3. Install plugins (same files work)
  4. Resume operation on official build

---

**Last Updated:** 2026-02-12 17:08 UTC  
**Status:** Ready for deployment
