const prisma = require('../config/prisma');

// Đồng bộ session với database ở mỗi request API:
// - Tài khoản bị xóa hoặc bị khóa (is_banned) -> đăng xuất ngay, không phải
//   chờ session hết hạn.
// - Quyền (role) bị admin thay đổi -> áp dụng ngay cho session hiện tại.
async function refreshSessionUser(req, res, next) {
  const sessionUser = req.session && req.session.user;
  if (!sessionUser) return next();

  try {
    const user = await prisma.users.findUnique({
      where: { id: Number(sessionUser.id) },
      select: { role: true, is_banned: true },
    });

    if (!user || user.is_banned) {
      delete req.session.user;
      res.locals.user = null;
      return req.session.save(() => {
        if (user && user.is_banned) {
          return res.status(403).json({
            success: false,
            banned: true,
            error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
          });
        }
        return next();
      });
    }

    if (sessionUser.role !== user.role) {
      sessionUser.role = user.role;
    }
    return next();
  } catch (err) {
    console.error('Lỗi đồng bộ session người dùng:', err);
    return next(err);
  }
}

module.exports = { refreshSessionUser };
