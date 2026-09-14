const prisma = require('../config/prisma');

async function getAll() {
  return await prisma.categories.findMany({
    orderBy: { id: 'desc' },
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
  getById,
  create,
  update,
  remove,
};
