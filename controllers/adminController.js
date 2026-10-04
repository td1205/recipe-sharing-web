const adminModel = require('../repositories/adminRepository');
const userModel = require('../repositories/userRepository');
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
    await adminModel.deleteUser(userId);
    res.json({ success: true, message: 'User deleted' });
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
module.exports = {
  renderDashboard,
  renderUserManagement,
  handleDeleteUser,
  getEditUserPage,
  handleEditUser,
  getChangePasswordPage,
  handleChangePassword,
};
