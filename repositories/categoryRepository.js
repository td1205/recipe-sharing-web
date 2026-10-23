const prisma = require('../config/prisma');

async function getAll() {
  return await prisma.categories.findMany({
    orderBy: { id: 'desc' },
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
  return await prisma.categories.delete({
    where: { id: parseInt(id) },
  });
}

module.exports = {
  getAll,
  getAllCourseTypes,
  getAllMealTimes,
  getById,
  create,
  update,
  remove,
};
