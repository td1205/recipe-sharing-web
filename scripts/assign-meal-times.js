#!/usr/bin/env node
// ============================================================================
// TẠO 3 BỮA ĂN (Sáng / Trưa / Tối) VÀ GÁN CHO CÁC MÓN CHƯA CÓ BỮA
// ============================================================================
// Cách dùng (chạy sau import-vifoodrec.js):
//   node scripts/assign-meal-times.js              # chỉ gán cho món chưa có bữa
//   node scripts/assign-meal-times.js --overwrite  # gán lại cho TẤT CẢ món
// Quy tắc suy luận: xem scripts/lib/mealTimes.js
// ============================================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../config/prisma');
const { MEAL_TIMES, inferMealTime } = require('./lib/mealTimes');
const { stripAccents } = require('../services/recommender/text');

const keyOf = (text) => stripAccents(text).trim();

async function main() {
  const overwrite = process.argv.includes('--overwrite');

  // 1. Đảm bảo có đủ 3 bữa
  const existing = await prisma.meal_times.findMany();
  const idByName = new Map();
  for (const meal of MEAL_TIMES) {
    const found = existing.find((row) => keyOf(row.name) === keyOf(meal.name));
    const row = found || (await prisma.meal_times.create({ data: meal }));
    if (!found) console.log(`  + Tạo bữa: ${meal.name}`);
    idByName.set(meal.name, row.id);
  }

  // 2. Gán bữa cho món
  const recipes = await prisma.recipes.findMany({
    where: overwrite ? {} : { meal_time_id: null },
    select: { id: true, title: true, categories: { select: { name: true } } },
  });
  const groups = new Map();
  recipes.forEach((recipe) => {
    const meal = inferMealTime(recipe.title, recipe.categories?.name);
    if (!meal) return;
    if (!groups.has(meal)) groups.set(meal, []);
    groups.get(meal).push(recipe.id);
  });

  for (const [meal, ids] of groups) {
    await prisma.recipes.updateMany({ where: { id: { in: ids } }, data: { meal_time_id: idByName.get(meal) } });
    console.log(`  Bữa ${meal}: ${ids.length} món`);
  }
  const assigned = [...groups.values()].reduce((sum, ids) => sum + ids.length, 0);
  console.log(`Xong! Đã xét ${recipes.length} món, gán bữa cho ${assigned} món.`);
  console.log('Lưu ý: khởi động lại server (hoặc đợi 10 phút) để hệ gợi ý nạp dữ liệu mới.');
}

main()
  .catch((err) => {
    console.error('Lỗi khi gán bữa ăn:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
