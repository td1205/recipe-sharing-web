#!/usr/bin/env node
// ============================================================================
// ĐÁNH GIÁ CÁC THUẬT TOÁN GỢI Ý TRÊN DỮ LIỆU TRONG DATABASE
// ============================================================================
// Cách dùng:
//   node scripts/evaluate-recommender.js            # K = 10
//   node scripts/evaluate-recommender.js --k 5
//
// In ra 2 bảng và ghi vào docs/ket-qua-danh-gia-goi-y.md:
//   1. Người dùng đã có đủ lịch sử
//   2. HitRate theo số món đã biết về người dùng (1-4 món) -> cơ sở chọn ngưỡng
// Mỗi bảng là trung bình của 5 lần chạy với 5 seed khác nhau (giảm yếu tố may rủi).
// Mất khoảng 1-2 phút.
// Phương pháp đánh giá: xem services/recommender/evaluation.js
// ============================================================================
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../config/prisma');
const repository = require('../repositories/recommendationRepository');
const {
  evaluateAveraged,
  evaluateByHistorySize,
  formatTable,
  formatHistoryTable,
} = require('../services/recommender/evaluation');
const { SETTINGS } = require('../services/recommender/hybrid');

function parseArgs(argv) {
  const args = { k: 10 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--k') args.k = parseInt(argv[++i], 10);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [recipes, { interactions }] = await Promise.all([
    repository.loadRecipeFeatures(),
    repository.loadInteractions(),
  ]);
  console.log(`Dữ liệu: ${recipes.length} món, ${interactions.length} tương tác.`);

  const full = evaluateAveraged({ recipes, interactions, k: args.k });
  if (full.userCount === 0) {
    console.log('Chưa có người dùng nào có >= 5 món yêu thích. Hãy chạy scripts/simulate-users.js trước.');
    return;
  }
  console.log('Đang chạy kịch bản người dùng mới (1-4 món)...');
  const byHistory = evaluateByHistorySize({ recipes, interactions, k: args.k });

  const report = [
    '# Kết quả đánh giá hệ gợi ý',
    '',
    `Ngày chạy: ${new Date().toLocaleString('vi-VN')}`,
    `Dữ liệu: ${recipes.length} món, ${interactions.length} tương tác, ${full.userCount} người dùng được kiểm tra.`,
    `Thiết lập: hybrid = ${SETTINGS.contentWeight} × content + ${SETTINGS.cfWeight} × CF; ` +
      `dùng CF khi người dùng có >= ${SETTINGS.minItemsForCF} món đã tương tác.`,
    '',
    'Phương pháp: leave-one-out - với mỗi người dùng có >= 5 món yêu thích, giấu 1 món rồi kiểm tra',
    `món đó có nằm trong top-${args.k} gợi ý hay không. Mỗi con số là trung bình của ${full.runs} lần chạy.`,
    '',
    '> Lưu ý: tương tác được sinh bởi `scripts/simulate-users.js` (dữ liệu MÔ PHỎNG có gu rõ ràng).',
    '',
    `## 1. Người dùng đã có lịch sử (${full.userCount} người)`,
    '',
    formatTable(full),
    '',
    '## 2. Theo số món đã biết về người dùng (mô phỏng người dùng mới)',
    '',
    'Mỗi người dùng được kiểm tra chỉ giữ lại 1, 2, 3 hoặc 4 món trong lịch sử.',
    '',
    formatHistoryTable(byHistory, args.k),
    '',
  ].join('\n');

  console.log(`\n${report}`);
  const output = path.join(__dirname, '../docs/ket-qua-danh-gia-goi-y.md');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, report, 'utf8');
  console.log(`Đã ghi kết quả vào ${path.relative(process.cwd(), output)}`);
}

main()
  .catch((err) => {
    console.error('Lỗi khi đánh giá:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
