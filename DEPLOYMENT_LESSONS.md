# Token Economy Deployment Lessons Learned

**Date:** 2026-02-13  
**Context:** Real-world deployment of token-economy custom build in production Tailscale sidecar setup

---

## Critical Lessons

### 1. Same Tag ≠ Same Image (Container Recreation Required)

**Problem:** After rebuilding `openclaw-custom:token-economy`, containers showed inconsistent behavior:
- `openclaw-gateway` on new image (working)
- `openclaw-cli` on old image (reporting "plugin not found: telegram")

**Root cause:** Docker doesn't automatically update running containers when you rebuild a tag.

**Symptoms:**
- CLI reports different version than gateway
- Config validation fails in CLI but gateway works
- "Plugin not found" errors despite gateway running fine

**Verification:**
```bash
# Check if containers are on different image IDs
docker inspect -f 'gateway={{.Image}}' openclaw-gateway
docker inspect -f 'cli={{.Image}}' openclaw-cli

# Compare to current built image
docker images openclaw-custom:token-economy --format '{{.ID}}'
```

**Fix:**
```bash
# After ANY rebuild, force-recreate ALL containers
docker compose down
docker compose up -d

# Or recreate specific services
docker compose up -d --force-recreate --no-deps openclaw-gateway openclaw-cli openclaw-sandbox
```

**Takeaway:** Always `--force-recreate` all OpenClaw containers after rebuilding an image, even if the tag name is the same.

---

### 2. Control UI Must Be Baked Into Build

**Problem:** Gateway started but UI was missing:
```
Missing Control UI assets at /app/dist/control-ui/index.html
```

