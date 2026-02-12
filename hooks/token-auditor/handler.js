/**
 * Token Auditor Hook Handler
 * 
 * Logs all LLM calls to audit log for cost tracking and budget monitoring.
 * Implements the agent_end hook.
 */

const fs = require('fs');
const path = require('path');

// Audit log path (configurable via env)
const AUDIT_LOG_PATH = process.env.TOKEN_AUDIT_LOG || 
  path.join(process.env.HOME || '/home/node', '.openclaw/audit_log.jsonl');

// Model pricing (per 1000 tokens)
const MODEL_PRICING = {
  'openai/gpt-4o': { prompt: 0.0025, completion: 0.01 },
  'anthropic/claude-sonnet-4-5': { prompt: 0.003, completion: 0.015 },
  'anthropic/claude-opus-4-5': { prompt: 0.015, completion: 0.075 },
  'anthropic/claude-haiku-4': { prompt: 0.00025, completion: 0.00125 },
  'google/gemini-2.0-flash-exp': { prompt: 0, completion: 0 }, // Free tier
};

/**
 * Calculate cost based on model and token usage
 */
function calculateCost(model, promptTokens, completionTokens) {
  const pricing = MODEL_PRICING[model] || { prompt: 0, completion: 0 };
  
  const promptCost = (promptTokens / 1000) * pricing.prompt;
  const completionCost = (completionTokens / 1000) * pricing.completion;
  
  return promptCost + completionCost;
}

/**
 * Extract token usage from event
 */
function extractUsage(event) {
  // Try to extract from various possible locations
  const usage = event.usage || event.tokenUsage || {};
  
  return {
    promptTokens: usage.input || usage.promptTokens || usage.prompt_tokens || 0,
    completionTokens: usage.output || usage.completionTokens || usage.completion_tokens || 0,
    totalTokens: usage.total || usage.totalTokens || usage.total_tokens || 0,
    cacheReadTokens: usage.cacheRead || usage.cache_read_tokens || 0,
    cacheWriteTokens: usage.cacheWrite || usage.cache_write_tokens || 0
  };
}

/**
 * Classify task type from context (simple heuristic for now)
 */
function guessTaskType(event) {
  const prompt = event.prompt || '';
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('heartbeat')) return 'heartbeat';
  if (/^(read|write|edit|ls|cat)/i.test(prompt)) return 'file_ops';
  if (/(extract|parse|get|fetch)/i.test(lowerPrompt)) return 'extract';
  if (/(summarize|summary|tldr)/i.test(lowerPrompt)) return 'summarize';
  if (/(code|function|debug|implement)/i.test(lowerPrompt)) return 'code';
  if (/(analyze|design|architecture|strategy)/i.test(lowerPrompt)) return 'strategy';
  
  return 'write'; // default
}

/**
 * Agent End Hook Handler
 * 
 * @param {Object} event - Agent end event
 * @param {Object} ctx - Context
 */
async function tokenAuditorHandler(event, ctx) {
  try {
    const usage = extractUsage(event);
    
    // Skip if no meaningful usage data
    if (usage.totalTokens === 0 && usage.promptTokens === 0) {
      return;
    }
    
    // Calculate total tokens if not provided
    if (usage.totalTokens === 0) {
      usage.totalTokens = usage.promptTokens + usage.completionTokens;
    }
    
    // Build audit entry
    const auditEntry = {
      timestamp: new Date().toISOString(),
      trigger: ctx.trigger || 'unknown',
      taskType: event.taskType || guessTaskType(event),
      model: ctx.model || event.model || 'unknown',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      estimatedCostUSD: calculateCost(
        ctx.model || event.model || 'unknown',
        usage.promptTokens,
        usage.completionTokens
      ),
      durationMs: event.durationMs || 0,
      sessionKey: ctx.sessionKey || event.sessionKey || 'unknown',
      agentId: ctx.agentId || event.agentId || 'main',
      success: event.success !== false,
      error: event.error || undefined,
      escalation: event.escalation || false,
      attempt: event.attempt || 0
    };
    
    // Ensure audit log directory exists
    const logDir = path.dirname(AUDIT_LOG_PATH);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Append to audit log (JSONL format - one JSON object per line)
    fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(auditEntry) + '\n');
    
  } catch (err) {
    // Log error but don't throw (hook failures shouldn't break agent)
    console.error('[token-auditor] Failed to log audit entry:', err.message);
  }
}

// Export as default for OpenClaw hooks system
module.exports = tokenAuditorHandler;
