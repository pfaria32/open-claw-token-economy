# CORRECTED Token Economy Build Process

**Date:** 2026-02-13 03:30 UTC  
**Issue:** Previous Dockerfile.custom was fundamentally broken (missing UI, wrong base, wrong assumptions)

---

## What Was Wrong With Previous Build

**Critical Issues:**
1. ❌ **Missing Control UI** - Never ran `pnpm ui:build`, so `/app/dist/control-ui/index.html` didn't exist
2. ❌ **Alpine base** - Used node:22-alpine instead of known-good node:22-bookworm
3. ❌ **Missing scripts/** - Didn't copy scripts/ui.js needed for UI build
4. ❌ **Wrong assumptions** - Hardcoded port 3333 and healthcheck that don't match compose deployment
5. ❌ **Incomplete --ignore-scripts** - Skipped postinstall without compensating

**Evidence (from preflight inspection):**
```bash
docker run --rm --entrypoint sh openclaw-custom:token-economy-candidate -lc '
  echo "OS:"; cat /etc/os-release | head -n 3
  echo "UI:"; ls -la /app/dist/control-ui/index.html 2>/dev/null || echo MISSING_UI
  echo "UI script:"; ls -la /app/scripts/ui.js 2>/dev/null || echo MISSING_UI_SCRIPT
  echo "Version:"; node /app/dist/index.js --version 2>/dev/null || true
'
```

**Results:**
- OS: Alpine Linux (wrong base)
- MISSING_UI
- MISSING_UI_SCRIPT  
- Version: 2026.2.10

**Outcome:** Would have broken UI again with "Missing Control UI assets" error

---

## Corrected Dockerfile

**File:** `Dockerfile.custom-FIXED`

**Key Changes:**
1. ✅ Uses `node:22-bookworm` (matches known-good baseline)
2. ✅ Installs Bun (required for build scripts)
3. ✅ Enables corepack (for pnpm)
4. ✅ Copies `scripts/` before build
5. ✅ Runs **BOTH** `pnpm build` AND `pnpm ui:build`
6. ✅ Sets `OPENCLAW_PREFER_PNPM=1` for UI build
7. ✅ Runs as non-root user (`node:node`)
8. ✅ Uses correct CMD: `node openclaw.mjs gateway --allow-unconfigured`
9. ✅ Removes wrong port/healthcheck assumptions (compose handles this)

**Source hooks:** Already in place from earlier changes:
- `src/plugins/types.ts` (~50 lines)
- `src/plugins/hooks.ts` (~40 lines)
- `src/agents/pi-embedded-runner/run.ts` (~30 lines)
- `src/agents/bootstrap-files.ts` (~25 lines)
- `src/cron/isolated-agent/run.ts` (~20 lines)

---

## Proper Build Process

### Step 1: Rename Fixed Dockerfile

```bash
cd /home/pedro/openclaw/workspace/projects/openclaw

# Backup old (broken) Dockerfile
mv Dockerfile.custom Dockerfile.custom.BROKEN

# Use fixed version
mv Dockerfile.custom-FIXED Dockerfile.custom
```

### Step 2: Build Candidate Image

```bash
# Build with UNIQUE tag (don't overwrite running image)
docker build --no-cache --pull \
  -f Dockerfile.custom \
  -t openclaw-custom:token-economy-candidate \
  .
```

**Expected time:** ~10 minutes  
**Watch for:** `pnpm ui:build` step running successfully

### Step 3: Run Acceptance Tests (MANDATORY)

**Must pass ALL tests before deployment:**

```bash
# Test 1: UI asset exists
echo "=== Test 1: Control UI exists ==="
docker run --rm --entrypoint sh openclaw-custom:token-economy-candidate -lc \
  'ls -la /app/dist/control-ui/index.html' || echo "FAIL: Missing UI"

# Test 2: Gateway version prints
echo "=== Test 2: Gateway version ==="
docker run --rm --entrypoint sh openclaw-custom:token-economy-candidate -lc \
  'node /app/openclaw.mjs --version' || echo "FAIL: Version check"

# Test 3: OS base is Bookworm
echo "=== Test 3: OS base ==="
docker run --rm --entrypoint sh openclaw-custom:token-economy-candidate -lc \
  'cat /etc/os-release | head -n 3'

# Test 4: Scripts exist
echo "=== Test 4: UI build script exists ==="
docker run --rm --entrypoint sh openclaw-custom:token-economy-candidate -lc \
  'ls -la /app/scripts/ui.js' || echo "FAIL: Missing UI script"

# Test 5: Hooks compiled in
echo "=== Test 5: Hooks in types ==="
docker run --rm --entrypoint sh openclaw-custom:token-economy-candidate -lc \
  'grep "before_model_select" /app/dist/plugins/types.d.ts' || echo "FAIL: Hooks not compiled"
```

**Expected results:**
- Test 1: File exists, shows size
- Test 2: Version prints (2026.2.1 or similar)
- Test 3: Debian GNU/Linux 12 (bookworm)
- Test 4: Script exists
- Test 5: Hook definition found

### Step 4: Test-Start Gateway (One-Off)

```bash
# Start gateway in test mode (doesn't replace prod)
docker run --rm -it \
  -v /home/pedro/.openclaw:/home/node/.openclaw \
  -e OPENCLAW_GATEWAY_TOKEN=test123 \
  openclaw-custom:token-economy-candidate \
  node openclaw.mjs gateway --bind lan --port 3334

# Watch logs for:
# ✅ "gateway listening"
# ✅ NO "Missing Control UI assets"
# ✅ "canvas mounted"
# ✅ "heartbeat started"

# Press Ctrl+C to stop when verified
```

### Step 5: Deploy (Only After All Tests Pass)

```bash
# Tag candidate as production
docker tag openclaw-custom:token-economy-candidate openclaw-custom:token-economy

# Restart all services with new image
cd /home/pedro/openclaw
docker compose down
docker compose up -d

# Verify all containers use same image
docker inspect -f '{{.Name}} -> {{.Image}}' \
  openclaw-gateway openclaw-cli openclaw-sandbox
```

**Must show:** All three containers on same image ID

### Step 6: Post-Deployment Verification

```bash
# Check file logs (docker logs may be empty)
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log

# Verify:
# ✅ gateway listening
# ✅ canvas mounted
# ✅ heartbeat started
# ✅ telegram provider starting
# ✅ NO "Missing Control UI" errors

# Test UI access
# https://openclaw.tail11f529.ts.net/?token=...

# Test Telegram
# Send message via Telegram
```

---

## Acceptance Criteria Summary

**Before deployment, ALL must be true:**

- [ ] Test 1: `/app/dist/control-ui/index.html` exists
- [ ] Test 2: Gateway version prints correctly
- [ ] Test 3: OS is Debian Bookworm (not Alpine)
- [ ] Test 4: `/app/scripts/ui.js` exists
- [ ] Test 5: Hooks compiled into `/app/dist/plugins/types.d.ts`
- [ ] Test 6: Test-start gateway shows no UI errors
- [ ] Test 7: All three containers (gateway, CLI, sandbox) use same image ID

**If ANY test fails:** DO NOT DEPLOY. Debug and rebuild.

---

## Rollback Procedure

If deployed image breaks:

```bash
# 1. Check what image is currently "known-good"
docker images openclaw-custom --format "{{.ID}} {{.Tag}} {{.CreatedAt}}"

# 2. Find the previous working image (before candidate)
# Look for image from Feb 12, 23:23 UTC or earlier

# 3. Tag it back
docker tag sha256:<old-good-id> openclaw-custom:token-economy

# 4. Recreate containers
docker compose down
docker compose up -d
```

**Known-good baseline:** `sha256:587cb823...` (Feb 12, Bookworm build with UI working)

---

## Questions to Answer Before Proceeding

1. **Have you renamed Dockerfile.custom to Dockerfile.custom-FIXED?**
2. **Are you ready to run the 5 acceptance tests?**
3. **Do you have the known-good image ID noted for rollback?**

---

**Status:** Ready to build (awaiting Pedro's confirmation)  
**Risk Level:** LOW (with proper testing)  
**Expected Outcome:** Token-economy hooks active + stable UI + all services working

---

**DO NOT SKIP ACCEPTANCE TESTS**

The previous build looked correct but was fundamentally broken. Tests are mandatory.
