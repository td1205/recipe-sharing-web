const prisma = require('../config/prisma');

async function getAllComments() {
  const comments = await prisma.comments.findMany({
    include: {
      users: true,
      recipes: true,
    },
    orderBy: { created_at: 'desc' },
  });

  return comments.map((c) => ({
    ...c,
    username: c.users?.username,
    title: c.recipes?.title,
  }));
}

async function deleteComment(id) {
  return await prisma.comments.delete({
    where: { id: parseInt(id) },
  });
}

module.exports = {
  getAllComments,
  deleteComment,
};
