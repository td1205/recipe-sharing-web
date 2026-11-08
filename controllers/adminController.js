const validation = require('../utils/apiValidation');
const adminModel = require('../repositories/adminRepository');
const userModel = require('../repositories/userRepository');
const bcrypt = require('bcrypt');
const { validatePassword } = require('../utils/passwordPolicy');
const prisma = require('../config/prisma');

// id từ URL phải là số nguyên dương, tránh NaN chạm vào Prisma
function parseIdOr400(req, res) {
  const id = /^\d+$/.test(String(req.params.id)) ? Number(req.params.id) : NaN;
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    return null;
  }
  return id;
}
async function renderDashboard(req, res) {
  try {
    const days = validation.integer(req.query.days, 'days', 7, 7, 90);
    if (![7, 30, 90].includes(days)) throw Object.assign(new Error('days chỉ nhận 7, 30 hoặc 90'), { status: 400 });
    const [totalUsers, totalRecipes, totalCategories, totalComments, chartData, recent, extra] =
      await Promise.all([
        adminModel.countUsers(),
        adminModel.countRecipes(),
        adminModel.countCategories(),
        adminModel.countComments(),
        adminModel.getChartData(days),
        adminModel.getRecentActivity(),
        adminModel.getExtraStats(),
      ]);
    const totalRatings = await prisma.ratings.count();
    const pendingReports = await prisma.content_reports.count({ where: { status: 'Pending' } });
    const stats = {
      users: totalUsers,
      recipes: totalRecipes,
      categories: totalCategories,
      comments: totalComments,
      ratings: totalRatings,
      pendingReports,
      totalViews: extra.totalViews,
      totalFavorites: extra.totalFavorites,
      bannedUsers: extra.bannedUsers,
      recipesWithoutImage: extra.recipesWithoutImage,
      days,
      lastFetched: new Date().toISOString(),
    };
    res.json({ success: true, stats, chartData, recent, extra });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu thống kê:', error.code || error.name);
    return validation.apiError(res, error);
  }
}
async function renderUserManagement(req, res) {
  try {
    const users = await adminModel.getAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    return validation.apiError(res, error);
  }
}
async function handleDeleteUser(req, res) {
  try {
    const userId = validation.id(req.params.id);
    await adminModel.deleteUser(userId, req.session.user?.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    if (error instanceof adminModel.AdminUserMutationError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    return validation.apiError(res, error);
  }
}

async function handleBanUser(req, res) {
  try {
    const userId = validation.id(req.params.id);
    const { is_banned } = req.body || {};
    await adminModel.banUser(userId, is_banned, req.session.user?.id);
    res.json({ success: true, message: 'User ban status updated' });
  } catch (error) {
    if (error instanceof adminModel.AdminUserMutationError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    return validation.apiError(res, error);
  }
}

async function getEditUserPage(req, res) {
  try {
    const userId = validation.id(req.params.id);
    const [user] = await userModel.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    res.json({ success: true, editUser: user, isAdminEditing: true });
  } catch (error) {
    return validation.apiError(res, error);
  }
}

async function handleEditUser(req, res) {
  try {
    const userId = validation.id(req.params.id);
    const { fullname, email, role } = req.body || {};
    await adminModel.updateUserByAdmin(userId, validation.text(fullname, 'Họ tên', 255, false), validation.email(email), role, req.session.user?.id);
    res.json({ success: true, message: 'User updated' });
  } catch (error) {
    if (error instanceof adminModel.AdminUserMutationError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    return validation.apiError(res, error);
  }
}

async function getChangePasswordPage(req, res) {
  res.json({ success: true, message: 'Change password page' });
}
async function handleChangePassword(req, res) {
  res.json({ success: true, message: 'Change password action' });
}

async function handleAdminChangePassword(req, res) {
  try {
    const userId = parseIdOr400(req, res);
    if (!userId) return;
    const { newPassword } = req.body || {};

    // Dùng chung chính sách mật khẩu của hệ thống (8+ ký tự, chữ, số, đặc biệt)
    const passwordError = validatePassword(newPassword || '');
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.users.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ success: true, message: 'Đã đổi mật khẩu thành công' });
  } catch (error) {
    return validation.apiError(res, error);
  }
}
module.exports = {
  renderDashboard,
  renderUserManagement,
  handleDeleteUser,
  handleBanUser,
  getEditUserPage,
  handleEditUser,
  getChangePasswordPage,
  handleChangePassword,
  handleAdminChangePassword,
};
