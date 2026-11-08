const test = require('node:test');
const assert = require('node:assert/strict');
const response = import('../frontend/src/utils/adminResponse.js');
const list = () => ({
  success: true,
  items: [{ id: 1 }],
  total: 1,
  page: 1,
  limit: 20,
});
const model = () => ({
  success: true,
  model: {
    status: 'not_built',
    builtAt: null,
    lastFailedAt: null,
    counts: null,
    rebuildIntervalMs: 600000,
    algorithms: ['Popularity', 'CBF', 'Item-CF', 'Hybrid'],
    settings: { contentWeight: 0.3, cfWeight: 0.7 },
  },
});

test('valid paginated and legacy recipe responses are normalized without fabricating pagination', async () => {
  const { validateAdminResponse } = await response;
  const data = list();
  assert.deepEqual(validateAdminResponse(data), data);
  const legacy = { ...data, recipes: data.items };
  delete legacy.items;
  assert.deepEqual(validateAdminResponse(legacy).items, [{ id: 1 }]);
  assert.deepEqual(
    validateAdminResponse({
      success: true,
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    }).items,
    [],
  );
});
test('business failure in HTTP 200 becomes a controlled response error', async () => {
  const { validateAdminResponse, AdminResponseError } = await response;
  assert.throws(
    () =>
      validateAdminResponse({
        success: false,
        error: 'Không thể tải danh sách',
      }),
    (error) =>
      error instanceof AdminResponseError &&
      error.message === 'Không thể tải danh sách',
  );
});
test('malformed lists, rows and missing/invalid pagination are rejected before rendering', async () => {
  const { validateAdminResponse, AdminResponseError } = await response;
  const cases = [
    null,
    'HTML response',
    {},
    { ...list(), success: undefined },
    { ...list(), items: {} },
    { ...list(), items: [null] },
    { ...list(), items: [{ id: -1 }] },
    { ...list(), total: undefined },
    { ...list(), total: '1' },
    { ...list(), total: NaN },
    { ...list(), total: Infinity },
    { ...list(), page: 0 },
    { ...list(), page: 2 },
    { ...list(), limit: 0 },
    { ...list(), limit: 101 },
    { ...list(), items: [] },
    { ...list(), total: 21, page: 2, items: [{ id: 1 }, { id: 2 }] },
  ];
  for (const data of cases)
    assert.throws(() => validateAdminResponse(data), AdminResponseError);
});
test('model responses use their own contract and preserve unknown counts as null', async () => {
  const { validateAdminResponse, AdminResponseError } = await response;
  const data = model();
  assert.deepEqual(validateAdminResponse(data, 'model'), data);
  assert.throws(() => validateAdminResponse(data), AdminResponseError);
  assert.throws(
    () => validateAdminResponse(list(), 'model'),
    AdminResponseError,
  );
  for (const change of [
    { status: 'unknown' },
    { algorithms: null },
    { settings: [] },
    { counts: {} },
    { builtAt: 'invalid' },
    { rebuildIntervalMs: 0 },
  ]) {
    assert.throws(
      () =>
        validateAdminResponse(
          { ...data, model: { ...data.model, ...change } },
          'model',
        ),
      AdminResponseError,
    );
  }
});
