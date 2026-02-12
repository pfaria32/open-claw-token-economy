/**
 * Task Classification Module
 * 
 * Classifies incoming requests into task types for model routing.
 * This is a standalone module that can be used independently or via plugins.
 * 
 * @module task-classifier
 */

/**
 * Task types supported by the model routing system
 * @typedef {'heartbeat' | 'file_ops' | 'extract' | 'summarize' | 'write' | 'code' | 'strategy'} TaskType
 */

/**
 * Classifies a user message into a task type based on content and context.
 * 
 * Classification priority order (first match wins):
 * 1. heartbeat - System heartbeat checks
 * 2. file_ops - File system operations
 * 3. extract - Data extraction/parsing
 * 4. summarize - Summarization tasks
 * 5. code - Programming/debugging
 * 6. strategy - Planning/analysis
 * 7. write - Default (general writing/conversation)
 * 
 * @param {string} userMessage - The user's message text
 * @param {Object} context - Additional context about the request
 * @param {string} [context.trigger] - How the request was triggered (e.g., 'heartbeat', 'user', 'cron')
 * @param {string} [context.sessionKey] - Session identifier
 * @returns {TaskType} The classified task type
 */
function classifyTask(userMessage, context = {}) {
  // Validate inputs
  if (typeof userMessage !== 'string') {
    return 'write'; // Default fallback
  }

  const message = userMessage.trim().toLowerCase();
  
  // 1. Heartbeat (should be caught upstream, but fallback here)
  if (context.trigger === 'heartbeat') {
    return 'heartbeat';
  }
  
  // Heartbeat detection from message content
  if (message.includes('heartbeat') && message.includes('heartbeat.md')) {
    return 'heartbeat';
  }
  
  // 2. File operations - Commands that start with file operation keywords
  const fileOpsPattern = /^(read|write|edit|ls|cat|find|grep|mv|cp|rm|mkdir|touch|chmod)/i;
  if (fileOpsPattern.test(userMessage)) {
    return 'file_ops';
  }
  
  // File operations - Imperative requests
  if (/(show|display|list|open|view|check)\s+(file|directory|folder|the\s+file)/i.test(message)) {
    return 'file_ops';
  }
  
  // 3. Extract/Parse operations
  const extractPattern = /(extract|parse|get|fetch|scrape|pull|retrieve)\s+(data|information|content|text)/i;
  if (extractPattern.test(message)) {
    return 'extract';
  }
  
  // 4. Summarize operations
  const summarizePattern = /(summarize|summary|tldr|brief|overview|condense|abstract)/i;
  if (summarizePattern.test(message)) {
    return 'summarize';
  }
  
  // 5. Code/Programming
  const codePattern = /(code|function|debug|implement|refactor|script|program|bug|error|syntax)/i;
  if (codePattern.test(message)) {
    return 'code';
  }
  
  // Programming language keywords
  if (/(javascript|python|typescript|java|ruby|go|rust|function|class|import|export)/i.test(message)) {
    return 'code';
  }
  
  // 6. Strategy/Planning/Deep reasoning
  const strategyPattern = /(analyze|design|architecture|strategy|plan|should\s+(i|we)|evaluate|decide|recommend|approach|consider)/i;
  if (strategyPattern.test(message)) {
    return 'strategy';
  }
  
  // 7. Default to write (mid tier)
  return 'write';
}

/**
 * Get a human-readable description of a task type
 * 
 * @param {TaskType} taskType - The task type
 * @returns {string} Human-readable description
 */
function getTaskTypeDescription(taskType) {
  const descriptions = {
    heartbeat: 'System heartbeat check',
    file_ops: 'File system operation',
    extract: 'Data extraction/parsing',
    summarize: 'Content summarization',
    write: 'Writing/conversation',
    code: 'Programming/debugging',
    strategy: 'Planning/analysis'
  };
  
  return descriptions[taskType] || 'Unknown task type';
}

/**
 * Get recommended model tier for a task type
 * 
 * @param {TaskType} taskType - The task type
 * @returns {'cheap' | 'mid' | 'high' | 'none'} Recommended model tier
 */
function getRecommendedTier(taskType) {
  const tierMapping = {
    heartbeat: 'none',
    file_ops: 'cheap',
    extract: 'cheap',
    summarize: 'cheap',
    write: 'mid',
    code: 'mid',
    strategy: 'high'
  };
  
  return tierMapping[taskType] || 'mid';
}

module.exports = {
  classifyTask,
  getTaskTypeDescription,
  getRecommendedTier
};
