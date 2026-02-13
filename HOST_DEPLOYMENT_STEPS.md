# Deploy Custom OpenClaw from Host

**⚠️ Run these commands from your HOST machine (not inside Docker)**

Location: `/home/user/openclaw/`

## Quick Deploy (Automated)

```bash
cd /home/user/openclaw/workspace/projects/token-economy
bash deploy-custom.sh
```

This script will:
1. Copy plugins to workspace
2. Build Docker image (~5-10 min)
3. Deploy custom OpenClaw on port 3334
4. Show next steps

## Manual Deploy (Step-by-Step)

### 1. Prepare Plugins

```bash
cd /home/user/openclaw/workspace
mkdir -p plugins
cp projects/token-economy/plugins/model-routing-plugin.js plugins/
cp projects/token-economy/plugins/context-bundling-plugin.js plugins/
ls -la plugins/
```

### 2. Build Docker Image

```bash
cd /home/user/openclaw/workspace/projects/openclaw
docker build -f Dockerfile.custom -t openclaw-custom:token-economy .
```

**Expected time:** 5-10 minutes  
**Expected output:** "Successfully tagged openclaw-custom:token-economy"

### 3. Deploy Custom OpenClaw

**Option A: Side-by-side (Recommended for testing)**

```bash
cd /home/user/openclaw/workspace/projects/openclaw
docker compose -f docker-compose.custom.yml up -d
```

This runs custom OpenClaw on port 3334 while keeping your existing OpenClaw on 3333.

**Option B: Replace existing**

```bash
# Stop existing
cd /home/user/openclaw
docker compose down

# Start custom
cd /home/user/openclaw/workspace/projects/openclaw
docker compose -f docker-compose.custom.yml up -d
```

### 4. Verify Deployment

```bash
docker ps | grep openclaw
# Should show both containers (if side-by-side) or just custom
```

### 5. Install Plugins

```bash
# Install model routing plugin
docker exec openclaw-custom node /app/dist/cli.js plugins install /home/node/.openclaw/workspace/plugins/model-routing-plugin.js

# Install context bundling plugin
docker exec openclaw-custom node /app/dist/cli.js plugins install /home/node/.openclaw/workspace/plugins/context-bundling-plugin.js

# Verify
docker exec openclaw-custom node /app/dist/cli.js plugins list
```

### 6. Configure Plugins

Create config patch:

```bash
cat > /home/user/openclaw/workspace/plugin-config.json << 'EOF'
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
EOF
```

Apply configuration:

```bash
docker exec openclaw-custom node /app/dist/cli.js config patch /home/node/.openclaw/workspace/plugin-config.json
```

### 7. Test End-to-End

#### Test 1: Heartbeat Skip

```bash
# Ensure HEARTBEAT.md is empty
echo "" > /home/user/openclaw/workspace/HEARTBEAT.md

# Watch logs for heartbeat
docker compose -f /home/user/openclaw/workspace/projects/openclaw/docker-compose.custom.yml logs -f | grep -i heartbeat
```

**Expected:** "Heartbeat: HEARTBEAT.md empty, skipping LLM call"

#### Test 2: Model Routing

```bash
# Watch logs for model selection
docker compose -f /home/user/openclaw/workspace/projects/openclaw/docker-compose.custom.yml logs -f | grep -i model
```

Send test messages via Telegram and observe routing decisions.

### 8. Monitor Token Usage

```bash
# Check audit logs (if token-auditor hook is enabled)
tail -f /home/user/openclaw/workspace/projects/token-economy/logs/token-usage.jsonl

# Run daily report
cd /home/user/openclaw/workspace/projects/token-economy
node scripts/daily-audit-report.js
```

## Troubleshooting

### Build Fails

```bash
# Check Docker version
docker --version  # Should be 20.10+

# Check disk space
df -h

# Rebuild with no cache
docker build --no-cache -f Dockerfile.custom -t openclaw-custom:token-economy .
```

### Container Won't Start

```bash
# Check logs
docker logs openclaw-custom

# Check if port 3334 is available
sudo netstat -tlnp | grep 3334

# Try different port in docker-compose.custom.yml
```

### Plugins Not Loading

```bash
# Check plugin syntax
node -c /home/user/openclaw/workspace/plugins/model-routing-plugin.js

# Check plugin path inside container
docker exec openclaw-custom ls -la /home/node/.openclaw/workspace/plugins/

# Check OpenClaw logs
docker logs openclaw-custom | grep -i plugin
```

## Rollback

If anything goes wrong:

```bash
# Stop custom OpenClaw
cd /home/user/openclaw/workspace/projects/openclaw
docker compose -f docker-compose.custom.yml down

# Restart original (if stopped)
cd /home/user/openclaw
docker compose up -d
```

Your data is safe - all volumes are mounted, nothing is deleted.

## Success Metrics

After deployment, verify:

- [ ] Container running: `docker ps | grep openclaw-custom`
- [ ] Plugins loaded: `docker exec openclaw-custom node /app/dist/cli.js plugins list`
- [ ] Heartbeat skips LLM: Check logs for "skipping LLM call"
- [ ] Token usage drops 60-80%: Compare before/after
- [ ] Cost drops to $1-1.50/day: Monitor for 24-48 hours

## Timeline

- Build: ~5-10 minutes
- Deploy + configure: ~5 minutes
- Testing: ~30 minutes
- Monitoring: ~24-48 hours for validation

**Total effort:** ~1 hour + monitoring

---

**Created:** 2026-02-12 17:08 UTC  
**Status:** Ready for execution
