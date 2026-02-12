/**
 * Budget Guard Module
 * 
 * Enforces budget limits and prevents excessive LLM costs.
 * Checks budgets BEFORE making LLM calls.
 * 
 * @module budget-guard
 */

const fs = require('fs');
const path = require('path');
const { estimateCost } = require('./model-router');

/**
 * Default budget configuration
 */
const DEFAULT_BUDGETS = {
  maxTokensPerTask: 120000,
  maxCostPerTaskUSD: 5.0,
  maxDailyCostUSD: 25.0,
  onExceed: 'pause_and_report',
  alertThresholds: {
    taskCostUSD: 2.0,
    dailyCostUSD: 20.0
  }
};

/**
 * Budget state file path
 */
const STATE_FILE = path.join(process.env.HOME || '/home/node', '.openclaw/budget-state.json');

/**
 * Budget Guard class for managing and enforcing cost limits.
 */
class BudgetGuard {
  /**
   * @param {Object} config - Budget configuration
   * @param {string} auditLogPath - Path to audit log JSONL file
   */
  constructor(config = DEFAULT_BUDGETS, auditLogPath = null) {
    this.config = { ...DEFAULT_BUDGETS, ...config };
    this.auditLogPath = auditLogPath;
    this.todaySpend = 0;
    this.todayDate = this.getCurrentDate();
    this.loadTodaySpend();
  }
  
  /**
   * Get current date string (YYYY-MM-DD)
   */
  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }
  
  /**
   * Load today's spend from audit log or state file
   */
  loadTodaySpend() {
    const today = this.getCurrentDate();
    
    // Try to load from state file first
    try {
      if (fs.existsSync(STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        if (state.date === today) {
          this.todaySpend = state.spend || 0;
          return;
        }
      }
    } catch (err) {
      // Ignore errors, will recalculate from audit log
    }
    
    // Recalculate from audit log if available
    if (this.auditLogPath && fs.existsSync(this.auditLogPath)) {
      try {
        const lines = fs.readFileSync(this.auditLogPath, 'utf8').split('\n');
        let spend = 0;
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const entry = JSON.parse(line);
            if (entry.timestamp && entry.timestamp.startsWith(today)) {
              spend += entry.estimatedCostUSD || 0;
            }
          } catch {
            // Skip malformed lines
          }
        }
        
        this.todaySpend = spend;
      } catch (err) {
        console.error(`Failed to load spend from audit log: ${err.message}`);
      }
    }
    
    this.saveTodaySpend();
  }
  
  /**
   * Save today's spend to state file
   */
  saveTodaySpend() {
    try {
      const dir = path.dirname(STATE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(STATE_FILE, JSON.stringify({
        date: this.todayDate,
        spend: this.todaySpend,
        lastUpdated: new Date().toISOString()
      }, null, 2));
    } catch (err) {
      console.error(`Failed to save budget state: ${err.message}`);
    }
  }
  
  /**
   * Check if a task can proceed within budget constraints.
   * 
   * @param {string} taskType - Task type
   * @param {string} modelId - Model ID (e.g., 'openai/gpt-4o')
   * @param {number} estimatedTokens - Estimated total tokens (prompt + completion)
   * @returns {Object} Result with allowed flag and reason
   */
  checkBudget(taskType, modelId, estimatedTokens) {
    // Refresh date if day changed
    const currentDate = this.getCurrentDate();
    if (currentDate !== this.todayDate) {
      this.todayDate = currentDate;
      this.todaySpend = 0;
      this.saveTodaySpend();
    }
    
    // Estimate cost (assume 70/30 split prompt/completion)
    const promptTokens = Math.floor(estimatedTokens * 0.7);
    const completionTokens = Math.floor(estimatedTokens * 0.3);
    const estimatedCost = estimateCost(modelId, promptTokens, completionTokens);
    
    // Check per-task token limit
    if (estimatedTokens > this.config.maxTokensPerTask) {
      return {
        allowed: false,
        reason: `Task would exceed maxTokensPerTask (${this.config.maxTokensPerTask}). Estimated: ${estimatedTokens}`,
        estimatedCost,
        estimatedTokens
      };
    }
    
    // Check per-task cost limit
    if (estimatedCost > this.config.maxCostPerTaskUSD) {
      return {
        allowed: false,
        reason: `Task would exceed maxCostPerTaskUSD ($${this.config.maxCostPerTaskUSD}). Estimated: $${estimatedCost.toFixed(4)}`,
        estimatedCost,
        estimatedTokens
      };
    }
    
    // Check daily cost limit
    const projectedDailySpend = this.todaySpend + estimatedCost;
    if (projectedDailySpend > this.config.maxDailyCostUSD) {
      return {
        allowed: false,
        reason: `Would exceed maxDailyCostUSD ($${this.config.maxDailyCostUSD}). Current: $${this.todaySpend.toFixed(2)}, Estimated task: $${estimatedCost.toFixed(4)}`,
        estimatedCost,
        estimatedTokens,
        todaySpend: this.todaySpend
      };
    }
    
    // Check if approaching alert thresholds
    const warnings = [];
    
    if (estimatedCost >= this.config.alertThresholds.taskCostUSD) {
      warnings.push(`Task cost ($${estimatedCost.toFixed(4)}) exceeds alert threshold ($${this.config.alertThresholds.taskCostUSD})`);
    }
    
    if (projectedDailySpend >= this.config.alertThresholds.dailyCostUSD) {
      warnings.push(`Daily spend would reach $${projectedDailySpend.toFixed(2)} (threshold: $${this.config.alertThresholds.dailyCostUSD})`);
    }
    
    return {
      allowed: true,
      estimatedCost,
      estimatedTokens,
      todaySpend: this.todaySpend,
      projectedDailySpend,
      warnings
    };
  }
  
  /**
   * Record actual spend after task completion.
   * 
   * @param {number} actualCost - Actual cost in USD
   */
  recordSpend(actualCost) {
    this.todaySpend += actualCost;
    this.saveTodaySpend();
  }
  
  /**
   * Get current budget status.
   * 
   * @returns {Object} Budget status
   */
  getStatus() {
    return {
      date: this.todayDate,
      todaySpend: this.todaySpend,
      dailyLimit: this.config.maxDailyCostUSD,
      remaining: Math.max(0, this.config.maxDailyCostUSD - this.todaySpend),
      percentUsed: (this.todaySpend / this.config.maxDailyCostUSD) * 100,
      limits: {
        maxTokensPerTask: this.config.maxTokensPerTask,
        maxCostPerTaskUSD: this.config.maxCostPerTaskUSD,
        maxDailyCostUSD: this.config.maxDailyCostUSD
      }
    };
  }
  
  /**
   * Reset daily budget (for testing or manual reset)
   */
  resetDaily() {
    this.todaySpend = 0;
    this.todayDate = this.getCurrentDate();
    this.saveTodaySpend();
  }
}

module.exports = {
  BudgetGuard,
  DEFAULT_BUDGETS
};
