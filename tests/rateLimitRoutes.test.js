const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const express = require('express');
const session = require('express-session');

// Execute the real app composition and routers, with an allowlist loader.
// No application controller, repository, dotenv or MySQL module can be loaded.
async function sandbox(t) {
  const root = path.resolve(__dirname, '..');
  let clock = 1_000_000;
  const calls = [];
  const next = (_req, _res, done) => done();
  const handler = (name) => (req, res) => {
    calls.push(name);
    if (name === 'handleLogin') {
      if (req.body.acceptFixture === true) {
        // Same success-reset contract as authController.handleLogin.
        req.rateLimit?.reset();
        return res.json({ success: true });
      }
      return res.status(401).json({ success: false });
    }
    return res.json({ success: true, handler: name });
  };
  const controller = new Proxy({}, { get: (_target, name) => handler(name) });
  const multer = () => ({ single: () => next });
  multer.diskStorage = () => ({});
  let app;
  const expressFixture = Object.assign(() => {
    app = express();
    app.listen = () => { throw new Error('Production listener forbidden'); };
    return app;
  }, express);
  expressFixture.static = () => next;
  const cache = new Map();
  // Synthetic MySQLStore standing in for config/sessionStore (no database available here).
  const FixtureStore = class extends session.MemoryStore {
    async query(sql) { assert.equal(sql, 'SELECT session_id FROM sessions LIMIT 0'); return [[], []]; }
  };
  const sessionStoreFixture = new FixtureStore();
  const sessionStoreFixtureModule = { getSessionStore: () => sessionStoreFixture, closeSessionStore: async () => {} };
  function load(relative) {
    if (cache.has(relative)) return cache.get(relative);
    const filename = path.join(root, relative);
    const module = { exports: {} };
    const dependencies = {
      express: relative === 'app.js' ? expressFixture : express,
      path,
      fs: { mkdirSync() {} },
      multer,
      dotenv: { config() {} },
      './config/operations': require('../config/operations'),
      './utils/apiValidation': require('../utils/apiValidation'),
      helmet: Object.assign(() => next, { contentSecurityPolicy: { getDefaultDirectives: () => ({}) } }),
      'express-session': (options) => session({ ...options, secret: 'synthetic-session-fixture' }),
      'express-mysql-session': () => class extends session.MemoryStore {
        async query(sql) { assert.equal(sql, 'SELECT session_id FROM sessions LIMIT 0'); return [[], []]; }
      },
      './config/prisma': { $queryRaw: async () => [{ healthy: 1 }], $disconnect: async () => {} },
      './config/sessionStore': sessionStoreFixtureModule,
      '../config/sessionStore': sessionStoreFixtureModule,
      'crypto': require('node:crypto'),
      '../utils/sessionAuth': require('../utils/sessionAuth'),
      '../middlewares/rateLimit': relative === 'middlewares/rateLimit.js' ? null : undefined,
      '../middlewares/authMiddleware': { isAuthenticated: next, isOTP: next, isEmail: next },
      './middlewares/sessionUserMiddleware': { refreshSessionUser: (req, _res, done) => {
        // Synthetic identities only at this sandbox boundary, never proxy trust configuration.
        Object.defineProperty(req, 'ip', { value: req.headers['x-fixture-ip'] || '192.0.2.1' });
        if (req.headers['x-fixture-user']) req.session.user = { id: req.headers['x-fixture-user'] };
        done();
      } },
    };
    const fixtureRequire = (id) => {
      if (id === '../middlewares/rateLimit') return load('middlewares/rateLimit.js');
      if (id === './middlewares/tokenAuth') return load('middlewares/tokenAuth.js');
      if (id === '../services/tokenService') return load('services/tokenService.js');
      if (id.startsWith('../controllers/')) return controller;
      if (id.startsWith('./routes/')) {
        const route = id.slice(2);
        return ['routes/authRoutes.js', 'routes/recipeRoutes.js', 'routes/interactionRoutes.js'].includes(route)
          ? load(route) : express.Router();
      }
      if (Object.hasOwn(dependencies, id)) return dependencies[id];
      throw new Error(`Unexpected sandbox dependency: ${id}`);
    };
    let source = fs.readFileSync(filename, 'utf8');
    // Suppress only startup. All app.use calls execute unmodified in original order.
    if (relative === 'app.js') source = source.replace(/app\.listen\(PORT,[\s\S]*?\n\}\);/, '');
    vm.runInNewContext(source, {
      require: fixtureRequire, module, exports: module.exports,
      __dirname: path.dirname(filename), console,
      process: { env: {} }, Date: class extends Date { static now() { return clock; } },
      setInterval, clearInterval, Buffer,
    }, { filename });
    cache.set(relative, module.exports);
    return module.exports;
  }
  load('app.js');
  const limiters = load('middlewares/rateLimit.js');
  const server = http.createServer(app);
  t.after(async () => {
    for (const value of Object.values(limiters)) value.stop?.();
    server.closeAllConnections();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const url = `http://127.0.0.1:${server.address().port}/api`;
  return {
    calls,
    advance: (ms) => { clock += ms; },
    async request(route, { body = {}, raw, root = false, ip = '192.0.2.1', user = 'fixture-a', method = 'POST' } = {}) {
      const res = await fetch((root ? url.slice(0, -4) : url) + route, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-fixture-ip': ip, ...(user ? { 'x-fixture-user': user } : {}) },
        ...(method === 'GET' ? {} : { body: raw === undefined ? JSON.stringify(body) : raw }),
      });
      return { status: res.status, retry: res.headers.get('retry-after'), body: await res.json() };
    },
  };
}

