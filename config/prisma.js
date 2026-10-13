const { PrismaClient } = require('@prisma/client');

// Khởi tạo Prisma Client
const prisma = new PrismaClient({
  // Chỉ bật log lỗi và cảnh báo để tránh rối mắt ở terminal
  log: ['warn', 'error'],
});

module.exports = prisma;
