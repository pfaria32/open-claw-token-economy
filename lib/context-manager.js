/**
 * Context Manager Module
 * 
 * Manages context bundling with size limits and smart loading.
 * Prevents unlimited context injection by enforcing bundle caps.
 * 
 * @module context-manager
 */

const fs = require('fs');
const path = require('path');

/**
 * Default context policy configuration
 */
const DEFAULT_CONTEXT_POLICY = {
  baseline: {
    maxTokens: 2000,
    files: ['context/safety.md', 'context/routing.md']
  },
  bundles: {
    coding: {
      maxTokens: 10000,
      files: ['context/coding.md', 'TOOLS.md', 'AGENTS.md']
    },
    ops: {
      maxTokens: 8000,
      files: ['context/ops.md', 'AGENTS.md']
    },
    writing: {
      maxTokens: 6000,
      files: ['context/writing.md', 'SOUL.md']
    }
  },
  routes: {
    heartbeat: [],
    file_ops: ['baseline'],
    extract: ['baseline'],
    summarize: ['baseline'],
    write: ['baseline', 'writing'],
    code: ['baseline', 'coding'],
    strategy: ['baseline', 'coding']
  },
  hardCapBehavior: 'summarize_then_attach',
  maxHistoryMessages: 50,
  totalBudget: 28000
};

/**
 * Rough token estimation (4 characters ≈ 1 token)
 * 
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  if (typeof text !== 'string') {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

/**
 * Builds bounded context payload based on task type and policy.
 * 
 * @param {string} taskType - Classified task type
 * @param {Object} config - Context policy from configuration
 * @param {string} workspaceRoot - Workspace root path
 * @returns {Promise<Object>} Context result with files and metadata
 */
async function buildContext(taskType, config = DEFAULT_CONTEXT_POLICY, workspaceRoot) {
  const { baseline, bundles, routes, hardCapBehavior, maxHistoryMessages, totalBudget } = config;
  
  // Get bundle names for this task type
  const bundleNames = routes[taskType] || [];
  
  // Start with empty context
  const contextFiles = [];
  let totalTokens = 0;
  const warnings = [];
  
  // Add bundles in order
  for (const bundleName of bundleNames) {
    const bundle = bundleName === 'baseline' ? baseline : bundles[bundleName];
    
    if (!bundle) {
      warnings.push(`Bundle not found: ${bundleName}`);
      continue;
    }
    
    let bundleTokens = 0;
    
    for (const relativeFilePath of bundle.files) {
      const fullPath = path.join(workspaceRoot, relativeFilePath);
      
      // Read file
      if (!fs.existsSync(fullPath)) {
        warnings.push(`Context file not found: ${fullPath}`);
        continue;
      }
      
      let content;
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch (err) {
        warnings.push(`Failed to read ${fullPath}: ${err.message}`);
        continue;
      }
      
      const fileTokens = estimateTokens(content);
      
      // Check bundle cap
      if (bundleTokens + fileTokens > bundle.maxTokens) {
        if (hardCapBehavior === 'summarize_then_attach') {
          // TODO: In future, call GPT-4o to summarize
          // For now, truncate with warning
          const remainingTokens = bundle.maxTokens - bundleTokens;
          const truncateAt = Math.floor(remainingTokens * 4); // tokens to chars
          content = content.slice(0, truncateAt) + '\n\n[... truncated due to size limit ...]';
          warnings.push(`Truncated ${relativeFilePath} (exceeded bundle limit)`);
        } else {
          warnings.push(`Skipped ${relativeFilePath} (would exceed bundle limit)`);
          continue;
        }
      }
      
      const finalTokens = estimateTokens(content);
      
      contextFiles.push({
        path: relativeFilePath,
        fullPath: fullPath,
        content: content,
        tokens: finalTokens
      });
      
      bundleTokens += finalTokens;
      totalTokens += finalTokens;
    }
  }
  
  // Check total budget
  if (totalBudget && totalTokens > totalBudget) {
    warnings.push(`Total context (${totalTokens}) exceeds budget (${totalBudget})`);
  }
  
  return {
    files: contextFiles,
    totalTokens,
    bundleCount: bundleNames.length,
    warnings,
    withinBudget: !totalBudget || totalTokens <= totalBudget
  };
}

/**
 * Get context bundle configuration for a task type.
 * 
 * @param {string} taskType - Task type
 * @param {Object} config - Context policy
 * @returns {Array<string>} Bundle names to load
 */
function getBundlesForTask(taskType, config = DEFAULT_CONTEXT_POLICY) {
  return config.routes[taskType] || [];
}

/**
 * Calculate total context budget including history.
 * 
 * @param {number} contextTokens - Context file tokens
 * @param {number} historyMessages - Number of history messages
 * @param {number} avgTokensPerMessage - Average tokens per message
 * @returns {Object} Budget breakdown
 */
function calculateTotalBudget(contextTokens, historyMessages, avgTokensPerMessage = 200) {
  const historyTokens = historyMessages * avgTokensPerMessage;
  const total = contextTokens + historyTokens;
  
  return {
    contextTokens,
    historyTokens,
    totalTokens: total,
    remainingForResponse: Math.max(0, 30000 - total - 1000) // Sonnet's 30k window, reserve 1k for user msg
  };
}

/**
 * Validate context policy configuration.
 * 
 * @param {Object} config - Context policy to validate
 * @returns {Object} Validation result
 */
function validateContextPolicy(config) {
  const errors = [];
  const warnings = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('Config must be an object');
    return { valid: false, errors, warnings };
  }
  
  // Check baseline
  if (!config.baseline || !config.baseline.maxTokens) {
    errors.push('baseline.maxTokens is required');
  }
  
  // Check bundles
  if (!config.bundles || typeof config.bundles !== 'object') {
    warnings.push('No bundles defined');
  }
  
  // Check routes
  if (!config.routes || typeof config.routes !== 'object') {
    warnings.push('No routes defined');
  }
  
  // Check totalBudget
  if (config.totalBudget && config.totalBudget < 5000) {
    warnings.push('totalBudget is very low, may cause issues');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  buildContext,
  estimateTokens,
  getBundlesForTask,
  calculateTotalBudget,
  validateContextPolicy,
  DEFAULT_CONTEXT_POLICY
};
