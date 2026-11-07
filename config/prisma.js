const { PrismaClient } = require('@prisma/client');

// Khởi tạo Prisma Client
const prisma = new PrismaClient({
  // Controller logs codes; avoid Prisma query/parameter dumps containing user data.
  log: ['warn'],
});

module.exports = prisma;
