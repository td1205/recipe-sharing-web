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

module.exports = {
  countUsers,
  countRecipes,
  countCategories,
  countComments,
  getAllUsers,
  deleteUser,
  updateUserByAdmin,
};
