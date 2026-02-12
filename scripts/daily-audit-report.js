#!/usr/bin/env node
/**
 * Daily Audit Report Generator
 * 
 * Reads audit_log.jsonl and generates a daily summary report.
 * Can be run manually or via cron.
 */

const fs = require('fs');
const path = require('path');

const AUDIT_LOG_PATH = process.env.TOKEN_AUDIT_LOG || 
  path.join(process.env.HOME || '/home/node', '.openclaw/audit_log.jsonl');

const REPORT_PATH = process.env.DAILY_AUDIT_REPORT || 
  path.join(process.env.HOME || '/home/node', '.openclaw/daily_audit.md');

/**
 * Read logs for a specific date
 */
function readLogsForDate(dateStr) {
  if (!fs.existsSync(AUDIT_LOG_PATH)) {
    return [];
  }
  
  const lines = fs.readFileSync(AUDIT_LOG_PATH, 'utf8').split('\n');
  const logs = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const entry = JSON.parse(line);
      if (entry.timestamp && entry.timestamp.startsWith(dateStr)) {
        logs.push(entry);
      }
    } catch (err) {
      // Skip malformed lines
    }
  }
  
  return logs;
}

/**
 * Build report markdown
 */
function buildReport(logs, date) {
  const totalTokens = logs.reduce((sum, log) => sum + (log.totalTokens || 0), 0);
  const totalCost = logs.reduce((sum, log) => sum + (log.estimatedCostUSD || 0), 0);
  
  // Model usage breakdown
  const modelUsage = {};
  logs.forEach(log => {
    const model = log.model || 'unknown';
    if (!modelUsage[model]) {
      modelUsage[model] = { count: 0, tokens: 0, cost: 0 };
    }
    modelUsage[model].count++;
    modelUsage[model].tokens += log.totalTokens || 0;
    modelUsage[model].cost += log.estimatedCostUSD || 0;
  });
  
  // Task type breakdown
  const taskTypeUsage = {};
  logs.forEach(log => {
    const taskType = log.taskType || 'unknown';
    if (!taskTypeUsage[taskType]) {
      taskTypeUsage[taskType] = { count: 0, tokens: 0, cost: 0 };
    }
    taskTypeUsage[taskType].count++;
    taskTypeUsage[taskType].tokens += log.totalTokens || 0;
    taskTypeUsage[taskType].cost += log.estimatedCostUSD || 0;
  });
  
  // Heartbeat token check (MUST be 0)
  const heartbeatTokens = logs
    .filter(log => log.trigger === 'heartbeat' || log.taskType === 'heartbeat')
    .reduce((sum, log) => sum + (log.totalTokens || 0), 0);
  
  // Top 10 expensive calls
  const top10 = logs
    .sort((a, b) => (b.estimatedCostUSD || 0) - (a.estimatedCostUSD || 0))
    .slice(0, 10);
  
  // Failed calls
  const failures = logs.filter(log => log.success === false);
  
  // Build markdown
  let report = `# Token Audit Report - ${date}\n\n`;
  
  report += `## Summary\n`;
  report += `- **Total Tokens:** ${totalTokens.toLocaleString()}\n`;
  report += `- **Total Cost:** $${totalCost.toFixed(4)}\n`;
  report += `- **Total Calls:** ${logs.length}\n`;
  report += `- **Failed Calls:** ${failures.length}\n\n`;
  
  report += `## Model Usage\n`;
  for (const [model, stats] of Object.entries(modelUsage)) {
    report += `\n### ${model}\n`;
    report += `- **Calls:** ${stats.count}\n`;
    report += `- **Tokens:** ${stats.tokens.toLocaleString()}\n`;
    report += `- **Cost:** $${stats.cost.toFixed(4)}\n`;
  }
  report += `\n`;
  
  report += `## Task Type Breakdown\n`;
  for (const [taskType, stats] of Object.entries(taskTypeUsage)) {
    report += `\n### ${taskType}\n`;
    report += `- **Calls:** ${stats.count}\n`;
    report += `- **Tokens:** ${stats.tokens.toLocaleString()}\n`;
    report += `- **Cost:** $${stats.cost.toFixed(4)}\n`;
  }
  report += `\n`;
  
  report += `## Heartbeat Token Check\n`;
  report += `**Heartbeat external tokens:** ${heartbeatTokens.toLocaleString()} `;
  if (heartbeatTokens > 0) {
    report += `⚠️ **WARNING: Heartbeat is burning tokens!**\n`;
  } else {
    report += `✅ **Heartbeat is token-free**\n`;
  }
  report += `\n`;
  
  if (top10.length > 0) {
    report += `## Top 10 Expensive Calls\n\n`;
    top10.forEach((log, i) => {
      report += `${i + 1}. **${log.taskType}** (${log.model})\n`;
      report += `   - Tokens: ${(log.totalTokens || 0).toLocaleString()}\n`;
      report += `   - Cost: $${(log.estimatedCostUSD || 0).toFixed(4)}\n`;
      report += `   - Time: ${log.timestamp}\n`;
      report += `   - Session: ${log.sessionKey}\n\n`;
    });
  }
  
  if (failures.length > 0) {
    report += `## Failed Calls\n\n`;
    failures.forEach((log, i) => {
      report += `${i + 1}. **${log.taskType}** (${log.model})\n`;
      report += `   - Error: ${log.error || 'Unknown'}\n`;
      report += `   - Time: ${log.timestamp}\n\n`;
    });
  }
  
  report += `---\n`;
  report += `Generated: ${new Date().toISOString()}\n`;
  
  return report;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const dateArg = args[0];
  
  // Default to today
  const date = dateArg || new Date().toISOString().split('T')[0];
  
  console.log(`Generating audit report for ${date}...`);
  
  const logs = readLogsForDate(date);
  
  if (logs.length === 0) {
    console.log(`No audit logs found for ${date}`);
    process.exit(0);
  }
  
  const report = buildReport(logs, date);
  
  // Ensure report directory exists
  const reportDir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(REPORT_PATH, report);
  
  console.log(`Report saved to: ${REPORT_PATH}`);
  console.log(`Total calls: ${logs.length}`);
  console.log(`Total cost: $${logs.reduce((sum, log) => sum + (log.estimatedCostUSD || 0), 0).toFixed(4)}`);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { readLogsForDate, buildReport };
