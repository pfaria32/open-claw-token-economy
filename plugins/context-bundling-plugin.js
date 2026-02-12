/**
 * Context Bundling Plugin
 * 
 * Demonstrates usage of the before_context_build hook for bounded context.
 * Uses the context-manager helper module.
 */

const { getBundlesForTask, DEFAULT_CONTEXT_POLICY, estimateTokens } = require('../lib/context-manager');
const { classifyTask } = require('../lib/task-classifier');

/**
 * Plugin registration function (OpenClaw plugin API)
 * 
 * @param {Object} api - OpenClaw plugin API
 */
function register(api) {
  api.logger.info('[context-bundling] Plugin registered');
  
  // Get context policy from plugin config or use defaults
  const contextPolicy = api.pluginConfig?.contextPolicy || DEFAULT_CONTEXT_POLICY;
  
  // Register the before_context_build hook
  api.on('before_context_build', async (event, ctx) => {
    try {
      // We need to classify the task to know which bundles to load
      // In a real implementation, this would be passed from the model-routing plugin
      // or stored in context. For now, we'll make a best guess.
      
      // Get allowed bundles for all task types
      const allBundles = new Set();
      Object.keys(contextPolicy.routes).forEach(taskType => {
        const bundles = contextPolicy.routes[taskType] || [];
        bundles.forEach(b => allBundles.add(b));
      });
      
      // Get allowed files from bundles
      const allowedFiles = new Set();
      
      // Add baseline files
      if (contextPolicy.baseline?.files) {
        contextPolicy.baseline.files.forEach(f => allowedFiles.add(f));
      }
      
      // Add bundle files
      allBundles.forEach(bundleName => {
        const bundle = contextPolicy.bundles?.[bundleName];
        if (bundle?.files) {
          bundle.files.forEach(f => allowedFiles.add(f));
        }
      });
      
      // Filter requested files to only allowed ones
      const filteredFiles = event.requestedFiles
        .filter(file => {
          // Check if this file is in our allowed set
          // Handle both absolute and relative paths
          const relativePath = file.path.replace(ctx.workspaceDir + '/', '');
          return allowedFiles.has(relativePath) || allowedFiles.has(file.path);
        })
        .map(file => ({
          path: file.path,
          maxTokens: contextPolicy.totalBudget || 28000,  // Apply global budget
        }));
      
      // Check if we filtered anything
      if (filteredFiles.length < event.requestedFiles.length) {
        const removed = event.requestedFiles.length - filteredFiles.length;
        api.logger.info(
          `[context-bundling] Filtered context: ${filteredFiles.length} files kept, ${removed} removed`,
        );
        
        return {
          filteredFiles,
          reason: `Enforced context policy: ${filteredFiles.length}/${event.requestedFiles.length} files`,
        };
      }
      
      // No filtering needed
      api.logger.debug('[context-bundling] All requested files within policy');
      return undefined;
      
    } catch (error) {
      api.logger.error(`[context-bundling] Error in hook: ${error.message}`);
      // Return undefined to continue with original files
      return undefined;
    }
  }, { priority: 10 });
  
  api.logger.info('[context-bundling] before_context_build hook registered');
}

module.exports = { register };

// Plugin metadata
module.exports.plugin = {
  id: 'context-bundling',
  name: 'Context Bundling Plugin',
  description: 'Enforce context size limits and bundle-based loading',
  version: '1.0.0',
  configSchema: {
    jsonSchema: {
      type: 'object',
      properties: {
        contextPolicy: {
          type: 'object',
          description: 'Context policy configuration',
          properties: {
            baseline: {
              type: 'object',
              properties: {
                maxTokens: { type: 'number' },
                files: { type: 'array', items: { type: 'string' } },
              },
            },
            bundles: {
              type: 'object',
              description: 'Task-specific context bundles',
            },
            routes: {
              type: 'object',
              description: 'Task type to bundle mapping',
            },
            totalBudget: {
              type: 'number',
              description: 'Total context budget in tokens',
            },
          },
        },
      },
    },
  },
};
