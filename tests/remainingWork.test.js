const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const validation = require('../utils/apiValidation');
const { readiness } = require('../config/operations');
const { validateRuntime } = require('../config/runtime');
const { testDatabaseConfig } = require('./helpers/testDatabase.cjs');
const { validateDataset } = require('../scripts/evaluate-recommender-offline');
function listing(prisma) {
  const module = { exports: {} };
  const dependencies = { '@prisma/client': require('@prisma/client'), '../config/prisma': prisma,
    '../utils/userSelect': { PUBLIC_USER_SELECT: {} }, '../utils/apiValidation': validation };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../repositories/recipeListingRepository.js'), 'utf8'), {
    module, require: id => { if (!(id in dependencies)) throw new Error('Unexpected dependency'); return dependencies[id]; },
  });
  return module.exports;
}
test('listing rejects malformed queries and SQL control strings', () => {
  for (const q of [{ page: '1x' }, { page: -1 }, { limit: 101 }, { search: [] }, { category: {} },
    { min_rating: true }, { min_rating: 6 }, { sort: 'title; DROP TABLE users' }, { duration: 'invalid' }]) {
    assert.throws(() => validation.listingQuery(q), error => error.status === 400);
  }
  const q = validation.listingQuery({ page: '2', duration: '30_60', min_rating: '4.5', category: 'Món chính' });
  assert.equal(q.page, 2); assert.equal(q.min_rating, 4.5);
  assert.doesNotThrow(() => validation.listingQuery(q));
});
test('SQL filter/search/ordering stays parameterized and all paging is in database query', async () => {
  const queries = [], hydration = [];
  const tx = { $queryRaw: async sql => {
    queries.push(sql);
    return queries.length === 1 ? [{ total: 100n }] : [{ id: 7, avg_rating: 4.5, total_ratings: 2n, view_count: 3n }];
  }, recipes: { findMany: async options => {
    hydration.push(options);
    return [{ id: 7, title: 'Fixture', ingredients: [], recipe_tags: [], user_tag_votes: [] }];
  } } };
  const repo = listing({ $transaction: (callback, options) => { assert.equal(options.isolationLevel, 'RepeatableRead'); return callback(tx); } });
  const attack = "a_%' OR 1=1 --";
  const result = await repo.getPage({ page: 3, limit: 10, search: attack, sort: 'rating_desc', duration: '30_60', min_rating: 4 });
  assert.equal(result.total, 100); assert.equal(result.recipes.length, 1);
  assert.equal(queries.length, 2); assert.equal(hydration.length, 1);
  assert.deepEqual(Array.from(hydration[0].where.id.in), [7]);
  assert.match(queries[1].sql, /ORDER BY.*avg_rating[\s\S]*LIMIT \? OFFSET \?/);
  assert.ok(!queries[1].sql.includes(attack));
  assert.ok(queries[1].values.includes("%a=_=%' OR 1==1 --%"));
  assert.deepEqual(queries[1].values.slice(-2), [10, 20]);
});
test('readiness requires both stores and handles failure, timeout and draining', async () => {
  for (const mode of ['ok', 'database', 'sessions', 'timeout', 'draining']) {
    let status = 200, body;
    const handler = readiness({ timeoutMs: 5, isDraining: () => mode === 'draining',
      probeDatabase: () => mode === 'database' ? Promise.reject(new Error('private details')) : Promise.resolve(),
      probeSessions: () => mode === 'sessions' ? Promise.reject(new Error('private details')) : mode === 'timeout' ? new Promise(() => {}) : Promise.resolve(),
    });
    await handler({}, { status(value) { status = value; return this; }, json(value) { body = value; } });
    assert.equal(status, mode === 'ok' ? 200 : 503);
    assert.equal(body.success, mode === 'ok');
    assert.ok(!JSON.stringify(body).includes('private details'));
  }
});
test('database harness refuses dev/remote/unconfirmed targets before importing any clients', () => {
  const env = { RUN_DATABASE_TESTS: 'yes', TEST_DB_CONFIRMED: 'yes',
    TEST_DATABASE_URL: 'mysql://fixture:fixture@127.0.0.1/recipe_test_prisma',
    TEST_SESSION_DATABASE_URL: 'mysql://fixture:fixture@127.0.0.1/recipe_test_sessions' };
  assert.equal(testDatabaseConfig(env).prisma.database, 'recipe_test_prisma');
  for (const changes of [{ TEST_DB_CONFIRMED: '' }, { TEST_DATABASE_URL: 'mysql://fixture@127.0.0.1/recipe_db' },
    { TEST_SESSION_DATABASE_URL: 'mysql://fixture@example.invalid/recipe_test_sessions' }]) {
    assert.throws(() => testDatabaseConfig({ ...env, ...changes }));
  }
});
test('offline evaluator refuses missing interactions, duplicate recipe IDs and mixed provenance', () => {
  assert.throws(() => validateDataset({ kind: 'real', label: 'Fixture', recipes: [], interactions: [] }));
  const recipe = { id: 1, title: 'Fixture', ingredients: [], tags: [] };
  const base = { kind: 'simulated', label: 'Validator fixture only', recipes: [recipe], interactions: [{ userId: 1, recipeId: 1, type: 'favorite' }] };
  assert.equal(validateDataset(base), base);
  assert.throws(() => validateDataset({ ...base, recipes: [recipe, recipe] }));
  assert.throws(() => validateDataset({ ...base, interactions: [{ ...base.interactions[0], kind: 'real' }] }));
});
test('production config requires canonical HTTPS origin and explicit trusted proxy addresses', () => {
  const env = { NODE_ENV: 'production', SESSION_SECRET: 'x'.repeat(32), DATABASE_URL: 'mysql://fixture@127.0.0.1/recipe_test_fixture', DB_HOST: 'fixture', DB_USER: 'fixture', DB_NAME: 'fixture' };
  assert.throws(() => validateRuntime(env), /APP_ORIGIN/);
  assert.throws(() => validateRuntime({ ...env, APP_ORIGIN: 'https://example.invalid', TRUST_PROXY: '1' }), /TRUST_PROXY/);
  assert.equal(validateRuntime({ ...env, APP_ORIGIN: 'https://example.invalid', TRUST_PROXY: '127.0.0.1' }).port, 3000);
});
test('actual recipe controllers reject malformed inputs before repository access', async () => {
  let accesses = 0;
  const unexpected = new Proxy({}, { get: () => async () => { accesses++; throw new Error('Unexpected repository access'); } });
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/recipeController.js'), 'utf8'), {
    module, console: { error() {} },
    require: id => {
      if (id === '../utils/apiValidation') return validation;
      if (id === '../utils/recipeListing') return require('../utils/recipeListing');
      if (id === '../utils/recipeValidation') return require('../utils/recipeValidation');
      if (id === '../config/prisma' || id.startsWith('../repositories/') || id === '../services/recommender') return unexpected;
      throw new Error('Unexpected dependency');
    },
  });
  const controller = module.exports;
  for (const [name, query] of [['getAllRecipes', { page: '1x' }], ['getHomePage', { search: [] }],
    ['getPopularRecipes', { limit: '-1' }], ['getPopularRecipes', { period: 'invalid' }],
    ['getSearchSuggestions', { q: {} }], ['getRecipeCards', { ids: '1junk' }]]) {
    let status = 200, body;
    await controller[name]({ query, session: {}, params: {} }, { status(value) { status = value; return this; }, json(value) { body = value; } });
    assert.equal(status, 400, name); assert.equal(body.success, false); assert.equal(body.error, body.message);
  }
  assert.equal(accesses, 0);
});
test('expected database failures map to stable status and sanitized error aliases', () => {
  for (const [error, expected] of [[{ code: 'P2002' }, 409], [{ code: 'P2003' }, 400],
    [{ code: 'P2025' }, 404], [{ code: 'P1001' }, 503], [{ code: 'P2034' }, 409],
    [{ code: 'P2010', meta: { code: '1213' }, message: 'private SQL' }, 409]]) {
    let status, body;
    validation.apiError({ status(value) { status = value; return this; }, json(value) { body = value; } }, error);
    assert.equal(status, expected); assert.equal(body.error, body.message); assert.ok(!JSON.stringify(body).includes('private SQL'));
  }
});
test('frontend error formatter accepts both API contracts and keeps network fallback', async () => {
  const { apiErrorMessage } = await import('../frontend/src/utils/apiError.js');
  assert.equal(apiErrorMessage({ response: { data: { error: 'Validation error' } } }), 'Validation error');
  assert.equal(apiErrorMessage({ response: { data: { message: 'Legacy error' } } }), 'Legacy error');
  assert.equal(apiErrorMessage({ response: { data: { error: {} } } }, 'Fallback'), 'Fallback');
  assert.equal(apiErrorMessage(new Error('private transport details'), 'Network error'), 'Network error');
});
test('actual admin middleware preserves guest/user/admin authorization boundary', () => {
  const { isAdmin } = require('../middlewares/authMiddleware');
  for (const [user, expected] of [[null, 401], [{ id: 1, role: 'user' }, 403], [{ id: 1, role: 'admin' }, 200]]) {
    let status = 200, passed = false;
    isAdmin({ session: { user } }, { status(value) { status = value; return this; }, json() {} }, () => { passed = true; });
    assert.equal(status, expected); assert.equal(passed, expected === 200);
  }
});
