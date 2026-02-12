/**
 * Model Router Module
 * 
 * Selects appropriate models based on task type and handles escalation.
 * This is a standalone module that can be integrated via plugins.
 * 
 * @module model-router
 */

/**
 * Default model policy configuration
 */
const DEFAULT_MODEL_POLICY = {
  defaults: {
    cheap: 'openai/gpt-4o',
    mid: 'anthropic/claude-sonnet-4-5',
    high: 'anthropic/claude-opus-4-5'
  },
  routes: {
    heartbeat: 'none',
    file_ops: 'cheap',
    extract: 'cheap',
    summarize: 'cheap',
    write: 'mid',
    code: 'mid',
    strategy: 'high'
  },
  escalation: ['cheap', 'mid', 'high'],
  maxAttempts: 3,
  escalationTriggers: {
    validation_failure: true,
    tool_error_repeated: true,
    uncertainty_signal: true
  }
};

/**
 * Selects the appropriate model based on task type and escalation state.
 * 
 * @param {string} taskType - Task classification (from task-classifier)
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {Object|null} lastError - Previous error information if any
 * @param {Object} config - Model policy configuration
 * @returns {string|null} Selected model ID (e.g., 'openai/gpt-4o') or null for heartbeat
 * @throws {Error} If max attempts exceeded
 */
function selectModel(taskType, attempt = 0, lastError = null, config = DEFAULT_MODEL_POLICY) {
  const { defaults, routes, escalation, maxAttempts } = config;
  
  // Heartbeat never gets a model
  if (taskType === 'heartbeat' || routes[taskType] === 'none') {
    return null;
  }
  
  // Get base tier from routes
  const tierName = routes[taskType] || 'mid'; // default to mid
  
  // Check if we should escalate
  let effectiveTier = tierName;
  if (attempt > 0 && shouldEscalate(lastError, config)) {
    const currentIndex = escalation.indexOf(tierName);
    const targetIndex = Math.min(currentIndex + attempt, escalation.length - 1);
    effectiveTier = escalation[targetIndex];
  }
  
  // Respect maxAttempts
  if (attempt >= maxAttempts) {
    throw new Error(`Max attempts (${maxAttempts}) exceeded for task type: ${taskType}`);
  }
  
  // Map tier to model
  const modelId = defaults[effectiveTier];
  
  if (!modelId) {
    throw new Error(`No model configured for tier: ${effectiveTier}`);
  }
  
  return modelId;
}

/**
 * Determines if escalation is warranted based on error type.
 * 
 * @param {Object|null} lastError - Error information
 * @param {string} lastError.type - Error type (validation, tool_error, uncertainty, etc.)
 * @param {number} [lastError.count] - Number of repeated errors
 * @param {Object} config - Model policy configuration
 * @returns {boolean} True if escalation should occur
 */
function shouldEscalate(lastError, config) {
  if (!lastError || typeof lastError !== 'object') {
    return false;
  }
  
  const triggers = config.escalationTriggers || {};
  
  // Validation failure
  if (triggers.validation_failure && lastError.type === 'validation') {
    return true;
  }
  
  // Repeated tool errors (2 or more)
  if (triggers.tool_error_repeated && 
      lastError.type === 'tool_error' && 
      (lastError.count || 0) >= 2) {
    return true;
  }
  
  // Explicit uncertainty ("I'm not sure", "I don't know")
  if (triggers.uncertainty_signal && lastError.type === 'uncertainty') {
    return true;
  }
  
  return false;
}

/**
 * Parse a model ID into provider and model components.
 * 
 * @param {string|null} modelId - Model ID (e.g., 'openai/gpt-4o')
 * @returns {Object|null} Parsed components or null
 */
function parseModelId(modelId) {
  if (!modelId || typeof modelId !== 'string') {
    return null;
  }
  
  const parts = modelId.split('/');
  if (parts.length !== 2) {
    return null;
  }
  
  return {
    provider: parts[0].trim(),
    model: parts[1].trim()
  };
}

/**
 * Get model tier name for a given model ID.
 * 
 * @param {string} modelId - Model ID
 * @param {Object} config - Model policy configuration
 * @returns {string|null} Tier name or null if not found
 */
function getModelTier(modelId, config = DEFAULT_MODEL_POLICY) {
  const { defaults } = config;
  
  for (const [tier, id] of Object.entries(defaults)) {
    if (id === modelId) {
      return tier;
    }
  }
  
  return null;
}

/**
 * Estimate token cost for a model.
 * 
 * @param {string} modelId - Model ID
 * @param {number} promptTokens - Number of prompt tokens
 * @param {number} completionTokens - Number of completion tokens
 * @returns {number} Estimated cost in USD
 */
function estimateCost(modelId, promptTokens, completionTokens) {
  // Pricing per 1000 tokens (as of 2026-02)
  const pricing = {
    'openai/gpt-4o': { prompt: 0.0025, completion: 0.01 },
    'anthropic/claude-sonnet-4-5': { prompt: 0.003, completion: 0.015 },
    'anthropic/claude-opus-4-5': { prompt: 0.015, completion: 0.075 }
  };
  
  const prices = pricing[modelId] || { prompt: 0, completion: 0 };
  
  return ((promptTokens / 1000) * prices.prompt) + 
         ((completionTokens / 1000) * prices.completion);
}

module.exports = {
  selectModel,
  shouldEscalate,
  parseModelId,
  getModelTier,
  estimateCost,
  DEFAULT_MODEL_POLICY
};
