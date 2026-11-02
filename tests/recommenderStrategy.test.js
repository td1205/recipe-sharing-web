const test = require('node:test');
const assert = require('node:assert/strict');
const { chooseStrategy, SETTINGS } = require('../services/recommender/hybrid');

// userItems: Map<recipeId, điểm tương tác>; chỉ tính món có điểm > 0
const items = (...scores) => new Map(scores.map((score, i) => [i + 1, score]));

test('hybrid switching chọn thuật toán theo số món đã tương tác', () => {
  assert.equal(chooseStrategy(new Map()), 'popular', '0 tương tác -> phổ biến');
  assert.equal(chooseStrategy(items(0, -1)), 'popular', 'điểm <= 0 không tính');
  assert.equal(chooseStrategy(items(1)), 'content', '1 tương tác -> content-based');
  assert.equal(chooseStrategy(items(1, 2)), 'content', '2 tương tác -> content-based');
  assert.equal(chooseStrategy(items(1, 2, 3)), 'hybrid', '>= 3 tương tác -> hybrid');
});

test('trọng số hybrid đúng như báo cáo (0,3 content + 0,7 CF)', () => {
  assert.equal(SETTINGS.minItemsForCF, 3);
  assert.equal(SETTINGS.contentWeight, 0.3);
  assert.equal(SETTINGS.cfWeight, 0.7);
  assert.equal(SETTINGS.maxPerCategory, 4);
});
