const userModel = require("../models/userModel");
const bcrypt = require("bcrypt");
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
    return res.redirect("/login");
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
    return res.render("auth/register", { error: "Mật khẩu xác nhận không khớp!" });
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
async function renderProfile(req,res){
  const userId = req.session.user.id;
  const [user] = await userModel.getUserById(userId)
  res.render('auth/profile', {user})
}
module.exports = { getLoginPage, getRegisterPage, handleLogin, handleRegister, logout, renderProfile };
