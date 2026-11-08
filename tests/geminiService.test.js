const test = require('node:test');
const assert = require('node:assert/strict');
const gemini = require('../services/geminiService');

const image = Buffer.from('fake-image');

// Client giả: mỗi model trả về kết quả/lỗi theo bảng cho trước
function fakeClient(byModel) {
  const calls = [];
  return {
    calls,
    models: {
      async generateContent({ model }) {
        calls.push(model);
        const outcome = byModel[model];
        if (outcome instanceof Error) throw outcome;
        return { text: outcome };
      },
    },
  };
}
const httpError = (status, message = 'error') => Object.assign(new Error(message), { status });

test('thiếu GEMINI_API_KEY -> lỗi NOT_CONFIGURED, không trả kết quả giả', async () => {
  const saved = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    assert.equal(gemini.isConfigured(), false);
    await assert.rejects(gemini.recognizeDish(image, 'image/jpeg'), { code: 'NOT_CONFIGURED' });
  } finally {
    if (saved !== undefined) process.env.GEMINI_API_KEY = saved;
  }
});

test('trả về từ khoá đã làm sạch', async () => {
  const [first] = gemini.getModels();
  const client = fakeClient({ [first]: '**Phở bò.**\n' });
  const result = await gemini.recognizeDish(image, 'image/jpeg', { client });
  assert.equal(result.keyword, 'Phở bò');
});

test('model không tồn tại (404) -> thử model kế tiếp', async () => {
  const [first, second] = gemini.getModels();
  const client = fakeClient({ [first]: httpError(404), [second]: 'Cơm tấm' });
  const result = await gemini.recognizeDish(image, 'image/jpeg', { client });
  assert.equal(result.keyword, 'Cơm tấm');
  assert.deepEqual(client.calls, [first, second]);
});

test('ảnh không phải món ăn -> NOT_FOOD', async () => {
  const [first] = gemini.getModels();
  const client = fakeClient({ [first]: 'KHONG_PHAI_MON_AN' });
  await assert.rejects(gemini.recognizeDish(image, 'image/jpeg', { client }), { code: 'NOT_FOOD' });
});

test('key sai (403) -> INVALID_KEY, dừng ngay', async () => {
  const [first] = gemini.getModels();
  const client = fakeClient({ [first]: httpError(403) });
  await assert.rejects(gemini.recognizeDish(image, 'image/jpeg', { client }), { code: 'INVALID_KEY' });
  assert.equal(client.calls.length, 1);
});

test('quota riêng theo model (429) -> dùng model dự phòng khác', async () => {
  const [first, second] = gemini.getModels();
  const quotaError = Object.assign(httpError(429, 'quota exhausted'), {
    details: [{ quotaDimensions: { model: first }, retryDelay: '120s' }],
  });
  const client = fakeClient({ [first]: quotaError, [second]: 'Bún chả' });
  const result = await gemini.recognizeDish(image, 'image/jpeg', { client });
  assert.equal(result.keyword, 'Bún chả');
  assert.deepEqual(client.calls, [first, second]);
});

test('quota toàn dự án (429) -> trả thời điểm thử lại, không gọi fallback vô ích', async () => {
  const [first] = gemini.getModels();
  const quotaError = Object.assign(httpError(429, 'quota exhausted'), {
    details: [{ retryDelay: '3600s' }],
  });
  const client = fakeClient({ [first]: quotaError });
  await assert.rejects(
    gemini.recognizeDish(image, 'image/jpeg', { client }),
    (error) => error.code === 'QUOTA_EXCEEDED' && error.retryAfterSeconds === 3600,
  );
  assert.deepEqual(client.calls, [first]);
});

test('tất cả quota theo model (429) -> vẫn trả thời điểm thử lại', async () => {
  const models = gemini.getModels();
  const client = fakeClient(Object.fromEntries(models.map((model) => [model,
    Object.assign(httpError(429, 'quota exhausted'), {
      details: [{ quotaDimensions: { model }, retryDelay: '90s' }],
    }),
  ])));
  await assert.rejects(
    gemini.recognizeDish(image, 'image/jpeg', { client }),
    (error) => error.code === 'QUOTA_EXCEEDED' && error.retryAfterSeconds === 90,
  );
  assert.deepEqual(client.calls, models);
});

test('GEMINI_MODELS ghi đè danh sách model', () => {
  process.env.GEMINI_MODELS = 'model-a, model-b';
  try {
    assert.deepEqual(gemini.getModels(), ['model-a', 'model-b']);
  } finally {
    delete process.env.GEMINI_MODELS;
  }
  assert.deepEqual(gemini.getModels(), gemini.DEFAULT_MODELS);
});
