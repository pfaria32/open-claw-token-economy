---
name: token-auditor
description: "Logs all LLM calls to audit log for cost tracking and analysis"
homepage: https://github.com/pfaria32/open_claw_token_economy
metadata:
  openclaw:
    emoji: "📊"
    events: ["agent_end"]
    export: "default"
---

# Token Auditor Hook

Comprehensive token usage auditing system that logs every LLM call with full metadata for cost tracking, analysis, and budget enforcement.

## What It Does

- Captures all LLM calls via `agent_end` hook
- Logs to JSONL format for easy parsing
- Records: model, tokens, cost, duration, session, task type
- Enables daily rollup reports
- Supports budget monitoring

## Output

**Audit Log:** `~/.openclaw/audit_log.jsonl`

Each line is a JSON object with:
```json
{
  "timestamp": "2026-02-12T14:00:00.000Z",
  "trigger": "user",
  "taskType": "code",
  "model": "anthropic/claude-sonnet-4-5",
  "promptTokens": 15234,
  "completionTokens": 892,
  "totalTokens": 16126,
  "estimatedCostUSD": 0.0589,
  "durationMs": 8234,
  "sessionKey": "agent:main:main",
  "success": true
}
```

## Requirements

- OpenClaw with hooks support
- Write access to `~/.openclaw/`

## Configuration

No configuration needed. Works out of the box.

Optional: Set custom audit log path via environment variable:
```bash
export TOKEN_AUDIT_LOG="/custom/path/audit_log.jsonl"
```

## Usage

Enable via OpenClaw hooks system (when implemented):
```bash
openclaw hooks enable token-auditor
```

Or manually register in workspace hooks directory.

## Daily Reports

Generate daily rollup with companion script:
```bash
node scripts/daily-audit-report.js
```

## Integration

This hook is designed to work with:
- Budget Guard (checks before LLM calls)
- Model Router (logs routing decisions)
- Context Manager (logs context size)

## License

MIT - Part of the Token-Efficient OpenClaw project
