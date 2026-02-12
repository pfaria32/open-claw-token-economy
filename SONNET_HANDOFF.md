# Sonnet Handoff: DIY Fork Implementation

**Task:** Implement token economy hooks in forked OpenClaw  
**Estimated Time:** 2-4 hours  
**Full Details:** `DIY_FORK_IMPLEMENTATION.md`

---

## TL;DR

1. Fork OpenClaw repo
2. Add ~165 lines of TypeScript across 5 files
3. Build custom Docker image
4. Deploy and install plugins
5. Achieve 60-80% token savings immediately

---

## What You're Implementing

| Feature | Impact | Complexity |
|---------|--------|------------|
| Heartbeat skip | 50% savings | Low (20 lines) |
| Model routing hook | 30% savings | Medium (70 lines) |
| Context bundling hook | 10-20% savings | Medium (75 lines) |

---

## File Change Summary

```
src/plugins/types.ts         → Add hook type definitions
src/plugins/hooks.ts         → Add hook runners
src/agents/pi-embedded-runner/run.ts → Insert model routing hook
src/agents/bootstrap-files.ts → Insert context bundling hook  
src/cron/isolated-agent/run.ts → Insert heartbeat check
```

---

## Critical Success Factors

1. **Heartbeat optimization** is the highest-impact, lowest-risk change - do this first
2. **Fail-open design** - hooks must catch errors and continue with defaults
3. **No breaking changes** - existing behavior unchanged when hooks not registered
4. **Test before deploy** - TypeScript compilation + existing tests must pass

---

## When Complete

1. Token costs drop from ~$3-5/day to ~$1-1.50/day
2. Heartbeat calls become zero-cost when HEARTBEAT.md is empty
3. Simple tasks automatically route to cheaper models
4. Context size stays within reasonable bounds

---

## Reference Files

- `DIY_FORK_IMPLEMENTATION.md` - Complete step-by-step guide
- `PR_DESIGN.md` - Original design with TypeScript types
- `plugins/model-routing-plugin.js` - Ready-to-use routing plugin
- `plugins/context-bundling-plugin.js` - Ready-to-use context plugin
- `lib/*.js` - Helper modules (task classifier, model router, etc.)

---

## Start Command

```bash
cd /home/node/.openclaw/workspace/projects
export GH_TOKEN=$GITHUB_PAT

# Download gh CLI if not present
[ -f /tmp/gh_2.42.1_linux_amd64/bin/gh ] || \
  (cd /tmp && curl -sSL https://github.com/cli/cli/releases/download/v2.42.1/gh_2.42.1_linux_amd64.tar.gz | tar xz)

# Fork OpenClaw
/tmp/gh_2.42.1_linux_amd64/bin/gh repo fork openclaw/openclaw --clone
cd openclaw

# Then follow DIY_FORK_IMPLEMENTATION.md phases 2-10
```

---

**Ready to execute when Pedro approves.**
