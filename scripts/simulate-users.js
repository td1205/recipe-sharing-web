#!/usr/bin/env node
// ============================================================================
// SINH NGƯỜI DÙNG MÔ PHỎNG (lượt xem, yêu thích, đánh giá) ĐỂ HỆ GỢI Ý CÓ DỮ LIỆU
// ============================================================================
// Cách dùng (chạy SAU khi đã nhập món bằng import-vifoodrec.js):
//   node scripts/simulate-users.js                 # 300 người dùng, seed 7
//   node scripts/simulate-users.js --users 150     # số người dùng khác
//   node scripts/simulate-users.js --reset         # XÓA toàn bộ người dùng mô phỏng
//
// - Mỗi người dùng có 1-2 "gu" (ăn chay, hải sản, đồ ngọt...) - xem scripts/lib/simulation.js
// - Tên đăng nhập bắt đầu bằng "sim_", mật khẩu ngẫu nhiên (không đăng nhập được).
// - Cùng seed -> cùng kết quả (để cả nhóm có dữ liệu giống nhau).
// ============================================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const { simulate } = require('./lib/simulation');

const PREFIX = 'sim_';

function parseArgs(argv) {
  const args = { users: 300, seed: 7, reset: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--reset') args.reset = true;
    else if (argv[i] === '--users') args.users = parseInt(argv[++i], 10);
    else if (argv[i] === '--seed') args.seed = parseInt(argv[++i], 10);
  }
  return args;
}

async function resetSimulatedUsers() {
  const where = { username: { startsWith: PREFIX } };
  // recipe_views dùng ON DELETE SET NULL -> phải xóa trước, nếu không sẽ thành "lượt xem ẩn danh"
  const views = await prisma.recipe_views.deleteMany({ where: { users: where } });
  const users = await prisma.users.deleteMany({ where });
  console.log(`Đã xóa ${users.count} người dùng mô phỏng và ${views.count} lượt xem của họ.`);
}

// Giống createViewerHash trong repositories/recipeViewRepository.js
function viewerHash(userId) {
  if (!process.env.SESSION_SECRET) throw new Error('Thiếu SESSION_SECRET trong file .env');
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(`user:${userId}`).digest('hex');
}

async function insertInChunks(model, rows, size = 1000) {
  let count = 0;
  for (let start = 0; start < rows.length; start += size) {
    const result = await prisma[model].createMany({ data: rows.slice(start, start + size), skipDuplicates: true });
    count += result.count;
  }
  return count;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.reset) {
    await resetSimulatedUsers();
    return;
  }

  const existing = await prisma.users.count({ where: { username: { startsWith: PREFIX } } });
  if (existing > 0) {
    console.log(`Đã có ${existing} người dùng mô phỏng. Chạy với --reset để xóa trước rồi sinh lại.`);
    return;
  }

  const rows = await prisma.recipes.findMany({
    select: {
      id: true,
      title: true,
      categories: { select: { name: true } },
      recipe_tags: { select: { tags: { select: { name: true } } } },
    },
  });
  if (rows.length < 50) {
    console.log('Database có quá ít món. Hãy chạy scripts/import-vifoodrec.js trước.');
    return;
  }
  const recipes = rows.map((row) => ({
    id: row.id,
    title: row.title,
    categoryName: row.categories?.name,
    tags: row.recipe_tags.map((item) => item.tags?.name).filter(Boolean),
  }));

  console.log(`Sinh ${args.users} người dùng mô phỏng trên ${recipes.length} món (seed ${args.seed})...`);
  const { users, interactions } = simulate(recipes, { userCount: args.users, seed: args.seed });

  const password = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  await prisma.users.createMany({
    data: users.map((user) => ({
      username: `${PREFIX}${String(user.index + 1).padStart(3, '0')}_${user.personas.join('_')}`.slice(0, 100),
      email: `sim${user.index + 1}@sim.recipe.local`,
      password,
      fullname: `Người dùng mô phỏng ${user.index + 1} (${user.labels.join(', ')})`.slice(0, 255),
      bio: `Gu: ${user.labels.join(', ')}`,
      role: 'user',
    })),
  });
  const created = await prisma.users.findMany({
    where: { username: { startsWith: PREFIX } },
    select: { id: true, email: true },
  });
  const idByIndex = new Map(created.map((user) => [Number(user.email.match(/^sim(\d+)@/)[1]) - 1, user.id]));

  const toUser = (item) => idByIndex.get(item.userIndex);
  const views = interactions
    .filter((item) => item.type === 'view')
    .map((item) => ({
      recipe_id: item.recipeId,
      user_id: toUser(item),
      viewer_hash: viewerHash(toUser(item)),
      viewed_at: item.date,
    }));
  const favorites = interactions
    .filter((item) => item.type === 'favorite')
    .map((item) => ({ recipe_id: item.recipeId, user_id: toUser(item), created_at: item.date }));
  const ratings = interactions
    .filter((item) => item.type === 'rating')
    .map((item) => ({ recipe_id: item.recipeId, user_id: toUser(item), star_count: item.stars, created_at: item.date }));

  const [viewCount, favoriteCount, ratingCount] = [
    await insertInChunks('recipe_views', views),
    await insertInChunks('favorites', favorites),
    await insertInChunks('ratings', ratings),
  ];
  console.log(
    `Xong! ${created.length} người dùng, ${viewCount} lượt xem, ${favoriteCount} lượt yêu thích, ${ratingCount} đánh giá.`,
  );
  console.log('Bước tiếp theo: node scripts/evaluate-recommender.js  (đánh giá thuật toán)');
  console.log('Lưu ý: khởi động lại server (hoặc đợi 10 phút) để hệ gợi ý nạp dữ liệu mới.');
}

main()
  .catch((err) => {
    console.error('Lỗi khi sinh người dùng mô phỏng:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
