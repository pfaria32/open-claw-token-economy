/**
 * Test Task Classifier
 * Simple test suite for task classification logic
 */

const { classifyTask, getRecommendedTier } = require('../lib/task-classifier');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function testClassifyTask() {
  console.log('Testing task classifier...\n');
  
  const tests = [
    // Heartbeat
    { input: 'Read HEARTBEAT.md', context: { trigger: 'heartbeat' }, expected: 'heartbeat' },
    
    // File ops
    { input: 'read the file config.json', context: {}, expected: 'file_ops' },
    { input: 'ls -la /tmp', context: {}, expected: 'file_ops' },
    { input: 'show me the file contents', context: {}, expected: 'file_ops' },
    
    // Extract
    { input: 'extract data from this JSON', context: {}, expected: 'extract' },
    { input: 'parse the API response', context: {}, expected: 'extract' },
    
    // Summarize
    { input: 'summarize this document', context: {}, expected: 'summarize' },
    { input: 'give me a TL;DR', context: {}, expected: 'summarize' },
    
    // Code
    { input: 'write a function to sort an array', context: {}, expected: 'code' },
    { input: 'debug this Python code', context: {}, expected: 'code' },
    { input: 'implement the algorithm', context: {}, expected: 'code' },
    
    // Strategy
    { input: 'analyze the architecture options', context: {}, expected: 'strategy' },
    { input: 'what strategy should I use?', context: {}, expected: 'strategy' },
    { input: 'evaluate these alternatives', context: {}, expected: 'strategy' },
    
    // Write (default)
    { input: 'hello, how are you?', context: {}, expected: 'write' },
    { input: 'tell me about quantum computing', context: {}, expected: 'write' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(({ input, context, expected }, i) => {
    const result = classifyTask(input, context);
    const success = result === expected;
    
    if (success) {
      passed++;
      console.log(`✅ Test ${i + 1}: "${input.substring(0, 40)}..." -> ${result}`);
    } else {
      failed++;
      console.log(`❌ Test ${i + 1}: "${input.substring(0, 40)}..." -> ${result} (expected: ${expected})`);
    }
  });
  
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  
  return failed === 0;
}

function testRecommendedTier() {
  console.log('Testing recommended tier mapping...\n');
  
  const tests = [
    { taskType: 'heartbeat', expected: 'none' },
    { taskType: 'file_ops', expected: 'cheap' },
    { taskType: 'extract', expected: 'cheap' },
    { taskType: 'summarize', expected: 'cheap' },
    { taskType: 'write', expected: 'mid' },
    { taskType: 'code', expected: 'mid' },
    { taskType: 'strategy', expected: 'high' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(({ taskType, expected }) => {
    const result = getRecommendedTier(taskType);
    const success = result === expected;
    
    if (success) {
      passed++;
      console.log(`✅ ${taskType} -> ${result}`);
    } else {
      failed++;
      console.log(`❌ ${taskType} -> ${result} (expected: ${expected})`);
    }
  });
  
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  
  return failed === 0;
}

function main() {
  console.log('=== Task Classifier Tests ===\n');
  
  const test1Pass = testClassifyTask();
  const test2Pass = testRecommendedTier();
  
  if (test1Pass && test2Pass) {
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

module.exports = { testClassifyTask, testRecommendedTier };
