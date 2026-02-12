# Token Economy Implementation - Feasibility Analysis
**Analyzed by:** Opus  
**Date:** 2026-02-12 14:45 UTC  
**Status:** Complete - Recommendation Ready

---

## Executive Summary

After deep investigation of OpenClaw's architecture, **Option B (Full Integration) is FEASIBLE but requires core modifications**. The plugin/hook system is extensive but has critical gaps that prevent pure plugin-based implementation.

**Recommendation:** **Modified Option B** - Implement what we can today + propose PR to OpenClaw for missing hooks.

---

## Architecture Discovery Results

### ✅ What OpenClaw Provides

**1. Excellent Plugin System**
- **Location:** `/app/src/plugins/`
- **Capabilities:**
  - `before_agent_start` hook - inject context before LLM call
  - `agent_end` hook - analyze conversation after completion
  - `tool_result_persist` hook - modify tool results before saving
  - Custom tool registration
  - Config schema validation
  - Command registration

**2. Extensible Configuration**
- `config.patch` for partial updates (no full replacement needed)
- JSON Schema validation
- Automatic restart on config change

**3. Hooks System**
- Event-driven automation (`command:new`, `gateway:startup`, etc.)
- Can create custom hooks in workspace
- Runs TypeScript directly (no compilation needed)

