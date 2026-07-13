const adminModel = require("../models/adminModel");
const userModel = require("../models/userModel");
async function renderDashboard(req, res) {
  try {
    const [totalUsers, totalRecipes, totalCategories, totalComments] =
      await Promise.all([
        adminModel.countUsers(),
        adminModel.countRecipes(),
        adminModel.countCategories(),
        adminModel.countComments(),
      ]);
    const stats = {
      users: totalUsers,
      recipes: totalRecipes,
      categories: totalCategories,
      comments: totalComments,
    };
    res.render("admin/dashboard", { stats });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu thống kê:", error);
    res.status(500).send("Lỗi Server");
  }
}
async function renderUserManagement(req, res) {
  try {
    const users = await adminModel.getAllUsers();
    res.render("admin/users", { users });
  } catch (error) {
    res.status(500).send("500 Server Error");
  }
}
async function handleDeleteUser(req, res) {
  try {
    const userId = req.params.id;
    await adminModel.deleteUser(userId);
    res.redirect("/admin/users");
  } catch (error) {
    res.status(500).send("500 Server Error");
  }
}

async function getEditUserPage(req, res) {
  try {
    const userId = req.params.id;
    const [user] = await userModel.getUserById(userId);
    if (!user) {
      return res.status(404).send("Không tìm thấy người dùng");
    }
    res.render("auth/profile-edit", { editUser: user, isAdminEditing: true });
  } catch (error) {
    res.status(500).send("500 Server Error");
  }
}

async function handleEditUser(req, res) {
  try {
    const userId = req.params.id;
    const { fullname, email, role } = req.body;
    await adminModel.updateUserByAdmin(userId, fullname, email, role);
    res.redirect("/admin/users");
  } catch (error) {
    res.status(500).send("500 Server Error");
  }
}
module.exports = {
  renderDashboard,
  renderUserManagement,
  handleDeleteUser,
  getEditUserPage,
  handleEditUser,
};
