const prisma = require('../config/prisma');

async function createOrUpdateRating(userId, recipeId, starCount) {
  const existingRating = await prisma.ratings.findFirst({
    where: {
      user_id: parseInt(userId),
      recipe_id: parseInt(recipeId),
    },
  });

  if (existingRating) {
    return await prisma.ratings.update({
      where: { id: existingRating.id },
      data: { star_count: parseInt(starCount) },
    });
  }

  return await prisma.ratings.create({
    data: {
      user_id: parseInt(userId),
      recipe_id: parseInt(recipeId),
      star_count: parseInt(starCount),
    },
  });
}

async function getAverageRating(recipeId) {
  const agg = await prisma.ratings.aggregate({
    where: { recipe_id: parseInt(recipeId) },
    _avg: { star_count: true },
    _count: { _all: true },
  });

  return {
    averageRating: agg._avg.star_count || 0,
    totalRatings: agg._count._all || 0,
  };
}

async function getUserRating(userId, recipeId) {
  return await prisma.ratings.findFirst({
    where: {
      user_id: parseInt(userId),
      recipe_id: parseInt(recipeId),
    },
  });
}

module.exports = {
  createOrUpdateRating,
  getAverageRating,
  getUserRating,
};
