const test = require('node:test');
const assert = require('node:assert/strict');
const { createRateLimiter } = require('../middlewares/rateLimit');

// Giả lập req/res tối thiểu của Express
function call(limiter, body = {}) {
  const req = { ip: '127.0.0.1', body };
  const res = {
    statusCode: 200,
    headers: {},
    payload: null,
    set(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };
  let passed = false;
  limiter(req, res, () => {
    passed = true;
  });
  return { req, res, passed };
}

test('chặn khi vượt số lần cho phép, trả 429 kèm Retry-After', () => {
  let now = 0;
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, key: (r) => r.body.username, now: () => now });
  assert.equal(call(limiter, { username: 'a' }).passed, true);
  assert.equal(call(limiter, { username: 'a' }).passed, true);
  const third = call(limiter, { username: 'a' });
  assert.equal(third.passed, false);
  assert.equal(third.res.statusCode, 429);
  assert.equal(third.res.headers['Retry-After'], '60');
  assert.equal(third.res.payload.success, false);
  limiter.stop();
});

test('mỗi tài khoản đếm riêng', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1, key: (r) => r.body.username });
  assert.equal(call(limiter, { username: 'a' }).passed, true);
  assert.equal(call(limiter, { username: 'b' }).passed, true);
  assert.equal(call(limiter, { username: 'a' }).passed, false);
  limiter.stop();
});

test('hết cửa sổ thời gian thì được thử lại', () => {
  let now = 0;
  const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => now });
  assert.equal(call(limiter).passed, true);
  assert.equal(call(limiter).passed, false);
  now = 1001;
  assert.equal(call(limiter).passed, true);
  limiter.stop();
});

test('reset() xoá bộ đếm (vd đăng nhập đúng)', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
  const first = call(limiter);
  first.req.rateLimit.reset();
  assert.equal(call(limiter).passed, true);
  limiter.stop();
});
