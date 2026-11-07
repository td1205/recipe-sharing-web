const prisma = require('../config/prisma');
const { SAFE_USER_SELECT } = require('../utils/userSelect');

async function countUsers() {
  return await prisma.users.count();
}

async function countRecipes() {
  return await prisma.recipes.count();
}

async function countCategories() {
  return await prisma.categories.count();
}

async function countComments() {
  return await prisma.comments.count();
}

async function getAllUsers() {
  return await prisma.users.findMany({
    select: {
      ...SAFE_USER_SELECT,
      _count: {
        select: { recipes: true, comments: true }
      }
    }
  });
}

class AdminUserMutationError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function mutateUser(id, actorId, data) {
  const userId = Number(id);
  const adminId = Number(actorId);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new AdminUserMutationError(400, 'ID không hợp lệ');
  }
  if (!Number.isSafeInteger(adminId) || adminId <= 0) {
    throw new AdminUserMutationError(403, 'Bạn không có quyền thực hiện thao tác này!');
  }
  try {
    return await prisma.$transaction(async (tx) => {
      // Current locking read: concurrent admin mutations share the admin row locks.
      // Check actor, resulting invariant and write on the SAME transaction/connection.
      const users = await tx.$queryRaw`
        SELECT id, role, is_banned FROM users
        WHERE role = 'admin' OR id = ${userId} OR id = ${adminId}
        ORDER BY id FOR UPDATE
      `;
      const active = (user) => user?.role === 'admin' && !user.is_banned;
      const actor = users.find((user) => user.id === adminId);
      if (!active(actor)) {
        throw new AdminUserMutationError(403, 'Bạn không có quyền thực hiện thao tác này!');
      }
      const target = users.find((user) => user.id === userId);
      if (!target) throw new AdminUserMutationError(404, 'Không tìm thấy người dùng');
      const remaining = users.filter(active).length - Number(active(target))
        + Number(data !== null && active({ ...target, ...data }));
      if (remaining < 1) {
        throw new AdminUserMutationError(400, 'Phải giữ ít nhất một Admin đang hoạt động trong hệ thống');
      }
      return data === null
        ? tx.users.delete({ where: { id: userId } })
        : tx.users.update({ where: { id: userId }, data });
    }, { isolationLevel: 'ReadCommitted' });
  } catch (error) {
    // Deadlock/write conflict rolls back; never retry the write outside the guard.
    if (error.code === 'P2034') {
      throw new AdminUserMutationError(409, 'Dữ liệu quản trị vừa thay đổi. Vui lòng tải lại và thử lại!');
    }
    throw error;
  }
}

async function deleteUser(id, actorId) {
  return mutateUser(id, actorId, null);
}

async function banUser(id, is_banned, actorId) {
  if (typeof is_banned !== 'boolean') {
    throw new AdminUserMutationError(400, 'Trạng thái khóa phải là boolean');
  }
  return mutateUser(id, actorId, { is_banned });
}

async function updateUserByAdmin(id, fullname, email, role, actorId) {
  if (!['admin', 'user'].includes(role)) {
    throw new AdminUserMutationError(400, 'Vai trò không hợp lệ');
  }
  return mutateUser(id, actorId, { fullname, email, role });
}

async function getChartData(days = 7) {
  const safeDays = [7, 30, 90].includes(Number(days)) ? Number(days) : 7;
  const since = new Date();
  since.setDate(since.getDate() - (safeDays - 1));
  since.setHours(0, 0, 0, 0);

  const users = await prisma.users.findMany({
    where: { created_at: { gte: since } },
    select: { created_at: true }
  });
  const recipes = await prisma.recipes.findMany({
    where: { created_at: { gte: since } },
    select: { created_at: true }
  });

  const result = { users: {}, recipes: {} };
  for (let i = 0; i < safeDays; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const dateStr = d.toLocaleDateString('vi-VN');
    result.users[dateStr] = 0;
    result.recipes[dateStr] = 0;
  }

  users.forEach(u => {
    if (u.created_at) {
      const dateStr = new Date(u.created_at).toLocaleDateString('vi-VN');
      if (result.users[dateStr] !== undefined) result.users[dateStr]++;
    }
  });

  recipes.forEach(r => {
    if (r.created_at) {
      const dateStr = new Date(r.created_at).toLocaleDateString('vi-VN');
      if (result.recipes[dateStr] !== undefined) result.recipes[dateStr]++;
    }
  });

  return result;
}

// Hoạt động gần đây: user mới, món mới, bình luận mới (mỗi loại 5 dòng)
async function getRecentActivity() {
  const [users, recipes, comments] = await Promise.all([
    prisma.users.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
      select: { id: true, username: true, fullname: true, created_at: true },
    }),
    prisma.recipes.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
      select: { id: true, title: true, created_at: true, users: { select: { username: true } } },
    }),
    prisma.comments.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true, content: true, created_at: true,
        users: { select: { username: true } },
        recipes: { select: { id: true, title: true } },
      },
    }),
  ]);
  return { users, recipes, comments };
}

// Số liệu mở rộng: lượt xem, lượt lưu, user bị khoá, món chưa có ảnh
async function getExtraStats() {
  const [views, favorites, banned, noImage] = await Promise.all([
    prisma.recipe_views.count(),
    prisma.favorites.count(),
    prisma.users.count({ where: { is_banned: true } }),
    prisma.recipes.count({ where: { OR: [{ image_url: null }, { image_url: '' }] } }),
  ]);
  return { totalViews: views, totalFavorites: favorites, bannedUsers: banned, recipesWithoutImage: noImage };
}

module.exports = {
  AdminUserMutationError,
  countUsers,
  countRecipes,
  countCategories,
  countComments,
  getAllUsers,
  deleteUser,
  banUser,
  updateUserByAdmin,
  getChartData,
  getRecentActivity,
  getExtraStats,
};