**4. Source Code Available**
- Full TypeScript source at `/app/src/`
- Well-documented, modular architecture
- Build system in place (though we haven't tested rebuild yet)

### ⚠️ Critical Gaps

**1. NO Model Selection Hook**
- Model is selected in `runEmbeddedPiAgent` BEFORE any plugin hooks run
- The `provider` and `model` params come from callers (auto-reply, cron, commands)
- **No plugin intercept point** for dynamic model routing

**2. NO Context Building Hook**
- Context is built in `buildEmbeddedRunPayloads` (inside agent runner)
- Happens after plugin hooks run
- **No way to enforce context caps** via plugins

**3. Heartbeat Still Calls LLM**
- Heartbeat is a cron job that runs `runEmbeddedPiAgent`
- Always calls LLM, even if HEARTBEAT.md is empty
- `isHeartbeatContentEffectivelyEmpty()` exists but isn't used to skip LLM call
- **Burns tokens every 30 minutes regardless**

---

## Implementation Feasibility Matrix

| Component | Plugin-Based | Core Modification | Difficulty | Value |
|-----------|--------------|-------------------|------------|-------|
| **Token Auditing** | ✅ Yes | Optional | Easy | High |
| **Budget Monitoring** | ✅ Yes | Optional | Easy | High |
| **Task Classification** | ✅ Yes (standalone lib) | N/A | Easy | Medium |
| **Model Routing (automatic)** | ❌ No | ✅ Required | **Medium** | **Critical** |
| **Context Bundling (enforcement)** | ❌ No | ✅ Required | **Medium** | **Critical** |
| **Zero-Token Heartbeat** | ❌ No | ✅ Required | **Easy** | **Critical** |
| **Telegram Session Control** | ✅ Yes (custom command) | Optional | Medium | High |
| **Helper Modules** | ✅ Yes | N/A | Easy | Medium |
| **Context Files** | ✅ Yes | N/A | Easy | Medium |

---

## Option B: Full Integration - Detailed Assessment

### What We CAN Do Today (Plugin-Based)

**Phase 1: Foundation (4-6 hours)**

1. ✅ **Token Auditing Hook**
   - Create `agent_end` hook to log all LLM calls
   - JSONL audit log with full metadata
   - **Implementation:** Hook in `/home/node/.openclaw/workspace/hooks/token-auditor/`

2. ✅ **Budget Monitoring Script**
   - Analyze audit logs daily
   - Check against budget limits
   - Alert via Telegram on exceed
   - **Implementation:** Standalone script + cron job

3. ✅ **Helper Modules (Standalone)**
   - Task classifier logic (`lib/task-classifier.js`)
   - Model router logic (`lib/model-router.js`)
   - Context manager logic (`lib/context-manager.js`)
   - Budget guard logic (`lib/budget-guard.js`)
   - **Status:** Reusable, testable, ready for integration

4. ✅ **Configuration Schema**
   - Add `modelPolicy`, `contextPolicy`, `budgets` to openclaw.json
   - Document expected behavior
   - **Status:** Non-enforcing (just schema)

5. ✅ **Context Files**
   - Create baseline context bundles (safety.md, routing.md, etc.)
   - **Status:** Prepared for future integration

### What REQUIRES Core Modification

**Phase 2: Core Integration (2-3 days + testing)**

1. ❌ **Automatic Model Routing**
   
   **Current:** Model selected in `runEmbeddedPiAgent` before hooks run
   
   **Required Change:** Add `before_model_select` hook or modify callers
   
   **Files to Modify:**
   - `/app/src/agents/pi-embedded-runner/run.ts` (add hook call before `resolveModel`)
   - `/app/src/plugins/types.ts` (add hook type definition)
   - `/app/src/plugins/hooks.ts` (add hook runner method)
   
   **Approach:**
   ```typescript
   // In run.ts, before resolveModel()
   const hookRunner = getGlobalHookRunner();
   if (hookRunner?.hasHooks("before_model_select")) {
     const hookResult = await hookRunner.runBeforeModelSelect({
       sessionKey: params.sessionKey,
       prompt: params.prompt,
       requestedModel: { provider, modelId },
       config: params.config
     }, ctx);
     
     if (hookResult?.overrideModel) {
       provider = hookResult.overrideModel.provider;
       modelId = hookResult.overrideModel.model;
     }
   }
   ```
   
   **Complexity:** Medium (well-defined, follows existing pattern)
   **Risk:** Low (hook pattern is proven, non-breaking)

2. ❌ **Context Bundling Enforcement**
   
   **Current:** Context built in `buildEmbeddedRunPayloads`, no size limits
   
   **Required Change:** Add `before_context_build` hook or modify payload builder
   
   **Files to Modify:**
   - `/app/src/agents/pi-embedded-runner/run/payloads.ts`
   - `/app/src/plugins/types.ts`
   - `/app/src/plugins/hooks.ts`
   
   **Approach:**
   ```typescript
   // In payloads.ts, before building context
   const hookRunner = getGlobalHookRunner();
   if (hookRunner?.hasHooks("before_context_build")) {
     const hookResult = await hookRunner.runBeforeContextBuild({
       sessionKey: params.sessionKey,
       workspaceDir: params.workspaceDir,
       requestedFiles: bootstrapFiles,
       config: params.config
     }, ctx);
     
     if (hookResult?.filteredFiles) {
       bootstrapFiles = hookResult.filteredFiles; // Apply bundle limits
     }
   }
   ```
   
   **Complexity:** Medium (similar to model hook)
   **Risk:** Low (non-breaking, adds capability)

3. ❌ **Zero-Token Heartbeat**
   
   **Current:** Heartbeat always calls LLM
   
   **Required Change:** Check HEARTBEAT.md before LLM call, skip if empty
   
   **Files to Modify:**
   - `/app/src/cron/isolated-agent/run.ts` (add empty check before runEmbeddedPiAgent)
   
   **Approach:**
   ```typescript
   // In run.ts, before calling runEmbeddedPiAgent
   const heartbeatPath = path.join(workspaceDir, 'HEARTBEAT.md');
   if (fs.existsSync(heartbeatPath)) {
     const content = await fs.readFile(heartbeatPath, 'utf8');
     if (isHeartbeatContentEffectivelyEmpty(content)) {
       // Skip LLM call entirely
       return {
         success: true,
         skipped: true,
         reason: 'heartbeat_empty',
         externalTokens: 0
       };
     }
   }
   // Proceed with LLM call only if there are tasks
   ```
   
   **Complexity:** Easy (function already exists, just needs integration)
   **Risk:** Very Low (pure optimization, doesn't change behavior when HEARTBEAT.md has content)
   **Impact:** **90-100% heartbeat cost elimination** (currently ~50% of usage)

### What Can Be Plugin-Based (With Core Hooks)

Once the above hooks exist, these become plugin-based:

4. ✅ **Model Routing Plugin**
   - Implements `before_model_select` hook
   - Uses task classifier + model router logic
   - Logs routing decisions to audit log

5. ✅ **Context Bundling Plugin**
   - Implements `before_context_build` hook
   - Enforces bundle caps
   - Summarizes overflow (using GPT-4o)

---

## Build & Deploy Process

### Can We Rebuild OpenClaw?

**Status:** Unknown (needs verification)

**Steps to Test:**
1. Check if build system is available in container
2. Try: `npm run build` or similar
3. Verify binary output location
4. Test if rebuilt binary works

**Risk Mitigation:**
- Test rebuild in dev environment first
- Keep backup of working binary
- Document rollback procedure

**If rebuild fails:**
- Fork OpenClaw repository
- Build locally or in CI
- Deploy custom binary
- **OR** propose PR to upstream (cleaner long-term)

---

## Proposed PR to OpenClaw

**Title:** Add Plugin Hooks for Token Optimization

**Summary:**
Add three new plugin hooks to enable token cost management:
- `before_model_select` - Allow plugins to override model selection
- `before_context_build` - Allow plugins to filter/limit context
- Modify heartbeat to skip LLM call when HEARTBEAT.md is empty

**Benefits to OpenClaw Community:**
- Enables cost-conscious deployments
- No breaking changes (hooks are optional)
- Follows existing hook patterns
- Well-tested with real-world usage

**Timeline:**
- Draft PR: 1-2 days
- Review cycle: 1-2 weeks (estimate)
- Merge & release: Variable

**Advantages:**
- ✅ Cleaner than fork
- ✅ Benefits entire community
- ✅ Maintainer support for future compatibility
- ✅ No custom binary maintenance

**Disadvantages:**
- ⏱️ Depends on maintainer responsiveness
- ⏱️ May need iteration on design

---

## Timeline Estimates

### Option B.1: Core Modification (DIY)

**Week 1 (Today):**
- Day 1: Phase 1 (auditing, monitoring, helpers) - 6 hours
- Day 2: Test OpenClaw rebuild process - 4 hours
- Day 3: Implement 3 core hooks - 8 hours

**Week 2:**
- Day 4-5: Build model routing + context plugins - 8 hours
- Day 6: Integration testing - 6 hours
- Day 7: Documentation + GitHub push - 4 hours

**Total:** 36 hours over 7 days

**Risk:** Medium (rebuild uncertainty, testing time)

### Option B.2: Core Modification (PR Route)

**Week 1 (Today):**
- Day 1: Phase 1 (auditing, monitoring, helpers) - 6 hours
- Day 2-3: Draft PR with hooks - 10 hours
- Day 4: Submit PR, document design - 4 hours

**Week 2-4:**
- Wait for review
- Iterate on feedback
- Meanwhile: Develop plugins against proposed hooks (mockable)

**Week 5:**
- Integration once PR merges
- Testing
- Documentation + GitHub push

**Total:** 20 hours work + 3-4 weeks calendar time

**Risk:** Low (no custom binary), but timeline depends on maintainers

---

## Cost-Benefit Analysis

### Option A: Foundation Only

**Effort:** 6 hours  
**Value Delivered:**
- ✅ Complete visibility (audit logs)
- ✅ Budget alerts
- ✅ Foundation for future
- ❌ No automatic token savings
- ❌ Still burning ~$3-5/day

**ROI:** Low immediate, High long-term (foundation)

### Option B.1: Full Integration (DIY)

**Effort:** 36 hours (1 week focused)  
**Value Delivered:**
- ✅ 60-80% token reduction
- ✅ Zero-token heartbeat (~50% savings alone)
- ✅ Automatic model routing
- ✅ Context enforcement
- ✅ ~$1-1.50/day cost (vs $3-5/day)
- ⚠️ Custom binary maintenance

**ROI:** Very High immediate (pays for itself in ~10 days of savings)

### Option B.2: Full Integration (PR Route)

**Effort:** 20 hours work + 3-4 weeks wait  
**Value Delivered:**
- ✅ Same as B.1
- ✅ No custom binary
- ✅ Community benefit
- ✅ Long-term maintainer support
- ⏱️ Delayed implementation

**ROI:** Very High long-term, delayed gratification

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Rebuild fails | Medium | High | Test first, fork option |
| Hooks break OpenClaw | Low | High | Follow existing patterns, test thoroughly |
| Performance regression | Low | Medium | Add performance benchmarks |
| Config validation issues | Low | Low | Leverage existing schema system |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Custom binary breaks updates | Medium (DIY) | High | PR route, or version pin |
| Maintenance burden | Medium (DIY) | Medium | PR route preferred |
| Lost changes on OpenClaw update | High (DIY) | Medium | Document patches, automation |
| PR rejected/stalled | Low-Medium | Medium | Fork as fallback |

---

## Final Recommendation

### For Pedro: **Modified Option B**

**Phase 1 (Today - 6 hours):**
- ✅ Implement foundation (auditing, monitoring, helpers)
- ✅ Immediate visibility into token usage
- ✅ Budget alerts
- ✅ No OpenClaw modifications (zero risk)

**Phase 2 (This Week - 10-14 hours):**
- ✅ Draft PR to OpenClaw with 3 hooks
- ✅ Document rationale and design
- ✅ Submit for review
- ✅ Develop plugins against proposed hooks (mockable/testable)

**Phase 3 (Week 2-4):**
- ⏱️ Iterate on PR feedback
- ⏱️ Wait for merge
- ⏱️ Meanwhile: Complete Phase 1 deliverables fully

**Phase 4 (Week 5):**
- ✅ Integrate plugins once hooks merge
- ✅ Test end-to-end
- ✅ Push complete project to GitHub

**If PR stalls after 2 weeks:**
- Fall back to Option B.1 (DIY implementation)
- Document as temporary fork
- Revisit PR route later

---

## Why This Recommendation?

1. **Immediate Value** - Phase 1 delivers auditing/monitoring today
2. **Low Risk Start** - No OpenClaw modifications in Phase 1
3. **Community Benefit** - PR helps everyone, not just you
4. **Maintainable** - No custom binary if PR merges
5. **Fallback Option** - Can always DIY if PR doesn't work out
6. **Incremental** - Each phase delivers value independently
7. **Time Efficient** - 20 hours work vs 36 hours (DIY route)
8. **Cost Effective** - Same end result, less maintenance burden

---

## Next Steps (If Approved)

**Immediate (Today):**
1. Implement Phase 1 foundation
2. Start PR draft (outline hooks needed)

**Tomorrow:**
3. Complete PR documentation
4. Submit PR to OpenClaw GitHub

**This Week:**
5. Develop plugins (against mock hooks)
6. Await PR review

**Report back to Pedro:**
- Phase 1 completion + audit log working
- PR submitted + link
- Plugin prototypes ready

---

## Conclusion

**Option B IS FEASIBLE** with core modifications. The plugin system is excellent but has specific gaps (model selection, context building, heartbeat optimization).

**Recommended Path:** Modified Option B (Foundation + PR route)
- Lower risk than DIY
- Same end result
- Community benefit
- Professional approach
- Fallback available

**Pedro's willingness to take the risk if B is feasible:** NOTED and APPRECIATED. The risk is **manageable** via PR-first approach, with DIY as fallback.

**Estimated Cost Savings:** $1.50-3.50/day (~$45-105/month)
**Estimated Implementation:** 20 hours work + 3-4 weeks calendar time
**ROI:** Excellent (pays for itself in ~2 weeks of usage)

---

**Ready to proceed?** Awaiting your final approval to start Phase 1 + PR draft.

---

**Last Updated:** 2026-02-12 14:45 UTC  
**Document Version:** 1.0
