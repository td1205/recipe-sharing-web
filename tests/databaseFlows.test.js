const test = require('node:test');
const assert = require('node:assert/strict');
const { testDatabaseConfig } = require('./helpers/testDatabase.cjs');

// Not in test:safe. No dotenv, ORM, MySQL or app imports before the explicit guard.
test('isolated MySQL HTTP journeys and rollback', { skip: process.env.RUN_DATABASE_TESTS !== 'yes', timeout: 60000 }, async () => {
  const config = testDatabaseConfig(process.env);
  process.env.DATABASE_URL = config.prisma.url;
  Object.assign(process.env, { DB_HOST: config.sessions.host, DB_PORT: config.sessions.port,
    DB_NAME: config.sessions.database, DB_USER: config.sessions.user, DB_PASSWORD: config.sessions.password,
    SESSION_SECRET: 'isolated-integration-fixture-not-production', NODE_ENV: 'test', TRUST_PROXY: '', APP_ORIGIN: '' });
  const prisma = require('../config/prisma');
  const mysql = require('mysql2/promise');
  let probe, app, server, category, fixtures = [];
  const jars = [];
  try {
    probe = await mysql.createConnection(config.sessions.url);
    const [actual] = await prisma.$queryRaw`SELECT DATABASE() name`;
    const [[sessionDatabase]] = await probe.query('SELECT DATABASE() name');
    assert.equal(actual.name, config.prisma.database);
    assert.equal(sessionDatabase.name, config.sessions.database);
    assert.equal(await prisma.users.count(), 0, 'Test DB must have no pre-existing users');
    const [[sessionCount]] = await probe.query('SELECT COUNT(*) count FROM sessions');
    assert.equal(Number(sessionCount.count), 0, 'Session test store must be empty');
    const bcrypt = require('bcrypt');
    const password = 'Fixture-Only!123';
    const hash = await bcrypt.hash(password, 4);
    for (let n = 0; n < 3; n++) fixtures.push(await prisma.users.create({ data: {
      username: `integration_${n}`, email: `integration_${n}@example.invalid`, fullname: 'Integration Fixture',
      password: hash, role: n < 2 ? 'admin' : 'user', is_banned: false,
    } }));
    category = await prisma.categories.create({ data: { name: 'Integration Fixture' } });
    // Forbid paid/email adapters even if unrelated routes are accidentally exercised.
    const Module = require('node:module');
    const originalLoad = Module._load;
    Module._load = function(id, parent, main) {
      if (id.endsWith('/mailHelper')) return { sendMail: async () => { throw new Error('External email forbidden'); }, isMailConfigured: () => false, MailError: class extends Error {} };
      if (id.endsWith('/geminiService')) return { recognizeDish: async () => { throw new Error('Paid AI forbidden'); } };
      if (/cloudinary/.test(id)) throw new Error('Cloudinary forbidden');
      return originalLoad.call(this, id, parent, main);
    };
    try { app = require('../app'); } finally { Module._load = originalLoad; }
    server = require('node:http').createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    function client() {
      const jar = { cookie: '' };
      jars.push(jar);
      jar.request = async (route, body, method = body === undefined ? 'GET' : 'POST') => {
        const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(jar.cookie ? { Cookie: jar.cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
        const cookies = response.headers.getSetCookie();
        if (cookies.length) jar.cookie = cookies.map(value => value.split(';')[0]).join('; ');
        return { status: response.status, data: await response.json() };
      };
      return jar;
    }
    const admin = client(), second = client(), user = client(), guest = client();
    assert.equal((await guest.request('/admin/users')).status, 401);
    for (const [jar, fixture] of [[admin, fixtures[0]], [second, fixtures[1]], [user, fixtures[2]]]) {
      assert.equal((await jar.request('/login', { username: fixture.username, password })).status, 200);
    }
    assert.equal((await user.request('/admin/users')).status, 403);
    const body = { title: 'Trứng tỏi fixture', description: 'Isolated integration fixture', category_id: String(category.id),
      prep_time: '5', cook_time: '5', servings: '1', ing_name: ['Trứng', 'Tỏi'], ing_amount: ['1', '1'], ing_unit: ['quả', 'tép'], step_instruction: ['Chiên trứng với tỏi'], tags: ['fixture'] };
    const created = await user.request('/recipes/create', body);
    assert.equal(created.status, 201);
    const id = created.data.recipeId;
    assert.equal((await guest.request(`/recipes/edit/${id}`, body)).status, 401);
    assert.equal((await user.request(`/recipes/edit/${id}`, { ...body, title: 'Trứng fixture đã sửa' })).status, 200);
    assert.equal((await user.request(`/recipes/${id}/favorite`, { isFav: true })).data.isFav, true);
    assert.equal((await user.request(`/recipes/${id}/favorite`, { isFav: true })).data.isFav, true);
    for (const stars of [4, 5]) assert.equal((await user.request(`/recipes/${id}/rate`, { star_count: stars })).status, 200);
    assert.equal(await prisma.ratings.count({ where: { recipe_id: id } }), 1);
    assert.equal((await user.request(`/recipes/${id}/comments`, { content: 'Fixture comment' })).status, 200);
    assert.equal((await user.request('/profile')).data.favouriteRecipes.length, 1);
    assert.equal((await guest.request('/recipes?page=1&limit=1&search=fixture')).data.total, 1);
    await require('../services/recommender').getModels({ forceRebuild: true });
    const pantry = await guest.request('/recommendations/by-ingredients?items=trứng,tỏi');
    assert.equal(pantry.status, 200);
    assert.ok(pantry.data.recipes.some(recipe => recipe.id === id));
    const repo = require('../repositories/recipeRepository');
    const originalTags = repo.setRecipeTags;
    const before = await prisma.recipes.count();
    repo.setRecipeTags = async (recipeId, _tags, tx) => {
      assert.ok(await tx.recipes.findUnique({ where: { id: recipeId } }));
      throw new Error('Injected rollback');
    };
    try { await assert.rejects(repo.createRecipe({ user_id: fixtures[2].id, category_id: category.id, title: 'Rollback fixture' }, [], [], [], ['fixture']), /Injected rollback/); }
    finally { repo.setRecipeTags = originalTags; }
    assert.equal(await prisma.recipes.count(), before);
    assert.equal((await admin.request(`/admin/users/ban/${fixtures[1].id}`, { is_banned: true })).status, 200);
    for (const [route, payload] of [[`ban/${fixtures[0].id}`, { is_banned: true }], [`delete/${fixtures[0].id}`, {}], [`edit/${fixtures[0].id}`, { fullname: 'Fixture', email: fixtures[0].email, role: 'user' }]]) {
      assert.equal((await admin.request(`/admin/users/${route}`, payload)).status, 400);
    }
    assert.equal((await admin.request(`/admin/users/ban/${fixtures[1].id}`, { is_banned: false })).status, 200);
    const simultaneous = await Promise.all([
      admin.request(`/admin/users/ban/${fixtures[0].id}`, { is_banned: true }),
      second.request(`/admin/users/edit/${fixtures[1].id}`, { fullname: 'Fixture', email: fixtures[1].email, role: 'user' }),
    ]);
    assert.equal(simultaneous.filter(result => result.status === 200).length, 1);
    assert.equal(await prisma.users.count({ where: { role: 'admin', is_banned: false } }), 1);
    assert.equal((await user.request(`/recipes/${id}`, undefined, 'DELETE')).status, 200);
    assert.equal((await user.request('/logout', {})).status, 200);
    assert.equal((await user.request('/profile')).status, 401);
  } finally {
    if (server) {
      for (const jar of jars) { try { await jar.request('/logout', {}); } catch {} }
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
    // Delete only IDs created above, in the verified test database, never existing data.
    try {
      if (fixtures.length) await prisma.users.deleteMany({ where: { id: { in: fixtures.map(user => user.id) } } });
      if (category) await prisma.categories.delete({ where: { id: category.id } });
    } finally {
      if (probe) await probe.end();
      if (app) await app.locals.closeResources(); else await prisma.$disconnect();
    }
  }
});
