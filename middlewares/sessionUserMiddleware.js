const prisma = require('../config/prisma');
const { fingerprint } = require('../utils/sessionAuth');

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
      select: { role: true, is_banned: true, password: true },
    });

    if (!user || user.is_banned || req.session.authFingerprint !== fingerprint(user.password)) {
      delete req.session.user;
      res.locals.user = null;
      return req.session.destroy((error) => {
        if (error) return next(error);
        if (user && user.is_banned) {
          return res.status(403).json({
            success: false,
            banned: true,
            error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
          });
        }
        return res.status(401).json({ success: false, error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
      });
    }

    if (sessionUser.role !== user.role) {
      sessionUser.role = user.role;
    }
    return next();
  } catch (err) {
    console.error('Lỗi đồng bộ session người dùng:', err.code || err.name);
    return next(err);
  }
}

module.exports = { refreshSessionUser };
