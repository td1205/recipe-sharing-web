const prisma = require('../config/prisma');

async function getCommentsByRecipeId(recipeId) {
  const comments = await prisma.comments.findMany({
    where: { recipe_id: parseInt(recipeId) },
    include: { users: true },
    orderBy: { created_at: 'desc' },
  });

  return comments.map((c) => ({
    ...c,
    username: c.users?.username, // Đảm bảo EJS đọc được như cũ
  }));
}

async function createComment(userId, recipeId, content) {
  return await prisma.comments.create({
    data: {
      user_id: parseInt(userId),
      recipe_id: parseInt(recipeId),
      content: content,
    },
  });
}

async function deleteComment(commentId) {
  return await prisma.comments.delete({
    where: { id: parseInt(commentId) },
  });
}

module.exports = {
  getCommentsByRecipeId,
  createComment,
  deleteComment,
};
