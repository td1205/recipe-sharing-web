const adminModel = require('../repositories/adminRepository');
const userModel = require('../repositories/userRepository');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function renderDashboard(req, res) {
  try {
    const [totalUsers, totalRecipes, totalCategories, totalComments, chartData] =
      await Promise.all([
        adminModel.countUsers(),
        adminModel.countRecipes(),
        adminModel.countCategories(),
        adminModel.countComments(),
        adminModel.getChartData(),
      ]);
    const stats = {
      users: totalUsers,
      recipes: totalRecipes,
      categories: totalCategories,
      comments: totalComments,
    };
    res.json({ success: true, stats, chartData });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu thống kê:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server' });
  }
}
async function renderUserManagement(req, res) {
  try {
    const users = await adminModel.getAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: '500 Server Error' });
  }
}
async function handleDeleteUser(req, res) {
  try {
    const userId = req.params.id;
    const [user] = await userModel.getUserById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    if (user.role === 'admin') {
      const allUsers = await adminModel.getAllUsers();
      const adminCount = allUsers.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Không thể xóa Admin duy nhất của hệ thống' });
      }
    }
    
    await adminModel.deleteUser(userId);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: '500 Server Error' });
  }
}

async function handleBanUser(req, res) {
  try {
    const userId = req.params.id;
    const { is_banned } = req.body;
    await adminModel.banUser(userId, is_banned);
    res.json({ success: true, message: 'User ban status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: '500 Server Error' });
  }
}

async function getEditUserPage(req, res) {
  try {
    const userId = req.params.id;
    const [user] = await userModel.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    res.json({ success: true, editUser: user, isAdminEditing: true });
  } catch (error) {
    res.status(500).json({ success: false, message: '500 Server Error' });
  }
}

async function handleEditUser(req, res) {
  try {
    const userId = req.params.id;
    const { fullname, email, role } = req.body;
    
    const [user] = await userModel.getUserById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'admin' && role === 'user') {
      const allUsers = await adminModel.getAllUsers();
      const adminCount = allUsers.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Không thể hạ cấp Admin duy nhất của hệ thống' });
      }
    }

    await adminModel.updateUserByAdmin(userId, fullname, email, role);
    res.json({ success: true, message: 'User updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: '500 Server Error' });
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
    const userId = req.params.id;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
       return res.status(400).json({ success: false, message: 'Mật khẩu phải từ 6 ký tự' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.users.update({
      where: { id: parseInt(userId) },
      data: { password: hashedPassword }
    });
    
    res.json({ success: true, message: 'Đã đổi mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: '500 Server Error' });
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
