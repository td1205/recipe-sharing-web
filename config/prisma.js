const { PrismaClient } = require('@prisma/client');

// Khởi tạo Prisma Client
const prisma = new PrismaClient({
  // Bật log để xem các câu lệnh SQL mà Prisma tự sinh ra ngầm ở dưới (rất tốt để debug)
  log: ['query', 'info', 'warn', 'error'],
});

module.exports = prisma;
