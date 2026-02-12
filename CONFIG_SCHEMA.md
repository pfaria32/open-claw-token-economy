# Token Economy Configuration Schema

This document defines the configuration additions needed for token economy features.

## Configuration Structure

Add these blocks to `/home/node/.openclaw/openclaw.json`:

```json
{
  "modelPolicy": {
    "defaults": {
      "cheap": "openai/gpt-4o",
      "mid": "anthropic/claude-sonnet-4-5",
      "high": "anthropic/claude-opus-4-5"
    },
    "routes": {
      "heartbeat": "none",
      "file_ops": "cheap",
      "extract": "cheap",
      "summarize": "cheap",
      "write": "mid",
      "code": "mid",
      "strategy": "high"
    },
    "escalation": ["cheap", "mid", "high"],
    "maxAttempts": 3,
    "escalationTriggers": {
      "validation_failure": true,
      "tool_error_repeated": true,
      "uncertainty_signal": true
    }
  },
  
  "contextPolicy": {
    "baseline": {
      "maxTokens": 2000,
      "files": ["context/safety.md", "context/routing.md"]
    },
    "bundles": {
      "coding": {
        "maxTokens": 10000,
        "files": ["context/coding.md", "TOOLS.md", "AGENTS.md"]
      },
      "ops": {
        "maxTokens": 8000,
        "files": ["context/ops.md", "AGENTS.md"]
      },
      "writing": {
        "maxTokens": 6000,
        "files": ["context/writing.md", "SOUL.md"]
      }
    },
    "routes": {
      "heartbeat": [],
      "file_ops": ["baseline"],
      "extract": ["baseline"],
      "summarize": ["baseline"],
      "write": ["baseline", "writing"],
      "code": ["baseline", "coding"],
      "strategy": ["baseline", "coding"]
    },
    "hardCapBehavior": "summarize_then_attach",
    "maxHistoryMessages": 50,
    "totalBudget": 28000
  },
  
  "budgets": {
    "maxTokensPerTask": 120000,
    "maxCostPerTaskUSD": 5.0,
    "maxDailyCostUSD": 25.0,
    "onExceed": "pause_and_report",
    "alertThresholds": {
      "taskCostUSD": 2.0,
      "dailyCostUSD": 20.0
    }
  }
}
```

## Field Descriptions

### modelPolicy

**Purpose:** Defines model routing strategy and escalation behavior.

- `defaults` - Model IDs for each tier (cheap, mid, high)
- `routes` - Task type to tier mapping
- `escalation` - Tier escalation path on failures
- `maxAttempts` - Maximum retry attempts before giving up
- `escalationTriggers` - Conditions that trigger escalation

### contextPolicy

**Purpose:** Controls context injection and size limits.

- `baseline` - Always-loaded baseline context (safety + routing)
- `bundles` - Task-specific context bundles (coding, ops, writing)
- `routes` - Task type to bundle mapping
- `hardCapBehavior` - What to do when bundle exceeds limit
  - `"summarize_then_attach"` - Summarize overflow (future: use GPT-4o)
  - `"truncate"` - Hard truncate at limit
  - `"skip"` - Skip files that would exceed
- `maxHistoryMessages` - Telegram/chat history limit (prevents bloat)
- `totalBudget` - Total context budget in tokens

### budgets

**Purpose:** Enforces cost limits and prevents runaway spending.

- `maxTokensPerTask` - Per-request token limit
- `maxCostPerTaskUSD` - Per-request cost limit (USD)
- `maxDailyCostUSD` - Daily total cost limit (USD)
- `onExceed` - Behavior when limit hit
  - `"pause_and_report"` - Block request, send alert
  - `"report_only"` - Allow but alert
  - `"silent"` - Allow silently
- `alertThresholds` - Early warning thresholds

## Status

**Current:** Schema defined, NOT yet enforced by OpenClaw

**Phase 1 (Complete):** Configuration documented

**Phase 2 (In Progress):** PR to OpenClaw for enforcement hooks

**Phase 3 (Future):** Full integration after PR merge

## Usage

### Applying Configuration

```bash
# Backup current config
cp /home/node/.openclaw/openclaw.json /home/node/.openclaw/openclaw.json.backup

# Edit config (add blocks above)
nano /home/node/.openclaw/openclaw.json

# Restart OpenClaw gateway
openclaw restart
```

### Validation

Use helper modules to validate configuration:

```javascript
const { validateContextPolicy } = require('./lib/context-manager');
const config = require('/home/node/.openclaw/openclaw.json');

const result = validateContextPolicy(config.contextPolicy);
console.log(result);
```

## Integration Points

When enforcement hooks are added to OpenClaw:

1. **before_model_select** - Model Router will use `modelPolicy`
2. **before_context_build** - Context Manager will use `contextPolicy`
3. **before_llm_call** - Budget Guard will check `budgets`

## See Also

- `lib/model-router.js` - Model routing logic
- `lib/context-manager.js` - Context bundling logic
- `lib/budget-guard.js` - Budget enforcement logic
