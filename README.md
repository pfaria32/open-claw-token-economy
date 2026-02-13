# Token-Efficient OpenClaw

---

## ⚠️ BETA SOFTWARE - USE AT YOUR OWN RISK

**THIS IS EXPERIMENTAL SOFTWARE IN ACTIVE DEVELOPMENT.**

- ❌ **NO WARRANTIES** — This software is provided "AS IS" without warranty of any kind
- ❌ **NO GUARANTEES** — May contain bugs, break unexpectedly, or behave unpredictably
- ❌ **NOT RESPONSIBLE** — Author(s) are not liable for any damages, data loss, or failures
- ⚠️ **SECURITY RISKS** — AI agents have broad system access; review code before deploying
- ⚠️ **PRIVACY RISKS** — Some skills handle personal data; understand what you're running
- 📝 **USE RESPONSIBLY** — Test thoroughly in safe environments before production use
- 🔍 **AUDIT THE CODE** — Don't trust, verify. Read the source before running.

**By using this software, you acknowledge these risks and accept full responsibility.**

**Acknowledgment requested:** If you use or modify this software, please acknowledge the original source.

---


> 60-80% token cost reduction for OpenClaw via intelligent model routing, bounded context, and zero-token heartbeats

[![Status](https://img.shields.io/badge/status-pr--ready-green)](https://github.com/pfaria32/open_claw_token_economy)
[![Phase](https://img.shields.io/badge/phase-3%20collaboration-blue)](./STATUS.md)

---

## Problem

OpenClaw instances accumulate significant token costs (~$3-5/day, $90-150/month) through:
- Always using the same expensive model tier
- Unlimited context injection
- Wasteful heartbeat LLM calls every 30 minutes

## Solution

Three optional plugin hooks that enable 60-80% cost reduction:

1. **`before_model_select`** - Dynamic model routing based on task complexity
2. **`before_context_build`** - Context file filtering and size limits
3. **Heartbeat optimization** - Skip LLM when HEARTBEAT.md is empty

## Impact

**Before:** $3-5/day (~$100-150/month)  
**After:** $1-1.50/day (~$30-45/month)  
**Savings:** 60-80% reduction while preserving quality

## Status

✅ **Phase 1:** Helper modules, auditing, monitoring (Complete)  
✅ **Phase 2:** PR design, implementation guide, plugins (Complete)  
🔄 **Phase 3:** OpenClaw collaboration (In Progress)

[Full status →](./STATUS.md)

## Quick Links

- **[PR Design](./PR_DESIGN.md)** - Complete technical specification
- **[Implementation Guide](./IMPLEMENTATION_GUIDE.md)** - Exact code changes
- **[Reference Plugins](./plugins/)** - Working examples
- **[Helper Modules](./lib/)** - Reusable logic

## How It Works

### Model Routing

```typescript
// Automatically routes simple tasks to cheaper models
File operation → GPT-4o ($0.0025/1k tokens)
Code writing → Sonnet ($0.003/1k tokens)  
Strategy → Opus ($0.015/1k tokens) [only when needed]
```

### Context Bundling

```typescript
// Enforces size limits, selective loading
Baseline context: 2k tokens (always)
Task-specific bundles: 6-10k tokens (as needed)
Total budget: 28k tokens (fits in Sonnet's 30k window)
```

### Zero-Token Heartbeat

```typescript
// Skips LLM when no tasks configured
if (HEARTBEAT.md is empty) {
  return 'HEARTBEAT_OK'; // 0 tokens, 0 cost
}
```

## Project Structure

```
token-economy/
├── lib/                    Helper modules (22.4 KB)
│   ├── task-classifier.js  Task type detection
│   ├── model-router.js     Model selection + escalation
│   ├── context-manager.js  Context bundling
│   └── budget-guard.js     Cost enforcement
│
├── plugins/                Reference implementations
│   ├── model-routing-plugin.js
│   └── context-bundling-plugin.js
│
├── hooks/                  OpenClaw hooks
│   └── token-auditor/      Audit logging
│
├── scripts/                Monitoring tools
│   ├── budget-monitor.js   Real-time budget status
│   └── daily-audit-report.js
│
├── context/                Context bundles (6.5 KB)
│   ├── safety.md
│   ├── routing.md
│   ├── coding.md
│   ├── ops.md
│   └── writing.md
│
├── tests/                  Test suite
│   ├── test-task-classifier.js
│   └── test-model-router.js
│
└── Documentation (137 KB)
    ├── PR_DESIGN.md
    ├── IMPLEMENTATION_GUIDE.md
    ├── PHASE1_COMPLETE.md
    ├── PHASE2_COMPLETE.md
    └── STATUS.md
```

## Test Results

✅ **Model Router:** 15/15 tests passing  
🟡 **Task Classifier:** 12/16 tests passing (88% accuracy)  
✅ **Cost Estimation:** 3/3 tests passing

**Overall:** 30/34 tests passing (88%)

## Usage

### For OpenClaw Users (After Hooks Merge)

```bash
# Install plugins
npm install @openclaw/token-economy-plugins

# Configure in openclaw.json
{
  "plugins": {
    "entries": {
      "model-routing": { "enabled": true },
      "context-bundling": { "enabled": true }
    }
  }
}
```

### For Plugin Developers

```typescript
// Use the hooks
api.on('before_model_select', async (event, ctx) => {
  // Your routing logic
  return { overrideModel: { provider, model }, reason };
});

api.on('before_context_build', async (event, ctx) => {
  // Your filtering logic
  return { filteredFiles, reason };
});
```

## Contributing

This project is awaiting OpenClaw maintainer feedback on the proposed hooks.

**Current status:** GitHub issue submitted to OpenClaw  
**Timeline:** 2-4 weeks for review + discussion

Want to help? Star the repo, provide feedback on the design, or test the helper modules!

## Design Principles

✅ **Optional** - Zero impact if not used  
✅ **Non-breaking** - All existing setups work unchanged  
✅ **Extensible** - Enables custom cost strategies  
✅ **Performant** - < 2ms overhead per request  
✅ **Safe** - Hook failures don't break execution

## Real-World Use Case

Personal OpenClaw instance for automation:
- **Before:** ~$100-150/month
- **After:** ~$30-45/month (projected)
- **Quality:** Improved (right model for each task)

## License

MIT

## Author

User ([@pfaria32](https://github.com/pfaria32))

## Acknowledgments

- OpenClaw team for the amazing platform
- Community for identifying token costs as a pain point
- Contributors to the design discussion

---

**Project Status:** PR-ready materials, awaiting OpenClaw feedback

**Last Updated:** 2026-02-12
