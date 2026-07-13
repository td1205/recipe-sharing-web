const userModel = require("../models/userModel");
const bcrypt = require("bcrypt");

function validatePassword(password) {
  if (password.length < 8) {
    return "Mật khẩu phải chứa ít nhất 8 ký tự!";
  }
  if (!/[0-9]/.test(password)) {
    return "Mật khẩu phải chứa ít nhất 1 chữ số!";
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Mật khẩu phải chứa ít nhất 1 chữ cái!";
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: !, @, #, $, %...)!";
  }
  return null;
}

function getLoginPage(req, res) {
  res.render("auth/login");
}

function getRegisterPage(req, res) {
  res.render("auth/register");
}

async function handleLogin(req, res) {
  const { username, password } = req.body;
  const [user] = await userModel.getUserByUsername(username);
  if (user == undefined) {
    console.log("Tài khoản không tồn tại");
    return res.redirect("/login");
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    console.log("Sai mật khẩu");
    return res.render("auth/login", {
      error: "Sai mật khẩu hoặc tên đăng nhập!",
    });
  }
  req.session.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
  return res.redirect("/");
}

async function handleRegister(req, res) {
  const { username, email, password, confirm_password, fullname } = req.body;

  if (password !== confirm_password) {
    return res.render("auth/register", {
      error: "Mật khẩu xác nhận không khớp!",
    });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.render("auth/register", {
      error: passwordError,
    });
  }

  const [user] = await userModel.getUserByUsername(username);
  if (user !== undefined) {
    console.log("Tài khoản đã tồn tại");
    return res.render("auth/register", { error: "Tài khoản đã tồn tại!" });
  }
  const [userByEmail] = await userModel.getUserByEmail(email);
  if (userByEmail !== undefined) {
    console.log("Email đã được sử dụng");
    return res.render("auth/register", { error: "Email đã được sử dụng!" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  await userModel.createUser(username, hashedPassword, email, fullname);
  return res.redirect("/login");
}

function logout(req, res) {
  req.session.destroy();
  return res.redirect("/login");
}

async function renderProfile(req, res) {
  const userId = req.session.user.id;
  const [user] = await userModel.getUserById(userId);
  const favouriteRecipes = await userModel.getFavouriteRecipesByUser(userId);
  res.render("auth/profile", { user, favouriteRecipes });
}

function getForgotPasswordPage(req, res) {
  res.render("auth/forgot-password");
}

async function handleForgotPassword(req, res) {
  const { email, password, confirm_password } = req.body;

  if (password !== confirm_password) {
    return res.render("auth/forgot-password", {
      error: "Mật khẩu xác nhận không khớp!",
    });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.render("auth/forgot-password", {
      error: passwordError,
    });
  }

  const [userByEmail] = await userModel.getUserByEmail(email);
  if (!userByEmail) {
    return res.render("auth/forgot-password", {
      error: "Không tìm thấy tài khoản nào với Email này!",
    });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  await userModel.updatePasswordByEmail(email, hashedPassword);
  return res.render("auth/login", {
    success: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.",
  });
}

function getEditProfilePage(req, res) {
  res.render("auth/profile-edit", { editUser: req.session.user, isAdminEditing: false });
}

async function handleEditProfile(req, res) {
  const { fullname, email } = req.body;
  const userId = req.session.user.id;

  const [userByEmail] = await userModel.getUserByEmail(email);
  if (userByEmail && userByEmail.id !== userId) {
    return res.render("auth/profile-edit", {
      error: "Email đã được sử dụng bởi người khác!",
      editUser: req.session.user,
      isAdminEditing: false,
    });
  }

  await userModel.updateUserProfile(userId, fullname, email);

  req.session.user.fullname = fullname;
  req.session.user.email = email;

  res.redirect("/profile");
}

module.exports = {
  getEditProfilePage,
  handleEditProfile,
  getLoginPage,
  getRegisterPage,
  handleLogin,
  handleRegister,
  logout,
  renderProfile,
  getForgotPasswordPage,
  handleForgotPassword,
};
