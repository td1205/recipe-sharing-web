const prisma = require('../config/prisma');

async function isFavorite(userId, recipeId) {
  const favorite = await prisma.favorites.findUnique({
    where: {
      unique_user_recipe: {
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
      unique_user_recipe: {
        user_id: parseInt(userId),
        recipe_id: parseInt(recipeId),
      },
    },
  });
}

module.exports = {
  isFavorite,
  addFavorite,
  removeFavorite,
};
