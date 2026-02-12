# Handoff: Token Economy Implementation

**Date:** 2026-02-12  
**From:** Opus (Analysis)  
**To:** Sonnet (Implementation)  
**User:** Pedro

---

## Quick Summary

I've completed a comprehensive analysis of the token economy project. All requirements, architecture decisions, and implementation details are documented in `PROJECT_ANALYSIS.md` (33KB, ~8k words).

**Key deliverable:** A complete, phase-by-phase implementation guide that you (Sonnet) can follow to implement this project.

---

## What I Did

1. ✅ **Analyzed current OpenClaw architecture** - Examined config files, docs, existing model selection
2. ✅ **Designed complete system** - 12 phases covering config, routing, context, auditing, budget, docs
3. ✅ **Provided implementation details** - Code samples, file paths, integration points
4. ✅ **Created testing strategy** - Unit tests, integration tests, before/after metrics
5. ✅ **Documented migration plan** - Staged rollout, rollback plan, feature flags
6. ✅ **Specified documentation requirements** - Project docs, RAG knowledge base, GitHub README

---

## What You Need to Do

### Immediate Next Steps

1. **Read `PROJECT_ANALYSIS.md`** - It's your complete implementation guide
2. **Answer the "Open Questions"** - Investigate OpenClaw codebase to find:
   - Agent turn handler location
   - Telegram plugin code
   - Heartbeat scheduler
   - Context injection mechanism
   - Existing logging infrastructure
3. **Start Phase 1** - Config schema extensions (add `modelPolicy`, `contextPolicy`, `budgets` to openclaw.json)
4. **Implement incrementally** - One phase at a time, test each before moving to next
5. **Update progress** - Mark completed phases in the checklist

### Critical Constraints (Non-Negotiable)

- ⚠️ **Heartbeat MUST use 0 external tokens** (this is ~50% of current usage)
- ⚠️ **Default model remains Sonnet** (not GPT-4o)
- ⚠️ **GPT-4o for cheap tasks only** (file ops, extract, summarize)
- ⚠️ **All LLM usage must be auditable** (JSONL log)
- ⚠️ **Telegram history must be truncated** (currently unlimited = massive bloat)

### Expected Outcome

- **60-80% token reduction** (from ~$3-5/day to ~$1-1.50/day)
- **Zero-token heartbeat** (currently burning ~96k tokens/day)
- **Complete audit trail** (daily reports, cost tracking)
- **Bounded context** (3k token max per bundle vs unlimited)
- **Budget guardrails** ($25/day hard cap)

---

## File Structure

```
projects/token-economy/
├── PROJECT_ANALYSIS.md     ← Your implementation bible (READ THIS FIRST)
├── HANDOFF_TO_SONNET.md    ← This file
├── README.md               ← Create during Phase 12
├── TOKEN_EFFICIENCY.md     ← Create during Phase 12
├── lib/
│   ├── task-classifier.js  ← Create during Phase 2
│   ├── model-router.js     ← Create during Phase 3
│   ├── context-manager.js  ← Create during Phase 4
│   ├── token-auditor.js    ← Create during Phase 7
│   └── budget-guard.js     ← Create during Phase 8
├── context/
│   ├── safety.md           ← Create during Phase 4
│   ├── routing.md          ← Create during Phase 4
│   ├── sales.md            ← Create during Phase 4
│   ├── coding.md           ← Create during Phase 4
│   └── ops.md              ← Create during Phase 4
└── tests/
    └── token-economy/
        ├── task-classifier.test.js
        ├── model-router.test.js
        ├── context-manager.test.js
        ├── budget-guard.test.js
        └── integration.test.js
```

---

## Your Authorization

Pedro explicitly requested:
> "I want to implement much stricter token economy... implementation and coding will be done afterward by sonnet, so make sure you provide sufficient detail and context for sonnet to do this."

You have full authority to:
- Modify OpenClaw configuration
- Create new modules/libraries
- Update system prompts
- Implement all 12 phases
- Push entire project to GitHub: https://github.com/pfaria32/open_claw_token_economy.git

---

## Communication Protocol

- **Update PROJECT_ANALYSIS.md** as you discover answers to open questions
- **Mark checklist items** as you complete phases
- **Create PROJECT_CONTEXT.md** when pausing work (see AGENTS.md guidelines)
- **Ask Pedro** if you hit blockers or need clarification
- **Document** all discoveries, decisions, and deviations

---

## Success Criteria

### Must-Have (Launch Blockers)
- [ ] Heartbeat uses 0 external tokens (verified with 100 runs)
- [ ] Model routing works (all task types tested)
- [ ] Context is bounded (hard caps enforced)
- [ ] Audit log captures every LLM call
- [ ] Budget guardrails block overruns
- [ ] Daily report generates correctly
- [ ] **All code and docs pushed to GitHub repository**

### Nice-to-Have (Post-Launch)
- [ ] Automatic context summarization (vs truncation)
- [ ] Real-time cost dashboard
- [ ] Slack/Discord alert integration

---

## Timeline

- **Conservative:** 9-14 days
- **Focused:** 5-7 days

Start with Phase 1 (config schema). Don't try to implement everything at once.

---

## Questions for Pedro (If Needed)

1. Do you want to review config changes before I apply them?
2. Should I create a test Telegram group for `/new session` testing?
3. Do you want daily audit reports sent to Telegram automatically?
4. What's your preferred alert channel for budget exceed notifications?

---

## Final Deliverable: GitHub Repository

**When Phase 12 is complete, push the entire project to:**

```
https://github.com/pfaria32/open_claw_token_economy.git
```

**What to include:**
- All implementation code (lib/*.js)
- All context files (context/*.md)
- All test files (tests/token-economy/*.test.js)
- All documentation (README.md, PROJECT_ANALYSIS.md, TOKEN_EFFICIENCY.md, etc.)
- All scripts and utilities
- Git history showing implementation progress

**Steps:**
```bash
cd /home/node/.openclaw/workspace/projects/token-economy
git init
git add .
git commit -m "Initial commit: Token-efficient OpenClaw implementation"
git remote add origin git@github.com:pfaria32/open_claw_token_economy.git
git push -u origin main
git tag v1.0.0
git push --tags
```

---

## Go!

You have everything you need in `PROJECT_ANALYSIS.md`. Read it carefully, then start with Phase 1.

Good luck! 🚀

---

**Opus signing off. Over to you, Sonnet.**
