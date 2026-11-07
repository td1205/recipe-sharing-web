const crypto = require('crypto');
const prisma = require('../config/prisma');

const VIEW_DEDUPLICATION_WINDOW_MS = 24 * 60 * 60 * 1000;

function createViewerHash(userId, sessionId) {
  const viewerIdentity = userId ? `user:${userId}` : `session:${sessionId}`;
  return crypto
    .createHmac('sha256', process.env.SESSION_SECRET)
    .update(viewerIdentity)
    .digest('hex');
}

async function recordQualifiedView(recipeId, userId, sessionId) {
  const parsedRecipeId = Number(recipeId);
  return prisma.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT id FROM recipes WHERE id = ${parsedRecipeId} FOR UPDATE`;
  const parsedUserId = userId ? parseInt(userId) : null;
  const recipe = await tx.recipes.findUnique({
    where: { id: parsedRecipeId },
    select: { user_id: true },
  });

  if (!recipe) {
    return { notFound: true, counted: false, viewCount: 0 };
  }

  if (parsedUserId && recipe.user_id === parsedUserId) {
    const viewCount = await tx.recipe_views.count({
      where: { recipe_id: parsedRecipeId },
    });
    return { counted: false, viewCount };
  }

  const viewerHash = createViewerHash(parsedUserId, sessionId);
  const viewedAfter = new Date(Date.now() - VIEW_DEDUPLICATION_WINDOW_MS);
  const recentView = await tx.recipe_views.findFirst({
    where: {
      recipe_id: parsedRecipeId,
      viewer_hash: viewerHash,
      viewed_at: { gte: viewedAfter },
    },
    select: { id: true },
  });

  let counted = false;
  if (!recentView) {
    await tx.recipe_views.create({
      data: {
        recipe_id: parsedRecipeId,
        user_id: parsedUserId,
        viewer_hash: viewerHash,
      },
    });
    counted = true;
  }

  const viewCount = await tx.recipe_views.count({
    where: { recipe_id: parsedRecipeId },
  });

  return { counted, viewCount };
  });
}

module.exports = {
  recordQualifiedView,
};
