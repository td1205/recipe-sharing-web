const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');

// Kiểm thử đơn vị cho token Bearer (Flutter) mà không cần MySQL:
// dùng một memory store tối thiểu hỗ trợ get/set/destroy.
function memoryStore(initial = {}) {
  const rows = new Map(Object.entries(initial));
  return {
    rows,
    async get(sid) { return rows.get(sid) ?? null; },
    async set(sid, data) { rows.set(sid, data); },
    async destroy(sid) { rows.delete(sid); },
  };
}

function load(relative, store, { now = 1_000_000 } = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  function loadFile(rel) {
    const innerFilename = path.resolve(__dirname, '..', rel);
    const inner = { exports: {} };
    vm.runInNewContext(fs.readFileSync(innerFilename, 'utf8'), {
      require(id) {
        if (id === 'crypto') return crypto;
        if (id === '../utils/sessionAuth') return require('../utils/sessionAuth');
        if (id === '../config/sessionStore') return { getSessionStore: () => store, closeSessionStore: async () => {} };
        if (id === '../services/tokenService') return loadFile('services/tokenService.js').exports;
        throw new Error(`Unexpected dependency: ${id}`);
      },
      module: inner,
      exports: inner.exports,
      __dirname: path.dirname(innerFilename),
      console,
      process: { env: {} },
      Date: class extends Date { static now() { return now; } },
      Buffer,
    }, { filename: innerFilename });
    return inner;
  }
  return loadFile(relative).exports;
}

function makeUser(overrides = {}) {
  return {
    id: 7,
    username: 'flutter_user',
    email: 'flutter@example.invalid',
    role: 'user',
    password: '$2b$10$fixturehashvalue',
    ...overrides,
  };
}

const run = (middleware, req, resOverrides = {}) => {
  const res = { locals: {}, ...resOverrides };
  let statusCode;
  res.status = (code) => { statusCode = code; return { json: () => {} }; };
  const outcome = { next: undefined, res, statusCode: () => statusCode };
  const finish = (error) => { outcome.next = error; };
  const handler = middleware(req, res, finish);
  if (handler && typeof handler.then === 'function') {
    return handler.then(() => outcome, (error) => { outcome.next = error; return outcome; });
  }
  return Promise.resolve(outcome);
};

test('tokenService: issue -> resolve roundtrip keeps only a hash in the store', async () => {
  const store = memoryStore();
  const tokenService = load('services/tokenService.js', store);
  const issued = await tokenService.issueToken(makeUser(), true);
  assert.match(issued.token, /^[a-f0-9]{64}$/);
  assert.deepEqual({ ...issued.user }, { id: 7, username: 'flutter_user', email: 'flutter@example.invalid', role: 'user' });
  const resolved = await tokenService.resolveToken(issued.token);
  assert.ok(resolved);
  assert.equal(resolved.user.id, 7);
  assert.equal(resolved.sid, crypto.createHash('sha256').update(issued.token).digest('hex'));
  const baked = [...store.rows.values()].map((row) => JSON.stringify(row));
  assert.ok(!baked.some((text) => text.includes(issued.token)), 'raw token must not be stored');
  assert.ok(!baked.some((text) => text.includes('fixturehashvalue')), 'password hash must not be stored');
  assert.ok(baked.some((text) => text.includes('"role":"user"')), 'session payload keeps user identity');
});

test('tokenService: invalid token shapes rejected without touching store', async () => {
  const store = memoryStore();
  const tokenService = load('services/tokenService.js', store);
  assert.equal(await tokenService.resolveToken(''), null);
  assert.equal(await tokenService.resolveToken('z'.repeat(64)), null);
  assert.equal(await tokenService.resolveToken('A'.repeat(64)), null, 'uppercase hex does not match issue format');
  assert.equal(await tokenService.resolveToken(null), null);
  assert.equal(store.rows.size, 0);
});

