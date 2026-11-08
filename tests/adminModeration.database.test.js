const test = require('node:test');
const assert = require('node:assert/strict');
const { testDatabaseConfig } = require('./helpers/testDatabase.cjs');

test(
  'admin moderation on isolated MySQL and real React browser',
  { skip: process.env.RUN_DATABASE_TESTS !== 'yes', timeout: 120000 },
  async (t) => {
    const config = testDatabaseConfig(process.env);
    assert.equal(config.prisma.database, config.sessions.database);
    process.env.DATABASE_URL = config.prisma.url;
    Object.assign(process.env, {
      DB_HOST: config.sessions.host,
      DB_PORT: config.sessions.port,
      DB_NAME: config.sessions.database,
      DB_USER: config.sessions.user,
      DB_PASSWORD: config.sessions.password,
      NODE_ENV: 'test',
      SESSION_SECRET: 'admin-integration-only-fixture-secret',
      APP_ORIGIN: '',
      TRUST_PROXY: '',
      EMAIL_USER: '',
      EMAIL_APP_PASSWORD: '',
      GEMINI_API_KEY: '',
    });
    const prisma = require('../config/prisma');
    let app,
      server,
      browser,
      probe,
      verifiedEmpty = false,
      triggerCreated = false;
    const fixtures = [];
    try {
      const [actual] = await prisma.$queryRaw`SELECT DATABASE() name`;
      assert.equal(actual.name, config.prisma.database);
      for (const model of [
        'users',
        'recipes',
        'categories',
        'content_reports',
        'admin_audit_logs',
        'sessions',
      ])
        assert.equal(
          await prisma[model].count(),
          0,
          'Requires an empty test database',
        );
      verifiedEmpty = true;
      probe = await require('mysql2/promise').createConnection(
        config.prisma.url,
      );
      const password = 'Admin-Fixture!123';
      const hash = await require('bcrypt').hash(password, 4);
      for (let i = 0; i < 4; i++)
        fixtures.push(
          await prisma.users.create({
            data: {
              username: `moderation_${i}`,
              email: `moderation_${i}@example.invalid`,
              password: hash,
              role: i < 2 ? 'admin' : 'user',
            },
          }),
        );
      const category = await prisma.categories.create({
        data: { name: 'Moderation fixture' },
      });
      const recipes = [];
      for (let i = 0; i < 14; i++)
        recipes.push(
          await prisma.recipes.create({
            data: {
              user_id: fixtures[2].id,
              category_id: category.id,
              title: `QA món ${i}`,
              prep_time: 5,
              cook_time: 10,
              servings: 1,
            },
          }),
        );
      const comments = [];
      for (let i = 0; i < 2; i++)
        comments.push(
          await prisma.comments.create({
            data: {
              user_id: fixtures[2].id,
              recipe_id: recipes[1].id,
              content: `QA bình luận ${i}`,
            },
          }),
        );
      app = require('../app');
      server = require('node:http').createServer(app);
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const base = `http://127.0.0.1:${server.address().port}`;
      function client() {
        let cookie = '';
        return async (
          path,
          body,
          method = body === undefined ? 'GET' : 'POST',
        ) => {
          const response = await fetch(base + '/api' + path, {
            method,
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          });
          if (response.headers.getSetCookie().length)
            cookie = response.headers
              .getSetCookie()
              .map((value) => value.split(';')[0])
              .join('; ');
          return { status: response.status, data: await response.json() };
        };
      }
      const [admin, second, member, quota, guest] = Array.from(
        { length: 5 },
        client,
      );
      for (const [request, user] of [
        [admin, fixtures[0]],
        [second, fixtures[1]],
        [member, fixtures[2]],
        [quota, fixtures[3]],
      ])
        assert.equal(
          (await request('/login', { username: user.username, password }))
            .status,
          200,
        );
      let reportId;
      const report = (request, type, id) =>
        request('/reports', {
          target_type: type,
          target_id: id,
          reason: 'Nội dung vi phạm thử nghiệm',
        });

      await t.test(
        'backend denies guests, members on all new admin routes and banned reporters',
        async () => {
          for (const path of [
            '/admin/reports',
            '/admin/audit-logs',
            '/admin/recommender',
          ]) {
            assert.equal((await guest(path)).status, 401);
            assert.equal((await member(path)).status, 403);
          }
          assert.equal((await guest('/reports', {})).status, 401);
          assert.equal(
            (await member('/admin/reports/1', { status: 'Resolved' }, 'PATCH'))
              .status,
            403,
          );
          await prisma.users.update({
            where: { id: fixtures[3].id },
            data: { is_banned: true },
          });
          assert.equal(
            (await report(quota, 'recipe', recipes[0].id)).status,
            403,
          );
          await prisma.users.update({
            where: { id: fixtures[3].id },
            data: { is_banned: false },
          });
          assert.equal(
            (
              await quota('/login', {
                username: fixtures[3].username,
                password,
              })
            ).status,
            200,
          );
        },
      );
      await t.test(
        'invalid input and nonexistent targets do not create reports',
        async () => {
          assert.equal(
            (
              await member('/reports', {
                target_type: 'user',
                target_id: 1,
                reason: 'bad',
              })
            ).status,
            400,
          );
          assert.equal(
            (await report(member, 'recipe', 2147483648)).status,
            400,
          );
          assert.equal(
            (await report(member, 'recipe', 2147483647)).status,
            404,
          );
          assert.equal(await prisma.content_reports.count(), 0);
        },
      );
      await t.test(
        'concurrent duplicate submissions create exactly one report',
        async () => {
          const responses = await Promise.all([
            report(member, 'recipe', recipes[0].id),
            report(member, 'recipe', recipes[0].id),
          ]);
          assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
          reportId = responses.find((r) => r.status === 201).data.report.id;
          assert.equal(await prisma.content_reports.count(), 1);
        },
      );
      await t.test(
        'persistent per-account quota stops the eleventh distinct report',
        async () => {
          for (let i = 0; i < 10; i++)
            assert.equal(
              (await report(quota, 'recipe', recipes[i].id)).status,
              201,
            );
          assert.equal(
            (await report(quota, 'recipe', recipes[10].id)).status,
            429,
          );
          assert.equal(
            await prisma.content_reports.count({
              where: { reporter_id: fixtures[3].id },
            }),
            10,
          );
        },
      );
      await t.test(
        'server filtering/pagination and validation return matching totals',
        async () => {
          const result = await admin(
            '/admin/reports?status=Pending&type=recipe&limit=2&page=2',
          );
          assert.equal(result.status, 200);
          assert.equal(result.data.total, 11);
          assert.equal(result.data.items.length, 2);
          assert.equal(result.data.page, 2);
          assert.equal(
            (await admin('/admin/reports?status=Unknown')).status,
            400,
          );
          assert.equal(
            (await admin('/admin/reports?search=999999999999999999999')).status,
            200,
          );
        },
      );
      await t.test(
        'concurrent resolution changes status and records one audit event',
        async () => {
          const results = await Promise.all([
            admin(
              `/admin/reports/${reportId}`,
              { status: 'Resolved' },
              'PATCH',
            ),
            second(
              `/admin/reports/${reportId}`,
              { status: 'Rejected' },
              'PATCH',
            ),
          ]);
          assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
          assert.equal(
            await prisma.admin_audit_logs.count({
              where: { target_type: 'report', target_id: reportId },
            }),
            1,
          );
          const row = await prisma.content_reports.findUnique({
            where: { id: reportId },
          });
          assert.ok(row.resolved_at);
          assert.ok(row.resolved_by);
        },
      );
      await t.test(
        'explicit rejection is terminal and duplicate remains blocked',
        async () => {
          const pending = await prisma.content_reports.findFirst({
            where: { reporter_id: fixtures[3].id, status: 'Pending' },
          });
          assert.equal(
            (
              await admin(
                `/admin/reports/${pending.id}`,
                { status: 'Rejected' },
                'PATCH',
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await prisma.content_reports.findUnique({
                where: { id: pending.id },
              })
            ).status,
            'Rejected',
          );
          assert.equal(
            (
              await admin(
                `/admin/reports/${pending.id}`,
                { status: 'Resolved' },
                'PATCH',
              )
            ).status,
            409,
          );
          assert.equal(
            (await report(quota, 'recipe', pending.target_id)).status,
            409,
          );
        },
      );
      await t.test(
        'audit failure rolls back a real user mutation',
        async () => {
          await probe.query(
            "CREATE TRIGGER qa_audit_fail BEFORE INSERT ON admin_audit_logs FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'QA audit fault'",
          );
          triggerCreated = true;
          const before = await prisma.admin_audit_logs.count();
          assert.equal(
            (
              await admin(`/admin/users/ban/${fixtures[2].id}`, {
                is_banned: true,
              })
            ).status,
            500,
          );
          assert.equal(
            (await prisma.users.findUnique({ where: { id: fixtures[2].id } }))
              .is_banned,
            false,
          );
          assert.equal(await prisma.admin_audit_logs.count(), before);
          const pending = await prisma.content_reports.findFirst({
            where: { status: 'Pending' },
          });
          assert.equal(
            (
              await admin(
                `/admin/reports/${pending.id}`,
                { status: 'Resolved' },
                'PATCH',
              )
            ).status,
            500,
          );
          assert.equal(
            (
              await prisma.content_reports.findUnique({
                where: { id: pending.id },
              })
            ).status,
            'Pending',
          );
          assert.equal(await prisma.admin_audit_logs.count(), before);
          await probe.query('DROP TRIGGER qa_audit_fail');
          triggerCreated = false;
        },
      );
      await t.test(
        'ban/unban and role edits produce minimal audit records',
        async () => {
          for (const banned of [true, false])
            assert.equal(
              (
                await admin(`/admin/users/ban/${fixtures[2].id}`, {
                  is_banned: banned,
                })
              ).status,
              200,
            );
          assert.equal(
            (
              await admin(`/admin/users/edit/${fixtures[3].id}`, {
                fullname: 'Fixture',
                email: fixtures[3].email,
                role: 'admin',
              })
            ).status,
            200,
          );
          const rows = await prisma.admin_audit_logs.findMany();
          assert.ok(rows.some((row) => row.action === 'user.ban'));
          assert.ok(rows.some((row) => row.action === 'user.unban'));
          assert.ok(rows.some((row) => row.action === 'user.role'));
          for (const row of rows)
            assert.deepEqual(Object.keys(row).sort(), [
              'action',
              'admin_id',
              'created_at',
              'id',
              'target_id',
              'target_type',
            ]);
          assert.equal(
            (
              await member('/login', {
                username: fixtures[2].username,
                password,
              })
            ).status,
            200,
          );
        },
      );
      await t.test(
        'foreign keys retain reports and logs after content deletion',
        async () => {
          const response = await report(member, 'comment', comments[0].id);
          assert.equal(response.status, 201);
          assert.equal(
            (
              await admin(
                `/admin/comments/${comments[0].id}`,
                undefined,
                'DELETE',
              )
            ).status,
            200,
          );
          const row = await prisma.content_reports.findUnique({
            where: { id: response.data.report.id },
          });
          assert.equal(row.comment_id, null);
          assert.equal(row.target_id, comments[0].id);
          assert.equal(
            (await admin(`/recipes/${recipes[0].id}`, undefined, 'DELETE'))
              .status,
            200,
          );
          assert.equal(
            (
              await prisma.content_reports.findUnique({
                where: { id: reportId },
              })
            ).recipe_id,
            null,
          );
          assert.equal(
            await prisma.admin_audit_logs.count({
              where: { action: 'recipe.delete', target_id: recipes[0].id },
            }),
            1,
          );
          await assert.rejects(
            prisma.content_reports.create({
              data: {
                reporter_id: fixtures[2].id,
                target_type: 'comment',
                target_id: 999999,
                comment_id: 999999,
                reason: 'Fixture',
              },
            }),
          );
          await assert.rejects(
            prisma.content_reports.create({
              data: {
                reporter_id: fixtures[2].id,
                target_type: 'recipe',
                target_id: recipes[13].id,
                recipe_id: recipes[13].id,
                reason: ' ',
              },
            }),
          );
        },
      );
      await t.test(
        'audit query filters actions; recommender inspection never builds a model',
        async () => {
          const result = await admin(
            '/admin/audit-logs?action=user.ban&limit=1',
          );
          assert.equal(result.status, 200);
          assert.equal(result.data.total, 1);
          assert.equal(result.data.items[0].action, 'user.ban');
          assert.equal(
            (await admin('/admin/audit-logs?search=999999999999999999999'))
              .status,
            200,
          );
          const status = await admin('/admin/recommender');
          assert.equal(status.status, 200);
          assert.equal(status.data.model.status, 'not_built');
          assert.equal(status.data.model.counts, null);
          assert.deepEqual(status.data.model.algorithms, [
            'Popularity',
            'CBF',
            'Item-CF',
            'Hybrid',
          ]);
          assert.equal(
            require('../services/recommender').getStatus().status,
            'not_built',
          );
        },
      );
      await t.test(
        'real browser reports recipe/comment, admin filters/resolves and sees audit log',
        { skip: process.env.RUN_BROWSER_DATABASE_TESTS !== 'yes' },
        async () => {
          const { chromium, expect } = require('@playwright/test');
          browser = await chromium.launch({ headless: true });
          const context = await browser.newContext({ baseURL: base });
          const adminContext = await browser.newContext({ baseURL: base });
          for (const ctx of [context, adminContext])
            await ctx.route('**/*', (route) => {
              const url = new URL(route.request().url());
              return url.origin === base ||
                [
                  'fonts.googleapis.com',
                  'fonts.gstatic.com',
                  'cdnjs.cloudflare.com',
                ].includes(url.hostname)
                ? route.continue()
                : route.abort();
            });
          const page = await context.newPage(),
            adminPage = await adminContext.newPage();
          const errors = [];
          for (const p of [page, adminPage]) {
            p.on('pageerror', (error) => errors.push(error.message));
            p.setDefaultTimeout(12000);
          }
          for (const [ctx, user] of [
            [context, fixtures[2]],
            [adminContext, fixtures[0]],
          ])
            assert.equal(
              (
                await ctx.request.post('/api/login', {
                  data: { username: user.username, password },
                })
              ).status(),
              200,
            );
          await page.goto('/recipes/' + recipes[1].id);
          for (const [type, id] of [
            ['công thức', recipes[1].id],
            ['bình luận', comments[1].id],
          ]) {
            await page
              .getByRole('button', {
                name: `Báo cáo ${type} #${id}`,
                exact: true,
              })
              .click();
            await page
              .getByLabel('Lý do báo cáo')
              .fill('Báo cáo giao diện thật');
            const response = page.waitForResponse(
              (r) =>
                r.url().endsWith('/api/reports') &&
                r.request().method() === 'POST',
            );
            await page
              .getByRole('button', { name: 'Gửi báo cáo', exact: true })
              .click();
            assert.equal((await response).status(), 201);
            await expect(page.getByRole('dialog')).toHaveCount(0);
          }
          const browserReport = await prisma.content_reports.findFirst({
            where: {
              reporter_id: fixtures[2].id,
              target_type: 'recipe',
              target_id: recipes[1].id,
            },
          });
          assert.ok(browserReport);
          await adminPage.goto('/admin/reports');
          await adminPage
            .getByLabel('Tìm báo cáo')
            .fill(String(browserReport.id));
          const row = adminPage
            .getByRole('row')
            .filter({
              has: adminPage.getByRole('cell', {
                name: '#' + browserReport.id,
                exact: true,
              }),
            });
          await expect(row).toHaveCount(1);
          await row
            .getByRole('button', { name: 'Đã xử lý', exact: true })
            .click();
          const response = adminPage.waitForResponse(
            (r) =>
              r.url().endsWith('/api/admin/reports/' + browserReport.id) &&
              r.request().method() === 'PATCH',
          );
          await adminPage
            .getByRole('dialog')
            .getByRole('button', { name: 'Xác nhận', exact: true })
            .click();
          assert.equal((await response).status(), 200);
          assert.equal(
            (
              await prisma.content_reports.findUnique({
                where: { id: browserReport.id },
              })
            ).status,
            'Resolved',
          );
          await adminPage.getByLabel('Trạng thái báo cáo').selectOption('');
          await expect(row).toHaveCount(1);
          await adminPage.reload();
          await expect(row).toHaveCount(1);
          await adminPage.goto('/admin/audit-logs?action=report.resolve');
          await expect(adminPage.getByRole('table')).toBeVisible();
          assert.ok(
            await adminPage
              .getByRole('cell', { name: 'Xử lý báo cáo', exact: true })
              .count(),
          );
          for (const path of ['reports', 'audit-logs', 'recommender'])
            for (const width of [390, 768, 1440]) {
              await adminPage.setViewportSize({ width, height: 900 });
              await adminPage.goto('/admin/' + path);
              await expect(adminPage.locator('.admin-shell h1')).toBeVisible();
              await expect(
                adminPage.locator('.admin-shell [aria-busy="true"]'),
              ).toHaveCount(0);
              await expect(
                adminPage.locator('.admin-shell .steam-skeleton'),
              ).toHaveCount(0);
              assert.ok(
                await adminPage
                  .locator('.admin-content')
                  .evaluate(
                    (el) => el.getBoundingClientRect().right <= innerWidth + 1,
                  ),
              );
              await adminPage.screenshot({
                path: `.local/admin-improvements/${path}-${width}.png`,
                fullPage: true,
              });
            }
          assert.deepEqual(errors, []);
          await context.close();
          await adminContext.close();
        },
      );
    } finally {
      if (browser) await browser.close();
      if (server) {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
      }
      if (verifiedEmpty) {
        if (triggerCreated) await probe.query('DROP TRIGGER qa_audit_fail');
        for (const model of [
          'content_reports',
          'admin_audit_logs',
          'recipes',
          'users',
          'categories',
          'sessions',
        ])
          await prisma[model].deleteMany();
        for (const model of [
          'content_reports',
          'admin_audit_logs',
          'recipes',
          'users',
          'categories',
          'sessions',
        ])
          assert.equal(
            await prisma[model].count(),
            0,
            'Test cleanup must restore empty baseline',
          );
      }
      if (probe) await probe.end();
      if (app) await app.locals.closeResources();
      else await prisma.$disconnect();
    }
  },
);
