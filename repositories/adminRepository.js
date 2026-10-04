const prisma = require('../config/prisma');

async function countUsers() {
  return await prisma.users.count();
}

async function countRecipes() {
  return await prisma.recipes.count();
}

async function countCategories() {
  return await prisma.categories.count();
}

async function countComments() {
  return await prisma.comments.count();
}

async function getAllUsers() {
  return await prisma.users.findMany();
}

async function deleteUser(id) {
  return await prisma.users.delete({
    where: { id: parseInt(id) },
  });
}

async function updateUserByAdmin(id, fullname, email, role) {
  return await prisma.users.update({
    where: { id: parseInt(id) },
    data: { fullname, email, role },
  });
}

async function getChartData() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const users = await prisma.users.findMany({
    where: { created_at: { gte: sevenDaysAgo } },
    select: { created_at: true }
  });
  const recipes = await prisma.recipes.findMany({
    where: { created_at: { gte: sevenDaysAgo } },
    select: { created_at: true }
  });

  const result = { users: {}, recipes: {} };
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toLocaleDateString('vi-VN');
    result.users[dateStr] = 0;
    result.recipes[dateStr] = 0;
  }

  users.forEach(u => {
    if (u.created_at) {
      const dateStr = new Date(u.created_at).toLocaleDateString('vi-VN');
      if (result.users[dateStr] !== undefined) result.users[dateStr]++;
    }
  });

  recipes.forEach(r => {
    if (r.created_at) {
      const dateStr = new Date(r.created_at).toLocaleDateString('vi-VN');
      if (result.recipes[dateStr] !== undefined) result.recipes[dateStr]++;
    }
  });

  return result;
}

module.exports = {
  countUsers,
  countRecipes,
  countCategories,
  countComments,
  getAllUsers,
  deleteUser,
  updateUserByAdmin,
  getChartData,
};
