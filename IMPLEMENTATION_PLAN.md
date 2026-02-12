# Token Economy - Realistic Implementation Plan

**Status:** Architecture Investigation Complete  
**Date:** 2026-02-12

---

## Architecture Discovery

### What We Found

✅ **OpenClaw has TypeScript source code** at `/app/src/`  
✅ **Hooks system exists** - Event-driven automation (`command:new`, `gateway:startup`, `agent:bootstrap`)  
✅ **Plugin system exists** - In-process extensions with schema  
✅ **Configuration is extensible** - `config.patch` for partial updates  
✅ **Model selection code** at `/app/src/agents/model-selection.ts`  
✅ **Agent runner** at `/app/src/agents/pi-embedded-runner/run.ts`

###Constraints

⚠️ **Core modification requires rebuild** - Would need to recompile OpenClaw  
⚠️ **Plugin API may have limitations** - Need to verify extensibility  
⚠️ **Hooks run separately from agent turn** - Cannot directly intercept model selection

---

## Revised Implementation Strategy

### Phase 1: Foundation (Immediate - Today)

**Goal:** Set up auditing, configuration schema, and helper modules

1. ✅ **Configuration Schema Extensions**
   - Add `modelPolicy`, `contextPolicy`, `budgets` to openclaw.json
   - Document expected behavior
   - No enforcement yet (just schema)

2. ✅ **Token Auditing Hook**
   - Create hook that logs all LLM calls
   - JSONL audit log format
   - Daily rollup reports

3. ✅ **Budget Monitoring Script**
   - Script to analyze audit logs
   - Check against daily budgets
   - Alert on exceed

4. ✅ **Helper Modules** (standalone, reusable)
   - `lib/task-classifier.js` - Task classification logic
   - `lib/model-router.js` - Model routing logic (standalone)
   - `lib/context-manager.js` - Context bundling logic
   - `lib/budget-guard.js` - Budget checking

5. ✅ **Context Files**
   - Create baseline context files (safety.md, routing.md, etc.)
   - Prepare for future integration

### Phase 2: Integration Points (Requires Core Changes)

**Goal:** Actually enforce model routing and context limits

**Options:**

**A) Plugin Approach** (Preferred if possible)
- Create OpenClaw plugin that hooks into agent runner
- Intercept model selection
- Modify context building
- **Status:** Need to verify plugin API capabilities

**B) Core Fork Approach** (If plugin insufficient)
- Fork OpenClaw repository
- Modify `/app/src/agents/model-selection.ts`
- Modify `/app/src/agents/pi-embedded-runner/run.ts`
- Build custom binary
- **Status:** High maintenance burden

**C) Pull Request Approach** (Long-term)
- Implement as PR to OpenClaw project
- Contribute upstream
- Benefit entire community
- **Status:** Requires OpenClaw maintainer buy-in

### Phase 3: Testing & Validation

- Unit tests for all modules
- Integration tests with live OpenClaw instance
- Before/after metrics collection
- Performance validation

### Phase 4: Documentation & GitHub

- Complete documentation
- Push to GitHub repository
- Create migration guide

---

## What We Can Deliver Today

### Immediate Value (Phase 1)

1. **Complete auditing system** - Track every LLM call
2. **Budget monitoring** - Know when you're approaching limits
3. **Configuration schema** - Define desired behavior
4. **Helper modules** - Reusable logic for future integration
5. **Context files** - Prepared for bounded context
6. **Telegram session control** - Via custom command/hook

### What Requires More Work

1. **Automatic model routing** - Needs core integration
2. **Context bundling enforcement** - Needs core integration  
3. **Zero-token heartbeat** - Needs heartbeat modification

---

## Decision Point

### Option A: Deliver Phase 1 Only (Today)

**Pros:**
- Immediate auditing and monitoring
- Foundation for future integration
- No OpenClaw modifications
- Low risk

**Cons:**
- No automatic enforcement
- Still burning tokens without routing
- Requires manual model switching

### Option B: Attempt Full Integration (Multi-day)

**Pros:**
- Complete solution
- Automatic enforcement
- Maximum token savings

**Cons:**
- Requires plugin development OR core fork
- Higher complexity and risk
- May require OpenClaw rebuild
- Unknown timeline (3-7+ days)

### Option C: Hybrid (Recommended)

**Phase 1 Today:**
- Auditing + monitoring (immediate value)
- Helper modules (future-ready)
- Configuration schema
- Documentation

**Phase 2 This Week:**
- Investigate plugin API thoroughly
- Prototype integration
- If plugin viable → implement
- If not → propose PR to OpenClaw

---

## Recommendation to Pedro

I recommend **Option C (Hybrid)**:

1. **Today:** Deliver Phase 1 (auditing, monitoring, foundations)
2. **This week:** Deep-dive plugin API, prototype integration
3. **If plugin works:** Complete integration
4. **If not:** Collaborate with OpenClaw team on PR

This gives you:
- ✅ Immediate visibility into token usage
- ✅ Budget alerts
- ✅ Foundation for full solution
- ✅ Risk mitigation (don't break current setup)
- ⏱️ Time to properly investigate integration options

---

## Next Steps (Awaiting Your Direction)

**Option 1:** Proceed with Phase 1 only (deliverable today)
**Option 2:** Attempt full integration now (higher risk, longer timeline)
**Option 3:** Hybrid approach (Phase 1 today + investigation this week)

**Your call!**

---

**Last Updated:** 2026-02-12 14:40 UTC
