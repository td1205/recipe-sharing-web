const prisma = require('../config/prisma');

async function createOrUpdateRating(userId, recipeId, starCount) {
  const user_id = Number(userId), recipe_id = Number(recipeId);
  return prisma.$executeRaw`INSERT INTO ratings (user_id, recipe_id, star_count)
    VALUES (${user_id}, ${recipe_id}, ${Number(starCount)})
    ON DUPLICATE KEY UPDATE star_count = VALUES(star_count)`;
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
