# Token-Efficient OpenClaw

**Status:** ✅ Phase 2 Complete - PR Materials Ready  
**Created:** 2026-02-12  
**Last Updated:** 2026-02-12 15:30 UTC  
**Objective:** Implement 60-80% token cost reduction while preserving reasoning quality

---

## Quick Links

- **[PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md)** - Complete implementation guide (33KB)
- **[HANDOFF_TO_SONNET.md](HANDOFF_TO_SONNET.md)** - Implementation handoff brief

---

## Project Overview

This project implements comprehensive token economy controls for OpenClaw:

### Core Strategy
1. **Model Routing** - Cheap-first with escalation (GPT-4o → Sonnet → Opus)
2. **Bounded Context** - Hard caps on context injection (10k tokens max per bundle)
3. **Zero-Token Heartbeat** - Logic-only heartbeat (currently burning ~50% of tokens)
4. **Telegram Session Control** - Truncate history to 50 messages (vs unlimited)
5. **Token Auditing** - Complete audit trail with daily reports
6. **Budget Guardrails** - Hard spending limits with automatic blocking

### Expected Impact
- **-90-100%** heartbeat cost (0 tokens vs ~96k/day)
- **-60-80%** overall token usage
- **-70%** cost for routine tasks (GPT-4o vs Sonnet)
- **~$1-1.50/day** total (vs ~$3-5/day current)

---

## Project Structure

```
token-economy/
├── README.md                   ← This file
├── PROJECT_ANALYSIS.md         ← Implementation bible (READ FIRST)
├── HANDOFF_TO_SONNET.md        ← Handoff brief for Sonnet
├── TOKEN_EFFICIENCY.md         ← User-facing guarantees doc (create later)
├── lib/                        ← Core libraries (create during implementation)
├── context/                    ← Context bundle files (create during implementation)
└── tests/                      ← Test suite (create during implementation)
```

---

## Implementation Phases

1. **Config Schema** - Add modelPolicy, contextPolicy, budgets
2. **Task Classification** - Classify requests into task types
3. **Model Router** - Select model based on task + escalation
4. **Context Manager** - Enforce bounded context with bundles
5. **Telegram Control** - Truncate history + `/new session` command
6. **Zero-Token Heartbeat** - Logic-only heartbeat (CRITICAL)
7. **Token Auditing** - JSONL log + daily reports
8. **Budget Guardrails** - Pre-call budget checks
9. **System Prompts** - Add efficiency constraints
10. **Testing** - Unit + integration tests
11. **Migration** - Staged rollout with rollback plan
12. **Documentation** - Project docs, RAG knowledge base, GitHub

---

## Critical Constraints

- ❌ **NO local LLM** (no Ollama, no LM Studio)
- ✅ **Providers:** Anthropic, OpenAI, Google only
- ✅ **Default model:** Sonnet (anthropic/claude-3.5-sonnet)
- ✅ **Messaging:** Telegram (not Slack)
- ✅ **Heartbeat:** MUST use 0 external tokens
- ✅ **Auditable:** Every LLM call logged to JSONL

---

## Success Criteria

### Launch Blockers (Must-Have)
- [ ] Heartbeat verified at 0 external tokens (100 runs)
- [ ] Model routing functional for all task types
- [ ] Context hard caps enforced
- [ ] Audit log operational
- [ ] Budget guardrails block overruns

### Post-Launch (Nice-to-Have)
- [ ] Automatic context summarization
- [ ] Real-time cost dashboard
- [ ] Multi-channel alert integration

---

## Timeline

- **Conservative:** 9-14 days
- **Focused:** 5-7 days
- **Current Status:** Day 0 (analysis complete)

---

## Next Steps

1. **Sonnet:** Read `PROJECT_ANALYSIS.md`
2. **Sonnet:** Answer "Open Questions" (investigate codebase)
3. **Sonnet:** Start Phase 1 (config schema)
4. **Pedro:** Review progress, provide feedback

---

## Repository

**GitHub:** https://github.com/pfaria32/open_claw_token_economy

This repository contains:
- All implementation code (model router, context manager, auditor, etc.)
- Configuration schemas and examples
- Test suite
- Complete documentation
- Scripts and utilities

## Contact

- **Project Owner:** Pedro Bento de Faria
- **GitHub:** [@pfaria32](https://github.com/pfaria32)
- **Analyst:** Opus (completed 2026-02-12)
- **Implementer:** Sonnet (starting TBD)

---

*This project is part of Pedro's OpenClaw instance cost optimization initiative.*
