# Token Economy Implementation - Project Context

**Started:** 2026-02-12 14:34 UTC  
**Analyzer:** Opus (switched from Sonnet at 14:41 UTC)  
**Status:** ✅ Feasibility Analysis Complete - Awaiting Pedro's Approval

---

## Current Phase: Decision Point

**Completed:** Deep technical analysis of OpenClaw architecture  
**Outcome:** Option B (Full Integration) IS FEASIBLE with core modifications  
**Recommendation:** Modified Option B (Foundation + PR Route)

---

## Key Findings

### ✅ What OpenClaw Provides

1. **Excellent Plugin System**
   - `before_agent_start` hook (inject context)
   - `agent_end` hook (analyze results)
   - `tool_result_persist` hook (modify tool outputs)
   - Custom tool registration
   - Config schema validation

2. **Extensible Configuration**
   - `config.patch` for partial updates
   - JSON Schema validation
   - Automatic restart on changes

3. **Full Source Code Available**
   - TypeScript at `/app/src/`
   - Modular, well-documented
   - Build system exists (untested)

### ⚠️ Critical Gaps

1. **NO Model Selection Hook**
   - Model resolved in `runEmbeddedPiAgent` BEFORE plugins run
   - No intercept point for dynamic routing
   - **Requires:** New `before_model_select` hook

2. **NO Context Building Hook**
   - Context built in `buildEmbeddedRunPayloads`
   - No size limit enforcement
   - **Requires:** New `before_context_build` hook

3. **Heartbeat Always Calls LLM**
   - Function to check if HEARTBEAT.md is empty EXISTS but unused
   - Burns tokens every 30 minutes regardless
   - **Requires:** Pre-LLM empty check

---

## Recommended Approach: Modified Option B

### Phase 1: Foundation (Today - 6 hours)

**Deliverables:**
- ✅ Token auditing hook (`agent_end`)
- ✅ Budget monitoring script
- ✅ Helper modules (task classifier, model router, etc.)
- ✅ Configuration schema additions
- ✅ Context files preparation

**Value:** Immediate visibility, budget alerts, foundation
**Risk:** Zero (no OpenClaw modifications)

### Phase 2: PR Preparation (This Week - 10-14 hours)

**Deliverables:**
- ✅ Draft PR to OpenClaw with 3 needed hooks:
  - `before_model_select`
  - `before_context_build`
  - Heartbeat optimization
- ✅ Documentation and design rationale
- ✅ Plugin prototypes (mockable, testable)
- ✅ Submit PR for community review

**Value:** Professional approach, community benefit
**Risk:** Low (no custom binary yet)

### Phase 3: PR Review (Weeks 2-4)

**Activities:**
- Iterate on maintainer feedback
- Continue Phase 1 polish
- Prepare integration tests

**Value:** Maintainer buy-in, long-term support
**Risk:** Timeline depends on maintainer responsiveness

### Phase 4: Integration (Week 5)

**Deliverables:**
- ✅ Integrate plugins once hooks merge
- ✅ End-to-end testing
- ✅ Complete documentation
- ✅ Push to GitHub: https://github.com/pfaria32/open_claw_token_economy

**Value:** Complete solution, 60-80% token reduction
**Risk:** Low (hooks tested via PR process)

### Fallback Option

**If PR stalls after 2 weeks:**
- Implement DIY (custom OpenClaw build)
- Document as temporary fork
- Revisit PR route later
- Estimated: +16 hours for custom build path

---

## Expected Impact

### Cost Savings
- **Before:** ~$3-5/day
- **After:** ~$1-1.50/day
- **Savings:** 60-80% reduction
- **Heartbeat alone:** 90-100% elimination (~50% of current usage)

### Implementation Effort
- **Phase 1:** 6 hours
- **Phase 2:** 10-14 hours
- **Phase 3:** Wait time (maintainer-dependent)
- **Phase 4:** 4-6 hours
- **Total:** 20-26 hours work + 3-4 weeks calendar time

### ROI
- Effort: 20-26 hours
- Monthly savings: ~$45-105
- Payback: ~2 weeks of operation
- Long-term: No custom binary maintenance

---

## Risk Assessment

### Low-Risk Elements (Phase 1)
- Auditing system
- Budget monitoring
- Helper modules
- Configuration schema
- Context files

### Medium-Risk Elements (Phase 2-4)
- PR acceptance (mitigated by following OpenClaw patterns)
- Integration testing (mitigated by incremental approach)
- Rebuild process (untested, but fallback available)

### High-Risk Elements (Avoided)
- Custom binary without PR (avoided via PR-first approach)
- Breaking changes (avoided via optional hooks)
- Maintenance burden (avoided via upstream contribution)

---

## Files Created

1. **FEASIBILITY_ANALYSIS.md** (14.7 KB) ✅
   - Complete technical analysis
   - Architecture investigation results
   - Detailed recommendations

2. **IMPLEMENTATION_PLAN.md** (5.2 KB) ✅
   - Three options analyzed
   - Constraints identified

3. **PROJECT_ANALYSIS.md** (34 KB) ✅
   - Original comprehensive guide by Opus
   - 12-phase implementation roadmap

4. **HANDOFF_TO_SONNET.md** (6.3 KB) ✅
   - Implementation handoff brief

5. **README.md** (4.1 KB) ✅
   - Project overview

6. **PROJECT_CONTEXT.md** (This file)
   - Living project status document

---

## Next Action Required

**Awaiting Pedro's approval to proceed with Modified Option B.**

**If approved:**
1. Start Phase 1 implementation immediately (today)
2. Begin PR draft (this week)
3. Report progress after Phase 1 completion

**Questions for Pedro:**
- Approve Modified Option B approach?
- Any concerns about PR timeline (3-4 weeks)?
- Prefer DIY route if faster implementation critical?

---

**Last Updated:** 2026-02-12 14:50 UTC