**Root cause:** The Dockerfile didn't include:
- `/app/scripts/ui.js` (needed to run `pnpm ui:build`)
- `pnpm` binary (Alpine base didn't have it)
- Built UI bundle in `/app/dist/control-ui/`

**Attempted workaround (failed):**
```bash
# Can't fix at runtime if tools are missing
docker exec openclaw-gateway pnpm ui:build
# Error: pnpm not found

# Even if you add pnpm, scripts are missing
docker exec openclaw-gateway corepack enable
docker exec openclaw-gateway pnpm ui:build
# Error: Cannot find module '/app/scripts/ui.js'
```

**Correct fix:** Update Dockerfile to build UI during image creation:

```dockerfile
# In builder stage
COPY . .
RUN pnpm build      # This should include UI build
RUN pnpm ui:build   # Or explicitly build UI

# In production stage
COPY --from=builder /app/dist ./dist  # Now includes control-ui/
```

**Verification:**
```bash
# After rebuild, check UI exists in image
docker run --rm openclaw-custom:token-economy ls -la /app/dist/control-ui/
# Should show index.html
```

**Takeaway:** Control UI cannot be built at runtime. It must be in the Dockerfile build process.

---

### 3. Auto-Enable + Reload = Restart Storms

**Problem:** Config edits kept reverting and gateway restarted repeatedly.

**What was happening:**
1. User removes `telegram` from config
2. Gateway starts and logs: `auto-enabled plugins: Telegram configured, not enabled yet`
3. Gateway writes `telegram` back into config
4. File watcher detects config change
5. Reload policy triggers: `config change requires gateway restart`
6. Gateway receives SIGUSR1 and restarts
7. Loop repeats

**Symptoms:**
- Config edits "don't stick"
- Constant restart messages in logs
- `meta.lastTouchedAt` changes trigger restarts

**Fix:** Set hot-reload mode to avoid restart loops:

```json
{
  "gateway": {
    "reload": {
      "mode": "hot",
      "debounceMs": 500
    }
  }
}
```

**How to apply safely:**
```bash
# Stop gateway so it can't rewrite config
docker compose stop openclaw-gateway

# Patch config (now changes persist)
nano /home/user/.openclaw-token/openclaw.json
# Add gateway.reload.mode = "hot"

# Recreate with clean config
docker compose up -d --force-recreate openclaw-gateway
```

**Takeaway:** In test environments with config churn, use `reload.mode: hot` to prevent restart storms from auto-rewrites.

---

### 4. Gateway Logs to File, Not Docker Logs

**Problem:** After stabilizing config, `docker logs openclaw-gateway` showed nothing. System looked dead.

**Reality:** Gateway was running fine, logs just moved to file.

**Where to find logs:**
```bash
# Structured JSON logs
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log

# Or from host (if mounted)
tail -f /home/user/.openclaw-token/logs/openclaw-$(date +%Y-%m-%d).log
```

**Health check from logs:**
```bash
tail -50 /tmp/openclaw/openclaw-*.log | grep -E "listening|canvas|heartbeat|telegram"
```

**Expected healthy output:**
- `canvas mounted`
- `heartbeat started`
- `gateway listening on ws://0.0.0.0:18789`
- `telegram provider starting`

**Takeaway:** Empty `docker logs` doesn't mean dead gateway. Check file logs.

---

### 5. CLI/Gateway Version Mismatch Breaks Everything

**Problem:** CLI reported `plugins.entries.telegram: plugin not found` even though gateway was running Telegram fine.

**Root cause:** CLI was on old image with different plugin registry than gateway.

**Detection:**
```bash
# Check versions
docker exec openclaw-gateway node /app/dist/index.js --version  # e.g., 2026.2.1
docker exec openclaw-cli node /app/dist/index.js --version      # e.g., 2026.2.10 (mismatch!)

# Or check image IDs
docker inspect -f '{{.Image}}' openclaw-gateway openclaw-cli
```

**Fix:**
```bash
docker compose up -d --force-recreate --no-deps openclaw-cli
```

**Verification:**
```bash
openclaw channels status
# Should now show: Telegram default: enabled, configured, running
```

**Takeaway:** Gateway + CLI + Sandbox must all be on the same image build. Always recreate all three.

---

### 6. Config Validation Blocks Setup/Doctor

**Problem:** When config referenced missing plugins (e.g., `memory-core`), neither `openclaw setup` nor `openclaw doctor --fix` could run.

**Why:** Both tools validate config before writing. Invalid config = they can't proceed.

**Symptoms:**
```
plugins.slots.memory: plugin not found: memory-core
Setup failed: config validation error
```

**Fix:** Patch config directly before running setup/doctor:

```json
{
  "plugins": {
    "slots": {
      "memory": "none"  // Disable missing plugin
    }
  }
}
```

**Then:**
```bash
docker compose restart openclaw-gateway
# Now setup/doctor can run
```

**Takeaway:** When config validation blocks tooling, edit `openclaw.json` directly. Don't wait for "helpful commands" to fix it — they can't run.

---

### 7. Tailscale Sidecar = Network Mode Gotchas

**Setup:**
```yaml
services:
  ts-scraper:
    image: tailscale/tailscale:stable
    ports:
      - "18789:18789"
      - "18790:18790"
  
  openclaw-gateway:
    network_mode: "service:ts-scraper"  # Shares netns
```

**Gotcha 1:** You cannot publish ports on `openclaw-gateway` itself:
```yaml
openclaw-gateway:
  network_mode: "service:ts-scraper"
  ports:
    - "3333:3333"  # ❌ ERROR: conflicting options
```

**Gotcha 2:** Port publishing happens at `ts-scraper`, so ports can appear "open" even if gateway process is dead:
```bash
netstat -tuln | grep 18789  # Shows LISTEN
# But gateway might not actually be running behind it
```

**Verification:**
```bash
# Don't trust netstat alone
# Check gateway is actually listening:
tail /tmp/openclaw/openclaw-*.log | grep "listening on"
```

**Takeaway:** In Tailscale sidecar mode, verify gateway health from logs, not port checks.

---

## Deployment Checklist (Avoid These Issues)

Before deploying token-economy build:

- [ ] Dockerfile includes UI build (`pnpm ui:build`)
- [ ] Config doesn't reference unavailable plugins (`memory-core`, etc.)
- [ ] Set `gateway.reload.mode = "hot"` for test environments
- [ ] After rebuild: `docker compose down && docker compose up -d` (recreate ALL containers)
- [ ] Verify CLI/gateway are same version: `docker inspect -f '{{.Image}}' openclaw-gateway openclaw-cli`
- [ ] Check file logs, not just `docker logs`: `tail -f /tmp/openclaw/openclaw-*.log`
- [ ] Confirm Telegram actually running: `openclaw channels status`

---

## Recovery Procedure (If Build Breaks)

```bash
# 1. Stop everything
docker compose down

# 2. Fix config (disable missing plugins)
nano /home/user/.openclaw-token/openclaw.json
# Set plugins.slots.memory = "none"
# Set gateway.reload.mode = "hot"

# 3. Rebuild with no cache
docker build --no-cache --pull -t openclaw-custom:token-economy -f Dockerfile .

# 4. Start fresh (forces all containers to new image)
docker compose up -d

# 5. Verify health from file logs
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log

# 6. Verify CLI matches gateway
docker inspect -f '{{.Image}}' openclaw-gateway openclaw-cli

# 7. Test Telegram
openclaw channels status
```

---

**Last Updated:** 2026-02-13 02:04 UTC  
**Status:** Production-stable deployment achieved after these fixes
