const prisma = require('../config/prisma');

async function getAll() {
  return await prisma.categories.findMany({
    orderBy: { id: 'desc' },
  });
}

// Danh mục kèm số món đang thuộc danh mục (cảnh báo trước khi xoá dây chuyền)
async function getAllWithRecipeCount() {
  return prisma.categories.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { recipes: true } } },
  });
}

async function getAllCourseTypes() {
  return await prisma.course_types.findMany({
    orderBy: { id: 'asc' },
  });
}

async function getAllMealTimes() {
  return await prisma.meal_times.findMany({
    orderBy: { id: 'asc' },
  });
}

async function getById(id) {
  return await prisma.categories.findUnique({
    where: { id: parseInt(id) },
  });
}

async function create(name, description) {
  return await prisma.categories.create({
    data: { name, description },
  });
}

async function update(id, name, description) {
  return await prisma.categories.update({
    where: { id: parseInt(id) },
    data: { name, description },
  });
}

async function remove(id) {
  const categoryId = parseInt(id, 10);
  // Bảo vệ dữ liệu: không xóa danh mục còn món (FK RESTRICT ở recipes.category_id).
  const recipeCount = await prisma.recipes.count({ where: { category_id: categoryId } });
  if (recipeCount > 0) {
    const err = new Error(`Danh mục đang có ${recipeCount} món ăn. Hãy chuyển hoặc xóa các món này trước khi xóa danh mục`);
    err.status = 400;
    throw err;
  }
  return await prisma.categories.delete({
    where: { id: categoryId },
  });
}

module.exports = {
  getAll,
  getAllWithRecipeCount,
  getAllCourseTypes,
  getAllMealTimes,
  getById,
  create,
  update,
  remove,
};
