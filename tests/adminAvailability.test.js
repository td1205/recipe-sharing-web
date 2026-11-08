const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const validation = require('../utils/apiValidation');

function load(file, dependencies) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    module, console: { error() {} }, require(id) {
      if (id in dependencies) return dependencies[id];
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return module.exports;
}
function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
function dashboard(count) {
  return load('controllers/adminController.js', {
    '../utils/apiValidation': validation, '../repositories/adminRepository': {
      countUsers: async () => 12, countRecipes: async () => 20, countCategories: async () => 3,
      countComments: async () => 9, getChartData: async () => ({ users: {}, recipes: {} }),
      getRecentActivity: async () => ({ users: [], recipes: [], comments: [] }), getExtraStats: async () => ({}),
    }, '../repositories/userRepository': {}, bcrypt: {}, '../utils/passwordPolicy': {},
    '../config/prisma': { ratings: { count: async () => 8 }, content_reports: { count } },
  });
}
test('missing moderation table/column leaves verified dashboard data available without a fake zero', async () => {
  for (const code of ['P2021', 'P2022']) {
    const controller = dashboard(async () => { throw Object.assign(new Error('private database details'), { code }); });
    const res = response();
    await controller.renderDashboard({ query: { days: '30' } }, res);
    assert.equal(res.statusCode, 200); assert.equal(res.body.stats.users, 12);
    assert.equal(res.body.stats.pendingReports, null); assert.equal(res.body.stats.days, 30);
    assert.equal(res.body.warnings.length, 1);
    assert.ok(!JSON.stringify(res.body).includes('private database details'));
  }
});
test('available moderation count is returned; unrelated database failure is not hidden', async () => {
  const res = response();
  await dashboard(async () => 4).renderDashboard({ query: {} }, res);
  assert.equal(res.body.stats.pendingReports, 4); assert.equal(res.body.warnings.length, 0);
  const failed = response();
  await dashboard(async () => { throw Object.assign(new Error('private'), { code: 'P1001' }); }).renderDashboard({ query: {} }, failed);
  assert.equal(failed.statusCode, 503); assert.equal(failed.body.success, false);
});
test('audit API returns explicit unavailable status, never a successful empty history', async () => {
  const controller = load('controllers/moderationController.js', {
    '../utils/apiValidation': validation, '../services/recommender': {},
    '../utils/adminListQuery': require('../utils/adminListQuery'),
    '../repositories/moderationRepository': { ModerationError: class extends Error {}, listLogs: async () => { throw Object.assign(new Error('private table name'), { code: 'P2021' }); } },
  });
  const res = response();
  await controller.logs({ query: { page: '1' } }, res);
  assert.equal(res.statusCode, 503); assert.equal(res.body.success, false);
  assert.equal(res.body.code, 'MODERATION_SCHEMA_NOT_READY'); assert.equal(res.body.items, undefined);
  assert.ok(!JSON.stringify(res.body).includes('private table name'));
});
