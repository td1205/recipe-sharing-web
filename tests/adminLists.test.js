const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {
  adminListQuery,
  escapeLike,
  listOrder,
} = require('../utils/adminListQuery');

test('admin query trims/NFC normalizes input, rejects invalid paging and sort, and escapes LIKE literals', () => {
  assert.equal(adminListQuery({ search: '  Bếp  ' }, ['newest']).search, 'Bếp');
  assert.equal(adminListQuery({ search: '   ' }, ['newest']).search, '');
  for (const query of [
    { sort: '__proto__' },
    { sort: 'id;DROP TABLE users' },
    { limit: 101 },
    { page: '2x' },
    { search: [] },
  ]) {
    assert.throws(
      () => adminListQuery(query, ['newest']),
      (error) => error.status === 400,
    );
  }
  assert.equal(escapeLike('a_%\\'), 'a\\_\\%\\\\');
  assert.deepEqual(listOrder('oldest'), [{ created_at: 'asc' }, { id: 'asc' }]);
  assert.deepEqual(listOrder('id_desc'), [{ id: 'desc' }]);
});

test('admin repository filters/orders/paginates inside one snapshot and selects no credentials', async () => {
  const calls = [];
  const models = Object.fromEntries(
    ['users', 'comments', 'categories'].map((kind) => [
      kind,
      {
        count: async (options) => {
          calls.push({ kind, operation: 'count', ...options });
          return 45;
        },
        findMany: async (options) => {
          calls.push({ kind, operation: 'find', ...options });
          return [];
        },
      },
    ]),
  );
  const module = { exports: {} };
  vm.runInNewContext(
    fs.readFileSync(
      require.resolve('../repositories/adminListingRepository'),
      'utf8',
    ),
    {
      module,
      require(id) {
        if (id === '../config/prisma')
          return {
            $transaction: (callback, options) => {
              assert.equal(options.isolationLevel, 'RepeatableRead');
              return callback(models);
            },
          };
        if (id === '../utils/apiValidation')
          return require('../utils/apiValidation');
        if (id === '../utils/userSelect') return require('../utils/userSelect');
        if (id === '../utils/adminListQuery')
          return require('../utils/adminListQuery');
        throw new Error('Unexpected dependency');
      },
    },
  );
  const result = await module.exports.getPage('users', {
    page: '2',
    limit: '20',
    sort: 'mostRecipes',
    role: 'user',
    status: 'active',
    search: ' % ',
  });
  assert.equal(result.total, 45);
  assert.equal(result.page, 2);
  const query = calls.at(-1);
  assert.equal(query.skip, 20);
  assert.equal(query.take, 20);
  assert.equal(query.orderBy[0].recipes._count, 'desc');
  assert.equal(query.orderBy[1].id, 'asc');
  assert.equal(query.where.AND[1].OR[0].username.contains, '\\%');
  assert.equal(query.select.password, undefined);
  assert.equal(query.select.otp, undefined);
  await module.exports.getPage('comments', { sort: 'oldest', page: 100 });
  assert.equal(calls.at(-1).skip, 40);
  assert.equal(calls.at(-1).orderBy[0].created_at.nulls, 'last');
  await module.exports.getPage('categories', { sort: 'count_asc' });
  assert.equal(calls.at(-1).orderBy[0].recipes._count, 'asc');
  await assert.rejects(
    module.exports.getPage('users', { role: 'root' }),
    (error) => error.status === 400,
  );
});
