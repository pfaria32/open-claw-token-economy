# Ready to Submit to OpenClaw

**Target:** https://github.com/openclaw/openclaw/issues/new

**Title:** `Feature: Add plugin hooks for token cost management`

---

## Issue Body (Copy everything below this line)

---

### Problem

OpenClaw instances can accumulate significant token costs through:

1. **No dynamic model routing** - Always using the same model tier regardless of task complexity (simple file operations use the same expensive model as strategic planning)
2. **Unlimited context injection** - Loading all workspace files + full chat history into every request, often exceeding model context windows
3. **Wasteful heartbeats** - Calling the LLM every 30 minutes even when `HEARTBEAT.md` is empty or only contains comments

**Real-world impact:** Running OpenClaw for personal automation costs ~$3-5/day (~$90-150/month) in token usage, with approximately 50% of that coming from heartbeat calls alone.

### Proposed Solution

Add three optional plugin hooks to enable intelligent cost optimization:

#### 1. `before_model_select` Hook

Allows plugins to dynamically override model selection based on task classification.

**Use case:** Route simple tasks (file operations, data extraction) to cheaper models like GPT-4o, while reserving Sonnet/Opus for complex reasoning.

**Expected impact:** 70% cost reduction on routine tasks.

#### 2. `before_context_build` Hook

Allows plugins to filter, limit, or modify context files before building the prompt.

**Use case:** Enforce context bundle policies (e.g., max 10k tokens per bundle), selective file loading based on task type, prevent unlimited context injection.

**Expected impact:** 40-60% context size reduction, prevents context window overflows.

#### 3. Heartbeat Optimization

Skip LLM call when `HEARTBEAT.md` is effectively empty (only whitespace/comments).

**Use case:** Idle instances don't burn tokens every 30 minutes.

**Expected impact:** 100% heartbeat cost elimination for idle periods (~50% of typical usage).

### Design

I've created comprehensive design documentation with:

- **TypeScript type definitions** for all hooks
- **Hook runner implementations** following existing patterns
- **Integration points** identified with exact code locations
- **Reference plugin implementations** demonstrating usage
- **Testing strategy** (unit + integration)
- **Performance analysis** (< 2ms overhead per request)

**📄 Full Design Document:** https://github.com/pfaria32/open_claw_token_economy/blob/master/PR_DESIGN.md

**📦 Complete Implementation Guide:** https://github.com/pfaria32/open_claw_token_economy/blob/master/IMPLEMENTATION_GUIDE.md

**🔌 Reference Plugins:** https://github.com/pfaria32/open_claw_token_economy/tree/master/plugins

### Key Design Principles

✅ **Optional** - Zero impact if not used, no breaking changes  
✅ **Non-breaking** - All existing setups continue to work unchanged  
✅ **Extensible** - Follows existing plugin hook patterns  
✅ **Performant** - < 2ms overhead per request, zero cost when hooks not registered  
✅ **Error-safe** - Hook failures don't break agent execution

### Benefits to OpenClaw Community

- **60-80% token cost reduction** for users who enable these plugins
- **Enables custom strategies** - Users can implement any cost optimization approach
- **Better UX** - Prevents context window overflow errors
- **Scalability** - Makes OpenClaw more viable for high-volume deployments
- **Community plugins** - Reference implementation provides template for ecosystem

### Expected Adoption

Based on community discussions, token costs are a common pain point. I expect:
- **Immediate users:** Personal automation users, consultants, small teams
- **Long-term users:** Enterprise deployments, SaaS offerings built on OpenClaw
- **Plugin ecosystem:** Template for other optimization strategies

### What I'm Offering

I'm happy to:

1. **Discuss and refine** the design based on your feedback and vision for OpenClaw
2. **Help with implementation** if you'd like assistance (I have the patches ready)
3. **Implement it myself** if that's easier (with your guidance on code standards)
4. **Provide reference plugins** as examples for the community
5. **Document real-world results** after deployment

### Technical Details

**Files to modify:** 5 (types.ts, hooks.ts, run.ts, attempt.ts, isolated-agent/run.ts)  
**Lines to add:** ~250  
**Breaking changes:** None  
**Test coverage:** Full (unit + integration)

The design follows OpenClaw's existing hook patterns (`before_agent_start`, `agent_end`, etc.) and integrates cleanly into the current architecture.

### Why This Matters to Me

I'm actively using OpenClaw for personal automation and running into $100-150/month costs. This design would reduce that to ~$30-45/month while actually *improving* quality for complex tasks through intelligent routing.

I'd love to contribute this back to the community since I believe cost optimization will help OpenClaw adoption significantly.

### Questions for You

1. **Interest level:** Is this something you'd want in OpenClaw core? Or better as external plugins only?
2. **Design feedback:** Any concerns or suggestions about the proposed hooks?
3. **Implementation:** Would you prefer to implement this, or would you like me to submit a PR?
4. **Scope:** Should all three features be in one PR, or split across multiple?

Looking forward to your thoughts!

---

**Suggested Labels:** `enhancement`, `feature-request`, `plugins`, `cost-optimization`
