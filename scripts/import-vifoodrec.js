#!/usr/bin/env node
// ============================================================================
// NHẬP MÓN ĂN TỪ BỘ DỮ LIỆU ViFoodRec VÀO DATABASE
// ============================================================================
// Cách dùng (chạy ở thư mục gốc dự án):
//   node scripts/import-vifoodrec.js                  # MẶC ĐỊNH: ~1190 món của monngonmoingay.com có ảnh
//   node scripts/import-vifoodrec.js --limit 500      # chỉ nhập 500 món (chia đều theo danh mục)
//   node scripts/import-vifoodrec.js --source all --limit 2000   # lấy cả món của cooky.vn
//   node scripts/import-vifoodrec.js --include-no-image          # nhận cả món không có link ảnh
//   node scripts/import-vifoodrec.js --dry-run        # chỉ thống kê, không ghi gì vào DB
//   node scripts/import-vifoodrec.js --reset          # XÓA toàn bộ món đã nhập từ ViFoodRec
//
// Vì sao mặc định chỉ lấy monngonmoingay: máy chủ ảnh image.cooky.vn không còn truy cập
// được (kiểm tra 10/2026), nên ~78% món của cooky.vn sẽ không có ảnh hiển thị.
//
// - Tất cả món được gán cho tài khoản "Bếp Việt (ViFoodRec)" (không đăng nhập được).
// - Chạy lại nhiều lần không bị trùng: món trùng tên với món đã có sẽ được bỏ qua.
// - Danh mục mới (Gỏi & Salad, Đồ uống...) và tag được tạo tự động nếu chưa có.
// Nguồn dữ liệu: ViFoodRec, PACLIC 2024 - https://github.com/QuocAn55/DS300
// ============================================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const { loadDataset, selectRecipes } = require('./lib/dataset');
const { seededRandom } = require('../services/recommender/evaluation');
const { stripAccents } = require('../services/recommender/text');

const AUTHOR = {
  username: 'bep_viet_vifoodrec',
  email: 'vifoodrec@recipe.local',
  fullname: 'Bếp Việt (ViFoodRec)',
  bio: 'Tài khoản hệ thống chứa các công thức từ bộ dữ liệu ViFoodRec (PACLIC 2024).',
};

