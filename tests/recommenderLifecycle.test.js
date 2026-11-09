const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const scenarios = [
  'admin-ranking-preview',
  'stale-failure-retry',
  'cold-failure-retry',
  'force-failure-retains-cache',
  'concurrent-cold',
  'concurrent-stale',
  'concurrent-force-failure-retry',
  'fresh-cache',
];

for (const scenario of scenarios) {
  test(`recommender lifecycle: ${scenario} (isolated, strict rejections)`, () => {
    const result = spawnSync(process.execPath, [
      '--unhandled-rejections=strict',
      path.join(__dirname, 'fixtures/recommenderLifecycle.cjs'),
      scenario,
    ], { encoding: 'utf8', timeout: 5000, env: { ...process.env, NODE_OPTIONS: '' } });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /SCENARIO PASS/);
  });
}
