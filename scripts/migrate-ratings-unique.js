// Thêm ràng buộc UNIQUE(user_id, recipe_id) cho bảng ratings trên database đang có.
// Mỗi người chỉ được một lượt chấm sao cho một món; nếu đã có bản ghi trùng thì giữ bản mới nhất.
//
// Chạy một lần:  npm run db:ratings-unique
// Chạy lại nhiều lần cũng không sao (đã có ràng buộc thì bỏ qua).
require('dotenv').config();
const prisma = require('../config/prisma');

const INDEX_NAME = 'unique_user_recipe_rating';

async function main() {
  const existing = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS n FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = 'ratings' AND index_name = ?`,
    INDEX_NAME,
  );
  if (Number(existing[0].n) > 0) {
    console.log(`Bảng ratings đã có ràng buộc ${INDEX_NAME}, không cần làm gì.`);
    return;
  }

  // Xoá lượt chấm trùng, giữ bản ghi có id lớn nhất (mới nhất)
  const removed = await prisma.$executeRawUnsafe(`
    DELETE r1 FROM ratings r1
    JOIN ratings r2
      ON r1.user_id = r2.user_id AND r1.recipe_id = r2.recipe_id AND r1.id < r2.id
  `);
  console.log(`Đã xoá ${removed} lượt chấm sao bị trùng.`);

  await prisma.$executeRawUnsafe(`ALTER TABLE ratings ADD UNIQUE KEY ${INDEX_NAME} (user_id, recipe_id)`);
  console.log(`Đã thêm UNIQUE(user_id, recipe_id) cho bảng ratings.`);
}

main()
  .catch((err) => {
    console.error('Lỗi khi thêm ràng buộc:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
