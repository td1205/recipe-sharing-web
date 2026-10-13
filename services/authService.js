const bcrypt = require('bcrypt');
const userModel = require('../repositories/userRepository');

async function login(username, password) {
  let users = await userModel.getUserByUsername(username);
  let user = users[0];
  
  if (!user) {
    users = await userModel.getUserByEmail(username);
    user = users[0];
  }

  if (!user) {
    return { success: false, error: 'Tài khoản hoặc email không tồn tại!' };
  }
  
  if (user.is_banned) {
    return { success: false, error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.' };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return { success: false, error: 'Sai mật khẩu hoặc tên đăng nhập!' };
  }
  return { success: true, user: user };
}

async function createOtp(email) {
  // The `otp` column is `String? @db.Char(6)`, so the code must be a string.
  // Passing a number makes prisma.users.update() throw and surface as a 500.
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await userModel.updateOTP(email, otp);
  return otp;
}

module.exports = {
  login,
  createOtp
};
