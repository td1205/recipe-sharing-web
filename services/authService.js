const bcrypt = require('bcrypt');
const userModel = require('../repositories/userRepository');

async function login(username, password) {
  const [user] = await userModel.getUserByUsername(username);
  if (!user) {
    return { success: false, error: 'Tài khoản không tồn tại!' };
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return { success: false, error: 'Sai mật khẩu hoặc tên đăng nhập!' };
  }
  return { success: true, user: user };
}

async function createOtp(email) {
  const otp = Math.floor(100000 + Math.random() * 900000);
  await userModel.updateOTP(email, otp);
  return otp;
}

module.exports = {
  login,
  createOtp
};
