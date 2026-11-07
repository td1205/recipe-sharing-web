const prisma = require('../config/prisma');

async function isFavorite(userId, recipeId) {
  const favorite = await prisma.favorites.findUnique({
    where: {
      user_id_recipe_id: {
        user_id: parseInt(userId),
        recipe_id: parseInt(recipeId),
      },
    },
  });
  return favorite !== null;
}

async function addFavorite(userId, recipeId) {
  return await prisma.favorites.create({
    data: {
      user_id: parseInt(userId),
      recipe_id: parseInt(recipeId),
    },
  });
}

async function removeFavorite(userId, recipeId) {
  return await prisma.favorites.delete({
    where: {
      user_id_recipe_id: {
        user_id: parseInt(userId),
        recipe_id: parseInt(recipeId),
      },
    },
  });
}

module.exports = {
  async setFavorite(userId, recipeId, desired) {
    const user_id = Number(userId), recipe_id = Number(recipeId);
    return prisma.$transaction(async (tx) => {
      const recipes = await tx.$queryRaw`SELECT id FROM recipes WHERE id = ${recipe_id} FOR UPDATE`;
      if (!recipes.length) throw Object.assign(new Error('Không tìm thấy công thức'), { code: 'P2025' });
      const where = { user_id_recipe_id: { user_id, recipe_id } };
      const existing = await tx.favorites.findUnique({ where });
      const isFav = desired === undefined ? !existing : desired;
      if (isFav && !existing) await tx.favorites.create({ data: { user_id, recipe_id } });
      if (!isFav) await tx.favorites.deleteMany({ where: { user_id, recipe_id } });
      return isFav;
    });
  },
  isFavorite,
  addFavorite,
  removeFavorite,
};
