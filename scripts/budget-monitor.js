#!/usr/bin/env node
/**
 * Budget Monitoring Script
 * 
 * Monitors token usage and alerts on budget thresholds.
 * Can be run manually or via cron for periodic checks.
 */

const fs = require('fs');
const path = require('path');
const { BudgetGuard, DEFAULT_BUDGETS } = require('../lib/budget-guard');

const AUDIT_LOG_PATH = process.env.TOKEN_AUDIT_LOG || 
  path.join(process.env.HOME || '/home/node', '.openclaw/audit_log.jsonl');

/**
 * Load budget configuration from openclaw.json if available
 */
function loadBudgetConfig() {
  const configPath = path.join(process.env.HOME || '/home/node', '.openclaw/openclaw.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.budgets || DEFAULT_BUDGETS;
    } catch (err) {
      console.warn(`Failed to load config: ${err.message}`);
    }
  }
  
  return DEFAULT_BUDGETS;
}

/**
 * Main monitoring function
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  const budgetConfig = loadBudgetConfig();
  const guard = new BudgetGuard(budgetConfig, AUDIT_LOG_PATH);
  
  switch (command) {
    case 'status':
      showStatus(guard);
      break;
      
    case 'check':
      checkThresholds(guard);
      break;
      
    case 'reset':
      guard.resetDaily();
      console.log('✅ Daily budget reset');
      showStatus(guard);
      break;
      
    case 'simulate':
      simulateTask(guard, args);
      break;
      
    default:
      showUsage();
  }
}

/**
 * Show current budget status
 */
function showStatus(guard) {
  const status = guard.getStatus();
  
  console.log('\n📊 Budget Status\n');
  console.log(`Date: ${status.date}`);
  console.log(`Today's Spend: $${status.todaySpend.toFixed(4)}`);
  console.log(`Daily Limit: $${status.dailyLimit.toFixed(2)}`);
  console.log(`Remaining: $${status.remaining.toFixed(4)}`);
  console.log(`Used: ${status.percentUsed.toFixed(1)}%`);
  
  // Visual indicator
  const barLength = 40;
  const filledLength = Math.floor((status.percentUsed / 100) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  console.log(`[${bar}] ${status.percentUsed.toFixed(1)}%`);
  
  // Limits
  console.log(`\n💰 Limits:`);
  console.log(`  Max Tokens/Task: ${status.limits.maxTokensPerTask.toLocaleString()}`);
  console.log(`  Max Cost/Task: $${status.limits.maxCostPerTaskUSD.toFixed(2)}`);
  console.log(`  Max Daily Cost: $${status.limits.maxDailyCostUSD.toFixed(2)}`);
  
  // Warnings
  if (status.percentUsed >= 90) {
    console.log(`\n⚠️  WARNING: Budget usage at ${status.percentUsed.toFixed(1)}%`);
  } else if (status.percentUsed >= 80) {
    console.log(`\n⚠️  CAUTION: Budget usage at ${status.percentUsed.toFixed(1)}%`);
  } else {
    console.log(`\n✅ Budget healthy`);
  }
  console.log();
}

/**
 * Check if approaching thresholds
 */
function checkThresholds(guard) {
  const status = guard.getStatus();
  const config = guard.config;
  
  let hasWarnings = false;
  
  // Check daily threshold
  if (status.todaySpend >= config.alertThresholds.dailyCostUSD) {
    console.log(`⚠️  Daily spend ($${status.todaySpend.toFixed(2)}) exceeds alert threshold ($${config.alertThresholds.dailyCostUSD})`);
    hasWarnings = true;
  }
  
  // Check if over limit
  if (status.todaySpend >= status.dailyLimit) {
    console.log(`🚨 BUDGET EXCEEDED! Daily spend ($${status.todaySpend.toFixed(2)}) over limit ($${status.dailyLimit})`);
    hasWarnings = true;
  }
  
  if (!hasWarnings) {
    console.log(`✅ All thresholds OK`);
  }
  
  // Exit code for scripting
  process.exit(hasWarnings ? 1 : 0);
}

/**
 * Simulate a task to check if it would be allowed
 */
function simulateTask(guard, args) {
  const taskType = args[1] || 'write';
  const model = args[2] || 'anthropic/claude-sonnet-4-5';
  const tokens = parseInt(args[3] || '10000', 10);
  
  console.log(`\n🔍 Simulating Task\n`);
  console.log(`Task Type: ${taskType}`);
  console.log(`Model: ${model}`);
  console.log(`Estimated Tokens: ${tokens.toLocaleString()}\n`);
  
  const result = guard.checkBudget(taskType, model, tokens);
  
  if (result.allowed) {
    console.log(`✅ Task would be ALLOWED`);
    console.log(`Estimated Cost: $${result.estimatedCost.toFixed(4)}`);
    console.log(`Today's Spend: $${result.todaySpend.toFixed(4)}`);
    console.log(`Projected Spend: $${result.projectedDailySpend.toFixed(4)}`);
    
    if (result.warnings && result.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }
  } else {
    console.log(`❌ Task would be BLOCKED`);
    console.log(`Reason: ${result.reason}`);
  }
  console.log();
}

/**
 * Show usage help
 */
function showUsage() {
  console.log(`
Budget Monitor - Token economy budget tracking

Usage:
  node budget-monitor.js [command] [options]

Commands:
  status               Show current budget status (default)
  check                Check if thresholds exceeded (exit 1 if yes)
  reset                Reset daily budget counter
  simulate <type> <model> <tokens>
                       Simulate a task to check if allowed

Examples:
  node budget-monitor.js status
  node budget-monitor.js check
  node budget-monitor.js simulate code anthropic/claude-sonnet-4-5 15000
  node budget-monitor.js reset

Environment Variables:
  TOKEN_AUDIT_LOG      Path to audit log (default: ~/.openclaw/audit_log.jsonl)
`);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