function parseArgs(argv) {
  const args = {
    limit: null,
    source: 'monngonmoingay',
    requireImage: true,
    dryRun: false,
    reset: false,
    seed: 2024,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--source') args.source = argv[++i];
    else if (argv[i] === '--include-no-image') args.requireImage = false;
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--reset') args.reset = true;
    else if (argv[i] === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (argv[i] === '--seed') args.seed = parseInt(argv[++i], 10);
  }
  return args;
}

// Khóa so trùng giống collation của MySQL (không phân biệt hoa thường / dấu)
const keyOf = (text) => stripAccents(text).replace(/\s+/g, ' ').trim();

async function resetImported() {
  const author = await prisma.users.findUnique({ where: { username: AUTHOR.username } });
  if (!author) {
    console.log('Chưa có dữ liệu ViFoodRec nào để xóa.');
    return;
  }
  const { count } = await prisma.recipes.deleteMany({ where: { user_id: author.id } });
  console.log(`Đã xóa ${count} món của tài khoản ${AUTHOR.username}.`);
}

async function ensureAuthor() {
  const existing = await prisma.users.findUnique({ where: { username: AUTHOR.username } });
  if (existing) return existing;
  // mật khẩu ngẫu nhiên không ai biết -> tài khoản không đăng nhập được
  const password = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  return prisma.users.create({ data: { ...AUTHOR, password, role: 'user' } });
}

async function ensureCategories(names, descriptions) {
  const existing = await prisma.categories.findMany();
  const byKey = new Map(existing.map((category) => [keyOf(category.name), category.id]));
  for (const name of names) {
    if (byKey.has(keyOf(name))) continue;
    const created = await prisma.categories.create({
      data: { name, description: descriptions[name] || null },
    });
    byKey.set(keyOf(name), created.id);
    console.log(`  + Tạo danh mục mới: ${name}`);
  }
  return byKey;
}

async function ensureTags(tags) {
  const unique = new Map();
  tags.forEach((tag) => {
    if (!unique.has(keyOf(tag.name))) unique.set(keyOf(tag.name), tag);
  });
  await prisma.tags.createMany({
    data: [...unique.values()].map((tag) => ({ name: tag.name, type: tag.type })),
    skipDuplicates: true,
  });
  const all = await prisma.tags.findMany({ select: { id: true, name: true } });
  return new Map(all.map((tag) => [keyOf(tag.name), tag.id]));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.reset) {
    await resetImported();
    return;
  }

  const dataset = loadDataset();
  const candidates = dataset.recipes.filter(
    (recipe) =>
      (args.source === 'all' || recipe.source === args.source) && (!args.requireImage || recipe.image_url),
  );
  const recipes = args.limit ? selectRecipes(candidates, args.limit, args.seed) : candidates;
  const categoryCounts = {};
  recipes.forEach((recipe) => {
    categoryCounts[recipe.category] = (categoryCounts[recipe.category] || 0) + 1;
  });
  console.log(
    `Dataset: ${dataset.recipes.length} món. Nguồn: ${args.source}` +
      `${args.requireImage ? ', chỉ món có ảnh' : ''}. Sẽ nhập: ${recipes.length} món.`,
  );
  console.log('Theo danh mục:', categoryCounts);
  if (args.dryRun) return;

  const author = await ensureAuthor();
  const categoryIds = await ensureCategories(Object.keys(categoryCounts), dataset.category_descriptions || {});
  const tagIds = await ensureTags(recipes.flatMap((recipe) => recipe.tags));
  const existingTitles = new Set(
    (await prisma.recipes.findMany({ select: { title: true } })).map((recipe) => keyOf(recipe.title)),
  );

  const random = seededRandom(args.seed);
  const now = Date.now();
  let created = 0;
  let skipped = 0;
  const todo = recipes.filter((recipe) => {
    if (existingTitles.has(keyOf(recipe.title))) {
      skipped += 1;
      return false;
    }
    return true;
  });

  const BATCH = 5;
  for (let start = 0; start < todo.length; start += BATCH) {
    await Promise.all(
      todo.slice(start, start + BATCH).map((recipe) => {
        const tagIdList = [...new Set(recipe.tags.map((tag) => tagIds.get(keyOf(tag.name))).filter(Boolean))];
        return prisma.recipes.create({
          data: {
            user_id: author.id,
            category_id: categoryIds.get(keyOf(recipe.category)),
            title: recipe.title,
            description: recipe.description || null,
            prep_time: 0,
            cook_time: recipe.cook_time,
            servings: recipe.servings,
            image_url: recipe.image_url,
            // rải ngày đăng trong 1 năm gần đây để mục "Mới nhất" đa dạng
            created_at: new Date(now - Math.floor(random() * 365) * 24 * 3600 * 1000),
            ingredients: {
              create: recipe.ingredients.map((ingredient) => ({
                name: ingredient.name,
                amount: ingredient.amount,
                unit: ingredient.unit,
              })),
            },
            steps: {
              create: recipe.steps.map((instruction, index) => ({ step_number: index + 1, instruction })),
            },
            recipe_tags: { create: tagIdList.map((tagId) => ({ tag_id: tagId })) },
          },
        });
      }),
    );
    created += Math.min(BATCH, todo.length - start);
    if (created % 250 < BATCH || created === todo.length) {
      process.stdout.write(`\r  Đã nhập ${created}/${todo.length} món...`);
    }
  }

  console.log(`\nXong! Đã nhập ${created} món, bỏ qua ${skipped} món trùng tên.`);
  console.log('Bước tiếp theo: node scripts/simulate-users.js  (sinh người dùng mô phỏng)');
  console.log('Lưu ý: khởi động lại server (hoặc đợi 10 phút) để hệ gợi ý nạp dữ liệu mới.');
}

main()
  .catch((err) => {
    console.error('\nLỗi khi nhập dữ liệu:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
