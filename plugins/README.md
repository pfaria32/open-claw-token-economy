# Token Economy Plugins

These plugins demonstrate how to use the proposed OpenClaw hooks for token cost management.

## Plugins

### model-routing-plugin.js

Uses the `before_model_select` hook to implement intelligent model routing based on task classification.

**Features:**
- Classifies tasks into types (file_ops, extract, summarize, code, strategy, write)
- Routes simple tasks to cheap models (GPT-4o)
- Routes complex tasks to high-tier models (Opus)
- Automatic escalation on failures

**Configuration:**
```json
{
  "plugins": {
    "entries": {
      "model-routing": {
        "enabled": true,
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
          }
        }
      }
    }
  }
}
```

### context-bundling-plugin.js

Uses the `before_context_build` hook to enforce context size limits and selective file loading.

**Features:**
- Filters context files based on bundle policy
- Enforces per-bundle token limits
- Prevents unlimited context injection
- Maintains total context budget

**Configuration:**
```json
{
  "plugins": {
    "entries": {
      "context-bundling": {
        "enabled": true,
        "contextPolicy": {
          "baseline": {
            "maxTokens": 2000,
            "files": ["context/safety.md", "context/routing.md"]
          },
          "bundles": {
            "coding": {
              "maxTokens": 10000,
              "files": ["context/coding.md", "TOOLS.md", "AGENTS.md"]
            }
          },
          "routes": {
            "file_ops": ["baseline"],
            "code": ["baseline", "coding"]
          },
          "totalBudget": 28000
        }
      }
    }
  }
}
```

## Installation

**Note:** These plugins require the proposed hooks to be added to OpenClaw core first (see PR_DESIGN.md).

Once hooks are available:

```bash
# Copy plugins to OpenClaw plugins directory
cp plugins/*.js ~/.openclaw/plugins/

# OR install as a package
npm install @openclaw/token-economy-plugins
```

## Testing

Test plugins with mock hooks:

```bash
# Test model routing logic
node tests/test-plugin-model-routing.js

# Test context bundling logic
node tests/test-plugin-context-bundling.js
```

## Integration

Plugins will be automatically loaded by OpenClaw when:
1. The hooks are added to core
2. Plugins are placed in the plugins directory
3. Configuration is added to openclaw.json

## Expected Impact

With both plugins enabled:

- **Model Routing:** 70% cost savings on simple tasks (GPT-4o vs Sonnet)
- **Context Bundling:** 40-60% context reduction (selective loading)
- **Combined:** 60-80% overall token reduction

**Example:**
- Before: $3-5/day (~$90-150/month)
- After: $1-1.50/day (~$30-45/month)
- Savings: ~$60-105/month

## Development

### Adding Custom Routing Logic

```javascript
// custom-router.js
module.exports.register = (api) => {
  api.on('before_model_select', async (event, ctx) => {
    // Your custom logic here
    if (event.prompt.includes('urgent')) {
      return {
        overrideModel: {
          provider: 'anthropic',
          model: 'claude-opus-4-5'
        },
        reason: 'Urgent task needs best model'
      };
    }
  });
};
```

### Adding Custom Context Rules

```javascript
// custom-context.js
module.exports.register = (api) => {
  api.on('before_context_build', async (event, ctx) => {
    // Your custom filtering logic
    const filtered = event.requestedFiles.filter(file => {
      return file.path.endsWith('.md');  // Only markdown files
    });
    
    return {
      filteredFiles: filtered,
      reason: 'Only loading markdown files'
    };
  });
};
```

## Troubleshooting

### Plugin Not Loading

Check OpenClaw logs:
```bash
openclaw logs | grep "Plugin registered"
```

### Hook Not Firing

Enable debug logging:
```json
{
  "logging": {
    "level": "debug"
  }
}
```

### Model Not Changing

Check that:
1. Plugin is enabled in config
2. Hook is registered (check logs)
3. Task classification is working (add debug logs)

## See Also

- `PR_DESIGN.md` - Proposed hooks design
- `../lib/` - Helper modules used by plugins
- `../CONFIG_SCHEMA.md` - Configuration reference