for (const [route, controller] of [['comments', 'addComment'], ['rate', 'addRating'], ['favorite', 'toggleFavorite'], ['tags', 'addTag']]) {
  test(`actual app mount: ${route} allows 30, rejects 31 before controller, resets at 60s`, async (t) => {
    const s = await sandbox(t);
    for (let n = 0; n < 30; n++) assert.equal((await s.request(`/recipes/1/${route}`)).status, 200);
    const blocked = await s.request(`/recipes/1/${route}`);
    assert.equal(blocked.status, 429);
    assert.equal(blocked.retry, '60');
    assert.equal(blocked.body.success, false);
    assert.equal(s.calls.filter((name) => name === controller).length, 30);
    s.advance(60_000);
    assert.equal((await s.request(`/recipes/1/${route}`)).status, 200);
  });
}

test('interaction bucket spans routes/recipe IDs, isolates IP/user/guest; read/view/write unaffected', async (t) => {
  const s = await sandbox(t);
  for (let n = 0; n < 30; n++) assert.equal((await s.request('/recipes/1/favorite')).status, 200);
  for (const route of ['comments', 'rate', 'tags']) assert.equal((await s.request(`/recipes/2/${route}`)).status, 429);
  assert.equal((await s.request('/recipes/2/comments', { user: 'fixture-b' })).status, 200);
  assert.equal((await s.request('/recipes/2/comments', { ip: '192.0.2.2' })).status, 200);
  assert.equal((await s.request('/recipes/2/comments', { user: null })).status, 200);
  assert.equal((await s.request('/recipes/2/view')).status, 200);
  assert.equal((await s.request('/recipes', { method: 'GET' })).status, 200);
  assert.equal((await s.request('/recipes/create')).status, 200);
});

test('actual app health/readiness and malformed JSON/404 use the expected HTTP contract', async (t) => {
  const s = await sandbox(t);
  for (const route of ['/healthz', '/readyz']) {
    const response = await s.request(route, { root: true, method: 'GET' });
    assert.equal(response.status, 200); assert.equal(response.body.success, true);
  }
  const bad = await s.request('/login', { raw: '{' });
  assert.equal(bad.status, 400); assert.equal(bad.body.error, bad.body.message);
  const missing = await s.request('/unknown-endpoint', { method: 'GET' });
  assert.equal(missing.status, 404); assert.equal(missing.body.error, missing.body.message);
});

test('login account bucket normalizes username, separates accounts/IP and expires', async (t) => {
  const s = await sandbox(t);
  for (let n = 0; n < 5; n++) assert.equal((await s.request('/login', { body: { username: 'fixture-a' } })).status, 401);
  const blocked = await s.request('/login', { body: { username: '  FIXTURE-A  ' } });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.retry, '900');
  assert.equal((await s.request('/login', { body: { username: 'fixture-b' } })).status, 401);
  assert.equal((await s.request('/login', { body: { username: 'fixture-a' }, ip: '192.0.2.2' })).status, 401);
  s.advance(900_000);
  assert.equal((await s.request('/login', { body: { username: 'fixture-a' } })).status, 401);
});

test('login IP-wide cap blocks username rotation, isolates IP, expires; GET login unaffected', async (t) => {
  const s = await sandbox(t);
  for (let n = 0; n < 20; n++) assert.equal((await s.request('/login', { body: { username: `fixture-${n}` } })).status, 401);
  const blocked = await s.request('/login', { body: { username: 'fixture-next' } });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.retry, '900');
  assert.equal(s.calls.filter((name) => name === 'handleLogin').length, 20);
  assert.equal((await s.request('/login', { body: { username: 'fixture-next' }, ip: '192.0.2.2' })).status, 401);
  assert.equal((await s.request('/login', { method: 'GET' })).status, 200);
  s.advance(900_000);
  assert.equal((await s.request('/login', { body: { username: 'fixture-next' } })).status, 401);
});

test('successful login resets account bucket only; cannot clear IP-wide cap', async (t) => {
  const s = await sandbox(t);
  const body = { username: 'fixture-a' };
  for (let n = 0; n < 4; n++) assert.equal((await s.request('/login', { body })).status, 401);
  assert.equal((await s.request('/login', { body: { ...body, acceptFixture: true } })).status, 200);
  for (let n = 0; n < 5; n++) assert.equal((await s.request('/login', { body })).status, 401);
  assert.equal((await s.request('/login', { body })).status, 429);
  // Eleven attempts, including the account-limited attempt, consume the IP budget.
  for (let n = 11; n < 20; n++) assert.equal((await s.request('/login', { body: { username: `fixture-${n}`, acceptFixture: true } })).status, 200);
  assert.equal((await s.request('/login', { body: { username: 'fixture-final', acceptFixture: true } })).status, 429);
});
