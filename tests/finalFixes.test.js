const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const validation = require('../utils/apiValidation');
const { validatePassword } = require('../utils/passwordPolicy');
const { fingerprint } = require('../utils/sessionAuth');
const { validateRuntime } = require('../config/runtime');
const { buildModels, recipesByIngredients } = require('../services/recommender/hybrid');
const { listPage } = require('../utils/recipeListing');
const { evaluate } = require('../services/recommender/evaluation');
const { validateRecipeInput } = require('../utils/recipeValidation');
function load(file, dependencies) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    module, console, Date,
    require: id => {
      if (!Object.hasOwn(dependencies, id)) throw new Error(`Unexpected dependency: ${id}`);
      return dependencies[id];
    },
  });
  return module.exports;
}

test('web login normalizes remember values and rejects invalid flags before authentication', async () => {
  let calls=0;
  const controller=load('controllers/authController.js',{
    '../utils/apiValidation':validation,'../utils/sessionAuth':require('../utils/sessionAuth'),
    '../repositories/userRepository':{},'../services/tokenService':{},bcrypt:{},'../utils/mailHelper':{},
    '../services/authService':{login:async()=>{calls++;return {success:true,user:{id:1,password:'fixture-hash',role:'user'}};}},
    '../utils/passwordPolicy':{},
  });
  for(const remember of [undefined,false,'false',true,'true','on']){
    const session={cookie:{},regenerate(done){done();},save(done){done();}};
    let status=200,body;
    await controller.handleLogin({body:{username:'fixture',password:'fixture',remember},session},{status(n){status=n;return this;},json(value){body=value;}});
    assert.equal(status,200);assert.equal(body.success,true);
    assert.equal(session.cookie.maxAge,[true,'true','on'].includes(remember)?30*86400000:86400000);
  }
  const before=calls;let status;
  await controller.handleLogin({body:{username:'fixture',password:'fixture',remember:'invalid'}},{status(n){status=n;return this;},json(){}});
  assert.equal(status,400);assert.equal(calls,before);
});
test('validation rejects malformed values and maps expected database errors', () => {
  for (const id of ['1x', '-1', '0', '1.5', [], null]) assert.throws(() => validation.id(id));
  for (const value of [{}, [], null, 'bad']) assert.throws(() => validation.email(value));
  assert.equal(validation.email(' fixture@example.invalid '), 'fixture@example.invalid');
  for (const value of [null, undefined, {}, 100]) assert.ok(validatePassword(value));
  let status, body;
  validation.apiError({ status(n) { status = n; return this; }, json(data) { body = data; } }, { code: 'P2002' });
  assert.equal(status, 409); assert.equal(body.error, body.message);
  assert.doesNotThrow(() => validateRecipeInput(null));
  const malformed = validateRecipeInput({ title: {}, category_id: [1], tags: [{}], ing_name: [true] });
  assert.ok(malformed.errors.some(error => error.includes('sai kiểu')));
  assert.ok(malformed.errors.some(error => error.includes('chuỗi')));
});
test('pantry requireAll checks spices in full ingredient list and supports offsets', () => {
  const recipes = [1, 2, 3].map(id => ({ id, title: 'Trứng chiên', categoryId: 1, ingredients: ['Trứng', 'Tỏi'], tags: [] }));
  const models = buildModels({ recipes, interactions: [] });
  const eggs = recipesByIngredients(models, ['trứng'], { requireAll: true });
  const both = recipesByIngredients(models, ['trứng', 'tỏi'], { requireAll: true });
  assert.equal(both.total, eggs.total); assert.equal(both.total, 3);
  assert.equal(recipesByIngredients(models, ['toi'], { requireAll: true }).total, 3);
  const page = recipesByIngredients(models, ['trứng'], { requireAll: true, limit: 1, offset: 1 });
  assert.equal(page.items.length, 1); assert.equal(page.total, 3);
  assert.equal(page.items[0].recipeId, both.items[1].recipeId);
  assert.equal(recipesByIngredients(models, ['trứng', 'bò'], { requireAll: true }).total, 0);
});
test('reset authorization expires and does not accept legacy boolean alone', () => {
  const { isOTP } = load('middlewares/authMiddleware.js', {});
  for (const session of [{ otp: true }, { otp: true, resetGrantExpiresAt: Date.now() - 1 }]) {
    let status, passed = false;
    isOTP({ session }, { status(n) { status = n; return this; }, json() {} }, () => { passed = true; });
    assert.equal(status, 403); assert.equal(passed, false);
  }
  let passed = false;
  isOTP({ session: { otp: true, resetGrantExpiresAt: Date.now() + 10000 } }, {}, () => { passed = true; });
  assert.equal(passed, true);
});
test('password change invalidates old login session on the next request', async () => {
  const { refreshSessionUser } = load('middlewares/sessionUserMiddleware.js', {
    '../config/prisma': { users: { findUnique: async () => ({ role: 'admin', is_banned: false, password: 'new-fixture-hash' }) } },
    '../utils/sessionAuth': { fingerprint },
  });
  let destroyed = false, status;
  await refreshSessionUser({ session: { user: { id: 1 }, authFingerprint: fingerprint('old-fixture-hash'), destroy(done) { destroyed = true; done(); } } }, {
    locals: {}, status(n) { status = n; return this; }, json() {},
  }, () => assert.fail('Revoked session must not reach route'));
  assert.equal(destroyed, true); assert.equal(status, 401);
});
for (const operation of ['create', 'update']) {
  test(`recipe ${operation} uses one transaction for recipe and author tags; tag failure propagates`, async () => {
    const calls = [];
    let transactions = 0;
    const tx = {
      recipes: { create: async () => { calls.push('recipe'); return { id: 1 }; }, update: async () => { calls.push('recipe'); } },
      tags: { upsert: async () => { calls.push('tags'); throw new Error('fixture tag failure'); } },
    };
    const repo = load('repositories/recipeRepository.js', {
      '../config/prisma': { $transaction: async callback => { transactions++; return callback(tx); } },
      '../utils/userSelect': { PUBLIC_USER_SELECT: {} },
      '../services/recommendationService': { rankRecommendations() {} },
    });
    const data = { user_id: 1, category_id: 1 };
    const request = operation === 'create'
      ? repo.createRecipe(data, [], [], [], ['fixture-tag'])
      : repo.updateRecipe(1, data, [], [], [], ['fixture-tag']);
    await assert.rejects(request, /fixture tag failure/);
    assert.equal(transactions, 1); assert.deepEqual(calls, ['recipe', 'tags']);
  });
}
test('runtime config fails before startup for missing values or invalid port', () => {
  assert.throws(() => validateRuntime({}), /Thiếu cấu hình/);
  const env = { DATABASE_URL: 'mysql://fixture@127.0.0.1/recipe_test_fixture', DB_HOST: 'fixture', DB_USER: 'fixture', DB_NAME: 'fixture', SESSION_SECRET: 'fixture' };
  assert.equal(validateRuntime(env).port, 3000);
  assert.throws(() => validateRuntime({ ...env, PORT: 'invalid' }), /PORT/);
  assert.throws(() => validateRuntime({ ...env, NODE_ENV: 'production' }), /SESSION_SECRET/);
});
test('listing filters and sorts before pagination, clamps page and preserves total', () => {
  const recipes = [1, 2, 3, 4, 5].map(id => ({ id, title: `Món ${id}`, category_id: id % 2, category_name: 'Món chính',
    ingredient_names: ['trứng'], tag_names: ['nhanh'], prep_time: 10, cook_time: id * 10,
    avg_rating: id, total_ratings: 1, view_count: id, created_at: new Date(id * 1000).toISOString() }));
  const result = listPage(recipes, { page: 2, limit: 1, category: '1', sort: 'rating_desc', search: 'trứng' });
  assert.equal(result.total, 3); assert.equal(result.recipes[0].id, 3);
  assert.equal(listPage(recipes, { page: 99, limit: 2 }).page, 3);
  assert.equal(listPage(recipes, { duration: 'under_30', tag: 'nhanh', page: 1 }).total, 2);
});
test('offline protocol explicitly records production postprocessing versus ablation', () => {
  const data = { recipes: [{ id: 1, title: 'Fixture', ingredients: [], tags: [] }], interactions: [], seed: 7 };
  assert.equal(evaluate(data).protocol.diversify, true);
  assert.equal(evaluate({ ...data, diversify: false }).protocol.mode, 'ablation-no-diversity');
});
test('favorite desired state is idempotent and all reads/writes use locked transaction', async () => {
  let favorite = null, creates = 0, locked = false;
  const tx = {
    $queryRaw: async sql => { assert.match(sql.join('?'), /FOR UPDATE/); locked = true; return [{ id: 2 }]; },
    favorites: {
      findUnique: async () => { assert.ok(locked); return favorite; },
      create: async ({ data }) => { creates++; favorite = data; },
      deleteMany: async () => { favorite = null; },
    },
  };
  const repo = load('repositories/favoriteRepository.js', { '../config/prisma': { $transaction: callback => callback(tx) } });
  assert.equal(await repo.setFavorite(1, 2, true), true);
  assert.equal(await repo.setFavorite(1, 2, true), true);
  assert.equal(creates, 1);
  assert.equal(await repo.setFavorite(1, 2, false), false);
  assert.equal(await repo.setFavorite(1, 2, false), false);
});
test('rating write uses one database upsert statement instead of find-then-create', async () => {
  let writes = 0;
  const repo = load('repositories/ratingRepository.js', { '../config/prisma': {
    $executeRaw: async (sql, ...values) => {
      writes++; assert.match(sql.join('?'), /ON DUPLICATE KEY UPDATE/); assert.deepEqual(values, [1, 2, 5]);
    },
  } });
  await repo.createOrUpdateRating(1, 2, 5);
  assert.equal(writes, 1);
});
test('reset password consumes previous password version and destroys the reset session', async () => {
  let version = 'old-fixture-hash', destroyed = 0;
  const repo = {
    getUserByEmail: async () => [{ password: version }],
    consumePasswordReset: async (_email, previous, next) => {
      if (previous !== version) return { count: 0 };
      version = next; return { count: 1 };
    },
  };
  const controller = load('controllers/authController.js', {
    '../utils/apiValidation': validation, '../utils/sessionAuth': require('../utils/sessionAuth'),
    '../repositories/userRepository': repo, bcrypt: { hash: async () => 'new-fixture-hash' },
    '../utils/mailHelper': {}, '../services/authService': {}, '../utils/passwordPolicy': { validatePassword: () => null },
    '../services/tokenService': { issueToken: async () => { throw new Error('Token issuance forbidden in this fixture'); } },
  });
  const request = () => ({ body: { password: 'synthetic', confirm_password: 'synthetic' }, session: {
    resetEmail: 'fixture@example.invalid', otp: true, resetGrantExpiresAt: Date.now() + 10000,
    resetGrantFingerprint: fingerprint('old-fixture-hash'), destroy(done) { destroyed++; done(); },
  } });
  let body, status = 200;
  const res = { json(data) { body = data; return this; }, status(value) { status = value; return this; } };
  await controller.handleChangePassword(request(), res);
  assert.equal(body.success, true); assert.equal(destroyed, 1);
  await controller.handleChangePassword(request(), res);
  assert.equal(body.success, false); assert.equal(status, 403); assert.equal(destroyed, 1);
});
