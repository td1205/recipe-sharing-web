const prisma = require('../config/prisma');
const { PUBLIC_USER_SELECT } = require('../utils/userSelect');
const { getRecipeCardsByIds } = require('../repositories/recommendationRepository');

const PAGE_SIZE = 16;

// GET /api/users/:id/profile?page=1  -> hồ sơ CÔNG KHAI của một người dùng
// Chỉ trả các trường an toàn (không email, không role, không password/otp).
async function getPublicProfile(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã người dùng không hợp lệ' });
    }
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { ...PUBLIC_USER_SELECT, bio: true, created_at: true, is_banned: true },
    });
    if (!user || user.is_banned) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const [recipeCount, favoritesReceived, recipeRows] = await Promise.all([
      prisma.recipes.count({ where: { user_id: userId } }),
      prisma.favorites.count({ where: { recipes: { user_id: userId } } }),
      prisma.recipes.findMany({
        where: { user_id: userId },
        select: { id: true },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);
    const recipes = await getRecipeCardsByIds(recipeRows.map((row) => row.id));
    const { is_banned: _ignored, ...publicUser } = user;

    return res.json({
      success: true,
      user: publicUser,
      stats: { recipeCount, favoritesReceived },
      recipes,
      page,
      totalPages: Math.max(1, Math.ceil(recipeCount / PAGE_SIZE)),
    });
  } catch (err) {
    console.error('Lỗi lấy hồ sơ công khai:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
}

module.exports = { getPublicProfile };