test('tokenService: expired token is invalid and pruned', async () => {
  const store = memoryStore();
  let now = 1_000_000;
  const initial = load('services/tokenService.js', store, { now });
  const issued = await initial.issueToken(makeUser(), false); // TTL 1 ngày
  assert.ok(await initial.resolveToken(issued.token));
  now += 1000 * 60 * 60 * 25; // chạy đồng hồ vượt TTL
  const later = load('services/tokenService.js', store, { now });
  assert.equal(await later.resolveToken(issued.token), null);
  assert.equal(store.rows.size, 0, 'expired token pruned from store');
});

test('tokenService: remember flag validation', async () => {
  const store = memoryStore();
  const tokenService = load('services/tokenService.js', store);
  await assert.rejects(() => tokenService.issueToken(makeUser(), 'sometimes'), /remember không hợp lệ/);
  const issued = await tokenService.issueToken(makeUser(), 'on');
  assert.match(issued.token, /^[a-f0-9]{64}$/);
});

test('tokenAuth: no header leaves session untouched', async () => {
  const store = memoryStore();
  const tokenAuth = load('middlewares/tokenAuth.js', store);
  const existingSession = { user: { id: 1, role: 'admin' } };
  const req = { headers: {}, session: existingSession };
  const result = await run(tokenAuth, req);
  assert.equal(result.next, undefined, 'next() called without error');
  assert.equal(req.session.user.id, 1, 'session not overwritten');
});

test('tokenAuth: hydrates facade for valid token; destroy() revokes it', async () => {
  const store = memoryStore();
  const tokenService = load('services/tokenService.js', store);
  const tokenAuth = load('middlewares/tokenAuth.js', store);
  const issued = await tokenService.issueToken(makeUser(), true);

  const req = { headers: { authorization: `Bearer ${issued.token}` }, res: { locals: {} } };
  const result = await run(tokenAuth, req);
  assert.equal(result.next, undefined);
  assert.equal(req.isTokenAuth, true);
  assert.equal(req.session.user.id, 7);
  assert.equal(req.session.user.role, 'user');
  assert.equal(result.res.locals.user.id, 7);
  assert.match(req.sessionID, /^token-[a-f0-9]{64}$/);
  assert.equal(typeof req.session.destroy, 'function');
  // express-session gọi các hàm này khi commit response: thiếu là treo.
  for (const method of ['touch', 'save', 'regenerate', 'destroy']) {
    assert.equal(typeof req.session[method], 'function', `facade must expose ${method}`);
  }

  // logout: destroy(callback) thu hồi token thật.
  await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
  assert.equal(store.rows.size, 0);

  // Token đã thu hồi -> 401.
  const revoked = { headers: { authorization: `Bearer ${issued.token}` }, res: {} };
  const after = await run(tokenAuth, revoked);
  assert.equal(after.next, undefined, 'handled via res.status, not next()');
  assert.equal(after.statusCode(), 401, 'revoked token is rejected with 401');
});

test('tokenAuth: malformed bearer -> 401 with explicit message; cookie session wins', async () => {
  const store = memoryStore();
  const tokenService = load('services/tokenService.js', store);
  const tokenAuth = load('middlewares/tokenAuth.js', store);
  const issued = await tokenService.issueToken(makeUser(), true);

  const badFormat = { headers: { authorization: 'Bearer not-hex'.padEnd(70, 'x') }, res: {} };
  const result = await run(tokenAuth, badFormat);
  assert.equal(result.next, undefined, 'handled via res.status');
  assert.equal(result.statusCode(), 401);

  // Web session ưu tiên: token không ghi đè cookie session đang hoạt động.
  const webSession = {
    headers: { authorization: `Bearer ${issued.token}` },
    session: { user: { id: 1, role: 'admin' } },
  };
  const prefers = await run(tokenAuth, webSession);
  assert.equal(prefers.next, undefined);
  assert.equal(webSession.session.user.id, 1, 'cookie session wins over token');
});
