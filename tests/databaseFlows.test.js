const test = require('node:test');
const assert = require('node:assert/strict');
const { testDatabaseConfig } = require('./helpers/testDatabase.cjs');

// Not in test:safe. No dotenv, ORM, MySQL or app imports before the explicit guard.
test('isolated MySQL HTTP journeys and rollback', { skip: process.env.RUN_DATABASE_TESTS !== 'yes', timeout: 60000 }, async () => {
  const config = testDatabaseConfig(process.env);
  process.env.DATABASE_URL = config.prisma.url;
  Object.assign(process.env, { DB_HOST: config.sessions.host, DB_PORT: config.sessions.port,
    DB_NAME: config.sessions.database, DB_USER: config.sessions.user, DB_PASSWORD: config.sessions.password,
    SESSION_SECRET: 'isolated-integration-fixture-not-production', NODE_ENV: 'test', TRUST_PROXY: '', APP_ORIGIN: '' });
  const prisma = require('../config/prisma');
  const mysql = require('mysql2/promise');
  let probe, app, server, category, fixtures = [];
  let verifiedEmpty=false,originalTagIds=[];
  const jars = [];
  try {
    probe = await mysql.createConnection(config.sessions.url);
    const [actual] = await prisma.$queryRaw`SELECT DATABASE() name`;
    const [[sessionDatabase]] = await probe.query('SELECT DATABASE() name');
    assert.equal(actual.name, config.prisma.database);
    assert.equal(sessionDatabase.name, config.sessions.database);
    assert.equal(await prisma.users.count(), 0, 'Test DB must have no pre-existing users');
    const [[sessionCount]] = await probe.query('SELECT COUNT(*) count FROM sessions');
    assert.equal(Number(sessionCount.count), 0, 'Session test store must be empty');
    verifiedEmpty=true;
    originalTagIds=(await prisma.tags.findMany({select:{id:true}})).map(tag=>tag.id);
    const bcrypt = require('bcrypt');
    const password = 'Fixture-Only!123';
    const hash = await bcrypt.hash(password, 4);
    for (let n = 0; n < 3; n++) fixtures.push(await prisma.users.create({ data: {
      username: `integration_${n}`, email: `integration_${n}@example.invalid`, fullname: 'Integration Fixture',
      password: hash, role: n < 2 ? 'admin' : 'user', is_banned: false,
    } }));
    category = await prisma.categories.create({ data: { name: 'Integration Fixture' } });
    // Real application modules. External integrations remain unconfigured and are
    // outside these journeys; no controller/repository/database mock is installed.
    Object.assign(process.env,{EMAIL_USER:'',EMAIL_APP_PASSWORD:'',GEMINI_API_KEY:''});
    app = require('../app');
    server = require('node:http').createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    function client() {
      const jar = { cookie: '' };
      jars.push(jar);
      jar.request = async (route, body, method = body === undefined ? 'GET' : 'POST') => {
        const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(jar.cookie ? { Cookie: jar.cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
        const cookies = response.headers.getSetCookie();
        if (cookies.length) jar.cookie = cookies.map(value => value.split(';')[0]).join('; ');
        return { status: response.status, data: await response.json() };
      };
      return jar;
    }
    // Client dùng Bearer token (luồng Flutter) — không cookie.
    const bearer = async (route, token, method = 'GET', body) => {
      const response = await fetch(base + route, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, data: await response.json() };
    };
    const admin = client(), second = client(), user = client(), guest = client();
    assert.equal((await guest.request('/admin/users')).status, 401);
    for (const [jar, fixture] of [[admin, fixtures[0]], [second, fixtures[1]], [user, fixtures[2]]]) {
      assert.equal((await jar.request('/login', { username: fixture.username, password })).status, 200);
    }
    assert.equal((await user.request('/admin/users')).status, 403);
    const body = { title: 'Trứng tỏi fixture', description: 'Isolated integration fixture', category_id: String(category.id),
      prep_time: '5', cook_time: '5', servings: '1', ing_name: ['Trứng', 'Tỏi'], ing_amount: ['1', '1'], ing_unit: ['quả', 'tép'], step_instruction: ['Chiên trứng với tỏi'], tags: ['fixture'] };
    const created = await user.request('/recipes/create', body);
    assert.equal(created.status, 201);
    const id = created.data.recipeId;
    assert.equal((await guest.request(`/recipes/edit/${id}`, body)).status, 401);
    assert.equal((await user.request(`/recipes/edit/${id}`, { ...body, title: 'Trứng fixture đã sửa' })).status, 200);
    assert.equal((await user.request(`/recipes/${id}/favorite`, { isFav: true })).data.isFav, true);
    assert.equal((await user.request(`/recipes/${id}/favorite`, { isFav: true })).data.isFav, true);
    for (const stars of [4, 5]) assert.equal((await user.request(`/recipes/${id}/rate`, { star_count: stars })).status, 200);
    assert.equal(await prisma.ratings.count({ where: { recipe_id: id } }), 1);
    assert.equal((await user.request(`/recipes/${id}/comments`, { content: 'Fixture comment' })).status, 200);
    assert.equal((await user.request('/profile')).data.favouriteRecipes.length, 1);
    assert.equal((await guest.request('/recipes?page=1&limit=1&search=fixture')).data.total, 1);

    // ---- Token Bearer (luồng Flutter) trên cùng dữ liệu ----
    const issued = await bearer('/auth/token', null, 'POST', { username: fixtures[2].username, password });
    assert.equal(issued.status, 200);
    const userToken = issued.data.token;
    assert.match(userToken, /^[a-f0-9]{64}$/);
    assert.equal(issued.data.user.id, fixtures[2].id);
    // Sai mật khẩu -> 401, thông báo chống enumeration giống đăng nhập web.
    const badLogin = await bearer('/auth/token', null, 'POST', { username: fixtures[2].username, password: 'Wrong!Pass' });
    assert.equal(badLogin.status, 401);
    assert.equal(badLogin.data.error, 'Tài khoản hoặc mật khẩu không chính xác!');
    // Dùng token: đọc hồ sơ + tài khoản, ghi tương tác (rating upsert cùng user).
    assert.equal((await bearer('/profile', userToken)).status, 200);
    const account = await bearer('/auth/me', userToken);
    assert.equal(account.data.user.id, fixtures[2].id);
    assert.equal(account.data.tokenAuth, true);
    const ratedByToken = await bearer(`/recipes/${id}/rate`, userToken, 'POST', { star_count: 3 });
    assert.equal(ratedByToken.status, 200);
    assert.equal(await prisma.ratings.count({ where: { recipe_id: id } }), 1, 'token rating upserts same user rating');
    // (Các assert bằng token admin được đặt SAU khối invariants admin bên dưới,
    //  vì invariants có thể ban admin tùy kết quả concurrent, làm token phát hành sớm bị thu hồi.)
    // Token sai/thiếu định dạng -> 401.
    assert.equal((await bearer('/profile', null)).status, 401);
    assert.equal((await bearer('/profile', 'z'.repeat(64))).status, 401);
    assert.equal((await bearer('/profile', userToken.replace(/[a-f]/, 'x'))).status, 401);
    // Logout bằng token: thu hồi token trong store, dùng lại -> 401.
    assert.equal((await bearer('/logout', userToken, 'POST', {})).status, 200);
    assert.equal((await bearer('/profile', userToken)).status, 401, 'revoked token rejected after logout');

    await require('../services/recommender').getModels({ forceRebuild: true });
    const pantry = await guest.request('/recommendations/by-ingredients?items=trứng,tỏi');
    assert.equal(pantry.status, 200);
    assert.ok(pantry.data.recipes.some(recipe => recipe.id === id));
    const repo = require('../repositories/recipeRepository');
    const originalTags = repo.setRecipeTags;
    const before = await prisma.recipes.count();
    repo.setRecipeTags = async (recipeId, _tags, tx) => {
      assert.ok(await tx.recipes.findUnique({ where: { id: recipeId } }));
      throw new Error('Injected rollback');
    };
    try { await assert.rejects(repo.createRecipe({ user_id: fixtures[2].id, category_id: category.id, title: 'Rollback fixture' }, [], [], [], ['fixture']), /Injected rollback/); }
    finally { repo.setRecipeTags = originalTags; }
    assert.equal(await prisma.recipes.count(), before);
    assert.equal((await admin.request(`/admin/users/ban/${fixtures[1].id}`, { is_banned: true })).status, 200);
    for (const [route, payload] of [[`ban/${fixtures[0].id}`, { is_banned: true }], [`delete/${fixtures[0].id}`, {}], [`edit/${fixtures[0].id}`, { fullname: 'Fixture', email: fixtures[0].email, role: 'user' }]]) {
      assert.equal((await admin.request(`/admin/users/${route}`, payload)).status, 400);
    }
    assert.equal((await admin.request(`/admin/users/ban/${fixtures[1].id}`, { is_banned: false })).status, 200);
    const simultaneous = await Promise.all([
      admin.request(`/admin/users/ban/${fixtures[0].id}`, { is_banned: true }),
      second.request(`/admin/users/edit/${fixtures[1].id}`, { fullname: 'Fixture', email: fixtures[1].email, role: 'user' }),
    ]);
    assert.equal(simultaneous.filter(result => result.status === 200).length, 1);
    assert.equal(await prisma.users.count({ where: { role: 'admin', is_banned: false } }), 1);
    assert.equal((await user.request(`/recipes/${id}`, undefined, 'DELETE')).status, 200);
    assert.equal((await user.request('/logout', {})).status, 200);
    assert.equal((await user.request('/profile')).status, 401);
    // Ban tài khoản qua admin token -> phiên token của tài khoản bị khóa bị thu hồi ngay.
    // Đảm bảo chắc chắn có một admin đang hoạt động (khối invariants phía trên
    // có thể ban admin tùy concurrent), bằng cách reset trực tiếp trong DB test.
    await prisma.users.update({ where: { id: fixtures[0].id }, data: { role: 'admin', is_banned: false } });
    const freshToken = (await bearer('/auth/token', null, 'POST', { username: fixtures[2].username, password })).data.token;
    assert.equal((await bearer('/auth/me', freshToken)).status, 200);
    const adminIssued = await bearer('/auth/token', null, 'POST', { username: fixtures[0].username, password });
    assert.equal(adminIssued.status, 200);
    const adminToken = adminIssued.data.token;
    assert.equal((await bearer('/admin/users', adminToken)).status, 200);
    assert.equal((await bearer('/admin/users', freshToken)).status, 403);
    assert.equal((await bearer(`/admin/users/ban/${fixtures[2].id}`, adminToken, 'POST', { is_banned: true })).status, 200);
    assert.equal((await bearer('/auth/me', freshToken)).status, 403, 'banned account token rejected (403 + banned flag)');
    const bannedLogin = await bearer('/auth/token', null, 'POST', { username: fixtures[2].username, password });
    assert.equal(bannedLogin.status, 401);
    assert.equal(bannedLogin.data.error, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
    assert.equal((await bearer(`/admin/users/ban/${fixtures[2].id}`, adminToken, 'POST', { is_banned: false })).status, 200);
    // Bỏ khóa: đăng nhập bằng token lại bình thường.
    const reissued = await bearer('/auth/token', null, 'POST', { username: fixtures[2].username, password, remember: true });
    assert.equal(reissued.status, 200);
    assert.equal((await bearer('/auth/me', reissued.data.token)).status, 200);
  } finally {
    if (server) {
      for (const jar of jars) { try { await jar.request('/logout', {}); } catch {} }
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
    // Delete only IDs created above, in the verified test database, never existing data.
    try {
      if(probe&&verifiedEmpty)await probe.query('DELETE FROM sessions');
      if(fixtures.length)await prisma.recipes.deleteMany({where:{user_id:{in:fixtures.map(user=>user.id)}}});
      if (fixtures.length) await prisma.users.deleteMany({ where: { id: { in: fixtures.map(user => user.id) } } });
      if (category) await prisma.categories.delete({ where: { id: category.id } });
      if(verifiedEmpty)await prisma.tags.deleteMany({where:{id:{notIn:originalTagIds},name:'fixture',recipe_tags:{none:{}},user_tag_votes:{none:{}}}});
    } finally {
      if (probe) await probe.end();
      if (app) await app.locals.closeResources(); else await prisma.$disconnect();
    }
  }
});
