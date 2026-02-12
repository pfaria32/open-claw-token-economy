/**
 * Model Routing Plugin
 * 
 * Demonstrates usage of the before_model_select hook for intelligent model routing.
 * Uses the task-classifier and model-router helper modules.
 */

const { classifyTask, getRecommendedTier } = require('../lib/task-classifier');
const { selectModel, DEFAULT_MODEL_POLICY } = require('../lib/model-router');

/**
 * Plugin registration function (OpenClaw plugin API)
 * 
 * @param {Object} api - OpenClaw plugin API
 */
function register(api) {
  api.logger.info('[model-routing] Plugin registered');
  
  // Get model policy from plugin config or use defaults
  const modelPolicy = api.pluginConfig?.modelPolicy || DEFAULT_MODEL_POLICY;
  
  // Register the before_model_select hook
  api.on('before_model_select', async (event, ctx) => {
    try {
      // Classify the task based on prompt and context
      const taskType = classifyTask(event.prompt, {
        trigger: event.context?.trigger,
        sessionKey: ctx.sessionKey,
      });
      
      // Select appropriate model (attempt 0, no error)
      const selectedModelId = selectModel(taskType, 0, null, modelPolicy);
      
      // If heartbeat, return null (no model needed)
      if (selectedModelId === null) {
        api.logger.debug('[model-routing] Heartbeat detected, skipping model selection');
        return {
          overrideModel: null,
          reason: 'Heartbeat (no LLM needed)',
        };
      }
      
      // Parse current requested model
      const currentModelId = `${event.requestedModel.provider}/${event.requestedModel.model}`;
      
      // Check if we should override
      if (selectedModelId !== currentModelId) {
        const [provider, model] = selectedModelId.split('/');
        
        const tier = getRecommendedTier(taskType);
        api.logger.info(
          `[model-routing] Routing ${taskType} task to ${tier} tier: ${selectedModelId}`,
        );
        
        return {
          overrideModel: { provider, model },
          reason: `Task type: ${taskType} → ${tier} tier`,
        };
      }
      
      // No override needed
      api.logger.debug(`[model-routing] Requested model matches recommended: ${currentModelId}`);
      return undefined;
      
    } catch (error) {
      api.logger.error(`[model-routing] Error in hook: ${error.message}`);
      // Return undefined to continue with original model
      return undefined;
    }
  }, { priority: 10 });  // Higher priority = runs first
  
  api.logger.info('[model-routing] before_model_select hook registered');
}

module.exports = { register };

// Plugin metadata (for OpenClaw plugin discovery)
module.exports.plugin = {
  id: 'model-routing',
  name: 'Model Routing Plugin',
  description: 'Intelligent model routing based on task classification',
  version: '1.0.0',
  configSchema: {
    jsonSchema: {
      type: 'object',
      properties: {
        modelPolicy: {
          type: 'object',
          description: 'Model policy configuration',
          properties: {
            defaults: {
              type: 'object',
              properties: {
                cheap: { type: 'string' },
                mid: { type: 'string' },
                high: { type: 'string' },
              },
            },
            routes: {
              type: 'object',
              description: 'Task type to tier mapping',
            },
          },
        },
      },
    },
  },
};
