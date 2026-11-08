const prisma = require('../config/prisma');
const { PUBLIC_USER_SELECT } = require('../utils/userSelect');

async function getAllComments() {
  const comments = await prisma.comments.findMany({
    include: {
      users: { select: PUBLIC_USER_SELECT },
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
