/**
 * Test Model Router
 * Simple test suite for model routing logic
 */

const { selectModel, shouldEscalate, estimateCost, DEFAULT_MODEL_POLICY } = require('../lib/model-router');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function testBasicRouting() {
  console.log('Testing basic model routing...\n');
  
  const tests = [
    { taskType: 'heartbeat', attempt: 0, expectedModel: null },
    { taskType: 'file_ops', attempt: 0, expectedModel: 'openai/gpt-4o' },
    { taskType: 'extract', attempt: 0, expectedModel: 'openai/gpt-4o' },
    { taskType: 'summarize', attempt: 0, expectedModel: 'openai/gpt-4o' },
    { taskType: 'write', attempt: 0, expectedModel: 'anthropic/claude-sonnet-4-5' },
    { taskType: 'code', attempt: 0, expectedModel: 'anthropic/claude-sonnet-4-5' },
    { taskType: 'strategy', attempt: 0, expectedModel: 'anthropic/claude-opus-4-5' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(({ taskType, attempt, expectedModel }) => {
    const result = selectModel(taskType, attempt, null, DEFAULT_MODEL_POLICY);
    const success = result === expectedModel;
    
    if (success) {
      passed++;
      console.log(`✅ ${taskType} (attempt ${attempt}) -> ${result || 'null'}`);
    } else {
      failed++;
      console.log(`❌ ${taskType} (attempt ${attempt}) -> ${result || 'null'} (expected: ${expectedModel || 'null'})`);
    }
  });
  
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  
  return failed === 0;
}

function testEscalation() {
  console.log('Testing escalation logic...\n');
  
  const tests = [
    { 
      error: { type: 'validation' },
      config: DEFAULT_MODEL_POLICY,
      expected: true,
      description: 'Validation failure should escalate'
    },
    {
      error: { type: 'tool_error', count: 2 },
      config: DEFAULT_MODEL_POLICY,
      expected: true,
      description: 'Repeated tool errors should escalate'
    },
    {
      error: { type: 'tool_error', count: 1 },
      config: DEFAULT_MODEL_POLICY,
      expected: false,
      description: 'Single tool error should not escalate'
    },
    {
      error: { type: 'uncertainty' },
      config: DEFAULT_MODEL_POLICY,
      expected: true,
      description: 'Uncertainty signal should escalate'
    },
    {
      error: null,
      config: DEFAULT_MODEL_POLICY,
      expected: false,
      description: 'No error should not escalate'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(({ error, config, expected, description }) => {
    const result = shouldEscalate(error, config);
    const success = result === expected;
    
    if (success) {
      passed++;
      console.log(`✅ ${description}: ${result}`);
    } else {
      failed++;
      console.log(`❌ ${description}: ${result} (expected: ${expected})`);
    }
  });
  
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  
  return failed === 0;
}

function testCostEstimation() {
  console.log('Testing cost estimation...\n');
  
  const tests = [
    {
      model: 'openai/gpt-4o',
      promptTokens: 10000,
      completionTokens: 1000,
      expectedMin: 0.03,
      expectedMax: 0.04
    },
    {
      model: 'anthropic/claude-sonnet-4-5',
      promptTokens: 10000,
      completionTokens: 1000,
      expectedMin: 0.04,
      expectedMax: 0.05
    },
    {
      model: 'anthropic/claude-opus-4-5',
      promptTokens: 10000,
      completionTokens: 1000,
      expectedMin: 0.20,
      expectedMax: 0.25
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(({ model, promptTokens, completionTokens, expectedMin, expectedMax }) => {
    const cost = estimateCost(model, promptTokens, completionTokens);
    const success = cost >= expectedMin && cost <= expectedMax;
    
    if (success) {
      passed++;
      console.log(`✅ ${model}: $${cost.toFixed(4)} (${promptTokens}/${completionTokens} tokens)`);
    } else {
      failed++;
      console.log(`❌ ${model}: $${cost.toFixed(4)} (expected: $${expectedMin}-$${expectedMax})`);
    }
  });
  
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  
  return failed === 0;
}

function main() {
  console.log('=== Model Router Tests ===\n');
  
  const test1Pass = testBasicRouting();
  const test2Pass = testEscalation();
  const test3Pass = testCostEstimation();
  
  if (test1Pass && test2Pass && test3Pass) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testBasicRouting, testEscalation, testCostEstimation };
