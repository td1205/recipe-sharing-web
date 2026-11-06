const crypto = require('crypto');
const bcrypt = require('bcrypt');
const userModel = require('../repositories/userRepository');

async function login(username, password) {
  let users = await userModel.getUserByUsername(username);
  let user = users[0];

  if (!user) {
    users = await userModel.getUserByEmail(username);
    user = users[0];
  }

  // Chống user enumeration: cùng một thông báo cho cả "không tồn tại" và "sai mật khẩu".
  // (So sánh bcrypt với hash giả để thời gian phản hồi không lộ ra user có tồn tại hay không.)
  const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8DsAMd4xM8/Dh.z/1F9Qk/ZO8GkZPy';
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    return { success: false, error: 'Tài khoản hoặc mật khẩu không chính xác!' };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return { success: false, error: 'Tài khoản hoặc mật khẩu không chính xác!' };
  }

  // Chỉ báo khóa SAU khi mật khẩu đúng, tránh dò ra email tồn tại mà không cần mật khẩu
  if (user.is_banned) {
    return { success: false, banned: true, error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.' };
  }
  return { success: true, user: user };
}

async function createOtp(email) {
  // The `otp` column is `String? @db.Char(6)`, so the code must be a string.
  // Passing a number makes prisma.users.update() throw and surface as a 500.
  // crypto.randomInt: CSPRNG, thay cho Math.random() (không bảo mật mật mã)
  const otp = String(crypto.randomInt(100000, 1000000));
  await userModel.updateOTP(email, otp);
  return otp;
}

module.exports = {
  login,
  createOtp
};
