const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Memory-only contract checks. Serialization here is a mock, not proof of MySQL locks.
function fixture(initial, conflict = false) {
  let users = initial.map((user) => ({ ...user }));
  let queue = Promise.resolve();
  let writes = 0;
  const prisma = {
    $transaction(callback, options) {
      assert.equal(options.isolationLevel, 'ReadCommitted');
      const run = queue.then(async () => {
        if (conflict) throw Object.assign(new Error('fixture conflict'), { code: 'P2034' });
        let locked = false;
        const tx = {
          admin_audit_logs: { async create({ data }) {
            assert.equal(data.target_type, 'user');
            assert.ok(!('password' in data));
          } },
          async $queryRaw(sql, ...ids) {
            assert.match(sql.join('?'), /ORDER BY id FOR UPDATE/);
            assert.deepEqual(ids, [Number(ids[0]), Number(ids[1])]);
            locked = true;
            return users.filter((user) => user.role === 'admin' || ids.includes(user.id)).map((user) => ({ ...user }));
          },
          users: {
            async update({ where, data }) {
              assert.ok(locked);
              writes++;
              const user = users.find((entry) => entry.id === where.id);
              Object.assign(user, data);
              return user;
            },
            async delete({ where }) {
              assert.ok(locked);
              writes++;
              users = users.filter((user) => user.id !== where.id);
            },
          },
          recipes: {
            async count() { return 0; }, // fixture không có công thức -> delete user vẫn được phép
          },
        };
        return callback(tx);
      });
      queue = run.catch(() => {});
      return run;
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../repositories/adminRepository.js'), 'utf8'), {
    module,
    require(id) {
      if (id === '../config/prisma') return prisma;
      if (id === '../utils/userSelect') return { SAFE_USER_SELECT: {} };
      throw new Error(`Unexpected dependency ${id}`);
    },
  });
  return { repo: module.exports, users: () => users, writes: () => writes };
}
const admin = (id, is_banned = false) => ({ id, role: 'admin', is_banned });
const actions = {
  ban: (repo, id, actor) => repo.banUser(id, true, actor),
  demote: (repo, id, actor) => repo.updateUserByAdmin(id, undefined, undefined, 'user', actor),
  delete: (repo, id, actor) => repo.deleteUser(id, actor),
};

for (const [name, action] of Object.entries(actions)) {
  test(`${name}: last active admin protected, including banned second admin; safe self-action allowed with another active admin`, async () => {
    for (const users of [[admin(1)], [admin(1), admin(2, true)]]) {
      const f = fixture(users);
      await assert.rejects(action(f.repo, 1, 1), (error) => error.status === 400);
      assert.equal(f.writes(), 0);
    }
    const f = fixture([admin(1), admin(2)]);
    await action(f.repo, 1, 1);
    assert.equal(f.users().filter((user) => user.role === 'admin' && !user.is_banned).length, 1);
  });
}

test('competing mutations recheck current state inside mocked serialized transaction', async () => {
  for (const first of Object.values(actions)) {
    for (const second of Object.values(actions)) {
      const f = fixture([admin(1), admin(2)]);
      const results = await Promise.allSettled([first(f.repo, 1, 1), second(f.repo, 2, 2)]);
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal(f.users().filter((user) => user.role === 'admin' && !user.is_banned).length, 1);
    }
  }
});

test('invalid role/boolean, revoked actor, missing target and transaction conflict fail without writes', async () => {
  const f = fixture([admin(1), admin(2, true), { id: 3, role: 'user', is_banned: false }]);
  for (const role of ['owner', '', null, undefined]) {
    await assert.rejects(f.repo.updateUserByAdmin(1, '', '', role, 1), (error) => error.status === 400);
  }
  for (const value of ['false', 0, null, undefined]) {
    await assert.rejects(f.repo.banUser(1, value, 1), (error) => error.status === 400);
  }
  for (const actor of [2, 3, undefined]) {
    await assert.rejects(f.repo.deleteUser(1, actor), (error) => error.status === 403);
  }
  await assert.rejects(f.repo.deleteUser(999, 1), (error) => error.status === 404);
  await assert.rejects(f.repo.deleteUser('1junk', 1), (error) => error.status === 400);
  assert.equal(f.writes(), 0);
  const conflict = fixture([admin(1), admin(2)], true);
  await assert.rejects(conflict.repo.deleteUser(1, 2), (error) => error.status === 409);
  assert.equal(conflict.writes(), 0);
});

test('unban/promote and ordinary user edits remain available', async () => {
  const f = fixture([admin(1), admin(2, true), { id: 3, role: 'user', is_banned: null }]);
  await f.repo.banUser(2, false, 1);
  await f.repo.updateUserByAdmin(3, 'fixture', undefined, 'admin', 1);
  await f.repo.updateUserByAdmin(1, 'fixture', undefined, 'user', 1);
  await f.repo.deleteUser(1, 2);
  assert.equal(f.users().filter((user) => user.role === 'admin' && !user.is_banned).length, 2);
});
