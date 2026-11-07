const test = require('node:test');
const assert = require('node:assert/strict');
const { buildUserItemScores, likedRecipeIds } = require('../services/recommender/interactions');
const { CFModel } = require('../services/recommender/cfModel');
const { buildModels, recommendForUser } = require('../services/recommender/hybrid');

const interaction = (type, stars) => ({ userId: 1, recipeId: 1, type, stars });

test('low rating overrides positive actions regardless of order, but a changed rating restores interest', () => {
  const actions = [interaction('favorite'), interaction('view'), interaction('comment'), interaction('rating', 1)];
  for (const list of [actions, [...actions].reverse()]) {
    assert.equal(buildUserItemScores(list).get(1).get(1), -2);
    assert.equal(likedRecipeIds(list).has(1), false);
  }
  const updated = actions.map((item) => item.type === 'rating' ? { ...item, stars: 5 } : item);
  assert.equal(buildUserItemScores(updated).get(1).get(1), 7.25);
  assert.equal(likedRecipeIds(updated).has(1), true);
});

test('repeated comments and views cannot inflate a user-item score', () => {
  const actions = Array.from({ length: 100 }, () => [interaction('view'), interaction('comment')]).flat();
  assert.equal(buildUserItemScores(actions).get(1).get(1), 1.25);
  assert.equal(buildUserItemScores([interaction('comment')]).get(1).get(1), 0.25);
});

test('CF shrinkage downweights sparse support while preserving symmetry and caching', () => {
  const history = new Map([
    [1, new Map([[1, 3], [2, 3]])],
    [2, new Map([[3, 3], [4, 3]])],
    [3, new Map([[3, 3], [4, 3]])],
    [4, new Map([[3, 3], [4, 3]])],
  ]);
  const model = new CFModel(history, { shrinkage: 5 });
  assert.ok(Math.abs(model.similarTo(1).get(2) - 1 / 6) < 1e-12);
  assert.ok(Math.abs(model.similarTo(3).get(4) - 3 / 8) < 1e-12);
  assert.ok(model.similarTo(3).get(4) > model.similarTo(1).get(2));
  assert.equal(model.similarTo(1).get(2), model.similarTo(2).get(1));
  assert.equal(model.similarTo(1), model.similarTo(1));
  assert.equal(new CFModel(history, { shrinkage: 0 }).similarTo(1).get(2), 1);
  assert.throws(() => new CFModel(history, { shrinkage: -1 }), RangeError);
});

const recipes = [
  { id: 1, title: 'A', categoryId: 1, ingredients: ['bò', 'nấm'] },
  { id: 2, title: 'B', categoryId: 1, ingredients: ['bò', 'nấm'] },
  { id: 3, title: 'C', categoryId: 1, ingredients: ['bò', 'nấm'] },
  { id: 4, title: 'D', categoryId: 2, ingredients: ['cá'] },
];

test('disliked recipes never reappear, including popularity fallback', () => {
  const models = buildModels({ recipes, interactions: [] });
  const history = new Map([[1, -2]]);
  for (const strategy of ['auto', 'popular', 'content', 'cf', 'hybrid']) {
    const results = recommendForUser(models, history, { strategy, limit: 10 });
    assert.ok(results.length > 0);
    assert.ok(results.every((item) => item.recipeId !== 1));
  }
});

test('similarity to negative history reduces scores without banning related recipes', () => {
  const models = buildModels({ recipes, interactions: [] });
  const positive = recommendForUser(models, new Map([[1, 3]]), { strategy: 'content', limit: 3 });
  const mixed = recommendForUser(models, new Map([[1, 3], [2, -2]]), { strategy: 'content', limit: 3 });
  const before = positive.find((item) => item.recipeId === 3);
  const after = mixed.find((item) => item.recipeId === 3);
  assert.ok(after.score > 0 && after.score < before.score);
  assert.ok(mixed.every((item) => item.recipeId !== 2));
});
