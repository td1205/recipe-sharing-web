const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const validation = require('../utils/apiValidation');
const sorting = import('../frontend/src/utils/adminSorting.js');

test('admin numeric sorting handles 2/10/100, ties and does not mutate source', async () => {
  const { sortAdminRows, userSortOptions, categorySortOptions } = await sorting;
  const rows = [
    { id: 100, _count: { recipes: 10 } },
    { id: 10, _count: { recipes: 2 } },
    { id: 2, _count: { recipes: 2 } },
  ];
  const ids = (sort, options = userSortOptions) =>
    sortAdminRows(rows, sort, options).map((row) => row.id);
  assert.deepEqual(ids('id_asc'), [2, 10, 100]);
  assert.deepEqual(ids('id_desc'), [100, 10, 2]);
  assert.deepEqual(ids('leastRecipes'), [2, 10, 100]);
  assert.deepEqual(ids('mostRecipes'), [100, 2, 10]);
  assert.deepEqual(ids('count', categorySortOptions), [100, 2, 10]);
  assert.deepEqual(
    rows.map((row) => row.id),
    [100, 10, 2],
  );
});

test('Vietnamese/natural text sorting, reverse order and missing dates are predictable', async () => {
  const { sortAdminRows, userSortOptions, commentSortOptions } = await sorting;
  const users = [
    { id: 1, username: 'Bếp 10' },
    { id: 2, username: 'Bếp 2' },
    { id: 3, username: 'An' },
  ];
  assert.deepEqual(
    sortAdminRows(users, 'name', userSortOptions).map((row) => row.id),
    [3, 2, 1],
  );
  assert.deepEqual(
    sortAdminRows(users, 'name_desc', userSortOptions).map((row) => row.id),
    [1, 2, 3],
  );
  const comments = [
    { id: 1, created_at: null },
    { id: 2, created_at: 'invalid' },
    { id: 3, created_at: '2026-01-01' },
    { id: 4, created_at: '2025-01-01' },
  ];
  assert.deepEqual(
    sortAdminRows(comments, 'newest', commentSortOptions).map((row) => row.id),
    [3, 4, 1, 2],
  );
  assert.deepEqual(
    sortAdminRows(comments, 'oldest', commentSortOptions).map((row) => row.id),
    [4, 3, 1, 2],
  );
});

test('admin recipe sorting is whitelisted and placed before SQL pagination', async () => {
  const module = { exports: {} };
  const queries = [];
  const dependencies = {
    '@prisma/client': require('@prisma/client'),
    '../utils/userSelect': { PUBLIC_USER_SELECT: {} },
    '../utils/apiValidation': validation,
    '../config/prisma': {
      $transaction: (callback) =>
        callback({
          $queryRaw: async (sql) => {
            queries.push(sql);
            return queries.length % 2 ? [{ total: 100n }] : [];
          },
        }),
    },
  };
  vm.runInNewContext(
    fs.readFileSync(
      path.join(__dirname, '../repositories/recipeListingRepository.js'),
      'utf8',
    ),
    {
      module,
      require: (id) => {
        if (!(id in dependencies)) throw new Error('Unexpected dependency');
        return dependencies[id];
      },
    },
  );
  const expected = {
    id_asc: /r\.id ASC/,
    id_desc: /r\.id DESC/,
    title_desc: /r\.title DESC/,
    rating_asc: /avg_rating,0\) ASC/,
    ratings_asc: /total_ratings,0\) ASC/,
    views_asc: /view_count,0\) ASC/,
    views_desc: /view_count,0\) DESC/,
  };
  for (const [sort, pattern] of Object.entries(expected)) {
    assert.throws(
      () => validation.listingQuery({ sort }),
      (error) => error.status === 400,
    );
    const result = await module.exports.getPage({
      view: 'admin',
      sort,
      page: 2,
      limit: 20,
    });
    const query = queries.at(-1);
    assert.match(query.sql, /ORDER BY[\s\S]+LIMIT \? OFFSET \?/);
    assert.match(query.sql.split('ORDER BY')[1], pattern);
    assert.deepEqual(query.values.slice(-2), [20, 20]);
    assert.equal(result.total, 100);
  }
  assert.throws(() =>
    validation.listingQuery({ view: 'admin', sort: 'id; DROP TABLE users' }),
  );
});
